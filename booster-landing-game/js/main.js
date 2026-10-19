import {step, deck, deckYAt, seaY, wind, rho, stopHeight, hoverSeconds, throttleUp, throttleDown, deployLegs, makeWorld, score, parts, LIMITS, LEGS, DRY, DEG} from './physics.js';
import {LEVELS, level} from './levels.js';
const $ = id => document.getElementById(id);
const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const KEY = 'booster:stats', store = () => read(KEY, {best: {}, landed: {}, flights: 0});
const DT = 1 / 60;
const app = {w: null, s: null, keys: {}, raf: 0, last: 0, acc: 0, said: {}, parts: [], rings: [], shake: 0, flash: 0, bolt: null, level: 'calm', audio: null, paused: false, cam: {scale: 0.05, x: 0}, prevMach: 0, prevWind: 0, clouds: [], drops: [], ended: false};

// Title screen
function bestLine(id) { const b = store().best?.[id]; return b ? `Best ${b}` : 'Not flown yet'; }
function renderLevels() {
  $('levels').innerHTML = LEVELS.map(l => `<button type="button" data-level="${l.id}" aria-pressed="${l.id === app.level}">${l.name} <span class="mult">×${l.mult}</span><small>${l.blurb}</small><small class="best" data-best="${l.id}">${bestLine(l.id)}</small></button>`).join('');
  document.querySelectorAll('[data-level]').forEach(b => b.addEventListener('click', () => setLevel(b.dataset.level)));
}
function setLevel(id) { app.level = id; document.querySelectorAll('[data-level]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.level === id))); const st = store(); st.level = id; write(KEY, st); $('play').innerHTML = `Fly ${level(id).name} <span aria-hidden="true">&rarr;</span>`; }
function say(t) { $('feedback').textContent = t; }

function start(id = app.level, seed = Math.floor(Math.random() * 2 ** 31)) {
  cancelAnimationFrame(app.raf); app.level = id; const L = level(id), w = makeWorld(L, seed);
  Object.assign(app, {w, s: {...w.start}, keys: {}, said: {}, parts: [], rings: [], shake: 0, flash: 0, bolt: null, paused: false, acc: 0, prevMach: w.start.vy ? Math.hypot(w.start.vx, w.start.vy) / 340 : 0, ended: false});
  app.cam = {scale: camScale(w.start.y - 3), x: w.start.x};
  app.clouds = makeClouds(seed, L); app.drops = [];
  $('flight').hidden = false; $('screen-title').hidden = true; document.body.dataset.screen = 'game'; scrollTo(0, 0); $('result').hidden = true; $('paused').hidden = true; say('');
  $('flight-h').textContent = `${L.name}: ${L.blurb}`;
  $('level-note').textContent = L.id === 'calm' ? 'Coast down, burn late and hard, then feather it onto the ring. Legs below 90 m/s.' : L.id === 'windy' ? 'The wind is stronger up high. Lean into it and let the grid fins glide you over.' : L.id === 'night' ? 'You start supersonic. A short entry burn keeps the heat down. Watch for the deck lights.' : 'You will cook without an entry burn. Then a gale, rain and a deck that rises and falls a few metres.';
  $('sky').focus({preventScroll: true}); sound(true); app.last = performance.now(); app.raf = requestAnimationFrame(loop);
  window.BoosterGame.flights++;
}
function input() { return {rot: app.keys.rl ? -1 : app.keys.rr ? 1 : 0, gim: app.keys.gl ? -1 : app.keys.gr ? 1 : 0}; }
function loop(now) {
  const dt = Math.min(0.1, (now - app.last) / 1000); app.last = now;
  if (!app.paused && !app.s.done) {
    app.acc += dt; const inp = input();
    while (app.acc >= DT && !app.s.done) { const before = app.s; app.s = step(app.w, app.s, inp, DT); app.acc -= DT; events(before, app.s); }
  }
  juice(dt); draw(); hud(); sound(); if (!app.s.done) callouts(app.s);
  if (app.s.done && !app.ended) finish();
  app.raf = requestAnimationFrame(loop);
}
function events(a, b) {
  if (a.mach >= 1 && b.mach < 1) { say('Through Mach 1. Sonic boom.'); app.shake = Math.max(app.shake, 14); app.rings.push({x: b.x, y: b.y + 20, r: 0, life: 1.6}); boom(); }
  if (!a.legsBroken && b.legsBroken) { say('The legs tore off. Too fast. You cannot land now.'); beep(160, 0.4); app.shake = Math.max(app.shake, 6); }
  if (a.legs < 1 && b.legs >= 1) clunk();
  const g = wind(app.w, b.y, b.t); if (Math.abs(g - app.prevWind) > 0 && Math.abs(g - (app.w.level.wind.base)) > app.w.level.wind.gust * 0.9 && !app.said['gust' + Math.floor(b.t / 6)]) { app.said['gust' + Math.floor(b.t / 6)] = 1; if (app.w.level.wind.gust > 3) say(`Gust, ${Math.abs(g).toFixed(0)} m/s ${g > 0 ? 'to the right' : 'to the left'}.`); }
  app.prevWind = g;
}
function callouts(s) {
  const d = deck(app.w, s.t), alt = s.y - d.y, speed = Math.hypot(s.vx, s.vy), c = (k, t) => { if (!app.said[k]) { app.said[k] = 1; say(t); } };
  if (s.t < 0.5) c('fins', 'Grid fins out. Q and E to lean, W to light the engine.');
  if (s.heat > 40 && s.throttle === 0) c('heat', 'Heating up. Entry burn now: W, or Space for full thrust.');
  if (s.heat > 75) c('heat2', 'Heat critical.');
  if (s.throttle === 0 && alt < stopHeight(s) * 1.3 + 60 && alt > 30 && speed > 40 && s.y < 4000) c('burn', 'Burn now.');
  if (!s.legsOut && speed < LEGS.maxSpeed && alt < 1500) c('legs', 'Legs: L.');
  if (s.legsOut && !s.legsBroken && speed > LEGS.maxSpeed - 10) c('legfast', 'Slow down, the legs are out.');
  if (s.fuel < app.w.level.fuel * 0.15 && s.fuel > 0) c('bingo', 'Bingo fuel.'); if (s.fuel <= 0) c('out', 'Out of fuel.');
  if (s.limit) c('lim', 'Attitude limit, 40°.');
}
function readings() {
  const s = app.s, d = deck(app.w, s.t), alt = s.y - d.y, wx = wind(app.w, s.y, s.t);
  return {alt: `${alt.toFixed(alt < 100 ? 1 : 0)} m`, vy: `${s.vy.toFixed(1)} m/s`, vx: `${(s.vx - d.vx).toFixed(1)} m/s`, range: `${Math.abs(s.x - d.x).toFixed(0)} m ${s.x < d.x ? 'right' : 'left'}`,
    tilt: `${(s.angle * DEG).toFixed(0)}°`, th: s.throttle <= 0 || s.fuel <= 0 ? 'Off' : `${Math.round(s.throttle * 100)}%`, fuel: `${Math.round(s.fuel)} kg, ${Math.round(hoverSeconds(s))} s`, rcs: `${Math.round(s.rcs / app.w.level.rcs * 100)}%`,
    wind: `${Math.abs(wx).toFixed(0)} m/s ${wx > 0.5 ? '→' : wx < -0.5 ? '←' : ''}`, legs: s.legsBroken ? 'Torn off' : s.legs >= 1 ? 'Down' : s.legsOut ? 'Moving' : 'Stowed', mach: (s.mach || 0).toFixed(2), heat: `${Math.round(s.heat)}%`,
    deck: `${d.vy > 0.15 ? 'Rising' : d.vy < -0.15 ? 'Falling' : 'Level'} ${Math.abs(d.vy).toFixed(1)}`};
}
function hud() {
  const r = readings(), s = app.s, d = deck(app.w, s.t), alt = s.y - d.y;
  for (const k of ['alt', 'vy', 'vx', 'range', 'tilt', 'th', 'fuel', 'rcs', 'wind', 'legs', 'mach', 'heat', 'deck']) { const e = $('h-' + k); if (e.textContent !== r[k]) e.textContent = r[k]; }
  const warn = (k, on) => $('h-' + k).parentElement.classList.toggle('warn', !!on);
  warn('vy', -s.vy > LIMITS.down && alt < 40); warn('vx', Math.abs(s.vx) > LIMITS.side && alt < 40); warn('fuel', s.fuel < app.w.level.fuel * 0.15); warn('tilt', Math.abs(s.angle) > LIMITS.tilt && alt < 40);
  warn('legs', s.legsBroken || (!s.legsOut && alt < 300)); warn('heat', s.heat > 50); warn('rcs', s.rcs < app.w.level.rcs * 0.15);
}

// Effects
function juice(dt) {
  const s = app.s, w = app.w, d = deck(w, s.t), red = reduced(), on = !s.done && s.fuel > 0 && s.throttle > 0;
  if (on && !app.paused && !red) {
    const n = 2 + Math.round(s.throttle * 3), a = s.angle + s.gimbal;
    for (let i = 0; i < n; i++) { const sp = 40 + Math.random() * 30; app.parts.push({x: s.x - Math.sin(s.angle) * 1.5, y: s.y + 1, vx: s.vx - Math.sin(a) * sp + (Math.random() - 0.5) * 8, vy: s.vy - Math.cos(a) * sp, life: 0.5 + Math.random() * 0.5, max: 1, k: 'fire'}); }
    const alt = s.y - (Math.abs(s.x) < d.half ? deckYAt(d, s.x) : 0);
    if (alt < 60) for (let i = 0; i < 4; i++) { const dir = Math.random() < 0.5 ? -1 : 1, near = 1 - alt / 60; app.parts.push({x: s.x + dir * Math.random() * 6, y: (Math.abs(s.x) < d.half ? deckYAt(d, s.x) : seaY(w, s.x, s.t)) + 1, vx: dir * (15 + Math.random() * 35) * near, vy: Math.random() * 6 * near, life: 1.2 + Math.random(), max: 2.2, k: Math.abs(s.x) < d.half ? 'smoke' : 'spray'}); }
  }
  if (!red && !app.paused && !s.done && (app.keys.rl || app.keys.rr) && s.rcs > 0) { const side = app.keys.rl ? 1 : -1, top = 39; app.parts.push({x: s.x + Math.sin(s.angle) * top + Math.cos(s.angle) * side * 2, y: s.y + Math.cos(s.angle) * top - Math.sin(s.angle) * side * 2, vx: s.vx + Math.cos(s.angle) * side * 12, vy: s.vy - Math.sin(s.angle) * side * 12, life: 0.35, max: 0.35, k: 'gas'}); }
  if (!app.paused) { app.parts = app.parts.filter(p => (p.life -= dt) > 0); for (const p of app.parts) { const drag = p.k === 'fire' ? 0.9 : 0.97; p.vx *= drag ** (dt * 60); p.vy *= drag ** (dt * 60); if (p.k === 'smoke') p.vy += 1.5 * dt; if (p.k === 'spray') p.vy -= 9.8 * dt; p.x += p.vx * dt; p.y += p.vy * dt; } }
  if (app.parts.length > 900) app.parts.splice(0, app.parts.length - 900);
  app.rings = app.rings.filter(r => (r.life -= dt) > 0); for (const r of app.rings) r.r += 600 * dt;
  app.shake = red ? 0 : Math.max(0, app.shake - dt * 18); app.flash = Math.max(0, app.flash - dt * 3);
  // Shake from a hard burn in thick air, and from the deck close by.
  if (on && !red) app.shake = Math.max(app.shake, s.throttle * 2.5 * Math.min(1, rho(s.y)) * (s.y < 200 ? 1.5 : 0.6));
  if (w.level.sky === 'storm' && !app.paused) { if (Math.random() < dt * 0.18 && !red) { app.flash = 1; app.bolt = {x: Math.random(), segs: Array.from({length: 9}, () => Math.random() - 0.5)}; thunder(); } }
}
function makeClouds(seed, L) {
  let a = seed % 9973; const r = () => (a = (a * 16807) % 2147483647) / 2147483647, out = [];
  const n = L.sky === 'storm' ? 120 : L.sky === 'night' ? 40 : L.sky === 'dusk' ? 60 : 30;
  for (let i = 0; i < n; i++) { const y = L.sky === 'storm' ? 1200 + r() * 3500 : 900 + r() * 7000; out.push({x: (r() - 0.5) * 9000, y, w: 300 + r() * 900, h: 60 + r() * 180, a: 0.25 + r() * 0.5}); }
  return out;
}
const SKY = {day: ['#2f6fb5', '#9cc7e8', '#e8f2f7'], dusk: ['#2b2a55', '#c4597a', '#f4b26b'], night: ['#020309', '#07101f', '#101b2c'], storm: ['#15191d', '#2e353a', '#4a5157']};
const SEA = {day: ['#1d5f8a', '#0b2c45'], dusk: ['#3b3f6b', '#141833'], night: ['#050b14', '#010306'], storm: ['#273238', '#0d1316']};
function camScale(alt) { const c = $('sky'); return Math.max(0.022, Math.min(4.4, (c.height - 210) / (Math.max(0, alt) + 70))); }
function draw() {
  const c = $('sky'), x = c.getContext('2d'), W = c.width, H = c.height, s = app.s, w = app.w, L = w.level, d = deck(w, s.t);
  const alt = s.y - Math.max(0, d.y), target = camScale(alt), cam = app.cam; cam.scale += (target - cam.scale) * 0.12; const scale = cam.scale;
  const viewW = W / scale, tx = s.x + Math.max(-viewW * 0.3, Math.min(viewW * 0.3, (d.x - s.x) * 0.4)); cam.x += (tx - cam.x) * 0.2;
  const sh = app.shake, ox = W / 2 + (Math.random() - 0.5) * sh, oy = (Math.random() - 0.5) * sh, SEAY = H - 82;
  const X = v => ox + (v - cam.x) * scale, Y = v => oy + SEAY - v * scale;
  // Sky
  const sk = SKY[L.sky], g = x.createLinearGradient(0, 0, 0, SEAY); g.addColorStop(0, sk[0]); g.addColorStop(0.6, sk[1]); g.addColorStop(1, sk[2]); x.fillStyle = g; x.fillRect(0, 0, W, H);
  const hi = Math.min(1, s.y / 12000); if (hi > 0.2) { x.fillStyle = `rgba(2,4,12,${(hi - 0.2) * 0.75})`; x.fillRect(0, 0, W, SEAY); }
  if (L.sky === 'night' || hi > 0.5) { x.fillStyle = '#fff'; for (let i = 0; i < 110; i++) { const sx = ((i * 151 - cam.x * 0.002 * (i % 3)) % W + W) % W, sy = (i * 97) % (SEAY - 40); x.globalAlpha = L.sky === 'night' ? 0.4 + (i % 5) * 0.12 : (hi - 0.5) * 2 * 0.6; x.fillRect(sx, sy, i % 7 ? 1.2 : 2, i % 7 ? 1.2 : 2); } x.globalAlpha = 1; }
  if (L.sky === 'day') { x.fillStyle = 'rgba(255,250,225,.9)'; x.beginPath(); x.arc(W * 0.8, 70, 26, 0, 7); x.fill(); }
  if (L.sky === 'dusk') { const sg = x.createRadialGradient(W * 0.2, SEAY - 10, 5, W * 0.2, SEAY - 10, 160); sg.addColorStop(0, 'rgba(255,214,140,.95)'); sg.addColorStop(1, 'rgba(255,140,90,0)'); x.fillStyle = sg; x.fillRect(0, 0, W, SEAY); }
  if (L.sky === 'night') { x.fillStyle = '#e8ecf2'; x.beginPath(); x.arc(W * 0.78, 64, 16, 0, 7); x.fill(); x.fillStyle = SKY.night[0]; x.beginPath(); x.arc(W * 0.78 + 7, 59, 14, 0, 7); x.fill(); }
  if (app.flash > 0) { x.fillStyle = `rgba(220,230,255,${app.flash * 0.45})`; x.fillRect(0, 0, W, SEAY); if (app.bolt && app.flash > 0.6) { x.strokeStyle = `rgba(255,255,255,${app.flash})`; x.lineWidth = 2; x.beginPath(); let bx = app.bolt.x * W, by = 0; x.moveTo(bx, by); for (const v of app.bolt.segs) { bx += v * 60; by += SEAY / 9; x.lineTo(bx, by); } x.stroke(); } }
  // Distant clouds (parallax), then world clouds you fall through
  for (let i = 0; i < 6; i++) { const px = ((i * 263 - cam.x * 0.004) % (W + 300) + W + 300) % (W + 300) - 150, py = SEAY - 30 - (i % 3) * 18; x.fillStyle = L.sky === 'night' ? 'rgba(30,40,60,.35)' : L.sky === 'storm' ? 'rgba(20,24,28,.55)' : 'rgba(255,255,255,.25)'; x.beginPath(); x.ellipse(px, py, 140, 14, 0, 0, 7); x.fill(); }
  const cloudCol = L.sky === 'storm' ? '60,66,72' : L.sky === 'night' ? '40,52,72' : L.sky === 'dusk' ? '250,200,190' : '255,255,255';
  for (const cl of app.clouds) { const cx = X(cl.x), cy = Y(cl.y), rw = cl.w * scale, rh = Math.max(2, cl.h * scale); if (cx + rw < 0 || cx - rw > W || cy + rh < 0 || cy - rh > H) continue; x.fillStyle = `rgba(${cloudCol},${cl.a * 0.7})`; x.beginPath(); x.ellipse(cx, cy, rw / 2, rh / 2, 0, 0, 7); x.ellipse(cx - rw * 0.25, cy + rh * 0.1, rw / 3, rh / 2.4, 0, 0, 7); x.ellipse(cx + rw * 0.22, cy - rh * 0.1, rw / 3.2, rh / 2.2, 0, 0, 7); x.fill(); }
  // Speed streaks: the air rushing past
  const sp = Math.hypot(s.vx, s.vy); if (!s.done && sp > 60 && !reduced()) { x.strokeStyle = `rgba(255,255,255,${Math.min(0.35, (sp - 60) / 600)})`; x.lineWidth = 1; for (let i = 0; i < 26; i++) { const sx = (i * 89 + s.x * 0.8) % W, sy = ((i * 53 - s.y * 0.9) % H + H) % H, l = sp * 0.12; x.beginPath(); x.moveTo((sx + W) % W, sy); x.lineTo((sx + W) % W - s.vx * l / sp, sy + s.vy * l / sp); x.stroke(); } }
  // Sea
  const se = SEA[L.sky], sg = x.createLinearGradient(0, SEAY - 4, 0, H); sg.addColorStop(0, se[0]); sg.addColorStop(1, se[1]);
  x.fillStyle = sg; x.beginPath(); x.moveTo(0, H); const x0 = cam.x - W / 2 / scale - 10, x1 = cam.x + W / 2 / scale + 10, stp = Math.max(1, 6 / scale);
  for (let m = x0; m <= x1; m += stp) x.lineTo(X(m), Y(seaY(w, m, s.t)) - 2); x.lineTo(W, H); x.fill();
  // Ship
  drawShip(x, X, Y, d, scale, L);
  // Booster
  drawBooster(x, X, Y, scale, L, d);
  // Particles
  for (const p of app.parts) { const px = X(p.x), py = Y(p.y), f = p.life / p.max; if (px < -20 || px > W + 20 || py < -20 || py > H + 20) continue;
    if (p.k === 'fire') { x.fillStyle = `rgba(255,${150 + Math.round(90 * f)},${60 + Math.round(120 * f)},${0.5 * f})`; const r = Math.max(1.5, (1 - f) * 3 * Math.max(1, scale)); x.fillRect(px - r / 2, py - r / 2, r, r); }
    else if (p.k === 'smoke') { x.fillStyle = `rgba(220,220,215,${0.35 * f})`; const r = Math.max(2, (1 - f + 0.3) * 4 * scale); x.beginPath(); x.arc(px, py, r, 0, 7); x.fill(); }
    else if (p.k === 'spray') { x.fillStyle = `rgba(230,245,255,${0.6 * f})`; x.fillRect(px, py, 2, 2); }
    else { x.fillStyle = `rgba(255,255,255,${0.7 * f})`; x.beginPath(); x.arc(px, py, Math.max(1.5, 1.2 * scale), 0, 7); x.fill(); } }
  // Front waves over the hull
  x.fillStyle = se[0]; x.globalAlpha = 0.75; x.beginPath(); x.moveTo(0, H); for (let m = x0; m <= x1; m += stp) x.lineTo(X(m), Y(seaY(w, m + 13, s.t) - 0.8 - L.sea.heave * 0.4)); x.lineTo(W, H); x.fill(); x.globalAlpha = 1;
  x.strokeStyle = L.sky === 'night' ? 'rgba(120,160,200,.18)' : 'rgba(255,255,255,.22)'; x.lineWidth = 1; for (let k = 1; k < 6; k++) { x.beginPath(); for (let m = x0; m <= x1; m += stp * 2) { const yy = Y(seaY(w, m * (1 + k * 0.1), s.t) - k * 1.5) + k * 9; x.lineTo(X(m), yy); } x.stroke(); }
  // Sonic boom rings
  for (const r of app.rings) { x.strokeStyle = `rgba(255,255,255,${r.life / 1.6 * 0.7})`; x.lineWidth = 3; x.beginPath(); x.arc(X(r.x), Y(r.y), r.r, 0, 7); x.stroke(); }
  // Rain
  if (L.sky === 'storm' && !reduced()) { const wx = wind(w, 200, s.t); x.strokeStyle = 'rgba(180,200,220,.35)'; x.lineWidth = 1; x.beginPath(); for (let i = 0; i < 140; i++) { const rx = ((i * 137 + s.t * (wx * 18) + Math.sin(i) * 300) % W + W) % W, ry = ((i * 71 + s.t * 900) % H); x.moveTo(rx, ry); x.lineTo(rx + wx * 0.8, ry + 14); } x.stroke(); }
  // Range strip and deck marker
  const rs = v => 20 + (v + 3000) / 6000 * (W - 40); x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(20, 12, W - 40, 6); x.fillStyle = '#d6ff00'; x.fillRect(rs(-d.half) , 10, Math.max(3, rs(d.half) - rs(-d.half)), 10); x.fillStyle = '#fff'; x.fillRect(Math.max(20, Math.min(W - 24, rs(s.x))) - 2, 8, 4, 14);
  const dxs = X(d.x); if (dxs < 10 || dxs > W - 10) { const right = dxs > W; x.fillStyle = '#d6ff00'; x.font = 'bold 13px ui-monospace,monospace'; x.textAlign = right ? 'right' : 'left'; const ay = Math.min(SEAY - 20, Math.max(40, Y(d.y))); x.fillText(`${right ? '' : '◀ '}DECK ${Math.abs(s.x - d.x).toFixed(0)} m${right ? ' ▶' : ''}`, right ? W - 12 : 12, ay); }
  else if (d.half * 2 * scale < 14) { x.strokeStyle = '#d6ff00'; x.lineWidth = 2; x.beginPath(); x.moveTo(dxs - 8, Y(d.y) - 18); x.lineTo(dxs, Y(d.y) - 8); x.lineTo(dxs + 8, Y(d.y) - 18); x.stroke(); }
  // Altitude tape with the burn cue: where a full burn from now would stop you
  if (!s.done) { const tapeTop = 40, tapeBot = SEAY - 10, tapeX = W - 34, maxA = Math.max(500, Math.min(12000, alt * 1.15)); const ty = v => tapeBot - Math.min(1, Math.max(0, v / maxA)) * (tapeBot - tapeTop);
    x.fillStyle = 'rgba(0,0,0,.4)'; x.fillRect(tapeX, tapeTop, 10, tapeBot - tapeTop); const stopH = stopHeight(s); x.fillStyle = 'rgba(255,90,60,.8)'; x.fillRect(tapeX - 4, ty(stopH) - 2, 18, 4);
    x.fillStyle = '#fff'; x.fillRect(tapeX - 6, ty(alt) - 1.5, 22, 3); x.font = '11px ui-monospace,monospace'; x.textAlign = 'right'; x.fillStyle = '#ffb08f'; x.fillText('BURN', tapeX - 8, ty(stopH) + 4); x.fillStyle = '#fff'; x.fillText(`${alt.toFixed(0)} m`, tapeX - 8, ty(alt) - 6); }
  // Wind arrow
  const wx = wind(w, s.y, s.t); x.fillStyle = 'rgba(0,0,0,.4)'; x.fillRect(20, 30, 132, 26); x.fillStyle = '#fff'; x.font = '11px ui-monospace,monospace'; x.textAlign = 'left'; x.fillText(`WIND ${Math.abs(wx).toFixed(0)} m/s`, 28, 47); x.strokeStyle = '#fff'; x.lineWidth = 2; x.beginPath(); const ax0 = 128, al = Math.max(-16, Math.min(16, wx * 1.4)); x.moveTo(ax0 - al, 43); x.lineTo(ax0 + al, 43); if (Math.abs(al) > 2) { x.lineTo(ax0 + al - Math.sign(al) * 5, 39); x.moveTo(ax0 + al, 43); x.lineTo(ax0 + al - Math.sign(al) * 5, 47); } x.stroke();
  if (s.mach > 0.9 && !s.done) { x.fillStyle = s.mach >= 1 ? '#ffb347' : '#fff'; x.fillText(`MACH ${s.mach.toFixed(2)}`, 28, 72); }
  const small = c.clientWidth > 0 && c.clientWidth < 640;
  if (s.t < 7 && !s.done && !small) { x.fillStyle = 'rgba(0,0,0,.5)'; x.fillRect(W / 2 - 230, H - 58, 460, 40); x.fillStyle = '#fff'; x.textAlign = 'center'; x.font = '12px ui-monospace,monospace'; x.fillText('W/S throttle · Q/E lean · A/D gimbal · L legs · Space full · X cut', W / 2, H - 34); }
  // On a phone the readouts under the picture are out of sight, so the key ones go on it, big.
  if (small && !s.done) { const f = Math.min(34, Math.round(12 * W / c.clientWidth)), r = readings(); x.fillStyle = 'rgba(0,0,0,.55)'; x.fillRect(0, H - f * 1.7, W, f * 1.7); x.font = `bold ${f}px ui-monospace,monospace`; x.textAlign = 'left'; x.fillStyle = -s.vy > LIMITS.down && alt < 40 ? '#ff8a5c' : '#fff';
    x.fillText(`↓${(-s.vy).toFixed(0)} ↔${(s.vx - d.vx).toFixed(1)} ${r.th} ${Math.round(s.fuel / w.level.fuel * 100)}% ${s.legs >= 1 ? 'LEGS' : ''}`, 10, H - f * 0.5); }
  if (app.paused) { x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(0, 0, W, H); }
  if (L.sky === 'night') { const v = x.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.9); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.55)'); x.fillStyle = v; x.fillRect(0, 0, W, H); }
}
function drawShip(x, X, Y, d, scale, L) {
  const night = L.sky === 'night' || L.sky === 'storm';
  x.save(); x.translate(X(d.x), Y(d.y)); x.rotate(-d.pitch); const k = scale, hw = d.half * k;
  // Hull, a flat barge with thruster pods
  x.fillStyle = night ? '#1d2328' : '#39424a'; x.beginPath(); x.moveTo(-hw - 4 * k, 0); x.lineTo(hw + 4 * k, 0); x.lineTo(hw + 1 * k, 9 * k); x.lineTo(-hw - 1 * k, 9 * k); x.closePath(); x.fill();
  x.fillStyle = night ? '#2c343a' : '#57616a'; x.fillRect(-hw - 4 * k, 0, (d.half * 2 + 8) * k, 1.6 * k);
  x.fillStyle = '#c6a63a'; x.fillRect(-hw - 4 * k, 1.6 * k, (d.half * 2 + 8) * k, 0.8 * k);
  // Deck top seen from a little above, with the landing ring
  const depth = Math.max(2, 7 * k); x.fillStyle = night ? '#262d33' : '#4a545c'; x.beginPath(); x.moveTo(-hw, 0); x.lineTo(hw, 0); x.lineTo(hw - 3 * k, -depth); x.lineTo(-hw + 3 * k, -depth); x.closePath(); x.fill();
  x.strokeStyle = night ? 'rgba(214,255,0,.85)' : '#d6ff00'; x.lineWidth = Math.max(1, 0.8 * k); x.beginPath(); x.ellipse(0, -depth / 2, 18 * k, depth * 0.42, 0, 0, 7); x.stroke(); x.beginPath(); x.ellipse(0, -depth / 2, 3 * k, depth * 0.12, 0, 0, 7); x.stroke();
  x.fillStyle = night ? 'rgba(214,255,0,.85)' : '#d6ff00'; x.fillRect(-12 * k, -depth / 2 - Math.max(0.5, depth * 0.05), 24 * k, Math.max(1, depth * 0.1));
  // Blast walls and a small control hut at the ends
  x.fillStyle = night ? '#30383f' : '#6a747c'; x.fillRect(-hw - 3 * k, -6 * k, 2.5 * k, 6 * k); x.fillRect(hw + 0.5 * k, -6 * k, 2.5 * k, 6 * k); x.fillRect(hw - 2 * k, -4 * k, 4 * k, 4 * k);
  if (k > 1.2) { x.fillStyle = night ? '#9aa4ad' : '#e6e9ea'; x.font = `bold ${Math.max(8, 2.6 * k)}px ui-monospace,monospace`; x.textAlign = 'center'; x.fillText('PATIENCE', -hw * 0.55, 6 * k); }
  // Deck lights
  for (let i = -4; i <= 4; i++) { const lx = i * d.half / 4 * k; x.fillStyle = night ? '#fff6c8' : '#ffe9a0'; x.beginPath(); x.arc(lx, -1, Math.max(1.2, 0.5 * k), 0, 7); x.fill(); if (night) { const lg = x.createRadialGradient(lx, -1, 0, lx, -1, Math.max(6, 5 * k)); lg.addColorStop(0, 'rgba(255,240,180,.45)'); lg.addColorStop(1, 'rgba(255,240,180,0)'); x.fillStyle = lg; x.fillRect(lx - 6 * k - 6, -6 * k - 6, 12 * k + 12, 12 * k + 12); } }
  if (night) { x.fillStyle = 'rgba(255,250,210,.06)'; for (const sgn of [-1, 1]) { x.beginPath(); x.moveTo(sgn * (hw - 2 * k), -6 * k); x.lineTo(sgn * 60 * k, -400 * k); x.lineTo(sgn * 20 * k, -400 * k); x.closePath(); x.fill(); } }
  x.restore();
}
function drawBooster(x, X, Y, scale, L, d) {
  const s = app.s, k = Math.max(scale, 1.3), night = L.sky === 'night';
  let bx = s.x, by = s.y, ang = s.angle;
  if (s.done && s.landed) { by = deckYAt(d, s.x); ang = -d.pitch; }
  if (s.done && !s.landed) return;
  x.save(); x.translate(X(bx), Y(by)); x.rotate(ang);
  // Legs: hinge at the base of the body, tips swing out to 8 m.
  const lg = s.legsBroken ? 0 : s.legs, base = -2.6 * k;
  x.strokeStyle = night ? '#4b5258' : '#2a2f33'; x.lineWidth = Math.max(1.5, 0.7 * k);
  for (const sg of [-1, 1]) { if (s.legsBroken) continue; const hx = sg * 1.85 * k, hy = base, dxL = sg * (LEGS.span - 1.85) * k, dyL = -hy, len = Math.hypot(dxL, dyL);
    const a0 = -Math.PI / 2, a1 = Math.atan2(dyL, dxL), da = ((a1 - a0 + 3 * Math.PI) % (2 * Math.PI)) - Math.PI, a = a0 + da * lg, tipX = hx + Math.cos(a) * len, tipY = hy + Math.sin(a) * len;
    x.beginPath(); x.moveTo(hx, hy); x.lineTo(tipX, tipY); x.stroke(); if (lg > 0.05) { x.lineWidth = Math.max(1, 0.35 * k); x.beginPath(); x.moveTo(hx, hy - 6 * k); x.lineTo(hx + (tipX - hx) * 0.6, hy + (tipY - hy) * 0.6); x.stroke(); x.lineWidth = Math.max(1.5, 0.7 * k); }
    x.fillStyle = '#1b1e21'; x.fillRect(tipX - 0.6 * k, tipY - 0.3 * k, 1.2 * k, 0.5 * k); }
  // Engine bell, gimballed
  x.save(); x.translate(0, base); x.rotate(s.gimbal); x.fillStyle = '#3b3f43'; x.beginPath(); x.moveTo(-0.7 * k, 0); x.lineTo(0.7 * k, 0); x.lineTo(1.2 * k, 2 * k); x.lineTo(-1.2 * k, 2 * k); x.closePath(); x.fill();
  const th = s.fuel > 0 && !s.done ? s.throttle : 0;
  if (th > 0) { const thin = 1 - Math.min(1, rho(s.y) / 1.225), len = (14 + 26 * thin) * th * k * (reduced() ? 1 : 0.85 + Math.random() * 0.3), wid = (1.2 + 5 * thin) * k;
    const pg = x.createLinearGradient(0, 2 * k, 0, 2 * k + len); pg.addColorStop(0, 'rgba(255,255,230,.95)'); pg.addColorStop(0.25, 'rgba(255,190,90,.85)'); pg.addColorStop(1, 'rgba(255,100,40,0)'); x.fillStyle = pg; x.beginPath(); x.moveTo(-1.1 * k, 2 * k); x.quadraticCurveTo(-wid, 2 * k + len * 0.4, 0, 2 * k + len); x.quadraticCurveTo(wid, 2 * k + len * 0.4, 1.1 * k, 2 * k); x.fill();
    const gl = x.createRadialGradient(0, 3 * k, 0, 0, 3 * k, 22 * k); gl.addColorStop(0, `rgba(255,170,80,${0.35 * th})`); gl.addColorStop(1, 'rgba(255,170,80,0)'); x.fillStyle = gl; x.fillRect(-22 * k, -19 * k, 44 * k, 44 * k); }
  x.restore();
  // Body: white with soot from the entry, a dark interstage at the top.
  const bg = x.createLinearGradient(-1.85 * k, 0, 1.85 * k, 0); bg.addColorStop(0, night ? '#7c8288' : '#c9cdd0'); bg.addColorStop(0.45, night ? '#c8ccd0' : '#fbfbfb'); bg.addColorStop(1, night ? '#5a6066' : '#aeb3b7');
  x.fillStyle = bg; x.fillRect(-1.85 * k, -42.5 * k, 3.7 * k, 40 * k);
  const soot = x.createLinearGradient(0, base, 0, base - 22 * k); soot.addColorStop(0, 'rgba(40,32,26,.75)'); soot.addColorStop(1, 'rgba(40,32,26,0)'); x.fillStyle = soot; x.fillRect(-1.85 * k, -24.5 * k, 3.7 * k, 22 * k);
  if (s.heat > 25) { const hg = x.createLinearGradient(0, base, 0, base - 10 * k); hg.addColorStop(0, `rgba(255,120,40,${Math.min(0.85, (s.heat - 25) / 80)})`); hg.addColorStop(1, 'rgba(255,120,40,0)'); x.fillStyle = hg; x.fillRect(-2.4 * k, base - 10 * k, 4.8 * k, 12 * k); }
  x.fillStyle = '#1f2326'; x.fillRect(-1.85 * k, -42.5 * k, 3.7 * k, 4.5 * k);
  x.fillStyle = '#d6ff00'; x.fillRect(-1.85 * k, -31 * k, 3.7 * k, 0.6 * k);
  if (k > 2.2) { x.save(); x.translate(0.35 * k, -28 * k); x.rotate(Math.PI / 2); x.fillStyle = '#20252a'; x.font = `bold ${1.6 * k}px "Arial Black",Arial,sans-serif`; x.textAlign = 'left'; x.fillText('DEXM', 0, 0); x.restore(); }
  // Grid fins
  x.strokeStyle = '#2d3236'; x.fillStyle = 'rgba(60,66,70,.85)'; x.lineWidth = Math.max(1, 0.18 * k);
  for (const sg of [-1, 1]) { const fx = sg * 1.85 * k, w = 2.6 * k * sg, h = 1.6 * k, fy = -39.6 * k; x.fillRect(Math.min(fx, fx + w), fy, Math.abs(w), h); if (k > 1.6) { x.beginPath(); for (let i = 1; i < 4; i++) { x.moveTo(fx + w * i / 4, fy); x.lineTo(fx + w * i / 4, fy + h); } x.moveTo(fx, fy + h / 2); x.lineTo(fx + w, fy + h / 2); x.stroke(); } }
  // Cold gas puffs at the top
  if (!s.done && s.rcs > 0 && (app.keys.rl || app.keys.rr)) { const side = app.keys.rl ? 1 : -1; x.fillStyle = 'rgba(255,255,255,.8)'; x.beginPath(); x.moveTo(side * 1.85 * k, -41 * k); x.lineTo(side * 6 * k, -42 * k); x.lineTo(side * 6 * k, -40 * k); x.fill(); }
  // Vapour cone around Mach 1
  if (!s.done && s.mach > 0.92 && s.mach < 1.08 && rho(s.y) > 0.25) { const a = 1 - Math.abs(s.mach - 1) / 0.08; x.fillStyle = `rgba(255,255,255,${0.35 * a})`; x.beginPath(); x.moveTo(-1.85 * k, -6 * k); x.quadraticCurveTo(-10 * k, -14 * k, -9 * k, -24 * k); x.lineTo(9 * k, -24 * k); x.quadraticCurveTo(10 * k, -14 * k, 1.85 * k, -6 * k); x.fill(); }
  x.restore();
}

function finish() {
  app.ended = true; const s = app.s, w = app.w, L = w.level, sc = score(s, w), st = store();
  sound(false); if (!reduced()) app.shake = s.landed ? 5 : 16;
  if (!s.landed) { const ex = s.fault.k === 'sea' ? 'spray' : 'fire'; for (let i = 0; i < (reduced() ? 0 : 160); i++) { const a = Math.random() * Math.PI, v = 10 + Math.random() * 45; app.parts.push({x: s.x, y: s.y + 4, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1 + Math.random() * 1.5, max: 2.5, k: ex}); } for (let i = 0; i < (reduced() ? 0 : 50); i++) app.parts.push({x: s.x + (Math.random() - 0.5) * 10, y: s.y + Math.random() * 20, vx: (Math.random() - 0.5) * 10, vy: Math.random() * 6, life: 2 + Math.random() * 2, max: 4, k: 'smoke'}); crash(); }
  else { thump(); }
  $('result').hidden = false; $('paused').hidden = true;
  const t = s.touch; st.flights = (st.flights || 0) + 1;
  $('result-head').textContent = s.landed ? `Booster recovered. ${sc} points.` : s.fault.k === 'heat' ? 'Lost on entry.' : s.fault.k === 'sea' || s.fault.k === 'range' ? 'Lost at sea.' : 'Lost on the deck.';
  let txt = s.landed ? `Touchdown at ${t.impact.toFixed(1)} m/s onto the deck, sliding ${t.slide.toFixed(1)} m/s, tilted ${(t.tilt * DEG).toFixed(1)}° to it, ${t.dist.toFixed(1)} m from the centre${t.dist <= 3 ? ' (bullseye)' : ''}, with ${Math.round(s.fuel)} kg of fuel left.` : s.fault.text;
  if (s.landed) { const p = parts(s, w); $('result-parts').innerHTML = [['Soft', p.soft], ['Level', p.level], ['Still', p.still], ['Centre', p.centre], ['Fuel', p.fuel], ['Bullseye', p.bull]].map(([k, v]) => `<div><b>${v}</b><span>${k}</span></div>`).join('') + `<div><b>×${L.mult}</b><span>${L.name}</span></div>`; $('result-parts').hidden = false; }
  else $('result-parts').hidden = true;
  st.best = st.best || {}; st.landed = st.landed || {};
  if (s.landed) { st.landed[L.id] = (st.landed[L.id] || 0) + 1; if (sc > (st.best[L.id] || 0)) { st.best[L.id] = sc; txt += ' A new personal best.'; } }
  $('result-text').textContent = txt; write(KEY, st);
  const i = LEVELS.findIndex(l => l.id === L.id); $('next').hidden = !s.landed || i === LEVELS.length - 1; if (!$('next').hidden) $('next').textContent = `Next: ${LEVELS[i + 1].name} (N)`;
  app.share = `Booster landing, ${L.name}\n${s.landed ? `Recovered, ${sc} points, ${t.dist.toFixed(1)} m from centre at ${t.impact.toFixed(1)} m/s` : 'Lost'}\nhttps://dexmlabs.app/booster-landing-game/`;
  renderLevels(); setLevel(L.id); $('again').focus({preventScroll: true});
  window.BoosterGame.last = {landed: !!s.landed, score: sc, fault: s.fault?.k || null, touch: t || null};
}

// Sound: off unless switched on. All made here with WebAudio, no files.
function noiseBuf(ac) { const b = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; }
function chain(ac, type, freq, q = 0.7) { const src = ac.createBufferSource(); src.buffer = app.audio?.buf || noiseBuf(ac); src.loop = true; const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; const g = ac.createGain(); g.gain.value = 0; src.connect(f).connect(g).connect(app.audio.out); src.start(); return {f, g}; }
function sound(on) {
  const st = store(); if (!st.sound) { if (app.audio) app.audio.out.gain.value = 0; return; }
  if (!app.audio) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; const ac = new AC(), out = ac.createGain(); out.gain.value = 0.9; out.connect(ac.destination); app.audio = {ac, out, buf: noiseBuf(ac)}; app.audio.eng = chain(ac, 'lowpass', 300); app.audio.rcs = chain(ac, 'highpass', 2500); app.audio.air = chain(ac, 'bandpass', 500, 0.6); const o = ac.createOscillator(), og = ac.createGain(); o.type = 'sawtooth'; o.frequency.value = 42; og.gain.value = 0; o.connect(og).connect(out); o.start(); app.audio.rum = og; }
  const A = app.audio, s = app.s; if (A.ac.state === 'suspended') A.ac.resume(); A.out.gain.value = 0.9;
  const live = on !== false && s && !s.done && !app.paused, th = live && s.fuel > 0 ? s.throttle : 0, sp = s ? Math.hypot(s.vx, s.vy) : 0;
  A.eng.g.gain.value = th * 0.45; A.eng.f.frequency.value = 180 + th * 520 * Math.max(0.4, Math.min(1, rho(s?.y || 0))); A.rum.gain.value = th * 0.05;
  A.rcs.g.gain.value = live && s.rcs > 0 && (app.keys.rl || app.keys.rr) ? 0.08 : 0;
  A.air.g.gain.value = live ? Math.min(0.25, rho(s.y) * sp / 900 + Math.abs(wind(app.w, s.y, s.t)) / 120) : 0; A.air.f.frequency.value = 300 + Math.min(1500, sp * 3);
}
function env(f, g0, len, type = 'sine', delay = 0) { const A = app.audio; if (!store().sound || !A) return; const t = A.ac.currentTime + delay, o = A.ac.createOscillator(), g = A.ac.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f * 0.4), t + len); g.gain.setValueAtTime(g0, t); g.gain.exponentialRampToValueAtTime(0.0001, t + len); o.connect(g).connect(A.out); o.start(t); o.stop(t + len + 0.05); }
function burst(len, g0, freq, delay = 0) { const A = app.audio; if (!store().sound || !A) return; const t = A.ac.currentTime + delay, src = A.ac.createBufferSource(); src.buffer = A.buf; const f = A.ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq; const g = A.ac.createGain(); g.gain.setValueAtTime(g0, t); g.gain.exponentialRampToValueAtTime(0.0001, t + len); src.connect(f).connect(g).connect(A.out); src.start(t); src.stop(t + len + 0.05); }
const beep = (f, len) => env(f, 0.08, len, 'square');
const boom = () => { env(60, 0.6, 0.5); burst(0.4, 0.5, 400); env(55, 0.5, 0.5, 'sine', 0.22); burst(0.4, 0.4, 350, 0.22); };
const thunder = () => { burst(1.6, 0.25, 220, 0.3 + Math.random() * 0.6); };
const thump = () => { env(90, 0.5, 0.3); burst(0.25, 0.3, 600); };
const crash = () => { burst(1.8, 0.7, 900); env(50, 0.6, 1.2); };
const clunk = () => { env(220, 0.15, 0.08, 'square'); env(140, 0.15, 0.1, 'square', 0.09); };

// Input. Q/E and A/D are held, W/S step the throttle, like the Apollo game.
const HOLD = {q: 'rl', Q: 'rl', ArrowLeft: 'rl', e: 'rr', E: 'rr', ArrowRight: 'rr', a: 'gl', A: 'gl', d: 'gr', D: 'gr'};
function thr(f) { if (app.s && !app.s.done && !app.paused) { app.s = {...app.s, throttle: f(app.s.throttle)}; } }
function legs() { const s = app.s; if (!s || s.done || app.paused || s.legsOut) return; if (Math.hypot(s.vx, s.vy) > LEGS.maxSpeed) { say(`Legs locked until you are below ${LEGS.maxSpeed} m/s.`); beep(300, 0.12); return; } app.s = deployLegs(s); say('Legs deploying.'); }
function pause(on = !app.paused) { if (!app.s || app.s.done) return; app.paused = on; $('paused').hidden = !on; if (!on) app.last = performance.now(); sound(); }
addEventListener('keydown', e => {
  if (!app.s || $('flight').hidden) return; const k = HOLD[e.key], low = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (k && !app.s.done) { app.keys[k] = true; e.preventDefault(); }
  else if (low === 'w' || e.key === 'ArrowUp') { thr(throttleUp); e.preventDefault(); }
  else if (low === 's' || e.key === 'ArrowDown') { thr(throttleDown); e.preventDefault(); }
  else if (e.key === ' ') { thr(() => 1); e.preventDefault(); }
  else if (low === 'x') thr(() => 0);
  else if (low === 'l' || low === 'g') legs();
  else if (low === 'p' || e.key === 'Escape') pause();
  else if (low === 'r' && app.s.done) start(app.level);
  else if (low === 'n' && app.s.done && !$('next').hidden) next();
});
addEventListener('keyup', e => { const k = HOLD[e.key]; if (k) app.keys[k] = false; });
addEventListener('blur', () => { app.keys = {}; if (app.s && !app.s.done && !$('flight').hidden) pause(true); });
document.addEventListener('visibilitychange', () => { if (document.hidden && app.s && !app.s.done && !$('flight').hidden) pause(true); });
document.querySelectorAll('[data-hold]').forEach(b => { const k = b.dataset.hold; b.addEventListener('pointerdown', e => { e.preventDefault(); app.keys[k] = true; b.setPointerCapture?.(e.pointerId); sound(); }); ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => b.addEventListener(ev, () => { app.keys[k] = false; })); b.addEventListener('contextmenu', e => e.preventDefault()); });
const tap = (id, f) => $(id).addEventListener('click', f);
tap('th-up', () => thr(throttleUp)); tap('th-down', () => thr(throttleDown)); tap('th-full', () => thr(() => 1)); tap('th-cut', () => thr(() => 0)); tap('legs', legs); tap('pause', () => pause()); tap('resume', () => pause(false));
function next() { const i = LEVELS.findIndex(l => l.id === app.level); start(LEVELS[Math.min(LEVELS.length - 1, i + 1)].id); }
tap('again', () => start(app.level)); tap('next', next); tap('play', () => start(app.level));
tap('share', () => navigator.clipboard?.writeText(app.share).then(() => say('Result copied.'), () => { $('share-text').hidden = false; $('share-text').value = app.share; }));
tap('back', () => { cancelAnimationFrame(app.raf); if (app.audio) app.audio.out.gain.value = 0; app.s = null; $('flight').hidden = true; $('screen-title').hidden = false; document.body.dataset.screen = 'title'; renderLevels(); setLevel(app.level); scrollTo(0, 0); });
$('sound').checked = !!store().sound; $('sound').addEventListener('change', e => { const st = store(); st.sound = e.target.checked; write(KEY, st); if (e.target.checked && app.s) sound(); });
// For tests and the curious: read only views of the flight.
window.BoosterGame = {flights: 0, last: null, state: () => app.s && {...app.s}, world: () => app.w, deck: () => app.s && deck(app.w, app.s.t), level: () => app.level, start: id => start(id)};
renderLevels(); setLevel(level(store().level || 'calm').id);
