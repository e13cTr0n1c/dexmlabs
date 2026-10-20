// The Daily Drop job: the kind of job, the distances, the rope, the wind and the sky all come from the UK date,
// so everyone flies the same job today. The seven levels are not touched.
import {ukDate, puzzleNo, seedFor, rng} from './daily.js';
const lerp = (a, b, t) => a + (b - a) * t;
export function dailyLevel(date = ukDate()) {
  const seed = seedFor(date, 'sling'), r = rng(seed), u = (a, b) => lerp(a, b, r()), pick = a => a[Math.floor(r() * a.length)], k = r();
  const kind = pick(['crate', 'crate', 'ac', 'log', 'fire', 'bridge']), sky = pick(['morning', 'day', 'golden', 'dusk']), dir = r() < 0.5 ? -1 : 1;
  const wind = {base: +(dir * u(0, lerp(2, 6, k))).toFixed(1), gust: +u(0.5, lerp(1.5, 4, k)).toFixed(1), turb: +u(0, lerp(0.2, 0.7, k)).toFixed(2)};
  const far = Math.round(lerp(130, 260, k) + u(-15, 15)), tr = (x, i) => ({x0: x - 3.5, x1: x + 3.5, top: 16 + Math.round(u(0, 7)), k: 'tree'});
  let L;
  if (kind === 'crate') { const cx = Math.round(u(30, 60)), h = Math.round(u(4, 8)), bx = Math.round(lerp(cx, far, u(0.35, 0.65)));
    L = {scene: 'yard', rope: Math.round(u(14, 18)), start: {x: 0, y: 24}, items: [{kind: 'crate', x: cx}], tasks: [{item: 0, zone: {x: far, half: +u(4, 5.5).toFixed(1)}}], solids: [{x0: bx - 7, x1: bx + 7, top: h, k: 'container'}]}; }
  else if (kind === 'ac') { const roof = Math.round(u(20, 34)), bx = far, tall = roof + Math.round(u(6, 14));
    L = {scene: 'town', rope: Math.round(u(16, 20)), start: {x: 0, y: 28}, items: [{kind: 'ac', x: Math.round(u(25, 40))}], tasks: [{item: 0, zone: {x: bx, half: 3.2}}],
      solids: [{x0: bx - 62, x1: bx - 38, top: tall, k: 'building'}, {x0: bx - 20, x1: bx + 20, top: roof, k: 'building', roof: 1}, {x0: bx + 34, x1: bx + 60, top: Math.round(u(16, 26)), k: 'building'}]}; }
  else if (kind === 'log') { const lx = Math.round(u(50, 70)), xs = [lx - 42, lx - 30, lx - 18, lx + 18, lx + 30, lx + 44, lx + 90, lx + 102, far - 40, far - 28];
    L = {scene: 'forest', rope: Math.round(u(28, 32)), start: {x: 0, y: 44}, items: [{kind: 'log', x: lx}], tasks: [{item: 0, zone: {x: far + 40, half: 4}}], solids: xs.map(tr)}; }
  else if (kind === 'fire') { const l0 = Math.round(u(50, 80)), fx = far + 60;
    L = {scene: 'fire', rope: Math.round(u(18, 22)), start: {x: 0, y: 34}, carry: 0, items: [{kind: 'bucket', x: 0}], water: [{x0: l0, x1: l0 + Math.round(u(80, 100))}].map(q => ({...q, depth: 4})), fire: {x0: fx, x1: fx + Math.round(u(28, 36))}, tasks: [],
      solids: [fx - 36, fx - 22, fx + 58, fx + 72].map(tr)}; }
  else { const px = far, gap = Math.round(u(14, 16)), top = Math.round(u(10, 14)), c = px + gap / 2 + 8;
    L = {scene: 'river', rope: Math.round(u(23, 27)), start: {x: 0, y: 40}, items: [{kind: 'bridge', x: Math.round(u(45, 55))}], tasks: [{item: 0, zone: {x: c, half: 2}}], water: [{x0: px - 14, x1: px + gap + 30, depth: 6}],
      solids: [{x0: px, x1: px + 8, top, k: 'pier'}, {x0: px + 8 + gap, x1: px + 16 + gap, top, k: 'pier'}]}; }
  const dist = (L.fire ? L.fire.x0 : L.tasks[0].zone.x);
  const par = Math.round((L.fire ? 150 : 50 + dist * 0.25) + (kind === 'bridge' ? 40 : 0)), fuel = Math.round(par * 1.6);
  const n = puzzleNo(date), mult = +(1.5 + 1.5 * k).toFixed(2), names = {crate: 'Crate run', ac: 'Rooftop AC', log: 'Forest log', fire: 'Fire bucket', bridge: 'Bridge span'};
  const xs = [L.start.x, dist, ...(L.solids || []).map(o => o.x1), ...(L.water || []).map(q => q.x1), L.fire ? L.fire.x1 : 0];
  return {...L, wind, sky, par, fuel, mult, kind, id: 'daily', daily: true, date, no: n, seed, difficulty: +k.toFixed(2), bounds: [-80, Math.max(...xs) + 70],
    name: n < 0 ? 'Daily Drop preview' : `Daily Drop #${n}`, blurb: `${names[kind]}, ${Math.round(dist)} m out, ${L.rope} m rope, wind ${Math.abs(wind.base)} m/s gusting ${wind.gust}.`};
}
