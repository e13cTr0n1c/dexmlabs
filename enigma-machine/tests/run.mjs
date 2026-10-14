import assert from 'assert/strict';
import fs from 'fs';
const E = await import('../js/enigma.js'), D = await import('../js/daily.js');
let pass = 0, fail = 0;
const t = async (n, f) => { try { await f(); pass++; console.log('PASS ' + n); } catch (e) { fail++; console.log('FAIL ' + n + '\n  ' + e.message); } };
await t('Known vector: I II III, rings AAA, start AAA, AAAAAAAAAA gives BDZGOWCXLT', () => assert.equal(E.crypt({}, 'AAAAAAAAAA'), 'BDZGOWCXLT'));
await t('Known vector: rings BBB, AAAAA gives EWTYX', () => assert.equal(E.crypt({rings: 'BBB'}, 'AAAAA'), 'EWTYX'));
await t('Double step: ADU, ADV, AEW, BFX', () => { const m = E.createMachine({positions: 'ADU'}), seen = []; for (let i = 0; i < 3; i++) { m.press('A'); seen.push(m.positions); } assert.deepEqual(seen, ['ADV', 'AEW', 'BFX']); });
await t('Notches: each rotor turns its left neighbour at the right letter', () => { for (const [n, q] of [['I', 'Q'], ['II', 'E'], ['III', 'V'], ['IV', 'J'], ['V', 'Z']]) { const m = E.createMachine({rotors: ['I', 'I', n].map((x, i) => i < 2 ? ['II', 'III'][i] : x), positions: 'AA' + q}); m.press('A'); assert.equal(m.positions, 'ABA'.slice(0, 2) + E.A[(E.A.indexOf(q) + 1) % 26], n); } });
await t('Known vector: I II III, reflector B, AAA, HELLOWORLD gives ILBDAAMTAZ', () => assert.equal(E.crypt({}, 'HELLOWORLD'), 'ILBDAAMTAZ'));
await t('Reciprocal and never a letter to itself, with plugs, all rotors', () => {
  for (const rotors of [['I', 'II', 'III'], ['IV', 'V', 'I'], ['V', 'III', 'II']]) { const s = {rotors, rings: 'QWE', positions: 'RTZ', plugs: 'AB CD EF GH IJ KL MN OP QR ST'}, p = 'THEQUICKBROWNFOXJUMPSOVERTHELAZYDOG'.repeat(4), c = E.crypt(s, p);
    assert.equal(E.crypt(s, c), p); [...p].forEach((x, i) => assert.notEqual(c[i], x)); }
});
await t('Plugboard rejects a letter used twice', () => assert.throws(() => E.parsePlugs('AB AC')));
await t('Daily: London rollover, same puzzle for everyone, cipher decrypts with the full key', () => {
  assert.equal(D.londonKey(new Date('2026-10-14T22:59:00Z')), '2026-10-14'); assert.equal(D.londonKey(new Date('2026-10-14T23:00:00Z')), '2026-10-15');
  const p = D.makePuzzle({key: '2026-10-20'}); assert.deepEqual(p, D.makePuzzle({key: '2026-10-20'})); assert.equal(p.number, 7);
  assert.equal(E.crypt(p.settings, p.cipher), D.plainOf(p.message)); assert.equal(p.sheetPlugs.split(' ').length, 9); assert.ok(!p.sheetPlugs.includes(p.smudged));
  assert.notEqual(E.crypt({...p.settings, plugs: p.sheetPlugs}, p.cipher), D.plainOf(p.message), 'the smudged cable matters');
});
await t('Game: word by word tries, six at most, share grid without spoilers, streak', () => {
  const p = D.makePuzzle({seed: 3}); let s = D.newState(p);
  s = D.play(s, 'NOTHING HERE'); assert.equal(s.tries.length, 1); assert.equal(s.won, false);
  s = D.play(s, D.plainOf(p.message)); assert.equal(s.won, true); assert.equal(s.done, true);
  const share = D.shareText(s); assert.match(share, /^Enigma practice 2\/6\n(⬛)+\n(🟩)+\n/u); assert.ok(!p.message.split(' ').some(w => w.length > 3 && share.includes(w)));
  const k = d => D.londonKey(new Date(Date.now() - d * 864e5)); assert.deepEqual(D.streak({[k(2)]: true, [k(1)]: true, [k(0)]: true}), {played: 3, won: 3, streak: 3, best: 3});
});
await t('Page: SEO and house rules', () => {
  const h = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  for (const re of [/<title>Enigma Machine Simulator/, /<h1[^>]*>Enigma Machine Simulator/, /name="description"/, /"@type":\s*"VideoGame"/, /"@type":\s*"FAQPage"/, /og:image/, /rel="canonical" href="https:\/\/dexmlabs\.app\/enigma-machine\/"/, /\.\.\/lorenz\//, /not affiliated with/i, /cloudflareinsights/, /data-stl/])
    assert.match(h, re);
  const text = h.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ');
  assert.ok(!/[\u2013\u2014]|\s-\s/.test(text), 'no dashes'); assert.ok(!/\bA\.?I\b|artificial intelligence/.test(text));
});
console.log(`${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0);
