/** The daily puzzle: a key sheet with one plugboard cable smudged, an intercept, six tries. */
import {A, ROTORS, crypt} from './enigma.js';
export const LAUNCH = '2026-10-14', TRIES = 6;
export function londonKey(date = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit'}).formatToParts(date).map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}
export const dayNumber = key => Math.round((Date.parse(key + 'T12:00:00Z') - Date.parse(LAUNCH + 'T12:00:00Z')) / 864e5) + 1;
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
// Made up for the game. Spaces become X, as operators did.
export const MESSAGES = ['WEATHER REPORT RAIN FROM THE WEST WIND FORCE FOUR', 'SUPPLY TRUCK DELAYED AT THE BRIDGE ARRIVING TONIGHT', 'NO CHANGE ON THE NORTH FLANK QUIET NIGHT', 'FUEL STOCKS LOW REQUEST TWO TANKERS BY MORNING',
  'RADIO SILENCE FROM MIDNIGHT UNTIL FURTHER ORDERS', 'BRIDGE REPAIRED TRAFFIC MOVING AGAIN', 'FOG IN THE VALLEY ALL FLIGHTS CANCELLED', 'MAIL ARRIVED WITH THE RATIONS ALL WELL', 'NEW KEY SHEETS DUE ON FRIDAY KEEP THEM DRY',
  'TWO MEN SICK WITH FLU REPLACEMENTS REQUESTED', 'ROAD CLOSED BY SNOW USE THE SOUTHERN ROUTE', 'TELEPHONE LINE DOWN AGAIN SEND THE LINESMAN', 'FIELD KITCHEN MOVED TO THE FARM BY THE CHURCH', 'ALL QUIET ON THE COAST NOTHING TO REPORT',
  'SPARE VALVES FOR THE TRANSMITTER NEEDED URGENTLY', 'LEAVE CANCELLED FOR THE WHOLE COMPANY', 'TRAIN LATE BY SIX HOURS DUE TO DAMAGE ON THE LINE', 'HORSES NEED NEW SHOES SEND THE FARRIER', 'MAP SHEETS ARE WRONG THE RIVER HAS MOVED', 'COFFEE RATION HALVED FROM MONDAY'];
const letters = (r, n) => { const s = [...A]; for (let i = s.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [s[i], s[j]] = [s[j], s[i]]; } return s.slice(0, n); };
export const plainOf = m => m.replace(/ /g, 'X');
export function makePuzzle({key = londonKey(), seed = null} = {}) {
  const r = rng(hash(seed === null ? `enigma:v1:${key}` : `enigma:practice:${seed}`));
  const names = Object.keys(ROTORS); for (let i = names.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [names[i], names[j]] = [names[j], names[i]]; }
  const rotors = names.slice(0, 3), rings = letters(r, 3).join(''), positions = letters(r, 3).join('');
  const L = letters(r, 20), pairs = Array.from({length: 10}, (_, i) => L[2 * i] + L[2 * i + 1]), hidden = Math.floor(r() * 10);
  const message = MESSAGES[seed === null ? (dayNumber(key) - 1 + MESSAGES.length * 50) % MESSAGES.length : Math.floor(r() * MESSAGES.length)];
  const settings = {rotors, rings, positions, plugs: pairs.join(' ')};
  return {key, seed, practice: seed !== null, number: dayNumber(key), settings, sheetPlugs: pairs.filter((_, i) => i !== hidden).join(' '), smudged: pairs[hidden], message, cipher: crypt(settings, plainOf(message))};
}
const clean = s => String(s).toUpperCase().replace(/[^A-Z]/g, '');
/** Score a try word by word: true where the word is right. X stands for a space, so either works. */
export function checkTry(puzzle, text) {
  const want = puzzle.message.split(' '), got = String(text).toUpperCase().replace(/X/g, ' ').replace(/[^A-Z ]/g, ' ').split(/\s+/).filter(Boolean);
  const words = want.map((w, i) => got[i] === w);
  return {words, ok: clean(text).replace(/X/g, '') === clean(puzzle.message)};
}
export const play = (st, text) => { if (st.done || !clean(text)) return st; const t = checkTry(st.puzzle, text), tries = [...st.tries, t.words]; return {...st, tries, won: t.ok, done: t.ok || tries.length >= TRIES}; };
export const newState = puzzle => ({puzzle, tries: [], won: false, done: false});
export function shareText(st) {
  const p = st.puzzle, rows = st.tries.map(w => w.map(x => x ? '🟩' : '⬛').join('')).join('\n');
  return `Enigma ${p.practice ? 'practice' : '#' + p.number} ${st.won ? st.tries.length : 'X'}/${TRIES}\n${rows}\nhttps://dexmlabs.app/enigma-machine/`;
}
export function streak(history) {
  const keys = Object.keys(history).sort(); let run = 0, best = 0, prev = null;
  for (const k of keys) { run = history[k] ? (prev && Date.parse(k) - Date.parse(prev) === 864e5 ? run + 1 : 1) : 0; best = Math.max(best, run); prev = k; }
  const last = keys.at(-1), ok = last === londonKey() || last === londonKey(new Date(Date.now() - 864e5));
  return {played: keys.length, won: keys.filter(k => history[k]).length, streak: ok ? run : 0, best};
}
