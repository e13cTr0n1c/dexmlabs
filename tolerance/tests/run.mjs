/* Tolerance tests: every formula against a hand worked case, the generator, the daily seed, judging, share and stats. */
import assert from 'assert/strict';
import fs from 'fs';
const M = await import('../js/mech.js'), D = await import('../js/draw.js');
const ROOT = new URL('..', import.meta.url).pathname;
let pass = 0, fail = 0;
async function t(name, fn) { try { await fn(); pass++; console.log('PASS ' + name); } catch (e) { fail++; console.log('FAIL ' + name + '\n  ' + String(e.message).split('\n')[0]); } }
const near = (a, b, m) => assert.ok(Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(b)), `${m}: ${a} vs ${b}`);
const T = M.TYPES;

await t('Formulas: each type against a worked example', () => {
  near(T.gears.solve({rpm: 1200, a: 20, b: 60, c: 15, d: 45}), 1200 / 3 / 3, 'gear train 1200 × 1/3 × 1/3');
  near(T.lever.solve({effort: 100, a: 1.5, b: 0.3}), 500, 'lever 100 × 1.5 / 0.3');
  near(T.pulley.solve({kg: 120, ropes: 4}), 120 * 9.81 / 4, 'pulley 1177.2 / 4');
  near(T.belt.solve({rpm: 1440, d1: 100, d2: 400}), 360, 'belt 1440 × 100 / 400');
  near(T.jack.solve({effort: 40, r: 250, pitch: 5}), 40 * 2 * Math.PI * 250 / 5, 'screw jack');
  assert.ok(Math.abs(T.jack.solve({effort: 40, r: 250, pitch: 5}) - 12566.37) < 0.01);
  near(T.axle.solve({effort: 60, R: 450, r: 75}), 360, 'wheel and axle 60 × 6');
  assert.ok(Math.abs(T.rack.solve({teeth: 20, module: 2, turns: 1.5}) - 188.4956) < 1e-3, 'rack: 1.5 × π × 40 mm');
  near(T.slope.solve({kg: 100, L: 5, h: 1}), 196.2, 'slope 981 × 1/5');
  near(T.worm.solve({rpm: 1440, starts: 2, teeth: 40}), 72, 'worm 1440 × 2 / 40');
  near(T.hydraulic.solve({effort: 200, d1: 20, d2: 100}), 5000, 'hydraulic 200 × 25');
  near(T.chain.solve({a: 17, b: 51}), 3, 'chain 51 / 17');
});
await t('Formulas: physics checks that hold whatever the values (work in = work out, moments, no slip)', () => {
  for (let s = 0; s < 300; s++) {
    const p = M.makePuzzle({seed: s}), v = p.v;
    if (p.type === 'lever') near(p.answer * v.b, v.effort * v.a, 'moments');
    if (p.type === 'axle') near(p.answer * v.r, v.effort * v.R, 'moments');
    if (p.type === 'jack') near(p.answer * v.pitch, v.effort * 2 * Math.PI * v.r, 'work');
    if (p.type === 'slope') near(p.answer * v.L, v.kg * M.G * v.h, 'work');
    if (p.type === 'pulley') near(p.answer * v.ropes, v.kg * M.G, 'equal rope tensions');
    if (p.type === 'belt') near(p.answer * v.d2, v.rpm * v.d1, 'belt speed');
    if (p.type === 'chain') near(p.answer * v.a, v.b, 'teeth per second');
    if (p.type === 'hydraulic') near(p.answer / (Math.PI * v.d2 ** 2 / 4), v.effort / (Math.PI * v.d1 ** 2 / 4), 'same pressure');
    if (p.type === 'worm') near(p.answer * v.teeth, v.rpm * v.starts, 'teeth per minute');
    if (p.type === 'rack') near(p.answer, v.turns * Math.PI * v.module * v.teeth, 'rolled length');
    if (p.type === 'gears') near(p.answer * v.b * v.d, v.rpm * v.a * v.c, 'pitch line speed');
  }
});
await t('Generator: at least 8 types, all reached, sensible values, working that ends on the answer', () => {
  assert.ok(M.TYPE_IDS.length >= 8);
  const seen = new Set();
  for (let s = 0; s < 2000; s++) {
    const p = M.makePuzzle({seed: s}); seen.add(p.type);
    assert.ok(Number.isFinite(p.answer) && p.answer > 0, p.type);
    assert.ok(Object.values(p.v).every(x => Number.isFinite(x) && x > 0), p.type);
    if (p.type === 'slope') assert.ok(p.v.h < p.v.L, 'height under slope length');
    if (p.type === 'belt') assert.notEqual(p.v.d1, p.v.d2);
    if (p.type === 'lever' || p.type === 'axle' || p.type === 'jack' || p.type === 'hydraulic') assert.ok(p.answer > p.v.effort, 'a machine that gives a mechanical advantage');
    assert.ok(p.steps.length >= 3 && p.steps.every(x => typeof x === 'string' && x.length > 10));
    const last = p.steps.at(-1).replace(/,/g, '').replace(/ : 1\.$/, '.'), nums = last.match(/\d[\d.]*\d|\d/g).map(Number), shown = nums.at(-1);
    assert.ok(Math.abs(shown - p.answer) <= 0.006 * p.answer + 0.06, `${p.type}: working ends on ${shown}, answer ${p.answer}`);
  }
  assert.deepEqual([...seen].sort(), [...M.TYPE_IDS].sort());
});
await t('Daily: seeded by the London date, rolls over at London midnight in summer and winter, same for everyone', () => {
  assert.equal(M.londonKey(new Date('2026-10-13T22:59:59Z')), '2026-10-13');
  assert.equal(M.londonKey(new Date('2026-10-13T23:00:00Z')), '2026-10-14', 'BST: midnight in London is 23:00 UTC');
  assert.equal(M.londonKey(new Date('2026-12-01T23:59:59Z')), '2026-12-01');
  assert.equal(M.londonKey(new Date('2026-12-02T00:00:00Z')), '2026-12-02', 'GMT');
  assert.deepEqual(M.makePuzzle({key: '2026-11-02'}), M.makePuzzle({key: '2026-11-02'}));
  assert.notDeepEqual(M.makePuzzle({key: '2026-11-02'}).v, M.makePuzzle({key: '2026-11-03'}).v);
  assert.equal(M.makePuzzle({key: M.LAUNCH}).number, 1); assert.equal(M.makePuzzle({key: '2026-10-14'}).number, 2);
  const days = Array.from({length: M.TYPE_IDS.length}, (_, i) => M.makePuzzle({key: new Date(Date.UTC(2026, 9, 13 + i)).toISOString().slice(0, 10)}).type);
  assert.equal(new Set(days).size, M.TYPE_IDS.length, 'every type once before any repeats');
  assert.equal(M.makePuzzle({seed: 5}).practice, true);
});
await t('Judging: within 5% wins, otherwise higher or lower, six guesses at most', () => {
  assert.equal(M.judge(100, 95), 'win'); assert.equal(M.judge(100, 105), 'win'); assert.equal(M.judge(100, 94.9), 'higher'); assert.equal(M.judge(100, 105.1), 'lower');
  assert.equal(M.judge(100, 0), null); assert.equal(M.judge(100, NaN), null);
  let s = M.newState(M.makePuzzle({seed: 1})); for (let i = 0; i < 8; i++) s = M.play(s, s.puzzle.answer * 3);
  assert.equal(s.guesses.length, 6); assert.equal(s.done, true); assert.equal(s.won, false);
  let w = M.play(M.newState(M.makePuzzle({seed: 1})), M.makePuzzle({seed: 1}).answer); assert.equal(w.won, true); assert.equal(M.play(w, 1), w);
});
await t('Share: a grid with no numbers, units or mechanism names', () => {
  const p = M.makePuzzle({key: '2026-10-20'}); let s = M.newState(p);
  for (const f of [0.5, 2, 1]) s = M.play(s, p.answer * f);
  const txt = M.shareText(s);
  assert.match(txt, /^Tolerance #8 3\/6\n⬆️⬇️🟩\n/);
  assert.ok(!txt.includes(p.unit) && !txt.toLowerCase().includes(p.name.toLowerCase()) && !txt.includes(String(Math.round(p.answer))));
});
await t('Stats: played, won, current streak, best streak', () => {
  const k = d => M.londonKey(new Date(Date.now() - d * 864e5));
  const s = M.statsFrom({[k(4)]: 2, [k(3)]: 0, [k(2)]: 4, [k(1)]: 1, [k(0)]: 6});
  assert.deepEqual([s.played, s.won, s.streak, s.best], [5, 4, 3, 3]); assert.deepEqual(s.dist, [1, 1, 0, 1, 0, 1]);
  assert.equal(M.statsFrom({[k(5)]: 3}).streak, 0, 'a gap ends the streak');
});
await t('Drawings: every type draws, with a label and its numbers', () => {
  for (const id of M.TYPE_IDS) {
    let p; for (let s = 0; !p || p.type !== id; s++) p = M.makePuzzle({seed: s});
    const svg = D.drawing(p); assert.match(svg, /^<svg[^>]+role="img"[^>]+aria-label="[^"]+"/); assert.ok(!/NaN|undefined/.test(svg), id);
  }
});
await t('Page: meta, OG image, CSP, Cloudflare snippet, BMC, feedback, points, no dashes or AI in the copy', () => {
  const html = fs.readFileSync(ROOT + 'index.html', 'utf8');
  for (const re of [/<meta name="description"/, /og:image" content="https:\/\/dexmlabs\.app\/tolerance\/img\/og\.png"/, /Content-Security-Policy/, /static\.cloudflareinsights\.com\/beacon\.min\.js/, /buymeacoffee\.com/, /mailto:hello@dexmlabs\.app\?subject=Tolerance%20feedback/, /assets\/points\.js/, /dexm-theme/, /lang="en-GB"/])
    assert.match(html, re);
  assert.ok(fs.existsSync(ROOT + 'img/og.png'));
  const copy = html.replace(/<[^>]+>/g, ' ') + Object.values(M.TYPES).map(x => x.name + x.asks).join(' ') + fs.readFileSync(ROOT + 'js/main.js', 'utf8').match(/'[^'\n]*'|`[^`\n]*`/g).join(' ');
  assert.ok(!/[\u2013\u2014]|\s-\s/.test(copy), 'no dashes'); assert.ok(!/\bA\.?I\b|artificial intelligence|\bLLM\b/.test(copy), 'no AI');
  assert.ok(!/I'm an engineer|as an engineer|engineer by profession, I/i.test(copy));
  const css = fs.readFileSync(ROOT + 'css/style.css', 'utf8');
  assert.match(css, /:root\[data-theme=light\]/); assert.match(css, /prefers-reduced-motion/); assert.match(css, /button\{min-height:44px/);
});
console.log(`${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0);
