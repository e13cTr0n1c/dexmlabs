/** Where the wheels sit, shared by the 3D view and the flat fallback. Left to right as on the SZ40/42:
 *  psi 1 to 5, mu37, mu61, chi 1 to 5. Sizes are scaled from the cam count so the big wheels look big. */
import {WHEELS} from './lorenz.js';
export const SPACING = 0.62, GROUP_GAP = 0.5;
export const radiusFor = size => 0.5 + size * 0.02;
export const LAYOUT = Object.freeze((() => {
  let x = 0, prev = null; const out = [];
  for (const w of WHEELS) { if (prev && prev !== w.group) x += GROUP_GAP; out.push({...w, x, r: radiusFor(w.size)}); x += SPACING; prev = w.group; }
  const mid = (out[0].x + out.at(-1).x) / 2;
  return out.map(o => Object.freeze({...o, x: o.x - mid}));
})());
export const WIDTH = LAYOUT.at(-1).x - LAYOUT[0].x;
/** Angle of the wheel so that cam index `pos` (0 based) is at the reading point at the top. */
export const angleFor = (pos, size) => -pos * Math.PI * 2 / size;

/** Camera framing for the 3D rack, shared with the tests. Starting from a comfortable distance, it backs the camera
 *  off until every wheel label (drawn above its wheel, `labelPx` tall) and the base fit inside the canvas, with a
 *  small margin. Returns the camera position and the point it looks at. Plain maths, no three.js. */
export const LABEL_LIFT = 0.55;
export function frameCamera(width, height, {fov = 30, yaw = -0.35, pitch = 0.32, labelPx = 34, labelHalfPx = 18, marginPx = 6} = {}) {
  const aspect = width / height, t = Math.tan(fov * Math.PI / 360), top = Math.max(...LAYOUT.map(w => w.r + LABEL_LIFT)), ty = (top + -2.0) / 2 - 0.05;
  const fitW = (WIDTH + 3.2) / 2 / t / aspect;
  let dist = Math.max(9, fitW * (aspect < 1 ? 1.02 : 1.1));
  const points = [...LAYOUT.map(w => ({p: [w.x, w.r + LABEL_LIFT, 0], label: true})), ...LAYOUT.map(w => ({p: [w.x, -w.r, 0]})),
    ...[-1, 1].flatMap(sx => [-1, 1].map(sz => ({p: [sx * (WIDTH / 2 + 0.8), -2.0, sz * 1.1]})))];
  const fits = d => points.every(({p, label}) => {
    const s = project(p, cameraAt(d, yaw, pitch), [0, ty, 0], t, aspect); if (!s) return false;
    const px = (s[0] + 1) / 2 * width, py = (1 - s[1]) / 2 * height;
    const up = label ? labelPx : 0, side = label ? labelHalfPx : 0;
    return py - up >= marginPx && py <= height - marginPx && px - side >= marginPx && px + side <= width - marginPx;
  });
  for (let i = 0; i < 80 && !fits(dist); i++) dist *= 1.04;
  return {position: cameraAt(dist, yaw, pitch), target: [0, ty, 0], dist};
}
export const cameraAt = (d, yaw, pitch) => [Math.sin(yaw) * d, Math.sin(pitch) * d * 0.9 + 0.4, Math.cos(yaw) * d];
/** Where a point lands in normalised device coordinates (x and y from -1 to 1), for a camera at `eye` looking at
 *  `target` with y up. Null when the point is behind the camera. */
export function project(p, eye, target, tanHalfFov, aspect) {
  const sub = (a, b) => a.map((v, i) => v - b[i]), dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const norm = a => { const l = Math.hypot(...a); return a.map(v => v / l); }, cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const f = norm(sub(target, eye)), r = norm(cross(f, [0, 1, 0])), u = cross(r, f), v = sub(p, eye), z = dot(v, f);
  if (z <= 0) return null;
  return [dot(v, r) / (z * tanHalfFov * aspect), dot(v, u) / (z * tanHalfFov)];
}
