/** Daily scenarios, scoring and the share grid. */
import {steady, step, az5, ORM_LIMIT} from './rbmk.js';
export const LAUNCH = '2026-10-14';
export function londonKey(date = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit'}).formatToParts(date).map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}
export const dayNumber = key => Math.round((Date.parse(key + 'T12:00:00Z') - Date.parse(LAUNCH + 'T12:00:00Z')) / 864e5) + 1;
export const SCENARIOS = {
  xenon: {name: 'Hold power through a xenon pit', brief: 'The grid controller wants half power. Bring the reactor down to 50% and hold it between 45% and 55%. As you cut power, xenon builds up and eats reactivity, so you will have to pull rods to hold on. Keep at least 15 rods in the core.', start: () => steady(1), band: [0.45, 0.55], length: 180},
  rundown: {name: 'Run the turbine rundown test safely', brief: 'Hold the reactor between 15% and 30% while the turbine runs down and the pumps it feeds slow. Keep at least 15 rods in the core. From 2 minutes on, press AZ-5 to shut down and finish.', start: () => steady(0.22, 1, 1.3), band: [0.15, 0.3], length: 150, rundown: [60, 90, 0.6], az5From: 120},
  pump: {name: 'Ride out a pump trip', brief: 'Hold 70% power, between 60% and 80%. At one minute a main circulation pump trips and flow drops. Less water means more steam, and in an RBMK more steam means more power.', start: () => steady(0.7), band: [0.6, 0.8], length: 150, trip: [60, 0.85]},
};
export const IDS = Object.keys(SCENARIOS);
export const scenarioFor = key => IDS[(dayNumber(key) - 1 + IDS.length * 100) % IDS.length];
export function newGame(id) { const sc = SCENARIOS[id]; return {id, s: sc.start(), pumps: 8, log: [], ormBroken: false, done: false, failed: false}; }
export const flowOf = (g, t) => { const sc = SCENARIOS[g.id]; let f = g.pumps / 8; if (sc.rundown) { const [a, b, lo] = sc.rundown; f *= t < a ? 1 : t > b ? lo : 1 - (1 - lo) * (t - a) / (b - a); } if (sc.trip && t >= sc.trip[0]) f *= sc.trip[1]; return f; };
/** One tick of the game. */
export function tick(g, dt = 0.25) {
  if (g.done) return g;
  const sc = SCENARIOS[g.id], s0 = {...g.s, flow: flowOf(g, g.s.t)}, s = step(s0, dt);
  const inBand = s.P >= sc.band[0] && s.P <= sc.band[1];
  const n = {...g, s, log: [...g.log, inBand ? 1 : 0], ormBroken: g.ormBroken || (!s.az5 && s.rods < ORM_LIMIT)};
  if (s.state === 'exploded' || s.state === 'meltdown') return {...n, done: true, failed: s.state};
  if (s.state === 'shutdown' || s.t >= sc.length) return {...n, done: true};
  return n;
}
export const setRods = (g, rods) => g.s.az5 ? g : {...g, s: {...g.s, rods: Math.max(0, Math.min(211, rods))}};
export const setPumps = (g, n) => ({...g, pumps: Math.max(4, Math.min(8, n))});
export const pressAz5 = g => ({...g, s: az5(g.s)});
export function score(g) {
  if (g.failed) return 0;
  const sc = SCENARIOS[g.id], inBand = g.log.reduce((a, b) => a + b, 0) / Math.max(1, sc.length / 0.25);
  let s = Math.round(1000 * Math.min(1, inBand));
  if (g.ormBroken) s -= 300;
  if (sc.az5From && g.s.state !== 'shutdown') s -= 200;
  return Math.max(0, s);
}
export function shareText(g, label) {
  const seg = 10, per = Math.max(1, Math.ceil(g.log.length / seg)), cells = [];
  for (let i = 0; i < seg; i++) { const part = g.log.slice(i * per, (i + 1) * per); cells.push(!part.length ? (g.failed ? '🟥' : '⬛') : part.reduce((a, b) => a + b, 0) / part.length > 0.7 ? '🟩' : '🟨'); }
  return `RBMK ${label} ${score(g)}\n${cells.join('')}\nhttps://dexmlabs.app/chernobyl-reactor-simulator/`;
}
export function streak(history) {
  const keys = Object.keys(history).sort(); let run = 0, best = 0, prev = null;
  for (const k of keys) { run = history[k] > 0 ? (prev && Date.parse(k) - Date.parse(prev) === 864e5 ? run + 1 : 1) : 0; best = Math.max(best, run); prev = k; }
  const last = keys.at(-1), ok = last === londonKey() || last === londonKey(new Date(Date.now() - 864e5));
  return {played: keys.length, streak: ok ? run : 0, best};
}
