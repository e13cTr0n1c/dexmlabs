// Daily Drop: one shared challenge a day, by the date in the UK (Europe/London), the same for everyone.
// Pure helpers, no DOM, so the tests can run them in Node.
export const LAUNCH = '2026-10-20', TZ = 'Europe/London';
const fmt = new Intl.DateTimeFormat('en-CA', {timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit'});
const parts = d => Object.fromEntries(fmt.formatToParts(d).filter(p => p.type !== 'literal').map(p => [p.type, +p.value]));
// The UK date, as YYYY-MM-DD.
export function ukDate(now = new Date()) { const p = parts(now); return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`; }
const dayIndex = s => { const [y, m, d] = s.split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / 864e5); };
export const addDays = (s, n) => new Date((dayIndex(s) + n) * 864e5).toISOString().slice(0, 10);
// Puzzle number: days since the launch date, so launch day is #0.
export const puzzleNo = (s = ukDate()) => dayIndex(s) - dayIndex(LAUNCH);
// London's offset from UTC in minutes at a moment.
function offsetAt(ms) { const p = new Intl.DateTimeFormat('en-GB', {timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric'}).formatToParts(new Date(ms)).reduce((o, x) => (o[x.type] = +x.value, o), {});
  return Math.round((Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ms / 1000) * 1000) / 6e4); }
// The moment of the next UK midnight, when the next drop arrives.
export function nextDrop(now = new Date()) {
  const [y, m, d] = addDays(ukDate(now), 1).split('-').map(Number), guess = Date.UTC(y, m - 1, d);
  let t = guess - offsetAt(guess) * 6e4; t = guess - offsetAt(t) * 6e4; return t;
}
export const countdown = (now = new Date()) => { const s = Math.max(0, Math.ceil((nextDrop(now) - now.getTime()) / 1000)); return `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
// A 32 bit seed from the date and the game's name.
export function seedFor(date, salt = '') { let h = 2166136261; for (const c of salt + '|' + date) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
export function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
// One square per part of the score, a fraction of its best.
export const square = f => f >= 0.8 ? '🟩' : f >= 0.5 ? '🟨' : f > 0 ? '🟧' : '🟥';
export const grid = fs => fs.map(square).join('');
// The one scored attempt a day, kept in this browser.
export function makeStore(key, ls = globalThis.localStorage) {
  const all = () => { try { return JSON.parse(ls.getItem(key)) || {}; } catch { return {}; } };
  return {all, get: date => all()[date] || null, put: (date, rec) => { const a = all(); if (a[date]) return false; a[date] = rec; try { ls.setItem(key, JSON.stringify(a)); } catch {} return true; },
    streak: date => { const a = all(); let n = 0; for (let d = date; a[d]; d = addDays(d, -1)) n++; return n; }};
}
