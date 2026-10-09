/** Hard mode: the same daily round as normal, plus a dated five page book, the QEP sent in clear on the tape
 *  (the preamble), the answer read off punched tape, and its own score and streak. No DOM. */
import {BP, FIGURES, FIGURE_CONTROLS, SHIFT, WHEEL, encodeText, decodeText, dotsCrosses, fromBP} from './lorenz.js';
import {makeRound, randomPositions, makeSmudge, pad2, answerLine, RULES, statsFrom} from './game.js';
import {mulberry32, hashString, randomInt, shuffle, SEED_VERSION} from './seed.js';

export const HARD_RULES = Object.freeze({base:1000, wrong:150, qepBonus:200, floor:100, pages:5,
  hint:Object.freeze({qep:200, char:50, check:100, smudge:300})});
export const HARD_PREFIX = 'hard:';
const DAY = 86400000;

/** "Friday 9 October", always in UTC so every player sees the same page dates. */
export const pageDate = key => new Date(key + 'T12:00:00Z').toLocaleDateString('en-GB', {weekday:'long', day:'numeric', month:'long', timeZone:'UTC'});

/** Build the five dated pages for a round. Today's page is the normal book, unchanged. The other four are
 *  nearby dates, each with the same number of lines, and each also has a line for today's QEP number with
 *  other settings, so the date is what tells you which one to use. Uses its own random stream, so normal
 *  mode's round is untouched. */
export function makePages(round) {
  const rng = mulberry32(hashString(`${SEED_VERSION}:hard:${round.key}`)), today = Date.parse(round.key);
  const offsets = shuffle(rng, [-7, -6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7]).slice(0, HARD_RULES.pages - 1);
  const decoys = offsets.map(off => {
    const key = new Date(today + off * DAY).toISOString().slice(0, 10), seen = new Set([round.qep]), book = [];
    const st = randomPositions(rng); book.push({qep:round.qep, start:st, smudge: rng() < .5 ? makeSmudge(rng, st) : null});
    while (book.length < round.book.length) { const q = randomInt(rng, 1, 99); if (seen.has(q)) continue; seen.add(q); const s = randomPositions(rng); book.push({qep:q, start:s, smudge: rng() < .5 ? makeSmudge(rng, s) : null}); }
    return {key, today:false, book: book.sort((a, b) => a.qep - b.qep)};
  });
  const pages = [...decoys, {key:round.key, today:true, book:round.book}].sort((a, b) => a.key.localeCompare(b.key));
  const wrong = pages.map((p, i) => i).filter(i => !pages[i].today);
  return {pages, todayIndex: pages.findIndex(p => p.today), openIndex: wrong[randomInt(rng, 0, wrong.length - 1)]};
}
/** The round as it looks on one page: its own lines, and only today's page holds the answer line. */
export const pageRound = (round, page) => ({...round, book: page.book, qep: page.today ? round.qep : -1});

/** The preamble, sent in clear (not enciphered): letter shift, QEP, space, figure shift, the two figures,
 *  then back to letters. */
export const preambleCodes = qep => [SHIFT.LTRS, ...encodeText(`QEP ${pad2(qep)}`)];
export function readPreamble(codes) { const m = decodeText(codes).match(/QEP\s*(\d{1,2})/); return m ? Number(m[1]) : null; }

export function makeHardRound(opts = {}) {
  const round = makeRound({...opts, mode:'daily'}), book = makePages(round);
  return {...round, hard:true, ...book, preamble: preambleCodes(round.qep)};
}

/** The cheat sheet, straight from lorenz.js: holes, letter shift and figure shift for all 32 codes. */
const CONTROL = {0:'Blank (all dots)', 2:'Carriage return', 4:'Space', 8:'Line feed', 27:'Figure shift', 31:'Letter shift'};
export const CHEAT_SHEET = Object.freeze(BP.map((bp, code) => Object.freeze({code, bp, holes: dotsCrosses(code),
  letter: CONTROL[code] ?? bp, figure: CONTROL[code] ?? (FIGURES[bp] || FIGURE_CONTROLS[bp] || '')})));

/* ---------- Answer matching ---------- */
const TRAIL = /[\s.,;:?!'"=+%()\/-]+$/;
/** Upper case, one space between words, nothing trailing. */
export const canon = s => String(s ?? '').toUpperCase().replace(/[\r\n\t]+/g, ' ').replace(/ +/g, ' ').trim().replace(TRAIL, '').trim();
/** Letters, figures and single spaces only. */
export const loose = s => canon(s).replace(/[^A-Z0-9 ]+/g, ' ').replace(/ +/g, ' ').trim();
/** The ways a reading can be meant: as typed; as Bletchley letters (9 space, 5 figures, 8 letters, 3 and 4 line ends);
 *  and with a 9 that isn't part of a number taken as a space. */
export function readings(input) {
  const s = String(input ?? ''), out = [s];
  const t = s.toUpperCase().replace(/\s+/g, '');
  if (/^[A-Z\/34589]+$/.test(t) && /[3459]/.test(t)) { const r = fromBP(t); if (r.ok) out.push(decodeText(r.codes)); }
  out.push(s.toUpperCase().replace(/(?<![0-8])9+(?![0-8])/g, ' '));
  return out;
}
export function matchAnswer(input, target) {
  const c = canon(target), l = loose(target), all = readings(input);
  const ok = all.some(r => canon(r) === c || loose(r) === l);
  const best = Math.max(...all.map(r => { const a = canon(r); let n = 0; for (let i = 0; i < c.length; i++) if (a[i] === c[i]) n++; return n; }));
  return {ok, right: ok ? c.length : best, of: c.length};
}

/* ---------- State, scoring, hints ---------- */
export const newHardState = round => ({round, answers:[], hints:[], qepGuesses:[], ran:null, solved:false, score:0});
const firstGuessRight = st => st.qepGuesses.length > 0 && st.qepGuesses[0] === st.round.qep && !st.hints.some(h => h.type === 'qep');
export const qepKnown = st => st.hints.some(h => h.type === 'qep') || st.qepGuesses.includes(st.round.qep);
export function hardPenalty(st) {
  return st.answers.filter(a => !a.ok).length * HARD_RULES.wrong + st.hints.reduce((s, h) => s + (HARD_RULES.hint[h.type] || 0), 0);
}
export const hardScoreFor = st => Math.max(HARD_RULES.floor, HARD_RULES.base + (firstGuessRight(st) ? HARD_RULES.qepBonus : 0) - hardPenalty(st));
export function hardBreakdown(st) {
  const f = n => Math.round(n).toLocaleString('en-GB'), lines = [['Decoded', f(HARD_RULES.base)]];
  if (firstGuessRight(st)) lines.push(['Read the preamble first time', `+${f(HARD_RULES.qepBonus)}`]);
  const wrong = st.answers.filter(a => !a.ok).length; if (wrong) lines.push([`${wrong} wrong ${wrong > 1 ? 'readings' : 'reading'}`, `\u2212${f(wrong * HARD_RULES.wrong)}`]);
  const names = {qep:'Revealed the QEP', char:'Revealed characters', check:'Wheel checks', smudge:'Read the smudge'};
  for (const type of ['qep', 'char', 'check', 'smudge']) { const n = st.hints.filter(h => h.type === type).length; if (n) lines.push([n > 1 ? `${names[type]} (${n})` : names[type], `\u2212${f(n * HARD_RULES.hint[type])}`]); }
  const total = hardScoreFor(st); if (total === HARD_RULES.floor) lines.push(['Never less than', f(HARD_RULES.floor)]);
  return {lines, total};
}
/** Type the QEP you read off the preamble. Free; the bonus is only for getting it on the first go. */
export function guessQep(st, value) {
  const n = Number(String(value ?? '').trim()); if (!Number.isInteger(n) || n < 1 || n > 99) return {state:st, result:{valid:false}};
  if (st.solved || qepKnown(st)) return {state:st, result:{valid:true, ok: n === st.round.qep, repeat:true}};
  return {state:{...st, qepGuesses:[...st.qepGuesses, n]}, result:{valid:true, ok: n === st.round.qep}};
}
/** Check a reading of the output tape against the message. A repeat of the same wrong reading is free. */
export function submitAnswer(st, input) {
  if (st.solved) return {state:st, result:{ok:true, repeat:true}};
  const m = matchAnswer(input, st.round.text), key = canon(input);
  if (!key) return {state:st, result:{ok:false, empty:true, right:0, of:m.of}};
  const repeat = !m.ok && st.answers.some(a => a.key === key);
  const answers = repeat ? st.answers : [...st.answers, {key, ok:m.ok}];
  const next = {...st, answers, solved:m.ok}; next.score = m.ok ? hardScoreFor(next) : 0;
  return {state:next, result:{...m, repeat}};
}
/** Characters of the message as printed, for the reveal a character hint. */
export const messageChars = round => [...canon(round.text)];
export function useHardHint(st, type, {settings, wheel} = {}) {
  if (st.solved || !HARD_RULES.hint[type]) return {state:st, answer:null};
  if (type === 'qep') { if (st.hints.some(h => h.type === 'qep')) return {state:st, answer:{qep:st.round.qep}}; return {state:{...st, hints:[...st.hints, {type}]}, answer:{qep:st.round.qep}}; }
  if (type === 'char') { const chars = messageChars(st.round), i = st.hints.filter(h => h.type === 'char').length; if (i >= chars.length) return {state:st, answer:null};
    return {state:{...st, hints:[...st.hints, {type}]}, answer:{index:i, char:chars[i]}}; }
  if (type === 'check') { if (!WHEEL[wheel]) throw new RangeError('Unknown wheel'); return {state:{...st, hints:[...st.hints, {type, wheel}]}, answer:{wheel, right: Number(settings?.[wheel]) === st.round.start[wheel]}}; }
  const line = answerLine(st.round), sm = line?.smudge; if (!sm) return {state:st, answer:null};
  const already = st.hints.some(h => h.type === 'smudge');
  return {state: already ? st : {...st, hints:[...st.hints, {type}]}, answer:{wheel:sm.wheel, value:line.start[sm.wheel]}};
}
export const revealedChars = st => messageChars(st.round).slice(0, st.hints.filter(h => h.type === 'char').length).join('');
/** The smudge hint in hard mode: names the wheel and figure but not the QEP or the page. */
export function hardSmudgeText(round) {
  const line = answerLine(round), sm = line?.smudge; if (!sm) return null;
  return `On today's page, the smudged figure on your line is ${WHEEL[sm.wheel].label} at ${pad2(line.start[sm.wheel])}.`;
}

/** Saved hard progress, checked field by field. */
export function restoreHard(round, saved) {
  const s = saved && typeof saved === 'object' ? saved : {};
  const answers = Array.isArray(s.answers) ? s.answers.filter(a => a && typeof a.key === 'string').map(a => ({key:a.key, ok:Boolean(a.ok)})) : [];
  const hints = Array.isArray(s.hints) ? s.hints.filter(h => h && HARD_RULES.hint[h.type]).map(h => h.type === 'check' ? {type:'check', wheel:String(h.wheel)} : {type:h.type}) : [];
  const qepGuesses = Array.isArray(s.qepGuesses) ? s.qepGuesses.filter(n => Number.isInteger(n) && n >= 1 && n <= 99) : [];
  const ran = s.ran && typeof s.ran === 'object' ? s.ran : null;
  const st = {...newHardState(round), answers, hints, qepGuesses, ran, solved: s.solved === true && answers.some(a => a.ok)};
  st.score = st.solved ? hardScoreFor(st) : 0;
  return st;
}
/** Hard mode stats, kept apart from normal mode's. */
export function updateHardStats(previous, st) {
  if (!st.solved) return previous || statsFrom({});
  const history = {...(previous?.history || {})};
  history[st.round.key] = {score: Math.max(history[st.round.key]?.score || 0, st.score), tries: st.answers.length};
  return statsFrom(history);
}
export function hardShareText(st, url) {
  const r = st.round, squares = st.answers.map(a => a.ok ? '\u{1F7E8}' : '\u{1F7E5}').join(''), n = st.hints.length;
  return `Lorenz #${r.number} HARD\n${st.solved ? `Read on try ${st.answers.length}${n ? `, ${n} hint${n > 1 ? 's' : ''}` : ''}` : 'Not read yet'}\n${squares} ${st.score.toLocaleString('en-GB')} pts\n${url}`;
}
export {RULES};
