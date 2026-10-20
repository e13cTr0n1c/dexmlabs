// The Daily Drop task: route, thermals, wind, ridge or wave and the sky all come from the UK date,
// so everyone flies the same task today. The seven levels are not touched.
import {ukDate, puzzleNo, seedFor, rng} from './daily.js';
const lerp = (a, b, t) => a + (b - a) * t;
const af = (x, len = 1000) => ({kind: 'airfield', x0: x - len / 2, x1: x + len / 2});
export function dailyLevel(date = ukDate()) {
  const seed = seedFor(date, 'glider'), r = rng(seed), u = (a, b) => lerp(a, b, r()), pick = a => a[Math.floor(r() * a.length)], k = r();
  const kind = pick(['out-return', 'out-return', 'goal', 'ridge', 'triangle']), sky = pick(['gold', 'dusk', 'sunset']);
  const wbase = +(u(0, lerp(2, 4, k))).toFixed(1), out = Math.round(lerp(8000, 15000, k) + u(-600, 600)), w = lerp(3.4, 2.8, k);
  const therm = (x, z = 0) => ({x: Math.round(x), z: Math.round(z), r: Math.round(u(220, 250)), w: +u(w, w + 0.4).toFixed(1), base: Math.round(u(1500, 1800))});
  const thermals = [], n = Math.ceil(out / 3800); for (let i = 0; i < n; i++) thermals.push(therm(1800 + i * (out - 1000) / n + u(-300, 300), u(-150, 150)));
  const surface = [af(0)]; let x = 3000 + u(0, 1500); while (x < out + 3000) { const kd = pick(['forest', 'forest', 'town', 'water']), len = Math.round(u(500, 1200)); surface.push({kind: kd, x0: Math.round(x), x1: Math.round(x + len)}); x += len + u(2500, 4500); }
  let L = {start: {x: 0, agl: Math.round(u(480, 600))}, thermals, surface, hills: [], ridges: [], wind: {base: wbase}, sink: +u(0.3, 0.45).toFixed(2), sky};
  if (kind === 'out-return') L = {...L, tps: [{x: out, name: 'Turn'}], finish: {x0: -500, x1: 500, spot: -100}};
  else if (kind === 'goal') { const g = out + 4000; for (let i = 0; i < 2; i++) thermals.push(therm(out + 400 + i * 1800, u(-150, 150))); L = {...L, finish: {x0: g - 500, x1: g + 500, spot: g - 200}, surface: [...surface.filter(f => f.x1 < g - 800 || f.x0 > g + 800), af(g)]}; }
  else if (kind === 'ridge') { const rx = Math.round(out * 0.5), h = Math.round(u(280, 360)); L = {...L, wind: {base: +u(8, 10).toFixed(1)}, hills: [{x: rx, h, up: 700, down: 1400}], ridges: [{x: rx, face: 1}], thermals: [], start: {x: rx - 2600, agl: 420},
    surface: [af(rx - 2600), ...surface.filter(f => f.x1 < rx - 1200 || f.x0 > rx + 1600), af(rx + 10500)], finish: {x0: rx + 10000, x1: rx + 11000, spot: rx + 10300}}; }
  else { const tz = Math.round(u(2500, 3500)) * (r() < 0.5 ? -1 : 1), t2 = Math.round(out * 0.6); thermals.push(therm(t2 * 0.6, tz * 0.6), therm(t2 * 0.3, tz * 0.3));
    L = {...L, tps: [{x: out, name: 'First'}, {x: t2, z: tz, name: 'Second'}], finish: {x0: -500, x1: 500, spot: -100}}; }
  const pts = [L.start.x, ...(L.tps || []).map(p => p.x), L.finish.spot], lo = Math.min(...pts), hi = Math.max(...pts);
  const dist = Math.round((L.tps || []).reduce((a, p, i, A) => a + Math.hypot(p.x - (i ? A[i - 1].x : L.start.x), (p.z || 0) - (i ? A[i - 1].z || 0 : 0)), 0) + Math.abs(L.finish.spot - (L.tps?.length ? L.tps[L.tps.length - 1].x : L.start.x)));
  const no = puzzleNo(date), mult = +(1.5 + 1.5 * k).toFixed(2), names = {'out-return': 'Out and return', goal: 'Goal flight', ridge: 'Ridge run', triangle: 'Triangle'};
  return {...L, id: 'daily', daily: true, date, no, seed, kind, difficulty: +k.toFixed(2), mult, par: Math.round(300 + dist / 12), bounds: [lo - 8000, hi + 8000],
    name: no < 0 ? 'Daily Drop preview' : `Daily Drop #${no}`, blurb: `${names[kind]}, ${(dist / 1000).toFixed(1)} km, wind ${L.wind.base} m/s, ${L.thermals.length ? L.thermals.length + ' thermals' : 'ridge lift only'}.`};
}
