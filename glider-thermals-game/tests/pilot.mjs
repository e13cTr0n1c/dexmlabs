// The test autopilot. It only uses what a player has: A/D held or not, W/S held or not, and the airbrake key,
// a decision 10 times a sim second. It looks at the clouds the way a pilot would (it knows where each thermal is)
// and flies the same physics as everyone else.
import {step, groundH, surface, windAt, sinkRate, lift, GL} from '../js/physics.js';
export function fly(w, o = {}) { const s = structuredClone(w.start); let p = {}; for (let i = 0; i < 60 * (o.max || 5000) && !s.done; i++) { if (i % 6 === 0) p = decide(w, s); step(w, s, p, 1 / 60); } return s; }
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a)), clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const safeAt = (w, x) => { const k = surface(w, x).kind; return k === 'field' || k === 'airfield'; };
function heading(w, s, px, pz) { const b = Math.atan2(pz - s.z, px - s.x), u = windAt(w, s.h, s.t); return b + Math.asin(clamp(u * Math.sin(b) / s.V, -0.9, 0.9)); }
function ld(w, s, b) { const u = windAt(w, s.h, s.t), gs = s.V * 1.05 + u * Math.cos(b); return Math.max(4, gs / (sinkRate(28, 0, s.h) + w.sink * 0.8)); }
const bankFor = (w, s, psi, agl) => clamp(1.4 * wrap(psi - s.psi), agl < 60 ? -0.15 : -0.6, agl < 60 ? 0.15 : 0.6);
const rollTo = (s, phi) => phi - s.phi > 0.05 ? 1 : phi - s.phi < -0.05 ? -1 : 0;
function legs(w, s) { const pts = [{x: s.x, z: s.z}, ...w.tps.slice(s.tp), ...(w.finish ? [{x: w.finish.spot, z: 0}] : [])]; let need = 0;
  for (let i = 1; i < pts.length; i++) { const b = Math.atan2(pts[i].z - pts[i - 1].z, pts[i].x - pts[i - 1].x), d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z); need += d / ld(w, s, b); } return need; }
export function decide(w, s) {
  const M = s.ap || (s.ap = {mode: 'go', dir: 1, side: 1});
  if (s.onGround) return {roll: 0, pitch: 0, brake: true};
  const g = groundH(w, s.x), agl = s.h - g, u = windAt(w, s.h, s.t), goal = w.tps[s.tp] || (w.finish ? {x: w.finish.spot, z: 0, land: true} : null);
  let psi = s.psi, phi = null, brake = false;
  const need = legs(w, s) + 260 + (w.finish ? groundH(w, w.finish.spot) - g : 0);
  // Landing at the finish
  if (goal?.land && agl + 40 >= need - 260 + 80 && (M.mode === 'go' || M.mode.startsWith('land'))) return land(w, s, w.finish.spot, agl, M);
  if (M.mode.startsWith('land')) return land(w, s, M.spot, agl, M);
  // Climbing: stay in the lift until high enough or the top
  if (M.mode === 'climb') { const q = w.thermals[M.q], cx = q.x + u * s.h / 3.2, d = Math.hypot(s.x - cx, s.z - q.z);
    if (s.t - M.since > 60) { M.rate = (s.h - M.h0) / (s.t - M.since); M.since = s.t; M.h0 = s.h; }
    if (s.h > q.base - 260 || (agl > need + 320 && agl > 700) || M.rate < 0.3) { M.mode = 'go'; M.used = (M.used || []).concat(M.q); }
    else if (d > 0.4 * q.r) { psi = heading(w, s, cx, q.z); phi = clamp(bankFor(w, s, psi, agl), -0.7, 0.7); } else phi = M.side * 0.7; }
  if (M.mode === 'ridge' || M.mode === 'wave') { const top = M.mode === 'ridge' ? M.top : M.top; if (M.mode === 'wave' && s.h < w.waves[0].hmin - 30) { M.mode = 'go'; M.waveDone = false; M.doneLift = 0; }
    else if (s.h > top || (M.mode === 'ridge' && !w.waves.length && agl > need + 250)) { M.mode = 'go'; M.doneLift = (M.doneLift || 0) + 1; }
    else { if (Math.abs(s.z - M.z0) > 2500) M.side = -Math.sign(s.z - M.z0); const tx = M.mode === 'ridge' ? M.x - M.face * (agl < 90 ? 380 : 220) : M.x; psi = heading(w, s, tx, s.z + M.side * 2000); } }
  if (M.mode === 'go' && w.waves.length && !M.waveDone && s.h > w.waves[0].hmin + 230) { const v = w.waves[0]; M.mode = 'wave'; M.waveDone = true; M.x = v.x + v.lambda / 4; M.z0 = s.z; M.top = v.hmax - 600; M.side = 1; }
  if (M.mode === 'go') {
    if (agl < need) { // find lift
      let best = null, bc = Infinity;
      w.thermals.forEach((q, i) => { if ((M.used || []).includes(i) && agl > 350) return; if (q.base < s.h + 200) return; const cx = q.x + u * s.h / 3.2, d = Math.hypot(cx - s.x, q.z - s.z), b = Math.atan2(q.z - s.z, cx - s.x), reach = d / ld(w, s, b);
        if (reach > agl - 120) return; const c = d + (goal ? Math.hypot(goal.x - cx, goal.z - q.z) : 0) * 0.8; if (c < bc) { bc = c; best = i; } });
      if (best != null) { const q = w.thermals[best], cx = q.x + u * s.h / 3.2, d = Math.hypot(s.x - cx, s.z - q.z); psi = heading(w, s, cx, q.z); if (d < 0.45 * q.r && s.vario > 0.3) { M.mode = 'climb'; M.q = best; M.since = s.t; M.h0 = s.h; M.rate = 1; M.side = 1; } }
      else if (w.waves.length && s.h > w.waves[0].hmin - 50 && !(M.doneLift > 0)) { const v = w.waves[0]; M.mode = 'wave'; M.x = v.x + v.lambda / 4; M.z0 = s.z; M.top = v.hmax - 600; M.side = 1; }
      else if (w.ridges.length && !(M.doneLift > 1) && Math.abs(u) > 6) { const r = w.ridges[0], top = groundH(w, r.x); if (Math.abs(s.x - r.x) < 1500 || w.waves.length) { M.mode = 'ridge'; M.x = r.x; M.face = r.face; M.z0 = s.z; M.top = w.waves.length ? w.waves[0].hmin + 250 : top + 300; M.side = 1; } else psi = heading(w, s, r.x - r.face * 400, s.z); }
      else if (agl < 320) { M.spot = pickField(w, s); M.mode = 'land-arrive'; M.ldir = M.spot >= s.x ? 1 : -1; return land(w, s, M.spot, agl, M); }
      else if (goal) psi = heading(w, s, goal.x, goal.z);
    } else if (goal) psi = heading(w, s, goal.x, goal.z);
  }
  if (phi == null) phi = bankFor(w, s, psi, agl);
  return {roll: rollTo(s, phi), pitch: 0, brake};
}
function pickField(w, s) { const dir = Math.cos(s.psi) >= 0 ? 1 : -1; for (let d = 300; d < 3000; d += 50) { const x = s.x + dir * d; let ok = true; for (let k = -150; k <= 450; k += 50) if (!safeAt(w, x + dir * k)) { ok = false; break; } if (ok) return x + dir * 150; }
  for (let d = 0; d < 3000; d += 50) { const x = s.x - dir * d; let ok = true; for (let k = -300; k <= 300; k += 50) if (!safeAt(w, x + k)) { ok = false; break; } if (ok) return x; } return s.x; }
// Circuit: lose height over the spot, fly a downwind leg, turn in and fly the approach on the airbrakes.
function land(w, s, spot, agl, M) {
  if (!M.mode.startsWith('land')) { M.mode = 'land-arrive'; M.spot = spot; }
  const u = windAt(w, s.h, s.t); if (M.mode === 'land-arrive' && M.ldir == null) M.ldir = u > 1 ? -1 : u < -1 ? 1 : (spot > s.x ? 1 : -1);
  let dir = M.ldir; const aim = spot - dir * 120, d = (aim - s.x) * dir, ratio = agl / Math.max(1, Math.abs(d));
  let psi = s.psi, phi = null, brake = false;
  if (M.mode === 'land-arrive') { const far = Math.abs(s.x - spot), toward = spot > s.x ? 1 : -1;
    if (far > 900 && agl < far / 22 + 200 && (Math.abs(u) < 5 || agl < far / 22 + 120)) { M.ldir = toward; M.mode = 'land-final'; }
    else if (far > 1200) psi = heading(w, s, spot, 0); else if (agl > 330) { phi = 0.55; brake = agl > 450; } else M.mode = 'land-downwind'; }
  if (M.mode === 'land-downwind' && agl < 130) { M.ldir = spot > s.x ? 1 : -1; M.mode = 'land-final'; }
  if (M.mode === 'land-downwind') { const p = spot - dir * 1700; psi = heading(w, s, p, 0); brake = agl > 260 + Math.abs(s.x - p) / 20; if ((s.x - p) * dir < 120) M.mode = 'land-final'; }
  if (M.mode === 'land-final') { psi = heading(w, s, spot + dir * 300, 0); const want = agl / Math.max(60, d + 60); brake = want > 1 / 15 || (d < 0 && agl > 3); if (agl < 4) brake = s.V > 22; }
  if (phi == null) phi = bankFor(w, s, psi, agl);
  return {roll: rollTo(s, phi), pitch: 0, brake};
}
