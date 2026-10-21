/* Say It Slowly tests: puzzle data, the daily pick, answer matching, streaks, the share line and the page. Run: node say-it-slowly/tests/run.mjs */
import assert from 'assert/strict';
import fs from 'fs';
import crypto from 'crypto';
const {PUZZLES} = await import('../js/puzzles.mjs'), {ART} = await import('../js/art.mjs'), C = await import('../js/core.mjs');
const ROOT = new URL('..', import.meta.url).pathname;
let pass = 0, fail = 0;
async function t(name, fn) { try { await fn(); pass++; console.log('PASS ' + name); } catch (e) { fail++; console.log('FAIL ' + name + '\n  ' + String(e.message).split('\n')[0]); } }
const CLEAN = /[\u2013\u2014]| - |\bAI\b|7851|\+44|\bF1\b|gumroad/i;

await t('Puzzles: at least 30, unique ids and answers, every picture drawable and named', () => {
  assert.ok(PUZZLES.length >= 30, 'count ' + PUZZLES.length);
  const ids = new Set(), ans = new Set();
  for (const p of PUZZLES) {
    assert.ok(/^[a-z-]+$/.test(p.id) && !ids.has(p.id), 'id ' + p.id); ids.add(p.id);
    assert.ok(p.pics.length >= 2 && p.pics.length <= 5, p.id + ' 2 to 5 pictures');
    for (const q of p.pics) {
      assert.ok(q.say && /^[a-z ]+$/.test(q.say), p.id + ' picture has a spoken name');
      assert.ok(!!q.e !== !!q.svg, p.id + ' emoji or drawing, not both');
      if (q.svg) assert.ok(ART[q.svg] && /^<svg[^>]*role="img"[^>]*aria-label="/.test(ART[q.svg]) && !/<script|on\w+=|href/i.test(ART[q.svg]), p.id + ' drawing is plain, labelled SVG');
    }
    assert.ok(p.answers.length >= 1 && p.answers.every(a => C.norm(a).length >= 3), p.id + ' answers');
    const k = C.norm(p.answers[0]); assert.ok(!ans.has(k), 'duplicate answer ' + k); ans.add(k);
    assert.ok(p.hint && p.hint.length > 8 && !p.answers.some(a => p.hint.toLowerCase().includes(a.toLowerCase())), p.id + ' hint without the answer');
    assert.ok(!CLEAN.test(p.hint), p.id + ' copy rules');
  }
});
await t('Puzzles: the spoken names really build the answer (letters of the sounds stay close to the spelling)', () => {
  // A loose check that catches typos: most letters of the answer appear in the said pictures.
  for (const p of PUZZLES) {
    const said = p.pics.map(q => q.say).join(''), a = C.norm(p.answers[0]);
    const hit = [...a].filter(ch => said.includes(ch)).length / a.length;
    assert.ok(hit >= 0.6, `${p.id}: ${said} vs ${a} (${hit.toFixed(2)})`);
  }
});
await t('Daily pick: deterministic, by UK date, every puzzle once per cycle', () => {
  assert.equal(C.pick(PUZZLES, '2026-10-21').number, 1);
  assert.deepEqual(C.pick(PUZZLES, '2026-11-05'), C.pick(PUZZLES, '2026-11-05'));
  const n = PUZZLES.length, seen = new Set();
  for (let i = 0; i < n; i++) seen.add(C.pick(PUZZLES, C.addDays('2026-10-21', i)).puzzle.id);
  assert.equal(seen.size, n, 'one full cycle shows every puzzle');
  assert.equal(C.pick(PUZZLES, C.addDays('2026-10-21', n)).puzzle.id, C.pick(PUZZLES, '2026-10-21').puzzle.id, 'then it repeats');
  for (let i = 0; i < 400; i++) assert.notEqual(C.pick(PUZZLES, C.addDays('2026-10-21', i)).puzzle.id, C.pick(PUZZLES, C.addDays('2026-10-21', i + 1)).puzzle.id);
  assert.ok(C.pick(PUZZLES, '2026-10-01').puzzle, 'dates before the start still pick');
  assert.deepEqual(C.order(n), C.order(n), 'fixed shuffle');
  // UK date: 23:30 UTC in summer time is already the next day in London; in winter it is not.
  assert.equal(C.ukDate(new Date('2026-10-21T23:30:00Z')), '2026-10-22');
  assert.equal(C.ukDate(new Date('2026-12-21T23:30:00Z')), '2026-12-21');
  assert.equal(C.ukDate(new Date('2027-03-28T00:30:00Z')), '2027-03-28');
  assert.equal(C.dayNumber('2027-03-29') - C.dayNumber('2027-03-27'), 2, 'clock change does not skip a day');
});
await t('Answer matching: forgiving about case, spaces, punctuation and accents, strict about the word', () => {
  const ice = PUZZLES.find(p => p.id === 'ice-cream'), cat = PUZZLES.find(p => p.id === 'catalogue');
  for (const g of ['ice cream', 'ICE CREAM', ' Ice-Cream! ', 'icecream', "ice  'cream'"]) assert.ok(C.isRight(ice, g), g);
  for (const g of ['ice', 'eye scream', '', '   ', 'ice creams']) assert.ok(!C.isRight(ice, g), 'wrong: ' + g);
  assert.ok(C.isRight(cat, 'Catalog') && C.isRight(cat, 'CATALOGUE.'));
  assert.equal(C.norm('Café Crème'), 'cafecreme');
  for (const p of PUZZLES) for (const a of p.answers) assert.ok(C.isRight(p, a.toUpperCase() + '.'), p.id);
});
await t('Streaks and stats: wins on following days grow it, a gap or a loss resets it, a day only counts once', () => {
  let s = C.newStats();
  s = C.record(s, '2026-10-21', true, 1, false);
  s = C.record(s, '2026-10-22', true, 3, true);
  s = C.record(s, '2026-10-22', false, 5, true);
  assert.deepEqual([s.played, s.won, s.streak, s.best], [2, 2, 2, 2]);
  assert.deepEqual(s.dist, [1, 0, 1, 0, 0]);
  assert.equal(C.liveStreak(s, '2026-10-23'), 2, 'alive the next day');
  assert.equal(C.liveStreak(s, '2026-10-24'), 0, 'gone after a missed day');
  s = C.record(s, '2026-10-23', false, 5, true);
  assert.deepEqual([s.played, s.won, s.streak, s.best], [3, 2, 0, 2]);
  s = C.record(s, '2026-10-24', true, 2, false); s = C.record(s, '2026-10-26', true, 2, false);
  assert.deepEqual([s.streak, s.best, s.dist[1]], [1, 2, 2], 'gap restarts at one');
  s = C.record(s, '2026-10-31', true, 1, false);
  s = C.record(s, '2026-11-01', true, 1, false);
  assert.equal(s.streak, 2, 'across the October clock change');
  assert.equal(C.liveStreak(null, '2026-10-21'), 0);
  const before = JSON.stringify(s); C.record(s, '2026-11-02', true, 1, false); assert.equal(JSON.stringify(s), before, 'record does not change its input');
});
await t('Share line: squares and count, no answer, no picture names', () => {
  const p = PUZZLES[0];
  assert.equal(C.shareText(4, ['a', 'b', p.answers[0]], true, true), 'Say It Slowly #4 3/5 💡\n🟥🟥🟩⬜⬜\nhttps://dexmlabs.app/say-it-slowly/');
  assert.equal(C.shareText(9, ['a', 'b', 'c', 'd', 'e'], false, true).split('\n')[0], 'Say It Slowly #9 X/5 💡');
  assert.equal(C.shareText(1, ['x'], true, false).split('\n')[1], '🟩⬜⬜⬜⬜');
  for (const q of PUZZLES) { const s = C.shareText(1, [q.answers[0]], true, false); assert.ok(!s.toLowerCase().includes(C.norm(q.answers[0])) && !q.pics.some(x => x.e && s.includes(x.e)), q.id); }
});
await t('Page: CSP hash, analytics, BMC on the end screen, details sections, copy rules', () => {
  const html = fs.readFileSync(ROOT + 'index.html', 'utf8');
  const csp = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
  const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  assert.equal(inline.length, 1, 'only the theme script is inline');
  assert.ok(csp.includes("'sha256-" + crypto.createHash('sha256').update(inline[0]).digest('base64') + "'"), 'theme hash in CSP');
  assert.ok(!/script-src[^;]*'unsafe-inline'/.test(csp) && csp.includes("object-src 'none'"));
  assert.ok(html.includes('static.cloudflareinsights.com/beacon.min.js'), 'analytics');
  const end = html.slice(html.indexOf('id="sis-end"'), html.indexOf('</section>', html.indexOf('id="sis-end"')));
  assert.ok(end.includes('href="https://buymeacoffee.com/arthurdeusexmachina"') && end.includes('id="sis-copy"') && end.includes('id="sis-webshare"'));
  for (const s of ['How to play', 'About rebus puzzles', 'FAQ']) assert.ok(html.includes(`<summary>${s}</summary>`), s);
  assert.ok(html.includes('data-homebar') && html.includes('rel="canonical" href="https://dexmlabs.app/say-it-slowly/"'));
  const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>/g, ' ');
  assert.ok(!CLEAN.test(text), 'copy rules: ' + (text.match(CLEAN) || [])[0]);
  for (const f of ['css/style.css', 'img/bmc-button.png', 'img/og.png', '../assets/say-it-slowly-thumb.webp']) assert.ok(fs.existsSync(ROOT + f), f);
});
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
