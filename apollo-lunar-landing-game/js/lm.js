/** The last couple of hundred metres of an Apollo landing, in two dimensions. Real numbers where it matters:
 *  lunar gravity 1.62 m/s², descent engine 45,040 N at full thrust, specific impulse 311 s, and the landing gear
 *  limits of about 3 m/s down and 1.2 m/s sideways. Throttle is limited to 10% to 60% here, as the engine could
 *  only run between about 10% and 65% or at full thrust. */
export const G_MOON = 1.62, G0 = 9.80665, THRUST = 45040, ISP = 311, DRY = 7300, RCS_ACC = 0.4, RCS_FLOW = 0.6;
export const LIMITS = {down: 3, side: 1.2, pad: 30};
export const MIN_T = 0.1, MAX_T = 0.6;
export const massFlow = throttle => throttle * THRUST / (ISP * G0);
export const hoverThrottle = mass => mass * G_MOON / THRUST;
/** state: {x, y (altitude), vx, vy, fuel, t, throttle, rcs (-1, 0, 1)} */
export function step(s, dt = 1 / 30) {
  if (s.done) return s;
  const n = {...s, t: s.t + dt}, m = DRY + s.fuel, on = s.fuel > 0;
  const th = on ? Math.max(MIN_T, Math.min(MAX_T, s.throttle)) : 0, ay = th * THRUST / m - G_MOON, ax = on ? s.rcs * RCS_ACC : 0;
  n.vy = s.vy + ay * dt; n.vx = s.vx + ax * dt; n.y = s.y + n.vy * dt; n.x = s.x + n.vx * dt;
  n.fuel = Math.max(0, s.fuel - (massFlow(th) + (s.rcs ? RCS_FLOW : 0)) * dt);
  if (n.y <= 0) { n.y = 0; n.done = true; n.touch = {vy: -n.vy, vx: Math.abs(n.vx), dist: Math.abs(n.x)}; n.landed = n.touch.vy <= LIMITS.down && n.touch.vx <= LIMITS.side && n.touch.dist <= LIMITS.pad; }
  return n;
}
/** Burn time left at the current mass if you just hovered, in seconds. */
export const hoverSeconds = s => s.fuel / massFlow(hoverThrottle(DRY + s.fuel));
