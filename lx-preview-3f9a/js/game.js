/** Daily round: wheel patterns, QEP book page, the intercept, scoring, streak and share text. No DOM. */
import {WHEELS, WHEEL, MODELS, MARK, SPACE, POSITION_BASE, encodeText, crypt, toBP} from './lorenz.js';
import {mulberry32, dailySeed, dayNumber, utcDateKey, hashString, randomInt, shuffle, SEED_VERSION} from './seed.js';
import {MESSAGES, MESSAGE_SETS, ALSO_LIVE} from './messages.js';

/** hint: what each hint costs in shared points (DexmPoints). Hints don't touch the score, only wrong tries do. */
export const RULES = Object.freeze({base:1000, wrong:150, hint:{reveal:50, check:20}, floor:100, bookEntries:6});

/** Longest run of identical cams, going round the wheel (it's a loop). */
export function longestRun(bits) {
  const n = bits.length; if (!n) return 0;
  if (bits.every(b => b === bits[0])) return n;
  let start = bits.findIndex((b, i) => b !== bits[(i - 1 + n) % n]); let best = 0, run = 0, prev = null;
  for (let k = 0; k < n; k++) { const b = bits[(start + k) % n]; run = b === prev ? run + 1 : 1; prev = b; best = Math.max(best, run); }
  return best;
}
/** A cam pattern with exactly `crosses` raised cams and no run longer than maxRun. The real patterns were set
 *  by the Germans from books that were never published, so these are generated: my rules, not theirs. */
export function makePattern(rng, size, crosses, maxRun) {
  for (let tries = 0; tries < 5000; tries++) {
    const bits = shuffle(rng, Array.from({length:size}, (_, i) => i < crosses ? MARK : SPACE));
    if (longestRun(bits) <= maxRun) return bits;
  }
  throw new Error('Could not make a pattern');
}
/** Patterns for all twelve wheels: chi and psi about half raised, no run over 4; the motor wheels lean towards
 *  crosses (go) so the psi wheels move more often than not, with no run over 5. */
export function makePatterns(rng) {
  const p = {};
  for (const w of WHEELS) {
    if (w.group === 'mu') p[w.id] = makePattern(rng, w.size, Math.round(w.size * (w.id === 'mu61' ? 0.62 : 0.57)), 5);
    else p[w.id] = makePattern(rng, w.size, rng() < .5 ? Math.floor(w.size / 2) : Math.ceil(w.size / 2), 4);
  }
  return p;
}
export const randomPositions = rng => Object.fromEntries(WHEELS.map(w => [w.id, randomInt(rng, POSITION_BASE, w.size - 1 + POSITION_BASE)]));
export const pad2 = n => String(n).padStart(2, '0');

/** One smudged digit on today's entry: the tens digit of one wheel, so the player has 2 to 6 candidates. */
export function makeSmudge(rng, start) {
  const w = WHEELS[randomInt(rng, 0, WHEELS.length - 1)], p = start[w.id], units = p % 10;
  const candidates = [];
  for (let v = POSITION_BASE; v <= w.size - 1 + POSITION_BASE; v++) if (v % 10 === units) candidates.push(v);
  return {wheel:w.id, shown:`?${units}`, candidates};
}

/** The list a day uses: the latest set that had started by that UTC date. */
export const messageListFor = key => (MESSAGE_SETS.filter(s => s.from <= key).pop() || MESSAGE_SETS[0]).list;
/** The message for a day: a fixed shuffle of that day's list, walked one per day, so it won't repeat for 40 days. */
export function messageFor(number, key = '9999-12-31') {
  const list = messageListFor(key);
  const order = shuffle(mulberry32(hashString(`${SEED_VERSION}:messages`)), list.map((_, i) => i));
  return list[order[((number - 1) % order.length + order.length) % order.length]];
}
/** Every message a player could have been given for a daily round: the day's own, plus any that were also live. */
export const acceptedTexts = round => [round.text, ...(round.mode === 'daily' ? (ALSO_LIVE[round.key] || []) : [])].filter((t, i, a) => a.indexOf(t) === i);

/** Build a round. mode 'daily' uses the UTC date; 'practice' takes any seed. */
export function makeRound({mode = 'daily', date = new Date(), seed, model, text: given} = {}) {
  const key = utcDateKey(date), number = dayNumber(date);
  const s = mode === 'daily' ? dailySeed(date) : (seed >>> 0);
  const rng = mulberry32(s);
  const patterns = makePatterns(rng);
  const start = randomPositions(rng);
  const qep = randomInt(rng, 1, 99);
  const chosenModel = model || (rng() < 1 / 3 ? MODELS.SZ42A : MODELS.SZ40);
  const smudge = makeSmudge(rng, start);
  const others = new Set([qep]); const book = [];
  while (book.length < RULES.bookEntries - 1) { const q = randomInt(rng, 1, 99); if (!others.has(q)) { others.add(q); const st = randomPositions(rng); book.push({qep:q, start:st, smudge: rng() < .5 ? makeSmudge(rng, st) : null}); } }
  // Today's line always carries today's smudge: the book, the hint and the decode all read this one entry.
  book.splice(randomInt(rng, 0, book.length), 0, {qep, start, smudge});
  const picked = mode === 'daily' ? messageFor(number, key) : MESSAGES[randomInt(rng, 0, MESSAGES.length - 1)];
  // A saved round can carry the text it was played with, so the tape and the answer always come from the same message.
  const text = typeof given === 'string' && given ? given : picked;
  const plainCodes = [...encodeText(text)];
  const cipherCodes = crypt(plainCodes, {patterns, start, model:chosenModel});
  return {mode, key, number, seed:s, model:chosenModel, patterns, start, qep, smudge, book: book.sort((a, b) => a.qep - b.qep), text, plainCodes, cipherCodes, cipher: toBP(cipherCodes)};
}

/** The book line for the round's QEP number. The rendered book and the reveal hint both read from it. */
export const answerLine = round => round.book.find(e => e.qep === round.qep);
/** What one cell of the book shows. A smudged cell keeps its '?' for good; once the smudge has been read
 *  (the reveal hint, answer line only), the full figure comes with it as `read`. */
export function bookCell(round, entry, wheel, revealed = false) {
  const value = pad2(entry.start[wheel]), sm = entry.smudge?.wheel === wheel ? entry.smudge : null;
  if (!sm) return {text: value, smudged: false, read: null};
  return {text: sm.shown, smudged: true, read: revealed && entry.qep === round.qep ? value : null};
}
/** The words of the 'Read the smudge' hint, from the answer line. Null when that line is fully readable. */
export function revealText(round) {
  const sm = answerLine(round)?.smudge; if (!sm) return null;
  return `The smudged figure on QEP ${pad2(round.qep)} is ${WHEEL[sm.wheel].label} at ${pad2(answerLine(round).start[sm.wheel])}.`;
}

/** Pure round state. */
export const newState = round => ({round, attempts:[], hints:[], solved:false, score:0});
export const settingsKey = settings => WHEELS.map(w => pad2(settings[w.id])).join(' ');
export const wrongWheels = (round, settings) => WHEELS.filter(w => Number(settings[w.id]) !== round.start[w.id]).map(w => w.id);
export function penalty(state) {
  return state.attempts.filter(a => !a.ok).length * RULES.wrong;
}
export const scoreFor = state => Math.max(RULES.floor, RULES.base - penalty(state));

/** Record a decode attempt. A repeat of the exact same wrong settings costs nothing extra. */
export function attempt(state, settings) {
  if (state.solved) return {state, result:{ok:true, repeat:true}};
  const k = settingsKey(settings), ok = wrongWheels(state.round, settings).length === 0;
  const repeat = !ok && state.attempts.some(a => a.key === k);
  const attempts = repeat ? state.attempts : [...state.attempts, {key:k, ok}];
  const next = {...state, attempts, solved: ok};
  next.score = ok ? scoreFor(next) : 0;
  return {state: next, result: {ok, repeat}};
}
/** Hints: 'reveal' shows the smudged wheel's position on the answer line (free and empty if it has no smudge);
 *  'check' says whether one wheel is right. */
export function useHint(state, type, settings, wheel) {
  if (state.solved) return {state, answer:null};
  if (type === 'reveal') {
    const line = answerLine(state.round), sm = line?.smudge; if (!sm) return {state, answer:null};
    const already = state.hints.some(h => h.type === 'reveal');
    return {state: already ? state : {...state, hints:[...state.hints, {type}]}, answer:{wheel:sm.wheel, value:line.start[sm.wheel]}};
  }
  if (type === 'check') {
    if (!WHEEL[wheel]) throw new RangeError('Unknown wheel');
    return {state: {...state, hints:[...state.hints, {type, wheel}]}, answer:{wheel, right: Number(settings[wheel]) === state.round.start[wheel]}};
  }
  throw new RangeError('Unknown hint');
}

export function shareText(state, url) {
  const r = state.round, tries = state.attempts.length, label = r.mode === 'daily' ? `#${r.number}` : 'practice';
  const squares = state.attempts.map(a => a.ok ? '\u{1F7E9}' : '\u{1F7E5}').join('');
  const hints = state.hints.length ? `, ${state.hints.length} hint${state.hints.length > 1 ? 's' : ''}` : '';
  return `Lorenz ${label}, QEP ${pad2(r.qep)}\n${state.solved ? `Decoded on try ${tries}${hints}` : 'Not decoded'}\n${squares} ${state.score.toLocaleString('en-GB')} pts\n${url}`;
}

/** Daily stats: best score and a streak of consecutive UTC days decoded. Practice never counts. */
export function updateStats(previous, state) {
  if (state.round.mode !== 'daily' || !state.solved) return previous || {history:{}, streak:0, bestStreak:0, best:0, rounds:0};
  const history = {...(previous?.history || {})};
  history[state.round.key] = {score: Math.max(history[state.round.key]?.score || 0, state.score), tries: state.attempts.length};
  return statsFrom(history);
}
export function statsFrom(history, today) {
  const dates = Object.keys(history).sort(); let run = 0, bestStreak = 0, last = '';
  for (const k of dates) { run = last && Date.parse(k) - Date.parse(last) === 86400000 ? run + 1 : 1; bestStreak = Math.max(bestStreak, run); last = k; }
  if (today && last && Date.parse(today) - Date.parse(last) > 86400000) run = 0;
  return {history, best: Math.max(0, ...Object.values(history).map(h => h.score)), streak: run, bestStreak, lastPlayed: last, rounds: dates.length};
}
export function msToNextDay(now = new Date()) { const d = new Date(now); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1) - d.getTime(); }
