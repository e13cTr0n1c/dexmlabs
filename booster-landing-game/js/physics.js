// Booster landing, the last few kilometres. SI units. x along the ground or sea, y up from the surface,
// angle in radians (0 upright, + tilts the thrust towards +x). Same conventions as the Apollo game.
export const G = 9.81, G0 = 9.80665, SOUND = 340, DEG = 180 / Math.PI, D = Math.PI / 180;
// Two vehicles. The Super Heavy style booster is nine times the mass with nine times the thrust and drag,
// so it flies with the same feel, only bigger and slower to turn.
export const VEHICLES = {
  f9: {id: 'f9', name: 'Falcon 9 booster', short: 'Falcon 9', dry: 20000, thrust: 440000, isp: 300, axial: 19, legsDrag: 5, side: 90, fins: 33, rate: 14 * D, acc: 32 * D, rcsFlow: 0.9, height: 42.5, radius: 1.85, legs: true},
  sh: {id: 'sh', name: 'Super Heavy booster', short: 'Super Heavy', dry: 180000, thrust: 3960000, isp: 300, axial: 171, legsDrag: 0, side: 810, fins: 297, rate: 10 * D, acc: 20 * D, rcsFlow: 0.9, height: 71, radius: 4.5, legs: false, pin: 63}
};
const V0 = VEHICLES.f9;
export const DRY = V0.dry, THRUST = V0.thrust, ISP = V0.isp;
export const THROTTLE = {min: 0.4, step: 0.05};
// Q/E: cold gas thrusters, rate command with attitude hold. A/D: engine gimbal, a small sideways push.
export const RCS = {rate: V0.rate, acc: V0.acc, flow: V0.rcsFlow, limit: 40 * D};
export const GIMBAL = {max: 5 * D, slew: 20 * D};
export const AERO = {axial: V0.axial, legs: V0.legsDrag, side: V0.side, fins: V0.fins, rho0: 1.225, H: 8500};
export const LEGS = {time: 1.6, maxSpeed: 90, span: 8};
export const LIMITS = {down: 4, side: 2, tilt: 8 * D};
export const HEAT = {q0: 4.0e6, k: 1 / 2.1e6, plume: 0.35, cool: 4};
// Tower catch: the slot is at x = 0, the tower stands to its left, the arms ride a carriage up and down it.
export const TOWER = {x0: -36, x1: -15, top: 146, armY: 100, armMin: 80, armMax: 118, armLen: 40, close: 0.8, reopen: 1.4, track: 3};
export const CATCH = {dy: 3, dx: 3, vx: 2, vyDown: 2.5, vyUp: 1, tilt: 6 * D};
export const vehicleOf = w => (w && w.v) || V0;
export const massFlow = (th, v = V0) => th * v.thrust / (v.isp * G0);
export const hoverThrottle = (m, v = V0) => m * G / v.thrust;
export const hoverSeconds = (s, v = V0) => s.fuel / massFlow(hoverThrottle(v.dry + s.fuel, v), v);
export const throttleUp = th => th <= 0 ? THROTTLE.min : Math.min(1, Math.round((th + THROTTLE.step) * 20) / 20);
export const throttleDown = th => th <= THROTTLE.min + 1e-9 ? 0 : Math.round((th - THROTTLE.step) * 20) / 20;
export const rho = y => AERO.rho0 * Math.exp(-Math.max(0, y) / AERO.H);

// Small seeded random numbers, so every flight's gusts can be replayed.
export function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// A world is a level plus a seed: the sea or the tower, the wind and the start.
export function makeWorld(level, seed = 1, opts = {}) {
  const r = rng(seed), ph = () => r() * Math.PI * 2, v = VEHICLES[level.vehicle || 'f9'], k = v.dry / V0.dry;
  const waves = [0, 1, 2].map(i => ({a: [0.62, 0.28, 0.1][i], w: 2 * Math.PI / (level.sea.period * [1, 0.63, 0.41][i]), p: ph()}));
  const rolls = [0, 1].map(i => ({a: [0.75, 0.25][i], w: 2 * Math.PI / (level.sea.period * [1.13, 0.57][i]), p: ph()}));
  const gusts = [0, 1, 2, 3].map(i => ({a: [0.45, 0.3, 0.17, 0.08][i], w: 2 * Math.PI / [23, 11, 5.3, 2.7][i], p: ph()}));
  const turb = [0, 1, 2].map(i => ({a: [0.55, 0.3, 0.15][i], w: 2 * Math.PI / [6.1, 2.9, 1.3][i], p: ph()}));
  const st = level.start, jx = (r() - 0.5) * 2 * (st.jitter || 0), tower = level.kind === 'tower';
  const fuel = level.fuel * k;
  return {level, seed, v, kind: tower ? 'tower' : 'ship', assist: !!opts.assist, waves, rolls, gusts, turb, deck: {half: 45, h: 3.2}, fuel,
    start: {x: st.x + jx, y: st.y, vx: st.vx, vy: st.vy, angle: st.angle || 0, omega: 0, gimbal: 0, fuel, rcs: level.rcs, throttle: 0, legs: 0, legsOut: false, legsBroken: false, heat: 0, t: 0, soot: 0.25,
      fins: 0, arms: 0, armsCmd: 0, armY: TOWER.armY, armVy: 0, misses: 0}};
}
const sum = (list, t) => list.reduce((v, c) => v + c.a * Math.sin(c.w * t + c.p), 0);
const dsum = (list, t) => list.reduce((v, c) => v + c.a * c.w * Math.cos(c.w * t + c.p), 0);
// The deck heaves and pitches with the swell. pitch > 0 lifts the +x end.
export function deck(w, t) {
  if (w.kind === 'tower') return {x: 0, vx: 0, y: 0, vy: 0, pitch: 0, rate: 0, half: 60};
  const L = w.level.sea, y = w.deck.h + L.heave * sum(w.waves, t), vy = L.heave * dsum(w.waves, t);
  const pitch = L.pitch * sum(w.rolls, t), rate = L.pitch * dsum(w.rolls, t);
  return {x: 0, vx: 0, y, vy, pitch, rate, half: w.deck.half};
}
// Where the booster's base should end up: on the deck, or with its catch pins level with the arms.
export function target(w, s) {
  if (w.kind !== 'tower') return deck(w, s.t);
  return {x: 0, vx: 0, y: s.armY - w.v.pin, vy: s.armVy, pitch: 0, rate: 0, half: CATCH.dx};
}
export const deckYAt = (d, x) => d.y + (x - d.x) * Math.tan(d.pitch);
export const seaY = (w, x, t) => w.kind === 'tower' ? 0 : w.level.sea.heave * 0.8 * Math.sin(x / 23 + t * 0.9) * Math.sin(x / 61 - t * 0.4);
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
// The catch window, each part true when it's good. All of them, and the arms can close on the pins.
export function catchWindow(w, s) {
  const dy = s.y + w.v.pin - s.armY, vy = s.vy - s.armVy;
  return {height: Math.abs(dy) <= CATCH.dy, centre: Math.abs(s.x) <= CATCH.dx, still: Math.abs(s.vx) <= CATCH.vx, slow: vy >= -CATCH.vyDown && vy <= CATCH.vyUp, level: Math.abs(s.angle) <= CATCH.tilt, dy, vy};
}
export const inWindow = (w, s) => { const c = catchWindow(w, s); return c.height && c.centre && c.still && c.slow && c.level; };
export const closeArms = s => s.done || s.armsCmd ? s : {...s, armsCmd: 1};

// One step. input: {rot: -1|0|1, gim: -1|0|1}. Throttle is set on the state, legs with deployLegs, arms with closeArms.
export function step(w, s0, input = {}, dt = 1 / 60) {
  const s = {...s0}; if (s.done) return s;
  const v = vehicleOf(w), k = v.dry / V0.dry, rot = input.rot || 0, gim = input.gim || 0;
  // Attitude: rate command. The flight computer holds the attitude when you let go.
  const want = rot * v.rate; let a = 0;
  if (s.rcs > 0 && Math.abs(want - s.omega) > 1e-6) { a = Math.sign(want - s.omega) * v.acc; s.rcs = Math.max(0, s.rcs - v.rcsFlow * dt); }
  s.omega += a * dt; if (Math.abs(s.omega - want) < v.acc * dt && s.rcs > 0) s.omega = want;
  const q = 0.5 * rho(s.y) * (s.vx * s.vx + s.vy * s.vy);
  s.angle += (s.omega + (w.level ? turbulence(w, s.t) : 0) * Math.min(1.6, 0.4 + q / 6000)) * dt;
  if (Math.abs(s.angle) > RCS.limit) { s.angle = Math.sign(s.angle) * RCS.limit; s.omega = 0; s.limit = true; } else s.limit = false;
  const gw = gim * GIMBAL.max, gd = gw - s.gimbal; s.gimbal += Math.sign(gd) * Math.min(Math.abs(gd), GIMBAL.slew * dt);
  s.fins = Math.min(1, (s.fins || 0) + dt / 1.5);
  // Legs.
  if (s.legsOut && s.legs < 1) s.legs = Math.min(1, s.legs + dt / LEGS.time);
  const speed = Math.hypot(s.vx, s.vy);
  if (s.legs > 0 && speed > LEGS.maxSpeed) s.legsBroken = true;
  // Forces.
  const m = v.dry + s.fuel, th = s.fuel > 0 ? s.throttle : 0, F = th * v.thrust, ta = s.angle + (th > 0 ? s.gimbal : 0);
  const r = rho(s.y), wx = w.level ? wind(w, s.y, s.t) : 0, rx = s.vx - wx, ry = s.vy;
  const ux = Math.sin(s.angle), uy = Math.cos(s.angle), nx = uy, ny = -ux;
  const va = rx * ux + ry * uy, vn = rx * nx + ry * ny, ax = v.axial + v.legsDrag * s.legs * (s.legsBroken ? 0 : 1);
  const Fa = -0.5 * r * ax * Math.abs(va) * va, Fn = -0.5 * r * v.side * Math.abs(vn) * vn;
  // Grid fins: falling base first, leaning glides you the way you lean, like the engine does under thrust.
  const Fl = ry < 0 ? 0.5 * r * (rx * rx + ry * ry) * v.fins * Math.sin(s.angle) * Math.min(1, -ry / 20) : 0;
  const fx = F * Math.sin(ta) + Fa * ux + Fn * nx + Fl, fy = F * Math.cos(ta) + Fa * uy + Fn * ny;
  s.vx += fx / m * dt; s.vy += (fy / m - G) * dt;
  s.fuel = Math.max(0, s.fuel - massFlow(th, v) * dt);
  // Heating: fast through thick air cooks the engine section. The plume of an entry burn shields it, and leaves soot.
  const qh = r * speed * speed * speed, shield = th > 0 && s.vy < 0 ? HEAT.plume : 1;
  s.heat = qh > HEAT.q0 ? s.heat + (qh - HEAT.q0) * HEAT.k * shield * dt : Math.max(0, s.heat - HEAT.cool * dt);
  if (th > 0 && speed > 150) s.soot = Math.min(1, (s.soot || 0) + th * dt * 0.09);
  s.heatPeak = Math.max(s.heatPeak || 0, s.heat); s.mach = speed / SOUND;
  s.x += s.vx * dt; s.y += s.vy * dt; s.t += dt;
  if (s.heat >= 100) { s.done = true; s.landed = false; s.fault = {k: 'heat', text: 'The engine section overheated coming in too fast through thick air. An entry burn slows you and its plume shields the base.'}; return s; }
  if (w.kind === 'tower') return towerStep(w, s, dt, k);
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
function towerStep(w, s, dt) {
  const v = w.v, T = TOWER;
  // The carriage: with arm assist it rides up and down to meet your catch pins when you're close.
  let wantY = T.armY;
  if (w.assist && Math.abs(s.x) < 30 && Math.abs(s.y + v.pin - s.armY) < 40) wantY = Math.max(T.armMin, Math.min(T.armMax, s.y + v.pin));
  const dy = wantY - s.armY, vy = Math.sign(dy) * Math.min(T.track, Math.abs(dy) / dt); s.armVy = s.arms > 0 ? 0 : vy; s.armY += s.armVy * dt;
  if (w.assist && !s.armsCmd && s.arms === 0 && inWindow(w, s)) s.armsCmd = 1;
  if (s.armsCmd === 1) {
    s.arms = Math.min(1, s.arms + dt / T.close);
    if (s.arms >= 1) {
      const c = catchWindow(w, s), dx = Math.abs(s.x);
      if (inWindow(w, s)) { s.done = true; s.landed = true; s.caught = true; s.touch = {impact: Math.max(0, -c.vy), slide: Math.abs(s.vx), tilt: Math.abs(s.angle), dist: dx, dy: Math.abs(c.dy)}; s.y = s.armY - v.pin; return s; }
      if (dx < v.radius + 4 && s.armY > s.y && s.armY < s.y + v.height) { s.done = true; s.landed = false; s.touch = {impact: Math.max(0, -c.vy), slide: Math.abs(s.vx), tilt: Math.abs(s.angle), dist: dx}; s.fault = {k: 'clip', text: whyMiss(c) + ' The arms closed on the side of the booster instead of under the pins.'}; return s; }
      s.armsCmd = 2; s.misses = (s.misses || 0) + 1; s.lastMiss = whyMiss(c);
    }
  } else if (s.armsCmd === 2) { s.arms = Math.max(0, s.arms - dt / T.reopen); if (s.arms <= 0) s.armsCmd = 0; }
  // Hitting the tower or the ground.
  const half = v.radius;
  if (s.x + half > T.x0 && s.x - half < T.x1 && s.y < T.top) { s.done = true; s.landed = false; s.touch = {impact: -s.vy, slide: Math.abs(s.vx), tilt: Math.abs(s.angle), dist: Math.abs(s.x)}; s.fault = {k: 'tower', text: 'You flew into the tower.'}; return s; }
  if (s.y <= 0) { s.done = true; s.landed = false; s.touch = {impact: -s.vy, slide: Math.abs(s.vx), tilt: Math.abs(s.angle), dist: Math.abs(s.x)}; s.fault = {k: 'ground', text: Math.abs(s.x) < 60 ? 'It came down on the pad. This booster has no legs: the tower has to catch it.' : 'It came down on the ground, away from the tower.'}; return s; }
  if (Math.abs(s.x) > 6000 || s.y > 30000) { s.done = true; s.landed = false; s.fault = {k: 'range', text: 'You flew out of the recovery area.'}; }
  return s;
}
function whyMiss(c) {
  if (!c.height) return c.dy > 0 ? `The pins were ${c.dy.toFixed(1)} m above the arms.` : `The pins were ${(-c.dy).toFixed(1)} m below the arms.`;
  if (!c.centre) return 'You were off the centre of the arms.';
  if (!c.still) return 'You were drifting sideways too fast.';
  if (!c.slow) return c.vy < 0 ? `Coming down at ${(-c.vy).toFixed(1)} m/s, too fast to catch.` : 'You were climbing.';
  if (!c.level) return 'You were tilted too far.';
  return 'Missed.';
}
export const deployLegs = s => s.done || s.legsOut ? s : {...s, legsOut: true};
// Height at which a full throttle burn from now would stop you, ignoring drag. The burn cue on the screen.
export function stopHeight(s, v = V0) { const m = v.dry + s.fuel, a = v.thrust / m - G; return a > 0 && s.vy < 0 ? s.vy * s.vy / (2 * a) : 0; }

// Score: soft, level, still, centred, fuel left, times the level multiplier. Catches have their own window.
function partsRaw(s, w) {
  const t = s.touch, L = w.level, f = s.fuel / w.fuel;
  if (w.kind === 'tower') {
    const assist = w.assist ? 0.75 : 1;
    return {mult: L.mult * assist, soft: 300 * (1 - t.impact / CATCH.vyDown), level: 150 * (1 - t.tilt / CATCH.tilt), still: 100 * (1 - t.slide / CATCH.vx), centre: 350 * (1 - t.dist / CATCH.dx), fuel: 250 * f, bull: t.dist <= 0.6 && t.dy <= 0.6 ? 150 : 0, base: 300};
  }
  const reach = w.deck.half - LEGS.span;
  return {mult: L.mult, soft: 300 * (1 - t.impact / LIMITS.down), level: 150 * (1 - t.tilt / LIMITS.tilt), still: 100 * (1 - t.slide / LIMITS.side), centre: 350 * Math.max(0, 1 - t.dist / reach), fuel: 250 * f, bull: t.dist <= 3 ? 150 : 0, base: 200};
}
export function score(s, w) {
  if (!s.done || !s.landed) return 0;
  const p = partsRaw(s, w); return Math.round((p.base + p.soft + p.level + p.still + p.centre + p.fuel + p.bull) * p.mult);
}
export function parts(s, w) { const p = partsRaw(s, w), r = x => Math.round(x * p.mult); return {soft: r(p.soft), level: r(p.level), still: r(p.still), centre: r(p.centre), fuel: r(p.fuel), bull: r(p.bull), mult: p.mult}; }
