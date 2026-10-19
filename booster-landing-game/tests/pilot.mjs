// Autopilots used by the tests. fly() with no options is careful and exact. With {steps, lag, err}
// it only uses what a player has: throttle in 5% steps, Q/E at a fixed rate, A/D, late reactions and misjudgement.
import {step, deck, deployLegs, throttleUp, throttleDown, DRY, THRUST, G, THROTTLE, wind} from '../js/physics.js';
export function fly(w, o = {}) {
  const dt = 1 / 60, r = o.rand || Math.random, hist = [], trace = o.trace ? [] : null;
  let s = {...w.start}, plan = {rot: 0, gim: 0, th: 0}, bias = 1 + (r() - 0.5) * 2 * (o.err || 0);
  for (let i = 0; i < 60 * 400 && !s.done; i++) {
    hist.push(s); const seen = hist[Math.max(0, hist.length - 1 - Math.round((o.lag || 0) * 60))];
    if (i % (o.every || 1) === 0) { plan = decide(w, seen, bias, o.burnAcc || 6.5); if (trace && i % 30 === 0) trace.push([s.t.toFixed(1), s.x.toFixed(0), s.y.toFixed(0), s.vx.toFixed(1), s.vy.toFixed(1), (s.angle * 57.3).toFixed(1), s.throttle, s.fuel.toFixed(0), s.heat.toFixed(0)].join(' ')); }
    if (o.steps) { if (plan.th === 0) { if (s.throttle > 0) s.throttle = throttleDown(s.throttle); } else if (s.throttle < plan.th - 0.03) s.throttle = throttleUp(s.throttle); else if (s.throttle > plan.th + 0.03 && s.throttle > THROTTLE.min) s.throttle = throttleDown(s.throttle); }
    else s.throttle = plan.th;
    if (plan.legs) s = deployLegs(s);
    s = step(w, s, {rot: plan.rot, gim: plan.gim}, dt);
  }
  if (trace) s.trace = trace;
  return s;
}
export function decide(w, s, bias = 1, A = 6.5) {
  const d = deck(w, s.t), h = s.y - d.y, dx = s.x - d.x, m = DRY + s.fuel, speed = Math.hypot(s.vx, s.vy);
  const full = THRUST / m - G;
  // Vertical speed you want: a burn profile at A m/s² that ends at 1.5 m/s just above the deck.
  let vyT = -Math.max(1.5, Math.sqrt(2 * A * bias * Math.max(0, h - 3)));
  const settled = Math.abs(dx) < 18 && Math.abs(s.vx - d.vx) < 1;
  if (!settled && h < 30) vyT = Math.max(vyT, h < 12 ? 0.3 : -1);
  const entry = s.y > 3000 && -s.vy > 300 && s.heat > 20;
  // Sideways speed you want: arrive over the deck in the time left.
  const tgo = Math.max(3, h / Math.max(4, -s.vy) * 1.4), vxT = Math.max(-50, Math.min(50, -dx / tgo));
  const low = h < 60, ax = Math.max(-4, Math.min(4, low ? Math.max(-2.5, Math.min(2.5, -0.8 * s.vx - 0.12 * dx)) : 0.7 * (vxT - s.vx))), ay = G + (s.vy < -3 ? Math.min(A, s.vy * s.vy / (2 * Math.max(1, h - 3))) : 0) + 3 * (vyT - s.vy);
  let th = m * Math.hypot(ax, Math.max(0.5, ay)) / THRUST;
  const need = s.vy < vyT - 1 || entry || h < 120;
  th = need ? Math.max(THROTTLE.min, Math.min(1, th)) : 0;
  const tilt = th > 0 ? Math.max(-0.4, Math.min(0.4, Math.atan2(ax, Math.max(0.5, ay)))) : Math.max(-0.3, Math.min(0.3, 0.04 * (vxT - s.vx)));
  const wantA = h < 15 ? -d.pitch * 0.7 : low ? Math.max(-0.12, Math.min(0.12, tilt)) : tilt, e = wantA - s.angle, rot = Math.abs(e) > 0.015 ? Math.sign(e) : 0;
  const axG = low ? ax : 0.7 * (vxT - s.vx), gim = th > 0 && h < 300 && Math.abs(axG) > 0.15 ? Math.sign(axG) : 0;
  return {th, rot, gim, legs: speed < 75 && h < 2000};
}
