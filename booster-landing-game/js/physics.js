// Booster landing, the last few kilometres. SI units. x along the sea, y up from the sea surface,
// angle in radians (0 upright, + tilts the thrust towards +x). Same conventions as the Apollo game.
export const G = 9.81, G0 = 9.80665, DRY = 20000, THRUST = 420000, ISP = 300, SOUND = 340;
export const THROTTLE = {min: 0.4, step: 0.05};
// Q/E: cold gas thrusters, rate command with attitude hold. A/D: engine gimbal, a small sideways push.
export const RCS = {rate: 14 * Math.PI / 180, acc: 32 * Math.PI / 180, flow: 0.9, limit: 40 * Math.PI / 180};
export const GIMBAL = {max: 5 * Math.PI / 180, slew: 20 * Math.PI / 180};
export const AERO = {axial: 19, legs: 5, side: 90, fins: 33, rho0: 1.225, H: 8500};
export const LEGS = {time: 1.6, maxSpeed: 90, span: 8};
export const LIMITS = {down: 4, side: 2, tilt: 8 * Math.PI / 180};
export const HEAT = {q0: 4.0e6, k: 1 / 2.1e6, plume: 0.35, cool: 4};
export const massFlow = th => th * THRUST / (ISP * G0);
export const hoverThrottle = m => m * G / THRUST;
export const hoverSeconds = s => s.fuel / massFlow(hoverThrottle(DRY + s.fuel));
export const throttleUp = th => th <= 0 ? THROTTLE.min : Math.min(1, Math.round((th + THROTTLE.step) * 20) / 20);
export const throttleDown = th => th <= THROTTLE.min + 1e-9 ? 0 : Math.round((th - THROTTLE.step) * 20) / 20;
export const rho = y => AERO.rho0 * Math.exp(-Math.max(0, y) / AERO.H);
export const DEG = 180 / Math.PI;

// Small seeded random numbers, so every flight's gusts can be replayed.
export function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// A world is a level plus a seed: the sea, the wind and the start.
export function makeWorld(level, seed = 1) {
  const r = rng(seed), ph = () => r() * Math.PI * 2;
  const waves = [0, 1, 2].map(i => ({a: [0.62, 0.28, 0.1][i], w: 2 * Math.PI / (level.sea.period * [1, 0.63, 0.41][i]), p: ph()}));
  const rolls = [0, 1].map(i => ({a: [0.75, 0.25][i], w: 2 * Math.PI / (level.sea.period * [1.13, 0.57][i]), p: ph()}));
  const gusts = [0, 1, 2, 3].map(i => ({a: [0.45, 0.3, 0.17, 0.08][i], w: 2 * Math.PI / [23, 11, 5.3, 2.7][i], p: ph()}));
  const turb = [0, 1, 2].map(i => ({a: [0.55, 0.3, 0.15][i], w: 2 * Math.PI / [6.1, 2.9, 1.3][i], p: ph()}));
  const st = level.start, jx = (r() - 0.5) * 2 * (st.jitter || 0);
  return {level, seed, waves, rolls, gusts, turb, deck: {half: 45, h: 3.2},
    start: {x: st.x + jx, y: st.y, vx: st.vx, vy: st.vy, angle: st.angle || 0, omega: 0, gimbal: 0, fuel: level.fuel, rcs: level.rcs, throttle: 0, legs: 0, legsOut: false, legsBroken: false, heat: 0, t: 0}};
}
const sum = (list, t) => list.reduce((v, c) => v + c.a * Math.sin(c.w * t + c.p), 0);
const dsum = (list, t) => list.reduce((v, c) => v + c.a * c.w * Math.cos(c.w * t + c.p), 0);
// The deck heaves and pitches with the swell. pitch > 0 lifts the +x end.
export function deck(w, t) {
  const L = w.level.sea, y = w.deck.h + L.heave * sum(w.waves, t), vy = L.heave * dsum(w.waves, t);
  const pitch = L.pitch * sum(w.rolls, t), rate = L.pitch * dsum(w.rolls, t);
  return {x: 0, vx: 0, y, vy, pitch, rate, half: w.deck.half};
}
export const deckYAt = (d, x) => d.y + (x - d.x) * Math.tan(d.pitch);
export const seaY = (w, x, t) => w.level.sea.heave * 0.8 * Math.sin(x / 23 + t * 0.9) * Math.sin(x / 61 - t * 0.4);
// Wind along x in m/s, stronger higher up, gusting.
export function wind(w, y, t) { const L = w.level.wind; return (L.base + L.gust * sum(w.gusts, t) / 0.6) * (1 + Math.min(1, Math.max(0, y) / 4000) * 0.6); }
export const turbulence = (w, t) => w.level.wind.turb * Math.PI / 180 * sum(w.turb, t);

// Why a touchdown fails, or null if it's a landing.
export function touchdownFault(s, d, impact, slide, tilt) {
  const dx = Math.abs(s.x - d.x);
  if (s.legsBroken) return {k: 'legsbroken', text: 'The legs were torn off. They came out above ' + LEGS.maxSpeed + ' m/s.'};
  if (s.legs < 1) return {k: 'nolegs', text: s.legs > 0 ? 'The legs were still unfolding at touchdown. Deploy them earlier (L).' : 'No legs. Deploy them with L before touchdown.'};
  if (impact > LIMITS.down) return {k: 'hard', text: `Hit the deck at ${impact.toFixed(1)} m/s. The legs crush at ${LIMITS.down}.`};
  if (slide > LIMITS.side) return {k: 'side', text: `Sliding at ${slide.toFixed(1)} m/s across the deck. The legs take ${LIMITS.side}.`};
  if (tilt > LIMITS.tilt) return {k: 'tilt', text: `Tilted ${(tilt * DEG).toFixed(0)}° to the deck at contact. Keep it within ${Math.round(LIMITS.tilt * DEG)}°.`};
  if (dx > d.half - LEGS.span) return {k: 'edge', text: 'A leg came down over the edge of the deck and the booster toppled into the sea.'};
  return null;
}

// One step. input: {rot: -1|0|1, gim: -1|0|1}. Throttle is set on the state, legs with deployLegs.
export function step(w, s0, input = {}, dt = 1 / 60) {
  const s = {...s0}; if (s.done) return s;
  const rot = input.rot || 0, gim = input.gim || 0;
  // Attitude: rate command. The flight computer holds the attitude when you let go.
  const want = rot * RCS.rate; let a = 0;
  if (s.rcs > 0 && Math.abs(want - s.omega) > 1e-6) { a = Math.sign(want - s.omega) * RCS.acc; s.rcs = Math.max(0, s.rcs - RCS.flow * dt); }
  s.omega += a * dt; if (Math.abs(s.omega - want) < RCS.acc * dt && s.rcs > 0) s.omega = want;
  const q = 0.5 * rho(s.y) * (s.vx * s.vx + s.vy * s.vy);
  s.angle += (s.omega + turbulence(w, s.t) * Math.min(1.6, 0.4 + q / 6000)) * dt;
  if (Math.abs(s.angle) > RCS.limit) { s.angle = Math.sign(s.angle) * RCS.limit; s.omega = 0; s.limit = true; } else s.limit = false;
  // Gimbal slews towards the stick.
  const gw = gim * GIMBAL.max, gd = gw - s.gimbal; s.gimbal += Math.sign(gd) * Math.min(Math.abs(gd), GIMBAL.slew * dt);
  // Legs.
  if (s.legsOut && s.legs < 1) s.legs = Math.min(1, s.legs + dt / LEGS.time);
  const speed = Math.hypot(s.vx, s.vy);
  if (s.legs > 0 && speed > LEGS.maxSpeed) s.legsBroken = true;
  // Forces.
  const m = DRY + s.fuel, th = s.fuel > 0 ? s.throttle : 0, F = th * THRUST, ta = s.angle + (th > 0 ? s.gimbal : 0);
  const r = rho(s.y), wx = wind(w, s.y, s.t), rx = s.vx - wx, ry = s.vy;
  const ux = Math.sin(s.angle), uy = Math.cos(s.angle), nx = uy, ny = -ux;
  const va = rx * ux + ry * uy, vn = rx * nx + ry * ny, ax = AERO.axial + AERO.legs * s.legs * (s.legsBroken ? 0 : 1);
  const Fa = -0.5 * r * ax * Math.abs(va) * va, Fn = -0.5 * r * AERO.side * Math.abs(vn) * vn;
  // Grid fins: falling base first, leaning glides you the way you lean, like the engine does under thrust.
  const Fl = ry < 0 ? 0.5 * r * (rx * rx + ry * ry) * AERO.fins * Math.sin(s.angle) * Math.min(1, -ry / 20) : 0;
  const fx = F * Math.sin(ta) + Fa * ux + Fn * nx + Fl, fy = F * Math.cos(ta) + Fa * uy + Fn * ny;
  s.vx += fx / m * dt; s.vy += (fy / m - G) * dt;
  s.fuel = Math.max(0, s.fuel - massFlow(th) * dt);
  // Heating: fast through thick air cooks the engine section. The plume of an entry burn shields it.
  const qh = r * speed * speed * speed, shield = th > 0 && s.vy < 0 ? HEAT.plume : 1;
  s.heat = qh > HEAT.q0 ? s.heat + (qh - HEAT.q0) * HEAT.k * shield * dt : Math.max(0, s.heat - HEAT.cool * dt);
  s.heatPeak = Math.max(s.heatPeak || 0, s.heat); s.mach = speed / SOUND;
  s.x += s.vx * dt; s.y += s.vy * dt; s.t += dt;
  if (s.heat >= 100) { s.done = true; s.landed = false; s.fault = {k: 'heat', text: 'The engine section overheated coming in too fast through thick air. An entry burn slows you and its plume shields the base.'}; return s; }
  // Contact.
  const d = deck(w, s.t), dx = s.x - d.x;
  if (Math.abs(dx) <= d.half && s.y <= deckYAt(d, s.x) && s.y > deckYAt(d, s.x) - 12) {
    const dy = deckYAt(d, s.x); s.y = dy; s.done = true;
    const impact = (d.vy + dx * d.rate) - s.vy, slide = Math.abs(s.vx - d.vx), tilt = Math.abs(s.angle + d.pitch);
    s.fault = touchdownFault(s, d, impact, slide, tilt); s.landed = !s.fault;
    s.touch = {impact: Math.max(0, impact), slide, tilt, dist: Math.abs(dx), deckAngle: d.pitch};
    return s;
  }
  if (s.y <= seaY(w, s.x, s.t)) { s.done = true; s.landed = false; s.touch = {impact: -s.vy, slide: Math.abs(s.vx), tilt: Math.abs(s.angle), dist: Math.abs(dx)}; s.fault = {k: 'sea', text: Math.abs(dx) < 300 ? `Splashdown ${Math.abs(dx).toFixed(0)} m from the deck centre. Close, but the sea is not a landing pad.` : 'Into the sea, nowhere near the ship.'}; return s; }
  if (Math.abs(dx) > 6000 || s.y > 30000) { s.done = true; s.landed = false; s.fault = {k: 'range', text: 'You flew out of the recovery area.'}; }
  return s;
}
export const deployLegs = s => s.done || s.legsOut ? s : {...s, legsOut: true};
// Height at which a full throttle burn from now would stop you, ignoring drag. The burn cue on the screen.
export function stopHeight(s) { const m = DRY + s.fuel, a = THRUST / m - G; return a > 0 && s.vy < 0 ? s.vy * s.vy / (2 * a) : 0; }

// Score: soft, level, still, centred, fuel left, times the level multiplier.
export function score(s, w) {
  if (!s.done || !s.landed) return 0;
  const t = s.touch, L = w.level, reach = w.deck.half - LEGS.span;
  const soft = 300 * (1 - t.impact / LIMITS.down), level = 150 * (1 - t.tilt / LIMITS.tilt), still = 100 * (1 - t.slide / LIMITS.side);
  const centre = 350 * Math.max(0, 1 - t.dist / reach), fuel = 250 * s.fuel / L.fuel, bull = t.dist <= 3 ? 150 : 0;
  return Math.round((200 + soft + level + still + centre + fuel + bull) * L.mult);
}
export function parts(s, w) {
  const t = s.touch, L = w.level, reach = w.deck.half - LEGS.span;
  return {soft: Math.round(300 * (1 - t.impact / LIMITS.down) * L.mult), level: Math.round(150 * (1 - t.tilt / LIMITS.tilt) * L.mult), still: Math.round(100 * (1 - t.slide / LIMITS.side) * L.mult),
    centre: Math.round(350 * Math.max(0, 1 - t.dist / reach) * L.mult), fuel: Math.round(250 * s.fuel / L.fuel * L.mult), bull: t.dist <= 3 ? Math.round(150 * L.mult) : 0};
}
