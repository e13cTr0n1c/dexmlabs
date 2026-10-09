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
