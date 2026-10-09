/** Hard mode: the same daily round as normal, plus a dated five page book, the QEP sent in clear on the tape
 *  (the preamble), the answer read off punched tape, and its own score and streak. No DOM. */
import {BP, FIGURES, FIGURE_CONTROLS, SHIFT, WHEEL, encodeText, decodeText, dotsCrosses, fromBP, crypt} from './lorenz.js';
import {makeRound, acceptedTexts, randomPositions, makeSmudge, pad2, answerLine, RULES, statsFrom} from './game.js';
import {mulberry32, hashString, randomInt, shuffle, SEED_VERSION} from './seed.js';

export const HARD_RULES = Object.freeze({base:1000, wrong:150, qepBonus:200, floor:100, pages:5,
  hint:Object.freeze({qep:40, char:10, check:20, smudge:50}),  // hints cost shared points, not score
  reply:Object.freeze({base:300, wrong:100, floor:50}),  // the reply you send back is scored on its own
  pins:250});  // the old optional pin bonus in hard mode: only kept so rounds read with it keep their score
/** Realistic mode: hard mode, plus every wheel's pins set by hand from the pattern sheet. Scored on its own, higher. */
export const REAL_RULES = Object.freeze({base:1500, wrong:150, qepBonus:250, floor:150});
const rulesOf = st => st.round?.realistic ? REAL_RULES : HARD_RULES;
export const HARD_PREFIX = 'hard:';
const DAY = 86400000;

/** "Friday 9 October", always in UTC so every player sees the same page dates. */
export const pageDate = key => new Date(key + 'T12:00:00Z').toLocaleDateString('en-GB', {weekday:'long', day:'numeric', month:'long', timeZone:'UTC'});

/** Build the five dated pages for a round. Today's page is the normal book, unchanged. The other four are
 *  nearby dates, each with the same number of lines, and each also has a line for today's QEP number with
 *  other settings, so the date is what tells you which one to use. Uses its own random stream, so normal
 *  mode's round is untouched. */
export function makePages(round) {
  // Daily pages come from the date; practice pages from the practice seed, so every practice book is different.
  const salt = round.mode === 'practice' ? `practice:${round.seed}` : round.key;
  const rng = mulberry32(hashString(`${SEED_VERSION}:hard:${salt}`)), today = Date.parse(round.key);
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

/** A hard round. By default it's today's daily; with mode 'practice' it's a random practice round (any seed and
 *  model), dated today, with its own book pages, preamble and message. */
export function makeHardRound(opts = {}) {
  const round = makeRound({...opts, mode: opts.mode === 'practice' ? 'practice' : 'daily'}), book = makePages(round);
  return {...round, hard:true, realistic: Boolean(opts.realistic), ...book, preamble: preambleCodes(round.qep)};
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
/** What's compared: capitals, figures and single spaces. Punctuation, shifts and line ends don't count, because
 *  figure shift punctuation is easy to misread and isn't what the puzzle is about. Figures must match exactly. */
export const norm = s => String(s ?? '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
const words = s => { const n = norm(s); return n ? n.split(' ') : []; };
/** Edit distance, for the one letter typo allowance. */
function lev(a, b) {
  const d = Array.from({length: a.length + 1}, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
/** Words of the target found in order in the reading (longest common subsequence), so one slip early on
 *  doesn't make everything after it count as wrong. */
function wordsRight(a, b) {
  const d = Array.from({length: a.length + 1}, () => Array(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = a[i - 1] === b[j - 1] ? d[i - 1][j - 1] + 1 : Math.max(d[i - 1][j], d[i][j - 1]);
  return d[a.length][b.length];
}
/** A single letter typo in one word made only of letters still counts. Figures never get that allowance. */
function oneTypo(a, b) {
  if (a.length !== b.length || b.length < 3) return false;
  const diff = a.map((w, i) => i).filter(i => a[i] !== b[i]);
  return diff.length === 1 && /^[A-Z]+$/.test(a[diff[0]]) && /^[A-Z]+$/.test(b[diff[0]]) && lev(a[diff[0]], b[diff[0]]) === 1;
}
/** Check a reading against the message (or messages) the player's tape could have said. */
export function matchAnswer(input, targets) {
  const list = (Array.isArray(targets) ? targets : [targets]).filter(t => typeof t === 'string' && t);
  let best = {ok:false, near:false, right:0, of: words(list[0]).length, unit:'words'};
  for (const target of list) {
    const tw = words(target);
    for (const r of readings(input)) {
      const rw = words(r);
      if (rw.join(' ') === tw.join(' ')) return {ok:true, near:false, right:tw.length, of:tw.length, unit:'words', target};
      if (oneTypo(rw, tw)) return {ok:true, near:true, right:tw.length - 1, of:tw.length, unit:'words', target};
      const right = wordsRight(rw, tw);
      if (right / tw.length > best.right / best.of) best = {ok:false, near:false, right, of:tw.length, unit:'words'};
    }
  }
  return best;
}

/* ---------- State, scoring, hints ---------- */
export const newHardState = round => ({round, answers:[], hints:[], qepGuesses:[], ran:null, solved:false, score:0, reply:{tries:[], done:false, score:0}, pins:{...newPins(), on: Boolean(round.realistic)}, step: round.realistic ? 'qep' : null});

/* ---------- Realistic mode's guided steps ---------- */
/** Read the QEP, set the pins, set the start positions, run the tape and read it. You can go back to any step you've
 *  reached; nothing about the steps says whether your pins are right. */
export const GUIDE_STEPS = Object.freeze(['qep', 'pins', 'start', 'run']);
/** The step to show: the one asked for, as long as the QEP has been read for anything past the first. */
export function guideStep(st, want) {
  if (!st?.round?.realistic) return null;
  const known = st.solved || st.hints.some(h => h.type === 'qep') || st.qepGuesses.includes(st.round.qep);
  if (!known) return 'qep';
  return GUIDE_STEPS.includes(want) && want !== 'qep' ? want : want === 'qep' ? 'qep' : st.ran ? 'run' : 'pins';
}
export const setStep = (st, want) => ({...st, step: guideStep(st, want)});

/* ---------- Setting the wheel patterns too (optional) ---------- */
/** Every pin starts down: you copy the day's patterns from the sheet yourself. */
export const blankPins = () => Object.fromEntries(Object.values(WHEEL).map(w => [w.id, new Array(w.size).fill(0)]));
export const newPins = () => ({on:false, grid:blankPins(), ranRight:false, earned:false});
/** True only when every pin on all twelve wheels matches the day's patterns. */
export const pinsMatch = (round, grid) => Object.values(WHEEL).every(w => Array.isArray(grid?.[w.id]) && grid[w.id].length === w.size && grid[w.id].every((b, i) => (b ? 1 : 0) === round.patterns[w.id][i]));
/** The patterns the machine runs on: your own pins in realistic mode, the day's otherwise. */
export const runPatterns = st => st.round.realistic ? st.pins.grid : st.round.patterns;
export function togglePin(st, id, i) {
  if (st.solved || !st.round.realistic || !WHEEL[id] || !(i >= 0 && i < WHEEL[id].size)) return st;
  const grid = {...st.pins.grid, [id]: st.pins.grid[id].slice()}; grid[id][i] = grid[id][i] ? 0 : 1;
  return {...st, pins:{...st.pins, grid, ranRight:false}};
}
export const clearPins = (st, id) => st.solved || !st.round.realistic || !WHEEL[id] ? st : {...st, pins:{...st.pins, grid:{...st.pins.grid, [id]: new Array(WHEEL[id].size).fill(0)}, ranRight:false}};
/** Note a run of the tape: the bonus needs the last run before the answer to be on your own, correct patterns. */
export const notePinRun = st => ({...st, pins:{...st.pins, ranRight: Boolean(st.round.realistic && pinsMatch(st.round, st.pins.grid))}});
const packPins = grid => Object.fromEntries(Object.entries(grid).map(([k, v]) => [k, v.join('')]));
export const savePins = p => ({on:p.on, grid:packPins(p.grid), ranRight:p.ranRight, earned:p.earned});
function readPins(saved) {
  const p = newPins(); if (!saved || typeof saved !== 'object') return p;
  for (const w of Object.values(WHEEL)) { const g = saved.grid?.[w.id]; if (typeof g === 'string' && g.length === w.size && /^[01]+$/.test(g)) p.grid[w.id] = [...g].map(Number); }
  return {...p, on:saved.on === true, ranRight:saved.ranRight === true, earned:saved.earned === true};
}

/* ---------- The reply ---------- */
const ACKS = ['ACKNOWLEDGED.', 'RECEIVED AND UNDERSTOOD.', 'PASSED TO HIGHER COMMAND.', 'NOTED. NO FURTHER ORDERS.', 'UNDERSTOOD. WILL COMPLY.'];
/** The short reply you send back once you've read the message. It names the message you read (its first few words)
 *  and adds an acknowledgement picked from the day (or the practice seed), so it's fixed for the round. */
export function replyFor(round) {
  const first = canon(round.text).split('.')[0].split(' ').filter(Boolean).slice(0, 4).join(' ');
  const pick = mulberry32(hashString(`reply:${SEED_VERSION}:${round.mode === 'practice' ? 'p' + round.seed : round.key}:${round.text}`))();
  return `YOUR ${first} RECEIVED. ${ACKS[Math.floor(pick * ACKS.length)]}`;
}
/** What the machine punches when you encipher `text` with your wheel `settings`. Throws on characters the
 *  teleprinter can't send. */
export const replyTape = (round, text, settings) => crypt(encodeText(canon(text)), {patterns: round.patterns, start: settings, model: round.model});
/** A punched reply passes if it reads as the reply on the round's real start positions, using the same answer
 *  check as the message (case, spacing, punctuation and one wrong letter in one word don't matter). */
export function replyReads(round, codes) {
  const back = decodeText(crypt(codes, {patterns: round.patterns, start: round.start, model: round.model}));
  return matchAnswer(back, [replyFor(round)]).ok;
}
export const replyScoreFor = st => Math.max(HARD_RULES.reply.floor, HARD_RULES.reply.base - st.reply.tries.filter(t => !t.ok).length * HARD_RULES.reply.wrong);
/** Send a punched reply. Only once the message is read; the same wrong tape twice is free. */
export function submitReply(st, codes) {
  if (!st.solved) return {state:st, result:{ok:false, notReady:true}};
  if (st.reply.done) return {state:st, result:{ok:true, repeat:true}};
  const key = codes.join(','), ok = replyReads(st.round, codes), repeat = !ok && st.reply.tries.some(t => t.key === key);
  const tries = repeat ? st.reply.tries : [...st.reply.tries, {key, ok}];
  const reply = {tries, done: ok, score: 0}; const next = {...st, reply}; reply.score = ok ? replyScoreFor(next) : 0;
  return {state:next, result:{ok, repeat}};
}
/** A hard round is finished when the message is read and the reply has gone back. */
export const hardComplete = st => Boolean(st.solved && st.reply?.done);
const firstGuessRight = st => st.qepGuesses.length > 0 && st.qepGuesses[0] === st.round.qep && !st.hints.some(h => h.type === 'qep');
export const qepKnown = st => st.hints.some(h => h.type === 'qep') || st.qepGuesses.includes(st.round.qep);
export function hardPenalty(st) {
  return st.answers.filter(a => !a.ok).length * rulesOf(st).wrong;
}
const legacyPins = st => !st.round?.realistic && st.pins?.earned ? HARD_RULES.pins : 0;
export const hardScoreFor = st => { const R = rulesOf(st); return Math.max(R.floor, R.base + (firstGuessRight(st) ? R.qepBonus : 0) - hardPenalty(st)) + legacyPins(st); };
export function hardBreakdown(st) {
  const R = rulesOf(st), f = n => Math.round(n).toLocaleString('en-GB'), lines = [[st.round.realistic ? 'Decoded on your own pins' : 'Decoded', f(R.base)]];
  if (firstGuessRight(st)) lines.push(['Read the preamble first time', `+${f(R.qepBonus)}`]);
  const wrong = st.answers.filter(a => !a.ok).length; if (wrong) lines.push([`${wrong} wrong ${wrong > 1 ? 'readings' : 'reading'}`, `\u2212${f(wrong * R.wrong)}`]);
  if (legacyPins(st)) lines.push(['Set the wheel patterns too', `+${f(HARD_RULES.pins)}`]);
  const total = hardScoreFor(st); if (total - legacyPins(st) === R.floor) lines.push(['Never less than', f(R.floor)]);
  const reply = [['Reply sent', f(st.reply?.score || 0)]], rw = (st.reply?.tries || []).filter(t => !t.ok).length;
  if (rw) reply.push([`${rw} wrong ${rw > 1 ? 'tapes' : 'tape'} before it`, `\u2212${f(rw * HARD_RULES.reply.wrong)}`]);
  return {lines, total, reply, replyTotal: st.reply?.score || 0};
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
  const m = matchAnswer(input, acceptedTexts(st.round)), key = canon(input);
  if (!key) return {state:st, result:{ok:false, empty:true, right:0, of:m.of}};
  // Realistic: the reading has to come off a run on your own, correct pins. Not counted as a wrong reading.
  if (m.ok && st.round.realistic && !st.pins?.ranRight) return {state:st, result:{ok:false, needPins:true, right:m.right, of:m.of}};
  const repeat = !m.ok && st.answers.some(a => a.key === key);
  const answers = repeat ? st.answers : [...st.answers, {key, ok:m.ok}];
  const next = {...st, answers, solved:m.ok};
  if (m.ok && st.round.realistic) next.pins = {...st.pins, earned: true};
  next.score = m.ok ? hardScoreFor(next) : 0;
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

/** Saves made with this answer check carry this version. Anything older was checked against the wrong message or
 *  with the old character by character check, so its wrong readings are refunded on load. */
export const HARD_SAVE_VERSION = 2;
/** Saved hard progress, checked field by field. Never throws: a damaged save just gives a fresh round. */
export function restoreHard(round, saved) {
  try {
    const s = saved && typeof saved === 'object' ? saved : {};
    let answers = Array.isArray(s.answers) ? s.answers.filter(a => a && typeof a.key === 'string').map(a => ({key:a.key, ok:Boolean(a.ok)})) : [];
    const hints = Array.isArray(s.hints) ? s.hints.filter(h => h && HARD_RULES.hint[h.type]).map(h => h.type === 'check' ? {type:'check', wheel:String(h.wheel)} : {type:h.type}) : [];
    const qepGuesses = Array.isArray(s.qepGuesses) ? s.qepGuesses.filter(n => Number.isInteger(n) && n >= 1 && n <= 99) : [];
    const ran = s.ran && typeof s.ran === 'object' ? s.ran : null;
    let refunded = 0, solvedNow = false;
    if (s.v !== HARD_SAVE_VERSION && answers.length) {
      // Old save: check every stored reading again with the fixed check, keep only the ones that pass, refund the rest.
      const texts = acceptedTexts(round), passing = answers.filter(a => (a.ok && s.solved === true) || matchAnswer(a.key, texts).ok);
      refunded = answers.filter(a => !a.ok).length;
      solvedNow = passing.length > 0 && s.solved !== true;
      answers = passing.length ? [{key: passing[0].key, ok: true}] : [];
    }
    // Rounds read before replies existed count as finished, so nobody loses a streak.
    const r = s.reply && typeof s.reply === 'object' ? s.reply : null, tries = Array.isArray(r?.tries) ? r.tries.filter(t => t && typeof t.key === 'string').map(t => ({key:t.key, ok:Boolean(t.ok)})) : [];
    const legacy = s.solved === true && (!r || r.legacy === true);
    const st = {...newHardState(round), answers, hints, qepGuesses, ran, solved: answers.some(a => a.ok) && (s.solved === true || solvedNow || s.v !== HARD_SAVE_VERSION), refunded, solvedNow, pins:readPins(s.pins)};
    if (!st.solved) st.pins.earned = false;
    // Hard mode no longer sets pins: an unfinished hard round with them switched on goes back to the day's patterns.
    if (!round.realistic) { st.pins.on = false; st.pins.ranRight = false; } else st.pins.on = true;
    st.score = st.solved ? hardScoreFor(st) : 0;
    st.step = guideStep(st, s.step);
    st.reply = {tries, done: st.solved && (legacy || tries.some(t => t.ok)), legacy, score: 0};
    if (st.reply.done && !legacy) st.reply.score = replyScoreFor(st);
    return st;
  } catch {
    return newHardState(round);
  }
}
/** Hard mode stats, kept apart from normal mode's. */
export function updateHardStats(previous, st) {
  if (!hardComplete(st) || st.round.mode === 'practice') return previous || statsFrom({});
  const history = {...(previous?.history || {})};
  history[st.round.key] = {score: Math.max(history[st.round.key]?.score || 0, st.score), tries: st.answers.length, reply: Math.max(history[st.round.key]?.reply || 0, st.reply?.score || 0)};
  const stats = statsFrom(history), replies = Object.values(history).map(h => h.reply || 0);
  return {...stats, replies: replies.filter(n => n > 0).length, bestReply: Math.max(0, ...replies)};
}
export function hardShareText(st, url) {
  const r = st.round, squares = st.answers.map(a => a.ok ? '\u{1F7E8}' : '\u{1F7E5}').join(''), n = st.hints.length;
  return `Lorenz ${r.mode === 'practice' ? 'practice' : `#${r.number}`} ${r.realistic ? "REALISTIC" : "HARD"}\n${st.solved ? `Read on try ${st.answers.length}${n ? `, ${n} hint${n > 1 ? 's' : ''}` : ''}` : 'Not read yet'}\n${squares} ${st.score.toLocaleString('en-GB')} pts${st.reply?.done && !st.reply.legacy ? `\nReply sent: ${st.reply.score.toLocaleString('en-GB')} pts` : ''}\n${url}`;
}
export {RULES};
