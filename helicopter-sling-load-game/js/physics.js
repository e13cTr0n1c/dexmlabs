// Helicopter sling load physics. Pure functions on plain objects, no DOM, so the tests run them in Node.
// Side view, metres, seconds, newtons. The helicopter is a rigid body with a tilting rotor thrust;
// the load hangs on a rope that only pulls (a stiff spring with damping when taut, slack otherwise),
// so the pendulum, the snatch on lift off and the lag when you accelerate all come from the physics.
import {rng} from './daily.js';
export const G = 9.81, RHO = 1.2, DEG = 180 / Math.PI;
export const HELI = {M: 9000, tmax: 2.0, skid: 2.4, rotorY: 2.4, rotorR: 9.5, body: 4.5, attach: 2, tiltMax: 0.33, tiltTau: 0.3, cda: 120, climb: 4, fuelIdle: 0.15, fuelK: 0.55};
export const ITEMS = {
  crate: {w: 2.6, h: 2.4, m: 900, cda: 5, breakV: 4.5, name: 'crate'},
  ac: {w: 3.4, h: 2.0, m: 1400, cda: 5, breakV: 3.5, name: 'AC unit'},
  log: {w: 9, h: 1.2, m: 2200, cda: 6, breakV: 5.5, name: 'log'},
  bridge: {w: 20, h: 1.8, m: 4200, cda: 30, breakV: 3.2, name: 'bridge section'},
  bucket: {w: 2, h: 2.2, m: 250, water: 1800, cda: 3, breakV: 99, name: 'bucket'},
  hook: {w: 0.8, h: 0.8, m: 60, cda: 0.3, breakV: 99, name: 'hook'}
};
export const SWING_OK = 1.5; // m/s of sideways speed at touchdown that scores nothing for steadiness
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
export const ground = (w, x) => { for (const q of w.water) if (x > q.x0 && x < q.x1) return -q.depth; return 0; };
export const inWater = (w, x) => w.water.some(q => x > q.x0 && x < q.x1);
const groundUnder = (w, a, b) => Math.max(ground(w, a), ground(w, (a + b) / 2), ground(w, b));
// The highest surface under a span [a, b] that something whose bottom was at prev could rest on.
export function supportTop(w, a, b, prev = Infinity) { let s = groundUnder(w, a, b); for (const o of w.solids) if (b > o.x0 + 0.02 && a < o.x1 - 0.02 && prev >= o.top - 0.3) s = Math.max(s, o.top); return s; }
// The tallest thing between two x positions, for cruise heights.
export function maxTop(w, a, b) { let m = 0; for (const o of w.solids) if (b > o.x0 && a < o.x1) m = Math.max(m, o.top); return m; }
export function wind(w, y, t) { const W = w.level.wind || {base: 0, gust: 0, turb: 0}, p = w.phase, k = Math.min(1, 0.4 + Math.max(0, y) / 60);
  return k * (W.base + W.gust * (0.6 * Math.sin(0.31 * t + p[0]) + 0.4 * Math.sin(0.83 * t + p[1])) + W.turb * Math.sin(2.7 * t + p[2]) * Math.sin(1.3 * t)); }
export const tmax = w => HELI.tmax * w.M * G;
export const massOf = (s, b) => b.m + (b.kind === 'bucket' ? s.water * b.water : 0);
export const endOf = s => s.carry >= 0 ? s.items[s.carry] : s.hook;
export function hoverCollective(w, s) { const e = endOf(s); return (w.M + massOf(s, e)) * G / tmax(w); }

export function makeWorld(L, seed = 1, o = {}) {
  const r = rng(seed >>> 0 || 1), w = {level: L, seed, M: o.M || HELI.M, rope: L.rope, assist: {hover: o.hover ?? true, damp: o.damp ?? true},
    solids: (L.solids || []).map(q => ({bottom: 0, ...q})), water: L.water || [], fire: L.fire ? {...L.fire} : null, bounds: L.bounds || [-150, 600], phase: [r() * 6.28, r() * 6.28, r() * 6.28], par: L.par, fuel: L.fuel};
  const items = L.items.map(it => { const d = ITEMS[it.kind], b = {...d, kind: it.kind, x: it.x, vx: 0, vy: 0, rest: true, placed: false, broken: false, td: null, free: true};
    b.y = supportTop(w, it.x - d.w / 2, it.x + d.w / 2) + d.h / 2; return b; });
  w.tasks = (L.tasks || []).map(t => ({...t, zone: {...t.zone, y: supportTop(w, t.zone.x - items[t.item].w / 2, t.zone.x + items[t.item].w / 2)}}));
  const st = L.start, s = {t: 0, x: st.x, y: st.y, vx: 0, vy: 0, th: 0, c: 0, ix: 0, iy: 0, fuel: L.fuel, carry: L.carry ?? -1, items, hook: {...ITEMS.hook, kind: 'hook', x: st.x, y: 0, vx: 0, vy: 0, rest: false},
    task: 0, water: 0, dumping: false, drops: [], fire: w.fire ? 1 : 0, phase: w.fire ? 'fill' : null, dumps: [], results: [], zoneT: 0, cool: 0, tension: 0, done: false, ok: false, fault: null, ev: [], knocks: 0, onGround: false, maxSwing: 0};
  const e = endOf(s); e.x = st.x; e.y = st.y - HELI.attach - w.rope - e.h / 2; e.rest = false; e.free = false;
  if (s.carry >= 0) { const sup = supportTop(w, e.x - e.w / 2, e.x + e.w / 2); if (e.y - e.h / 2 < sup) { e.y = sup + e.h / 2; e.rest = true; } }
  s.c = hoverCollective(w, s); w.start = s; return w;
}
export function clone(s) { return {...s, items: s.items.map(i => ({...i, td: i.td && {...i.td}})), hook: {...s.hook}, drops: s.drops.map(d => ({...d})), results: s.results.slice(), dumps: s.dumps.slice(), ev: []}; }
const fault = (s, k, text) => { if (s.done) return; s.done = true; s.ok = false; s.fault = {k, text}; s.ev.push({k: 'fail', f: k}); };

// One body against the ground and the solids: rest on tops, get pushed out of sides.
function collide(w, b, prevBot, h) {
  const hw = b.w / 2; let bump = 0;
  for (const o of w.solids) { if (b.x + hw <= o.x0 + 0.02 || b.x - hw >= o.x1 - 0.02) continue; const bot = b.y - b.h / 2, top = b.y + b.h / 2;
    if (prevBot < o.top - 0.3 && bot < o.top && top > o.bottom) { const left = b.x < (o.x0 + o.x1) / 2; b.x = left ? o.x0 - hw - 0.01 : o.x1 + hw + 0.01; if ((left && b.vx > 0) || (!left && b.vx < 0)) { bump = Math.max(bump, Math.abs(b.vx)); b.vx *= -0.25; } } }
  const sup = supportTop(w, b.x - hw, b.x + hw, prevBot), bot = b.y - b.h / 2; let td = null;
  if (bot <= sup + 1e-3) { if (!b.rest) td = {impact: Math.max(0, -b.vy), slide: Math.abs(b.vx)}; b.y = sup + b.h / 2; if (b.vy < 0) b.vy = 0; b.vx *= Math.max(0, 1 - 7 * h); b.rest = true; b.on = sup; }
  else if (bot > sup + 0.05) b.rest = false;
  return {td, bump};
}
function heliHit(w, s) { const sk = s.y - HELI.skid, ry = s.y + HELI.rotorY;
  for (const o of w.solids) { if (s.x + HELI.rotorR > o.x0 && s.x - HELI.rotorR < o.x1 && o.top > ry - 0.6 && o.bottom < ry) return 'rotor';
    if (s.x + HELI.body > o.x0 && s.x - HELI.body < o.x1 && o.top > sk + 0.5 && o.bottom < s.y + 1.5) return 'body'; }
  return null; }
// How far the load (or the empty hook) is above whatever is under it.
export function clearance(w, s) { const e = endOf(s), b = e.y - e.h / 2; let sup = supportTop(w, e.x - e.w / 2, e.x + e.w / 2, b);
  if (s.carry < 0) for (const it of s.items) { const top = it.y + it.h / 2; if (!it.placed && Math.abs(e.x - it.x) < it.w / 2 && b >= top - 0.3) sup = Math.max(sup, top); } return b - sup; }
export function heliClear(w, s) { const sk = s.y - HELI.skid; return sk - supportTop(w, s.x - HELI.body, s.x + HELI.body, sk); }
// The swing: the rope's angle from straight down, and the load's sideways speed relative to the helicopter.
export function swing(s) { const e = endOf(s), dx = e.x - s.x, dy = s.y - HELI.attach - (e.y + e.h / 2); return {angle: Math.atan2(dx, Math.max(0.1, dy)), rel: e.vx - s.vx}; }

function sub(w, s, inp, h) {
  const M = w.M, e = endOf(s), mE = massOf(s, e), wx = wind(w, s.y, s.t), tilt = inp.tilt || 0, lift = inp.lift || 0;
  // Cyclic. Hover hold: let go of A/D and it brakes your drift to a stop, wind included.
  let thc;
  if (w.assist.hover && !tilt) { s.ix = clamp(s.ix + s.vx * h, -12, 12); thc = clamp(-0.1 * s.vx - 0.03 * s.ix, -0.25, 0.25); }
  else { thc = tilt * HELI.tiltMax; s.ix = 0; }
  if (s.onGround && !(lift > 0)) thc = 0;
  s.th += (thc - s.th) * Math.min(1, h / HELI.tiltTau);
  // Rope: pulls only when stretched past its length.
  const ay = s.y - HELI.attach, dx = e.x - s.x, dy = e.y + e.h / 2 - ay, len = Math.hypot(dx, dy) || 1e-6, nx = dx / len, ny = dy / len, str = len - w.rope;
  let F = 0; if (str > 0) { const k = mE * 196, c = Math.sqrt(k * mE), vr = (e.vx - s.vx) * nx + (e.vy - s.vy) * ny; F = Math.max(0, k * str + c * vr); }
  s.tension = F;
  // Collective. Hover hold: W and S ask for a climb or a descent, nothing holds the height,
  // and the descent slows itself as the load or the skids get near the ground.
  const hc = heliClear(w, s), ge = 1 + 0.12 * Math.max(0, 1 - hc / 15), T0 = tmax(w) * ge;
  if (w.assist.hover) {
    const near = Math.min(clearance(w, s) + (s.carry < 0 ? 0.5 : 0), hc), vyT = lift > 0 ? HELI.climb : lift < 0 ? -clamp(0.35 * near + 0.5, 0.8, 4) : 0;
    s.iy = clamp(s.iy + (vyT - s.vy) * h, -5, 5); const a = 2 * (vyT - s.vy) + 0.4 * s.iy, need = (M * (G + a) - F * ny) / (Math.max(0.5, Math.cos(s.th)) * T0);
    s.c += clamp(clamp(need, 0, 1) - s.c, -1.6 * h, 1.6 * h);
  } else s.c = clamp(s.c + lift * 0.4 * h, 0, 1);
  if (s.fuel <= 0) s.c = 0;
  const T = s.c * T0; s.fuel = Math.max(0, s.fuel - (HELI.fuelIdle + HELI.fuelK * s.c) * h);
  const rvx = s.vx - wx, dq = 0.5 * RHO * HELI.cda;
  const fx = T * Math.sin(s.th) + F * nx - dq * rvx * Math.abs(rvx), fy = T * Math.cos(s.th) + F * ny - M * G - dq * 0.5 * s.vy * Math.abs(s.vy);
  // The load: rope, weight, drag, and the swing damper when it's on.
  const erx = e.vx - wx, de = 0.5 * RHO * e.cda; let ex = -F * nx - de * erx * Math.abs(erx), ey = -F * ny - mE * G - de * e.vy * Math.abs(e.vy), hd = 0;
  if (w.assist.damp && F > 0) { hd = -0.6 * mE * (e.vx - s.vx); ex += hd; }
  s.vx += (fx - hd) / M * h; s.vy += fy / M * h; s.x += s.vx * h; s.y += s.vy * h;
  if (e.kind === 'bucket' && inWater(w, e.x) && e.y - e.h / 2 < 0) { e.vx *= 1 - 3 * h; e.vy *= 1 - 4 * h; ey += Math.min(mE, e.m + e.water) * G * Math.min(1, -(e.y - e.h / 2) / e.h) * 0.9; }
  const pb = e.y - e.h / 2; e.vx += ex / mE * h; e.vy += ey / mE * h; e.x += e.vx * h; e.y += e.vy * h;
  const c1 = collide(w, e, pb, h);
  if (s.carry < 0) for (const it of s.items) { const top = it.y + it.h / 2; if (Math.abs(e.x - it.x) < it.w / 2 && e.y - e.h / 2 < top && pb >= top - 0.3) { e.y = top + e.h / 2; if (e.vy < 0) e.vy = 0; e.vx *= Math.max(0, 1 - 7 * h); } } if (c1.td && s.carry >= 0) touch(w, s, e, c1.td); if (c1.bump > 1.2 && s.carry >= 0) bump(w, s, e, c1.bump);
  // Loose loads fall and settle.
  for (const it of s.items) if (it !== e && !it.rest && !it.placed) { const p = it.y - it.h / 2; it.vy -= G * h; it.vx *= 1 - 0.1 * h; it.x += it.vx * h; it.y += it.vy * h; const c = collide(w, it, p, h); if (c.td) touch(w, s, it, c.td); }
  if (s.carry >= 0) { s.hook.x = e.x; s.hook.y = e.y + e.h / 2 + 0.4; s.hook.vx = e.vx; s.hook.vy = e.vy; }
  // Skids: settle gently or crash; rotor and body against buildings and trees.
  const sk = s.y - HELI.skid, sup = supportTop(w, s.x - HELI.body, s.x + HELI.body, sk + 0.5); s.onGround = false;
  if (sk < sup) { if (inWater(w, s.x) && sup < 0) return fault(s, 'water', 'The helicopter went into the water.');
    if (s.vy < -3 || Math.abs(s.th) > 0.3 || Math.abs(s.vx) > 5) return fault(s, 'hard', `Hard landing at ${(-s.vy).toFixed(1)} m/s. The skids folded.`);
    s.y = sup + HELI.skid; if (s.vy < 0) s.vy = 0; s.vx *= Math.max(0, 1 - 6 * h); s.onGround = true; }
  const hit = heliHit(w, s); if (hit) return fault(s, hit, hit === 'rotor' ? 'Rotor strike. The blades hit something.' : 'The helicopter flew into something.');
  if (s.x < w.bounds[0] - 60 || s.x > w.bounds[1] + 60) return fault(s, 'range', 'Out of the work area.');
  if (s.y > 400) return fault(s, 'range', 'Too high. The job is down there.');
  if (s.fuel <= 0 && !s.onGround) return fault(s, 'fuel', 'Out of fuel.');
  if (s.cool > 0) s.cool -= h;
  // Hooking up: bring the hook to the top of the load, slowly, and it latches.
  if (s.carry < 0 && s.cool <= 0) { const t = w.tasks[s.task]; if (t) { const it = s.items[t.item]; if (!it.placed && !it.broken && Math.hypot(s.hook.x - it.x, s.hook.y - (it.y + it.h / 2)) < 1.8 && Math.hypot(s.hook.vx - it.vx, s.hook.vy - it.vy) < 3 && Math.hypot(it.x - s.x, it.y + it.h / 2 - (s.y - HELI.attach)) <= w.rope + 0.1) {
    s.carry = t.item; it.free = false; it.td = null; it.vx = s.hook.vx * 0.2; s.zoneT = 0; s.ev.push({k: 'hooked', item: t.item}); } } }
  const sw = Math.abs(swing(s).angle); if (s.tension > 0) s.maxSwing = Math.max(s.maxSwing, sw);
}
function touch(w, s, it, td) {
  if (td.impact > it.breakV && it.kind !== 'bucket') { it.broken = true; s.ev.push({k: 'broken', impact: td.impact}); return fault(s, 'broken', `The ${it.name} hit the ground at ${td.impact.toFixed(1)} m/s and broke.`); }
  if (inWater(w, it.x) && it.y - it.h / 2 < 0 && it.kind !== 'bucket') { s.ev.push({k: 'splash'}); return fault(s, 'lost', `The ${it.name} fell in the water.`); }
  if (td.impact > 0.25 || !it.td) it.td = td; s.ev.push({k: 'touch', impact: td.impact, slide: td.slide, x: it.x, y: it.y - it.h / 2});
}
function bump(w, s, it, v) { s.knocks++; s.ev.push({k: 'bump', v, x: it.x, y: it.y}); if (v > 6 && it.kind !== 'bucket') { it.broken = true; fault(s, 'broken', `The ${it.name} smashed into something at ${v.toFixed(1)} m/s.`); } }
export const inZone = (t, it) => Math.abs(it.x - t.zone.x) <= t.zone.half && Math.abs(it.y - it.h / 2 - t.zone.y) < 0.6;
// Release: drops the load, or with the bucket, opens it.
export function release(w, s) {
  if (s.done || s.carry < 0) return s; const it = s.items[s.carry];
  if (it.kind === 'bucket') { if (s.water > 0.05 && !s.dumping) { s.dumping = true; s.dump = {total: s.water, hit: 0, swing: Math.abs(it.vx), out: 0}; s.ev.push({k: 'dump'}); } return s; }
  s.carry = -1; it.free = true; it.released = true; s.cool = 1.2; s.hook.vx = it.vx; s.hook.vy = it.vy; s.ev.push({k: 'release', rest: it.rest}); return s;
}
export function step(w, s, inp = {}, dt = 1 / 60) {
  if (s.done) return s; s.ev = []; if (inp.rel) release(w, s);
  const n = 8, h = dt / n; for (let i = 0; i < n && !s.done; i++) sub(w, s, inp, h);
  s.t += dt; if (!s.done) tasks(w, s, dt); return s;
}
function tasks(w, s, dt) {
  if (w.fire) return fireTasks(w, s, dt);
  const t = w.tasks[s.task]; if (!t) return; const it = s.items[t.item];
  if (s.carry === t.item) { if (it.rest && s.tension < massOf(s, it) * G * 0.35 && inZone(t, it)) { s.zoneT += dt; if (w.assist.hover && s.zoneT > 1) { release(w, s); s.ev.push({k: 'auto'}); } } else s.zoneT = 0; }
  if (s.carry !== t.item && it.rest && !it.placed && it.released) {
    it.released = false;
    if (inZone(t, it)) { const d = Math.abs(it.x - t.zone.x), td = it.td || {impact: 0, slide: 0};
      const r = {d, acc: clamp(1 - d / t.zone.half, 0, 1), impact: td.impact, slide: td.slide, swing: clamp(1 - td.slide / SWING_OK, 0, 1), soft: clamp(1 - td.impact / it.breakV, 0, 1), item: it.kind};
      it.placed = true; s.results.push(r); s.task++; s.ev.push({k: 'placed', r, x: it.x, y: it.y});
      if (s.task >= w.tasks.length) { s.done = true; s.ok = true; s.ev.push({k: 'complete'}); } }
    else s.ev.push({k: 'missed', d: it.x - t.zone.x});
  }
}
function fireTasks(w, s, dt) {
  const b = s.items[0], f = w.fire;
  if (s.phase === 'fill' && !s.dumping) { if (inWater(w, b.x) && b.y - b.h / 2 < -0.3) { s.water = Math.min(1, s.water + dt * 0.8); if (s.water >= 1) { s.phase = 'douse'; s.ev.push({k: 'full'}); } } }
  if (s.dumping) { const out = Math.min(s.water, dt * 1.1); s.water -= out; s.dump.out += out; const n = Math.max(1, Math.round(out * 220));
    for (let i = 0; i < n; i++) s.drops.push({x: b.x + (i / n - 0.5) * 1.4, y: b.y - b.h / 2, vx: b.vx + (Math.sin(s.t * 91 + i * 7.3)) * 0.8, vy: b.vy - 1, m: out / n});
    if (s.water <= 0) s.dumping = false; }
  for (const d of s.drops) { const wx = wind(w, d.y, s.t); d.vx += (wx - d.vx) * Math.min(1, 0.7 * dt); d.vy -= G * dt; d.vy *= 1 - 0.05 * dt; d.x += d.vx * dt; d.y += d.vy * dt;
    if (d.y <= ground(w, d.x)) { d.gone = true; if (d.x >= f.x0 && d.x <= f.x1 && s.dump) { s.dump.hit += d.m; s.fire = Math.max(0, s.fire - d.m * 0.62); } s.ev.push({k: 'drop', x: d.x, hit: d.x >= f.x0 && d.x <= f.x1}); } }
  s.drops = s.drops.filter(d => !d.gone);
  if (s.dump && !s.dumping && !s.drops.length) { const q = s.dump, acc = q.total > 0 ? q.hit / q.total : 0; s.results.push({acc, swing: clamp(1 - q.swing / 3, 0, 1), soft: 1, d: 0, impact: 0, slide: q.swing, item: 'bucket'}); s.dump = null; s.ev.push({k: 'doused', acc, fire: s.fire});
    if (s.fire <= 0.001) { s.done = true; s.ok = true; s.ev.push({k: 'complete'}); } else s.phase = 'fill'; }
}
// Scoring: placement accuracy, steadiness at the drop, a soft set down, time against par and fuel left.
export function parts(s, w) {
  const R = s.results, avg = k => R.length ? R.reduce((a, r) => a + r[k], 0) / R.length : 0;
  const acc = avg('acc'), sw = avg('swing'), so = avg('soft'), tF = s.t <= w.par ? 1 : clamp(1 - (s.t - w.par) / w.par, 0, 1), fF = clamp(s.fuel / (w.fuel * 0.5), 0, 1);
  const p = {place: Math.round(400 * acc), steady: Math.round(250 * sw), soft: Math.round(150 * so), time: Math.round(100 * tF), fuel: Math.round(100 * fF)};
  p.base = p.place + p.steady + p.soft + p.time + p.fuel; p.mult = w.level.mult * (w.assist.hover ? 1 : 1.15) * (w.assist.damp ? 1 : 1.15); p.total = Math.round(p.base * p.mult); p.grade = grade(p.base); return p;
}
export const grade = b => b >= 900 ? 'S' : b >= 780 ? 'A' : b >= 640 ? 'B' : b >= 480 ? 'C' : 'D';
export const score = (s, w) => s.ok ? parts(s, w).total : 0;
