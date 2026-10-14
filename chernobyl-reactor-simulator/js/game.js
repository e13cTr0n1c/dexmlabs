/** Scenarios, escalating from a startup to the night of the test, plus scoring, the daily pick and the share grid. */
import {plant, tick as plantTick, pressAz5 as az5u, setRods as sr, setAr as sa, setArSet as sas, togglePump as tp, setFeed as sf, setAutoFeed as saf, setLoad as sl, pumpsOn} from './plant.js';
import {ORM_LIMIT, RODS} from './rbmk.js';
export const LAUNCH = '2026-10-14';
export function londonKey(date = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit'}).formatToParts(date).map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}
export const dayNumber = key => Math.round((Date.parse(key + 'T12:00:00Z') - Date.parse(LAUNCH + 'T12:00:00Z')) / 864e5) + 1;
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
// demand(t) is the power the shift supervisor asks for; band is ± around it.
export const SCENARIOS = [
  {id: 'startup', name: '1. Bring the unit up to half power', length: 180, tools: ['ar'],
    brief: 'The reactor is ticking over at 10%. Pull rods to bring it up, and raise the turbine load with it so the steam has somewhere to go. From one minute in, hold power within 6% of half power. The feedwater regulator looks after the drums for you.',
    make: r => ({u: plant(0.1, {X: 0.2}), demand: t => t < 60 ? null : 0.5, band: 0.06, events: []})},
  {id: 'load', name: '2. Follow the grid', length: 200, tools: ['ar'],
    brief: 'Kyiv wants less power, then more. Follow the demand line with the reactor and the turbine together. The automatic regulator can hold a setpoint for you within a few rods, so use it.',
    make: r => { const a = 40 + r() * 20, b = 110 + r() * 30, lo = 0.55 + r() * 0.1, hi = 0.85 + r() * 0.1; return {u: plant(1), demand: t => t < a ? 1 : t < b ? lo : hi, band: 0.06, events: []}; }},
  {id: 'xenon', name: '3. Hold on through a xenon pit', length: 240, tools: [],
    brief: 'Cut to a third of full power for the grid, then come back up when asked. As you cut power, xenon builds for hours and eats reactivity, so you will be pulling rods just to hold on. No automatic regulator today, and keep at least 15 rods in the core.',
    make: r => { const a = 20 + r() * 15, b = 150 + r() * 30, lo = 0.3 + r() * 0.05, hi = 0.8 + r() * 0.1; return {u: plant(1), demand: t => t < a ? 1 : t < b ? lo : hi, band: 0.07, events: []}; }},
  {id: 'trips', name: '4. A bad shift: feedwater fault and a pump trip', length: 200, tools: [],
    brief: 'Hold 70%. Partway through, the feedwater regulator fails and you will have to match feedwater to steam by hand to keep the drum level. Then a main pump trips. Less flow means more steam, and in an RBMK more steam means more power.',
    make: r => { const f = 40 + r() * 30, p = 100 + r() * 40; return {u: plant(0.7), demand: () => 0.7, band: 0.08, events: [{t: f, k: 'feed', text: 'Feedwater regulator fault. Feedwater is on manual.'}, {t: p, k: 'pump', text: 'Main circulation pump tripped.'}]}; }},
  {id: 'night', name: '5. The night of the test', length: 200, tools: [], az5Ends: true,
    brief: 'It is just after one in the morning on 26 April 1986. Power fell far too low earlier and xenon is building. The test programme says run it at 700 MW or more, with at least 15 rods in the core. At two minutes the turbine steam is cut and four pumps run down with it. Several protections are switched off, as they were that night. Finish with AZ-5, or refuse to run the test if the rules can\'t be kept. Both can be the right call.',
    make: r => { const u = plant(0.22, {pumps: 8, X: 1.6, protect: false}); u.c = {...u.c, I: 1.1}; u.autoFeed = false; u.feed = 0.22; return {u, demand: t => 0.26, band: 0.045, events: [{t: 120, k: 'test', text: 'Test started. Turbine stop valves closed, four pumps running down.'}]}; }},
];
export const byId = id => SCENARIOS.find(s => s.id === id);
export const scenarioFor = key => SCENARIOS[((dayNumber(key) - 1) % SCENARIOS.length + SCENARIOS.length) % SCENARIOS.length].id;
export function newGame(id, seed = 1) {
  const sc = byId(id), m = sc.make(rng(seed));
  return {id, seed, u: m.u, demand: m.demand, band: m.band, events: m.events.map(e => ({...e})), fired: [], t: 0, log: [], ormBroken: false, done: false, failed: false, outcome: null};
}
export const inBand = (g, P = g.u.c.P) => { const d = g.demand(g.t); return d === null ? null : Math.abs(P - d) <= g.band; };
export function tick(g0, dt = 0.25) {
  if (g0.done) return g0; const g = {...g0, fired: [...g0.fired]}; let u = g.u;
  for (const e of g.events) if (!g.fired.includes(e.k) && g.t >= e.t) { g.fired.push(e.k);
    if (e.k === 'feed') u = {...u, autoFeed: false};
    if (e.k === 'pump') { const i = u.pumps.findIndex(Boolean); u = tp(u, i); }
    if (e.k === 'test') u = {...u, load: 0, testAt: g.t}; }
  if (u.testAt !== undefined) { const k = Math.min(1, (g.t - u.testAt) / 40); const on = pumpsOn(u); u = {...u, rundown: 1 - 0.4 * k * Math.min(4, on) / on}; }
  u = plantTick(u, dt); g.u = u; g.t += dt;
  const b = inBand(g), bad = u.alarms.length > 0;
  g.log = [...g.log, b === null ? (bad ? 0.5 : 1) : b ? (bad ? 0.5 : 1) : 0];
  if (!u.c.az5 && u.c.rods < ORM_LIMIT) g.ormBroken = true;
  const sc = byId(g.id);
  if (u.trip) { g.done = true; if (!u.trip.safe) g.failed = u.trip.k; g.outcome = u.trip; }
  else if (g.t >= sc.length) { g.done = true; g.outcome = {k: 'time', text: 'End of the shift.'}; }
  return g;
}
export const setRods = (g, r) => ({...g, u: sr(g.u, r)});
export const setAr = (g, on) => byId(g.id).tools.includes('ar') ? {...g, u: sa(g.u, on)} : g;
export const setArSet = (g, v) => ({...g, u: sas(g.u, v)});
export const togglePump = (g, i) => ({...g, u: tp(g.u, i)});
export const setFeed = (g, v) => ({...g, u: sf(g.u, v)});
export const setAutoFeed = (g, on) => g.fired.includes('feed') || byId(g.id).id === 'night' ? g : {...g, u: saf(g.u, on)};
export const setLoad = (g, v) => g.u.testAt !== undefined ? g : {...g, u: sl(g.u, v)};
export const pressAz5 = g => ({...g, u: az5u(g.u)});
export function score(g) {
  if (g.failed) return 0; const sc = byId(g.id);
  let s = Math.round(1000 * g.log.reduce((a, b) => a + b, 0) / Math.max(1, sc.length / 0.25));
  if (g.ormBroken) s -= 300;
  if (sc.az5Ends) { if (g.outcome?.k === 'shutdown' && g.u.testAt === undefined) s = Math.max(s, 600); if (g.outcome?.k === 'shutdown' && g.u.testAt !== undefined && !g.ormBroken) s = Math.max(s, 750); if (g.outcome?.k !== 'shutdown') s -= 300; }
  return Math.max(0, Math.min(1000, s));
}
export function verdict(g) {
  const sc = byId(g.id);
  if (g.failed) return g.outcome.text;
  const parts = [];
  if (sc.az5Ends && g.outcome?.k === 'shutdown' && g.u.testAt === undefined) parts.push('You shut down before the test. The real shift didn\'t, and that was the right call to make.');
  else if (sc.az5Ends && g.outcome?.k === 'shutdown') parts.push('Test run and shut down safely, with the rods where the rules said.');
  else if (sc.az5Ends) parts.push('You didn\'t finish with AZ-5, which cost 300.');
  if (g.ormBroken) parts.push('Fewer than 15 rods were in the core at some point, which cost 300. That rule was there because of the graphite tips.');
  return parts.join(' ') || 'Steady hands. The shift supervisor is happy.';
}
export function shareText(g, label) {
  const seg = 10, per = Math.max(1, Math.ceil(g.log.length / seg)), cells = [];
  for (let i = 0; i < seg; i++) { const part = g.log.slice(i * per, (i + 1) * per); cells.push(!part.length ? (g.failed ? '🟥' : '⬛') : part.reduce((a, b) => a + b, 0) / part.length > 0.8 ? '🟩' : part.reduce((a, b) => a + b, 0) / part.length > 0.4 ? '🟨' : '🟧'); }
  return `RBMK ${label} ${byId(g.id).name.replace(/^\d\. /, '')}: ${g.failed ? 'lost' : score(g)}\n${cells.join('')}\nhttps://dexmlabs.app/chernobyl-reactor-simulator/`;
}
export function streak(history) {
  const keys = Object.keys(history).sort(); let run = 0, best = 0, prev = null;
  for (const k of keys) { run = history[k] > 0 ? (prev && Date.parse(k) - Date.parse(prev) === 864e5 ? run + 1 : 1) : 0; best = Math.max(best, run); prev = k; }
  const last = keys.at(-1), ok = last === londonKey() || last === londonKey(new Date(Date.now() - 864e5));
  return {played: keys.length, streak: ok ? run : 0, best};
}
export const unlocked = best => SCENARIOS.filter((s, i) => i === 0 || (best?.[SCENARIOS[i - 1].id] || 0) >= 500).map(s => s.id);
export {RODS, ORM_LIMIT};
