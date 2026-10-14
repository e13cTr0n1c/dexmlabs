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
const P = await import('../js/plant.js'), B = await import('./bot.mjs');
await t('Plant: a unit at full power holds pressure, drum level and power', () => { let u = P.plant(1); for (let i = 0; i < 400; i++) u = P.tick(u); assert.ok(Math.abs(u.c.P - 1) < 0.01 && Math.abs(u.p - 1) < 0.01 && Math.abs(u.lvl) < 0.01, JSON.stringify([u.c.P, u.p, u.lvl])); });
await t('Turbine: taking less steam than the core makes raises pressure, and pressure cuts boiling', () => { let u = P.setLoad(P.plant(0.7), 0.5); u = P.tick(u, 1); assert.ok(u.p > 1); assert.ok(R.voidFrac(0.7, 1, 1.1) < R.voidFrac(0.7, 1, 1)); });
await t('Feedwater: feeding less than the steam drops the drum level until the channels dry out', () => { let u = P.setFeed(P.plant(0.7), 0.2); for (let i = 0; i < 4000 && !u.trip; i++) u = P.tick(P.setLoad(P.setRods(u, u.c.rods + (u.c.P - 0.7) * 2), u.c.P + (u.p - 1) * 2)); assert.equal(u.trip?.k, 'dry'); });
await t('Feedwater: warm feedwater (less subcooling) means more steam', () => assert.ok(R.voidFrac(0.5, 1, 1, 0.5) > R.voidFrac(0.5, 1, 1, 1)));
await t('Pumps: stopping pumps cuts flow and raises power through the void coefficient', () => { let u = P.plant(0.7); u = P.togglePump(u, 0); u = P.togglePump(u, 1); const c0 = u.c.P; for (let i = 0; i < 20; i++) u = P.tick(u); assert.ok(u.c.flow < 1 && u.c.P > c0); });
await t('Regulator: holds power within its 12 rod reach', () => { let u = P.setAr(P.plant(0.7), true); u = {...u, c: {...u.c, X: u.c.X + 0.05}}; for (let i = 0; i < 400; i++) u = P.tick(u); assert.ok(Math.abs(u.c.P - 0.7) < 0.05, String(u.c.P)); });
await t('Emergency protection: past 110% power the reactor scrams itself, which ends the shift', () => { let g = G.newGame('trips', 1); g = G.togglePump(G.togglePump(g, 0), 1); g = G.setRods(g, g.u.c.rods - 5); while (!g.done) g = G.tick(g); assert.equal(g.failed, 'scram'); assert.ok(g.u.c.peak < 2); });
await t('Scenarios: five, escalating, unlocked in order, the daily one rotates', () => {
  assert.equal(G.SCENARIOS.length, 5); assert.deepEqual(G.unlocked({}), ['startup']); assert.deepEqual(G.unlocked({startup: 600, load: 400}), ['startup', 'load']);
  assert.equal(new Set(['2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18'].map(G.scenarioFor)).size, 5);
});
await t('A careful operator does well on every shift', () => { for (const s of G.SCENARIOS) for (const seed of [1, 2]) { const g = B.play(s.id, seed); assert.equal(g.failed, false, s.id); assert.ok(G.score(g) >= 700, `${s.id} ${G.score(g)}`); } });
await t('The night of the test: pull nearly every rod to hold power, press AZ-5 during the rundown, and the core runs away', () => { const g = B.play('night', 1, {greedy: true}); assert.equal(g.failed, 'exploded'); assert.equal(G.score(g), 0); assert.match(G.verdict(g), /prompt|fuel/); });
await t('The night of the test: refusing to run it is safe and scores', () => { const g = B.play('night', 1, {refuse: true}); assert.equal(g.failed, false); assert.equal(G.score(g), 600); });
await t('Share grid: label, scenario and ten cells', () => { const g = B.play('trips', 1); assert.match(G.shareText(g, '#1'), /^RBMK #1 .+: \d+\n(🟩|🟨|🟧|⬛|🟥){10}\n/u); });
await t('Page: SEO, honest labels, no dashes', () => {
  const h = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  for (const re of [/<title>Chernobyl Reactor Simulator/, /<h1[^>]*>Chernobyl Reactor Simulator/, /"@type":\s*"VideoGame"/, /"@type":\s*"FAQPage"/, /og:image/, /simplified game/i, /not a training tool/i, /data-stl/, /cloudflareinsights/, /\.\.\/enigma-machine\//])
    assert.match(h, re);
  const text = h.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' '); assert.ok(!/[\u2013\u2014]|\s-\s/.test(text)); assert.ok(!/\bA\.?I\b/.test(text));
});
console.log(`${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0);
