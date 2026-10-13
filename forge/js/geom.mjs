function corners(o) {
  const c = Math.cos(o.angle);
  const s = Math.sin(o.angle);
  const hw = o.w / 2;
  const hh = o.h / 2;
  const out = [];
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      out.push({
        x: o.x + sx * hw * c - sy * hh * s,
        y: o.y + sx * hw * s + sy * hh * c
      });
    }
  }
  return out;
}
function project(pts, ax, ay) {
  let min = Infinity;
  let max = -Infinity;
  for (const p of pts) {
    const d = p.x * ax + p.y * ay;
    if (d < min) min = d;
    if (d > max) max = d;
  }
  return { min, max };
}
function obbOverlap(a, b, inset = 0) {
  const A = { ...a, w: a.w - inset * 2, h: a.h - inset * 2 };
  const B = { ...b, w: b.w - inset * 2, h: b.h - inset * 2 };
  if (A.w <= 0 || A.h <= 0 || B.w <= 0 || B.h <= 0) return false;
  const ca = corners(A);
  const cb = corners(B);
  const axes = [
    { x: Math.cos(A.angle), y: Math.sin(A.angle) },
    { x: -Math.sin(A.angle), y: Math.cos(A.angle) },
    { x: Math.cos(B.angle), y: Math.sin(B.angle) },
    { x: -Math.sin(B.angle), y: Math.cos(B.angle) }
  ];
  for (const axis of axes) {
    const pa = project(ca, axis.x, axis.y);
    const pb = project(cb, axis.x, axis.y);
    if (pa.max < pb.min || pb.max < pa.min) return false;
  }
  return true;
}
function pointInObb(px, py, o) {
  const c = Math.cos(-o.angle);
  const s = Math.sin(-o.angle);
  const dx = px - o.x;
  const dy = py - o.y;
  const lx = dx * c - dy * s;
  const ly = dx * s + dy * c;
  return Math.abs(lx) <= o.w / 2 && Math.abs(ly) <= o.h / 2;
}
function pointInCircle(px, py, cx, cy, r) {
  return (px - cx) ** 2 + (py - cy) ** 2 <= r * r;
}
export {
  obbOverlap,
  pointInCircle,
  pointInObb
};
