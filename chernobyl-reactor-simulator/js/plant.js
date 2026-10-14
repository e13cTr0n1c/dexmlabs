/** The rest of the unit around the core: main pumps, steam drum, feedwater, turbine and the automatic regulator.
 *  All values are normalised: power, steam, feedwater and turbine load are fractions of full power, pressure is
 *  a fraction of the 70 bar working pressure, drum level runs from -1 (empty) to +1 (flooded). */
import {step as coreStep, steady as coreSteady, az5, reactivity, RODS, ORM_LIMIT, BETA} from './rbmk.js';
export const PUMPS = 8, LIMIT = {pHigh: 1.12, pTrip: 1.25, pLow: 0.85, lvlLow: -0.3, lvlHigh: 0.3, lvlTrip: 0.6, power: 1.1};
export const flowFor = (on, rundown = 1) => Math.min(1.05, on / 6) * rundown;
export function plant(P = 1, opts = {}) {
  const c = coreSteady(P, flowFor(opts.pumps ?? 6), opts.X);
  return {c, pumps: Array.from({length: PUMPS}, (_, i) => i < (opts.pumps ?? 6)), p: 1, lvl: 0, feed: P, load: P, ar: !!opts.ar, protect: opts.protect ?? true, autoFeed: opts.autoFeed ?? true, arSet: P, arBase: c.rods, rundown: 1, bypass: 0, trip: null, alarms: []};
}
export const pumpsOn = u => u.pumps.filter(Boolean).length;
export function alarmsOf(u) {
  const a = [], c = u.c;
  if (c.P > LIMIT.power) a.push('power'); if (!c.az5 && c.rods < ORM_LIMIT) a.push('orm'); if (u.p > LIMIT.pHigh) a.push('phigh'); if (u.p < LIMIT.pLow) a.push('plow');
  if (u.lvl < LIMIT.lvlLow) a.push('lvllow'); if (u.lvl > LIMIT.lvlHigh) a.push('lvlhigh'); if ((c.flow ?? 1) < 0.75) a.push('flow'); if (c.X > 1.3) a.push('xenon');
  return a;
}
export function tick(u0, dt = 0.25) {
  const u = {...u0}; let c = {...u.c};
  if (u.ar && !c.az5) { const err = c.P - u.arSet, lo = u.arBase - 12, hi = u.arBase + 12; c.rods = Math.max(lo, Math.min(hi, c.rods + Math.max(-1, Math.min(1, err * 20)) * dt * 2)); }
  const flow = flowFor(pumpsOn(u), u.rundown), steam = c.P, sub = u.feed / Math.max(steam, 0.05);
  c = coreStep({...c, flow, p: u.p, sub: Math.min(1, sub)}, dt);
  const turbine = u.load * Math.min(1.1, u.p), bypass = u.p > 1.08 ? (u.p - 1.08) * 4 : 0;
  u.p = Math.max(0.3, u.p + 0.12 * (steam - turbine - bypass) * dt); u.bypass = bypass;
  if (u.autoFeed) u.feed = Math.max(0, Math.min(1.3, steam - 0.5 * u.lvl));
  u.lvl = Math.max(-1.2, Math.min(1.2, u.lvl + 0.03 * (u.feed - steam) * dt));
  if (u.protect && !c.az5 && c.P > LIMIT.power && c.state === 'running') { c = az5(c); u.scram = true; u.ar = false; }
  u.c = c; u.alarms = alarmsOf(u); u.turbine = turbine;
  // Past five times full power, energy goes into the fuel faster than water can take it away and the fuel shatters.
  if (c.state === 'running' && c.P > 5) { c = {...c, state: 'exploded'}; u.c = c; }
  if (c.state === 'exploded') u.trip = {k: 'exploded', text: 'Power went prompt critical and ran away. The fuel shattered and the steam blew the core apart.'};
  else if (c.state === 'meltdown') u.trip = {k: 'meltdown', text: 'Too much power for the water flowing through the core. The fuel overheated and the channels failed.'};
  else if (u.lvl < -LIMIT.lvlTrip) u.trip = {k: 'dry', text: 'The steam drums ran low, the pumps drew steam instead of water and the channels dried out.'};
  else if (u.lvl > LIMIT.lvlTrip) u.trip = {k: 'carry', text: 'The drums flooded and water was carried over into the turbine. It tripped, and so did the reactor.'};
  else if (u.p > LIMIT.pTrip && !c.az5) u.trip = {k: 'pressure', text: 'Steam pressure hit the safety valve limit. The reactor scrammed.'};
  else if (c.state === 'shutdown' && u.scram) u.trip = {k: 'scram', text: 'Power passed 110% and the emergency protection scrammed the reactor. Safe, but the shift is over.'};
  else if (c.state === 'shutdown') u.trip = {k: 'shutdown', text: 'Shut down with AZ-5.', safe: true};
  return u;
}
export const setRods = (u, r) => u.c.az5 ? u : {...u, ar: false, c: {...u.c, rods: Math.max(0, Math.min(RODS, r))}};
export const setAr = (u, on) => ({...u, ar: on && !u.c.az5, arSet: u.c.P, arBase: u.c.rods});
export const setArSet = (u, v) => ({...u, arSet: Math.max(0.05, Math.min(1.05, v))});
export const togglePump = (u, i) => { const p = [...u.pumps]; p[i] = !p[i]; return pumpsOn({pumps: p}) < 2 ? u : {...u, pumps: p}; };
export const setAutoFeed = (u, on) => ({...u, autoFeed: on});
export const setFeed = (u, v) => ({...u, autoFeed: false, feed: Math.max(0, Math.min(1.3, v))});
export const setLoad = (u, v) => ({...u, load: Math.max(0, Math.min(1.05, v))});
export const pressAz5 = u => ({...u, ar: false, c: az5(u.c)});
