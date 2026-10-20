// The Daily Drop run: start range, offsets, rotation rates, station tumble and propellant, all from the UK date,
// so everyone flies the same docking today. The five runs are not touched.
import {ukDate, puzzleNo, seedFor, rng} from './daily.js';
const lerp = (a, b, t) => a + (b - a) * t, r2 = (x, d = 2) => +x.toFixed(d);
export function dailyLevel(date = ukDate()) {
  const seed = seedFor(date, 'docking'), r = rng(seed), u = (a, b) => lerp(a, b, r()), sg = () => r() < 0.5 ? -1 : 1;
  const k = r(), ax = Math.round(lerp(30, 160, k * u(0.6, 1))), off = lerp(0.02, 0.03, r()) * ax;
  const tumble = r() < 0.35, spin = tumble ? r2(sg() * u(0.3, lerp(0.5, 1.0, k)), 2) : 0;
  const night = r() < 0.2, sun = night ? -90 : Math.round(u(10, 80));
  const start = {ax, y: r2(sg() * u(0.3, 1) * off), z: r2(sg() * u(0.3, 1) * off), v: [r2(-u(0, 0.05) * Math.min(1, ax / 60), 3), r2(u(-0.01, 0.01), 3), r2(u(-0.01, 0.01), 3)],
    att: [0, 0, 0].map(() => r2(sg() * u(1, lerp(3, 7, k)), 1)), rates: [0, 0, 0].map(() => r2(u(-1, 1) * lerp(0.03, 0.1, k), 3))};
  const L = {start, sun, beta: Math.round(u(0, 30)), night, early: ax <= 80}; // flown in Pilot mode: early (close) drops get the gentler drift
  if (tumble) { const w = [spin, r2(u(-0.04, 0.04), 3), r2(u(-0.03, 0.03), 3)]; L.station = {spin: w}; start.rates = start.rates.map((x, i) => r2(x - w[i], 3)); }
  L.fuel = Math.round(8 + ax * 0.1 + (tumble ? 6 + Math.abs(spin) * 6 : 0) + u(0, 3));
  L.par = Math.round(300 + ax * 3.5 + (tumble ? 150 : 0));
  const n = puzzleNo(date); // the blurb shows Pilot propellant: the Daily Drop is flown in Pilot mode, 1.6× the fuel
  return {...L, id: 'daily', daily: true, date, no: n, seed, difficulty: r2(k), name: n < 0 ? "Daily Drop preview" : `Daily Drop #${n}`, short: `${ax} m`,
    blurb: `${ax} m out, ${Math.round(Math.hypot(start.y, start.z) * 100)} cm off the axis${tumble ? `, station spinning at ${Math.abs(spin)}°/s` : ', station holding steady'}${night ? ', in orbital night' : ''}, ${Math.round(L.fuel * 1.6)} kg of propellant.`};
}
