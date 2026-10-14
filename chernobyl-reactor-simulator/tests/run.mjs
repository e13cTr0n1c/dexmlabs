import assert from 'assert/strict';
import fs from 'fs';
const R = await import('../js/rbmk.js'), G = await import('../js/game.js');
let pass = 0, fail = 0; const t = async (n, f) => { try { await f(); pass++; console.log('PASS ' + n); } catch (e) { fail++; console.log('FAIL ' + n + '\n  ' + e.message); } };
const run = (s, secs, f = x => x) => { for (let i = 0; i < secs * 4 && (s.state === 'running'); i++) s = R.step(f(s)); return s; };
await t('Equilibrium: a steady reactor holds its power and xenon', () => { const s = run(R.steady(1), 100); assert.ok(Math.abs(s.P - 1) < 0.01 && Math.abs(s.X - 1) < 0.01); });
await t('Rods: inserting rods lowers reactivity and power', () => { const s = R.steady(0.7); assert.ok(R.reactivity({...s, rods: s.rods + 5}) < 0); assert.ok(run({...s, rods: s.rods + 5}, 20).P < 0.7); });
await t('Positive void coefficient: less flow means more steam and more power', () => { const s = R.steady(0.7); assert.ok(R.voidFrac(0.7, 0.7) > R.voidFrac(0.7, 1)); assert.ok(R.reactivity({...s, flow: 0.7}) > 0); assert.ok(run({...s, flow: 0.8}, 10).P > 0.7); });
await t('Doppler: at full flow, more power alone pulls reactivity down', () => { const s = R.steady(1); assert.ok(R.reactivity({...s, P: 1.2}) < R.reactivity(s)); });
await t('Xenon: after a cut in power, xenon rises above its new equilibrium, then falls back', () => {
  let s = {...R.steady(1)}; s.P = 0.5; let peak = 0, at = 0; for (let i = 0; i < 4 * 1200; i++) { const n = R.step({...s, rods: s.rods, P: 0.5}); s = {...n, P: 0.5, state: 'running'}; if (s.X > peak) { peak = s.X; at = s.t; } }
  assert.ok(peak > R.xenonEq(0.5) * 1.15, 'pit'); assert.ok(at * 2 / 60 > 4 && at * 2 / 60 < 14, `peak at ${at * 2 / 60} h`); assert.ok(Math.abs(s.X - R.xenonEq(0.5)) < 0.1, 'settles');
});
await t('AZ-5 with plenty of rods in shuts the reactor down', () => { const s = run(R.az5(R.steady(0.5)), 60); assert.equal(s.state, 'shutdown'); assert.ok(s.peak < 0.6); });
await t('Graphite tips: AZ-5 with rods pulled out at low power gives a power spike first', () => { const s = run(R.az5(R.steady(0.07, 0.6, 1.6)), 60); assert.ok(s.peak > 0.07 * 5); });
await t('AZ-5 with almost every rod out, low power, lots of xenon and low flow: the core runs away', () => { const s = R.steady(0.07, 0.6, 1.7); assert.ok(s.rods < R.ORM_LIMIT); assert.equal(run(R.az5(s), 60).state, 'exploded'); });
await t('Meltdown: full power with the pumps cut overheats the fuel', () => { const s = run({...R.steady(1), flow: 0.3, rods: R.steady(1).rods + 40}, 30); assert.ok(['meltdown', 'exploded'].includes(s.state)); });
await t('Game: daily scenario rotates, a careful player scores, an empty share grid has no numbers but the score', () => {
  assert.equal(new Set(['2026-10-14', '2026-10-15', '2026-10-16'].map(G.scenarioFor)).size, 3);
  let g = G.newGame('pump'); for (let i = 0; i < 150 * 4 && !g.done; i++) { g = G.setRods(g, g.s.rods + (g.s.P - 0.7) * 30); g = G.tick(g); }
  assert.equal(g.failed, false); assert.ok(G.score(g) > 700, String(G.score(g))); assert.match(G.shareText(g, '#1'), /^RBMK #1 \d+\n(🟩|🟨|⬛|🟥){10}\n/u);
  let r = G.newGame('rundown'); r = G.setRods(r, 5); for (let i = 0; i < 300 && !r.done; i++) { r = G.tick(r); if (r.s.t > 30 && !r.s.az5) r = G.pressAz5(r); }
  assert.ok(r.ormBroken);
});
await t('Page: SEO, honest labels, no dashes', () => {
  const h = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  for (const re of [/<title>Chernobyl Reactor Simulator/, /<h1[^>]*>Chernobyl Reactor Simulator/, /"@type":\s*"VideoGame"/, /"@type":\s*"FAQPage"/, /og:image/, /simplified game/i, /not a training tool/i, /data-stl/, /cloudflareinsights/, /\.\.\/enigma-machine\//])
    assert.match(h, re);
  const text = h.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' '); assert.ok(!/[\u2013\u2014]|\s-\s/.test(text)); assert.ok(!/\bA\.?I\b/.test(text));
});
console.log(`${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0);
