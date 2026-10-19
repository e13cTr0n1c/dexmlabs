// A scripted autopilot that flies Docking Run the way a player does: it only chooses hand controller
// commands (-1, 0 or +1 on each translation and rotation axis), the fine/coarse switch and time warp.
// It never touches the state. Kill rotation stays off: it flies the rates itself.
import {rel, qrot, qrotT, RAD, maxWarp} from '../js/physics.js';
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export function decide(sim) {
  const r = rel(sim), far = r.range > 60, fine = !far, ax = r.ax;
  // Attitude: fly the error to zero along a rate profile, bang-bang with a deadband.
  const e = [r.roll, r.yaw, r.pitch].map(x => x * RAD), wr = r.rates.map(x => x * RAD);
  const wmax = (far ? 0.8 : 0.35) * RAD, dbr = (fine ? 0.02 : 0.06) * RAD, k = far ? 0.15 : 0.12;
  const rot = e.map((ek, i) => { const d = clamp(-k * ek, -wmax, wmax) - wr[i]; return Math.abs(d) > dbr ? Math.sign(d) : 0; });
  // Translation: a closing rate that falls with distance, held in a corridor that narrows toward the port.
  let vdx = ax > 1.2 ? Math.min(far ? 1.6 : 0.6, 0.065 + 0.012 * (ax - 1.2)) : 0.065;
  const lat = r.lat, corridor = 0.05 + 0.08 * Math.max(0, ax);
  if (lat > corridor) vdx = ax > 4 ? Math.min(vdx, 0.03) : 0;
  if (Math.max(Math.abs(r.roll), Math.abs(r.yaw), Math.abs(r.pitch)) > 2.5 && ax < 4) vdx = 0;
  const kl = clamp(1.5 * vdx / Math.max(ax, 1), 0.03, 0.15), cap = Math.min(1.0, 0.03 + 0.004 * Math.max(0, ax));
  const want = [-vdx, clamp(-kl * r.y, -cap, cap), clamp(-kl * r.z, -cap, cap)];
  const err = [want[0] - r.dax, want[1] - r.dy, want[2] - r.dz];
  const errB = qrotT(sim.cap.q, qrot(sim.station.q, err)), dbt = fine ? 0.0025 : 0.015;
  const t = errB.map(x => Math.abs(x) > dbt ? Math.sign(x) : 0);
  return {t, r: rot, fine, assist: false, warp: maxWarp(r.range)};
}
