import {LIMITS} from './lm.js';
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
export function rng(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export const seedOf = s => hash(s);
// Real Apollo landing sites; the terrain is made up in their character.
export const SITES = [
  {id: 'tranquillity', name: 'Sea of Tranquillity', mission: 'Apollo 11', hills: 4, ridge: 0, craters: 9, boulders: 70, field: true, note: 'Flat mare, but a boulder field near West crater, as Armstrong found.'},
  {id: 'storms', name: 'Ocean of Storms', mission: 'Apollo 12', hills: 6, ridge: 0, craters: 14, boulders: 40, note: 'Pocked with craters. Conrad landed beside the Surveyor 3 probe.'},
  {id: 'framauro', name: 'Fra Mauro highlands', mission: 'Apollo 14', hills: 14, ridge: 8, craters: 10, boulders: 50, note: 'Rolling, hilly ground with few flat spots.'},
  {id: 'hadley', name: 'Hadley Rille', mission: 'Apollo 15', hills: 8, ridge: 0, craters: 8, boulders: 40, rille: true, note: 'A deep winding channel runs past the target. Scott landed on a slope.'},
  {id: 'descartes', name: 'Descartes highlands', mission: 'Apollo 16', hills: 18, ridge: 12, craters: 12, boulders: 80, note: 'The roughest site. Highland ridges and blocky craters.'},
  {id: 'taurus', name: 'Taurus Littrow valley', mission: 'Apollo 17', hills: 6, ridge: 0, craters: 10, boulders: 50, valley: true, note: 'A narrow valley between massifs over 2,000 m high.'},
];
export const TIERS = {
  cadet: {name: 'Cadet', hover: 120, alt: [350, 450], dist: [250, 450], speed: [8, 14], alarms: 0, rcs: 80, mult: 1},
  commander: {name: 'Commander', hover: 110, alt: [450, 600], dist: [500, 850], speed: [12, 20], alarms: 1, rcs: 60, mult: 1.5},
  armstrong: {name: 'Armstrong', hover: 95, alt: [550, 700], dist: [750, 1100], speed: [18, 25], alarms: 2, rcs: 45, mult: 2},
};
export function makeWorld(site, seed, tier = 'commander') {
  const r = rng(seed), f = (a, b) => a + (b - a) * r(), W = 2400, n = W + 1, g = new Float32Array(n), T = TIERS[tier];
  const waves = Array.from({length: 4}, (_, i) => ({k: (i + 1) * f(0.6, 1.4) * 2 * Math.PI / 1600, p: f(0, 6.3), a: site.hills / (i + 1)}));
  for (let i = 0; i < n; i++) { const x = -W + 2 * i; let h = 0; for (const w of waves) h += w.a * Math.sin(w.k * x + w.p); h += site.ridge * Math.max(0, Math.sin(x / 260 + 1)) ** 3; if (site.valley) h += 0.00012 * x * x; g[i] = h; }
  if (site.rille) { const c = f(150, 260) * (r() < 0.5 ? -1 : 1); for (let i = 0; i < n; i++) { const x = -W + 2 * i, d = Math.abs(x - c); if (d < 120) g[i] -= 60 * (1 - (d / 120) ** 2); } }
  const craters = []; for (let k = 0; k < site.craters * (tier === 'cadet' ? 0.6 : 1); k++) { const R = f(8, 90) * (k === 0 && site.id === 'tranquillity' ? 2 : 1), cx = f(-W + 200, W - 200); craters.push({x: cx, R});
    for (let i = 0; i < n; i++) { const x = -W + 2 * i, d = Math.abs(x - cx) / R; if (d < 1) g[i] -= R * 0.18 * (1 - d * d); else if (d < 1.4) g[i] += R * 0.04 * (1 - (d - 1) / 0.4); } }
  // The target: a flat-ish 140 m patch, so a careful pilot can always land.
  const target = 0;
  const base = g[(target + W) / 2]; for (let i = 0; i < n; i++) { const x = -W + 2 * i, d = Math.abs(x - target); if (d < 140) { const k = d < 90 ? 0.95 : 0.95 * (1 - (d - 90) / 50); g[i] = g[i] * (1 - k) + base * k; } }
  const boulders = [];
  for (let k = 0; k < site.boulders; k++) { const x = f(-W, W); if (Math.abs(x - target) < 140 && r() < 0.7) continue; boulders.push({x, w: f(0.5, 3), h: f(0.2, 2.5)}); }
  if (site.field || tier === 'armstrong') { const c = target + (tier === 'armstrong' ? 0 : -60); for (let k = 0; k < 18; k++) boulders.push({x: c + f(-25, 25), w: f(1, 3.5), h: f(0.7, 2.5)}); }
  const dist = f(...T.dist), alt = f(...T.alt), speed = f(...T.speed), fuel = Math.round(T.hover * (0.28 * 45040 / (311 * 9.80665)));
  const alarms = Array.from({length: T.alarms}, (_, i) => ({t: f(12, 30) + i * f(20, 35), code: i === 0 ? 1202 : 1201}));
  const start = {x: target - dist, y: base + alt, vx: speed, vy: -f(8, 14), angle: -f(10, 20) * Math.PI / 180, omega: 0, fuel, rcs: T.rcs, throttle: 0.3, t: 0};
  return {W, ground: g, boulders, craters, target, start, alarms, site, tier};
}
