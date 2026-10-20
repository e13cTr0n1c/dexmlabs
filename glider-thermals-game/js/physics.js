// Sailplane physics. Pure functions on plain objects, no DOM, so the tests run them in Node.
// A point mass with lift and drag from a real drag polar (CD = CD0 + k CL²), flown in 2.5D: x along the
// course, z across it, h up. Bank turns you (rate g tanφ / V). The air moves: wind along x, thermals
// (columns of rising air under cumulus, leaning downwind), ridge lift on windward slopes and mountain wave.
import {rng} from './daily.js';
export const G = 9.81, DEG = 180 / Math.PI, KMH = 3.6;
export const GL = {m: 450, S: 14, cd0: 0.011, k: 0.022, clmax: 1.4, brakeCd: 0.09, brakeCl: 0.1, vne: 75, bankMax: 0.9, rollRate: 0.6};
const clamp = (v, a, b) => v < a ? a : v > b ? b : v, wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
export const rho = h => 1.225 * Math.exp(-Math.max(0, h) / 9000);
export const clFor = (V, h = 0) => 2 * GL.m * G / (rho(h) * GL.S * V * V);
export const stallSpeed = (phi = 0, h = 0) => Math.sqrt(2 * GL.m * G / (rho(h) * GL.S * GL.clmax * Math.cos(phi)));
// Still air sink rate at airspeed V in a turn of bank phi: the glide polar.
export function sinkRate(V, phi = 0, h = 0, brake = 0) { const cl = clFor(V, h) / Math.cos(phi), cd = GL.cd0 + GL.k * cl * cl + brake * GL.brakeCd; return V * cd / (cl * Math.cos(phi)); }
// Speed to fly: the airspeed that gives the best average speed for a MacCready setting mc, in air sinking at airSink.
export function speedToFly(mc = 1, airSink = 0, h = 0) { let best = 20, bv = -Infinity; for (let V = stallSpeed(0, h) + 1; V < GL.vne; V += 0.25) { const v = V / (sinkRate(V, 0, h) + airSink + mc); if (v > bv) { bv = v; best = V; } } return best; }
export const minSinkSpeed = (phi = 0, h = 0) => { let best = 20, bs = 9; for (let V = stallSpeed(phi, h) + 0.5; V < 40; V += 0.1) { const s = sinkRate(V, phi, h); if (s < bs) { bs = s; best = V; } } return best; };
export const turnRadius = (V, phi) => V * V / (G * Math.tan(Math.abs(phi)));

// Terrain: hills and ridges as smooth bumps, with the kind of ground under each stretch.
export function groundH(w, x) { let g = 0; for (const b of w.hills) { const u = (x - b.x) / (x < b.x ? b.up : b.down); g += b.h * Math.exp(-u * u); } return g; }
export const surface = (w, x) => { for (const f of w.surface) if (x >= f.x0 && x <= f.x1) return f; return {kind: 'field', x0: -1e9, x1: 1e9}; };
export const slope = (w, x) => (groundH(w, x + 5) - groundH(w, x - 5)) / 10;
export const windAt = (w, h, t = 0) => { const W = w.level.wind || {base: 0, gust: 0}; return W.base * (0.65 + 0.35 * Math.min(1, Math.max(0, h) / 1200)) + (W.gust || 0) * Math.sin(0.05 * t + w.phase); };
// Vertical air speed at a point.
export function lift(w, x, z, h, t = 0) {
  const agl = h - groundH(w, x), u = windAt(w, h, t); let up = 0, inThermal = false;
  for (const q of w.thermals) { const cx = q.x + u * Math.max(0, h) / 3.2, d = Math.hypot(x - cx, z - q.z), rr = d / q.r; if (rr > 3) continue;
    const fh = clamp(agl / 150, 0, 1) * clamp((q.base - 40 - h) / 200, 0, 1); up += q.w * fh * (Math.exp(-rr * rr) - 0.28 * Math.exp(-(((rr - 1.6) / 0.45) ** 2))); if (rr < 1.2) inThermal = true; }
  if (!inThermal) up -= w.sink * clamp(agl / 150, 0.3, 1);
  for (const r of w.ridges) { const dx = x - r.x; if (u * r.face <= 0) continue; // only when the wind blows onto the face
    const front = -r.face * dx; if (front < -150 || front > 900) continue; const top = groundH(w, r.x), above = h - top;
    up += Math.abs(u) * 0.6 * Math.exp(-(((front - 200) / 400) ** 2)) * clamp(1 - above / 550, 0, 1) * clamp(agl / 30, 0, 1); }
  for (const v of w.waves) { if (h < v.hmin || h > v.hmax) continue; const fh = clamp((h - v.hmin) / 120, 0, 1) * clamp((v.hmax - h) / 400, 0, 1), ph = (x - v.x) / v.lambda; if (ph < 0 || ph > v.n) continue; up += v.amp * fh * Math.sin(2 * Math.PI * ph); }
  return up;
}
export function makeWorld(L, seed = 1, o = {}) {
  const r = rng(seed >>> 0 || 1), w = {level: L, seed, assist: {trim: o.trim ?? true}, hills: L.hills || [], surface: L.surface || [], thermals: (L.thermals || []).map(q => ({...q, z: q.z || 0})),
    ridges: L.ridges || [], waves: L.waves || [], sink: L.sink ?? 0.4, tps: (L.tps || []).map(p => ({r: 500, z: 0, ...p})), finish: L.finish || null, phase: r() * 6.28, par: L.par, target: L.target || 0, warp: o.warp || 1};
  // Birds: a few circling in each of the first thermals, on their own little circles.
  w.birds = []; w.thermals.forEach((q, i) => { const n = q.birds ?? 3; for (let k = 0; k < n; k++) w.birds.push({q: i, a: r() * 6.28, rad: 25 + r() * 50, h: Math.min(q.base - 150, 250 + r() * (q.base - 400)), sp: 0.25 + r() * 0.1}); });
  const st = L.start; w.start = {t: 0, x: st.x, z: st.z || 0, h: groundH(w, st.x) + st.agl, V: st.V || 26, gam: -0.03, psi: st.psi || 0, phi: 0, cl: clFor(st.V || 26), brake: 0, trimOff: 0, tp: 0,
    vario: 0, vz: 0, stall: false, stalls: 0, overspeed: 0, onGround: false, done: false, ok: false, fault: null, landed: null, climbT: 0, climbH: 0, maxH: 0, ev: [], trail: [], dist: 0, lastTp: {x: st.x, z: st.z || 0}, start: {x: st.x, z: st.z || 0}};
  w.start.maxH = w.start.h; return w;
}
export const clone = s => ({...s, trail: s.trail.slice(), ev: [], lastTp: {...s.lastTp}, start: {...s.start}});
const fail = (s, k, text) => { if (s.done) return; s.done = true; s.ok = false; s.fault = {k, text}; s.ev.push({k: 'fail', f: k}); };
// What the autotrim aims for: speed to fly when straight, minimum sink in a turn, approach speed low down.
export function trimTarget(w, s) { const agl = s.h - groundH(w, s.x); let v;
  if (agl < 220) v = 26; else if (Math.abs(s.phi) > 0.3) v = minSinkSpeed(s.phi, s.h) + 1.5; else v = speedToFly(1, -Math.min(0, liftAt(w, s)), s.h);
  return clamp(v + s.trimOff, stallSpeed(s.phi, s.h) + 2.5, GL.vne - 5); }
export const liftAt = (w, s) => lift(w, s.x, s.z, s.h, s.t);
function sub(w, s, inp, h) {
  const roll = inp.roll || 0, pitch = inp.pitch || 0, agl = s.h - groundH(w, s.x);
  s.brake = clamp(s.brake + (inp.brake ? 2 : -2) * h, 0, 1);
  if (s.onGround) return groundRoll(w, s, h);
  // Bank: A and D roll; let go and it holds the bank, or creeps steeper without the assist.
  if (roll) s.phi = clamp(s.phi + roll * GL.rollRate * h, -GL.bankMax, GL.bankMax); else if (w.assist.trim) { if (Math.abs(s.phi) < 0.06) s.phi *= 1 - 3 * h; } else s.phi += 0.03 * s.phi * h;
  // Pitch: with autotrim, W and S nudge the trimmed speed and the trim flies it, with a flare at the bottom;
  // without it, W and S move the stick and the glider does what the air says.
  let cl;
  if (w.assist.trim) { s.trimOff = clamp(s.trimOff + pitch * 2 * h, -8, 25); const vt = trimTarget(w, s); let c = clFor(vt, s.h) / Math.cos(s.phi) + 0.035 * (s.V - vt) - 1.6 * (s.gam + sinkRate(vt, s.phi, s.h) / vt);
    if (agl < 12) { const gt = -0.004 * agl - 0.012; c = clFor(s.V, s.h) / Math.cos(s.phi) + 4 * (gt - s.gam); } // the flare
    cl = clamp(c, -0.2, GL.clmax - 0.04); s.cl += clamp(cl - s.cl, -1.2 * h, 1.2 * h); }
  else s.cl = clamp(s.cl - pitch * 0.5 * h, -0.3, GL.clmax + 0.3);
  // Stall: past CLmax the lift falls away, drag climbs and a wing drops.
  let cle = s.cl; const was = s.stall; s.stall = s.cl > GL.clmax; if (s.stall) { cle = GL.clmax * 0.7; s.phi += Math.sin(s.t * 1.7 + w.phase) * 0.7 * h; if (!was) { s.stalls++; s.ev.push({k: 'stall'}); } }
  cle -= s.brake * GL.brakeCl;
  const ge = agl < 15 ? 1 - 0.4 * (1 - agl / 15) : 1, q = 0.5 * rho(s.h) * s.V * s.V, L = q * GL.S * cle, D = q * GL.S * (GL.cd0 + GL.k * ge * cle * cle + s.brake * GL.brakeCd + (s.stall ? 0.08 : 0)), m = GL.m;
  const dV = -D / m - G * Math.sin(s.gam);
  s.V = Math.max(8, s.V + dV * h); s.gam += (L * Math.cos(s.phi) / (m * s.V) - G * Math.cos(s.gam) / s.V) * h; s.gam = clamp(s.gam, -1.2, 1.2);
  s.psi = wrap(s.psi + L * Math.sin(s.phi) / (m * s.V * Math.max(0.3, Math.cos(s.gam))) * h);
  const u = windAt(w, s.h, s.t), up = lift(w, s.x, s.z, s.h, s.t), vx = s.V * Math.cos(s.gam) * Math.cos(s.psi) + u, vz = s.V * Math.cos(s.gam) * Math.sin(s.psi), vh = s.V * Math.sin(s.gam) + up;
  s.x += vx * h; s.z += vz * h; s.h += vh * h; s.vz = vh; s.vgx = vx; s.vgz = vz; s.air = up;
  // Total energy vario: climb plus the height you could swap your speed for, with a little lag.
  const te = vh + s.V * dV / G; s.vario += (te - s.vario) * Math.min(1, h / 0.8);
  if (s.V > GL.vne) { if (!s.over) { s.overspeed++; s.ev.push({k: 'vne'}); } s.over = true; if (s.V > GL.vne + 12) return fail(s, 'vne', 'Too fast. Past the never exceed speed the wings flutter and fail.'); } else s.over = false;
  s.maxH = Math.max(s.maxH, s.h);
  const g = groundH(w, s.x); if (s.h <= g) touchdown(w, s, g, -vh);
}
function touchdown(w, s, g, sink) {
  const f = surface(w, s.x), sl = Math.abs(slope(w, s.x)); s.h = g;
  const spd = s.V * KMH, bad = f.kind === 'forest' ? 'into the trees' : f.kind === 'town' ? 'among the houses' : f.kind === 'water' ? 'in the water' : null;
  if (sink > 3.5 || s.V > 42 || Math.abs(s.phi) > 0.3 || sl > 0.18) return fail(s, 'crash', sl > 0.18 ? 'Into the hillside.' : Math.abs(s.phi) > 0.3 ? 'A wing tip hit the ground and the glider cartwheeled.' : `Touched down at ${sink.toFixed(1)} m/s and ${spd.toFixed(0)} km/h. Too hard.`);
  if (bad) return fail(s, 'rough', `Landed ${bad}. Pick an open field next time.`);
  s.onGround = true; s.gam = 0; s.phi = 0; s.td = {sink, V: s.V, x: s.x, z: s.z, kind: f.kind, field: f}; s.ev.push({k: 'touch', sink, kind: f.kind});
}
function groundRoll(w, s, h) {
  s.V = Math.max(0, s.V - (1.6 + 3.5 * s.brake) * h); const dx = s.V * Math.cos(s.psi), dz = s.V * Math.sin(s.psi); s.x += dx * h; s.z += dz * h; s.h = groundH(w, s.x); s.vz = 0; s.vario *= 1 - h;
  const f = surface(w, s.x); if (f.kind !== 'field' && f.kind !== 'airfield' && s.V > 4) return fail(s, 'hedge', `Rolled off the end of the field ${f.kind === 'water' ? 'into the water' : 'into the ' + (f.kind === 'town' ? 'houses' : 'trees')}.`);
  if (s.V <= 0.5) { s.V = 0; s.done = true; const fin = w.finish && s.td.kind === 'airfield' && s.x >= w.finish.x0 && s.x <= w.finish.x1;
    s.landed = {...s.td, stopX: s.x, stopZ: s.z, home: !!fin, spot: fin ? Math.hypot(s.x - w.finish.spot, s.z) : null};
    s.ok = w.finish ? (fin && s.tp >= w.tps.length) : true; if (!s.ok) s.fault = {k: fin ? 'tps' : 'outland', text: fin ? 'Landed at the finish, but a turnpoint was missed.' : 'Landed out, safely, short of the finish.'}; s.ev.push({k: 'stopped'}); }
}
export function step(w, s, inp = {}, dt = 1 / 60) {
  if (s.done) return s; s.ev = []; const n = 4, h = dt / n;
  for (let i = 0; i < n && !s.done; i++) sub(w, s, inp, h);
  s.t += dt; if (s.done) return s;
  if (!s.onGround) { if (Math.abs(s.phi) > 0.35 && s.vario > 0.2) { s.climbT += dt; s.climbH += s.vario * dt; }
    const p = w.tps[s.tp]; if (p && Math.hypot(s.x - p.x, s.z - p.z) < p.r) { s.ev.push({k: 'tp', i: s.tp, name: p.name}); s.dist += Math.hypot(p.x - s.lastTp.x, p.z - s.lastTp.z); s.lastTp = {x: p.x, z: p.z}; s.tp++; } }
  if ((s.trail.length === 0 || Math.hypot(s.x - s.trail[s.trail.length - 1][0], s.z - s.trail[s.trail.length - 1][1]) > 40)) { s.trail.push([s.x, s.z, s.h]); if (s.trail.length > 600) s.trail.shift(); }
  if (Math.abs(s.z) > 12000 || s.x < (w.level.bounds?.[0] ?? -20000) || s.x > (w.level.bounds?.[1] ?? 1e6)) fail(s, 'range', 'Lost. That is a long way off the task.');
  return s;
}
// How much of the task is done: whole legs plus progress along the current one, in metres.
export function progress(w, s) {
  const pts = [s.start, ...w.tps, ...(w.finish ? [{x: w.finish.spot, z: 0}] : [])]; let total = 0; for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
  if (!w.finish) { const d = Math.max(0, s.x - s.start.x); return {done: d, total: w.target, frac: clamp(d / w.target, 0, 1)}; }
  const i = s.tp, a = pts[i], b = pts[i + 1]; let done = 0; for (let k = 1; k <= i; k++) done += Math.hypot(pts[k].x - pts[k - 1].x, pts[k].z - pts[k - 1].z);
  if (b) { const L = Math.hypot(b.x - a.x, b.z - a.z), left = Math.hypot(b.x - s.x, b.z - s.z); done += clamp(L - left, 0, L); }
  if (s.ok) done = total; return {done, total, frac: clamp(done / total, 0, 1)};
}
// Scoring: route, speed against par, the landing, how well you climbed, and smooth flying.
export function parts(s, w) {
  const pr = progress(w, s), L = s.landed, safe = !!L;
  const route = Math.round(400 * (safe ? pr.frac : 0)), speed = Math.round(150 * (s.ok ? clamp(w.par / s.t, 0, 1) : 0));
  const soft = L ? clamp(1 - L.sink / 3.5, 0, 1) : 0, spot = L ? (L.spot != null ? clamp(1 - L.spot / 150, 0, 1) : clamp(Math.min(L.stopX - L.field.x0, L.field.x1 - L.stopX) / 150, 0, 1)) : 0;
  const landing = Math.round(250 * (0.5 * soft + 0.5 * spot)), avg = s.climbT > 20 ? s.climbH / s.climbT : null, climb = Math.round(100 * (avg == null ? 1 : clamp(avg / 1.6, 0, 1)));
  const smooth = Math.max(0, 100 - 35 * s.stalls - 30 * s.overspeed);
  const p = {route, speed, landing, climb, smooth, avgClimb: avg}; p.base = route + speed + landing + climb + smooth; p.mult = w.level.mult * (w.assist.trim ? 1 : 1.25); p.total = safe ? Math.round(p.base * p.mult) : 0; p.grade = grade(p.base); return p;
}
export const grade = b => b >= 900 ? 'S' : b >= 780 ? 'A' : b >= 640 ? 'B' : b >= 480 ? 'C' : 'D';
export const score = (s, w) => s.landed ? parts(s, w).total : 0;
