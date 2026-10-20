// Physics checks and an autopilot run on every level, in Node: node docking-run-game/tests/run.mjs
import * as P from '../js/physics.js';
import {LEVELS, byId} from '../js/levels.js';
import {decide} from './pilot.mjs';
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const n = P.N_LEO;
ok(near(n, 0.00113, 0.00001), `mean motion at 400 km is ${n.toFixed(6)} rad/s (period ${(2 * Math.PI / n / 60).toFixed(1)} min)`);

// 1. Jet select: rotation groups are pure couples, translation groups push along their axis.
for (const a of ['rx', 'ry', 'rz']) for (const s of '+-') { const {F, T} = P.groupForceTorque(s + a), k = {rx: 0, ry: 1, rz: 2}[a]; ok(P.len(F) < 1e-9 && Math.sign(T[k]) === (s === '+' ? 1 : -1), `${s}${a} jets give a pure torque, ${T[k].toFixed(2)} N·m per N about the right axis`); }
for (const a of ['tx', 'ty', 'tz']) for (const s of '+-') { const {F, T} = P.groupForceTorque(s + a), k = {tx: 0, ty: 1, tz: 2}[a]; ok(Math.sign(F[k]) === (s === '+' ? 1 : -1) && near(Math.hypot(...F.filter((_, i) => i !== k)), 0, 1e-9), `${s}${a} jets push along the axis (and couple ${P.len(T).toFixed(3)} N·m/N of torque, off-axis firing)`); }

// 2. Torque-free tumble with no orbit (n = 0): linear momentum, angular momentum and rotational energy are conserved.
{
  const sim = P.makeSim(byId('final'), {n: 0}); sim.cap.w = [0.05, 0.11, -0.07]; sim.cap.v = [0.3, -0.2, 0.1];
  const L = s => P.qrot(s.cap.q, P.mat3v(P.CAPSULE.I, s.cap.w)), E = s => 0.5 * P.dot(s.cap.w, P.mat3v(P.CAPSULE.I, s.cap.w)), m = P.capMass(sim);
  const L0 = L(sim), E0 = E(sim), p0 = P.scl(sim.cap.v, m), x0 = sim.cap.p.slice(), w0 = sim.cap.w.slice();
  for (let i = 0; i < 600 * 60; i++) P.step(sim, {}, 1 / 60);
  const L1 = L(sim), dL = P.len(P.sub(L1, L0)) / P.len(L0), dE = Math.abs(E(sim) - E0) / E0, dp = P.len(P.sub(P.scl(sim.cap.v, P.capMass(sim)), p0)) / P.len(p0);
  ok(dL < 1e-8, `angular momentum vector conserved over 10 min of free tumble (relative drift ${dL.toExponential(2)})`);
  ok(dE < 1e-8, `rotational kinetic energy conserved (relative drift ${dE.toExponential(2)})`);
  ok(dp < 1e-12 && near(P.len(P.sub(sim.cap.p, P.add(x0, P.scl(P.sub(sim.cap.v, [0, 0, 0]), 600)))), 0, 1e-6), `linear momentum conserved, straight line motion (relative drift ${dp.toExponential(2)})`);
  ok(P.len(P.sub(sim.cap.w, w0)) > 0.005, 'with an asymmetric inertia tensor the body rate vector itself wanders (Euler precession) while L stays fixed');
}
// 3. Thrusters: a coarse +X burn for 10 s gives the rocket equation delta-v and burns the right propellant.
{
  const sim = P.makeSim(byId('rendezvous'), {n: 0}); sim.cap.w = [0, 0, 0]; sim.cap.v = [0, 0, 0]; const m0 = P.capMass(sim), q0 = sim.cap.q;
  for (let i = 0; i < 600; i++) P.step(sim, {t: [1, 0, 0]}, 1 / 60);
  const dv = P.len(sim.cap.v), m1 = P.capMass(sim), ideal = P.ISP * P.G0 * Math.log(m0 / m1), burn = 4 * 130 / (P.ISP * P.G0) * 10;
  ok(near(dv, ideal, ideal * 0.01), `10 s of +X: ${dv.toFixed(4)} m/s against ${ideal.toFixed(4)} from the rocket equation`);
  ok(near(m0 - m1, burn, 1e-6), `burned ${(m0 - m1).toFixed(3)} kg of propellant (${burn.toFixed(3)} expected)`);
  ok(P.len(sim.cap.w) > 1e-4, `the off-centre centre of mass turns a pure translation burn into a slow rotation (${(P.len(sim.cap.w) * P.DEG).toFixed(3)}°/s after 10 s)`);
  void q0;
}
// 4. CW: the integrator matches the closed form, and the classic counterintuitive results hold.
{
  const sim = P.makeSim(byId('rendezvous')); sim.cap.p = [500, 40, -20]; sim.cap.v = [0.1, -0.05, 0.02];
  const p0 = sim.cap.p.slice(), v0 = sim.cap.v.slice(), T = 1800;
  for (let i = 0; i < T * 10; i++) P.step(sim, {}, 0.1);
  const a = P.cwCoast(p0, v0, n, T); ok(P.len(P.sub(sim.cap.p, a.p)) < 1e-3, `numerical CW coast matches the closed form after 30 min (error ${P.len(P.sub(sim.cap.p, a.p)).toExponential(2)} m)`);
  const T0 = 2 * Math.PI / n, pro = P.cwCoast([0, 0, 0], [0.1, 0, 0], n, T0), half = P.cwCoast([0, 0, 0], [0.1, 0, 0], n, T0 / 2);
  ok(pro.p[0] < -10 && half.p[1] > 0, `a prograde burn sends you up and BEHIND: after one orbit ${pro.p[0].toFixed(0)} m along track, ${half.p[1].toFixed(0)} m higher at half an orbit`);
  const retro = P.cwCoast([0, 0, 0], [-0.1, 0, 0], n, T0); ok(retro.p[0] > 10, `a retrograde burn moves you ahead (${retro.p[0].toFixed(0)} m after one orbit)`);
  const up = P.cwCoast([0, 0, 0], [0, 0.1, 0], n, T0); ok(P.len(up.p) < 1e-6, `a pure radial burn comes back to the start after one orbit (${P.len(up.p).toExponential(1)} m)`);
  const upq = P.cwCoast([0, 0, 0], [0, 0.1, 0], n, T0 / 4); ok(upq.p[0] < 0 && upq.p[1] > 0, `a radial up burn first drifts you up and backward (${upq.p[0].toFixed(0)} m, +${upq.p[1].toFixed(0)} m at a quarter orbit)`);
  const vbar = P.cwCoast([150, 0, 0], [0, 0, 0], n, 3000); ok(P.len(P.sub(vbar.p, [150, 0, 0])) < 1e-9, 'a point on the V-bar is a free hold: no drift');
  const rbar = P.cwCoast([0, -30, 0], [0, 0, 0], n, 600); ok(rbar.p[0] > 0.5 && rbar.p[1] < -30, `released 30 m below on the R-bar you drift forward (${rbar.p[0].toFixed(2)} m in 10 min) and fall away`);
  const high = P.cwCoast([0, 100, 0], [-1.5 * n * 100, 0, 0], n, 3000); ok(near(high.p[1], 100, 1e-6), `100 m higher with v = -1.5 n y you stay at 100 m and slide back ${(-high.p[0]).toFixed(0)} m`);
  const cross = P.cwCoast([0, 0, 10], [0, 0, 0], n, T0 / 2); ok(near(cross.p[2], -10, 1e-6), 'an out of plane offset swings through the station plane every half orbit');
}
// 5. The autopilot docks on every level, then soft and hard capture run.
for (const L of LEVELS) {
  const sim = P.makeSim(L); let t = 0, cmd = null; const h = 1 / 60;
  while (sim.t < 6000 && sim.phase !== 'docked' && sim.phase !== 'crash' && sim.phase !== 'lost') { if (t <= 0) { cmd = decide(sim); t = 1 / 30; } P.step(sim, sim.phase === 'fly' ? cmd : {}, h); t -= h; }
  const s = P.score(sim), c = sim.contact;
  ok(sim.phase === 'docked', `${L.name}: autopilot ${sim.phase} in ${sim.t.toFixed(0)} s, ${sim.bounces} bounces, ${(sim.prop0 - sim.prop).toFixed(1)} of ${sim.prop0} kg${c ? `, contact ${c.closing.toFixed(3)} m/s, ${c.lat.toFixed(3)} m, ${c.ang.toFixed(2)}°, roll ${c.roll.toFixed(2)}°, ${c.rate.toFixed(3)}°/s` : ''}, score ${s.total}${sim.fault ? ' (' + sim.fault + ')' : ''}`);
}
// 6. Docking limits: too fast is refused.
{
  const sim = P.makeSim({...byId('final'), start: {ax: 0.5, y: 0, z: 0, v: [-0.3, 0, 0], att: [0, 0, 0], rates: [0, 0, 0]}});
  for (let i = 0; i < 300; i++) P.step(sim, {}, 1 / 60);
  ok(sim.phase === 'crash', `0.3 m/s into the port is a crash (${sim.fault})`);
  const s2 = P.makeSim({...byId('final'), start: {ax: 0.5, y: 0.2, z: 0, v: [-0.06, 0, 0], att: [0, 0, 0], rates: [0, 0, 0]}});
  for (let i = 0; i < 900; i++) P.step(s2, {}, 1 / 60);
  ok(s2.bounces === 1 && s2.phase === 'fly', `0.2 m off the centreline bounces off the ring with no capture (${s2.lastBounce})`);
  const s3 = P.makeSim({...byId('final'), start: {ax: 0.5, y: 0.02, z: -0.01, v: [-0.06, 0, 0], att: [0.5, -0.5, 0.5], rates: [0, 0, 0]}});
  for (let i = 0; i < 60 * 25; i++) P.step(s3, {}, 1 / 60);
  ok(s3.phase === 'docked' && s3.events.map(e => e.type).join() === 'soft,retract,hard', `a good contact runs soft capture, retraction and hard capture (${s3.events.map(e => `${e.type} ${e.t.toFixed(1)} s`).join(', ')})`);
}
// 7. Daily Drop: the same run for everyone on a UK date, one scored attempt, and the autopilot docks the next 60.
{
  const D = await import('../js/daily.js'), {dailyLevel} = await import('../js/daily-level.js');
  ok(D.ukDate(new Date('2026-10-19T23:30:00Z')) === '2026-10-20' && D.puzzleNo('2026-10-20') === 0 && D.puzzleNo('2026-11-01') === 12, 'UK date and puzzle numbers counted from 2026-10-20');
  ok(new Date(D.nextDrop(new Date('2026-10-25T12:00:00Z'))).toISOString() === '2026-10-26T00:00:00.000Z' && new Date(D.nextDrop(new Date('2026-10-20T12:00:00Z'))).toISOString() === '2026-10-20T23:00:00.000Z', 'next drop at UK midnight, either side of the clock change');
  const a = dailyLevel('2026-10-21'); ok(JSON.stringify(a) === JSON.stringify(dailyLevel('2026-10-21')) && JSON.stringify(a.start) !== JSON.stringify(dailyLevel('2026-10-22').start), 'same run all day, a new one tomorrow');
  ok(LEVELS.length === 6 && LEVELS[0].id === 'tutorial' && LEVELS.slice(1).map(L => L.id).join() === 'final,approach,tumble,rendezvous,night' && !LEVELS.some(L => L.daily), 'a tutorial first, then the five runs');
  const m = new Map(), S = D.makeStore('x', {getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v)}); ok(S.put('d', {score: 1}) && !S.put('d', {score: 2}) && S.get('d').score === 1, 'one scored attempt is kept and practice never overwrites it');
  const from = D.ukDate(), ls = Array.from({length: 60}, (_, i) => dailyLevel(D.addDays(from, i))); ok(ls.some(L => L.station) && ls.some(L => !L.station) && new Set(ls.map(L => L.start.ax)).size > 30, 'drops mix steady and tumbling stations over a range of starts');
  const bad = [];
  for (const L of ls) { const sim = P.makeSim(L, {mode: 'pilot'}); let t = 0, cmd = null; const h = 1 / 60;
    while (sim.t < 6000 && sim.phase !== 'docked' && sim.phase !== 'crash' && sim.phase !== 'lost') { if (t <= 0) { cmd = decide(sim); t = 1 / 30; } P.step(sim, sim.phase === 'fly' ? cmd : {}, h); t -= h; }
    if (sim.phase !== 'docked' || !(P.score(sim).total > 0)) bad.push(`${L.date} ${sim.phase}`); }
  ok(!bad.length, `the autopilot docks all 60 drops from ${from} in Pilot mode, as the Daily Drop is flown${bad.length ? ': failed ' + bad.join(', ') : ''}`);
}
// 8. Pilot difficulty: same physics, a forgiving ring, more propellant, gentler drift on the early runs, and a combo.
{
  const M = P.MODES, fly = (L, mode) => { const sim = P.makeSim(L, {mode}); let t = 0, cmd = null; const h = 1 / 60; while (sim.t < 6000 && !['docked', 'crash', 'lost'].includes(sim.phase)) { if (t <= 0) { cmd = decide(sim); t = 1 / 30; } P.step(sim, sim.phase === 'fly' ? cmd : {}, h); t -= h; } return sim; };
  ok(M.pilot.limits.vMax >= 0.25 && M.pilot.limits.lat >= 0.3 && M.pilot.limits.ang >= 10 && M.realistic.limits === P.LIMITS, 'Pilot limits: up to 0.25 m/s, 0.3 m off, 10°; Realistic keeps the real ones');
  const fast = mode => { const s = P.makeSim({...byId('final'), start: {ax: 0.5, y: 0.2, z: 0, v: [-0.2, 0, 0], att: [5, 5, 0], rates: [0, 0, 0]}}, {mode}); for (let i = 0; i < 60 * 25; i++) P.step(s, {}, 1 / 60); return s.phase; };
  ok(fast('pilot') === 'docked' && fast('realistic') !== 'docked', `0.2 m/s, 20 cm off and 7° crooked docks in Pilot (${fast('pilot')}) but not in Realistic (${fast('realistic')})`);
  ok(P.makeSim(byId('final'), {mode: 'pilot'}).prop === byId('final').fuel * 1.6 && P.makeSim(byId('final')).prop === byId('final').fuel, 'Pilot carries 60% more propellant');
  const drift = mode => { const s = P.makeSim({...byId('approach'), start: {ax: 100, y: 0, z: 0, v: [-0.3, 0, 0], att: [0, 0, 0], rates: [0, 0, 0]}}, {mode}); for (let i = 0; i < 60 * 200; i++) P.step(s, {}, 1 / 60); return Math.abs(P.rel(s).y); };
  ok(drift('pilot') < drift('realistic') * 0.4, `orbital drift on the early runs is turned down in Pilot (${drift('pilot').toFixed(2)} m against ${drift('realistic').toFixed(2)} m off the axis after 200 s)`);
  ok(drift('pilot') > 0, 'but the Hill equations still act');
  const late = P.makeSim(byId('rendezvous'), {mode: 'pilot'}); ok(late.cwK === 1, 'the later runs keep full orbital mechanics in Pilot');
  for (const L of LEVELS) { const s = fly(L, 'pilot'), sc = P.score(s); ok(s.phase === 'docked' && sc.stars >= 1 && sc.combo >= 0, `Pilot ${L.name}: autopilot ${s.phase}, ${sc.total} points (combo +${sc.combo}), ${'★'.repeat(sc.stars)}`); }
  // A beginner on the tutorial: tap forward for a second, coast in, touch nothing else.
  const tut = P.makeSim(byId('tutorial'), {mode: 'pilot'}); for (let i = 0; i < 60 * 400 && tut.phase !== 'docked' && tut.phase !== 'crash'; i++) P.step(tut, i < 60 * 4 ? {t: [1, 0, 0], fine: true, assist: true} : {assist: true}, 1 / 60);
  ok(tut.phase === 'docked', `tutorial: a beginner who holds W for 4 s and coasts docks (${tut.phase}, contact ${tut.contact?.closing.toFixed(3)} m/s)`);
  const rough = P.makeSim(byId('tutorial'), {mode: 'pilot'}); rough.smooth = 1; rough.rough = 9; rough.contact = {closing: 0.065, lat: 0, ang: 0, roll: 0, rate: 0, t: 10}; rough.phase = 'docked';
  const smooth = {...rough, smooth: 9, rough: 0}; ok(P.score(smooth).combo === 200 && P.score(rough).combo === 0 && P.score(smooth).stars === 3, 'a smooth approach earns the full 200 combo bonus and three stars; a wobbly one gets no combo');
  const zone = (range, closing) => P.speedZone({range, closing}, M.pilot.limits); ok(zone(5, P.guideSpeed(5, M.pilot.limits)) === 'green' && zone(5, 0.6) === 'red' && zone(1, 0.45) === 'red' && zone(1, 0.08) === 'green', 'closing speed gauge: green near the guide speed, red when far too fast');
}
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
