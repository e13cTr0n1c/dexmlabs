// A careful autopilot, used by the tests to prove every daily landing can be flown.
import {step, ground, touchdownFault, DRY, THRUST, G, DETENTS, LIMITS} from '../js/lm.js';
export function spot(w) { let best = null; for (let x = -130; x <= 130; x += 2) if (!touchdownFault(w, x, 1, 0, 0) && [-8, -4, 4, 8].every(o => !touchdownFault(w, x + o, 1, 0, 0))) { if (best === null || Math.abs(x) < Math.abs(best)) best = x; } return best; }
export function fly(w, opts = {}) {
  const xt = spot(w); let s = {...w.start}; const dt = 1 / 30;
  for (let i = 0; i < 30 * 400 && !s.done; i++) {
    const h = s.y - ground(w, s.x), dx = s.x - xt, m = DRY + s.fuel;
    const vxT = Math.max(-25, Math.min(25, -0.06 * dx)), ax = Math.max(-1.5, Math.min(1.5, 0.3 * (vxT - s.vx)));
    const vyT = Math.abs(dx) > 12 && h < 25 ? 0 : -Math.max(0.6, Math.min(15, 0.12 * h));
    const ay = Math.max(0.2, G + 0.8 * (vyT - s.vy)), want = Math.max(-0.6, Math.min(0.6, Math.atan2(ax, ay)));
    const wantAngle = h < 12 ? 0 : want, T = m * Math.hypot(ax, ay) / THRUST;
    s.throttle = DETENTS.reduce((a, d) => (Math.abs(d - T) < Math.abs(a - T) && d > 0 ? d : a), 0.1);
    const err = wantAngle - s.angle, rot = Math.abs(err) > 0.03 ? Math.sign(err) : 0;
    const trans = h < 15 && Math.abs(s.vx) > 0.3 ? -Math.sign(s.vx) : 0;
    s = step(w, s, {rot, trans}, dt);
  }
  return {s, xt};
}
