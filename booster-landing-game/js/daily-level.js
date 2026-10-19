// The Daily Drop flight: wind and gusts, swell, start height, offset and speed, fuel and the vehicle,
// all from the UK date, so everyone flies the same booster today. The seven levels are not touched.
import {ukDate, puzzleNo, seedFor, rng} from './daily.js';
const D = Math.PI / 180, lerp = (a, b, t) => a + (b - a) * t;
export function dailyLevel(date = ukDate()) {
  const seed = seedFor(date, 'booster'), r = rng(seed), u = (a, b) => lerp(a, b, r()), sign = () => r() < 0.5 ? -1 : 1;
  const tower = r() < 0.3, k = r(); // k: how hard today is, 0 to 1
  const sky = ['day', 'dusk', 'night'][Math.floor(r() * 3)];
  let L;
  if (!tower) {
    const y = Math.round(lerp(2400, 5200, k) + u(-200, 200)), x = Math.round(sign() * u(150, lerp(300, 650, k)));
    const vy = -Math.round(lerp(120, 200, k) + u(-10, 10)), vx = +(-Math.sign(x) * u(0, 8)).toFixed(1);
    const heave = +lerp(0.3, 1.3, u(0.6 * k, 0.4 + 0.6 * k)).toFixed(2), pitch = +lerp(0.8, 2.6, u(0.6 * k, 0.4 + 0.6 * k)).toFixed(2);
    const base = +(sign() * u(0, lerp(2, 8, k))).toFixed(1), gust = +u(1, lerp(3, 7, k)).toFixed(1), turb = +u(0, lerp(0.2, 0.6, k)).toFixed(2);
    const fuel = Math.round((4700 + (y - 2400) * 0.35 + Math.abs(x) * 0.8 + Math.abs(base) * 40 + u(0, 300)) / 50) * 50;
    L = {mission: 'ship', kind: 'ship', vehicle: 'f9', rcs: 100, fuel, start: {x, y, vx, vy, jitter: 0}, sea: {heave, pitch: pitch * D, period: +u(7.5, 9).toFixed(1)}, wind: {base, gust, turb}, sky};
  } else {
    const y = Math.round(lerp(2600, 3800, k) + u(-150, 150)), x = Math.round(u(240, lerp(320, 460, k)));
    const vy = -Math.round(lerp(120, 155, k) + u(-8, 8)), vx = +(-u(1, 6)).toFixed(1);
    const base = +(u(-1, 1) * lerp(1, 6, k)).toFixed(1), gust = +u(1, lerp(2.5, 5.5, k)).toFixed(1), turb = +u(0, lerp(0.1, 0.5, k)).toFixed(2);
    const fuel = Math.round((4900 + (y - 2600) * 0.3 + Math.abs(base) * 40 + u(0, 200)) / 50) * 50;
    L = {mission: 'tower', kind: 'tower', vehicle: 'sh', rcs: 120, fuel, start: {x, y, vx, vy, jitter: 0}, sea: {heave: 0, pitch: 0, period: 9}, wind: {base, gust, turb}, sky};
  }
  const n = puzzleNo(date), mult = +(1.5 + 1.5 * k).toFixed(2);
  return {...L, id: 'daily', daily: true, date, no: n, seed, difficulty: +k.toFixed(2), mult, name: n < 0 ? "Daily Drop preview" : `Daily Drop #${n}`,
    blurb: `${tower ? 'Tower catch' : 'Drone ship'}, ${Math.round(L.start.y / 100) / 10} km up, wind ${Math.abs(L.wind.base)} m/s gusting ${L.wind.gust}${tower ? '' : `, swell ${L.sea.heave} m`}.`};
}
