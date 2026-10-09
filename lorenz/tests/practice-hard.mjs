// Lorenz: hard mode in practice. Run: NODE_PATH=/tmp/cisbuild/node_modules node tests/practice-hard.mjs
import assert from 'assert/strict';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import {createRequire} from 'module';
const require = createRequire(import.meta.url);
const {JSDOM} = require('jsdom');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const L = await import('../js/lorenz.js');
const G = await import('../js/game.js');
const HD = await import('../js/hard.js');
const S = await import('../js/seed.js');
const {MESSAGES} = await import('../js/messages.js');
const results = [];
async function t(name, fn) { try { await fn(); results.push({name, pass: true}); } catch (e) { results.push({name, pass: false, error: e.stack?.split('\n').slice(0, 9).join('\n  ') || String(e)}); } }
const SEEDS = [1, 2, 3, 42, 99, 1234, 65535, 2 ** 31, 4294967295, ...Array.from({length: 40}, () => (Math.random() * 2 ** 32) >>> 0)];
const todayKey = S.utcDateKey();

/* ---------- The round ---------- */
await t('Hard practice: the round builds for many seeds, dated today, with its own message, model and settings', () => {
  for (const seed of SEEDS) {
    const h = HD.makeHardRound({mode: 'practice', seed});
    assert.equal(h.mode, 'practice', seed); assert.equal(h.hard, true); assert.equal(h.key, todayKey); assert.equal(h.seed, seed >>> 0);
    const n = G.makeRound({mode: 'practice', seed});
    for (const k of ['text', 'qep', 'model', 'cipher']) assert.deepEqual(h[k], n[k], `${seed} ${k}`);
    assert.deepEqual(h.start, n.start);
    assert.equal(HD.makeHardRound({mode: 'practice', seed, model: 'SZ42A'}).model, 'SZ42A');
  }
});
await t('Hard practice: five dated pages, one is today, it opens on a wrong page, and only today has the answer row', () => {
  for (const seed of SEEDS) {
    const h = HD.makeHardRound({mode: 'practice', seed});
    assert.equal(h.pages.length, HD.HARD_RULES.pages, seed); assert.equal(h.pages.filter(p => p.today).length, 1);
    assert.equal(h.pages[h.todayIndex].key, todayKey); assert.notEqual(h.openIndex, h.todayIndex); assert.equal(h.pages[h.openIndex].today, false);
    assert.deepEqual([...h.pages.map(p => p.key)].sort(), h.pages.map(p => p.key)); assert.equal(new Set(h.pages.map(p => p.key)).size, 5);
    const line = h.pages[h.todayIndex].book.find(e => e.qep === h.qep); assert.ok(line, `answer row on today's page, seed ${seed}`);
    assert.deepEqual(line.start, h.start); assert.equal(line.smudge, h.smudge);
    assert.deepEqual(G.answerLine(HD.pageRound(h, h.pages[h.todayIndex])), line);
    for (const p of h.pages.filter(p => !p.today)) { assert.equal(G.answerLine(HD.pageRound(h, p)), undefined); const decoy = p.book.find(e => e.qep === h.qep); assert.ok(decoy, 'decoy line for the same QEP'); assert.notDeepEqual(decoy.start, h.start); assert.equal(p.book.length, h.book.length); }
  }
});
await t('Hard practice: each seed gets its own book, the same seed the same book, and the daily book is unchanged', () => {
  const a = HD.makeHardRound({mode: 'practice', seed: 7}), b = HD.makeHardRound({mode: 'practice', seed: 7}), c = HD.makeHardRound({mode: 'practice', seed: 8});
  assert.deepEqual(a.pages, b.pages); assert.notDeepEqual(a.pages, c.pages);
  const keys = new Set(SEEDS.map(seed => JSON.stringify(HD.makeHardRound({mode: 'practice', seed}).pages.map(p => p.key)))); assert.ok(keys.size > 5, 'page dates vary with the seed');
  const d = HD.makeHardRound({}), daily = G.makeRound({});
  assert.equal(d.mode, 'daily'); for (const k of ['text', 'qep', 'cipher', 'key', 'number']) assert.deepEqual(d[k], daily[k]);
  assert.deepEqual(d.pages, HD.makeHardRound({}).pages); assert.deepEqual(HD.makePages(daily), {pages: d.pages, todayIndex: d.todayIndex, openIndex: d.openIndex});
});
await t('Hard practice: the preamble is plain ITA2 and reads the round\'s QEP', () => {
  for (const seed of SEEDS) { const h = HD.makeHardRound({mode: 'practice', seed}); assert.equal(HD.readPreamble(h.preamble), h.qep, seed); assert.deepEqual(h.preamble, HD.preambleCodes(h.qep)); assert.equal(L.decodeText(h.preamble), `QEP ${G.pad2(h.qep)}`); }
});
await t('Hard practice: the tape decodes to the round\'s own text, and the checker passes it, its variants, and nothing wrong', () => {
  for (const seed of SEEDS) {
    const h = HD.makeHardRound({mode: 'practice', seed}), out = L.crypt(h.cipherCodes, {patterns: h.patterns, start: h.start, model: h.model});
    assert.equal(L.decodeText(out), h.text, seed); assert.deepEqual(G.acceptedTexts(h), [h.text]);
    for (const v of [h.text, h.text.toLowerCase(), h.text.replace(/,/g, '').replace(/\. /g, ' '), `  ${h.text.replace(/ /g, '   ')}  `]) assert.equal(HD.matchAnswer(v, G.acceptedTexts(h)).ok, true, `${seed}: ${v}`);
    const other = MESSAGES.find(m => m !== h.text); assert.equal(HD.matchAnswer(other, G.acceptedTexts(h)).ok, false);
    const wrong = L.decodeText(L.crypt(h.cipherCodes, {patterns: h.patterns, start: {...h.start, chi1: h.start.chi1 % 41 + 1}, model: h.model}));
    assert.equal(HD.matchAnswer(wrong, G.acceptedTexts(h)).ok, false, 'a wrong wheel reads as garbage');
  }
});
/** Pins set from the sheet and a run on them, as if the player had done the pin step. */
const ready = st => HD.notePinRun({...st, pins: {...st.pins, grid: Object.fromEntries(Object.entries(st.round.patterns).map(([k, v]) => [k, v.slice()]))}});
await t('Hard practice: a correct answer solves it, is scored like hard mode, and never touches hard stats or the share number', () => {
  const prev = G.statsFrom({'2026-10-08': {score: 900, tries: 1}}, todayKey);
  for (const seed of SEEDS.slice(0, 12)) {
    const h = HD.makeHardRound({mode: 'practice', seed}); let st = ready(HD.newHardState(h));
    st = HD.submitAnswer(st, 'NOT IT AT ALL').state; assert.equal(st.solved, false); assert.equal(st.answers.length, 1);
    st = HD.useHardHint(st, 'char').state; const {state, result} = HD.submitAnswer(st, h.text.toLowerCase());
    assert.equal(result.ok, true); assert.equal(state.solved, true); assert.equal(state.score, HD.hardScoreFor(state)); assert.equal(state.score, 1000 - 150, 'hints are paid in points, not score');
    assert.equal(HD.updateHardStats(prev, state), prev, 'practice never counts in hard stats');
    assert.match(HD.hardShareText(state, 'u'), /^Lorenz practice HARD/);
  }
  const d = ready(HD.newHardState(HD.makeHardRound({}))), read = HD.submitAnswer(d, d.round.text).state, solved = HD.submitReply(read, HD.replyTape(d.round, HD.replyFor(d.round), d.round.start)).state;
  assert.equal(HD.updateHardStats(prev, read), prev, 'read but not answered does not count yet');
  assert.ok(HD.updateHardStats(prev, solved).history[todayKey], 'the daily still counts'); assert.match(HD.hardShareText(solved, 'u'), /^Lorenz #\d+ HARD/);
});

/* ---------- In the page ---------- */
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
let bootCount = 0;
async function bootPage(storage, fn) {
  const w = new JSDOM(html, {url: 'https://dexmlabs.app/lorenz/', pretendToBeVisual: true}).window;
  for (const [k, v] of Object.entries(storage)) w.localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
  delete globalThis.DexmPoints;
  const errors = []; w.addEventListener('error', e => errors.push(e.error || e.message));
  w.matchMedia = q => ({matches: /reduce/.test(q), addEventListener() {}, removeEventListener() {}});
  w.HTMLCanvasElement.prototype.getContext = () => null; w.HTMLDialogElement && (w.HTMLDialogElement.prototype.showModal = function () { this.open = true; });
  if (w.HTMLDialogElement && !w.HTMLDialogElement.prototype.close) w.HTMLDialogElement.prototype.close = function () { this.open = false; this.dispatchEvent(new w.Event('close')); };
  w.ResizeObserver = class { observe() {} disconnect() {} }; w.requestIdleCallback = () => 0; w.scrollTo = () => {};
  // performance stays Node's own: swapping in jsdom's recurses when the tape runs.
  const keys = ['window', 'document', 'localStorage', 'location', 'history', 'matchMedia', 'requestAnimationFrame', 'cancelAnimationFrame', 'ResizeObserver', 'navigator', 'requestIdleCallback'];
  const saved = {}; for (const k of keys) { saved[k] = Object.getOwnPropertyDescriptor(globalThis, k); Object.defineProperty(globalThis, k, {value: w[k] ?? globalThis[k], configurable: true, writable: true}); }
  const random = Math.random;
  try { await import(`../js/main.js?practice${++bootCount}`); await fn(w.document, w); assert.deepEqual(errors, []); }
  finally { Math.random = random; w.close(); for (const k of keys) { if (saved[k]) Object.defineProperty(globalThis, k, saved[k]); else delete globalThis[k]; } }
}
/** The next practice round uses this seed (practice seeds come from Math.random). */
const nextSeed = seed => { Math.random = () => seed / 2 ** 32; };
const setWheels = (d, w, start) => { for (const [id, v] of Object.entries(start)) { const i = d.getElementById(`dial-${id}`); i.value = String(v); i.dispatchEvent(new w.Event('change')); } };
/** Hard mode: set χ1 from the sheet in the list view, and the rest fill in. */
const setChi1 = (d, h) => { d.querySelector('#pin-wheels [data-wheel=chi1]').click(); h.patterns.chi1.forEach((b, i) => { if (b) d.querySelector(`#pin-grid [data-pin="${i}"]`).click(); }); };
const runAndSkip = d => { d.getElementById('run-button').click(); d.getElementById('skip-button').click(); };

const daily = HD.makeHardRound({});
const dailySave = {v: HD.HARD_SAVE_VERSION, text: daily.text, answers: [{key: 'SOMETHING ELSE', ok: false}], hints: [{type: 'qep'}], qepGuesses: [], ran: null, solved: false, score: 0, wheels: daily.start};
const hardStats = {history: {'2026-10-08': {score: 1100, tries: 1}}};
const normalStats = {history: {'2026-10-08': {score: 800, tries: 2}}};
const STORE = {'lorenz:difficulty': '"hard"', [`lorenz:hard:round:${daily.key}`]: dailySave, 'lorenz:hard:stats': hardStats, 'lorenz:stats': normalStats};
const snapshot = w => Object.fromEntries(Object.keys(w.localStorage).filter(k => k !== 'lorenz:difficulty' && k.startsWith('lorenz:')).sort().map(k => [k, w.localStorage.getItem(k)]));

await t('DOM: the title screen says practice follows the mode, and Hard then Practice opens a hard practice round', async () => {
  await bootPage({}, async (d, w) => {
    d.querySelector('[data-difficulty=hard]').click(); assert.match(d.getElementById('mode-note').textContent, /Practice plays the same way/);
    nextSeed(42); d.getElementById('play-practice').click(); const h = HD.makeHardRound({mode: 'practice', seed: 42});
    assert.equal(w.location.hash, '#hard-practice'); assert.equal(d.getElementById('round-label').textContent, 'Practice, hard, random settings');
    assert.equal(d.getElementById('preamble-box').hidden, false); assert.equal(d.getElementById('printed-box').hidden, true); assert.equal(d.getElementById('practice-tabs').hidden, true);
    assert.equal(d.getElementById('practice-new').hidden, false); assert.equal(d.getElementById('qep-number').textContent, '??'); assert.ok(!d.body.textContent.includes(h.text));
  });
});
for (const seed of [42, 7, 31337, 4000000000, (Math.random() * 2 ** 32) >>> 0]) {
  await t(`DOM: hard practice end to end, seed ${seed}: book, preamble, wheels, punch, hints, read it, card, daily state untouched`, async () => {
    await bootPage(STORE, async (d, w) => {
      const before = snapshot(w), h = HD.makeHardRound({mode: 'practice', seed});
      nextSeed(seed); d.getElementById('play-practice').click();
      assert.equal(d.getElementById('today-date').textContent, HD.pageDate(todayKey));
      assert.equal(d.querySelectorAll('#preamble-tape .frame').length, h.preamble.length); assert.match(d.getElementById('preamble-tape').getAttribute('aria-label'), new RegExp(`${h.preamble.length} rows`));
      assert.equal(d.getElementById('book-date').textContent, HD.pageDate(h.pages[h.openIndex].key)); assert.equal(d.getElementById('book-page').textContent, `${h.openIndex + 1} of 5`);
      assert.equal(d.querySelectorAll('#qep-table .today-line,[aria-current]').length, 0);
      const dir = h.todayIndex > h.openIndex ? 'ArrowRight' : 'ArrowLeft';
      for (let i = 0; i < Math.abs(h.todayIndex - h.openIndex); i++) d.dispatchEvent(new w.KeyboardEvent('keydown', {key: dir, bubbles: true}));
      assert.equal(d.getElementById('book-date').textContent, HD.pageDate(todayKey));
      const row = d.querySelector(`#qep-table tr[data-qep="${G.pad2(h.qep)}"]`); assert.ok(row, 'answer row on today\'s page');
      L.WHEELS.forEach((wh, i) => { const cell = row.cells[i + 1]; if (h.smudge.wheel !== wh.id) assert.equal(cell.textContent, G.pad2(h.start[wh.id])); else assert.equal(cell.querySelector('[aria-hidden]').textContent, h.smudge.shown); });
      d.getElementById('qep-guess').value = String(h.qep); d.getElementById('qep-guess-go').click(); assert.equal(d.getElementById('qep-number').textContent, G.pad2(h.qep));
      d.querySelector('[data-hint=char]').click(); assert.match(d.getElementById('revealed-chars').textContent, new RegExp(`^The message starts: ${h.text[0]}`));
      d.querySelector('[data-hint=reveal]').click(); assert.match(d.getElementById('smudge-note').textContent, new RegExp(`${L.WHEEL[h.smudge.wheel].label} at ${G.pad2(h.start[h.smudge.wheel])}`));
      setChi1(d, h); assert.match(d.getElementById('feedback').textContent, /the other wheels are set for you/);
      setWheels(d, w, h.start); runAndSkip(d);
      assert.equal(d.querySelectorAll('#out-tape [data-frame]').length, h.cipherCodes.length); assert.equal(d.getElementById('printed-text').textContent, '', 'tape only, nothing printed');
      d.getElementById('hard-answer').value = 'XQZ VVK PLOM'; d.getElementById('hard-answer-go').click(); assert.match(d.getElementById('feedback').textContent, /Not right yet\. 0 of \d+ words/);
      d.getElementById('hard-answer').value = h.text.toLowerCase().replace(/\. /g, ' '); d.getElementById('hard-answer-go').click();
      assert.match(d.getElementById('feedback').textContent, /Message read\./); assert.equal(d.getElementById('decoded-card').hidden, true);
      assert.equal(d.getElementById('reply-plain').textContent, HD.replyFor(h));
      d.getElementById('reply-input').value = HD.replyFor(h); d.getElementById('reply-go').click(); d.getElementById('skip-button').click();
      assert.match(d.getElementById('feedback').textContent, /Reply sent\./);
      const card = d.getElementById('decoded-card'); assert.equal(card.hidden, false); assert.match(card.textContent, /Read by hand and answered, hard mode/); assert.ok(card.textContent.includes(h.text));
      assert.ok(card.querySelector('[data-card=next]')); assert.equal(card.querySelector('[data-card=normal]'), null); assert.doesNotMatch(card.textContent, /streak|Next intercept/i);
      assert.match(card.textContent, new RegExp(`${(1000 + 200 - 150).toLocaleString('en-GB')} pts`));
      assert.deepEqual(snapshot(w), before, 'daily saves and stats untouched');
      nextSeed(seed ^ 0x5555); card.querySelector('[data-card=next]').click(); const n = HD.makeHardRound({mode: 'practice', seed: (seed ^ 0x5555) >>> 0});
      assert.equal(card.hidden, true); assert.equal(d.getElementById('qep-number').textContent, '??'); assert.equal(d.getElementById('hard-answer').value, ''); assert.equal(d.getElementById('out-tape').innerHTML, '');
      assert.equal(d.getElementById('book-date').textContent, HD.pageDate(n.pages[n.openIndex].key)); assert.equal(d.getElementById('revealed-chars').hidden, true);
      assert.equal(d.getElementById('hard-reply').hidden, true, 'a new round has no reply yet'); assert.equal(d.getElementById('reply-input').value, '');
      d.querySelector('[data-action=title]').click(); d.getElementById('play-daily').click();
      assert.match(d.getElementById('round-label').textContent, /^Lorenz #\d+, hard/); assert.equal(d.getElementById('qep-number').textContent, G.pad2(daily.qep), 'the daily keeps its own hints');
      assert.deepEqual(snapshot(w), before);
    });
  });
}
await t('DOM: wheel moves, checks and the practice model switch in hard practice never write a hard save', async () => {
  await bootPage(STORE, async (d, w) => {
    const before = snapshot(w); nextSeed(9); d.getElementById('play-practice').click();
    d.querySelector('.dial[data-wheel=chi1] .dial-up').click(); d.getElementById('check-select').value = 'chi1'; d.querySelector('[data-hint=check]').click(); d.getElementById('check-go').click();
    assert.match(d.getElementById('feedback').textContent, /is (set right|not right yet)/);
    nextSeed(10); d.querySelector('#practice-model [data-model=SZ42A]').click(); assert.match(d.getElementById('model-name').textContent + d.querySelector('#practice-model [aria-pressed=true]').textContent, /SZ42A/);
    nextSeed(11); d.getElementById('practice-new').click(); assert.equal(d.getElementById('round-label').textContent, 'Practice, hard, random settings');
    assert.deepEqual(snapshot(w), before); assert.equal(Object.keys(w.localStorage).filter(k => k.includes('hard:round')).length, 1);
  });
});
await t('DOM: the #hard-practice link opens hard practice; Normal then Practice is still normal practice', async () => {
  await bootPage({}, async (d, w) => {
    nextSeed(5); w.location.hash = '#hard-practice'; await new Promise(r => setTimeout(r, 20));
    assert.equal(d.getElementById('round-label').textContent, 'Practice, hard, random settings');
  });
});
for (const seed of [3, 77, 2 ** 31 + 5]) {
  await t(`DOM: normal practice is unaffected, seed ${seed}: printed output, highlighted line, tabs, decode, no stats`, async () => {
    await bootPage({'lorenz:hard:stats': hardStats}, async (d, w) => {
      d.querySelector('[data-difficulty=normal]').click(); nextSeed(seed); d.getElementById('play-practice').click();
      const r = G.makeRound({mode: 'practice', seed, model: L.MODELS.SZ40});
      assert.equal(w.location.hash, '#practice'); assert.equal(d.getElementById('round-label').textContent, 'Practice, random settings');
      assert.equal(d.getElementById('practice-tabs').hidden, false); assert.equal(d.getElementById('preamble-box').hidden, true); assert.equal(d.getElementById('printed-box').hidden, false);
      assert.equal(d.getElementById('qep-number').textContent, G.pad2(r.qep)); assert.equal(d.querySelector('#qep-table tr.today-line').dataset.qep, G.pad2(r.qep));
      setWheels(d, w, r.start); runAndSkip(d);
      assert.equal(d.getElementById('printed-text').textContent, r.text); assert.match(d.getElementById('feedback').textContent, /Message decoded\./);
      assert.ok(d.querySelector('#decoded-card [data-card=practice]')); assert.equal(w.localStorage.getItem('lorenz:stats'), null); assert.equal(w.localStorage.getItem('lorenz:hard:stats'), JSON.stringify(hardStats));
      d.querySelector('#practice-tabs [data-tab=encipher]').click(); assert.equal(d.getElementById('panel-encipher').hidden, false);
    });
  });
}

for (const r of results) console.log(`${r.pass ? 'PASS' : 'FAIL'} ${r.name}${r.error ? '\n  ' + r.error : ''}`);
console.log(`${results.filter(r => r.pass).length}/${results.length} passed`);
process.exitCode = results.every(r => r.pass) ? 0 : 1;
