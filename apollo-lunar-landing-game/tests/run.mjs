import assert from 'assert/strict';
import fs from 'fs';
const L = await import('../js/lm.js'), G = await import('../js/game.js'), S = await import('../js/sites.js'), P = await import('./pilot.mjs');
let pass = 0, fail = 0; const t = async (n, f) => { try { await f(); pass++; console.log('PASS ' + n); } catch (e) { fail++; console.log('FAIL ' + n + '\n  ' + e.message); } };
const near = (a, b, tol, m) => assert.ok(Math.abs(a - b) <= tol, `${m}: ${a} vs ${b}`);
const flat = {W: 2400, ground: new Float32Array(2401), boulders: [], target: 0};
const st = o => ({x: 0, y: 1000, vx: 0, vy: 0, angle: 0, omega: 0, fuel: 0, rcs: 50, throttle: 0, t: 0, ...o});
await t('Free fall with the engine off: v = g t and h = h0 minus half g t squared', () => { let s = st(); for (let i = 0; i < 300; i++) s = L.step(flat, s); near(s.vy, -16.2, 0.01, 'v'); near(s.y, 1000 - 0.5 * 1.62 * 100, 1, 'h'); });
await t('Hover: thrust equal to weight holds vertical speed, and it lies between two detents', () => {
  let s = st({fuel: 400}); s.throttle = L.hoverThrottle(L.DRY + s.fuel); s = L.step(flat, s); near(s.vy, 0, 1e-3, 'vy');
  assert.ok(!L.DETENTS.some(d => Math.abs(d - s.throttle) < 0.01), 'hover is not on a detent');
});
await t('Mass flow: thrust over (Isp g0), 14.8 kg/s at full thrust', () => near(L.massFlow(1), 45040 / (311 * 9.80665), 1e-9, 'flow'));
await t('Throttle detents: 10% to 60% in 5% steps, then full, nothing in the forbidden band', () => {
  assert.equal(L.detentUp(0.6), 1); assert.equal(L.detentDown(1), 0.6); assert.equal(L.detentUp(0.25), 0.3); assert.ok(!L.DETENTS.some(d => d > 0.6 && d < 1));
});
await t('Tilting moves you sideways: 20° at hover thrust gives a = T sin(a) / m', () => { let s = st({fuel: 400, angle: 20 / 57.2958}); s.throttle = L.hoverThrottle(L.DRY + 400); const a = s.throttle * L.THRUST * Math.sin(s.angle) / (L.DRY + 400); s = L.step(flat, s, {}, 0.1); near(s.vx, a * 0.1, 1e-3, 'ax'); });
await t('RCS: rotation is rate limited to 10°/s, attitude stops at 45°, translation is about 0.1 m/s²', () => {
  let s = st({fuel: 400}); for (let i = 0; i < 300; i++) s = L.step(flat, s, {rot: 1}); near(s.omega, 0, 1e-9, 'stopped'); near(s.angle, L.LIMITS.attitude, 1e-9, 'limit'); assert.ok(s.rcs < 50);
  let u = st({fuel: 400}); u = L.step(flat, u, {trans: 1}, 1); near(u.vx, 890 / (L.DRY + 400), 1e-3, 'trans');
});
await t('Touchdown limits: 3 m/s, 1.2 m/s sideways, 6° tilt, 12° slope, 0.6 m boulder', () => {
  assert.equal(L.touchdownFault(flat, 0, 2.9, 1.1, 0.1), null);
  assert.equal(L.touchdownFault(flat, 0, 3.1, 0, 0).k, 'hard'); assert.equal(L.touchdownFault(flat, 0, 1, 1.3, 0).k, 'side'); assert.equal(L.touchdownFault(flat, 0, 1, 0, 0.12).k, 'tilt');
  const slope = {...flat, ground: Float32Array.from({length: 2401}, (_, i) => i * 2 * Math.tan(15 / 57.3))}; assert.equal(L.touchdownFault(slope, 0, 1, 0, 0).k, 'slope');
  assert.equal(L.touchdownFault({...flat, boulders: [{x: 2, w: 2, h: 1}]}, 0, 1, 0, 0).k, 'boulder');
});
await t('Abort stage: falling at 10 m/s from 150 m, the ascent stage climbs away', () => { let s = L.abort(st({y: 150, vy: -10, fuel: 0})); while (!s.done) s = L.step(flat, s); assert.equal(s.safe, true); });
await t('Abort too low is too late', () => { let s = L.abort(st({y: 3, vy: -8, fuel: 0})); while (!s.done) s = L.step(flat, s); assert.equal(s.safe, undefined); assert.equal(s.fault.k, 'abortcrash'); });
await t('Sites: six real sites, each with a landable target patch, in every tier', () => {
  assert.equal(S.SITES.length, 6); for (const site of S.SITES) for (const tier of Object.keys(S.TIERS)) assert.notEqual(P.spot(S.makeWorld(site, 99, tier)), null, site.id + tier);
});
await t('Tiers: Armstrong has less fuel and more alarms than Cadet; the first alarm is a 1202', () => {
  const c = G.makeLanding({key: '2026-10-20', tier: 'cadet'}).world, a = G.makeLanding({key: '2026-10-20', tier: 'armstrong'}).world;
  assert.ok(L.hoverSeconds(a.start) < L.hoverSeconds(c.start)); assert.equal(c.alarms.length, 0); assert.equal(a.alarms[0].code, 1202);
});
await t('A careful autopilot lands nearly every landing in every tier', () => {
  for (const tier of Object.keys(S.TIERS)) { let ok = 0; for (let k = 0; k < 30; k++) if (P.fly(G.makeLanding({seed: k * 7919, tier}).world).s.landed) ok++; assert.ok(ok >= 25, `${tier} ${ok}`); }
});
await t('Daily: same landing for everyone, sites rotate, scoring by precision and fuel, share grid', () => {
  const d = G.makeLanding({key: '2026-10-20'}); assert.deepEqual(d.world.start, G.makeLanding({key: '2026-10-20'}).world.start);
  assert.notEqual(d.world.site.id, G.makeLanding({key: '2026-10-21'}).world.site.id);
  const {s} = P.fly(d.world); assert.equal(s.landed, true); const sc = G.score(s, 'commander'); assert.ok(sc > 0);
  const far = {...s, touch: {...s.touch, dist: 150}}, close = {...s, touch: {...s.touch, dist: 10}}; assert.ok(G.score(close) > G.score(far) * 2.5);
  assert.ok(G.score({...s, fuel: s.fuel + 100}) > G.score(s)); assert.ok(G.score(s, 'armstrong') > G.score(s, 'cadet'));
  assert.match(G.shareText(s, '#7', 'commander', d.world.site, true), /^Apollo landing #7 Commander, .+\nLanded, \d+ points\n(🟩|🟨|🟥){5}\n/u);
  assert.equal(G.grid({safe: true}), '⬜⬜⬜⬜⬜');
});
await t('Page: SEO and copy', () => {
  const h = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  for (const re of [/<title>Apollo Lunar Landing Game/, /<h1[^>]*>Apollo Lunar Landing Game/, /"@type":\s*"VideoGame"/, /"@type":\s*"FAQPage"/, /og:image/, /data-stl/, /\.\.\/orbit\//, /1202/, /cloudflareinsights/]) assert.match(h, re);
  const text = h.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' '); assert.ok(!/[\u2013\u2014]|\s-\s/.test(text)); assert.ok(!/\bA\.?I\b/.test(text));
});
console.log(`${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0);
