import {SOLS} from './base.js';
export const LAUNCH = '2026-10-14';
export function londonKey(date = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit'}).formatToParts(date).map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}
export const dayNumber = key => Math.round((Date.parse(key + 'T12:00:00Z') - Date.parse(LAUNCH + 'T12:00:00Z')) / 864e5) + 1;
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const SITES = ['Jezero crater', 'Gale crater', 'Utopia Planitia', 'Arcadia Planitia', 'Elysium Planitia', 'Meridiani Planum'];
export function makeMission({key = londonKey(), seed = null} = {}) {
  const r = rng(hash(seed === null ? `mars:v1:${key}` : `mars:p:${seed}`));
  const tau = Array.from({length: SOLS}, () => 0.3 + r() * 0.5);
  const s0 = 8 + Math.floor(r() * 14), len = 4 + Math.floor(r() * 5), peak = 1.5 + r() * 1.5;
  for (let i = 0; i < len && s0 + i < SOLS; i++) tau[s0 + i] = +(peak * (1 - Math.abs(i - len / 2) / len)).toFixed(2);
  return {key, practice: seed !== null, number: dayNumber(key), site: SITES[Math.floor(r() * SITES.length)], tau: tau.map(t => +t.toFixed(2)), storm: s0 + 1};
}
export const score = b => b.lost ? 0 : Math.round(b.science + b.o2 + b.water / 4 + b.food / 2);
export function shareText(b, label) {
  const rows = []; for (let i = 0; i < SOLS; i += 10) rows.push(Array.from({length: 10}, (_, k) => { const l = b.log[i + k]; return !l ? '⬛' : l.tau > 1 ? '🟫' : l.low ? '🟨' : '🟩'; }).join(''));
  return `Mars base ${label} ${b.lost ? `lost on sol ${b.sol}` : score(b)}\n${rows.join('\n')}\nhttps://dexmlabs.app/mars-base-game/`;
}
export function streak(history) {
  const keys = Object.keys(history).sort(); let run = 0, best = 0, prev = null;
  for (const k of keys) { run = history[k] > 0 ? (prev && Date.parse(k) - Date.parse(prev) === 864e5 ? run + 1 : 1) : 0; best = Math.max(best, run); prev = k; }
  const last = keys.at(-1), ok = last === londonKey() || last === londonKey(new Date(Date.now() - 864e5));
  return {played: keys.length, streak: ok ? run : 0, best};
}
