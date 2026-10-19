// Docking Run physics. Pure functions, no DOM, so the tests can run it in Node.
//
// Frame: the station's local vertical, local horizontal (LVLH, or Hill) frame, centred on the station's
// centre of mass and turning with the orbit once every 92 minutes. The axes match three.js:
//   +X along track (prograde, the V-bar), +Y radial, away from Earth (the R-bar points down, -Y),
//   +Z = -orbit normal, so the frame is right handed.
// Relative translation follows the Clohessy-Wiltshire (Hill) equations for a circular 400 km orbit.
// Each body is a rigid body: attitude quaternion, inertial angular velocity in body axes, a full inertia
// tensor with products of inertia, Euler's equations and gravity gradient torque.
// Quaternions are [w, x, y, z]. A quaternion q rotates body vectors into the LVLH frame.

export const MU = 3.986004418e14, RE = 6371e3, ALT = 400e3, R_ORBIT = RE + ALT;
export const N_LEO = Math.sqrt(MU / R_ORBIT ** 3); // 0.001131 rad/s, a 92.6 minute orbit
export const G0 = 9.80665, ISP = 290;              // cold-ish storable bipropellant RCS
export const THRUST = {coarse: 130, fine: 26};     // N per jet, primary and vernier jets
export const LIMITS = {vMin: 0.03, vMax: 0.1, lat: 0.1, ang: 4, roll: 4, rate: 0.4, latRate: 0.04};
export const DEG = 180 / Math.PI, RAD = Math.PI / 180;

// ---------- small vector and quaternion helpers ----------
export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scl = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const len = a => Math.hypot(a[0], a[1], a[2]);
export const mat3v = (M, v) => [M[0][0] * v[0] + M[0][1] * v[1] + M[0][2] * v[2], M[1][0] * v[0] + M[1][1] * v[1] + M[1][2] * v[2], M[2][0] * v[0] + M[2][1] * v[1] + M[2][2] * v[2]];
export function inv3(M) {
  const [a, b, c] = M[0], [d, e, f] = M[1], [g, h, i] = M[2], A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g, det = a * A + b * B + c * C;
  return [[A / det, -(b * i - c * h) / det, (b * f - c * e) / det], [B / det, (a * i - c * g) / det, -(a * f - c * d) / det], [C / det, -(a * h - b * g) / det, (a * e - b * d) / det]];
}
export const qmul = (a, b) => [a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3], a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2], a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1], a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0]];
export const qconj = q => [q[0], -q[1], -q[2], -q[3]];
export const qnorm = q => { const l = Math.hypot(q[0], q[1], q[2], q[3]) || 1; return [q[0] / l, q[1] / l, q[2] / l, q[3] / l]; };
export const qaxis = (axis, ang) => { const s = Math.sin(ang / 2), l = len(axis) || 1; return [Math.cos(ang / 2), axis[0] / l * s, axis[1] / l * s, axis[2] / l * s]; };
export function qrot(q, v) { // R(q) v
  const [w, x, y, z] = q, tx = 2 * (y * v[2] - z * v[1]), ty = 2 * (z * v[0] - x * v[2]), tz = 2 * (x * v[1] - y * v[0]);
  return [v[0] + w * tx + y * tz - z * ty, v[1] + w * ty + z * tx - x * tz, v[2] + w * tz + x * ty - y * tx];
}
export const qrotT = (q, v) => qrot(qconj(q), v);
// Rotation vector (axis times angle) of q, for small attitude errors.
export function qvec(q) { const s = q[0] < 0 ? -1 : 1, w = Math.min(1, Math.abs(q[0])), vn = Math.hypot(q[1], q[2], q[3]); if (vn < 1e-12) return [0, 0, 0]; const ang = 2 * Math.atan2(vn, w); return [q[1] * s / vn * ang, q[2] * s / vn * ang, q[3] * s / vn * ang]; }
// Euler sequence for a rotation vector given in degrees, applied in body axes.
export const qFromRotVec = r => { const a = len(r); return a < 1e-12 ? [1, 0, 0, 0] : qaxis(r, a); };

// ---------- the crew capsule ----------
// Body axes: +X out through the docking port (forward), +Y up, +Z right. 7.0 t dry, a full inertia tensor with
// small products of inertia, and a centre of mass a little off the geometric axis, as on any real capsule.
export const CAPSULE = {
  mDry: 7050,
  I: [[6200, 120, -60], [120, 10800, 35], [-60, 35, 11300]],
  com: [-0.05, 0.02, -0.01],
  port: [2.25, 0, 0],        // docking ring face
  cam: [1.7, 1.25, 0],       // docking camera on a short boom, looking along +X
  radius: 1.5                // keep-out sphere for structure strikes
};
const PODS = {T: [0, 1, 0], R: [0, 0, 1], B: [0, -1, 0], L: [0, 0, -1]};
const RING = {F: [1.0, 1.15], A: [-0.9, 1.8]}; // [x, radius] of the forward and aft thruster rings
// Twenty jets in real positions. Each lists the hand controller commands that select it (the jet select logic).
export const JETS = (() => {
  const J = [], put = (name, ring, pod, dir, groups) => { const [x, r] = RING[ring], u = PODS[pod]; J.push({name, ring, pod, pos: [x, u[1] * r, u[2] * r], dir, groups}); };
  for (const p of 'TRBL') put(`F-ax-${p}`, 'F', p, [-1, 0, 0], ['-tx']);
  for (const p of 'TRBL') put(`A-ax-${p}`, 'A', p, [1, 0, 0], ['+tx']);
  const G = {F: {T: ['-ty', '-rz'], B: ['+ty', '+rz'], R: ['-tz', '+ry'], L: ['+tz', '-ry']}, A: {T: ['-ty', '+rz'], B: ['+ty', '-rz'], R: ['-tz', '-ry'], L: ['+tz', '+ry']}};
  for (const ring of 'FA') for (const p of 'TRBL') put(`${ring}-rad-${p}`, ring, p, scl(PODS[p], -1), G[ring][p]);
  put('A-tan-T+', 'A', 'T', [0, 0, 1], ['+rx']); put('A-tan-B-', 'A', 'B', [0, 0, -1], ['+rx']);
  put('A-tan-T-', 'A', 'T', [0, 0, -1], ['-rx']); put('A-tan-B+', 'A', 'B', [0, 0, 1], ['-rx']);
  return J;
})();
const AXES = ['tx', 'ty', 'tz', 'rx', 'ry', 'rz'];
const GROUP = {}; for (const a of AXES) for (const s of '+-') GROUP[s + a] = JETS.map((j, i) => j.groups.includes(s + a) ? i : -1).filter(i => i >= 0);
// Torque about the centre of mass, per newton, for every jet.
const LEVER = JETS.map(j => cross(sub(j.pos, CAPSULE.com), j.dir));
const I_CAP_INV = inv3(CAPSULE.I);
// Angular acceleration (rad/s^2 per newton of jet thrust) of each rotation group, for the rate damper.
const ALPHA = ['rx', 'ry', 'rz'].map((a, k) => { const t = GROUP['+' + a].reduce((s, i) => add(s, LEVER[i]), [0, 0, 0]); return mat3v(I_CAP_INV, t)[k]; });
export function groupForceTorque(name) { let F = [0, 0, 0], T = [0, 0, 0]; for (const i of GROUP[name]) { F = add(F, JETS[i].dir); T = add(T, LEVER[i]); } return {F, T}; }

// ---------- the station ----------
// An original design: a long pressurised core along X with a docking adapter at the +X end facing prograde,
// a truss across it along Z carrying four solar wings, radiators and two side modules.
export const STATION = {
  mass: 118000,
  I: [[3.1e6, 0, 0], [0, 9.4e6, 0], [0, 0, 8.2e6]],
  portFace: 12.6, ringOut: 0.35,         // the soft capture ring stands 0.35 m proud until it retracts
  target: [11.0, 1.25, 0], standoff: 0.5, // docking target base on the node face, cross on a 0.5 m standoff
  // keep-out boxes in station body axes [min, max]
  boxes: [
    [[-20.5, -2.2, -2.2], [11.0, 2.2, 2.2]],     // service module, core and node
    [[11.0, -0.95, -0.95], [12.6, 0.95, 0.95]],  // docking adapter
    [[-5.0, -0.7, -24], [-3.0, 0.7, 24]],        // truss
    [[-10.0, -6.0, -21.5], [2.0, 6.0, -6.5]],    // solar wings, port side (they turn, so the box is generous)
    [[-10.0, -6.0, 6.5], [2.0, 6.0, 21.5]],      // solar wings, starboard
    [[-12, 2.2, -1.2], [-8, 9.5, 1.2]],          // radiator mast and panels
    [[-1.9, -9.5, -1.9], [1.9, -2.2, 1.9]],      // nadir module
    [[-20, -0.4, -8], [-17, 0.4, 8]]             // service module arrays
  ]
};
const I_ST_INV = inv3(STATION.I);

// ---------- dynamics ----------
// Frame rotation of LVLH relative to inertial space, in LVLH axes.
export const frameRate = n => [0, 0, -n];
// Clohessy-Wiltshire acceleration in this frame (x along track, y radial, z = -normal).
export function cwAccel(p, v, n) { return [-2 * n * v[1], 3 * n * n * p[1] + 2 * n * v[0], -n * n * p[2]]; }
// Closed form CW coast, used for the trajectory prediction and the tests.
export function cwCoast(p, v, n, t) {
  const s = Math.sin(n * t), c = Math.cos(n * t), x0 = p[1], y0 = p[0], z0 = p[2], xd = v[1], yd = v[0], zd = v[2];
  const x = (4 - 3 * c) * x0 + s / n * xd + 2 / n * (1 - c) * yd;
  const y = 6 * (s - n * t) * x0 + y0 - 2 / n * (1 - c) * xd + (4 * s - 3 * n * t) / n * yd;
  const z = c * z0 + s / n * zd;
  const xdt = 3 * n * s * x0 + c * xd + 2 * s * yd, ydt = 6 * n * (c - 1) * x0 - 2 * s * xd + (4 * c - 3) * yd, zdt = -n * s * z0 + c * zd;
  return {p: [y, x, z], v: [ydt, xdt, zdt]};
}
// Rigid body rotation: q' = q (x) (w - R^T Omega)/2, I w' = tau - w x I w. Gravity gradient included.
function rotDeriv(q, w, I, Iinv, tauB, n) {
  const Om = frameRate(n), wr = sub(w, qrotT(q, Om)), qd = qmul(q, [0, wr[0], wr[1], wr[2]]).map(x => x * 0.5);
  let tau = tauB; if (n) { const u = qrotT(q, [0, 1, 0]); tau = add(tau, scl(cross(u, mat3v(I, u)), 3 * n * n)); }
  const wd = mat3v(Iinv, sub(tau, cross(w, mat3v(I, w))));
  return [qd, wd];
}
function rk4Rot(b, I, Iinv, tauB, n, h) {
  const {q, w} = b, f = (qq, ww) => rotDeriv(qq, ww, I, Iinv, tauB, n);
  const [q1, w1] = f(q, w), [q2, w2] = f(add4(q, q1, h / 2), add(w, scl(w1, h / 2))), [q3, w3] = f(add4(q, q2, h / 2), add(w, scl(w2, h / 2))), [q4, w4] = f(add4(q, q3, h), add(w, scl(w3, h)));
  b.q = qnorm([0, 1, 2, 3].map(i => q[i] + h / 6 * (q1[i] + 2 * q2[i] + 2 * q3[i] + q4[i])));
  b.w = [0, 1, 2].map(i => w[i] + h / 6 * (w1[i] + 2 * w2[i] + 2 * w3[i] + w4[i]));
}
const add4 = (q, d, k) => [q[0] + d[0] * k, q[1] + d[1] * k, q[2] + d[2] * k, q[3] + d[3] * k];
function rk4Trans(b, aT, n, h) {
  const f = (p, v) => [v, add(aT, cwAccel(p, v, n))], {p, v} = b;
  const [p1, v1] = f(p, v), [p2, v2] = f(add(p, scl(p1, h / 2)), add(v, scl(v1, h / 2))), [p3, v3] = f(add(p, scl(p2, h / 2)), add(v, scl(v2, h / 2))), [p4, v4] = f(add(p, scl(p3, h)), add(v, scl(v3, h)));
  b.p = [0, 1, 2].map(i => p[i] + h / 6 * (p1[i] + 2 * p2[i] + 2 * p3[i] + p4[i]));
  b.v = [0, 1, 2].map(i => v[i] + h / 6 * (v1[i] + 2 * v2[i] + 2 * v3[i] + v4[i]));
}

// ---------- a run ----------
// level.start: offsets of the capsule port from the station port in port axes (ax out along the port axis, y up, z),
// velocity in port axes, attitude error (deg, capsule body roll/yaw/pitch) and relative rates (deg/s).
export function makeSim(level, opts = {}) {
  const n = opts.n ?? N_LEO, st = level.station || {};
  const station = {q: [1, 0, 0, 0], w: [0, 0, 0], held: !st.spin};
  const s0 = level.start, sim = {t: 0, n, level, station, phase: 'fly', prop: level.fuel, prop0: level.fuel, jets: new Float32Array(JETS.length), events: [], bounces: 0, warp: 1, fineUsed: 0, log: []};
  station.w = qrotT(station.q, frameRate(n)); // a held station turns with LVLH once an orbit
  if (st.spin) station.w = add(station.w, scl(st.spin, RAD));
  // Desired capsule attitude: nose (+X) down the port axis (-X of the port), tops aligned.
  const qd = qmul(station.q, qaxis([0, 1, 0], Math.PI)), att = s0.att || [0, 0, 0];
  const qc = qnorm(qmul(qd, qFromRotVec(scl(att, RAD))));
  const portW = portWorld(sim), axW = qrot(station.q, [1, 0, 0]);
  const relW = qrot(station.q, [s0.ax, s0.y || 0, s0.z || 0]);
  const capPort = add(portW, relW), armW = qrot(qc, sub(CAPSULE.port, CAPSULE.com));
  const wStLvlh = sub(qrot(station.q, station.w), frameRate(n));
  const vPort = cross(wStLvlh, portW), vRel = qrot(station.q, s0.v || [0, 0, 0]);
  // Relative rates are added on top of the station's own inertial rate, so a capsule started "still" holds still.
  const wRelBody = scl(s0.rates || [0, 0, 0], RAD), wStInCap = qrotT(qc, qrot(station.q, station.w));
  sim.cap = {p: sub(capPort, armW), v: add(vPort, vRel), q: qc, w: add(wStInCap, wRelBody)};
  if (s0.natural) { // start on a natural CW drift: constant height, drifting along track at -1.5 n y
    sim.cap.v = [-1.5 * n * sim.cap.p[1], 0, 0]; void axW;
  }
  sim.prevAx = rel(sim).ax;
  return sim;
}
export function portWorld(sim, ext = STATION.ringOut) { return qrot(sim.station.q, [STATION.portFace + ext, 0, 0]); }
export const capMass = sim => CAPSULE.mDry + Math.max(0, sim.prop);

// Hand controller input: {t:[tx,ty,tz], r:[rx,ry,rz]} each -1..1, fine: bool, assist: bool. Returns jet levels 0..1.
export function selectJets(sim, input) {
  const L = sim.jets; L.fill(0); if (sim.phase !== 'fly' || sim.prop <= 0) return L;
  const cmd = [...(input.t || [0, 0, 0]), ...(input.r || [0, 0, 0])];
  if (input.assist) { // kill rotation: null the rate relative to the station on any axis not being commanded
    const wr = relRates(sim), thrust = input.fine ? THRUST.fine : THRUST.coarse, h = input.h || 1 / 60;
    for (let k = 0; k < 3; k++) if (Math.abs(cmd[3 + k]) < 0.01 && Math.abs(wr[k]) > 0.012 * RAD) cmd[3 + k] = Math.max(-1, Math.min(1, -wr[k] / (ALPHA[k] * thrust * h * 4)));
  }
  for (let a = 0; a < 6; a++) { const c = cmd[a]; if (!c) continue; for (const i of GROUP[(c > 0 ? '+' : '-') + AXES[a]]) L[i] = Math.max(L[i], Math.min(1, Math.abs(c))); }
  return L;
}

// Advance the run by h seconds with the given input. Mutates sim.
export function step(sim, input, h) {
  sim.t += h; const n = sim.n, st = sim.station, cap = sim.cap;
  if (!st.held) rk4Rot(st, STATION.I, I_ST_INV, [0, 0, 0], n, h);
  if (sim.phase === 'soft' || sim.phase === 'hard' || sim.phase === 'docked') { capture(sim, h); return sim; }
  if (sim.phase !== 'fly') { coast(sim, h); return sim; }
  const L = selectJets(sim, {...input, h}), thrust = input.fine ? THRUST.fine : THRUST.coarse;
  let F = [0, 0, 0], T = [0, 0, 0], total = 0;
  for (let i = 0; i < L.length; i++) if (L[i]) { const f = L[i] * thrust; F = add(F, scl(JETS[i].dir, f)); T = add(T, scl(LEVER[i], f)); total += f; }
  const mdot = total / (ISP * G0), m = capMass(sim);
  if (input.fine && total) sim.fineUsed += h;
  rk4Trans(cap, scl(qrot(cap.q, F), 1 / m), n, h);
  rk4Rot(cap, CAPSULE.I, I_CAP_INV, T, n, h);
  sim.prop = Math.max(0, sim.prop - mdot * h);
  contact(sim);
  return sim;
}
function coast(sim, h) { rk4Trans(sim.cap, [0, 0, 0], sim.n, h); rk4Rot(sim.cap, CAPSULE.I, I_CAP_INV, [0, 0, 0], sim.n, h); }

// Everything the HUD, the pilot and the docking check need, relative to the station port.
export function rel(sim) {
  const st = sim.station, cap = sim.cap, ext = sim.phase === 'fly' ? STATION.ringOut : (sim.capture?.ring ?? STATION.ringOut);
  const Ps = portWorld(sim, ext), arm = qrot(cap.q, sub(CAPSULE.port, CAPSULE.com)), Pc = add(cap.p, arm);
  const wsL = sub(qrot(st.q, st.w), frameRate(sim.n)), wcL = sub(qrot(cap.q, cap.w), frameRate(sim.n));
  const vc = add(cap.v, cross(wcL, arm)), vs = cross(wsL, Ps), d = qrotT(st.q, sub(Pc, Ps)), vr = qrotT(st.q, sub(vc, vs));
  const qd = qmul(st.q, qaxis([0, 1, 0], Math.PI)), e = qvec(qmul(qconj(qd), cap.q)); // body axes error
  const wr = qrotT(cap.q, sub(wcL, wsL)), dd = sub(vr, cross(qrotT(st.q, wsL), d)); // rate of change of the offsets, in port axes
  const noseW = qrot(cap.q, [1, 0, 0]), axW = qrot(st.q, [1, 0, 0]), ang = Math.acos(Math.max(-1, Math.min(1, -dot(noseW, axW)))) * DEG;
  return {ax: d[0], y: d[1], z: d[2], lat: Math.hypot(d[1], d[2]), vax: vr[0], vy: vr[1], vz: vr[2], closing: -vr[0], latRate: Math.hypot(vr[1], vr[2]),
    dax: dd[0], dy: dd[1], dz: dd[2], range: len(sub(Ps, Pc)), roll: e[0] * DEG, yaw: e[1] * DEG, pitch: e[2] * DEG, ang, rates: scl(wr, DEG), rate: len(wr) * DEG, Pc, Ps, vc, vs};
}
export function relRates(sim) { const st = sim.station, cap = sim.cap; return qrotT(cap.q, sub(qrot(cap.q, cap.w), qrot(st.q, st.w))); }

// Contact with the soft capture ring, and strikes on the rest of the station.
function contact(sim) {
  const r = rel(sim), prev = sim.prevAx; sim.prevAx = r.ax;
  if (prev > 0 && r.ax <= 0 && r.lat < 0.6) {
    const c = {closing: r.closing, lat: r.lat, ang: r.ang, roll: Math.abs(r.roll), rate: r.rate, latRate: r.latRate, t: sim.t};
    const ok = c.closing >= LIMITS.vMin && c.closing <= LIMITS.vMax && c.lat < LIMITS.lat && c.ang < LIMITS.ang && c.roll < LIMITS.roll && c.rate < LIMITS.rate && c.latRate < LIMITS.latRate;
    sim.contact = c;
    if (ok) { startCapture(sim); sim.events.push({type: 'soft', t: sim.t}); return; }
    const why = reasons(c);
    if (c.closing > 0.25 || c.lat > 0.35) { sim.phase = 'crash'; sim.fault = `Hit the docking mechanism at ${c.closing.toFixed(2)} m/s, ${c.lat.toFixed(2)} m off the centreline. ${why}`; sim.events.push({type: 'crash', t: sim.t}); return; }
    // No capture: the ring's springs push the capsule back out. Lose most of the closing speed.
    sim.bounces++; sim.events.push({type: 'bounce', t: sim.t, why});
    const axW = qrot(sim.station.q, [1, 0, 0]), dv = (1 + 0.4) * Math.max(0, c.closing);
    sim.cap.v = add(sim.cap.v, scl(axW, dv + 0.005)); sim.cap.w = add(sim.cap.w, [0.001 * Math.sign(r.y || 1), 0.0015 * Math.sign(r.z || 1), 0.0008]);
    sim.lastBounce = why;
    return;
  }
  if (r.ax < -0.08 && r.lat < 1.2) { sim.phase = 'crash'; sim.fault = 'Rammed through the soft capture ring.'; sim.events.push({type: 'crash', t: sim.t}); return; }
  if (prev > 0 && r.ax <= 0 && r.lat < 2.4) { sim.phase = 'crash'; sim.fault = `Missed the port by ${r.lat.toFixed(2)} m and struck the station.`; sim.events.push({type: 'crash', t: sim.t}); return; }
  // Structure: capsule keep-out sphere against the station boxes, in station axes.
  const c = qrotT(sim.station.q, sim.cap.p), R = CAPSULE.radius;
  for (const [mn, mx] of STATION.boxes) {
    let d2 = 0; for (let k = 0; k < 3; k++) { const v = c[k] < mn[k] ? mn[k] - c[k] : c[k] > mx[k] ? c[k] - mx[k] : 0; d2 += v * v; }
    if (d2 < R * R) { sim.phase = 'crash'; sim.fault = 'Struck the station structure.'; sim.events.push({type: 'crash', t: sim.t}); return; }
  }
  if (r.range > (sim.level.lost || 3000)) { sim.phase = 'lost'; sim.fault = 'Drifted out of range of the station.'; }
}
export function reasons(c) {
  const out = [];
  if (c.closing < LIMITS.vMin) out.push(`too slow to trip the capture latches (${c.closing.toFixed(3)} m/s, needs ${LIMITS.vMin})`);
  if (c.closing > LIMITS.vMax) out.push(`too fast (${c.closing.toFixed(3)} m/s, limit ${LIMITS.vMax})`);
  if (c.lat >= LIMITS.lat) out.push(`${c.lat.toFixed(2)} m off the centreline (limit ${LIMITS.lat})`);
  if (c.ang >= LIMITS.ang) out.push(`${c.ang.toFixed(1)}° misaligned (limit ${LIMITS.ang}°)`);
  if (c.roll >= LIMITS.roll) out.push(`${c.roll.toFixed(1)}° of roll (limit ${LIMITS.roll}°)`);
  if (c.rate >= LIMITS.rate) out.push(`turning at ${c.rate.toFixed(2)}°/s (limit ${LIMITS.rate})`);
  if (c.latRate >= LIMITS.latRate) out.push(`sliding sideways at ${c.latRate.toFixed(3)} m/s (limit ${LIMITS.latRate})`);
  return out.length ? out.join(', ') : '';
}

// Soft capture: latches grab, the ring's dampers soak up the residual motion and pull the capsule into line,
// then the ring retracts 0.35 m and twelve hooks drive closed for hard capture.
export const CAPTURE = {align: 2.5, retract: 4.0, hooks: 2.5};
function startCapture(sim) {
  const st = sim.station, cap = sim.cap, r = rel(sim);
  sim.phase = 'soft';
  const qd = qmul(st.q, qaxis([0, 1, 0], Math.PI));
  sim.capture = {t: 0, ring: STATION.ringOut, hooks: 0, d0: [Math.max(0, r.ax), r.y, r.z], e0: qmul(qconj(qd), cap.q)};
}
function capture(sim, h) {
  const c = sim.capture, st = sim.station, A = CAPTURE; c.t += h;
  const k = Math.min(1, c.t / A.align), ease = 1 - (1 - k) ** 3;
  const kr = Math.max(0, Math.min(1, (c.t - A.align) / A.retract)); c.ring = STATION.ringOut * (1 - (kr * kr * (3 - 2 * kr)));
  c.hooks = Math.max(0, Math.min(1, (c.t - A.align - A.retract) / A.hooks));
  if (sim.phase === 'soft' && kr > 0) { sim.phase = 'hard'; sim.events.push({type: 'retract', t: sim.t}); }
  if (sim.phase === 'hard' && c.hooks >= 1) { sim.phase = 'docked'; sim.events.push({type: 'hard', t: sim.t}); }
  // Damped relative pose: slerp the attitude error and offsets toward zero.
  const e = qvec(c.e0), qe = qFromRotVec(scl(e, 1 - ease)), qd = qmul(st.q, qaxis([0, 1, 0], Math.PI));
  const q = qmul(qd, qe), d = [c.d0[0] * (1 - ease), c.d0[1] * (1 - ease), c.d0[2] * (1 - ease)];
  const Ps = portWorld(sim, c.ring), Pc = add(Ps, qrot(st.q, d)), arm = qrot(q, sub(CAPSULE.port, CAPSULE.com));
  const p = sub(Pc, arm), wsL = sub(qrot(st.q, st.w), frameRate(sim.n));
  sim.cap.v = scl(sub(p, sim.cap.p), 1 / h); sim.cap.p = p; sim.cap.q = q; sim.cap.w = qrotT(q, add(wsL, frameRate(sim.n)));
}

// Score a docking: precision, fuel and time, less a little for every bounce.
export function score(sim) {
  if (sim.phase !== 'docked' && sim.phase !== 'hard' && sim.phase !== 'soft') return {total: 0};
  const c = sim.contact, cl = x => Math.max(0, Math.min(1, x));
  const parts = {
    speed: Math.round(250 * cl(1 - Math.abs(c.closing - 0.065) / 0.035)),
    centre: Math.round(250 * cl(1 - c.lat / LIMITS.lat)),
    align: Math.round(150 * cl(1 - c.ang / LIMITS.ang) + 50 * cl(1 - c.roll / LIMITS.roll)),
    rates: Math.round(100 * cl(1 - c.rate / LIMITS.rate)),
    fuel: Math.round(250 * cl(sim.prop / sim.prop0)),
    time: Math.round(200 * cl(1.5 - c.t / sim.level.par))
  };
  const total = Math.max(0, parts.speed + parts.centre + parts.align + parts.rates + parts.fuel + parts.time - 100 * sim.bounces);
  return {parts, total};
}
export function rank(total) { return total >= 1050 ? 'Flawless' : total >= 850 ? 'Clean capture' : total >= 600 ? 'Captured' : 'Docked, just'; }

// Time warp allowed at this range. The last 8 m are flown in real time.
export const WARPS = [1, 2, 5, 10, 25, 50, 100];
export function maxWarp(range) { return range > 1000 ? 100 : range > 300 ? 50 : range > 100 ? 10 : range > 30 ? 5 : range > 8 ? 2 : 1; }

// Sun direction in LVLH: inertially fixed, so it turns at +n about +Z. Eclipse when Earth's disc covers it.
export function sunDir(sim) {
  const L = sim.level, a = (L.sun ?? 40) * RAD + sim.n * sim.t, b = (L.beta ?? 20) * RAD;
  return [Math.cos(a) * Math.cos(b), Math.sin(a) * Math.cos(b), Math.sin(b)];
}
export const EARTH_HALF_ANGLE = Math.asin(RE / R_ORBIT) * DEG; // 70.2 deg
export function sunlit(sim) { const s = sunDir(sim), e = Math.acos(Math.max(-1, Math.min(1, -s[1]))) * DEG; return Math.max(0, Math.min(1, (e - EARTH_HALF_ANGLE + 0.7) / 1.4)); }
