// The test autopilot. It only uses what a player has: A/D held or not, W/S held or not, and Space,
// 20 decisions a second, so if it can finish a job a player can.
import {step, HELI, maxTop, inZone, endOf, inWater, wind, G} from '../js/physics.js';
export function fly(w, o = {}) {
  const dt = 1 / 60; let s = w.start; s = JSON.parse(JSON.stringify(s)); let p = {tilt: 0, lift: 0, rel: false};
  for (let i = 0; i < 60 * (o.max || 900) && !s.done; i++) { if (i % 3 === 0) p = decide(w, s); else p = {...p, rel: false}; step(w, s, p, dt); }
  return s;
}
const sgn = (e, d) => e > d ? 1 : e < -d ? -1 : 0;
export function decide(w, s) {
  const A = HELI.attach, L = w.rope, e = endOf(s); let gx, gy, rel = false, ready = false;
  const cruise = (gxx, extra) => maxTop(w, Math.min(s.x, gxx) - 16, Math.max(s.x, gxx) + 16) + A + L + extra;
  if (w.fire) {
    const b = s.items[0];
    if (s.phase === 'fill' || s.dumping || s.drops.length) {
      const q = w.water[0]; gx = (q.x0 + q.x1) / 2; const over = Math.abs(b.x - gx) < 6 && Math.abs(s.vx) < 1.5;
      gy = s.water >= 1 || s.dumping ? s.y : over ? -1.6 + A + L + b.h : cruise(gx, b.h + 8);
      if (s.dumping || s.drops.length) { gx = s.x; gy = s.y; }
    } else {
      const f = w.fire, hd = 12, tf = Math.sqrt(2 * hd / G) + 0.5, wx = wind(w, 10, s.t); gx = (f.x0 + f.x1) / 2 - wx * tf * 0.75 - b.vx * 0; const over = Math.abs(b.x - gx) < 3;
      gy = over ? hd + A + L + b.h : cruise(gx, b.h + 8); ready = over && Math.abs(s.vx) < 1 && Math.abs(b.vx) < 1 && Math.abs(s.y - gy) < 2.5;
      if (ready) rel = true;
    }
  } else {
    const t = w.tasks[s.task]; if (!t) return {tilt: 0, lift: 0, rel: false}; const it = s.items[t.item];
    if (s.carry !== t.item) { gx = it.x; const top = it.y + it.h / 2, close = Math.abs(s.hook.x - it.x) < 1.2 && Math.abs(s.x - it.x) < 1.5 && Math.abs(s.vx) < 0.6;
      gy = close ? top + A + L - 0.5 : Math.abs(s.x - it.x) < 4 ? Math.max(s.y - 0.1, top + A + L + 3) : cruise(gx, 6); if (s.carry >= 0) { rel = true; } }
    else { gx = t.zone.x; const close = Math.abs(it.x - gx) < Math.min(0.7, t.zone.half * 0.4) && Math.abs(it.vx) < 0.45 && Math.abs(s.vx) < 0.45;
      gy = close ? t.zone.y + it.h + A + L - 0.8 : Math.abs(it.x - gx) < 6 ? Math.max(Math.min(s.y, t.zone.y + it.h + A + L + 6), t.zone.y + it.h + A + L + 1.5) : cruise(gx, it.h + 7);
      if (!w.assist.hover && it.rest && inZone(t, it)) rel = true; }
  }
  const ref = s.carry >= 0 ? 0.6 * s.x + 0.4 * e.x : s.x, dx = gx - ref, low = s.y < gy - 5 && Math.abs(dx) > 8;
  const vmax = low ? 0 : 12; let vxd = Math.abs(dx) < 0.35 ? 0 : Math.sign(dx) * Math.max(0.7, Math.min(vmax, Math.abs(dx) * 0.3));
  // Without the damper, fly under the load to calm the swing, as a pilot would.
  if (!w.assist.damp && s.carry >= 0 && Math.abs(dx) < 10) vxd += 0.8 * (e.x - s.x);
  return {tilt: sgn(vxd - s.vx, vxd ? 0.35 : 0.6), lift: sgn(gy - s.y, 0.8), rel};
}
