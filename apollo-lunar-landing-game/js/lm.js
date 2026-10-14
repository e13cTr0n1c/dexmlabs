// Apollo lunar module, last few hundred metres. SI units, x along track, y up, angle in radians (0 upright, + tilts thrust towards +x).
export const G = 1.62, THRUST = 45040, ISP = 311, G0 = 9.80665, DRY = 7300;
export const ASCENT = {mass: 4700, thrust: 15570};
export const DETENTS = [0, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 1];
export const RCS = {trans: 890, rate: 10 * Math.PI / 180, acc: 15 * Math.PI / 180, rotFlow: 0.5, transFlow: 0.4};
export const LIMITS = {down: 3, side: 1.2, tilt: 6 * Math.PI / 180, slope: 12 * Math.PI / 180, boulder: 0.6, attitude: 45 * Math.PI / 180, radarTilt: 30 * Math.PI / 180, legs: 4.7};
export const massFlow = th => th * THRUST / (ISP * G0);
export const hoverThrottle = m => m * G / THRUST;
export const hoverSeconds = s => s.fuel / massFlow(hoverThrottle(DRY + s.fuel));
export const detentUp = th => DETENTS.find(d => d > th + 1e-9) ?? th;
export const detentDown = th => [...DETENTS].reverse().find(d => d < th - 1e-9) ?? th;
// Terrain lookups. A world has ground: Float32Array every 2 m from -W to W, boulders [{x, w, h}].
export function ground(w, x) { const i = (x + w.W) / 2, k = Math.max(0, Math.min(w.ground.length - 2, Math.floor(i))), f = Math.max(0, Math.min(1, i - k)); return w.ground[k] * (1 - f) + w.ground[k + 1] * f; }
export function boulderUnder(w, x, half = LIMITS.legs) { let h = 0; for (const b of w.boulders) if (Math.abs(b.x - x) < b.w / 2 + half) h = Math.max(h, b.h); return h; }
export const slopeAt = (w, x) => Math.atan(Math.abs(ground(w, x + LIMITS.legs) - ground(w, x - LIMITS.legs)) / (2 * LIMITS.legs));
export const altitude = (w, s) => s.y - ground(w, s.x);
// Why a touchdown at x with these speeds fails, or null if it's a landing.
export function touchdownFault(w, x, vy, vx, angle) {
  if (vy > LIMITS.down) return {k: 'hard', text: `Touched down at ${vy.toFixed(1)} m/s. The gear is built for ${LIMITS.down}.`};
  if (Math.abs(vx) > LIMITS.side) return {k: 'side', text: `Sliding sideways at ${Math.abs(vx).toFixed(1)} m/s. The gear is built for ${LIMITS.side}.`};
  if (Math.abs(angle) > LIMITS.tilt) return {k: 'tilt', text: `Tilted ${(Math.abs(angle) * 180 / Math.PI).toFixed(0)}° at contact. Keep it within 6°.`};
  const sl = slopeAt(w, x); if (sl > LIMITS.slope) return {k: 'slope', text: `The ground slopes ${(sl * 180 / Math.PI).toFixed(0)}°. The lander can stand on 12° at most.`};
  const b = boulderUnder(w, x); if (b > LIMITS.boulder) return {k: 'boulder', text: `A boulder ${b.toFixed(1)} m high under the legs. More than ${LIMITS.boulder} m and the descent stage hits it.`};
  return null;
}
// One step. input: {rot: -1|0|1, trans: -1|0|1}. Throttle is set on the state.
export function step(w, s0, input = {}, dt = 1 / 30) {
  const s = {...s0}; if (s.done) return s;
  if (s.aborted) {
    const m = ASCENT.mass; s.angle += Math.max(-RCS.rate * 2 * dt, Math.min(RCS.rate * 2 * dt, -s.angle));
    s.vx += ASCENT.thrust / m * Math.sin(s.angle) * dt; s.vy += (ASCENT.thrust / m * Math.cos(s.angle) - G) * dt;
  } else {
    const want = (input.rot || 0) * RCS.rate; let a = 0;
    if (s.rcs > 0 && Math.abs(want - s.omega) > 1e-6) { a = Math.sign(want - s.omega) * RCS.acc; s.rcs = Math.max(0, s.rcs - RCS.rotFlow * dt); }
    s.omega += a * dt; if (Math.abs(s.omega - want) < RCS.acc * dt) s.omega = s.rcs > 0 ? want : s.omega;
    s.angle += s.omega * dt; if (Math.abs(s.angle) > LIMITS.attitude) { s.angle = Math.sign(s.angle) * LIMITS.attitude; s.omega = 0; s.limit = true; } else s.limit = false;
    const m = DRY + s.fuel, th = s.fuel > 0 ? s.throttle : 0, F = th * THRUST, tr = s.rcs > 0 ? (input.trans || 0) * RCS.trans : 0;
    if (tr) s.rcs = Math.max(0, s.rcs - RCS.transFlow * dt);
    s.vx += (F * Math.sin(s.angle) + tr * Math.cos(s.angle)) / m * dt; s.vy += ((F * Math.cos(s.angle) - tr * Math.sin(s.angle)) / m - G) * dt;
    s.fuel = Math.max(0, s.fuel - massFlow(th) * dt);
  }
  s.x += s.vx * dt; s.y += s.vy * dt; s.t += dt;
  const top = Math.max(ground(w, s.x), ground(w, s.x) + (boulderUnder(w, s.x) > LIMITS.boulder ? boulderUnder(w, s.x) : 0));
  if (s.y <= top) {
    s.done = true; s.y = top; const vy = -s.vy, vx = s.vx;
    if (s.aborted) { s.landed = false; s.fault = {k: 'abortcrash', text: 'The abort came too late. The ascent stage hit the surface.'}; }
    else { s.fault = touchdownFault(w, s.x, vy, vx, s.angle); s.landed = !s.fault; }
    s.touch = {vy, vx: Math.abs(vx), angle: Math.abs(s.angle), dist: Math.abs(s.x - w.target)};
  }
  if (s.aborted && !s.done && s.vy > 0 && s.y - ground(w, s.x) > 60) { s.done = true; s.safe = true; s.landed = false; s.fault = {k: 'abort', text: 'Abort. The ascent stage climbed away and the crew is safe, but there was no landing.'}; }
  if (!s.done && (s.x < -w.W + 50 || s.x > w.W - 50)) { s.done = true; s.landed = false; s.fault = {k: 'range', text: 'You flew out of the landing area.'}; }
  return s;
}
export function abort(s) { return s.aborted || s.done ? s : {...s, aborted: true, omega: 0}; }
