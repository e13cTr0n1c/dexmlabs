/** A simplified RBMK-1000 for a game. Honest in direction, not in detail: one point of power, no spatial effects.
 *  Power is a fraction of the 3,200 MW thermal rating. Reactivity is in absolute units; beta is the delayed
 *  neutron fraction, so reactivity above beta is prompt critical. One game second is two minutes for the
 *  xenon and iodine, so a xenon pit plays out in a few minutes. */
export const RODS = 211, ORM_LIMIT = 15, BETA = 0.0065, AZ5_SECONDS = 18;
export const K = {rods: 0.08, xenon: 0.03, void: 0.03, doppler: 0.01, tip: 0.02, rate: 0.25};
// iodine and xenon, per game second (2 minutes of reactor time)
const H = 1 / 30, LI = Math.log(2) / 6.6 * H, LX = Math.log(2) / 9.2 * H, BURN = 2.5 * LX, YI = LI, YX = 0;
// with these, xenon peaks about 10 reactor hours after a cut in power, as it does in a real core
export const xenonEq = P => (YI + YX) * P / (LX + BURN * P) / ((YI + YX) / (LX + BURN));
export const iodineEq = P => P;
// Steam in the channels: more power or less flow, lower pressure, or warmer inlet water (less subcooling) all mean more steam.
export const voidFrac = (P, flow, p = 1, sub = 1) => Math.max(0, Math.min(1, 0.3 * P / Math.max(flow, 0.05) * (1 + 0.4 * (1 - Math.min(p, 1.3))) + 0.12 * (1 - Math.max(0, Math.min(1, sub)))));
const R0 = K.rods * 0.3 + K.xenon + K.doppler - K.void * voidFrac(1, 1);

export function reactivity(s) {
  const tip = s.az5 && s.az5.t < 4 ? K.tip * (1 - s.az5.from) ** 8 * (1 - s.az5.t / 4) : 0;
  return R0 - K.rods * s.rods / RODS - K.xenon * s.X + K.void * voidFrac(s.P, s.flow, s.p ?? 1, s.sub ?? 1) - K.doppler * s.P + tip;
}
/** A reactor in equilibrium at power P with `rods` inserted and full flow. Rods are solved so it holds. */
export function steady(P, flow = 1, X = xenonEq(P)) {
  const s = {P, X, I: iodineEq(P), flow, rods: 0, az5: null, t: 0, state: 'running', peak: P, hot: 0};
  s.rods = Math.max(0, Math.min(RODS, (R0 - K.xenon * X + K.void * voidFrac(P, flow) - K.doppler * P) / K.rods * RODS));
  return s;
}
/** Advance by dt game seconds. Returns a new state. */
export function step(s, dt = 0.25) {
  if (s.state !== 'running' && s.state !== 'scrammed') return s;
  const n = {...s, t: s.t + dt};
  if (n.az5) { n.az5 = {...n.az5, t: n.az5.t + dt}; n.rods = Math.min(RODS, n.rods + RODS / AZ5_SECONDS * dt); }
  const rho = reactivity(n);
  n.P = Math.max(1e-4, n.P * Math.exp(Math.min(rho / BETA, 40) * K.rate * dt * (rho > BETA ? 25 : 1)));
  n.I = s.I + (s.P - s.I) * LI * dt;
  // xenon normalised so xenonEq(1) = 1
  const norm = YI / (LX + BURN), xRaw = s.X * norm, iRaw = s.I * (YI / LI);
  n.X = (xRaw + (LI * iRaw - LX * xRaw - BURN * s.P * xRaw) * dt) / norm;
  n.peak = Math.max(s.peak, n.P);
  n.hot = n.P / Math.max(n.flow, 0.05) > 1.6 ? s.hot + dt : 0;
  if (n.P > 10) n.state = 'exploded';
  else if (n.hot > 5) n.state = 'meltdown';
  else if (n.az5 && n.rods >= RODS && n.P < 0.02) n.state = 'shutdown';
  return n;
}
export const az5 = s => s.az5 ? s : {...s, az5: {t: 0, from: s.rods / RODS}, state: 'running'};
export const orm = s => Math.round(s.rods);
