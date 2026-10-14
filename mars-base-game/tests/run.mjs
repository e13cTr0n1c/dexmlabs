import assert from 'assert/strict';
import fs from 'fs';
const B = await import('../js/base.js'), G = await import('../js/game.js');
let pass = 0, fail = 0; const t = async (n, f) => { try { await f(); pass++; console.log('PASS ' + n); } catch (e) { fail++; console.log('FAIL ' + n + '\n  ' + e.message); } };
const near = (a, b, tol, m) => assert.ok(Math.abs(a - b) <= tol, `${m}: ${a} vs ${b}`);
const PLAN = ['o2', 'solar', 'green', 'solar', 'green', 'battery', 'solar', 'o2'];
const play = (d, plan) => { let b = B.newBase(); while (!b.done) b = B.act(b, plan[b.sol - 1] || 'research', d.tau[b.sol - 1]); return b; };
await t('Crew needs: 0.84 kg of oxygen per person per day, four crew', () => near(B.CREW.o2 / 4, 0.84, 0.01, 'o2'));
await t('Dust: solar output falls by e per unit of optical depth, 1 at tau 0.5', () => { near(B.solarFactor(0.5), 1, 1e-12, 'clear'); near(B.solarFactor(1.5) / B.solarFactor(0.5), Math.exp(-1), 1e-12, 'ratio'); });
await t('Power order: the habitat runs first, then oxygen', () => { const b = B.act({...B.newBase(), solar: 0, charge: 30}, 'research', 0.5); assert.equal(b.lost, null); assert.equal(b.log[0].full, false); const c = B.act({...B.newBase(), solar: 0, charge: 10}, 'research', 0.5); assert.match(c.lost, /habitat/); });
await t('Doing nothing but science fails, a sensible plan survives most missions', () => {
  let ok = 0; for (let k = 0; k < 100; k++) { const d = G.makeMission({seed: k}); assert.ok(play(d, []).lost); if (!play(d, PLAN).lost) ok++; } assert.ok(ok >= 90, String(ok));
});
await t('Daily: same mission for everyone, one storm, score and share grid', () => {
  const d = G.makeMission({key: '2026-10-20'}); assert.deepEqual(d, G.makeMission({key: '2026-10-20'})); assert.ok(d.tau.some(v => v > 1));
  const b = play(d, PLAN); assert.ok(G.score(b) > 200); assert.equal(G.score(play(d, [])), 0);
  assert.match(G.shareText(b, '#7'), /^Mars base #7 \d+\n((🟩|🟨|🟫|⬛){10}\n){3}https/u);
});
await t('Page: SEO and copy', () => {
  const h = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  for (const re of [/<title>Mars Base Game/, /<h1[^>]*>Mars Base Game/, /"@type": "VideoGame"/, /"@type": "FAQPage"/, /og:image/, /\.\.\/rocket-launch-game\//, /cloudflareinsights/]) assert.match(h, re);
  const text = h.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' '); assert.ok(!/[\u2013\u2014]|\s-\s/.test(text)); assert.ok(!/\bA\.?I\b/.test(text));
});
console.log(`${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0);
