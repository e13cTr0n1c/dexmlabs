import assert from 'assert/strict';
import fs from 'fs';
const F = await import('../js/flight.js'), G = await import('../js/game.js');
let pass = 0, fail = 0; const t = async (n, f) => { try { await f(); pass++; console.log('PASS ' + n); } catch (e) { fail++; console.log('FAIL ' + n + '\n  ' + e.message); } };
const near = (a, b, tol, m) => assert.ok(Math.abs(a - b) <= tol, `${m}: ${a} vs ${b}`);
const BIG = {n1: 9, p1: 400, e2: 'keroVac', n2: 1, p2: 100, turn: 150};
await t('Rocket equation: delta v = Isp g0 ln(m0/m1) for each stage', () => {
  const d = {...BIG, payload: 10}, [a, b] = F.stages(d), top = b.prop + b.dry + 10000;
  near(F.deltaV(d), 311 * F.G0 * Math.log((top + a.prop + a.dry) / (top + a.dry)) + 348 * F.G0 * Math.log(top / (top - b.prop)), 1e-6, 'dv');
});
await t('Orbit maths: a circular orbit at 200 km has equal low and high points', () => { const r = F.R + 200e3, o = F.orbitOf({x: 0, y: r, vx: Math.sqrt(F.MU / r), vy: 0}); near(o.peri, 200e3, 1, 'peri'); near(o.apo, 200e3, 1, 'apo'); });
await t('Air density halves every 5.9 km, e every 8.5 km', () => near(F.rho(8500) / F.rho(0), Math.exp(-1), 1e-12, 'rho'));
await t('Too heavy never leaves the pad, too little fuel falls back', () => { assert.equal(F.fly({...BIG, n1: 1, payload: 10}).why, 'pad'); assert.equal(F.fly({...BIG, p1: 100, p2: 10, payload: 10}).ok, false); });
await t('A Falcon 9 sized rocket reaches orbit with every daily payload', () => { for (let pl = 2; pl <= 18; pl++) assert.ok(F.fly({...BIG, payload: pl}).ok, String(pl)); });
await t('Daily: same mission for everyone, score is payload fraction, share grid', () => {
  const d = G.makeMission({key: '2026-10-20'}); assert.deepEqual(d, G.makeMission({key: '2026-10-20'}));
  const x = {...d, ...BIG}, r = F.fly(x, {trace: true}); assert.equal(G.score(x, r), Math.round(d.payload * 1000 / F.liftoffMass(x) * 10000));
  assert.match(G.shareText(x, r, '#7'), /^Rocket launch #7 \d+ t to orbit, score \d+\n(🟩|🟨|🟥){5}\n/u);
});
await t('Page: SEO and copy', () => {
  const h = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  for (const re of [/<title>Rocket Launch Game/, /<h1[^>]*>Rocket Launch Game/, /"@type": "VideoGame"/, /"@type": "FAQPage"/, /og:image/, /\.\.\/apollo-lunar-landing-game\//, /\.\.\/orbit\//]) assert.match(h, re);
  const text = h.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' '); assert.ok(!/[\u2013\u2014]|\s-\s/.test(text)); assert.ok(!/\bA\.?I\b/.test(text));
});
console.log(`${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0);
