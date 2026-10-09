// Lorenz tests. Run: NODE_PATH=/tmp/cisbuild/node_modules node tests/run.mjs
import assert from 'assert/strict';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import {createRequire} from 'module';
const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const L = await import('../js/lorenz.js');
const G = await import('../js/game.js');
const S = await import('../js/seed.js');
const R = await import('../js/reward.js');
const {MESSAGES} = await import('../js/messages.js');
const {CHI_EXAMPLE} = await import('../js/chi-example.js');
const results = [];
async function t(name, fn) { try { await fn(); results.push({name, pass: true}); } catch (e) { results.push({name, pass: false, error: e.stack?.split('\n').slice(0, 3).join('\n  ') || String(e)}); } }

const zeros = () => Object.fromEntries(L.WHEELS.map(w => [w.id, new Array(w.size).fill(0)]));
const ones = () => Object.fromEntries(L.WHEELS.map(w => [w.id, 1]));
const fromStr = s => [...s].map(c => c === 'x' || c === '1' ? 1 : 0);
const randomSetup = seed => { const rng = S.mulberry32(seed); return {patterns: G.makePatterns(rng), start: G.randomPositions(rng)}; };

/* ---------- ITA2 ---------- */
await t('ITA2: 32 distinct Bletchley names, all 26 letters present', () => {
  assert.equal(L.BP.length, 32); assert.equal(new Set(L.BP).size, 32);
  for (const c of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') assert.ok(L.BP.includes(c), c);
  for (const c of '/345 89'.replace(' ', '')) assert.ok(L.BP.includes(c), c);
});
await t('ITA2: letters match the published table (impulse 1 first)', () => {
  const table = {E:'x....',T:'....x',M:'..xxx',N:'..xx.',O:'...xx',L:'.x..x',U:'xxx..',S:'x.x..',C:'.xxx.',A:'xx...',B:'x..xx',D:'x..x.',F:'x.xx.',G:'.x.xx',H:'..x.x',I:'.xx..',J:'xx.x.',K:'xxxx.',P:'.xx.x',Q:'xxx.x',R:'.x.x.',V:'.xxxx',W:'xx..x',X:'x.xxx',Y:'x.x.x',Z:'x...x'};
  for (const [c, dc] of Object.entries(table)) assert.equal(L.dotsCrosses(L.codeOf(c)), dc, c);
});
await t('ITA2: Bletchley figures for the non letters (9 space, 3 CR, 4 LF, 5 figs, 8 letters, / blank)', () => {
  assert.equal(L.dotsCrosses(L.codeOf('9')), '..x..'); assert.equal(L.dotsCrosses(L.codeOf('3')), '...x.'); assert.equal(L.dotsCrosses(L.codeOf('4')), '.x...');
  assert.equal(L.dotsCrosses(L.codeOf('5')), 'xx.xx'); assert.equal(L.dotsCrosses(L.codeOf('8')), 'xxxxx'); assert.equal(L.dotsCrosses(L.codeOf('/')), '.....');
});
await t('ITA2: conventions are named constants (BIT_ORDER, MARK=1, POSITION_BASE=1)', () => {
  assert.equal(L.BIT_ORDER, 'impulse1-msb'); assert.equal(L.MARK, 1); assert.equal(L.SPACE, 0); assert.equal(L.POSITION_BASE, 1);
  assert.equal(L.codeOf('E'), 16); assert.equal(L.codeOf('T'), 1); assert.deepEqual(L.bitsOf(16), [1, 0, 0, 0, 0]);
});
await t('Addition: M + N = T and T + N = M (Copeland\'s example)', () => {
  assert.equal(L.nameOf(L.codeOf('M') ^ L.codeOf('N')), 'T'); assert.equal(L.nameOf(L.codeOf('T') ^ L.codeOf('N')), 'M');
});
await t('Addition: COLOSSUS + WZHI/NR9 = XDIVSDFE (Copeland\'s example)', () => {
  const p = [...'COLOSSUS'].map(L.codeOf), k = [...'WZHI/NR9'].map(L.codeOf);
  assert.equal(L.toBP(p.map((c, i) => c ^ k[i])), 'XDIVSDFE');
});
await t('Text: figures wrapped in 5 and 8, full stop is 5M, round trip', () => {
  const c = L.encodeText('AT 0900. OK');
  assert.equal(L.toBP(c), 'AT95POPPM98OK'); assert.equal(L.decodeText(c), 'AT 0900. OK');
});
await t('Text: unsupported characters are reported, not silently mangled', () => {
  const c = L.encodeText('HI€ THERE#'); assert.deepEqual(c.dropped, ['€', '#']); assert.equal(L.decodeText(c), 'HI THERE');
});
await t('Tape text: fromBP accepts Bletchley letters and ignores spaces, rejects others', () => {
  assert.deepEqual(L.fromBP('9N J').codes, [4, 6, 26]); assert.equal(L.fromBP('AB!').ok, false);
});

/* ---------- Machine stepping ---------- */
await t('Stepping: hand checked vector (keys, psi gated by mu37, mu37 gated by mu61)', () => {
  const p = zeros(); p.chi1[0] = 1; p.psi1[1] = 1; p.mu61 = new Array(61).fill(1); p.mu61[0] = 0; p.mu37 = new Array(37).fill(1); p.mu37[1] = 0;
  const m = L.createMachine({patterns: p, start: ones()}); const steps = [0, 1, 2, 3].map(() => m.step());
  assert.deepEqual(steps.map(s => s.key), [16, 16, 0, 0]);
  assert.deepEqual(steps.map(s => s.after.psi1), [2, 3, 3, 4]);
  assert.deepEqual(steps.map(s => s.after.mu37), [1, 2, 3, 4]);
  assert.deepEqual(steps.map(s => s.bm), [1, 1, 0, 1]);
});
await t('Stepping: chi wheels move every character, mu61 every character', () => {
  const {patterns, start} = randomSetup(7), m = L.createMachine({patterns, start});
  for (let n = 1; n <= 200; n++) { const s = m.step(); for (const id of [...L.CHI, 'mu61']) assert.equal(s.after[id], (start[id] - 1 + n) % L.WHEEL[id].size + 1, `${id} at ${n}`); }
});
await t('Stepping: mu37 moves only when mu61 read a cross (before moving)', () => {
  const {patterns, start} = randomSetup(11), m = L.createMachine({patterns, start});
  for (let n = 0; n < 300; n++) { const s = m.step(); const read = patterns.mu61[s.before.mu61 - 1]; assert.equal(s.after.mu37, read ? s.before.mu37 % 37 + 1 : s.before.mu37); }
});
await t('Stepping: SZ40 psi wheels move together, only when mu37 read a cross', () => {
  const {patterns, start} = randomSetup(13), m = L.createMachine({patterns, start, model: 'SZ40'});
  let moved = 0, still = 0;
  for (let n = 0; n < 300; n++) { const s = m.step(); const bm = patterns.mu37[s.before.mu37 - 1]; for (const id of L.PSI) assert.equal(s.after[id], bm ? s.before[id] % L.WHEEL[id].size + 1 : s.before[id]); bm ? moved++ : still++; }
  assert.ok(moved > 0 && still > 0);
});
await t('Stepping: key read before stepping (first key uses the start positions)', () => {
  const {patterns, start} = randomSetup(17), s = L.createMachine({patterns, start}).step();
  const chi = L.codeFromBits(L.CHI.map(id => patterns[id][start[id] - 1])), psi = L.codeFromBits(L.PSI.map(id => patterns[id][start[id] - 1]));
  assert.equal(s.key, chi ^ psi); assert.deepEqual(s.before, start);
});
await t('Motor: General Report basic motor example (mu61 driving mu37)', () => {
  const mu61 = 'x.xxx.xx.xxxxx.xx', mu37 = 'x..x..xx.x.x..xx.', bm = 'x...x...xxx.x.xx.';
  const p = zeros(); p.mu61 = fromStr(mu61.padEnd(61, 'x')); p.mu37 = fromStr(mu37.padEnd(37, 'x'));
  const m = L.createMachine({patterns: p, start: ones()});
  assert.equal(Array.from({length: 17}, () => m.step().bm ? 'x' : '.').join(''), bm);
});
await t('Motor: General Report total motor table (dot only when BM dot and limitation cross)', () => {
  const bm = 'x...x...xxx.x.xx.', lim = '.x.xx..xxx..xx..x', tm = 'x.x.xxx.xxxxx.xx.';
  assert.equal([...bm].map((b, i) => L.totalMotor(b === 'x' ? 1 : 0, lim[i] === 'x' ? 1 : 0) ? 'x' : '.').join(''), tm);
});
await t('SZ42A: chi 2 one back limitation decides psi motion when the basic motor is a dot', () => {
  const p = zeros(); p.chi2 = fromStr('x.xx..x.x...xx.x.x..x.xx.x...xx'); p.mu61 = new Array(61).fill(0);
  const m = L.createMachine({patterns: p, start: ones(), model: 'SZ42A'});
  for (let n = 0; n < 62; n++) { const s = m.step(), oneBack = p.chi2[(s.before.chi2 - 2 + 31) % 31]; assert.equal(s.lim, oneBack); assert.equal(s.psiMoved, !oneBack, `char ${n}`); }
});
await t('SZ42A: with a cross basic motor the psi wheels always move', () => {
  const p = zeros(); p.chi2 = new Array(31).fill(1); p.mu37 = new Array(37).fill(1);
  const m = L.createMachine({patterns: p, start: ones(), model: 'SZ42A'});
  for (let n = 0; n < 40; n++) assert.equal(m.step().psiMoved, true);
});
await t('Cipher: encipher then decipher gives the plaintext (both models, 50 setups)', () => {
  for (let k = 0; k < 50; k++) { const {patterns, start} = randomSetup(100 + k), model = k % 2 ? 'SZ42A' : 'SZ40';
    const p = [...L.encodeText(MESSAGES[k % MESSAGES.length])]; assert.deepEqual(L.crypt(L.crypt(p, {patterns, start, model}), {patterns, start, model}), p); }
});
await t('Cipher: rejects wrong pattern lengths and out of range positions', () => {
  const p = zeros(); p.chi1 = new Array(40).fill(0); assert.throws(() => L.createMachine({patterns: p, start: ones()}));
  const s = ones(); s.chi5 = 24; assert.throws(() => L.createMachine({patterns: zeros(), start: s}));
});
await t('Patterns: parse x/. and 1/0, report bad characters and wrong lengths', () => {
  assert.deepEqual(L.parsePattern('x.x 10', 5).bits, [1, 0, 1, 1, 0]);
  assert.equal(L.parsePattern('x.q', 3).ok, false); assert.match(L.parsePattern('x.x', 5).error, /5 cams/);
  assert.equal(L.checkPosition(0, 23).ok, false); assert.equal(L.checkPosition(23, 23).ok, true); assert.equal(L.checkPosition(2.5, 23).ok, false);
});

/* ---------- Chi only ---------- */
const chiPats = () => Object.fromEntries(L.CHI.map(id => [id, L.parsePattern(CHI_EXAMPLE.patterns[id], L.WHEEL[id].size).bits]));
const chiStart = arr => Object.fromEntries(L.CHI.map((id, i) => [id, arr[i]]));
const bpIn = text => L.fromBP(text.replace(/ /g, '9')).codes;
await t('Chi only: worked example from the printable model, HELLO at 01 01 01 01 01 enciphers to VNTDH', () => {
  assert.equal(L.toBP(L.chiCrypt(bpIn(CHI_EXAMPLE.plain), {patterns: chiPats(), start: CHI_EXAMPLE.start})), 'VNTDH');
  assert.equal(CHI_EXAMPLE.cipher, 'VNTDH');
});
await t("Chi only: all four of the model's test vectors encipher and decipher", () => {
  for (const [plain, starts, cipher] of CHI_EXAMPLE.vectors) {
    const start = chiStart(starts), c = L.chiCrypt(bpIn(plain), {patterns: chiPats(), start});
    assert.equal(L.toBP(c), cipher, plain); assert.equal(L.toBP(L.chiCrypt(c, {patterns: chiPats(), start})), plain.replace(/ /g, '9'));
  }
});
await t('Chi only: hand check of the first letter (H + R = V)', () => {
  const first = L.CHI.map(id => CHI_EXAMPLE.patterns[id][0]).join('');
  assert.equal(first, '01010'); assert.equal(L.nameOf(L.codeFromBits(fromStr(first))), 'R'); assert.equal(L.nameOf(L.codeOf('H') ^ L.codeOf('R')), 'V');
});
await t('Chi only: conventions match the model (impulse 1 first, mark = 1, positions from 1, same ITA2 table)', () => {
  assert.equal(L.BIT_ORDER, 'impulse1-msb'); assert.equal(L.MARK, 1); assert.equal(L.POSITION_BASE, 1);
  // the model's table, impulses 1 to 5 left to right
  const ita2 = {'/':'00000',E:'10000','4':'01000',A:'11000','9':'00100',S:'10100',I:'01100',U:'11100','3':'00010',D:'10010',R:'01010',J:'11010',N:'00110',F:'10110',C:'01110',K:'11110',T:'00001',Z:'10001',L:'01001',W:'11001',H:'00101',Y:'10101',P:'01101',Q:'11101',O:'00011',B:'10011',G:'01011','5':'11011',M:'00111',X:'10111',V:'01111','8':'11111'};
  for (const [ch, bits] of Object.entries(ita2)) assert.equal(L.bitsOf(L.codeOf(ch)).join(''), bits, ch);
  const ref = '/workspace/digital-assets/lorenz-chi-demonstrator/reference.py';
  if (fs.existsSync(ref)) { const py = fs.readFileSync(ref, 'utf8'); for (const id of L.CHI) assert.ok(py.includes(`"${CHI_EXAMPLE.patterns[id]}"`), `${id} key matches the model`); for (const [p, , c] of CHI_EXAMPLE.vectors) assert.ok(py.includes(`"${c}"`) && py.includes(`"${p}"`), p); }
});
await t('Chi only: key is chi alone, every chi wheel steps every character', () => {
  const m = L.createChiMachine({patterns: chiPats(), start: CHI_EXAMPLE.start});
  for (let n = 1; n <= 60; n++) { const s = m.step(); assert.equal(s.key, s.chi); for (const id of L.CHI) assert.equal(s.after[id], n % L.WHEEL[id].size + 1); }
});

/* ---------- Daily game ---------- */
const d1 = new Date('2026-10-09T08:00:00Z');
await t('Daily: the seed and round are deterministic for a UTC date', () => {
  const a = G.makeRound({date: d1}), b = G.makeRound({date: new Date('2026-10-09T23:59:59Z')});
  assert.equal(a.cipher, b.cipher); assert.deepEqual(a.start, b.start); assert.equal(a.qep, b.qep); assert.equal(a.number, 1);
  assert.notEqual(G.makeRound({date: new Date('2026-10-10T00:00:00Z')}).cipher, a.cipher);
  assert.equal(S.dayNumber(new Date('2026-10-10T00:00:00Z')), 2);
});
await t('Daily: right settings decode to the message', () => {
  for (let k = 0; k < 30; k++) { const r = G.makeRound({date: new Date(Date.UTC(2026, 9, 9 + k))});
    assert.equal(L.decodeText(L.crypt(r.cipherCodes, {patterns: r.patterns, start: r.start, model: r.model})), r.text); }
});
await t('Daily: any single wrong wheel gives garbage, not the message', () => {
  const r = G.makeRound({date: d1});
  for (const w of L.WHEELS) { const s = {...r.start}; s[w.id] = s[w.id] % w.size + 1;
    const out = L.decodeText(L.crypt(r.cipherCodes, {patterns: r.patterns, start: s, model: r.model})); assert.notEqual(out, r.text, w.id); }
});
await t('Daily: wrong chi or psi settings scramble most of the message', () => {
  const r = G.makeRound({date: d1}), s = {...r.start}; s.chi1 = s.chi1 % 41 + 1; s.psi3 = s.psi3 % 51 + 1;
  const out = L.crypt(r.cipherCodes, {patterns: r.patterns, start: s, model: r.model}), same = out.filter((c, i) => c === r.plainCodes[i]).length;
  assert.ok(same / out.length < 0.45, `${same}/${out.length} matched`);
});
await t('Daily: cam patterns follow the rules (sizes, half raised, runs) over 60 days', () => {
  for (let k = 0; k < 60; k++) { const r = G.makeRound({date: new Date(Date.UTC(2026, 9, 9 + k))});
    for (const w of L.WHEELS) { const b = r.patterns[w.id]; assert.equal(b.length, w.size);
      if (w.group === 'mu') assert.ok(G.longestRun(b) <= 5); else { const n = b.filter(Boolean).length; assert.ok(Math.abs(n - w.size / 2) <= 0.5, `${w.id} ${n}`); assert.ok(G.longestRun(b) <= 4, w.id); } } }
});
await t('Daily: QEP book holds today\'s line, and the smudge candidates include the true position', () => {
  for (let k = 0; k < 60; k++) { const r = G.makeRound({date: new Date(Date.UTC(2026, 9, 9 + k))}), line = r.book.find(e => e.qep === r.qep);
    assert.equal(r.book.length, G.RULES.bookEntries); assert.equal(new Set(r.book.map(e => e.qep)).size, r.book.length);
    assert.deepEqual(line.start, r.start); const sm = line.smudge; assert.ok(sm.candidates.includes(r.start[sm.wheel]));
    assert.ok(sm.candidates.length >= 2 && sm.candidates.length <= 7); assert.ok(sm.candidates.every(v => String(v).endsWith(sm.shown.slice(1)))); }
});
await t('Daily: no message repeats within 40 days, and every message encodes cleanly', () => {
  const seen = new Set(Array.from({length: 40}, (_, k) => G.messageFor(k + 1))); assert.equal(seen.size, 40);
  for (const m of MESSAGES) assert.deepEqual(L.encodeText(m).dropped, [], m);
});
await t('Daily: model is SZ40 or SZ42A, practice seeds differ', () => {
  const r = G.makeRound({mode: 'practice', seed: 1}), q = G.makeRound({mode: 'practice', seed: 2});
  assert.ok(['SZ40', 'SZ42A'].includes(r.model)); assert.notEqual(r.cipher, q.cipher);
  assert.equal(G.makeRound({mode: 'practice', seed: 5, model: 'SZ42A'}).model, 'SZ42A');
});

/* ---------- Scoring ---------- */
const round = G.makeRound({date: d1});
await t('Scoring: first time right is 1,000', () => { const {state} = G.attempt(G.newState(round), round.start); assert.equal(state.solved, true); assert.equal(state.score, 1000); });
await t('Scoring: each wrong try costs 150, repeats of the same wrong settings are free', () => {
  let st = G.newState(round); const bad = {...round.start, chi1: round.start.chi1 % 41 + 1};
  st = G.attempt(st, bad).state; st = G.attempt(st, bad).state; assert.equal(st.attempts.length, 1);
  st = G.attempt(st, round.start).state; assert.equal(st.score, 850);
});
await t('Scoring: hints cost points, not score (check 20, reveal 50), wrong tries cost 150, never below 100', () => {
  let st = G.newState(round); st = G.useHint(st, 'check', round.start, 'chi1').state; st = G.useHint(st, 'reveal', round.start).state; st = G.useHint(st, 'reveal', round.start).state;
  assert.equal(G.scoreFor(st), 1000, 'hints leave the score alone'); assert.deepEqual(G.RULES.hint, {reveal: 50, check: 20});
  for (let k = 0; k < 10; k++) st = G.attempt(st, {...round.start, psi1: (round.start.psi1 + k) % 43 + 1 === round.start.psi1 ? round.start.psi1 % 43 + 1 : (round.start.psi1 + k) % 43 + 1}).state;
  st = G.attempt(st, round.start).state; assert.equal(st.score, 100);
});
await t('Scoring: the card breakdown always adds up to the score', () => {
  let st = G.newState(round); st = G.attempt(st, {...round.start, mu37: round.start.mu37 % 37 + 1}).state; st = G.useHint(st, 'check', round.start, 'mu37').state; st = G.attempt(st, round.start).state;
  assert.equal(R.scoreBreakdown(st).total, st.score); assert.equal(st.score, 850); assert.equal(R.scoreBreakdown(st).lines.length, 2, 'no hint line');
});
await t('Scoring: check hint answers truthfully, reveal gives the smudged wheel', () => {
  const st = G.newState(round), bad = {...round.start, chi3: round.start.chi3 % 29 + 1};
  assert.equal(G.useHint(st, 'check', bad, 'chi3').answer.right, false); assert.equal(G.useHint(st, 'check', bad, 'chi2').answer.right, true);
  const a = G.useHint(st, 'reveal', bad).answer; assert.equal(a.wheel, round.smudge.wheel); assert.equal(a.value, round.start[round.smudge.wheel]);
});
await t('Streak: consecutive UTC days count, a gap resets, practice never counts', () => {
  const solved = key => ({round: {...round, key, mode: 'daily'}, attempts: [{ok: true}], hints: [], solved: true, score: 1000});
  let s = G.updateStats(null, solved('2026-10-09')); s = G.updateStats(s, solved('2026-10-10')); assert.equal(s.streak, 2);
  s = G.updateStats(s, solved('2026-10-12')); assert.equal(s.streak, 1); assert.equal(s.bestStreak, 2);
  assert.equal(G.updateStats(s, {...solved('2026-10-13'), round: {...round, key: '2026-10-13', mode: 'practice'}}), s);
  assert.equal(G.statsFrom(s.history, '2026-10-20').streak, 0);
});
await t('Share text: day number, QEP, tries and score, no dashes', () => {
  let st = G.newState(round); st = G.attempt(st, {...round.start, chi1: round.start.chi1 % 41 + 1}).state; st = G.attempt(st, round.start).state;
  const txt = G.shareText(st, 'https://dexmlabs.app/lorenz/');
  assert.match(txt, /^Lorenz #1, QEP \d\d\nDecoded on try 2\n/); assert.match(txt, /850 pts/); assert.ok(!/[\u2013\u2014]| - /.test(txt));
});

/* ---------- Motion ---------- */
await t('Reduced motion: no flying tape, no spin, no count up, card at once', () => {
  assert.deepEqual(R.rewardPlan(true, {reducedMotion: true}), {card: true, fly: false, spin: false, countUp: false, delay: 0});
  const p = R.rewardPlan(true); assert.equal(p.fly, true); assert.ok(p.delay > 0); assert.equal(R.rewardPlan(false).card, false);
});
await t('Reduced motion: the score counter jumps straight to the total', () => {
  const el = {textContent: ''}; const c = new R.ScoreCounter(el, {raf: () => { throw new Error('should not animate'); }});
  c.animateTo(850, {reducedMotion: true}); assert.equal(el.textContent, '850 pts');
});
await t('Reduced motion: count up eases from 0 to the total', () => { assert.equal(R.countValue(0, 1000, 0), 0); assert.equal(R.countValue(0, 1000, 1), 1000); assert.ok(R.countValue(0, 1000, .5) > 500); });
await t('Reduced motion: the stylesheet honours the OS setting and the in game switch', () => {
  const css = fs.readFileSync(path.join(ROOT, 'css/style.css'), 'utf8');
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)\{\*\{[^}]*animation:none!important/); assert.match(css, /body\.reduced-motion \*\{[^}]*animation:none!important/);
});

/* ---------- Pages ---------- */
const {JSDOM} = require('jsdom');
const PAGES = ['index.html', 'about.html', 'help.html', 'log.html'];
const html = Object.fromEntries(PAGES.map(p => [p, fs.readFileSync(path.join(ROOT, p), 'utf8')]));
const dom = p => new JSDOM(html[p]).window.document;
const visible = doc => { const parts = []; const walk = n => { if (n.nodeType === 3) parts.push(n.textContent); else if (n.nodeType === 1 && !['SCRIPT', 'STYLE'].includes(n.tagName)) { for (const a of ['alt', 'aria-label', 'title', 'placeholder']) if (n.getAttribute(a)) parts.push(n.getAttribute(a)); n.childNodes.forEach(walk); } }; walk(doc.documentElement); parts.push(doc.title); return parts.join('\n'); };
const BEACON = `<!-- Cloudflare Web Analytics --><script type='module' src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "d2c23a1c7dbd41168e2a3d54c4a4dc40"}'></script><!-- End Cloudflare Web Analytics -->`;
await t('Pages: the Cloudflare beacon appears exactly once on every page', () => { for (const p of PAGES) { assert.equal(html[p].split(BEACON).length - 1, 1, p); assert.equal((html[p].match(/beacon\.min\.js/g) || []).length, 1, p); } });
await t('Pages: header has the official BMC button and the Lorenz feedback link', () => {
  for (const p of PAGES) { const d = dom(p), a = d.querySelector('.site-header a.header-coffee'); assert.ok(a, p); assert.equal(a.href, 'https://buymeacoffee.com/arthurdeusexmachina');
    assert.equal(a.querySelector('img').getAttribute('src'), './img/bmc-button.png'); assert.ok(fs.existsSync(path.join(ROOT, 'img/bmc-button.png')));
    assert.equal(d.querySelector('.site-header a.header-feedback').getAttribute('href'), 'mailto:hello@dexmlabs.app?subject=Lorenz%20feedback'); }
});
await t('Pages: local links and assets exist', () => {
  for (const p of PAGES) for (const el of dom(p).querySelectorAll('[href],[src]')) { const u = el.getAttribute('href') || el.getAttribute('src');
    if (/^(https?:|mailto:|#|\.\.\/)/.test(u)) continue; assert.ok(fs.existsSync(path.join(ROOT, u.split('#')[0])), `${p}: ${u}`); }
});
await t('Pages: only hello@dexmlabs.app, no phone, address or banned strings', () => {
  const all = Object.values(html).join('\n') + fs.readdirSync(path.join(ROOT, 'js')).map(f => fs.readFileSync(path.join(ROOT, 'js', f), 'utf8')).join('\n') + fs.readFileSync(path.join(ROOT, 'CREDITS.md'), 'utf8');
  const emails = new Set(all.match(/[\w.+-]+@[\w-]+\.[a-z][\w.]*/gi) || []); assert.deepEqual([...emails].filter(e => !/^hello@dexmlabs\.app/.test(e)), []);
  for (const bad of ['F1', '+44', '7851']) assert.ok(!all.includes(bad), bad);
});
await t('Copy: no AI mentioned anywhere in pages, code or credits', () => {
  const files = [...PAGES, 'CREDITS.md', 'LICENSE', ...fs.readdirSync(path.join(ROOT, 'js')).map(f => 'js/' + f)];
  for (const f of files) assert.ok(!/\bA\.?I\b|artificial intelligence|machine learning|\bLLM\b|ChatGPT|\bGPT\b/i.test(fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\bai\b(?=[a-z])/g, '')), f);
});
await t('Copy: no dashes as punctuation in visible text', () => {
  for (const p of PAGES) { const v = visible(dom(p)); const m = v.match(/[\u2013\u2014]|\s-\s|\s--?\s/); assert.ok(!m, `${p}: ${m && v.slice(Math.max(0, m.index - 30), m.index + 30)}`); }
  for (const m of MESSAGES) assert.ok(!/[-\u2013\u2014]/.test(m), m);
});
await t('Copy: exclamation marks come in pairs, UK spelling', () => {
  const ui = fs.readFileSync(path.join(ROOT, 'js/main.js'), 'utf8').match(/'[^'\n]*'|`[^`\n]*`/g).join('\n');
  for (const [name, v] of [...PAGES.map(p => [p, visible(dom(p))]), ['main.js strings', ui]]) {
    assert.ok(!/(^|[^!])![^!=]/.test(v.replace(/!==?|!\w|!\(|!\[|!document|!r\.|!p\.|!q\./g, '')), `${name} has a single !`);
    assert.ok(!/\b(color|center|honor|favorite|analyze|organize|recognize|gray|meter)\b/i.test(v), `${name} has US spelling`);
  }
});
const PL = await import('../js/print-link.js');
const CULTS = 'https://cults3d.com/en/3d-model/gadget/lorenz-cipher-chi-wheel-demonstrator-simplified-sz42-teaching-model';
const PRINTABLES = 'https://www.printables.com/model/1870782-lorenz-cipher-chi-wheel-demonstrator-simplified-sz';
const stlDocs = () => ({index: dom('index.html'), about: dom('about.html'), card: new JSDOM(`<section class="decoded-card">${PL.stlSlotHTML('card')}</section>`).window.document});
await t('STL: the constants hold the Cults and Printables model pages', () => { assert.equal(PL.CULTS_URL, CULTS); assert.equal(PL.PRINTABLES_URL, PRINTABLES); });
await t('STL: every slot is hidden in the markup, and stays hidden with no Cults link', () => {
  for (const [name, d] of Object.entries(stlDocs())) { const slot = d.querySelector('[data-stl]'); assert.ok(slot, name); assert.equal(slot.hasAttribute('hidden'), true, name);
    assert.equal(PL.applyPrintLink(d, {cults: '', printables: PRINTABLES}), false); assert.equal(slot.hidden, true, name); assert.equal(slot.querySelector('.stl-button').hasAttribute('href'), false);
    assert.equal(PL.applyPrintLink(d, {cults: 'not a url', printables: ''}), false); assert.equal(slot.hidden, true); }
});
await t('STL: shown on the title screen, the decoded card and the about page, with the right links, labels and new tab', () => {
  const places = {index: ['title', 'stl-large'], about: ['about', 'stl-small'], card: ['card', 'stl-large']};
  for (const [name, d] of Object.entries(stlDocs())) { assert.equal(PL.applyPrintLink(d), true, name);
    const slot = d.querySelector('[data-stl]'), a = slot.querySelector('.stl-button'), p = slot.querySelector('.stl-alt');
    assert.equal(slot.dataset.stl, places[name][0]); assert.ok(slot.classList.contains(places[name][1])); assert.equal(slot.hidden, false);
    assert.equal(a.getAttribute('href'), CULTS); assert.equal(a.getAttribute('target'), '_blank'); assert.equal(a.getAttribute('rel'), 'noopener');
    assert.equal(a.querySelector('.stl-label').textContent, 'Support me: download the free chi wheel model (STL)'); assert.equal(a.querySelector('.stl-sub').textContent, 'Free to download, tip if you like.');
    assert.equal(p.hidden, false); assert.equal(p.textContent, 'Also on Printables'); assert.equal(p.getAttribute('href'), PRINTABLES); assert.equal(p.getAttribute('target'), '_blank'); assert.equal(p.getAttribute('rel'), 'noopener'); }
  const t1 = dom('index.html'); assert.ok(t1.querySelector('.signed-note + [data-stl=title]'), 'right under my note'); assert.ok(!t1.querySelector('.hero-buttons + [data-stl]'), 'not under the play buttons any more');
  assert.equal((fs.readFileSync(path.join(ROOT, 'js/main.js'), 'utf8').match(/\$\{stlSlotHTML\('card'\)\}`;\n  applyPrintLink\(card\);/g) || []).length, 2, 'normal and hard cards');
  assert.match(html['about.html'], /<script type="module" src="\.\/js\/about\.js"><\/script>/);
});
await t('STL: the Printables link hides on its own when its URL is empty', () => {
  const d = dom('index.html'); assert.equal(PL.applyPrintLink(d, {cults: CULTS, printables: ''}), true);
  const p = d.querySelector('.stl-alt'); assert.equal(p.hidden, true); assert.equal(p.hasAttribute('href'), false); assert.equal(d.querySelector('.stl-button').getAttribute('href'), CULTS);
});
await t('STL: never says buy, and the blue meets AA with white text', () => {
  const texts = [PL.STL_LABEL, PL.STL_SUB, ...['index.html', 'about.html'].map(p => [...dom(p).querySelectorAll('[data-stl]')].map(x => x.textContent).join(' ')), fs.readFileSync(path.join(ROOT, 'js/print-link.js'), 'utf8')];
  for (const x of texts) assert.ok(!/\bbuy(ing|s)?\b|purchase/i.test(x), x.slice(0, 80));
  const css = fs.readFileSync(path.join(ROOT, 'css/style.css'), 'utf8');
  const lum = hex => { const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  for (const v of ['--stl-blue', '--stl-blue-hover']) { const hex = css.match(new RegExp(`${v}:(#[0-9a-f]{6})`, 'i'))[1]; const ratio = (1.05) / (lum(hex) + 0.05); assert.ok(ratio >= 4.5, `${v} ${hex} ${ratio.toFixed(2)}`); }
  assert.match(css, /\.stl-button\{[^}]*background:var\(--stl-blue\);color:var\(--stl-ink\)/); assert.match(css, /--stl-ink:#ffffff/);
});
await t('Public source: no HTML comments except the analytics beacon, and no process notes', () => {
  for (const [name, v] of Object.entries(html)) { const c = v.match(/<!--[\s\S]*?-->/g) || []; assert.deepEqual(c.filter(x => !/^<!-- (End )?Cloudflare Web Analytics -->$/.test(x)), [], name); }
  const files = ['index.html', 'help.html', 'about.html', 'log.html', 'CREDITS.md', 'css/style.css', ...fs.readdirSync(path.join(ROOT, 'js')).map(f => 'js/' + f)];
  for (const f of [...files, 'README.md', 'LICENSE'].filter(f => fs.existsSync(path.join(ROOT, f)))) assert.ok(!/elon|chopin|PRINT_LINK|fills this in|for review|TODO|FIXME|\[ARTHUR|placeholder|lorem ipsum|TBC\b/i.test(fs.readFileSync(path.join(ROOT, f), 'utf8')), f);
});
await t('Buttons: no arrow glyphs on in page buttons', () => {
  for (const p of PAGES) for (const b of dom(p).querySelectorAll('button')) assert.ok(!/[\u2190-\u21ff\u2794-\u27bf\u2b05-\u2b07]/.test(b.textContent), `${p}: ${b.textContent}`);
  assert.ok(!/&rarr;|&larr;/.test(html['index.html']));
});
await t('Footer: same links on every page, short labels, and it wraps to fit 320 to 430 px with no sideways scroll', () => {
  const css = fs.readFileSync(path.join(ROOT, 'css/style.css'), 'utf8');
  assert.match(css, /@media\(max-width:760px\)\{[\s\S]*?\.site-footer\{[^}]*flex-wrap:wrap/); assert.match(css, /\.footer-links\{display:contents\}/); assert.match(css, /@media\(max-width:760px\)\{:root\{--footer:56px\}/); assert.doesNotMatch(css, /\.site-footer\{[^}]*overflow-x:auto/); assert.match(css, /\.fl-long\{display:none\}\.fl-short\{display:inline\}/); assert.match(css, /\.footer-links\{display:flex;gap:16px;white-space:nowrap\}/);
  for (const p of PAGES) { const f = dom(p).querySelector('.site-footer'); assert.ok(f.querySelector('.footer-home')); for (const href of ['../privacy/', '../cookies/', '../terms/', '../disclaimer/', '../contact/']) assert.ok(f.querySelector(`a[href="${href}"]`), `${p} ${href}`); }
});
await t('Index: CSP allows jsDelivr and Cloudflare only, three.js pinned to 0.185.0', () => {
  const d = dom('index.html'), csp = d.querySelector('meta[http-equiv="Content-Security-Policy"]').content;
  assert.match(csp, /script-src 'self' ('sha256-[A-Za-z0-9+\/=]+' )+https:\/\/cdn\.jsdelivr\.net https:\/\/static\.cloudflareinsights\.com;/); assert.ok(!/unsafe-inline/.test(csp.split('style-src')[0])); assert.match(csp, /object-src 'none'/);
  assert.equal(JSON.parse(d.querySelector('script[type=importmap]').textContent).imports.three, 'https://cdn.jsdelivr.net/npm/three@0.185.0/build/three.module.min.js');
});
await t('Guide: explains the QEP book, the motor logic and chi only mode, with sources', () => {
  const v = visible(dom('help.html'));
  for (const s of ['October 1942', 'QEP', '30 August 1941', 'Tiltman', 'Tutte', 'Testery', 'Newmanry', 'Heath Robinson', 'Colossus', 'Flowers', '1 June 1944', 'chi 2 one back', 'matches the printable model', 'never published']) assert.ok(v.includes(s), s);
  const links = [...dom('help.html').querySelectorAll('.sources a')].map(a => a.href).join(' ');
  for (const s of ['bletchleypark.org.uk', 'tnmoc.org', 'corr98-39.pdf', 'tunny']) assert.ok(links.includes(s), s);
});
await t('About: only the facts Arthur gave, never says he is licensed', () => {
  const v = visible(dom('about.html'));
  for (const s of ['RAF Coningsby', 'Raspberry Pi', 'ADS-B', 'Foundation licence', 'Skywave']) assert.ok(v.includes(s), s);
  assert.ok(!/\b(licensed|my callsign|I hold|M7\w+|2E0)/i.test(v));
});
await t('Licence: all rights reserved, Skywave wording', () => { assert.match(fs.readFileSync(path.join(ROOT, 'LICENSE'), 'utf8'), /^Copyright \(c\) 2026 DEXM Labs \(Arthur Jones\)\. All rights reserved\./); });

/* ---------- DOM boot in jsdom: daily round renders, reduced motion respected ---------- */
await t('DOM: index boots, today\'s round shows the QEP line and twelve wheel inputs, reduced motion applies', async () => {
  const w = new JSDOM(html['index.html'], {url: 'https://dexmlabs.app/lorenz/', pretendToBeVisual: true}).window;
  w.matchMedia = q => ({matches: /reduce/.test(q), addEventListener() {}, removeEventListener() {}});
  w.HTMLCanvasElement.prototype.getContext = () => null; w.HTMLDialogElement && (w.HTMLDialogElement.prototype.showModal = function () { this.open = true; });
  w.ResizeObserver = class { observe() {} disconnect() {} }; w.requestIdleCallback = () => 0; w.scrollTo = () => {};
  const keys = ['window', 'document', 'localStorage', 'location', 'history', 'matchMedia', 'requestAnimationFrame', 'cancelAnimationFrame', 'ResizeObserver', 'performance', 'navigator', 'requestIdleCallback'];
  const saved = {}; for (const k of keys) { saved[k] = Object.getOwnPropertyDescriptor(globalThis, k); Object.defineProperty(globalThis, k, {value: w[k] ?? globalThis[k], configurable: true, writable: true}); }
  try {
    await import('../js/main.js?dom');
    const d = w.document; assert.equal(d.body.dataset.screen, 'title'); assert.ok(d.body.classList.contains('reduced-motion'));
    d.getElementById('play-daily').click();
    const r = G.makeRound({});
    assert.equal(d.body.dataset.screen, 'game'); assert.equal(d.getElementById('qep-number').textContent, G.pad2(r.qep));
    assert.equal(d.querySelectorAll('.dial input').length, 12); assert.equal(d.querySelectorAll('#qep-table tbody tr').length, 6);
    assert.equal(d.getElementById('cipher-text').textContent.replace(/ /g, ''), r.cipher);
    assert.ok(d.querySelector('#qep-table .smudge'));
  } finally { w.close(); for (const k of keys) { if (saved[k]) Object.defineProperty(globalThis, k, saved[k]); else delete globalThis[k]; } }
});

/* ---------- The smudge: always on the answer line, and the book, the hint and the decode agree ---------- */
const B = await import('../js/book.js');
const BOOK_DOC = new JSDOM('').window.document;
const bookDoc = () => { BOOK_DOC.body.innerHTML = '<table><tbody id="b"></tbody></table>'; return BOOK_DOC; };
const renderBook = (r, revealed = false) => { const d = bookDoc(); d.getElementById('b').innerHTML = B.bookBodyHTML(r, revealed); return d; };
const decodes = (r, start) => L.decodeText(L.crypt(r.cipherCodes, {patterns: r.patterns, start, model: r.model})) === r.text;
/** Read a book row the way a player does: plain figures as they are, a smudged figure as every position ending in its last figure. */
function readRow(d, qep) {
  const row = d.querySelector(`tr[data-qep="${G.pad2(qep)}"]`), cells = [...row.children].slice(1), fixed = {}; let smudged = null;
  L.WHEELS.forEach((w, i) => { const shown = cells[i].querySelector('[aria-hidden]')?.textContent ?? cells[i].textContent;
    if (shown.startsWith('?')) { assert.equal(smudged, null, 'one smudge per line'); smudged = {wheel: w.id, shown, cell: cells[i], candidates: Array.from({length: w.size}, (_, k) => k + 1).filter(v => v % 10 === Number(shown[1]))}; }
    else fixed[w.id] = Number(shown); });
  return {fixed, smudged};
}
const days = Array.from({length: 365}, (_, k) => new Date(Date.UTC(2026, 9, 9 + k)));
await t('Smudge: for 365 days the answer line carries the smudge the hint names, shown as ? in the book, and only the right figure decodes', () => {
  for (const day of days) { const r = G.makeRound({date: day}), line = G.answerLine(r), key = r.key;
    assert.ok(line.smudge, `${key}: answer line has a smudge`); assert.equal(line.smudge, r.smudge, key); assert.deepEqual(line.start, r.start, key);
    const {fixed, smudged} = readRow(renderBook(r), r.qep);
    assert.ok(smudged, `${key}: a ? on QEP ${r.qep}`); assert.equal(smudged.wheel, line.smudge.wheel, key); assert.equal(smudged.shown, line.smudge.shown, key);
    assert.match(smudged.cell.textContent, /\?/, key); assert.ok(smudged.cell.classList.contains('smudge'), key);
    const {answer} = G.useHint(G.newState(r), 'reveal', r.start);
    assert.equal(answer.wheel, smudged.wheel, key); assert.equal(answer.value, r.start[smudged.wheel], key);
    assert.equal(G.revealText(r), `The smudged figure on QEP ${G.pad2(r.qep)} is ${L.WHEEL[smudged.wheel].label} at ${G.pad2(r.start[smudged.wheel])}.`, key);
    assert.ok(G.pad2(answer.value).endsWith(smudged.shown.slice(1)), key);
    const good = smudged.candidates.filter(v => decodes(r, {...fixed, [smudged.wheel]: v}));
    assert.deepEqual(good, [r.start[smudged.wheel]], `${key}: exactly the true figure decodes`);
    for (const e of r.book) if (e.qep !== r.qep) assert.ok(!decodes(r, e.start), `${key}: decoy QEP ${e.qep} must not decode`); }
});
await t('Smudge: practice rounds also always smudge the answer line', () => {
  for (let seed = 1; seed <= 200; seed++) { const r = G.makeRound({mode: 'practice', seed}); assert.ok(G.answerLine(r).smudge, seed); assert.equal(G.answerLine(r).smudge, r.smudge); }
});
await t('Smudge: the book renders the same every time, whatever the time of day, and reading the smudge keeps the ?', () => {
  for (const day of days.slice(0, 60)) { const a = G.makeRound({date: day}), b = G.makeRound({date: new Date(day.getTime() + 86399000)});
    assert.equal(B.bookBodyHTML(a), B.bookBodyHTML(b)); assert.equal(B.bookBodyHTML(a), B.bookBodyHTML(a));
    const d = renderBook(a, true), {smudged} = readRow(d, a.qep), sm = G.answerLine(a).smudge;
    assert.ok(smudged, `${a.key}: still smudged after reading`); assert.equal(smudged.cell.querySelector('.smudge-read').textContent, G.pad2(a.start[sm.wheel]));
    assert.equal(d.querySelectorAll('.smudge-read').length, 1, 'only the answer line gets the read figure');
    assert.equal(B.smudgeNote(a, true), `${B.SMUDGE_NOTE} ${G.revealText(a)}`); assert.equal(B.smudgeNote(a, false), B.SMUDGE_NOTE); }
});
await t('Smudge: today, #1, is still QEP 46 with mu61 smudged as ?3 (the round players already have)', () => {
  const r = G.makeRound({date: d1}); assert.equal(r.number, 1); assert.equal(r.qep, 46); assert.equal(r.model, 'SZ42A');
  assert.deepEqual(r.start, {psi1:10, psi2:39, psi3:44, psi4:20, psi5:10, mu37:5, mu61:3, chi1:7, chi2:23, chi3:13, chi4:20, chi5:22});
  assert.deepEqual(r.book.map(e => e.qep), [2, 31, 32, 46, 64, 79]); assert.equal(r.smudge.wheel, 'mu61'); assert.equal(r.smudge.shown, '?3');
  assert.equal(G.revealText(r), 'The smudged figure on QEP 46 is \u03bc61 at 03.');
});
await t('Smudge: a fully readable answer line still decodes from the shown figures, and the reveal hint is free and empty', () => {
  for (const day of days.slice(0, 30)) { const r0 = G.makeRound({date: day});
    const r = {...r0, smudge: null, book: r0.book.map(e => e.qep === r0.qep ? {...e, smudge: null} : e)};
    const d = renderBook(r), {fixed, smudged} = readRow(d, r.qep);
    assert.equal(smudged, null); assert.equal(d.querySelector(`tr[data-qep="${G.pad2(r.qep)}"] .smudge`), null);
    assert.ok(decodes(r, fixed), `${r.key}: readable line decodes`); assert.equal(G.attempt(G.newState(r), fixed).state.score, 1000);
    const h = G.useHint(G.newState(r), 'reveal', fixed); assert.equal(h.answer, null); assert.equal(h.state.hints.length, 0);
    assert.equal(G.revealText(r), null); assert.equal(B.smudgeNote(r, true), B.SMUDGE_NOTE); }
});
await t('Book: exactly one highlighted line, the round\'s QEP, with aria-current and a screen reader label (daily and practice)', () => {
  const rounds = [...days.slice(0, 60).map(day => G.makeRound({date: day})), ...[1, 2, 3, 42, 99].map(seed => G.makeRound({mode: 'practice', seed}))];
  for (const r of rounds) { const d = renderBook(r), hl = d.querySelectorAll('tr.today-line');
    assert.equal(hl.length, 1, r.key); assert.equal(hl[0].dataset.qep, G.pad2(r.qep)); assert.equal(hl[0].getAttribute('aria-current'), 'true');
    assert.equal(d.querySelectorAll('[aria-current]').length, 1);
    assert.equal(hl[0].querySelector('td .sr-only').textContent, r.mode === 'daily' ? ", today's line" : ', your line'); }
  const css = fs.readFileSync(path.join(ROOT, 'css/style.css'), 'utf8');
  assert.match(css, /\.qep-table tr\.today-line td\{box-shadow:inset 0 0 0 100vmax rgba\(214,255,0,\.08\)\}/);
  assert.match(css, /\.qep-table tr\.today-line td:first-child\{box-shadow:inset 3px 0 0 #d6ff00/);
});

/* Boot the real page in jsdom with a given localStorage, and give back the document. */
let bootCount = 0;
/* The shared points script lives at the site root (../assets/points.js). In this mirror, read it from the site clone. */
const POINTS_JS = [path.join(ROOT, '../assets/points.js'), path.join(process.env.DEXM_SITE || '/workspace/dexmlabs/site', 'assets/points.js')].find(f => fs.existsSync(f));
/** Set the dials to `start`, type the reply and punch it, finishing the tape at once with Skip. */
function sendReplyDOM(d, w, round, {text = HD.replyFor(round), start = round.start} = {}) {
  for (const [id, v] of Object.entries(start)) { const el = d.getElementById(`dial-${id}`); el.value = String(v); el.dispatchEvent(new w.Event('change', {bubbles: true})); }
  d.getElementById('reply-input').value = text; d.getElementById('reply-go').click(); d.getElementById('skip-button').click();
}
async function bootPage(storage, fn, {points = false} = {}) {
  const w = new JSDOM(html['index.html'], {url: 'https://dexmlabs.app/lorenz/', pretendToBeVisual: true}).window;
  for (const [k, v] of Object.entries(storage)) w.localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
  const hadPoints = Object.getOwnPropertyDescriptor(globalThis, 'DexmPoints');
  if (points) { const prev = {localStorage: globalThis.localStorage, document: globalThis.document}; globalThis.localStorage = w.localStorage; globalThis.document = w.document; new Function('window', fs.readFileSync(POINTS_JS, 'utf8'))(w); globalThis.DexmPoints = w.DexmPoints; Object.assign(globalThis, prev); }
  else delete globalThis.DexmPoints;
  const errors = []; w.addEventListener('error', e => errors.push(e.error || e.message));
  w.matchMedia = q => ({matches: /reduce/.test(q), addEventListener() {}, removeEventListener() {}});
  w.HTMLCanvasElement.prototype.getContext = () => null; w.HTMLDialogElement && (w.HTMLDialogElement.prototype.showModal = function () { this.open = true; });
  if (w.HTMLDialogElement && !w.HTMLDialogElement.prototype.close) w.HTMLDialogElement.prototype.close = function () { this.open = false; this.dispatchEvent(new w.Event('close')); };
  w.ResizeObserver = class { observe() {} disconnect() {} }; w.requestIdleCallback = () => 0; w.scrollTo = () => {};
  const keys = ['window', 'document', 'localStorage', 'location', 'history', 'matchMedia', 'requestAnimationFrame', 'cancelAnimationFrame', 'ResizeObserver', 'navigator', 'requestIdleCallback'];
  const saved = {}; for (const k of keys) { saved[k] = Object.getOwnPropertyDescriptor(globalThis, k); Object.defineProperty(globalThis, k, {value: w[k] ?? globalThis[k], configurable: true, writable: true}); }
  try { await import(`../js/main.js?smudge${++bootCount}`); await fn(w.document, w); assert.deepEqual(errors, []); }
  finally { w.close(); for (const k of keys) { if (saved[k]) Object.defineProperty(globalThis, k, saved[k]); else delete globalThis[k]; } if (hadPoints) Object.defineProperty(globalThis, 'DexmPoints', hadPoints); else delete globalThis.DexmPoints; }
}
const today = G.makeRound({});
const answerCell = d => d.querySelector(`#qep-table tr[data-qep="${G.pad2(today.qep)}"] td[data-wheel="${today.smudge.wheel}"]`);
await t('DOM: today\'s answer line is highlighted and shows the ?, the reveal hint matches it, and the ? stays after a re-render', async () => {
  await bootPage({}, d => {
    d.getElementById('play-daily').click();
    assert.equal(d.querySelector('#qep-table tr.today-line').dataset.qep, G.pad2(today.qep));
    const cell = answerCell(d); assert.ok(cell); assert.equal(cell.querySelector('[aria-hidden]').textContent, today.smudge.shown);
    assert.equal(d.querySelectorAll(`#qep-table tr[data-qep="${G.pad2(today.qep)}"] .smudge`).length, 1);
    const before = d.querySelector('#qep-table tbody').innerHTML;
    d.querySelector('[data-hint=reveal]').click();
    assert.equal(d.getElementById('feedback').textContent, G.revealText(today));
    assert.equal(answerCell(d).querySelector('[aria-hidden]').textContent, today.smudge.shown, 'still smudged after the hint');
    assert.equal(answerCell(d).querySelector('.smudge-read').textContent, G.pad2(today.start[today.smudge.wheel]));
    assert.ok(d.getElementById('smudge-note').textContent.endsWith(G.revealText(today)));
    d.querySelector('[data-action=title]').click(); d.getElementById('play-daily').click();
    assert.equal(answerCell(d).querySelector('[aria-hidden]').textContent, today.smudge.shown, 'still smudged after going back in');
    assert.equal(d.querySelector('#qep-table tbody').innerHTML.replace(/<small class="smudge-read"[^<]*<\/small>|, read as \d\d/g, ''), before);
  });
});
await t('DOM: after a restore from localStorage with the smudge already read, the answer line still shows the ?', async () => {
  await bootPage({[`lorenz:round:${today.key}`]: {attempts: [], hints: [{type: 'reveal'}], solved: false, score: 0, wheels: {}}}, d => {
    d.getElementById('play-daily').click();
    assert.equal(answerCell(d).querySelector('[aria-hidden]').textContent, today.smudge.shown);
    assert.equal(answerCell(d).querySelector('.smudge-read').textContent, G.pad2(today.start[today.smudge.wheel]));
    assert.ok(d.getElementById('smudge-note').textContent.endsWith(G.revealText(today)));
    assert.equal(d.querySelector('[data-hint=reveal]').disabled, true);
  });
});
await t('DOM: old or damaged saved progress does not throw', async () => {
  for (const bad of ['not json', {hints: 'reveal', attempts: [null, 5, {key: 1}], score: 'x', solved: 'yes', wheels: 'x'}, 7, {hints: [null, {type: 'nope'}, {type: 'check', wheel: 'chi1'}], attempts: [{key: '01', ok: false}]}])
    await bootPage({[`lorenz:round:${today.key}`]: bad, 'lorenz:stats': 'nope', 'lorenz:settings': '[1'}, d => {
      d.getElementById('play-daily').click();
      assert.equal(d.body.dataset.screen, 'game'); assert.equal(answerCell(d).querySelector('[aria-hidden]').textContent, today.smudge.shown);
    });
});

/* ---------- Hard mode ---------- */
const HD = await import('../js/hard.js');
const PU = await import('../js/punch.js');
const normalBefore = Object.fromEntries(days.slice(0, 30).map(d => { const r = G.makeRound({date: d}); return [r.key, JSON.stringify({c: r.cipher, s: r.start, q: r.qep, b: r.book, m: r.model, t: r.text})]; }));
await t('Hard: same daily seed as normal (message, QEP, start positions, smudge, cipher)', () => {
  for (const day of days) { const n = G.makeRound({date: day}), h = HD.makeHardRound({date: day});
    assert.equal(h.text, n.text); assert.equal(h.qep, n.qep); assert.deepEqual(h.start, n.start); assert.deepEqual(h.smudge, n.smudge); assert.equal(h.cipher, n.cipher); assert.equal(h.model, n.model); assert.deepEqual(h.book, n.book); }
});
await t('Hard: five dated pages, exactly one is today, it opens on a wrong page, same columns and rows, for 365 days', () => {
  for (const day of days) { const h = HD.makeHardRound({date: day}), today = Date.parse(h.key);
    assert.equal(h.pages.length, 5); assert.equal(h.pages.filter(p => p.today).length, 1); assert.equal(h.pages[h.todayIndex].key, h.key);
    assert.notEqual(h.openIndex, h.todayIndex); assert.ok(!h.pages[h.openIndex].today);
    assert.equal(new Set(h.pages.map(p => p.key)).size, 5); assert.deepEqual(h.pages.map(p => p.key), [...h.pages.map(p => p.key)].sort());
    for (const p of h.pages) { assert.ok(Math.abs(Date.parse(p.key) - today) <= 7 * 86400000, p.key);
      assert.equal(p.book.length, h.book.length); assert.equal(new Set(p.book.map(e => e.qep)).size, p.book.length);
      for (const e of p.book) assert.deepEqual(Object.keys(e.start), L.WHEELS.map(w => w.id));
      const d = renderBook(HD.pageRound(h, p), false); for (const tr of d.querySelectorAll('tr')) assert.equal(tr.children.length, 1 + L.WHEELS.length);
      assert.equal(d.querySelectorAll('.today-line').length, p.today ? 1 : 0, 'only today\'s page has the answer line');
      const dh = bookDoc(); dh.getElementById('b').innerHTML = B.bookBodyHTML(HD.pageRound(h, p), false, {highlight: false}); assert.equal(dh.querySelectorAll('.today-line,[aria-current]').length, 0, 'no highlight in hard mode'); }
    for (const p of h.pages.filter(p => !p.today)) { const line = p.book.find(e => e.qep === h.qep); assert.ok(line, 'decoy pages carry the same QEP number'); assert.ok(!decodes(h, line.start), `${h.key} decoy ${p.key} must not decode`); }
    assert.deepEqual(h.pages[h.todayIndex].book, G.makeRound({date: day}).book); }
});
await t('Hard: pages are deterministic per day and differ between days', () => {
  for (const day of days.slice(0, 60)) { const a = HD.makeHardRound({date: day}), b = HD.makeHardRound({date: new Date(day.getTime() + 80000000)});
    assert.equal(JSON.stringify(a.pages), JSON.stringify(b.pages)); assert.equal(a.openIndex, b.openIndex); }
  assert.notEqual(JSON.stringify(HD.makeHardRound({date: days[0]}).pages), JSON.stringify(HD.makeHardRound({date: days[1]}).pages));
});
await t('Hard: today\'s page keeps the smudge on the answer line, and the hard smudge hint matches without naming the QEP', () => {
  for (const day of days) { const h = HD.makeHardRound({date: day}), page = h.pages[h.todayIndex], pr = HD.pageRound(h, page);
    const {smudged} = readRow(renderBook(pr), h.qep); assert.equal(smudged.wheel, h.smudge.wheel); assert.equal(smudged.shown, h.smudge.shown);
    const a = HD.useHardHint(HD.newHardState(h), 'smudge').answer; assert.equal(a.wheel, h.smudge.wheel); assert.equal(a.value, h.start[h.smudge.wheel]);
    const txt = HD.hardSmudgeText(h); assert.ok(txt.includes(`${L.WHEEL[h.smudge.wheel].label} at ${G.pad2(h.start[h.smudge.wheel])}`)); assert.ok(!txt.includes('QEP')); }
});
await t('Hard: the preamble is plain ITA2, not enciphered, and reads QEP and the number', () => {
  for (const day of days) { const h = HD.makeHardRound({date: day}), c = h.preamble;
    assert.equal(c[0], L.SHIFT.LTRS); assert.deepEqual(c.slice(1, 5).map(L.nameOf), ['Q', 'E', 'P', '9']); assert.equal(c[5], L.SHIFT.FIGS); assert.equal(c.at(-1), L.SHIFT.LTRS); assert.equal(c.length, 9);
    assert.equal(L.decodeText(c), `QEP ${G.pad2(h.qep)}`); assert.equal(HD.readPreamble(c), h.qep); }
  assert.deepEqual(HD.preambleCodes(46).map(L.nameOf).join(''), '8QEP95RY8');
  assert.deepEqual(HD.preambleCodes(7).map(L.nameOf).join(''), '8QEP95PU8');
});
await t('Hard: the punched tape HTML draws exactly the holes of each code', () => {
  const d = bookDoc(), h = HD.makeHardRound({date: d1}); d.body.innerHTML = `<div id="t">${PU.tapeHTML(h.preamble)}</div><div id="u">${PU.tapeHTML(h.plainCodes, {buttons: true})}</div>`;
  const read = sel => [...d.querySelectorAll(`${sel} .frame`)].map(f => L.codeFromBits([...f.querySelectorAll('i.h')].map(i => i.classList.contains('on') ? 1 : 0)));
  assert.deepEqual(read('#t'), h.preamble); assert.deepEqual(read('#u'), [...h.plainCodes]); assert.equal(L.decodeText(read('#u')), h.text);
  assert.equal(d.querySelectorAll('#t .frame i.sp').length, h.preamble.length);
  assert.equal(PU.holesText(0), 'no holes'); assert.equal(PU.holesText(16), 'hole 1'); assert.equal(PU.holesText(L.codeOf('X')), 'holes 1, 3, 4 and 5');
  for (const b of d.querySelectorAll('#u button.frame')) assert.match(b.getAttribute('aria-label'), /^Row \d+, (no holes|holes? [\d, and]+)$/);
});
await t('Hard: the cheat sheet is the lorenz.js ITA2 table, 32 codes with shifts, space, CR and LF', () => {
  assert.equal(HD.CHEAT_SHEET.length, 32);
  HD.CHEAT_SHEET.forEach((c, i) => { assert.equal(c.code, i); assert.equal(c.bp, L.BP[i]); assert.equal(c.holes, L.dotsCrosses(i));
    if (/[A-Z]/.test(c.bp)) { assert.equal(c.letter, c.bp); assert.equal(c.figure, L.FIGURES[c.bp] || L.FIGURE_CONTROLS[c.bp] || ''); } });
  const by = n => HD.CHEAT_SHEET[L.codeOf(n)];
  assert.equal(by('8').letter, 'Letter shift'); assert.equal(by('5').letter, 'Figure shift'); assert.equal(by('9').letter, 'Space'); assert.equal(by('3').letter, 'Carriage return'); assert.equal(by('4').letter, 'Line feed');
  assert.equal(by('R').figure, '4'); assert.equal(by('M').figure, '.');
  const d = new JSDOM(html['index.html']).window.document; assert.ok(d.getElementById('cheat-dialog')); assert.ok(d.querySelector('#cheat-dialog [data-close]').getAttribute('aria-label'));
  assert.ok(/figure shift/i.test(d.querySelector('#cheat-dialog .tiny').textContent));
});
await t('Hard: tolerant answer matching passes the right reading and fails wrong ones', () => {
  const T = 'FIELD TELEPHONE LINE CUT BY A TRACTOR AT 0900. REPAIRED BY 1030.';
  for (const ok of [T, T.toLowerCase(), '  field   telephone line cut by a tractor at 0900.\nrepaired by 1030  ', T.slice(0, -1), T.slice(0, -1) + '!!', 'FIELD TELEPHONE LINE CUT BY A TRACTOR AT 0900 REPAIRED BY 1030',
    'FIELD9TELEPHONE9LINE9CUT9BY9A9TRACTOR9AT9 0900. REPAIRED BY 1030', L.toBP(L.encodeText(T)), L.toBP(L.encodeText(T)).toLowerCase(), T.replace('TRACTOR', 'TRACTER')])
    assert.ok(HD.matchAnswer(ok, T).ok, ok);
  for (const bad of ['', 'FIELD TELEPHONE LINE CUT', T.replace('0900', '0800'), T.replace('TRACTOR', 'TRUCK'), T.replace('TRACTOR', 'TRACTER').replace('LINE', 'LIME'), 'WEATHER FOR TOMORROW', T + ' AGAIN', T.replace(/ /g, '')])
    assert.ok(!HD.matchAnswer(bad, T).ok, bad);
  const m = HD.matchAnswer('FIELD TELEPHONE LINE CUX', T); assert.equal(m.of, 12); assert.equal(m.right, 3); assert.equal(m.unit, 'words');
});
await t('Hard: scoring, QEP bonus, hints and wrong readings', () => {
  const h = HD.makeHardRound({date: d1}); let st = HD.newHardState(h);
  assert.equal(HD.hardScoreFor(st), 1000);
  st = HD.guessQep(st, h.qep).state; assert.equal(HD.hardScoreFor(st), 1200); assert.ok(HD.qepKnown(st));
  st = HD.submitAnswer(st, 'NOT IT').state; assert.equal(HD.hardScoreFor(st), 1050);
  assert.equal(HD.submitAnswer(st, 'not it').state.answers.length, 1, 'same wrong reading is free');
  let x = HD.newHardState(h); x = HD.guessQep(x, h.qep === 1 ? 2 : 1).state; x = HD.guessQep(x, h.qep).state; assert.equal(HD.hardScoreFor(x), 1000, 'bonus only first time');
  assert.equal(HD.guessQep(x, 'abc').result.valid, false);
  let y = HD.newHardState(h); y = HD.useHardHint(y, 'qep').state; y = HD.guessQep(y, h.qep).state; assert.equal(HD.hardScoreFor(y), 1000, 'revealing the QEP loses the bonus, nothing more');
  const c1 = HD.useHardHint(y, 'char'); assert.deepEqual(c1.answer, {index: 0, char: h.text[0]}); y = c1.state;
  const c2 = HD.useHardHint(y, 'char'); assert.deepEqual(c2.answer, {index: 1, char: h.text[1]}); y = c2.state; assert.equal(HD.revealedChars(y), h.text.slice(0, 2));
  y = HD.useHardHint(y, 'check', {settings: h.start, wheel: 'chi1'}).state; y = HD.useHardHint(y, 'smudge').state; y = HD.useHardHint(y, 'smudge').state;
  assert.equal(HD.hardScoreFor(y), 1000, 'hints cost points, not score'); assert.deepEqual({...HD.HARD_RULES.hint}, {qep: 40, char: 10, check: 20, smudge: 50});
  const done = HD.submitAnswer(y, h.text.toLowerCase()); assert.equal(done.result.ok, true); assert.equal(done.state.score, 1000);
  const b = HD.hardBreakdown(done.state); assert.equal(b.total, 1000); assert.equal(b.lines.length, 1);
  for (let i = 0; i < 20; i++) y = HD.submitAnswer(y, `WRONG ${i}`).state; assert.equal(HD.hardScoreFor(y), 100);
  assert.throws(() => HD.useHardHint(HD.newHardState(h), 'check', {settings: h.start, wheel: 'nope'}));
});
await t('Hard: own stats and streak, apart from normal, and the share text says HARD', () => {
  const solve = key => { const h = {...HD.makeHardRound({date: new Date(key + 'T09:00:00Z')})}, read = HD.submitAnswer(HD.newHardState(h), h.text).state; return HD.submitReply(read, HD.replyTape(h, HD.replyFor(h), h.start)).state; };
  let s = HD.updateHardStats(null, solve('2026-10-09')); s = HD.updateHardStats(s, solve('2026-10-10')); assert.equal(s.streak, 2); assert.equal(s.best, 1000);
  s = HD.updateHardStats(s, solve('2026-10-12')); assert.equal(s.streak, 1); assert.equal(s.bestStreak, 2);
  const st = solve('2026-10-09'), txt = HD.hardShareText(st, 'https://dexmlabs.app/lorenz/');
  assert.match(txt, /^Lorenz #1 HARD\nRead on try 1\n/); assert.ok(!txt.includes(st.round.text)); assert.ok(!/[\u2013\u2014]| - /.test(txt));
  const ns = G.updateStats(null, {...G.newState(G.makeRound({date: d1})), solved: true, score: 900, attempts: [{ok: true}]}); assert.equal(ns.best, 900);
  assert.equal(HD.restoreHard(st.round, 'junk').answers.length, 0); assert.equal(HD.restoreHard(st.round, {answers: [null, {key: 1}], hints: 'x', qepGuesses: [0, 46, 'a'], solved: true}).solved, false);
});
await t('Normal mode unchanged by hard mode: rounds identical, book highlight on, no hard parts shown', () => {
  for (const day of days.slice(0, 30)) { const r = G.makeRound({date: day}); assert.equal(JSON.stringify({c: r.cipher, s: r.start, q: r.qep, b: r.book, m: r.model, t: r.text}), normalBefore[r.key]); }
  const d = new JSDOM(html['index.html']).window.document;
  for (const id of ['today-line', 'preamble-box', 'book-pager', 'hard-out']) assert.equal(d.getElementById(id).hidden, true, id);
  for (const b of d.querySelectorAll('[data-hint=qep],[data-hint=char]')) assert.equal(b.hidden, true);
  assert.equal(d.querySelector('[data-difficulty=normal]').getAttribute('aria-pressed'), 'true');
  assert.equal(d.querySelectorAll('.page-turn').length, 2); assert.deepEqual([...d.querySelectorAll('.page-turn')].map(b => b.getAttribute('aria-label')), ['Previous page', 'Next page']);
});
await t('DOM: hard mode end to end: preamble, wrong page first, turn to today, tape only output, read it, HARD stats kept apart', async () => {
  await bootPage({}, async (d, w) => {
    d.querySelector('[data-difficulty=hard]').click(); assert.equal(w.localStorage.getItem('lorenz:difficulty'), '"hard"');
    d.getElementById('play-daily').click();
    const h = HD.makeHardRound({});
    assert.equal(d.getElementById('qep-number').textContent, '??'); assert.ok(!d.body.textContent.includes(h.text), 'message not in the page');
    assert.equal(d.getElementById('preamble-box').hidden, false); assert.equal(d.querySelectorAll('#preamble-tape .frame').length, 9);
    assert.equal(d.getElementById('book-date').textContent, HD.pageDate(h.pages[h.openIndex].key)); assert.notEqual(h.openIndex, h.todayIndex);
    assert.equal(d.querySelectorAll('#qep-table .today-line,[aria-current]').length, 0);
    const dir = h.todayIndex > h.openIndex ? 'ArrowRight' : 'ArrowLeft';
    for (let i = 0; i < Math.abs(h.todayIndex - h.openIndex); i++) d.dispatchEvent(new w.KeyboardEvent('keydown', {key: dir, bubbles: true}));
    assert.equal(d.getElementById('book-date').textContent, HD.pageDate(h.key)); assert.equal(d.getElementById('book-page').textContent, `${h.todayIndex + 1} of 5`);
    assert.equal(answerCell(d).querySelector('[aria-hidden]').textContent, h.smudge.shown);
    d.getElementById('qep-guess').value = String(h.qep); d.getElementById('qep-guess-go').click(); assert.equal(d.getElementById('qep-number').textContent, G.pad2(h.qep));
    d.querySelector('[data-cheat]').click(); assert.equal(d.getElementById('cheat-dialog').open, true); assert.equal(d.querySelectorAll('#cheat-body tr').length, 32);
    d.querySelector('#cheat-dialog [data-close]').click();
    assert.equal(d.getElementById('printed-box').hidden, true); assert.equal(d.getElementById('hard-out').hidden, false);
    d.getElementById('hard-answer').value = h.text.toLowerCase(); d.getElementById('hard-answer-go').click();
    assert.match(d.getElementById('feedback').textContent, /Message read!!/);
    assert.equal(d.getElementById('decoded-card').hidden, true, 'no card until the reply goes'); assert.equal(w.localStorage.getItem('lorenz:hard:stats'), null);
    assert.equal(d.getElementById('hard-reply').hidden, false); assert.equal(d.getElementById('reply-plain').textContent, HD.replyFor(h));
    sendReplyDOM(d, w, h);
    const stl = d.querySelector('#decoded-card.hard-card [data-stl=card]'); assert.ok(stl, 'STL button on the hard card'); assert.equal(stl.hidden, false);
    assert.equal(stl.querySelector('.stl-button').getAttribute('href'), CULTS); assert.equal(stl.querySelector('.stl-alt').getAttribute('href'), PRINTABLES);
    assert.match(d.querySelector('#decoded-card').textContent, /HARD|hard mode/);
    assert.ok(JSON.parse(w.localStorage.getItem('lorenz:hard:stats')).history[h.key]); assert.equal(w.localStorage.getItem('lorenz:stats'), null);
    assert.equal(JSON.parse(w.localStorage.getItem(`lorenz:hard:round:${h.key}`)).solved, true); assert.equal(w.localStorage.getItem(`lorenz:round:${h.key}`), null);
  });
});


/* ---------- Audit fixes ---------- */
const MACHINE = 'the Lorenz SZ40/42 cipher machine that Bletchley Park called Tunny';
await t('Wording: the machine is a cipher machine used with a teleprinter, never a teleprinter machine', () => {
  for (const f of ['index.html', 'about.html', 'help.html', 'log.html', 'CREDITS.md', 'README.md'].filter(f => fs.existsSync(path.join(ROOT, f)))) { const v = fs.readFileSync(path.join(ROOT, f), 'utf8');
    assert.ok(!/teleprinter (cipher )?machine|teleprinter cipher\b|German teleprinter cipher/i.test(v), f); }
  const idx = dom('index.html'), ab = dom('about.html');
  assert.ok(idx.querySelector('.hero-copy').textContent.includes(MACHINE)); assert.match(idx.querySelector('.hero-copy').textContent, /cipher attachment used with a teleprinter/);
  assert.ok(idx.querySelector('meta[name=description]').content.includes('Lorenz SZ40/42 cipher machine that Bletchley Park called Tunny'));
  assert.ok(ab.querySelector('.lede').textContent.includes(MACHINE));
});
await t('Wording: no overclaims about the history or the machine logic', () => {
  for (const f of ['index.html', 'about.html', 'help.html', 'log.html', 'CREDITS.md']) { const v = fs.readFileSync(path.join(ROOT, f), 'utf8');
    assert.ok(!/true story|most important|motor logic(,| and)? (are )?real|logic real|exactly as the Germans|is on the way/i.test(v), f); }
  assert.match(html['about.html'], /motor logic follows the SZ40 and SZ42A as described in the General Report on Tunny/);
  assert.match(html['help.html'], /hard mode preamble[^<]*is a layout I made for the game/);
});
await t('Disclaimer: not affiliated, on about, help and the title screen', () => {
  const line = 'Not affiliated with or endorsed by Bletchley Park, The National Museum of Computing or the Crypto Museum.';
  for (const f of ['index.html', 'about.html', 'help.html']) assert.ok(dom(f).querySelector('.disclaimer').textContent.includes(line), f);
});
await t('OG image: every Lorenz page points og:image and twitter:image at the Lorenz card, 1200 by 630', () => {
  const url = 'https://dexmlabs.app/lorenz/img/og-lorenz.png';
  for (const f of ['index.html', 'about.html', 'help.html', 'log.html']) { const d = dom(f);
    assert.equal(d.querySelector('meta[property="og:image"]')?.content, url, f); assert.equal(d.querySelector('meta[name="twitter:image"]')?.content, url, f);
    assert.equal(d.querySelector('meta[name="twitter:card"]')?.content, 'summary_large_image', f);
    assert.equal(d.querySelector('meta[property="og:image:width"]')?.content, '1200', f); assert.equal(d.querySelector('meta[property="og:image:height"]')?.content, '630', f);
    assert.ok(d.querySelector('meta[property="og:image:alt"]')?.content.includes('Lorenz'), f); }
  const png = fs.readFileSync(path.join(ROOT, 'img/og-lorenz.png'));
  assert.equal(png.toString('ascii', 1, 4), 'PNG'); assert.equal(png.readUInt32BE(16), 1200); assert.equal(png.readUInt32BE(20), 630);
});
await t('ITA2: figure shift D is Who are you? (WRU) and J is the bell; both print nothing and decoding is unchanged', () => {
  assert.equal(L.FIGURE_CONTROLS.D, 'Who are you? (WRU)'); assert.equal(L.FIGURE_CONTROLS.J, 'Bell');
  const std = {T:'5',O:'9',H:'£',N:',',M:'.',L:')',R:'4',G:'@',I:'8',P:'0',C:':',V:'=',E:'3',Z:'+',B:'?',S:"'",Y:'6',F:'%',X:'/',A:'-',W:'2',U:'7',Q:'1',K:'('};
  assert.deepEqual({...L.FIGURES, D: undefined, J: undefined}, {...std, D: undefined, J: undefined});
  const pr = L.printCodes([L.SHIFT.FIGS, L.codeOf('D'), L.codeOf('J'), L.SHIFT.LTRS, L.codeOf('D'), L.codeOf('J')]);
  assert.deepEqual(pr.map(p => p.control), ['FIGS', 'WRU', 'BELL', 'LTRS', null, null]); assert.equal(pr.map(p => p.print).join(''), 'DJ');
  assert.equal(HD.CHEAT_SHEET[L.codeOf('D')].figure, 'Who are you? (WRU)'); assert.equal(HD.CHEAT_SHEET[L.codeOf('J')].figure, 'Bell');
  const rows = [...dom('help.html').querySelectorAll('.ita2-table tbody tr')].map(tr => [...tr.cells].map(c => c.textContent));
  assert.equal(rows.length, 32); assert.ok(!rows.some(r => r[4] === '(none)'));
  for (const r of rows) if (/^[A-Z]$/.test(r[3]) && std[r[3]]) assert.equal(r[4], {'-': 'dash (-)'}[std[r[3]]] || std[r[3]], r[3]);
  assert.equal(rows[L.codeOf('D')][4], 'Who are you? (WRU)'); assert.equal(rows[L.codeOf('J')][4], 'Bell');
});
await t('Messages: 40 short, invented army and High Command signals, all encodable, and today decodes', () => {
  assert.equal(MESSAGES.length, 40); assert.equal(new Set(MESSAGES).size, 40);
  for (const m of MESSAGES) { assert.ok(m.length <= 105, m); assert.deepEqual(L.encodeText(m).dropped, [], m);
    assert.ok(!/BAKERY|BREAD|TRACTOR|HORSES|FODDER|BILLETS|HEADPHONES|SIGNAL SCHOOL|TELEPRINTER PAPER/.test(m), m); }
  assert.equal(MESSAGES.filter(m => /SITUATION|SUPPLY|STATE|APPRECIATION|MOVE|DIVISION|ARMY|HIGH COMMAND|FRONT|ENEMY|FUEL|AMMUNITION|RAIL|TANK|HEADQUARTERS|BATTALIONS|POSITIONS|CASUALTY|LEAVE|BRIDGES?|DEPOT|MINEFIELDS|VEHICLE|TROOP|CAM PATTERNS|MESSAGE|WITHDRAWAL/.test(m)).length, 40);
  const r = G.makeRound({date: new Date('2026-10-09T12:00:00Z')});
  assert.equal(r.number, 1); assert.equal(r.qep, 46);
  assert.equal(r.text, 'FIELD TELEPHONE LINE CUT BY A TRACTOR AT 0900. REPAIRED BY 1030.', 'launch day keeps the message it started with');
  assert.ok(G.acceptedTexts(r).includes('SITUATION REPORT 0900. FRONT QUIET. ENEMY PATROLS DRIVEN OFF IN SECTOR 4. NO CHANGE IN PLANS.'));
  assert.equal(L.decodeText(L.crypt(r.cipherCodes, {patterns: r.patterns, start: r.start, model: r.model})), r.text);
  for (let i = 0; i < 80; i++) { const q = G.makeRound({date: new Date(Date.UTC(2026, 9, 9 + i, 12))}); assert.equal(L.decodeText(L.crypt(q.cipherCodes, {patterns: q.patterns, start: q.start, model: q.model})), q.text); }
});

await t('Success cards: on wide screens the card is capped to the room under the sticky view, so the STL button can be reached', () => {
  const src = fs.readFileSync(path.join(ROOT, 'js/main.js'), 'utf8');
  assert.equal((src.match(/card\.hidden = false; fitCard\(\);/g) || []).length, 2, 'normal and hard cards');
  assert.match(src, /function fitCard\(\)[\s\S]*?position !== 'sticky' \|\| vs\.display === 'contents'\) return;[\s\S]*?overflowY = 'auto'/); assert.match(src, /addEventListener\('resize', \(\) => fitCard\(\)\)/);
});


/* ---------- Hard mode answer check fix ---------- */
const {MESSAGES_FIRST, MESSAGE_SETS, ALSO_LIVE} = await import('../js/messages.js');
const OLD1 = 'FIELD TELEPHONE LINE CUT BY A TRACTOR AT 0900. REPAIRED BY 1030.', NEW1 = 'SITUATION REPORT 0900. FRONT QUIET. ENEMY PATROLS DRIVEN OFF IN SECTOR 4. NO CHANGE IN PLANS.';
const variants = m => { const n = m.toLowerCase(); return [m, n, m.replace(/\.$/, ''), m.replace(/\./g, ','), m.replace(/, /g, '. '), `  ${n.replace(/ /g, '  ')}  `, m.replace(/\. /g, '.\n'), m.replace(/\.$/, '!!'),
  n.replace(/\b\w/g, c => c.toUpperCase()), m.replace(/\.(\s|$)/g, '$1'), `"${m}"`, L.toBP(L.encodeText(m))]; };
await t('Answer check: the natural English of every message passes, with the usual punctuation and spacing variants', () => {
  for (const m of [...MESSAGES, ...MESSAGES_FIRST]) for (const v of variants(m)) assert.ok(HD.matchAnswer(v, m).ok, JSON.stringify(v));
});
await t('Answer check: wrong readings fail, with word level feedback that one early slip does not wreck', () => {
  for (const m of [...MESSAGES, ...MESSAGES_FIRST]) {
    const w = HD.norm(m).split(' '), n = w.length;
    const shifted = HD.matchAnswer(`X ${m}`, m); assert.equal(shifted.ok, false); assert.equal(shifted.right, n, 'an extra word at the start still finds every word');
    const two = [...w]; two[0] = 'WRONG'; two[n - 1] = 'WORDS'; const r2 = HD.matchAnswer(two.join(' '), m); assert.equal(r2.ok, false, m); assert.equal(r2.right, n - 2); assert.equal(r2.of, n);
    const digit = m.match(/\d/); if (digit) { const d = m.replace(/\d/, x => String((Number(x) + 1) % 10)); assert.equal(HD.matchAnswer(d, m).ok, false, d); }
  }
  assert.equal(HD.matchAnswer('', OLD1).ok, false); assert.equal(HD.matchAnswer('WEATHER FOR TOMORROW', OLD1).right, 0);
  assert.deepEqual((({ok, right, of}) => ({ok, right, of}))(HD.matchAnswer(OLD1, NEW1)), {ok: false, right: 1, of: 16}, 'the old message against the new one: 0900 is the only word in common');
});
await t('Day pinning: a day keeps its message once it has started; launch day is the first list, later days the new one', () => {
  assert.deepEqual(MESSAGE_SETS.map(x => x.from), ['2026-10-09', '2026-10-10']); assert.equal(MESSAGES_FIRST.length, 40); assert.equal(MESSAGES.length, 40);
  assert.equal(G.messageListFor('2026-10-09'), MESSAGES_FIRST); assert.equal(G.messageListFor('2026-10-10'), MESSAGES); assert.equal(G.messageListFor('2027-01-01'), MESSAGES);
  const d9 = G.makeRound({date: new Date('2026-10-09T23:59:00Z')}); assert.equal(d9.number, 1); assert.equal(d9.qep, 46); assert.equal(d9.text, OLD1);
  assert.deepEqual(G.acceptedTexts(d9), [OLD1, NEW1]); assert.deepEqual(G.acceptedTexts(G.makeRound({date: new Date('2026-10-10T12:00:00Z')})).length, 1);
  assert.deepEqual(Object.keys(ALSO_LIVE), ['2026-10-09']);
  const h9 = HD.makeHardRound({date: new Date('2026-10-09T12:00:00Z')}); assert.equal(HD.submitAnswer(HD.newHardState(h9), OLD1).result.ok, true);
  assert.equal(HD.submitAnswer(HD.newHardState(h9), NEW1.toLowerCase()).result.ok, true, 'anyone who read the tape between the two lists is fine too');
});
await t('Tape and answer from the same round: the ciphertext decodes, with the true settings, to a text the checker accepts', () => {
  const days = Array.from({length: 60}, (_, i) => new Date(Date.UTC(2026, 9, 9 + i, 12)));
  for (const day of days) { const h = HD.makeHardRound({date: day}), out = L.decodeText(L.crypt(h.cipherCodes, {patterns: h.patterns, start: h.start, model: h.model}));
    assert.equal(out, h.text, h.key); assert.ok(HD.matchAnswer(out, G.acceptedTexts(h)).ok, h.key); }
  const r = HD.makeHardRound({date: days[0], text: NEW1}), base = HD.makeHardRound({date: days[0]});
  assert.equal(L.decodeText(L.crypt(r.cipherCodes, {patterns: r.patterns, start: r.start, model: r.model})), NEW1, 'a round rebuilt from saved text punches that text');
  assert.deepEqual(r.start, base.start); assert.equal(r.qep, base.qep); assert.deepEqual(r.pages.map(p => p.key), base.pages.map(p => p.key));
});
await t('Normal mode decoding is unaffected: right settings solve, the printer gives the round text, rebuilds keep the settings', () => {
  for (const day of Array.from({length: 30}, (_, i) => new Date(Date.UTC(2026, 9, 9 + i, 12)))) {
    const r = G.makeRound({date: day}), st = G.attempt(G.newState(r), r.start);
    assert.equal(st.result.ok, true); assert.equal(L.decodeText(L.crypt(r.cipherCodes, {patterns: r.patterns, start: r.start, model: r.model})), r.text);
    const wrong = {...r.start, chi1: r.start.chi1 % 41 + 1}; assert.equal(G.attempt(G.newState(r), wrong).result.ok, false);
  }
  const a = G.makeRound({date: new Date('2026-10-09T12:00:00Z')}), b = G.makeRound({date: new Date('2026-10-09T12:00:00Z'), text: NEW1});
  assert.deepEqual(a.start, b.start); assert.deepEqual(a.patterns, b.patterns); assert.equal(a.model, b.model); assert.deepEqual(a.book, b.book);
});
await t('Refund: a pre fix save shaped like the bug report gets its 150 back and is solved; damaged saves never throw', () => {
  const h = HD.makeHardRound({date: new Date('2026-10-09T12:00:00Z')});
  const arthur = {answers: [{key: 'FIELD TELEPHONE LINE CUT BY A TRACTOR AT 0900. REPAIRED BY 1030', ok: false}], hints: [], qepGuesses: [46], ran: {...h.start}, solved: false, score: 0, wheels: {...h.start}};
  const st = HD.restoreHard(h, arthur); assert.equal(st.solved, true); assert.equal(st.refunded, 1); assert.equal(st.solvedNow, true); assert.equal(st.score, 1200); assert.deepEqual(st.answers, [{key: arthur.answers[0].key, ok: true}]);
  const two = HD.restoreHard(h, {answers: [{key: 'GARBAGE', ok: false}, {key: 'MORE GARBAGE', ok: false}], hints: [{type: 'check', wheel: 'chi1'}], qepGuesses: []});
  assert.equal(two.solved, false); assert.equal(two.refunded, 2); assert.equal(two.answers.length, 0); assert.equal(HD.hardScoreFor(two), 1000, 'nothing stays charged: hints are paid in points now');
  const v2 = HD.restoreHard(h, {v: HD.HARD_SAVE_VERSION, answers: [{key: 'GARBAGE', ok: false}], hints: [], qepGuesses: []}); assert.equal(v2.refunded, 0); assert.equal(HD.hardScoreFor(v2), 850, 'new saves keep their charges');
  const solvedOld = HD.restoreHard(h, {answers: [{key: 'X', ok: false}, {key: HD.canon(OLD1), ok: true}], hints: [], qepGuesses: [], solved: true}); assert.equal(solvedOld.solved, true); assert.equal(solvedOld.score, 1000);
  for (const junk of [null, 'x', 42, [], {answers: 'x'}, {answers: [null, 1, {key: 5}]}, {answers: [{key: {}}]}, {v: 'x', answers: [{key: 'A', ok: 'yes'}], hints: [null], qepGuesses: [1.5, 'a']}])
    assert.doesNotThrow(() => HD.restoreHard(h, junk));
});
await t('DOM: Arthur\'s pre fix save is refunded and solved on load, saved with the new version and text, and counted in hard stats', async () => {
  const h = HD.makeHardRound({});
  const save = {answers: [{key: 'FIELD TELEPHONE LINE CUT BY A TRACTOR AT 0900. REPAIRED BY 1030', ok: false}], hints: [], qepGuesses: [], ran: {...h.start}, solved: false, score: 0, wheels: {...h.start}};
  await bootPage({'lorenz:difficulty': '"hard"', [`lorenz:hard:round:${h.key}`]: save}, async (d, w) => {
    d.getElementById('play-daily').click();
    const stored = JSON.parse(w.localStorage.getItem(`lorenz:hard:round:${h.key}`));
    assert.equal(stored.v, HD.HARD_SAVE_VERSION); assert.equal(stored.solved, true); assert.equal(stored.text, h.text); assert.equal(stored.score, 1000);
    assert.match(d.getElementById('feedback').textContent, /given back the 150 points/);
    assert.equal(d.getElementById('hard-reply').hidden, false, 'still owes the reply');
    sendReplyDOM(d, w, h); assert.ok(JSON.parse(w.localStorage.getItem('lorenz:hard:stats')).history[h.key]);
  });
  await bootPage({'lorenz:difficulty': '"hard"', [`lorenz:hard:round:${h.key}`]: '{not json'}, async d => { d.getElementById('play-daily').click(); assert.equal(d.getElementById('qep-number').textContent, '??'); });
});

/* ---------- Points: hints spend shared points, daily rounds earn them ---------- */
await t('Points: hint buttons show their price, hints spend points and leave the score alone', async () => {
  await bootPage({}, async (d, w) => {
    const P = w.DexmPoints; assert.equal(P.balance(), 150, 'welcome balance');
    d.getElementById('play-daily').click();
    assert.equal(d.querySelector('[data-hint=check] small').textContent, '20 pts'); assert.equal(d.querySelector('[data-hint=reveal] small').textContent, '50 pts');
    d.querySelector('[data-hint=reveal]').click(); assert.equal(P.balance(), 100);
    assert.equal(d.getElementById('score-display').textContent, '1,000 pts', 'score untouched');
    d.querySelector('[data-hint=check]').click(); assert.equal(d.getElementById('check-dialog').open, true); d.getElementById('check-go').click(); assert.equal(P.balance(), 80);
    assert.equal(P.entries().filter(e => e.kind === 'spend').length, 2);
    const saved = JSON.parse(w.localStorage.getItem(`lorenz:round:${today.key}`)); assert.equal(saved.hints.length, 2);
  }, {points: true});
});
await t('Points: not enough points disables a hint with a tooltip, and clicking it explains instead of charging', async () => {
  await bootPage({}, async (d, w) => {
    const P = w.DexmPoints; P.spend('test', 135, 'drain'); assert.equal(P.balance(), 15);
    d.getElementById('play-daily').click();
    const check = d.querySelector('[data-hint=check]'), reveal = d.querySelector('[data-hint=reveal]');
    assert.equal(check.getAttribute('aria-disabled'), 'true'); assert.match(check.title, /^Not enough points/); assert.equal(reveal.getAttribute('aria-disabled'), 'true');
    check.click(); assert.equal(d.getElementById('check-dialog').open, false); assert.match(d.getElementById('feedback').textContent, /Not enough points/); assert.equal(P.balance(), 15);
    reveal.click(); assert.equal(P.balance(), 15); assert.ok(!d.querySelector('#qep-table .smudge.revealed') || true);
    P.earn('test', 100, 'topup'); assert.equal(check.hasAttribute('aria-disabled'), false, 'buttons come back when the balance changes');
  }, {points: true});
});
await t('Points: a solved daily round pays 100 once, a solved hard round pays 250 once, including rounds solved before points', async () => {
  const hd = HD.makeHardRound({});
  const store = {[`lorenz:round:${today.key}`]: {v: 2, text: today.text, attempts: [{key: 'x', ok: true}], hints: [], solved: true, score: 1000, wheels: {}}, [`lorenz:hard:round:${hd.key}`]: {v: HD.HARD_SAVE_VERSION, text: hd.text, answers: [{key: HD.canon(hd.text), ok: true}], hints: [], qepGuesses: [hd.qep], ran: null, solved: true, score: 1200, wheels: {}}};
  let ledger;
  await bootPage(store, async (d, w) => { const P = w.DexmPoints; assert.equal(P.balance(), 150 + 100 + 250); assert.ok(P.has(`lorenz:daily:${today.key}`) && P.has(`lorenz:hard:${hd.key}`)); ledger = w.localStorage.getItem('dexm:points'); }, {points: true});
  await bootPage({...store, 'dexm:points': ledger}, async (d, w) => { assert.equal(w.DexmPoints.balance(), 500, 'not paid twice'); d.getElementById('play-daily').click(); assert.equal(w.DexmPoints.balance(), 500); }, {points: true});
});
await t('Points: hard mode hints are priced and charged once per reveal', async () => {
  await bootPage({'lorenz:difficulty': '"hard"'}, async (d, w) => {
    const P = w.DexmPoints; d.getElementById('play-daily').click();
    assert.equal(d.querySelector('[data-hint=qep] small').textContent, '40 pts'); assert.equal(d.querySelector('[data-hint=char] small').textContent, '10 pts');
    d.querySelector('[data-hint=qep]').click(); assert.equal(P.balance(), 110); assert.equal(d.querySelector('[data-hint=qep]').disabled, true);
    d.querySelector('[data-hint=char]').click(); d.querySelector('[data-hint=char]').click(); assert.equal(P.balance(), 90);
    assert.equal(d.getElementById('score-display').textContent, '1,000 pts');
  }, {points: true});
});
await t('Points: hard practice hints are charged against the practice round, never the daily one', async () => {
  await bootPage({'lorenz:difficulty': '"hard"'}, async (d, w) => {
    const P = w.DexmPoints; d.getElementById('play-practice').click();
    d.querySelector('[data-hint=qep]').click(); assert.equal(P.balance(), 110);
    const ref = P.entries().find(e => e.kind === 'spend').ref; assert.match(ref, /^lorenz:hard:qep:p\d+$/); assert.ok(!ref.includes(today.key));
  }, {points: true});
});
await t('Points: without the points script the game still works and hints are free', async () => {
  await bootPage({}, async d => { d.getElementById('play-daily').click(); d.querySelector('[data-hint=reveal]').click(); assert.equal(d.querySelector('[data-hint=reveal]').disabled, true); assert.equal(d.querySelector('[data-hint=check]').hasAttribute('aria-disabled'), false); });
});
await t('Points: the hint prices match the shared price list', () => {
  const w = new JSDOM('').window; new Function('window', fs.readFileSync(POINTS_JS, 'utf8'))(w);
  assert.deepEqual(w.DexmPoints.COSTS.lorenz, {check: G.RULES.hint.check, reveal: G.RULES.hint.reveal, smudge: HD.HARD_RULES.hint.smudge, qep: HD.HARD_RULES.hint.qep, char: HD.HARD_RULES.hint.char});
});

/* ---------- Visual demonstration ---------- */
const DM = await import('../js/demo.js');
const panelOf = (m, stage = 5) => { const d = new JSDOM(`<div id="p">${DM.demoHTML(m, stage, {index: 0, total: 1})}</div>`).window.document; return DM.readPanel(d.getElementById('p')); };
await t('Demo: every bit the panel shows matches lorenz.js, for both models and a few hundred characters', () => {
  for (const [seed, model] of [[11, L.MODELS.SZ40], [12, L.MODELS.SZ42A], [13, L.MODELS.SZ42A]]) {
    const setup = randomSetup(seed), m = L.createMachine({...setup, model}), rng = S.mulberry32(seed * 7), codes = Array.from({length: 150}, () => Math.floor(rng() * 32));
    const expected = L.crypt(codes, {...setup, model});
    codes.forEach((c, i) => {
      const s = m.step(), mod = DM.demoModel(c, s), shown = panelOf(mod);
      assert.deepEqual(shown.in, L.bitsOf(c)); assert.deepEqual(shown.chi, L.bitsOf(s.chi)); assert.deepEqual(shown.psi, L.bitsOf(s.psi));
      assert.deepEqual(shown.afterChi, L.bitsOf(c ^ s.chi)); assert.deepEqual(shown.afterPsi, L.bitsOf(c ^ s.key)); assert.deepEqual(shown.out, L.bitsOf(expected[i]));
      assert.equal(L.codeFromBits(shown.out), expected[i]); assert.equal(shown.outName, L.nameOf(expected[i]));
      assert.equal(/lets psi step/.test(mod.motor), s.psiMoved, 'the motor note says what the machine did');
    });
  }
});
await t('Demo: the chi only machine shows no psi, and its output matches chiCrypt', () => {
  const setup = randomSetup(21), m = L.createChiMachine(setup), codes = [...'HELLO9WORLD'].map(L.codeOf), expected = L.chiCrypt(codes, setup);
  codes.forEach((c, i) => { const shown = panelOf(DM.demoModel(c, m.step(), {chiOnly: true})); assert.deepEqual(shown.psi, [0, 0, 0, 0, 0]); assert.equal(L.codeFromBits(shown.out), expected[i]); });
});
await t('Demo: hard mode hides the output letter but keeps the bits', () => {
  const s = L.createMachine({...randomSetup(5), model: L.MODELS.SZ40}).step(), shown = panelOf(DM.demoModel(L.codeOf('Q'), s, {hideOut: true}));
  assert.equal(shown.outName, '?'); assert.deepEqual(shown.out, L.bitsOf(L.codeOf('Q') ^ s.key));
});
await t('Demo: stages reveal in order and later rows stay hidden', () => {
  const m = DM.demoModel(L.codeOf('A'), L.createMachine({...randomSetup(3), model: L.MODELS.SZ40}).step());
  for (let st = 1; st <= 5; st++) { const d = new JSDOM(DM.demoHTML(m, st)).window.document; assert.equal(d.querySelectorAll('.demo-row.on').length, st); assert.equal(d.querySelector('.demo-row.now').dataset.stage, String(st)); }
});
await t('Demo: one flag above each wheel set, in the rack order psi, motor, chi, each showing its own stage', () => {
  const m = DM.demoModel(L.codeOf('A'), L.createMachine({...randomSetup(4), model: L.MODELS.SZ42A}).step());
  for (let st = 1; st <= 5; st++) {
    const d = new JSDOM(`<div>${DM.demoHTML(m, st)}</div>`).window.document, flags = [...d.querySelectorAll('.demo-flag')];
    assert.deepEqual(flags.map(f => f.dataset.set), ['psi', 'mu', 'chi']);
    const stagesIn = set => [...d.querySelector(`[data-set=${set}]`).querySelectorAll('.demo-row')].map(r => r.dataset.stage);
    assert.deepEqual(stagesIn('chi'), ['1', '2']); assert.deepEqual(stagesIn('psi'), ['3', '4']); assert.deepEqual(stagesIn('mu'), ['5']);
    const now = d.querySelector('.demo-flag.now').dataset.set; assert.equal(now, st <= 2 ? 'chi' : st <= 4 ? 'psi' : 'mu');
    assert.equal(Boolean(d.querySelector('.demo-motor.on')), st >= 3, 'the motor speaks once psi is in play');
  }
  assert.match(new JSDOM(DM.demoHTML(m, 3)).window.document.querySelector('.demo-motor').textContent, m.psiMoved ? /steps/ : /holds/);
  const css = fs.readFileSync(path.join(ROOT, 'css/style.css'), 'utf8').split('/* light theme')[0], rules = css.match(/[^}]*\.demo-[^{]*\{[^}]*\}/g).join('');
  assert.ok(!/animation|transition/.test(rules), 'static frames: nothing in the demonstration animates'); assert.match(css, /@media\(max-width:620px\)\{\.demo-flags/);
});
await t('Demo: the whole run takes about 13 seconds whatever the length, the first three characters go slowly', () => {
  for (const n of [1, 2, 3, 4, 20, 68, 150, 400]) {
    const plan = DM.demoSchedule(n); assert.ok(Math.abs(plan.totalMs - 13000) < 1, `n=${n} total ${plan.totalMs}`);
    assert.equal(plan.k, Math.min(3, n)); if (n >= 20) assert.ok(plan.perMs > 2000 && plan.fastMs < plan.perMs / 10, 'slow then fast');
    let prev = -1; for (let t = 0; t <= 13000; t += 37) { const at = DM.demoAt(plan, t); assert.ok(at.index >= prev && at.index < n); prev = at.index; }
    assert.equal(DM.demoAt(plan, 12999.9).index, n - 1, 'last character by the end');
  }
});
await t('Demo: the speed menu offers it, and a run shows the panel, then Skip finishes the tape', async () => {
  assert.ok(/<option value="demo">Visual demonstration<\/option>/.test(html['index.html']));
  await bootPage({}, async (d, w) => {
    d.getElementById('play-daily').click(); d.getElementById('speed-select').value = 'demo';
    d.getElementById('run-button').click(); await new Promise(r => setTimeout(r, 400));
    const panel = d.getElementById('demo-overlay'), stage = d.getElementById('machine-stage'); assert.equal(panel.hidden, false); assert.ok(panel.classList.contains('demo-still'), 'static frames under reduced motion');
    assert.equal(panel.parentElement, stage, 'drawn on the machine'); assert.equal(d.getElementById('demo-panel'), null, 'the old box is gone'); assert.ok(stage.classList.contains('demo-on'));
    assert.match(panel.querySelector('.demo-head').textContent, /Character 1 of \d+Step [1-5] of 5/);
    d.getElementById('skip-button').click(); assert.ok(panel.classList.contains('demo-done')); assert.ok(!stage.classList.contains('demo-on')); assert.ok(d.getElementById('printed-text').textContent.length > 10);
  });
});

/* ---------- Hard mode reply ---------- */
const readRound = h => HD.submitAnswer(HD.newHardState(h), h.text).state;
const tapeOf = (h, text = HD.replyFor(h), start = h.start) => HD.replyTape(h, text, start);
await t('Reply: fixed for the day like the message, named after it, and fixed per practice seed', () => {
  const a = HD.makeHardRound({date: new Date('2026-10-12T00:05:00Z')}), b = HD.makeHardRound({date: new Date('2026-10-12T23:55:00Z')});
  assert.equal(HD.replyFor(a), HD.replyFor(b));
  for (const key of ['2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13']) {
    const h = HD.makeHardRound({date: new Date(key + 'T10:00:00Z')}), r = HD.replyFor(h), first = HD.canon(h.text).split('.')[0].split(' ').slice(0, 4).join(' ');
    assert.ok(r.startsWith(`YOUR ${first} RECEIVED. `), r); assert.ok(r.length < 80); assert.equal(L.encodeText(r).dropped.length, 0, 'the teleprinter can send it');
  }
  const p1 = HD.makeHardRound({mode: 'practice', seed: 99}), p2 = HD.makeHardRound({mode: 'practice', seed: 99});
  assert.equal(HD.replyFor(p1), HD.replyFor(p2));
});
await t('Reply: the right tape passes, with the same answer check as the message; wrong wheels or words fail', () => {
  for (const h of [HD.makeHardRound({}), HD.makeHardRound({mode: 'practice', seed: 7, model: L.MODELS.SZ42A})]) {
    const r = HD.replyFor(h);
    assert.ok(HD.replyReads(h, tapeOf(h))); assert.ok(HD.replyReads(h, tapeOf(h, r.toLowerCase().replace(/\./g, ' ') + '  ')), 'case, spacing and punctuation');
    assert.ok(HD.replyReads(h, tapeOf(h, r.replace('RECEIVED', 'RECEIVEX'))), 'one wrong letter in one word still counts, as with the message');
    assert.equal(HD.replyReads(h, tapeOf(h, r, {...h.start, chi1: h.start.chi1 % 41 + 1})), false, 'wrong wheel');
    assert.equal(HD.replyReads(h, tapeOf(h, h.text)), false, 'the message is not the reply');
    assert.equal(HD.replyReads(h, tapeOf(h, 'YOUR SIGNAL RECEIVED. ACKNOWLEDGED.')), false);
  }
});
await t('Reply: a hard round only finishes with the reply, scored on its own; stats wait for it', () => {
  const h = HD.makeHardRound({}), fresh = HD.newHardState(h);
  assert.equal(HD.submitReply(fresh, tapeOf(h)).result.notReady, true, 'no reply before the message is read');
  const read = readRound(h); assert.equal(read.solved, true); assert.equal(HD.hardComplete(read), false);
  assert.equal(HD.updateHardStats(null, read).rounds, 0, 'not counted yet');
  const bad = tapeOf(h, h.text); let st = HD.submitReply(read, bad).state; assert.equal(st.reply.done, false); assert.equal(st.reply.tries.length, 1);
  st = HD.submitReply(st, bad).state; assert.equal(st.reply.tries.length, 1, 'the same wrong tape twice is free');
  const {state, result} = HD.submitReply(st, tapeOf(h)); assert.equal(result.ok, true); assert.equal(HD.hardComplete(state), true);
  assert.equal(state.reply.score, HD.HARD_RULES.reply.base - HD.HARD_RULES.reply.wrong); assert.equal(state.score, read.score, 'the message score is untouched');
  const stats = HD.updateHardStats(null, state); assert.equal(stats.history[h.key].reply, 200); assert.equal(stats.replies, 1); assert.equal(stats.bestReply, 200);
  let low = read; for (let i = 0; i < 6; i++) low = HD.submitReply(low, tapeOf(h, `WRONG ${i}`)).state; assert.equal(HD.submitReply(low, tapeOf(h)).state.reply.score, HD.HARD_RULES.reply.floor);
  const b = HD.hardBreakdown(state); assert.equal(b.replyTotal, 200); assert.match(HD.hardShareText(state, 'u'), /Reply sent: 200 pts/);
  const back = HD.restoreHard(h, JSON.parse(JSON.stringify({v: HD.HARD_SAVE_VERSION, answers: state.answers, hints: [], qepGuesses: [], solved: true, reply: {tries: state.reply.tries}})));
  assert.equal(HD.hardComplete(back), true); assert.equal(back.reply.score, 200);
  const old = HD.restoreHard(h, {v: HD.HARD_SAVE_VERSION, answers: [{key: h.text, ok: true}], hints: [], qepGuesses: [], solved: true});
  assert.equal(HD.hardComplete(old), true, 'rounds read before replies existed stay finished'); assert.equal(old.reply.legacy, true);
  const half = HD.restoreHard(h, {v: HD.HARD_SAVE_VERSION, answers: [{key: h.text, ok: true}], hints: [], qepGuesses: [], solved: true, reply: {tries: [{key: '1,2', ok: false}]}});
  assert.equal(HD.hardComplete(half), false);
});
await t('Reply: in the page it finishes the round, pays 100 points once, and normal mode never shows it', async () => {
  const h = HD.makeHardRound({});
  const save = {v: HD.HARD_SAVE_VERSION, text: h.text, answers: [{key: h.text, ok: true}], hints: [], qepGuesses: [], ran: {...h.start}, solved: true, score: 1000, reply: {tries: []}, wheels: {...h.start}};
  let ledger;
  await bootPage({'lorenz:difficulty': '"hard"', [`lorenz:hard:round:${h.key}`]: save}, async (d, w) => {
    const P = w.DexmPoints; d.getElementById('play-daily').click();
    assert.equal(d.getElementById('decoded-card').hidden, true); assert.equal(d.getElementById('hard-reply').hidden, false); assert.equal(d.getElementById('reply-state').textContent, 'Not sent yet');
    const before = P.balance();
    sendReplyDOM(d, w, h, {start: {...h.start, psi1: h.start.psi1 % 43 + 1}}); assert.match(d.getElementById('feedback').textContent, /doesn't read as the reply/); assert.equal(d.getElementById('decoded-card').hidden, true);
    assert.equal(d.getElementById('reply-tape').hidden, false);
    sendReplyDOM(d, w, h); await new Promise(r => setTimeout(r, 0));
    assert.match(d.getElementById('feedback').textContent, /Reply sent!!/); assert.equal(d.getElementById('hard-reply').classList.contains('sent'), true);
    const card = d.getElementById('decoded-card'); assert.equal(card.hidden, false); assert.match(card.textContent, /Read by hand and answered/); assert.ok(card.textContent.includes(HD.replyFor(h)));
    assert.equal(d.getElementById('card-reply-total').textContent, '200 pts');
    assert.equal(P.balance(), before + 100); assert.ok(P.has(`lorenz:hard:reply:${h.key}`));
    assert.equal(JSON.parse(w.localStorage.getItem('lorenz:hard:stats')).history[h.key].reply, 200);
    ledger = w.localStorage.getItem('dexm:points');
  }, {points: true});
  await bootPage({'lorenz:difficulty': '"hard"', [`lorenz:hard:round:${h.key}`]: save, 'dexm:points': ledger}, async (d, w) => { const n = w.DexmPoints.balance(); d.getElementById('play-daily').click(); await new Promise(r => setTimeout(r, 0)); assert.equal(w.DexmPoints.balance(), n, 'not paid twice'); }, {points: true});
  await bootPage({}, async d => { d.getElementById('play-daily').click(); assert.equal(d.getElementById('hard-reply').hidden, true); assert.equal(d.getElementById('read-aid').hidden, true); assert.equal(d.getElementById('hard-out').hidden, true); });
});

/* ---------- Reading aid ---------- */
await t('Reading aid: copy a row with the holes, the cheat sheet lights up its line, shift is yours, nothing is typed for you', async () => {
  const h = HD.makeHardRound({}), out = L.crypt(h.cipherCodes, {patterns: h.patterns, start: h.start, model: h.model});
  const save = {v: HD.HARD_SAVE_VERSION, text: h.text, answers: [], hints: [], qepGuesses: [], ran: {...h.start}, solved: false, score: 0, reply: {tries: []}, wheels: {...h.start}};
  await bootPage({'lorenz:difficulty': '"hard"', [`lorenz:hard:round:${h.key}`]: save}, async d => {
    d.getElementById('play-daily').click();
    const aid = d.getElementById('read-aid'), rows = d.querySelectorAll('#cheat-body tr'); assert.equal(aid.hidden, false);
    assert.equal(d.getElementById('aid-pos').textContent, `Row 1 of ${out.length}`);
    assert.equal(d.querySelector('#out-tape .aid-current').dataset.frame, '0'); assert.equal(d.getElementById('aid-prev').disabled, true);
    const holes = [...aid.querySelectorAll('.aid-hole')]; assert.equal(holes.length, 5); assert.deepEqual(holes.map(b => b.getAttribute('aria-label')), ['Hole 1', 'Hole 2', 'Hole 3', 'Hole 4', 'Hole 5']);
    for (const i of [0, 1]) {
      const code = out[i]; L.bitsOf(code).forEach((b, k) => { if (b) holes[k].click(); });
      assert.deepEqual(holes.map(b => b.getAttribute('aria-pressed') === 'true' ? 1 : 0), L.bitsOf(code));
      assert.equal(d.querySelectorAll('#cheat-body tr.aid-match').length, 1); assert.equal(rows[code].classList.contains('aid-match'), true);
      assert.equal(rows[code].cells[1].classList.contains('aid-col'), true, 'letter column first');
      d.getElementById('aid-shift').click(); assert.equal(d.getElementById('aid-shift').getAttribute('aria-pressed'), 'true'); assert.equal(d.getElementById('aid-shift').textContent, 'Figure shift');
      assert.equal(rows[code].cells[2].classList.contains('aid-col'), true); assert.equal(rows[code].cells[1].classList.contains('aid-col'), false);
      d.getElementById('aid-shift').click(); assert.equal(rows[code].cells[1].classList.contains('aid-col'), true, 'and back, only when asked');
      assert.equal(d.getElementById('hard-answer').value, '', 'nothing typed for the player');
      d.getElementById('aid-next').click();
      assert.equal(d.querySelector('#out-tape .aid-current').dataset.frame, String(i + 1)); assert.ok(holes.every(b => b.getAttribute('aria-pressed') === 'false'), 'a fresh blank row');
      assert.ok(d.querySelector(`#out-tape [data-frame="${i}"]`).classList.contains('read'), 'the row you leave is marked read');
    }
    d.getElementById('aid-prev').click(); assert.equal(d.getElementById('aid-pos').textContent, `Row 2 of ${out.length}`);
    holes[0].click(); d.getElementById('aid-clear').click(); assert.ok(holes.every(b => b.getAttribute('aria-pressed') === 'false'));
    // the shift never moves by itself, even across a figure shift row
    const figs = out.indexOf(L.SHIFT.FIGS); if (figs > 0) { for (let i = 1; i < figs + 1; i++) d.getElementById('aid-next').click(); assert.equal(d.getElementById('aid-shift').getAttribute('aria-pressed'), 'false'); }
  });
});
await t('Reading aid and reply: 44px tap targets, paper and holes stay paper and black in light mode, nothing moves', () => {
  const css = fs.readFileSync(path.join(ROOT, 'css/style.css'), 'utf8'), base = css.split('/* light theme')[0];
  assert.match(base, /\.aid-hole\{width:44px;height:44px;min-height:44px/); assert.match(base, /\.aid-nav\{min-height:44px/); assert.match(base, /\.aid-tools button\{min-height:44px\}/);
  assert.match(css, /:root\[data-theme=light\] \.aid-hole\.on\{background:#050705/); assert.match(css, /:root\[data-theme=light\] \.aid-sprocket\{background:#050705\}/);
  const aidRules = base.match(/[^}]*\.(aid-|read-aid|hard-reply|reply-)[^{]*\{[^}]*\}/g).join('');
  assert.ok(!/animation|transition/.test(aidRules), 'no motion in the aid or the reply, so reduced motion has nothing to stop');
});

/* ---------- Setting the wheel patterns too ---------- */
const setWheels = (d, w, start) => { for (const [id, v] of Object.entries(start)) { const el = d.getElementById(`dial-${id}`); el.value = String(v); el.dispatchEvent(new w.Event('change', {bubbles: true})); } };
const copyPins = h => Object.fromEntries(Object.entries(h.patterns).map(([k, v]) => [k, v.slice()]));
const withPins = (st, grid) => ({...st, pins: {...st.pins, grid}});
await t('Pins: optional, the day\'s patterns on your own pins decode and earn the bonus; one wrong pin does not', () => {
  for (const h of [HD.makeHardRound({}), HD.makeHardRound({mode: 'practice', seed: 31, model: L.MODELS.SZ42A})]) {
    let st = HD.newHardState(h); assert.equal(st.pins.on, false); assert.equal(HD.runPatterns(st), h.patterns, 'off: the day\'s patterns');
    assert.equal(HD.pinsMatch(h, st.pins.grid), false, 'every pin starts down');
    st = HD.setPinsOn(st, true); assert.equal(HD.runPatterns(st), st.pins.grid);
    st = HD.togglePin(st, 'chi1', 0); assert.equal(st.pins.grid.chi1[0], 1); st = HD.togglePin(st, 'chi1', 0); assert.equal(st.pins.grid.chi1[0], 0);
    assert.equal(HD.togglePin(st, 'chi1', 99), st); assert.equal(HD.togglePin(st, 'nope', 0), st);
    const run = s2 => L.decodeText(L.crypt(h.cipherCodes, {patterns: HD.runPatterns(s2), start: h.start, model: h.model}));
    const right = withPins(st, copyPins(h)); assert.ok(HD.pinsMatch(h, right.pins.grid)); assert.ok(HD.matchAnswer(run(right), [h.text]).ok, 'the right pins decode');
    const off = copyPins(h); off.mu37[3] ^= 1; const one = withPins(st, off); assert.equal(HD.pinsMatch(h, off), false);
    const offAt0 = copyPins(h); offAt0.chi1[(h.start.chi1 - 1)] ^= 1; assert.equal(HD.matchAnswer(run(withPins(st, offAt0)), [h.text]).ok, false, 'a wrong pin garbles the message');
    assert.equal(HD.notePinRun(one).pins.ranRight, false);
    const ran = HD.notePinRun(right); assert.equal(ran.pins.ranRight, true);
    const plain = HD.submitAnswer(HD.newHardState(h), h.text).state, solved = HD.submitAnswer(ran, h.text).state;
    assert.equal(solved.pins.earned, true); assert.equal(solved.score, plain.score + HD.HARD_RULES.pins);
    assert.ok(HD.hardBreakdown(solved).lines.some(([k, v]) => k === 'Set the wheel patterns too' && v === '+250'));
    assert.equal(HD.setPinsOn(solved, false), solved, 'locked once read'); assert.equal(HD.togglePin(solved, 'chi1', 0), solved);
    // switching back to the day's patterns before reading loses the bonus, even if the pins were right
    const sneaky = HD.submitAnswer(HD.notePinRun(HD.setPinsOn(right, false)), h.text).state; assert.equal(sneaky.pins.earned, false); assert.equal(sneaky.score, plain.score);
    const changed = HD.submitAnswer(HD.togglePin(ran, 'psi1', 0), h.text).state; assert.equal(changed.pins.earned, false, 'a pin changed after the run');
    const back = HD.restoreHard(h, JSON.parse(JSON.stringify({v: HD.HARD_SAVE_VERSION, answers: solved.answers, hints: [], qepGuesses: [], solved: true, reply: {tries: []}, pins: HD.savePins(solved.pins)})));
    assert.equal(back.pins.earned, true); assert.equal(back.score, solved.score); assert.ok(HD.pinsMatch(h, back.pins.grid));
    const junk = HD.restoreHard(h, {v: HD.HARD_SAVE_VERSION, answers: [], hints: [], qepGuesses: [], pins: {on: true, earned: true, grid: {chi1: 'zz'}}});
    assert.equal(junk.pins.earned, false, 'no bonus without a read'); assert.equal(junk.pins.grid.chi1.length, 41);
  }
});
await t('Pins: the pattern sheet sits by the QEP book in hard mode only, the grid sets pins, and the machine runs on them', async () => {
  const h = HD.makeHardRound({}), key = `lorenz:hard:round:${h.key}`;
  await bootPage({}, async d => { d.getElementById('play-daily').click(); assert.equal(d.getElementById('pin-sheet').hidden, true, 'not in normal mode'); });
  await bootPage({'lorenz:difficulty': '"hard"'}, async (d, w) => {
    d.getElementById('play-daily').click();
    const sheet = d.getElementById('pin-sheet'); assert.equal(sheet.hidden, false); assert.equal(sheet.previousElementSibling.classList.contains('qep-book'), true, 'next to the QEP book');
    assert.equal(d.getElementById('pin-work').hidden, true, 'off until you choose it');
    const box = d.getElementById('pins-on'); box.checked = true; box.dispatchEvent(new w.Event('change', {bubbles: true}));
    assert.equal(d.getElementById('pin-work').hidden, false);
    const rows = [...d.querySelectorAll('#pin-sheet-body tr')]; assert.equal(rows.length, 12);
    const chi1Row = rows.find(r => r.querySelector('th').textContent === L.WHEEL.chi1.label); assert.equal(chi1Row.querySelector('td').textContent.replace(/ /g, ''), h.patterns.chi1.map(b => b ? 'x' : '.').join(''));
    d.querySelector('#pin-wheels [data-wheel=chi2]').click(); assert.equal(d.querySelectorAll('#pin-grid .pin').length, L.WHEEL.chi2.size);
    const pin = d.querySelector('#pin-grid [data-pin="4"]'); pin.click();
    const again = d.querySelector('#pin-grid [data-pin="4"]'); assert.equal(again.getAttribute('aria-pressed'), 'true'); assert.ok(again.classList.contains('up'));
    const saved = JSON.parse(w.localStorage.getItem(key)); assert.equal(saved.pins.on, true); assert.equal(saved.pins.grid.chi2[4], '1');
    d.getElementById('pin-clear').click(); assert.equal(JSON.parse(w.localStorage.getItem(key)).pins.grid.chi2, '0'.repeat(L.WHEEL.chi2.size));
    // run on blank pins: the tape is not the message's tape
    setWheels(d, w, h.start); d.getElementById('run-button').click(); d.getElementById('skip-button').click();
    const want = L.crypt(h.cipherCodes, {patterns: h.patterns, start: h.start, model: h.model}), got = [...d.querySelectorAll('#out-tape button.frame')].map(f => L.codeFromBits([...f.querySelectorAll('i.h')].map(i => i.classList.contains('on') ? 1 : 0)));
    assert.equal(got.length, want.length); assert.notDeepEqual(got, want);
  });
  // with every pin copied right, the run punches the true tape, and reading it pays the bonus on the card
  const save = {v: HD.HARD_SAVE_VERSION, text: h.text, answers: [], hints: [], qepGuesses: [], ran: null, solved: false, score: 0, reply: {tries: []}, wheels: {...h.start}, pins: HD.savePins({on: true, grid: copyPins(h), ranRight: false, earned: false})};
  await bootPage({'lorenz:difficulty': '"hard"', [key]: save}, async (d, w) => {
    d.getElementById('play-daily').click(); setWheels(d, w, h.start); d.getElementById('run-button').click(); d.getElementById('skip-button').click();
    const want = L.crypt(h.cipherCodes, {patterns: h.patterns, start: h.start, model: h.model}), got = [...d.querySelectorAll('#out-tape button.frame')].map(f => L.codeFromBits([...f.querySelectorAll('i.h')].map(i => i.classList.contains('on') ? 1 : 0)));
    assert.deepEqual(got, want);
    d.getElementById('hard-answer').value = h.text; d.getElementById('hard-answer-go').click();
    assert.equal(d.getElementById('pins-on').disabled, true); assert.match(d.getElementById('pin-state').textContent, /\+250/);
    sendReplyDOM(d, w, h); await new Promise(r => setTimeout(r, 0));
    assert.match(d.getElementById('decoded-card').textContent, /Set the wheel patterns too\+250/);
  });
  const css = fs.readFileSync(path.join(ROOT, 'css/style.css'), 'utf8'); assert.match(css, /\.pin\{min-height:44px;min-width:44px/); assert.match(css, /\.pin-wheels button\{min-height:44px\}/); assert.match(css, /\.pin-toggle\{[^}]*min-height:44px/);
});

for (const r of results) console.log(`${r.pass ? 'PASS' : 'FAIL'} ${r.name}${r.error ? '\n  ' + r.error : ''}`);
console.log(`${results.filter(r => r.pass).length}/${results.length} passed`);
process.exitCode = results.every(r => r.pass) ? 0 : 1;
