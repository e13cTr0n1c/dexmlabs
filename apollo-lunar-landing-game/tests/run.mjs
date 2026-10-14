import assert from 'assert/strict';
import fs from 'fs';
const L = await import('../js/lm.js'), G = await import('../js/game.js');
let pass = 0, fail = 0; const t = async (n, f) => { try { await f(); pass++; console.log('PASS ' + n); } catch (e) { fail++; console.log('FAIL ' + n + '\n  ' + e.message); } };
const near = (a, b, tol, m) => assert.ok(Math.abs(a - b) <= tol, `${m}: ${a} vs ${b}`);
await t('Free fall with the engine off: v = g t and h = h0 minus half g t squared', () => {
  let s = {x: 0, y: 1000, vx: 0, vy: 0, fuel: 0, t: 0, throttle: 0, rcs: 0}; for (let i = 0; i < 300; i++) s = L.step(s);
  near(s.vy, -1.62 * 10, 0.01, 'speed'); near(s.y, 1000 - 0.5 * 1.62 * 100, 1, 'height');
});
await t('Hover: thrust equal to weight holds vertical speed steady', () => {
  let s = {x: 0, y: 100, vx: 0, vy: 0, fuel: 400, t: 0, throttle: 0, rcs: 0}; s.throttle = L.hoverThrottle(L.DRY + s.fuel); s = L.step(s); near(s.vy, 0, 1e-3, 'vy');
  assert.ok(s.throttle > L.MIN_T && s.throttle < L.MAX_T, 'hover is inside the throttle range');
});
await t('Mass flow: thrust over (Isp g0), about 14.5 kg/s at full thrust', () => { near(L.massFlow(1), 45040 / (311 * 9.80665), 1e-9, 'flow'); near(L.massFlow(1), 14.77, 0.05, 'value'); });
await t('Fuel: hover time is a minute or two, as on the real landings', () => { const s = G.makeLanding({key: '2026-10-20'}).start; const h = L.hoverSeconds(s); assert.ok(h > 60 && h < 160, String(h)); });
await t('Landing gear limits: 3 m/s down and 1.2 m/s sideways, on the pad', () => {
  const land = (vy, vx, x) => { let s = {x, y: 0.01, vx, vy: -vy, fuel: 100, t: 0, throttle: 0, rcs: 0}; while (!s.done) s = L.step({...s, throttle: L.hoverThrottle(L.DRY + s.fuel)}); return s; };
  assert.equal(land(2, 0.5, 5).landed, true); assert.equal(land(4, 0, 0).landed, false); assert.equal(land(1, 2, 0).landed, false); assert.equal(land(1, 0, 50).landed, false);
});
await t('Daily: same landing for everyone, a careful autopilot lands it, a crash scores zero, share grid', () => {
  const d = G.makeLanding({key: '2026-10-20'}); assert.deepEqual(d, G.makeLanding({key: '2026-10-20'}));
  let s = {...d.start};
  for (let i = 0; i < 30 * 600 && !s.done; i++) { const want = s.y < 15 && (Math.abs(s.x) > 8 || Math.abs(s.vx) > 0.4) ? 0 : Math.min(-0.8, Math.max(-6, -0.1 * s.y)), m = L.DRY + s.fuel; s.throttle = L.hoverThrottle(m) + (want - s.vy) * 0.08; { const tv = Math.max(-3, Math.min(3, -s.x * 0.08)), dv = tv - s.vx; s.rcs = Math.abs(dv) > 0.05 ? Math.sign(dv) : 0; } s = L.step(s); }
  assert.equal(s.landed, true, JSON.stringify(s.touch)); assert.ok(G.score(s) > 700);
  let c = {...d.start, throttle: 0}; while (!c.done) c = L.step({...c, throttle: 0}); assert.equal(G.score(c), 0);
  assert.match(G.shareText(s, '#7'), /^Apollo landing #7 \d+\n(🟩|🟨|🟥){5}\n/u);
});
await t('Page: SEO and copy', () => {
  const h = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  for (const re of [/<title>Apollo Lunar Landing Game/, /<h1[^>]*>Apollo Lunar Landing Game/, /"@type":\s*"VideoGame"/, /"@type":\s*"FAQPage"/, /og:image/, /data-stl/, /\.\.\/orbit\//, /\.\.\/rocket-launch-game\//, /cloudflareinsights/]) assert.match(h, re);
  const text = h.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' '); assert.ok(!/[\u2013\u2014]|\s-\s/.test(text)); assert.ok(!/\bA\.?I\b/.test(text));
});
console.log(`${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0);
