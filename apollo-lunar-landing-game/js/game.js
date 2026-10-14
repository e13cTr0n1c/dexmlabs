import {step, abort, hoverSeconds, LIMITS, touchdownFault} from './lm.js';
import {SITES, TIERS, makeWorld, seedOf} from './sites.js';
export const LAUNCH = '2026-10-14';
export function londonKey(date = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit'}).formatToParts(date).map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}
export const dayNumber = key => Math.round((Date.parse(key + 'T12:00:00Z') - Date.parse(LAUNCH + 'T12:00:00Z')) / 864e5) + 1;
export function makeLanding({key = londonKey(), seed = null, tier = 'commander', site = null} = {}) {
  const n = dayNumber(key), sd = seed === null ? seedOf(`apollo:v2:${key}`) : seed >>> 0;
  const s = site ? SITES.find(x => x.id === site) : SITES[seed === null ? ((n % SITES.length) + SITES.length) % SITES.length : sd % SITES.length];
  return {key, practice: seed !== null, number: n, tier, world: makeWorld(s, sd, tier)};
}
export const precision = d => d <= 30 ? 3 : d <= 100 ? 2 : 1;
export function score(s, tier = 'commander') {
  if (!s.done || !s.landed) return 0;
  const t = s.touch, soft = 300 * (1 - t.vy / LIMITS.down), level = 100 * (1 - t.angle / LIMITS.tilt) + 100 * (1 - t.vx / LIMITS.side), fuel = 4 * hoverSeconds(s);
  return Math.round((300 + soft + level + fuel) * precision(t.dist) * TIERS[tier].mult);
}
const cell = (ok, good) => ok ? (good ? '🟩' : '🟨') : '🟥';
export function grid(s, alarmsOk = true) {
  if (s.safe) return '⬜⬜⬜⬜⬜';
  const t = s.touch || {vy: 99, vx: 99, dist: 9999, angle: 1};
  return [cell(s.landed, s.landed), cell(t.vy <= LIMITS.down, t.vy <= 1.2), cell(t.dist <= 100, t.dist <= 30), cell(s.fuel > 0, hoverSeconds(s) > 20), cell(alarmsOk, alarmsOk)].join('');
}
export function shareText(s, label, tier, site, alarmsOk) {
  return `Apollo landing ${label} ${TIERS[tier].name}, ${site.name}\n${s.landed ? `Landed, ${score(s, tier)} points` : s.safe ? 'Aborted, crew safe' : 'Crashed'}\n${grid(s, alarmsOk)}\nhttps://dexmlabs.app/apollo-lunar-landing-game/`;
}
export function streak(history) {
  const keys = Object.keys(history).sort(); let run = 0, best = 0, prev = null;
  for (const k of keys) { run = history[k] > 0 ? (prev && Date.parse(k) - Date.parse(prev) === 864e5 ? run + 1 : 1) : 0; best = Math.max(best, run); prev = k; }
  const last = keys.at(-1), ok = last === londonKey() || last === londonKey(new Date(Date.now() - 864e5));
  return {played: keys.length, streak: ok ? run : 0, best};
}
export {step, abort, touchdownFault, SITES, TIERS};
