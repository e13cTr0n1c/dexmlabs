// The autopilot. It only decides which keys to hold, like a player, so the tests and the browser pilot fly the same way.
import {CAR, G, groundAt, wheels} from '../js/physics.js';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// Keys for a wanted lift throttle and pitch angle (the attitude hold does the rest).
function keysFor(s, liftWant, angWant, extra = {}) { const k = {...extra};
  if (liftWant !== null) { if (liftWant <= 0.001 && s.lift > 0) k.cut = true; else if (liftWant > s.lift + 0.04) k.up = true; else if (liftWant < s.lift - 0.04) k.down = true; }
  if (angWant !== null) { if (angWant > s.tgt + 0.02) k.rl = true; else if (angWant < s.tgt - 0.02) k.rr = true; } return k; }
export function decide(w, s) {
  if (w.mode === 'sprint') return sprint(w, s); if (w.mode === 'hover') return hover(w, s); return space(w, s); }
function sprint(w, s) {
  const gaps = []; const P = [...w.plats].sort((a, b) => a.x0 - b.x0); for (let i = 0; i + 1 < P.length; i++) gaps.push({a: P[i].x1, b: P[i + 1].x0, y: P[i + 1].y});
  const ahead = gaps.filter(g => g.b + CAR.wheel + 2 > s.x), g = ahead[0]; const reserve = ahead.length * 14 + 4;
  let lift = 0; if (g && s.x + CAR.wheel > g.a - Math.max(2, s.vx * 0.12) && s.x - CAR.wheel < g.b + 1.5) lift = s.y - CAR.wy < g.y + 1.2 + 0.4 ? 0.95 : 0.78;
  return keysFor(s, lift, s.contact && !lift ? null : 0, {right: true, boost: s.gas > reserve}); }
function hover(w, s) {
  const pad = w.plats[w.pad.plat], tx = w.pad.x, dx = tx - s.x, high = Math.max(...w.plats.filter(p => p.x1 > Math.min(s.x, tx) - 3 && p.x0 < Math.max(s.x, tx) + 3).map(p => p.y));
  const hb = s.y + CAR.wy; // height of the wheel line
  const over = Math.abs(dx) < 1.5 && groundAt(w, s.x, s.y) === pad.y;
  let hWant, vxWant;
  if (Math.abs(dx) > 1.5 && !over) { hWant = high + 3.5; const climb = hb < high + 2.2; vxWant = climb ? 0 : clamp(dx * 0.35, -7, 7); if (climb && s.contact && Math.abs(dx) > 1.5) vxWant = 0; }
  else { hWant = null; vxWant = clamp(dx * 0.5, -1.5, 1.5); }
  if (s.contact && over && Math.abs(s.vx) < 0.5) return keysFor(s, 0, null, {left: s.vx > 0.15, right: s.vx < -0.15});
  if (s.contact && Math.abs(dx) < w.pad.half - 1 && groundAt(w, s.x, s.y) === pad.y) return keysFor(s, 0, null, {left: s.vx > 0.2 || (dx < 0 && s.vx > -1), right: s.vx < -0.2 || (dx > 0 && s.vx < 1)});
  const m = CAR.m; let az;
  if (hWant !== null) az = clamp(1.6 * (hWant - hb) - 1.8 * s.vy, -3, 3);
  else { const above = hb - pad.y; const vyWant = -clamp(0.5 + above * 0.45, 0.6, 3); az = clamp(2.5 * (vyWant - s.vy), -3, 3); }
  const ax = clamp(0.9 * (vxWant - s.vx) - w.wind, -3, 3);
  const ang = clamp(-Math.atan2(ax, G + az), -0.3, 0.3), F = m * Math.hypot(ax, G + az), lift = clamp(F / CAR.lift, 0, 1);
  return keysFor(s, lift, ang); }
function space(w, s) {
  let i = -1, best = 1e9; w.items.forEach((it, j) => { const d = Math.hypot(it.x - s.x, it.y - s.y); if (!s.got[j] && d < best) { best = d; i = j; } });
  let goal = i >= 0 ? w.items[i] : w.target;
  // Go round a planet rather than through it: aim for a point on a safe circle, a little round from where we are.
  for (const b of w.bodies) { const R = b.r + 22, ex = goal.x - s.x, ey = goal.y - s.y, L2 = ex * ex + ey * ey, t = Math.max(0, Math.min(1, ((b.x - s.x) * ex + (b.y - s.y) * ey) / L2)), cx = s.x + ex * t - b.x, cy = s.y + ey * t - b.y;
    if (Math.hypot(cx, cy) < R) { const tc = Math.atan2(s.y - b.y, s.x - b.x), tg = Math.atan2(goal.y - b.y, goal.x - b.x); let dd = tg - tc; while (dd > Math.PI) dd -= 2 * Math.PI; while (dd < -Math.PI) dd += 2 * Math.PI;
      const ta = tc + Math.sign(dd || 1) * 0.6; goal = {x: b.x + (R + 8) * Math.cos(ta), y: b.y + (R + 8) * Math.sin(ta), via: true}; } }
  const dx = goal.x - s.x, dy = goal.y - s.y, d = Math.hypot(dx, dy);
  const amax = CAR.space.rcs / CAR.m, last = i < 0 && !goal.via; let vmax = last ? 6 : 7; const vm = Math.min(vmax, Math.sqrt(2 * amax * (last ? 0.15 : 0.45) * Math.max(0, d - (last ? 0.3 : 2))) + (last ? 0 : goal.via ? 3 : 1.5));
  let gx = 0, gy = 0; for (const b of w.bodies) { const bx = b.x - s.x, by = b.y - s.y, r2 = bx * bx + by * by, r = Math.sqrt(r2); gx += b.gm / r2 * bx / r; gy += b.gm / r2 * by / r; }
  let vxw = d > 1e-6 ? dx / d * vm : 0, vyw = d > 1e-6 ? dy / d * vm : 0;
  // Keep clear of planets: push the wanted velocity away from any surface we are heading for.
  for (const b of w.bodies) { const bx = s.x - b.x, by = s.y - b.y, r = Math.hypot(bx, by); if (r < b.r + 25) { vxw += bx / r * 3; vyw += by / r * 3; } }
  const ex = vxw - s.vx - gx * 0.8, ey = vyw - s.vy - gy * 0.8, ca = Math.cos(s.a), sa = Math.sin(s.a), bx = ex * ca + ey * sa, by = -ex * sa + ey * ca, th = 0.25;
  return keysFor(s, null, 0, {right: bx > th, left: bx < -th, up: by > th, down: by < -th}); }
// Fly a whole level in Node, deciding 20 times a second like the browser pilot.
export async function noop() {}
