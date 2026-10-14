export const MU = 3.986e14, R = 6.371e6, G0 = 9.80665, ORBIT = 150e3, KARMAN = 100e3;
export const ENGINES = {
  kero: {name: 'Kerosene engine', thrust: 845e3, ispSl: 282, ispVac: 311, mass: 470},
  keroVac: {name: 'Kerosene vacuum engine', thrust: 981e3, ispSl: 0, ispVac: 348, mass: 490},
  hydro: {name: 'Hydrogen engine', thrust: 110e3, ispSl: 0, ispVac: 450, mass: 300},
};
export const TANK = {kero: 0.05, keroVac: 0.05, hydro: 0.1};
export const rho = h => h > 150e3 ? 0 : 1.225 * Math.exp(-h / 8500);
export function stages(d) {
  const s2dry = d.p2 * 1000 * TANK[d.e2] + ENGINES[d.e2].mass * d.n2, s1dry = d.p1 * 1000 * TANK.kero + ENGINES.kero.mass * d.n1;
  return [{e: ENGINES.kero, n: d.n1, prop: d.p1 * 1000, dry: s1dry}, {e: ENGINES[d.e2], n: d.n2, prop: d.p2 * 1000, dry: s2dry}];
}
export const liftoffMass = d => stages(d).reduce((a, s) => a + s.prop + s.dry, 0) + d.payload * 1000;
export function deltaV(d) {
  const [a, b] = stages(d), top = b.prop + b.dry + d.payload * 1000;
  return a.e.ispVac * G0 * Math.log((top + a.prop + a.dry) / (top + a.dry)) + b.e.ispVac * G0 * Math.log(top / (top - b.prop));
}
export function orbitOf(s) {
  const r = Math.hypot(s.x, s.y), v2 = s.vx ** 2 + s.vy ** 2, en = v2 / 2 - MU / r, h = s.x * s.vy - s.y * s.vx;
  if (en >= 0) return {peri: Infinity, apo: Infinity};
  const a = -MU / (2 * en), e = Math.sqrt(Math.max(0, 1 + 2 * en * h * h / MU ** 2));
  return {peri: a * (1 - e) - R, apo: a * (1 + e) - R};
}
// Gravity turn: pitch from vertical grows with the square root of altitude until the turn altitude, then flat.
export function fly(d, {dt = 0.5, maxT = 1200, trace = false} = {}) {
  const st = stages(d); let stage = 0, prop = st[0].prop, t = 0, maxQ = 0;
  const mass = () => d.payload * 1000 + (stage === 0 ? st[0].dry + prop + st[1].dry + st[1].prop : st[1].dry + prop);
  const s = {x: 0, y: R, vx: 465, vy: 0}; const path = [];
  const tw = st[0].n * st[0].e.thrust / (mass() * G0);
  if (tw < 1.05) return {ok: false, why: 'pad', tw, path, peri: -R, apo: 0, t: 0, maxQ: 0};
  let why = 'fuel';
  while (t < maxT) {
    const r = Math.hypot(s.x, s.y), h = r - R, ux = s.x / r, uy = s.y / r, tx = uy, ty = -ux;
    if (h < -1) { why = 'crash'; break; }
    const o = orbitOf(s); if (o.peri > ORBIT) { why = 'orbit'; break; }
    const den = rho(h), vrelx = s.vx - 465 * uy, vrely = s.vy + 465 * ux, vrel = Math.hypot(vrelx, vrely), q = 0.5 * den * vrel * vrel; maxQ = Math.max(maxQ, q);
    let ax = -MU / r ** 2 * ux, ay = -MU / r ** 2 * uy;
    if (prop > 0) {
      const e = st[stage].e, n = st[stage].n, p = Math.exp(-h / 8500), isp = e.ispSl ? e.ispVac - (e.ispVac - e.ispSl) * p : e.ispVac, F = n * e.thrust * (e.ispSl ? isp / e.ispVac : 1);
      const vr = s.vx * ux + s.vy * uy, pitch = h < d.turn * 1000 ? Math.sqrt(Math.max(0, h) / (d.turn * 1000)) * Math.PI / 2 : Math.PI / 2 + Math.max(-1, Math.min(0.5, vr / 250)), m = mass();
      ax += F / m * (Math.cos(pitch) * ux + Math.sin(pitch) * tx); ay += F / m * (Math.cos(pitch) * uy + Math.sin(pitch) * ty);
      prop = Math.max(0, prop - F / (isp * G0) * dt);
    } else if (stage === 0) { stage = 1; prop = st[1].prop; t += 0; continue; }
    const m = mass(), drag = q * 0.3 * 10 / m; if (vrel > 0) { ax -= drag * vrelx / vrel; ay -= drag * vrely / vrel; }
    s.vx += ax * dt; s.vy += ay * dt; s.x += s.vx * dt; s.y += s.vy * dt; t += dt;
    if (prop === 0 && stage === 1 && (s.vx * ux + s.vy * uy) < 0 && h < 50e3) { why = 'fell'; break; }
    if (trace && Math.round(t / dt) % 4 === 0) path.push([Math.atan2(s.x, s.y) * R, h, stage]);
  }
  const o = orbitOf(s), r = Math.hypot(s.x, s.y);
  return {ok: why === 'orbit', why, tw, path, peri: o.peri, apo: o.apo, t, maxQ, alt: r - R, speed: Math.hypot(s.vx, s.vy), fuelLeft: stage === 1 ? prop : st[1].prop};
}
