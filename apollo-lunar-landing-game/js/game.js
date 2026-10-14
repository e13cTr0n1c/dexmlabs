import {step, LIMITS} from './lm.js';
export const LAUNCH = '2026-10-14';
export function londonKey(date = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit'}).formatToParts(date).map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}
export const dayNumber = key => Math.round((Date.parse(key + 'T12:00:00Z') - Date.parse(LAUNCH + 'T12:00:00Z')) / 864e5) + 1;
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const SITES = ['Sea of Tranquillity', 'Ocean of Storms', 'Fra Mauro highlands', 'Hadley Rille', 'Descartes highlands', 'Taurus Littrow valley'];
export function makeLanding({key = londonKey(), seed = null} = {}) {
  const r = rng(hash(seed === null ? `apollo:v1:${key}` : `apollo:p:${seed}`)), f = (a, b) => a + (b - a) * r();
  return {key, practice: seed !== null, number: dayNumber(key), site: SITES[Math.floor(r() * SITES.length)],
    start: {x: f(-160, 160), y: f(140, 220), vx: f(-3, 3), vy: f(-6, -2), fuel: Math.round(f(300, 420)), t: 0, throttle: 0.3, rcs: 0},
    rocks: Array.from({length: 14}, () => ({x: f(-400, 400), r: f(1, 4)})).filter(k => Math.abs(k.x) > 40)};
}
export function score(s) {
  if (!s.done || !s.landed) return 0;
  const soft = 1 - s.touch.vy / LIMITS.down, near = 1 - s.touch.dist / LIMITS.pad, level = 1 - s.touch.vx / LIMITS.side;
  return Math.round(400 + 200 * soft + 200 * near + 100 * level + Math.min(100, s.fuel / 2));
}
const cell = (ok, good) => ok ? (good ? '🟩' : '🟨') : '🟥';
export function shareText(s, label) {
  const t = s.touch || {vy: 99, vx: 99, dist: 999};
  const row = [cell(s.landed, s.landed), cell(t.vy <= LIMITS.down, t.vy <= 1.5), cell(t.vx <= LIMITS.side, t.vx <= 0.5), cell(t.dist <= LIMITS.pad, t.dist <= 10), cell(s.fuel > 0, s.fuel > 60)].join('');
  return `Apollo landing ${label} ${score(s)}\n${row}\nhttps://dexmlabs.app/apollo-lunar-landing-game/`;
}
export function streak(history) {
  const keys = Object.keys(history).sort(); let run = 0, best = 0, prev = null;
  for (const k of keys) { run = history[k] > 0 ? (prev && Date.parse(k) - Date.parse(prev) === 864e5 ? run + 1 : 1) : 0; best = Math.max(best, run); prev = k; }
  const last = keys.at(-1), ok = last === londonKey() || last === londonKey(new Date(Date.now() - 864e5));
  return {played: keys.length, streak: ok ? run : 0, best};
}
export {step};
