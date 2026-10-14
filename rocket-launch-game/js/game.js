import {fly, liftoffMass} from './flight.js';
export const LAUNCH = '2026-10-14';
export function londonKey(date = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit'}).formatToParts(date).map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}
export const dayNumber = key => Math.round((Date.parse(key + 'T12:00:00Z') - Date.parse(LAUNCH + 'T12:00:00Z')) / 864e5) + 1;
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const CARGO = ['a weather satellite', 'a crew capsule', 'a space telescope', 'a batch of communications satellites', 'a supply ship for the space station', 'an Earth observation satellite'];
export function makeMission({key = londonKey(), seed = null} = {}) {
  const r = rng(hash(seed === null ? `rocket:v1:${key}` : `rocket:p:${seed}`));
  return {key, practice: seed !== null, number: dayNumber(key), payload: 2 + Math.round(r() * 16), cargo: CARGO[Math.floor(r() * CARGO.length)]};
}
export const score = (d, r) => r.ok ? Math.round(d.payload * 1000 / liftoffMass(d) * 10000) : 0;
const cell = (ok, good) => ok ? (good ? '🟩' : '🟨') : '🟥';
export function grid(d, r) {
  const space = r.path.some(p => p[1] > 100e3) || r.ok, staged = r.path.some(p => p[2] === 1) || r.ok;
  return [cell(r.why !== 'pad', r.tw > 1.25), cell(r.why !== 'pad', r.maxQ < 60e3), cell(staged, staged), cell(space, space), cell(r.ok, r.ok && r.apo < 400e3)].join('');
}
export function shareText(d, r, label) { return `Rocket launch ${label} ${r.ok ? `${d.payload} t to orbit, score ${score(d, r)}` : 'no orbit'}\n${grid(d, r)}\nhttps://dexmlabs.app/rocket-launch-game/`; }
export function streak(history) {
  const keys = Object.keys(history).sort(); let run = 0, best = 0, prev = null;
  for (const k of keys) { run = history[k] > 0 ? (prev && Date.parse(k) - Date.parse(prev) === 864e5 ? run + 1 : 1) : 0; best = Math.max(best, run); prev = k; }
  const last = keys.at(-1), ok = last === londonKey() || last === londonKey(new Date(Date.now() - 864e5));
  return {played: keys.length, streak: ok ? run : 0, best};
}
export {fly};
