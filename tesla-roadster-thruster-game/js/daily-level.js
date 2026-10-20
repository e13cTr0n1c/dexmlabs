// The Daily Drop: one run a day built from the UK date, the same for everyone. It picks a mode and builds a strip,
// a set of platforms or a field of stars from the seed. The nine levels are not touched.
import {ukDate, puzzleNo, seedFor, rng} from './daily.js';
const lerp = (a, b, t) => a + (b - a) * t, r1 = x => Math.round(x * 10) / 10;
export function dailyLevel(date = ukDate()) {
  const seed = seedFor(date, 'roadster'), r = rng(seed), u = (a, b) => lerp(a, b, r()), k = r(), pick = r();
  const mode = pick < 0.34 ? 'sprint' : pick < 0.67 ? 'hover' : 'space'; let L;
  if (mode === 'sprint') {
    const long = r() < 0.4, finish = long ? 805 : 402, n = Math.floor(u(0, 2.99)), plats = []; let x = -40, y = 0;
    const cuts = Array.from({length: n}, (_, i) => Math.round(lerp(150, finish - 120, (i + 0.5 + u(-0.3, 0.3)) / n)));
    for (const c of cuts) { const gap = Math.round(u(14, lerp(20, 32, k))); plats.push({x0: x, x1: c, y}); x = c + gap; y = r1(y - (r() < 0.5 ? u(0, 2.5) : 0)); }
    plats.push({x0: x, x1: finish + 500, y});
    L = {mode, plats, finish, par: +(finish === 805 ? 7.6 : 5.0) + n * 0.1, gas: 100, tmax: 40, blurb: `${finish === 805 ? 'Half a mile' : 'A quarter mile'}, ${n ? `${n} gap${n > 1 ? 's' : ''} to lift over` : 'flat and fast'}.`};
  } else if (mode === 'hover') {
    const n = 2 + Math.floor(u(0, lerp(1.6, 2.99, k))), plats = [{x0: -20, x1: 22, y: 0}]; let x = 22, y = 0;
    for (let i = 1; i < n; i++) { const gap = Math.round(u(12, 22)), wid = Math.round(u(lerp(22, 12, k), 26)); y = r1(Math.max(0, y + u(-3, lerp(4, 7, k)))); plats.push({x0: x + gap, x1: x + gap + wid, y}); x += gap + wid; }
    const last = plats[n - 1], half = r1(Math.min(u(lerp(8, 4.5, k), 8), (last.x1 - last.x0) / 2 - 2.5));
    L = {mode, plats, pad: {plat: n - 1, x: r1((last.x0 + last.x1) / 2), half}, wind: r1(u(-1, 1) * lerp(0.1, 0.4, k) * 10) / 10, par: 10 + 5 * n, gas: 100, tmax: 120,
      blurb: `${n - 1} hop${n > 2 ? 's' : ''} to a ${(half * 2).toFixed(0)} m pad${Math.abs(L?.wind || 0) ? '' : ''}.`};
  } else {
    const mars = r() < 0.4, n = 3 + Math.floor(u(0, lerp(2, 3.99, k))), items = []; const bodies = mars ? [{x: 0, y: 0, r: 50, gm: 2000}] : [];
    for (let i = 0; items.length < n && i < 200; i++) { const p = mars ? (() => { const a = u(0, 6.283), d = u(95, 150); return [Math.round(Math.cos(a) * d), Math.round(Math.sin(a) * d)]; })() : [Math.round(u(20, 200)), Math.round(u(-70, 70))];
      if (items.every(q => Math.hypot(q[0] - p[0], q[1] - p[1]) > 25)) items.push(p); }
    const start = mars ? {x: -200, y: 0, vx: r1(u(0, 1.5)), vy: r1(u(-1, 1))} : {x: 0, y: 0, vx: r1(u(0, 2.5)), vy: r1(u(-1, 1))};
    const target = mars ? {x: -170, y: Math.round(u(-80, 80)), r: 4} : {x: Math.round(u(60, 220)), y: Math.round(u(-90, 90)), r: 4};
    L = {mode, start, items, target, bodies, par: 40 + 14 * n, gas: mars ? 150 : 120, tmax: 360, bound: 900, sky: mars ? 'mars' : 'earth', blurb: `${n} stars ${mars ? 'around Mars' : 'near Earth'}, then the beacon.`};
  }
  if (mode === 'hover') L.blurb = L.blurb.replace('.', L.wind ? `, ${Math.abs(L.wind) > 0.25 ? 'a stiff' : 'a light'} crosswind.` : '.');
  const no = puzzleNo(date); return {...L, id: 'daily', daily: true, date, no, seed, mult: +(1.5 + 1.5 * k).toFixed(2), name: `Daily Drop #${no}`};
}
