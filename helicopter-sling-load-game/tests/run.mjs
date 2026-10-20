// Physics, balance and Daily Drop tests: node helicopter-sling-load-game/tests/run.mjs
import assert from 'assert/strict'; import fs from 'fs';
const P = await import('../js/physics.js'), {LEVELS, level} = await import('../js/levels.js'), {fly} = await import('./pilot.mjs');
const Dd = await import('../js/daily.js'), {dailyLevel} = await import('../js/daily-level.js');
let pass = 0, fail = 0; const t = async (n, f) => { try { await f(); pass++; console.log('PASS ' + n); } catch (e) { fail++; console.log('FAIL ' + n + '\n  ' + e.message); } };
const near = (a, b, tol, m) => assert.ok(Math.abs(a - b) <= tol, `${m}: ${a} vs ${b}`);
const calm = (o = {}) => ({...LEVELS[0], wind: {base: 0, gust: 0, turb: 0}, ...o});
const run = (w, s, n, inp = {}) => { for (let i = 0; i < n && !s.done; i++) P.step(w, s, inp); return s; };
// A pinned helicopter (huge mass) so the load swings from a fixed point.
const pinned = (rope, damp = false) => { const w = P.makeWorld(calm({rope, start: {x: 0, y: rope + 30}}), 1, {M: 1e9, damp}); return w; };
function period(w, s, n) { let last = null, crossings = []; let prev = s.items[0].x - s.x; for (let i = 0; i < n; i++) { P.step(w, s, {}); const d = s.items[0].x - s.x; if (prev < 0 && d >= 0) crossings.push(s.t); prev = d; } return crossings; }
await t('Pendulum: a load on a 15 m and a 30 m rope swings with T = 2π√(L/g)', () => { for (const L of [15, 30]) { const w = pinned(L), s = w.start; s.items[0].x += L * 0.08; const c = period(w, s, 60 * 40), T = (c[c.length - 1] - c[0]) / (c.length - 1), want = 2 * Math.PI * Math.sqrt((L + 1.2) / P.G);
  near(T, want, want * 0.04, `rope ${L} m`); } });
await t('Pendulum: without the damper a swing keeps going; with it the swing dies within a few periods', () => { const amp = damp => { const w = pinned(15, damp), s = w.start; s.items[0].x += 2; run(w, s, 60 * 24); let m = 0; for (let i = 0; i < 60 * 9; i++) { P.step(w, s, {}); m = Math.max(m, Math.abs(s.items[0].x - s.x)); } return m; };
  const free = amp(false), damped = amp(true); assert.ok(free > 1.5, 'free ' + free); assert.ok(damped < 0.15, 'damped ' + damped); });
await t('Rope: hanging still, its tension equals the weight of the load', () => { const w = pinned(15), s = w.start; run(w, s, 60 * 6); near(s.tension, s.items[0].m * P.G, s.items[0].m * P.G * 0.02, 'tension'); });
await t('Rope: it only pulls; a load resting on the ground with slack rope has no tension', () => { const w = P.makeWorld(calm(), 1), s = w.start; s.y = 17; s.items[0].y = 1.2; s.items[0].rest = true; run(w, s, 30); assert.equal(s.tension, 0); assert.ok(s.items[0].rest); });
await t('Hover: the collective needed rises with the load, from about half to well under full power for the bridge', () => { const a = P.makeWorld(level('crate-yard'), 1), b = P.makeWorld(level('first-lift'), 1), c = P.makeWorld({...level('bridge'), carry: 0}, 1);
  const ha = P.hoverCollective(a, a.start), hb = P.hoverCollective(b, b.start), hc = P.hoverCollective(c, c.start); assert.ok(ha > 0.45 && ha < 0.55, ha); assert.ok(hb > ha && hc > hb && hc < 0.85, [ha, hb, hc].join()); });
await t('Hover hold: no input holds height and position in still air with a load on', () => { const w = P.makeWorld(calm(), 1), s = w.start, y0 = s.y; run(w, s, 60 * 20); near(s.y, y0, 0.5, 'height'); near(s.x, 0, 0.5, 'x'); assert.ok(!s.done); });
await t('Hover hold: brakes to a stop in wind after you let go of the tilt', () => { const w = P.makeWorld(calm({wind: {base: 6, gust: 0, turb: 0}}), 1), s = w.start; run(w, s, 60 * 4, {tilt: 1}); assert.ok(s.vx > 4); run(w, s, 60 * 15); near(s.vx, 0, 0.15, 'stopped'); });
await t('Tilt: holding D tilts the rotor and accelerates, with the load lagging behind', () => { const w = P.makeWorld(calm(), 1), s = w.start; run(w, s, 60 * 1.5, {tilt: 1}); assert.ok(s.th > 0.25 && s.vx > 1.5); assert.ok(s.items[0].x < s.x - 0.3, 'load lags'); });
await t('W climbs and S comes down, and the descent slows itself near the ground', () => { const w = P.makeWorld(calm(), 1), s = w.start; run(w, s, 120, {lift: 1}); assert.ok(s.vy > 3); const w2 = P.makeWorld(calm({start: {x: 0, y: 60}}), 1), s2 = w2.start; let vHigh = 0;
  for (let i = 0; i < 60 * 40 && !s2.done && !s2.items[0].rest; i++) { P.step(w2, s2, {lift: -1}); if (P.clearance(w2, s2) > 8) vHigh = Math.min(vHigh, s2.vy); }
  assert.ok(vHigh < -2.5, 'fast high up ' + vHigh); assert.ok(s2.items[0].td && s2.items[0].td.impact < 1.2, 'soft at the bottom ' + JSON.stringify(s2.items[0].td)); });
await t('Manual collective (hover hold off): W and S move the collective, nothing holds the height', () => { const w = P.makeWorld(calm(), 1, {hover: false}), s = w.start, c0 = s.c; run(w, s, 60, {lift: 1}); near(s.c, c0 + 0.4, 0.02, 'collective'); });
await t('Hooking: lower the hook onto a crate and it latches; Space lets go', () => { const w = P.makeWorld(level('crate-yard'), 1), s = w.start; s.x = 50; s.hook.x = 50; run(w, s, 60 * 12, {lift: -1}); assert.equal(s.carry, 0); P.release(w, s); assert.equal(s.carry, -1); });
await t('Set down: on the target scores; off it you can hook it again; too hard and it breaks', () => { const w = P.makeWorld(calm(), 1), s = w.start; s.x = 90; s.items[0].x = 90; run(w, s, 60 * 30, {lift: -1}); assert.ok(s.ok && s.results[0].acc > 0.95, JSON.stringify(s.results));
  const w2 = P.makeWorld(calm(), 1), s2 = w2.start; s2.x = 60; s2.items[0].x = 60; run(w2, s2, 60 * 20, {lift: -1}); P.release(w2, s2); run(w2, s2, 30); assert.ok(!s2.done && s2.task === 0);
  const w3 = P.makeWorld(calm(), 1), s3 = w3.start; P.release(w3, s3); run(w3, s3, 60 * 3); assert.equal(s3.fault?.k, 'broken');
  const w4 = P.makeWorld(level('crate-yard'), 1, {hover: false}), s4 = w4.start; s4.c = 0.2; run(w4, s4, 60 * 10); assert.equal(s4.fault?.k, 'hard'); });
await t('The rotor hits a tall building if you fly into it', () => { const w = P.makeWorld(level('rooftop'), 1), s = w.start; s.y = 30; s.x = 80; run(w, s, 60 * 15, {tilt: 1}); assert.ok(s.fault && ['rotor', 'body'].includes(s.fault.k), JSON.stringify(s.fault)); });
await t('Fire: the bucket fills in the lake, Space dumps it, and water on the fire puts it out', () => { const w = P.makeWorld(level('fire-bucket'), 1), s = w.start; s.x = 100; s.items[0].x = 100; run(w, s, 60 * 25, {lift: -1}); assert.equal(s.phase, 'douse'); assert.ok(s.water >= 1);
  s.x = 346; s.items[0].x = 346; s.items[0].vx = 0; s.y = 40; s.items[0].y = 40 - 2 - 20 - 1.1; P.release(w, s); run(w, s, 60 * 6); assert.ok(s.results.length === 1 && s.fire < 0.6, JSON.stringify({r: s.results, fire: s.fire})); });
await t('Score: 1000 a job before the multiplier, rewards accuracy, steadiness and softness, grades S to D', () => { const w = P.makeWorld(LEVELS[0], 3), s = fly(w); assert.ok(s.ok); const p = P.parts(s, w); assert.ok(p.base <= 1000 && p.base > 700, p.base);
  const worse = k => P.parts({...s, results: s.results.map(r => ({...r, [k]: r[k] * 0.5}))}, w).base < p.base; for (const k of ['acc', 'swing', 'soft']) assert.ok(worse(k), k);
  assert.equal(P.grade(950), 'S'); assert.equal(P.grade(800), 'A'); assert.equal(P.grade(700), 'B'); assert.equal(P.grade(500), 'C'); assert.equal(P.grade(100), 'D'); assert.equal(P.score({...s, ok: false}, w), 0);
  assert.ok(P.parts(s, {...w, assist: {hover: false, damp: false}}).total > p.total * 1.3); });
await t('Levels: seven, each pays more than the last, the first has no wind and the load already on', () => { assert.equal(LEVELS.length, 7); for (let i = 1; i < 7; i++) assert.ok(LEVELS[i].mult > LEVELS[i - 1].mult); assert.equal(LEVELS[0].carry, 0); assert.equal(LEVELS[0].wind.base, 0); assert.ok(LEVELS[6].wind.gust > 3); });
await t('Autopilot: completes every level on 10 seeds each, mostly at A or S', () => { for (const L of LEVELS) { let ok = 0, good = 0; for (let k = 0; k < 10; k++) { const w = P.makeWorld(L, k * 7919 + 3), s = fly(w); if (s.ok) { ok++; if ('SA'.includes(P.parts(s, w).grade)) good++; } } assert.equal(ok, 10, L.id); assert.ok(good >= 8, L.id + ' ' + good); } });
await t('Autopilot without the swing damper still completes the first three levels', () => { for (const L of LEVELS.slice(0, 3)) { const w = P.makeWorld(L, 5, {damp: false}), s = fly(w); assert.ok(s.ok, L.id + ' ' + s.fault?.text); } });
await t('Page: title, structured data, support links, CSP, no dashes, no phone number', () => { const h = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  for (const re of [/<title>Helicopter Sling Load Game/, /"@type": "VideoGame"/, /"@type": "FAQPage"/, /buymeacoffee\.com\/arthurdeusexmachina/, /cults3d\.com/, /og:image/, /Content-Security-Policy/, /cloudflareinsights/, /dexm-support/]) assert.match(h, re);
  const text = h.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' '); assert.ok(!/[\u2013\u2014]|\s-\s/.test(text)); assert.ok(!/\+44|\b07\d{3}\s?\d{6}\b/.test(h)); });
await t('Daily Drop: the UK date, numbers from 2026-10-20, next drop at UK midnight across the clock change', () => {
  assert.equal(Dd.ukDate(new Date('2026-10-19T23:30:00Z')), '2026-10-20'); assert.equal(Dd.puzzleNo('2026-10-20'), 0); assert.equal(Dd.puzzleNo('2026-11-01'), 12);
  assert.equal(new Date(Dd.nextDrop(new Date('2026-10-20T12:00:00Z'))).toISOString(), '2026-10-20T23:00:00.000Z'); assert.equal(new Date(Dd.nextDrop(new Date('2026-10-25T12:00:00Z'))).toISOString(), '2026-10-26T00:00:00.000Z'); });
await t('Daily Drop: the same job all day for everyone, a different one tomorrow, levels untouched', () => { const a = dailyLevel('2026-10-21'), b = dailyLevel('2026-10-21'), c = dailyLevel('2026-10-22');
  assert.deepEqual(a, b); assert.notDeepEqual(a, c); assert.equal(a.no, 1); assert.equal(LEVELS.length, 7); assert.ok(!LEVELS.some(L => L.daily)); const wa = P.makeWorld(a, a.seed), wb = P.makeWorld(b, b.seed); assert.deepEqual(wa.phase, wb.phase); });
await t('Daily Drop: one scored try a day is kept, practice never overwrites it', () => { const m = new Map(), ls = {getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v)}, S = Dd.makeStore('x', ls);
  assert.equal(S.put('2026-10-21', {score: 900}), true); assert.equal(S.put('2026-10-21', {score: 10}), false); assert.equal(S.get('2026-10-21').score, 900); });
await t('Daily Drop: every kind of job turns up in 60 days', () => { const ks = new Set(Array.from({length: 60}, (_, i) => dailyLevel(Dd.addDays('2026-10-20', i)).kind)); for (const k of ['crate', 'ac', 'log', 'fire', 'bridge']) assert.ok(ks.has(k), k); });
await t('Daily Drop: the autopilot completes all 60 of the next drops', () => { const bad = [], from = '2026-10-20';
  for (let i = 0; i < 60; i++) { const d = Dd.addDays(from, i), L = dailyLevel(d), w = P.makeWorld(L, L.seed), s = fly(w); if (!s.ok || P.score(s, w) <= 0) bad.push(`${d} ${L.kind} ${s.fault?.k}`); }
  console.log(`    60 drops from ${from}: ${60 - bad.length} solved`); assert.deepEqual(bad, []); });
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
