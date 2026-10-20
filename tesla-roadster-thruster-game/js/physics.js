// Roadster thruster physics, side view, SI units (metres, seconds, newtons). Pure, no DOM, so Node tests run it.
// The car is a rigid body with two sprung wheels, a power and grip limited drive, air drag, a rear boost
// thruster along the body, lift thrusters along the body's up axis and cold gas pitch thrusters with attitude hold.
// In space there is no road and no air: four translation thrusters, the boost and point gravity from planets.
// All the numbers are game numbers, tuned to feel right. They are not Tesla data.
export const G = 9.81, DT = 1 / 60, SUB = 4;
export const CAR = {m: 1800, I: 2900, wheel: 1.35, wy: -0.8, body: 2.1, bodyLow: -0.45, bodyTop: 0.55, k: 70000, c: 7000,
  mu: 1.4, power: 750e3, cda: 0.6, rho: 1.2, roll: 0.015, boost: 2.4 * 1800 * G, lift: 1.3 * 1800 * G, rcsT: 12000, rate: 50 * Math.PI / 180,
  limit: 35 * Math.PI / 180, kp: 40, kd: 12, gasBoost: 8, gasLift: 3.5, gasRcs: 1.2, space: {rcs: 0.25 * 1800 * G, boost: 0.8 * 1800 * G, gasRcs: 2.5, gasBoost: 6}};
export const MPH60 = 26.8224, HARD = 9;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export function makeWorld(L, seed = 1) {
  const w = {level: L, mode: L.mode, seed, gas: L.gas ?? 100, wind: L.wind || 0, plats: (L.plats || []).map(p => ({...p})), finish: L.finish, pad: L.pad,
    items: (L.items || []).map(([x, y]) => ({x, y})), target: L.target, bodies: L.bodies || [], tmax: L.tmax || 60};
  const sp = w.mode === 'space', st = L.start || {};
  w.low = sp ? -1e9 : Math.min(...w.plats.map(p => p.y)) - 15;
  const y0 = sp ? (st.y || 0) : groundAt(w, st.x || 0, 50) - CAR.wy - CAR.m * G / 2 / CAR.k;
  w.start = {t: 0, x: st.x || 0, y: y0, vx: st.vx || 0, vy: st.vy || 0, a: st.a || 0, w: 0, tgt: st.a || 0, lift: 0, gas: w.gas, contact: !sp, got: w.items.map(() => false),
    done: false, ok: false, fault: null, t60: null, maxV: 0, touches: [], touch: null, settle: 0, air: false, boostOn: false, liftOn: 0, rcsOn: 0, events: []};
  return w;
}
// Top of the platform under x, for a point at height y (a point well below a top is inside the block, not on it).
export function groundAt(w, x, y = 1e9) { let g = null; for (const p of w.plats) if (x >= p.x0 && x <= p.x1 && p.y <= y + 1.2 && (g === null || p.y > g)) g = p.y; return g; }
export const platAt = (w, x, y = 1e9) => w.plats.findIndex(p => x >= p.x0 && x <= p.x1 && p.y <= y + 1.2 && p.y === groundAt(w, x, y));
const rot = (a, x, y) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
export const wheels = s => [-CAR.wheel, CAR.wheel].map(lx => { const [dx, dy] = rot(s.a, lx, CAR.wy); return {x: s.x + dx, y: s.y + dy, rx: dx, ry: dy}; });
export const corners = s => [[-CAR.body, CAR.bodyLow], [CAR.body, CAR.bodyLow], [-CAR.body * 0.6, CAR.bodyTop], [CAR.body * 0.4, CAR.bodyTop]].map(([lx, ly]) => { const [dx, dy] = rot(s.a, lx, ly); return {x: s.x + dx, y: s.y + dy, rx: dx, ry: dy}; });
// in: {up, down, left, right, rl, rr, boost, cut}. Ground modes: W/S ramp the lift throttle, A/D drive and brake. Space: W/S/A/D fire RCS.
export function step(w, s0, inp = {}) {
  if (s0.done) return s0; const s = {...s0, touches: s0.touches, events: []}; const h = DT / SUB, sp = w.mode === 'space';
  if (!sp) { if (inp.cut) s.lift = 0; else s.lift = clamp(s.lift + ((inp.up ? 1 : 0) - (inp.down ? 1 : 0)) * 3 * DT, 0, 1); }
  const turning = inp.rl || inp.rr;
  if (turning) s.tgt += ((inp.rl ? 1 : 0) - (inp.rr ? 1 : 0)) * CAR.rate * DT;
  else if (!sp && s.contact) s.tgt = s.a;
  if (!sp) s.tgt = clamp(s.tgt, (s.contact ? s.a : 0) - CAR.limit, (s.contact ? s.a : 0) + CAR.limit);
  const wasAir = !s.contact;
  for (let i = 0; i < SUB && !s.done; i++) sub(w, s, inp, h, sp);
  s.t += DT; const v = Math.hypot(s.vx, s.vy); s.maxV = Math.max(s.maxV, s.vx);
  if (!sp) {
    if (s.t60 === null && s.vx >= MPH60) s.t60 = s.t;
    if (wasAir && s.contact) { const fresh = s.lastImpact || 0; s.touches = [...s.touches, {t: s.t, x: s.x, impact: fresh, tilt: Math.abs(s.a - (s.groundA || 0)), plat: platAt(w, s.x, s.y)}]; s.events.push('land'); }
    if (s.y < w.low) return end(s, 'fell');
    if (Math.abs(s.a) > 1.75) return end(s, 'flip');
    if (w.mode === 'sprint' && s.x >= w.finish) { s.done = true; s.ok = true; s.events.push('finish'); }
    if (w.mode === 'hover') { const pi = platAt(w, s.x, s.y), onPad = s.contact && pi === w.pad.plat && Math.abs(s.x - w.pad.x) <= w.pad.half;
      if (onPad && !s.touch) { const t = s.touches[s.touches.length - 1] || {impact: 0, tilt: 0}; s.touch = {impact: t.impact, tilt: t.tilt}; }
      if (!onPad && s.touch && !s.contact) s.touch = null;
      s.settle = onPad && Math.abs(s.vx) < 0.6 && Math.abs(s.w) < 0.3 && s.lift < 0.05 ? s.settle + DT : 0;
      if (s.settle >= 1) { s.done = true; s.ok = true; s.touch.dist = Math.abs(s.x - w.pad.x); s.events.push('parked'); } }
  } else {
    w.items.forEach((it, i) => { if (!s.got[i] && Math.hypot(it.x - s.x, it.y - s.y) < 5) { s.got = s.got.slice(); s.got[i] = true; s.events.push('item'); } });
    const T = w.target, d = Math.hypot(T.x - s.x, T.y - s.y);
    if (d < T.r && v < 1.5 && s.got.every(Boolean)) { s.done = true; s.ok = true; s.touch = {impact: v, dist: d}; s.events.push('dock'); }
    for (const b of w.bodies) if (Math.hypot(b.x - s.x, b.y - s.y) < b.r) return end(s, 'crash');
    if (Math.hypot(s.x, s.y) > (w.level.bound || 2000)) return end(s, 'lost');
  }
  if (!s.done && s.t >= w.tmax) return end(s, 'time');
  return s;
}
function end(s, k) { s.done = true; s.ok = false; s.fault = {k}; s.events.push('fault'); return s; }
function sub(w, s, inp, h, sp) {
  let fx = 0, fy = 0, tq = 0; const C = CAR, ca = Math.cos(s.a), sa = Math.sin(s.a);
  s.boostOn = !!inp.boost && s.gas > 0; s.rcsOn = 0; s.liftOn = 0;
  // Attitude: rate command, then hold. A PD loop on the pitch thrusters.
  const want = C.I * (C.kp * (s.tgt - s.a) - C.kd * s.w), t = clamp(want, -C.rcsT, C.rcsT);
  if (s.gas > 0) { tq += t; s.rcsOn = t / C.rcsT; s.gas -= Math.abs(t) / C.rcsT * C.gasRcs * h; }
  if (sp) {
    const S = C.space; let bx = 0, by = 0;
    if (s.gas > 0) { bx = ((inp.right ? 1 : 0) - (inp.left ? 1 : 0)) * S.rcs; by = ((inp.up ? 1 : 0) - (inp.down ? 1 : 0)) * S.rcs; s.gas -= ((bx ? 1 : 0) + (by ? 1 : 0)) * S.gasRcs * h;
      if (s.boostOn) { bx += S.boost; s.gas -= S.gasBoost * h; } }
    s.thr = {bx, by}; fx += bx * ca - by * sa; fy += bx * sa + by * ca;
    for (const b of w.bodies) { const dx = b.x - s.x, dy = b.y - s.y, r2 = dx * dx + dy * dy, r = Math.sqrt(r2); fx += C.m * b.gm / r2 * dx / r; fy += C.m * b.gm / r2 * dy / r; }
  } else {
    fy -= C.m * G; fx += C.m * w.wind;
    const v = s.vx; fx -= 0.5 * C.rho * C.cda * v * Math.abs(v); fy -= 0.5 * C.rho * C.cda * 1.6 * s.vy * Math.abs(s.vy);
    if (s.gas > 0 && s.lift > 0) { const F = C.lift * s.lift; fx += -sa * F; fy += ca * F; s.liftOn = s.lift; s.gas -= s.lift * C.gasLift * h; }
    if (s.boostOn) { fx += ca * C.boost; fy += sa * C.boost; s.gas -= C.gasBoost * h; }
    // Wheels: spring and damper against the platform top, with drive, brake and rolling grip at the contact.
    let n = 0; const ws = wheels(s), drive = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    for (const p of ws) { const g = groundAt(w, p.x, p.y); if (g === null) continue; const pen = g - p.y; if (pen <= 0) continue;
      const pvx = s.vx - s.w * p.ry, pvy = s.vy + s.w * p.rx; if (pen > 0 && !s.contact && !s._touching) { s.lastImpact = Math.max(0, -pvy); }
      if (-pvy > HARD && pen < 0.25) { end(s, 'hard'); return; }
      const N = Math.max(0, C.k * pen - C.c * pvy); n++;
      let ft = 0; const lim = C.mu * N;
      if (drive > 0) ft = Math.min(lim, C.power / 2 / Math.max(Math.abs(pvx), 3));
      else if (drive < 0) ft = pvx > 0.3 ? -lim * 0.9 : -Math.min(lim, 0.3 * C.power / 2 / Math.max(Math.abs(pvx), 3));
      else ft = clamp(-pvx * C.m * 2, -lim * 0.15, lim * 0.15) - C.roll * N * Math.sign(pvx);
      fx += ft; fy += N; tq += p.rx * N - p.ry * ft; }
    // The body: scraping on the ground is allowed, a corner deep in a block is a crash.
    for (const p of corners(s)) { for (const b of w.plats) if (p.x > b.x0 && p.x < b.x1 && p.y < b.y - 0.9 && p.y > b.y - 40) { end(s, 'wall'); return; }
      const g = groundAt(w, p.x, p.y); if (g === null || g - p.y <= 0) continue; const pvy = s.vy + s.w * p.rx, pvx = s.vx - s.w * p.ry;
      if (-pvy > 6) { end(s, 'crash'); return; } const N = Math.max(0, 2 * C.k * (g - p.y) - 2 * C.c * pvy), ft = -Math.sign(pvx) * 0.5 * N; fy += N; fx += ft; tq += p.rx * N - p.ry * ft; n++; }
    s._touching = n > 0; if (n && !s.contact) s.groundA = 0; s.contact = n > 0;
  }
  s.gas = Math.max(0, s.gas);
  s.vx += fx / C.m * h; s.vy += fy / C.m * h; s.w += tq / C.I * h; s.x += s.vx * h; s.y += s.vy * h; s.a += s.w * h;
}
// A car sitting at rest on the road, given its position.
export function settle(w, s, frames = 120) { let u = {...s}; for (let i = 0; i < frames; i++) { u = step(w, u); } return {...u, t: 0, touches: [], events: [], gas: w.gas, maxV: 0, t60: null}; }
// Scoring. parts() gives each part of the score as a fraction of its best, for the share card.
export function parts(s, w) { if (!s.ok) return null; const L = w.level, gas = s.gas / w.gas;
  if (w.mode === 'sprint') { const hop = s.touches.length ? Math.max(...s.touches.map(t => t.tilt)) : 0;
    return {time: clamp((L.par * 1.6 - s.t) / (L.par * 0.6), 0, 1), launch: s.t60 ? clamp((2 - s.t60) / 1.2, 0, 1) : 0, trap: clamp((s.vx - 40) / 100, 0, 1), flat: clamp(1 - hop / 0.35, 0, 1), gas}; }
  if (w.mode === 'hover') return {soft: clamp(1 - s.touch.impact / 6, 0, 1), flat: clamp(1 - s.touch.tilt / 0.35, 0, 1), centre: clamp(1 - s.touch.dist / w.pad.half, 0, 1), time: clamp((L.par * 2 - s.t) / L.par, 0, 1), gas};
  return {items: s.got.filter(Boolean).length / Math.max(1, s.got.length), soft: clamp(1 - s.touch.impact / 1.5, 0, 1), centre: clamp(1 - s.touch.dist / w.target.r, 0, 1), time: clamp((L.par * 2 - s.t) / L.par, 0, 1), gas}; }
export const WEIGHTS = {sprint: {time: 450, launch: 200, trap: 150, flat: 100, gas: 100}, hover: {soft: 250, flat: 250, centre: 200, time: 100, gas: 200}, space: {items: 300, soft: 200, centre: 150, time: 150, gas: 200}};
export function score(s, w) { const p = parts(s, w); if (!p) return 0; const W = WEIGHTS[w.mode]; let sc = 200; for (const k in W) sc += W[k] * p[k]; return Math.round(sc * (w.level.mult || 1)); }
export function grade(sc, w) { const f = sc / (1200 * (w.level.mult || 1)); return f >= 0.85 ? 'S' : f >= 0.7 ? 'A' : f >= 0.55 ? 'B' : f >= 0.4 ? 'C' : 'D'; }
