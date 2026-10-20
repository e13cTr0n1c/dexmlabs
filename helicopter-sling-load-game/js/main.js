import {step, makeWorld, parts, HELI, wind, endOf, swing, clearance, heliClear, supportTop, ground, inZone, massOf, DEG, G, tmax} from './physics.js';
import {LEVELS, level} from './levels.js';
import {ukDate, countdown, grid, makeStore} from './daily.js';
import {dailyLevel} from './daily-level.js';
const $ = id => document.getElementById(id);
const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const KEY = 'sling:stats', store = () => read(KEY, {best: {}, grade: {}, flights: 0});
const DT = 1 / 60, ACID = '#d6ff00';
const app = {w: null, s: null, keys: {}, rel: false, raf: 0, last: 0, acc: 0, said: {}, parts: [], floats: [], shake: 0, slow: 0, banner: null, level: 'first-lift', hover: true, damp: true, audio: null, paused: false, cam: {x: 0, scale: 6}, clouds: [], ended: false, face: 1, faceT: 1, flash: 0, rotor: 0};

// Level select
const fmtBest = id => { const st = store(), b = st.best?.[id]; return b ? `Best ${b} · ${st.grade?.[id] || ''}` : 'Not flown yet'; };
function renderLevels() {
  $('levels').innerHTML = LEVELS.map((l, i) => `<button type="button" data-level="${l.id}" aria-pressed="${l.id === app.level}"><span class="lv-n">${i + 1}</span> ${l.name} <span class="mult">×${l.mult}</span><small>${l.blurb}</small><small class="best">${fmtBest(l.id)}</small></button>`).join('');
  document.querySelectorAll('[data-level]').forEach(b => b.addEventListener('click', () => setLevel(b.dataset.level)));
}
function setLevel(id) { app.level = id; document.querySelectorAll('[data-level]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.level === id))); const st = store(); st.level = id; write(KEY, st); $('play').innerHTML = `Fly ${level(id).name} <span aria-hidden="true">&rarr;</span>`; }
function say(t) { $('feedback').textContent = t; }
const NOTES = {'first-lift': 'The crate is already on the hook. Tilt with A and D, let go and the helicopter brakes. Ease it down onto the pad with S.', 'crate-yard': 'Lower the hook onto the top of the crate and it latches. Lift with W, carry it over the container and set it down.',
  'two-crates': 'Two in a row. The breeze pushes the load, so let the swing settle before you set down.', rooftop: 'Climb over the tall block, then come down slowly onto the roof. The AC unit breaks above 3.5 m/s.',
  'forest-log': 'A 30 m rope keeps the rotor clear of the trees. A long rope swings slowly, so start braking early.', 'fire-bucket': 'Dip the bucket in the lake until it fills, then fly over the fire and press Space to open it. The wind carries the water, so drop a little upwind.',
  bridge: 'Heavy, wide and catching the wind. It only sits on both piers within 2 m of the middle. Come in slowly.', daily: 'Same job for everyone today.'};
// Daily Drop: one scored flight a day for everyone, then practice that doesn't count.
const DAILY = makeStore('sling:daily'), SITE = 'https://dexmlabs.app/helicopter-sling-load-game/';
function dailyCard(rec) {
  const head = `DEXM Sling Load #${rec.no}`;
  if (!rec.ok) return `${head} 💥 ${rec.lost}\n${grid([0, 0, 0, 0, 0])}\n${SITE}?daily`;
  const what = rec.kind === 'fire' ? `${rec.hit}% on the fire` : `${rec.d.toFixed(1)} m off · swing ${rec.slide.toFixed(1)} m/s`;
  return `${head} 🚁 Grade ${rec.grade} · ${what}\n${grid(rec.grid)} ${rec.score} pts\n${SITE}?daily`;
}
function startDaily() { const L = dailyLevel(), done = DAILY.get(L.date); app.daily = {L, practice: !!done || L.no < 0}; start(L, L.seed); }
function renderDaily() {
  const box = $('daily'); if (!box) return; const L = dailyLevel(), rec = DAILY.get(L.date), pre = L.no < 0;
  $('daily-h').textContent = pre ? 'Daily Drop #0 arrives at midnight' : `Daily Drop #${L.no}`;
  $('daily-blurb').textContent = (pre ? 'Preview: ' : '') + L.blurb;
  $('daily-status').textContent = pre ? 'Practise the preview now. Scoring starts with #0.' : rec ? (rec.ok ? `Today: grade ${rec.grade}, ${rec.score} points. Practice flights don't count.` : `Today: ${rec.lost} Practice flights don't count.`) : 'One scored try today, the same job for everyone. Then practise as much as you like.';
  $('daily-play').innerHTML = `${rec || pre ? 'Practise today\'s drop' : 'Fly today\'s drop'} <span aria-hidden="true">&rarr;</span>`;
  $('daily-share').hidden = !rec; box.classList.toggle('played', !!rec);
}
function showDailyResult(rec) { const b = $('daily-result'); b.hidden = !rec; if (rec) { $('daily-card').textContent = dailyCard(rec); $('daily-result-next').textContent = `Next drop in ${countdown()}`; } }
function tickDaily() { const e = $('daily-next'); if (e) e.textContent = `Next drop in ${countdown()}`; if (!$('daily-result').hidden) $('daily-result-next').textContent = `Next drop in ${countdown()}`; if (app.dailyDate && app.dailyDate !== ukDate()) renderDaily(); app.dailyDate = ukDate(); }
function copyShare(text) { app.share = text; navigator.clipboard?.writeText(text).then(() => say('Copied.'), () => { $('share-text').hidden = false; $('share-text').value = text; }); }

function start(id = app.level, seed = Math.floor(Math.random() * 2 ** 31)) {
  cancelAnimationFrame(app.raf); const L = typeof id === 'object' ? id : level(id); if (!L.daily) { app.level = L.id; app.daily = null; }
  const w = makeWorld(L, seed, L.daily ? {} : {hover: app.hover, damp: app.damp});
  Object.assign(app, {w, s: w.start, keys: {}, rel: false, said: {}, parts: [], floats: [], shake: 0, slow: 0, banner: null, paused: false, acc: 0, ended: false, face: 1, faceT: 1, flash: 0});
  app.cam = {x: camTarget().x, scale: camTarget().scale}; app.clouds = makeClouds(seed); app.trees = null;
  $('flight').hidden = false; $('screen-title').hidden = true; document.body.dataset.screen = 'game'; scrollTo(0, 0); $('result').hidden = true; $('paused').hidden = true; say('');
  $('flight-h').textContent = `${L.name}${L.daily && app.daily.practice ? ' (practice)' : ''}`; $('level-note').textContent = (L.daily ? (app.daily.practice ? 'Practice: this flight is not scored. ' : 'Your one scored try today. ') + L.blurb : L.blurb + ' ' + NOTES[L.id]) + (!w.assist.hover ? ' Hover hold is off.' : '') + (!w.assist.damp ? ' Swing damper is off.' : '');
  $('sky').focus({preventScroll: true}); sound(true); app.last = performance.now(); app.raf = requestAnimationFrame(loop); window.SlingGame.flights++;
}
function input() { const k = app.keys, r = {tilt: (k.r ? 1 : 0) - (k.l ? 1 : 0), lift: (k.u ? 1 : 0) - (k.d ? 1 : 0), rel: app.rel}; app.rel = false; return r; }
function loop(now) {
  const real = Math.min(0.1, (now - app.last) / 1000); app.last = now; let dt = real;
  if (app.slow > 0) { app.slow -= real; dt = real * 0.35; }
  if (!app.paused && !app.s.done) { app.acc += dt; while (app.acc >= DT && !app.s.done) { step(app.w, app.s, input(), DT); app.acc -= DT; events(app.s.ev); } }
  juice(app.paused ? 0 : dt, real); draw(); hud(); sound(); if (!app.s.done) callouts();
  if (app.s.done && !app.ended) finish();
  app.raf = requestAnimationFrame(loop);
}
const task = () => app.w.tasks[app.s.task];
function events(ev) {
  const s = app.s, w = app.w;
  for (const e of ev) {
    if (e.k === 'hooked') { say(`Hooked. Lift with W.`); clack(); float('HOOKED', s.hook.x, s.hook.y + 2, ACID); sparks(s.hook.x, s.hook.y, 14); }
    else if (e.k === 'touch' && e.impact > 0.4) { thud(Math.min(1, e.impact / 4)); puff(e.x, e.y, 6 + e.impact * 8, 'dust'); app.shake = Math.max(app.shake, e.impact * 2.5); }
    else if (e.k === 'bump') { knock(); app.shake = Math.max(app.shake, 5); say('Careful, it hit something.'); puff(e.x, e.y, 10, 'dust'); }
    else if (e.k === 'release') clunk();
    else if (e.k === 'auto') say('Set down. The hook let go for you.');
    else if (e.k === 'placed') { const r = e.r, bull = r.d < 0.4, q = 0.5 * r.acc + 0.3 * r.swing + 0.2 * r.soft;
      app.banner = {t: 0, big: bull ? 'BULLSEYE' : q > 0.85 ? 'PERFECT' : q > 0.65 ? 'GREAT' : 'PLACED', sub: `${r.d.toFixed(1)} m off · swing ${r.slide.toFixed(1)} m/s · ${r.impact.toFixed(1)} m/s down`};
      chime(q); confetti(e.x, e.y + 2, bull ? 160 : 90); app.slow = reduced() ? 0 : 0.8; app.shake = Math.max(app.shake, 5); float(`${Math.round(r.d * 10) / 10} m`, e.x, e.y + 4, '#fff');
      if (s.task < w.tasks.length) say(`Placed. Next: ${w.tasks.length - s.task} more.`); }
    else if (e.k === 'missed') { say(`Off the target by ${Math.abs(e.d).toFixed(1)} m. Hook it again and move it ${e.d > 0 ? 'left' : 'right'}.`); buzz(); }
    else if (e.k === 'full') { say('Bucket full. Climb out with W and head for the fire.'); splash(); float('FULL', s.items[0].x, s.items[0].y + 3, '#9fe3ff'); }
    else if (e.k === 'dump') { whoosh(); say('Water away.'); }
    else if (e.k === 'drop' && Math.random() < 0.08) puff(e.x, ground(w, e.x) + 0.3, 1, e.hit ? 'steam' : 'spray');
    else if (e.k === 'doused') { const p = Math.round(e.acc * 100); app.banner = {t: 0, big: p >= 85 ? 'DIRECT HIT' : p >= 50 ? 'ON TARGET' : 'MOSTLY MISSED', sub: `${p}% of the water on the fire · fire ${Math.round(e.fire * 100)}% left`}; chime(e.acc); if (e.fire > 0) setTimeout(() => say('Back to the lake for another load.'), 900); for (let i = 0; i < 40; i++) puff(w.fire.x0 + Math.random() * (w.fire.x1 - w.fire.x0), 2, 1, 'steam'); }
    else if (e.k === 'splash') splash();
  }
}
function callouts() {
  const s = app.s, w = app.w, c = (k, t) => { if (!app.said[k]) { app.said[k] = 1; say(t); } }, e = endOf(s), sw = swing(s);
  if (s.t < 0.5) c('start', w.fire ? 'Fly to the lake with D, then lower the bucket into the water with S.' : s.carry >= 0 ? 'Tilt with D to fly to the pad. Let go of D and you brake.' : 'Fly over the crate with D, then lower the hook onto it with S.');
  if (Math.abs(sw.angle) > 0.35 && s.tension > 0) c('sw' + Math.floor(s.t / 15), 'Big swing. Hold still and let it settle before you set it down.');
  const t = task(); if (t && s.carry === t.item && Math.abs(e.x - t.zone.x) < t.zone.half && clearance(w, s) < 8) c('over' + s.task, 'Over the target. Ease it down with S.');
  if (t && s.carry < 0 && Math.abs(s.x - s.items[t.item].x) < 3) c('hk' + s.task, 'Over it. Lower the hook with S until it latches.');
  if (s.fuel < w.fuel * 0.2 && s.fuel > 0) c('bingo', 'Fuel low.');
  if (s.c > 0.97) c('torque' + Math.floor(s.t / 10), 'Max power. Climb more slowly.');
}
function readings() {
  const s = app.s, w = app.w, wx = wind(w, s.y, s.t), sw = swing(s), t = task();
  const job = w.fire ? (s.phase === 'fill' ? (s.water > 0 ? `Filling ${Math.round(s.water * 100)}%` : 'Fill at the lake') : s.dumping ? 'Dumping' : 'Drop on the fire') : t ? (s.carry === t.item ? `Set down ${s.task + 1}/${w.tasks.length}` : `Hook load ${s.task + 1}/${w.tasks.length}`) : 'Done';
  const tx = w.fire ? (s.phase === 'fill' ? (w.water[0].x0 + w.water[0].x1) / 2 : (w.fire.x0 + w.fire.x1) / 2) : t ? (s.carry === t.item ? t.zone.x : s.items[t.item].x) : s.x, ex = endOf(s).x, dx = tx - (s.carry >= 0 ? ex : s.x);
  return {alt: `${heliClear(w, s).toFixed(0)} m`, load: `${Math.max(0, clearance(w, s)).toFixed(1)} m`, vy: `${s.vy.toFixed(1)} m/s`, vx: `${s.vx.toFixed(1)} m/s`, swing: `${Math.abs(sw.angle * DEG).toFixed(0)}° ${Math.abs(sw.rel).toFixed(1)}`, coll: `${Math.round(s.c * 100)}%`,
    fuel: `${Math.round(s.fuel)} kg`, wind: `${Math.abs(wx).toFixed(0)} m/s ${wx > 0.5 ? '→' : wx < -0.5 ? '←' : ''}`, job, to: `${Math.abs(dx).toFixed(Math.abs(dx) < 10 ? 1 : 0)} m ${dx > 0 ? '→' : '←'}`, time: `${s.t.toFixed(0)} s`, mass: `${(massOf(s, endOf(s)) / 1000).toFixed(1)} t`};
}
function hud() {
  const r = readings(), s = app.s, w = app.w;
  for (const k of Object.keys(r)) { const e = $('h-' + k); if (e && e.textContent !== r[k]) e.textContent = r[k]; }
  const warn = (k, on) => $('h-' + k).parentElement.classList.toggle('warn', !!on);
  warn('swing', Math.abs(swing(s).angle) > 0.3); warn('fuel', s.fuel < w.fuel * 0.2); warn('coll', s.c > 0.95); warn('vy', s.vy < -3 && heliClear(w, s) < 10);
}

// Effects
function float(text, x, y, col) { app.floats.push({text, x, y, t: 0, col}); }
function sparks(x, y, n) { if (reduced()) return; for (let i = 0; i < n; i++) app.parts.push({x, y, vx: (Math.random() - 0.5) * 8, vy: Math.random() * 6, life: 0.5, max: 0.5, k: 'spark'}); }
function puff(x, y, n, k) { if (reduced()) return; for (let i = 0; i < n; i++) app.parts.push({x: x + (Math.random() - 0.5) * 3, y, vx: (Math.random() - 0.5) * 6, vy: Math.random() * 2.5, life: 1 + Math.random(), max: 2, k}); }
function confetti(x, y, n) { if (reduced()) return; const cols = [ACID, '#ffffff', '#ffb347', '#7fd6ff']; for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI, sp = 6 + Math.random() * 14; app.parts.push({x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp + 4, life: 1.6 + Math.random(), max: 2.6, k: 'conf', col: cols[i % 4], r: Math.random() * 6}); } }
function juice(dt, real) {
  const s = app.s, w = app.w, red = reduced();
  app.rotor += real * (s.done && !s.ok ? 0 : 18 + s.c * 6);
  const tf = app.keys.r ? 1 : app.keys.l ? -1 : 0; if (tf) app.face = tf; app.faceT += (app.face - app.faceT) * Math.min(1, real * 6);
  // Downwash: dust, spray or leaves blown out from under the rotor.
  const hc = heliClear(w, s), near = !s.done ? s.c * Math.max(0, 1 - hc / 32) : 0;
  if (near > 0.02 && !red && dt > 0) { const sup = supportTop(w, s.x - 3, s.x + 3, s.y - HELI.skid), water = ground(w, s.x) < 0 && sup < 0, tree = w.solids.some(o => o.k === 'tree' && Math.abs(o.top - sup) < 0.01);
    const k = water ? 'spray' : tree ? 'leaf' : w.level.scene === 'town' && sup > 1 ? 'grit' : 'dust', n = Math.round(near * 9);
    for (let i = 0; i < n; i++) { const dir = Math.random() < 0.5 ? -1 : 1, sp = (8 + Math.random() * 16) * (0.4 + near); app.parts.push({x: s.x + dir * Math.random() * 4, y: (water ? 0 : sup) + 0.2, vx: dir * sp + wind(w, 2, s.t) * 0.5, vy: Math.random() * 3 * near + (k === 'leaf' ? 2 : 0), life: 0.8 + Math.random() * 1.2, max: 2, k, r: Math.random() * 6}); } }
  // Fire, smoke and steam.
  if (w.fire && s.fire > 0 && dt > 0 && !red) { const f = w.fire; for (let i = 0; i < Math.round(3 * s.fire) + 1; i++) app.parts.push({x: f.x0 + Math.random() * (f.x1 - f.x0), y: 0.5, vx: wind(w, 5, s.t) * 0.3, vy: 3 + Math.random() * 4, life: 0.6 + Math.random() * 0.5, max: 1.1, k: 'flame'});
    if (Math.random() < 0.35) app.parts.push({x: f.x0 + Math.random() * (f.x1 - f.x0), y: 4 + 6 * s.fire, vx: wind(w, 20, s.t) * 0.8, vy: 3 + Math.random() * 2, life: 4 + Math.random() * 3, max: 7, k: 'smoke', r: 2 + Math.random() * 2}); }
  for (const p of app.parts) { p.life -= dt; const drag = p.k === 'dust' || p.k === 'grit' || p.k === 'spray' ? 0.94 : p.k === 'conf' ? 0.985 : p.k === 'smoke' ? 0.999 : 0.99; p.vx *= drag ** (dt * 60); p.vy *= drag ** (dt * 60);
    if (p.k === 'spray' || p.k === 'conf' || p.k === 'spark') p.vy -= (p.k === 'conf' ? 5 : 9.8) * dt; if (p.k === 'dust' || p.k === 'grit') p.vy += 0.6 * dt; if (p.k === 'leaf') { p.vy -= 1.5 * dt; p.vx += Math.sin(p.life * 6 + p.r) * 0.3; } if (p.k === 'steam' || p.k === 'smoke') { p.vy += 0.5 * dt; p.vx += (wind(w, 10, s.t) - p.vx) * 0.3 * dt; }
    p.x += p.vx * dt; p.y += p.vy * dt; if ((p.k === 'conf' || p.k === 'spark') && p.y < ground(w, p.x)) { p.y = ground(w, p.x); p.vy *= -0.3; p.vx *= 0.6; } }
  app.parts = app.parts.filter(p => p.life > 0); if (app.parts.length > 1400) app.parts.splice(0, app.parts.length - 1400);
  for (const f of app.floats) f.t += real; app.floats = app.floats.filter(f => f.t < 1.6);
  if (app.banner) { app.banner.t += real; if (app.banner.t > 2.6) app.banner = null; }
  app.shake = red ? 0 : Math.max(0, app.shake - real * 14); app.flash = Math.max(0, app.flash - real * 2);
}
function makeClouds(seed) { let a = seed % 9973 + 1; const r = () => (a = (a * 16807) % 2147483647) / 2147483647; return Array.from({length: 14}, () => ({x: r() * 2400, y: 0.08 + r() * 0.3, w: 80 + r() * 160, h: 18 + r() * 26, p: 0.05 + r() * 0.12})); }
const SKY = {morning: ['#5c8fc4', '#a9cbe3', '#f3e2c4'], day: ['#3d7cc0', '#8fc0e6', '#dcefff'], golden: ['#4d6fa0', '#e8b27a', '#ffd9a0'], dusk: ['#2a2d5c', '#b4577a', '#f3a463']};
const SUN = {morning: [0.18, 0.62, '#fff2cf'], day: [0.82, 0.16, '#fffbe8'], golden: [0.75, 0.55, '#ffe2a6'], dusk: [0.3, 0.74, '#ffc27a']};
const GRASS = {morning: ['#6f9a52', '#3e5a2d'], day: ['#77a456', '#3f5f2e'], golden: ['#8b9a4e', '#4a4f28'], dusk: ['#4f5a44', '#262b22']};
// Camera: zoom to keep the helicopter, the load and the ground in shot, and lean towards the goal.
function goalX() { const s = app.s, w = app.w, t = task(); return w.fire ? (s.phase === 'fill' ? (w.water[0].x0 + w.water[0].x1) / 2 : (w.fire.x0 + w.fire.x1) / 2) : t ? (s.carry === t.item ? t.zone.x : s.items[t.item].x) : s.x; }
function camTarget() {
  const c = $('sky'), W = c.width, H = c.height, s = app.s; let scale = Math.max(2.4, Math.min(9, (H - 90) / (s.y + 16))); if (s.done && s.ok) scale = Math.min(10, scale * 1.25);
  const vw = W / scale, gx = goalX(), d = gx - s.x; const x = Math.abs(d) < vw * 0.7 ? s.x + d * 0.5 : s.x + Math.sign(d) * vw * 0.22; return {x, scale};
}
function draw() {
  const c = $('sky'), x = c.getContext('2d'), W = c.width, H = c.height, s = app.s, w = app.w, L = w.level, sky = L.sky || 'day';
  const ct = camTarget(), cam = app.cam; cam.scale *= Math.pow(ct.scale / cam.scale, 0.06); cam.x += (ct.x - cam.x) * 0.08; const k = cam.scale;
  const sh = app.shake, ox = W / 2 + (Math.random() - 0.5) * sh, base = H - 46 + (Math.random() - 0.5) * sh;
  const X = v => ox + (v - cam.x) * k, Y = v => base - v * k, x0 = cam.x - W / 2 / k - 20, x1 = cam.x + W / 2 / k + 20;
  // Sky, sun, clouds
  const sk = SKY[sky], g = x.createLinearGradient(0, 0, 0, base); g.addColorStop(0, sk[0]); g.addColorStop(0.65, sk[1]); g.addColorStop(1, sk[2]); x.fillStyle = g; x.fillRect(0, 0, W, H);
  const sun = SUN[sky], sg = x.createRadialGradient(W * sun[0], H * sun[1], 4, W * sun[0], H * sun[1], 140); sg.addColorStop(0, sun[2]); sg.addColorStop(0.12, sun[2] + 'cc'); sg.addColorStop(1, 'rgba(255,230,180,0)'); x.fillStyle = sg; x.fillRect(0, 0, W, H);
  const cc = sky === 'dusk' ? '255,190,180' : sky === 'golden' ? '255,236,210' : '255,255,255';
  for (const cl of app.clouds) { const px = ((cl.x - cam.x * cl.p * 3 + s.t * 2) % 2400 + 2400) % 2400 - 300, py = H * cl.y; x.fillStyle = `rgba(${cc},.55)`; x.beginPath(); x.ellipse(px, py, cl.w / 2, cl.h / 2, 0, 0, 7); x.ellipse(px - cl.w * 0.25, py + cl.h * 0.15, cl.w / 3, cl.h / 2.3, 0, 0, 7); x.ellipse(px + cl.w * 0.22, py - cl.h * 0.1, cl.w / 3.4, cl.h / 1.9, 0, 0, 7); x.fill(); }
  hills(x, W, base, cam.x, 0.12, 70, sky === 'dusk' ? '#5b4a72' : sky === 'golden' ? '#9a8a86' : '#8fa6bd', 1);
  if (L.scene === 'town') skyline(x, W, base, cam.x, sky); else hills(x, W, base, cam.x, 0.3, 40, sky === 'dusk' ? '#3b3a4c' : sky === 'golden' ? '#6b7350' : '#6a8a68', L.scene === 'forest' || L.scene === 'fire' ? 2 : 0);
  if (w.fire && s.fire > 0) { const hz = x.createLinearGradient(0, 0, 0, base); hz.addColorStop(0, 'rgba(90,70,60,0)'); hz.addColorStop(1, `rgba(120,90,70,${0.25 * s.fire})`); x.fillStyle = hz; x.fillRect(0, 0, W, base); }
  // Ground and water
  const gr = GRASS[sky], step = Math.max(0.5, 2 / k);
  const gg = x.createLinearGradient(0, Y(0), 0, H); gg.addColorStop(0, gr[0]); gg.addColorStop(0.1, gr[1]); gg.addColorStop(1, '#2a2418'); x.fillStyle = gg; x.fillRect(0, Y(0), W, H - Y(0));
  x.fillStyle = 'rgba(255,255,255,.08)'; x.fillRect(0, Y(0), W, 2);
  for (const q of w.water) { if (q.x1 < x0 || q.x0 > x1) continue; x.fillStyle = '#3a3226'; x.fillRect(X(q.x0), Y(0), (q.x1 - q.x0) * k, H); const wg = x.createLinearGradient(0, Y(0), 0, Y(-q.depth)); wg.addColorStop(0, sky === 'dusk' ? '#56649a' : '#5a9ccc'); wg.addColorStop(1, '#173a55'); x.fillStyle = wg; x.fillRect(X(q.x0), Y(0), (q.x1 - q.x0) * k, q.depth * k);
    x.strokeStyle = 'rgba(255,255,255,.4)'; x.lineWidth = 1; x.beginPath(); for (let m = q.x0; m <= q.x1; m += step * 2) x.lineTo(X(m), Y(Math.sin(m * 0.6 + s.t * 2) * 0.08)); x.stroke(); }
  // Downwash ring on the ground or the water
  const hc = heliClear(w, s), near = !s.done ? s.c * Math.max(0, 1 - hc / 32) : 0;
  if (near > 0.05) { const sup = supportTop(w, s.x - 3, s.x + 3, s.y - HELI.skid), wy = ground(w, s.x) < 0 && sup < 0 ? 0 : sup; for (let i = 0; i < 3; i++) { const ph = (s.t * 1.6 + i / 3) % 1; x.strokeStyle = `rgba(255,255,255,${(1 - ph) * near * 0.5})`; x.lineWidth = 1.5; x.beginPath(); x.ellipse(X(s.x), Y(wy), (2 + ph * 12) * k, Math.max(1, 0.6 * k), 0, 0, 7); x.stroke(); }
    x.fillStyle = `rgba(0,0,0,${0.12 * near})`; x.beginPath(); x.ellipse(X(s.x), Y(wy), 9 * k, 0.8 * k, 0, 0, 7); x.fill(); }
  scenery(x, X, Y, k, x0, x1, base);
  // Solids
  for (const o of w.solids) { if (o.x1 < x0 || o.x0 > x1) continue; solid(x, X, Y, k, o, sky); }
  // Target zone with a guide beam and a ghost of the load
  zone(x, X, Y, k, H);
  // Fire
  if (w.fire) { const f = w.fire; x.fillStyle = `rgba(30,20,15,.6)`; x.fillRect(X(f.x0 - 2), Y(0) - 2, (f.x1 - f.x0 + 4) * k, 4); }
  // Particles behind the load
  drawParts(x, X, Y, k, p => p.k === 'smoke' || p.k === 'flame');
  // Drop guide: a dashed line from the load to the ground with a shadow, green when it's over the target
  const e = endOf(s), t = task();
  if (!s.done) { const b = e.y - e.h / 2, sup = supportTop(w, e.x - e.w / 2, e.x + e.w / 2, b), over = t && s.carry === t.item && Math.abs(e.x - t.zone.x) <= t.zone.half;
    if (b - sup > 0.4) { x.strokeStyle = over ? 'rgba(214,255,0,.9)' : 'rgba(255,255,255,.55)'; x.setLineDash([4, 5]); x.lineWidth = 1.5; x.beginPath(); x.moveTo(X(e.x), Y(b)); x.lineTo(X(e.x), Y(sup)); x.stroke(); x.setLineDash([]); }
    const sa = Math.max(0.15, 0.45 - (b - sup) / 60); x.fillStyle = `rgba(0,0,0,${sa})`; x.beginPath(); x.ellipse(X(e.x), Y(sup) + 1, (e.w / 2 + Math.min(4, (b - sup) * 0.06)) * k, Math.max(1.5, 0.4 * k), 0, 0, 7); x.fill(); }
  // Loads
  for (const it of s.items) load(x, X, Y, k, it);
  // Rope and hook
  rope(x, X, Y, k);
  // Water drops
  x.fillStyle = 'rgba(170,220,255,.8)'; for (const d of s.drops) x.fillRect(X(d.x) - 1, Y(d.y) - 2, Math.max(1.5, 0.25 * k), Math.max(3, 0.5 * k));
  if (s.dumping) { const b = s.items[0]; x.fillStyle = 'rgba(170,220,255,.5)'; x.fillRect(X(b.x) - 0.6 * k, Y(b.y - b.h / 2), 1.2 * k, 6 * k); }
  // The helicopter
  heli(x, X, Y, k);
  drawParts(x, X, Y, k, p => !(p.k === 'smoke' || p.k === 'flame'));
  // Wind streaks
  const wx = wind(w, s.y, s.t); if (Math.abs(wx) > 2 && !reduced()) { x.strokeStyle = 'rgba(255,255,255,.18)'; x.lineWidth = 1; x.beginPath(); for (let i = 0; i < 24; i++) { const sx = ((i * 173 + s.t * wx * 22 - cam.x * k * 0.2) % W + W) % W, sy = (i * 61) % (base - 20); x.moveTo(sx, sy); x.lineTo(sx + wx * 4, sy); } x.stroke(); }
  for (const f of app.floats) { x.globalAlpha = Math.max(0, 1 - f.t / 1.6); x.fillStyle = f.col; x.font = 'bold 15px ui-monospace,monospace'; x.textAlign = 'center'; x.fillText(f.text, X(f.x), Y(f.y + f.t * 3)); } x.globalAlpha = 1;
  if (!app.photo) overlays(x, W, H, X, Y, k, base);
}
function hills(x, W, base, cx, p, amp, col, trees) {
  x.fillStyle = col; x.beginPath(); x.moveTo(0, base); for (let sx = 0; sx <= W + 8; sx += 8) { const u = sx + cx * p * 6; x.lineTo(sx, base - 10 - amp * (0.5 + 0.3 * Math.sin(u * 0.004) + 0.2 * Math.sin(u * 0.011 + 1))); } x.lineTo(W, base); x.fill();
  if (trees) { x.fillStyle = trees === 2 ? 'rgba(30,50,32,.55)' : 'rgba(30,50,32,.4)'; for (let i = 0; i < 70; i++) { const sx = ((i * 37 - cx * p * 6) % (W + 40) + W + 40) % (W + 40) - 20, u = sx + cx * p * 6, top = base - 10 - amp * (0.5 + 0.3 * Math.sin(u * 0.004) + 0.2 * Math.sin(u * 0.011 + 1)); x.beginPath(); x.moveTo(sx - 6, top + 14); x.lineTo(sx, top - 10 - (i % 3) * 4); x.lineTo(sx + 6, top + 14); x.fill(); } }
}
function skyline(x, W, base, cx, sky) { const col = sky === 'dusk' ? '#3a3550' : '#7d8ea3'; for (let i = 0; i < 40; i++) { const bw = 30 + (i * 37) % 40, bh = 40 + (i * 53) % 90, sx = ((i * 61 - cx * 0.35 * 6) % (W + 100) + W + 100) % (W + 100) - 50; x.fillStyle = col; x.fillRect(sx, base - bh, bw, bh); if (sky === 'dusk') { x.fillStyle = 'rgba(255,220,140,.5)'; for (let j = 0; j < 6; j++) x.fillRect(sx + 4 + (j * 7) % (bw - 6), base - bh + 6 + j * 11, 2, 3); } } }
function scenery(x, X, Y, k, x0, x1) {
  const w = app.w, s = app.s, L = w.level; x.lineWidth = Math.max(1, 0.15 * k);
  // Windsock near the start
  const wx = wind(w, 6, s.t), sx = X(-24); if (-24 > x0 && -24 < x1) { x.strokeStyle = '#ddd'; x.beginPath(); x.moveTo(sx, Y(0)); x.lineTo(sx, Y(6)); x.stroke(); const a = Math.max(-1.3, Math.min(1.3, wx * 0.18)), len = 3 * k * Math.min(1, 0.4 + Math.abs(wx) / 8); x.save(); x.translate(sx, Y(6)); x.rotate(Math.sign(wx || 1) * (Math.PI / 2 - Math.abs(a)) * 0 + (wx >= 0 ? 0 : Math.PI)); x.fillStyle = '#ff7a2e'; x.beginPath(); x.moveTo(0, -0.4 * k); x.lineTo(len, -0.2 * k + (1.3 - Math.abs(a)) * 0.9 * k); x.lineTo(len, 0.2 * k + (1.3 - Math.abs(a)) * 0.9 * k); x.lineTo(0, 0.4 * k); x.fill(); x.restore(); }
  // Home pad at the start
  if (L.scene === 'yard' || L.scene === 'town') { x.fillStyle = '#9a9c94'; x.fillRect(X(-10), Y(0) - 2, 20 * k, 3); }
  if (L.scene === 'yard') { x.strokeStyle = 'rgba(80,70,50,.6)'; x.beginPath(); for (let m = Math.ceil(x0 / 4) * 4; m < x1; m += 4) { x.moveTo(X(m), Y(0)); x.lineTo(X(m), Y(1.3)); } x.moveTo(X(x0), Y(1.1)); x.lineTo(X(x1), Y(1.1)); x.stroke(); }
}
function solid(x, X, Y, k, o, sky) {
  const s = app.s, dusk = sky === 'dusk';
  if (o.k === 'tree') { const cx = (o.x0 + o.x1) / 2, d = cx - s.x, wash = s.c * Math.max(0, 1 - Math.abs(d) / 22) * Math.max(0, 1 - (s.y - o.top) / 30), sway = (Math.sin(s.t * 1.7 + cx) * 0.15 + wind(app.w, o.top, s.t) * 0.05 + Math.sign(d) * wash * 1.6) * k;
    x.fillStyle = '#4a3423'; x.fillRect(X(cx - 0.4), Y(o.top * 0.45), 0.8 * k, o.top * 0.45 * k);
    const cols = dusk ? ['#24372a', '#2f4634', '#3b573f'] : ['#2f5a33', '#3d7040', '#4f8a4c'];
    for (let i = 0; i < 3; i++) { const yb = o.top * (0.3 + i * 0.22), yt = o.top * (0.62 + i * 0.19), hw = (o.x1 - o.x0) / 2 * (1 - i * 0.22); x.fillStyle = cols[i]; x.beginPath(); x.moveTo(X(cx - hw), Y(yb)); x.lineTo(X(cx) + sway * (0.4 + i * 0.3), Y(yt)); x.lineTo(X(cx + hw), Y(yb)); x.fill(); } return; }
  const px = X(o.x0), py = Y(o.top), pw = (o.x1 - o.x0) * k, ph = (o.top - o.bottom) * k;
  if (o.k === 'container') { x.fillStyle = ['#b8452e', '#2e6c9e', '#3f8a5a'][Math.abs(Math.round(o.x0)) % 3]; x.fillRect(px, py, pw, ph); x.strokeStyle = 'rgba(0,0,0,.25)'; x.lineWidth = 1; x.beginPath(); for (let m = o.x0 + 0.6; m < o.x1; m += 0.6) { x.moveTo(X(m), py); x.lineTo(X(m), py + ph); } x.stroke(); x.fillStyle = 'rgba(255,255,255,.12)'; x.fillRect(px, py, pw, 0.3 * k); return; }
  if (o.k === 'pier') { const pg = x.createLinearGradient(px, 0, px + pw, 0); pg.addColorStop(0, '#8d8b84'); pg.addColorStop(1, '#5f5d58'); x.fillStyle = pg; x.fillRect(px, py, pw, Y(-6) - py); x.fillStyle = '#a7a59d'; x.fillRect(px - 0.5 * k, py, pw + k, 0.8 * k); x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(px, Y(0.3), pw, 0.6 * k); return; }
  // building
  x.fillStyle = dusk ? '#4c4a57' : ['#b9a58b', '#9a9ea6', '#c4b8a5'][Math.abs(Math.round(o.x0)) % 3]; x.fillRect(px, py, pw, ph);
  x.fillStyle = dusk ? '#38363f' : 'rgba(0,0,0,.18)'; x.fillRect(px - 0.4 * k, py - 0.8 * k, pw + 0.8 * k, 0.8 * k);
  for (let fy = o.top - 3.2; fy > 1; fy -= 3.4) for (let fx = o.x0 + 1.5; fx < o.x1 - 1.4; fx += 3) { const lit = dusk && ((fx * 7 + fy * 3) | 0) % 3 === 0; x.fillStyle = lit ? '#ffd987' : dusk ? '#2c2b34' : 'rgba(40,60,80,.55)'; x.fillRect(X(fx), Y(fy), 1.4 * k, 1.8 * k); }
  if (o.roof) { x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(px + 2 * k, py - 1.6 * k, 2 * k, 0.8 * k); }
}
function zone(x, X, Y, k, H) {
  const s = app.s, w = app.w, t = task(); let zx, zy, half, it;
  if (w.fire) { if (s.phase === 'fill') { const q = w.water[0]; zx = (q.x0 + q.x1) / 2; zy = 0; half = (q.x1 - q.x0) / 2 - 3; } else { zx = (w.fire.x0 + w.fire.x1) / 2; zy = 0; half = (w.fire.x1 - w.fire.x0) / 2; } }
  else if (t) { zx = t.zone.x; zy = t.zone.y; half = t.zone.half; it = s.items[t.item]; if (s.carry !== t.item && !s.done) { const ix = it.x; const p = 0.5 + 0.5 * Math.sin(s.t * 5); x.strokeStyle = `rgba(214,255,0,${0.5 + 0.5 * p})`; x.lineWidth = 2; x.beginPath(); x.moveTo(X(ix) - 7, Y(it.y + it.h / 2 + 3.2)); x.lineTo(X(ix), Y(it.y + it.h / 2 + 1.4)); x.lineTo(X(ix) + 7, Y(it.y + it.h / 2 + 3.2)); x.stroke(); } }
  else return;
  const p = 0.5 + 0.5 * Math.sin(s.t * 4), e = endOf(s), over = Math.abs(e.x - zx) <= half;
  const bg = x.createLinearGradient(0, Y(zy + 40), 0, Y(zy)); bg.addColorStop(0, 'rgba(214,255,0,0)'); bg.addColorStop(1, `rgba(214,255,0,${over ? 0.28 : 0.12 + 0.06 * p})`); x.fillStyle = bg; x.fillRect(X(zx - half), Y(zy + 40), half * 2 * k, 40 * k);
  x.strokeStyle = ACID; x.lineWidth = Math.max(2, 0.25 * k); const b = 1.2 * k; x.beginPath(); x.moveTo(X(zx - half), Y(zy) - b); x.lineTo(X(zx - half), Y(zy)); x.lineTo(X(zx - half) + b, Y(zy)); x.moveTo(X(zx + half), Y(zy) - b); x.lineTo(X(zx + half), Y(zy)); x.lineTo(X(zx + half) - b, Y(zy)); x.stroke();
  x.fillStyle = ACID; x.fillRect(X(zx) - 1.5, Y(zy) - 0.8 * k, 3, 0.8 * k);
  if (it && !s.done) { x.strokeStyle = `rgba(214,255,0,${0.35 + 0.3 * p})`; x.setLineDash([5, 4]); x.lineWidth = 1.5; x.strokeRect(X(zx - it.w / 2), Y(zy + it.h), it.w * k, it.h * k); x.setLineDash([]); }
  if (X(zx) < 0 || X(zx) > x.canvas.width) { const right = X(zx) > x.canvas.width; x.fillStyle = ACID; x.font = 'bold 13px ui-monospace,monospace'; x.textAlign = right ? 'right' : 'left'; x.fillText(`${right ? '' : '◀ '}${w.fire ? (s.phase === 'fill' ? 'LAKE' : 'FIRE') : s.carry === t?.item ? 'TARGET' : 'LOAD'} ${Math.abs(zx - s.x).toFixed(0)} m${right ? ' ▶' : ''}`, right ? x.canvas.width - 14 : 14, H * 0.55); }
}
function load(x, X, Y, k, it) {
  const s = app.s, cx = X(it.x), top = Y(it.y + it.h / 2), lw = it.w * k, lh = it.h * k, l = cx - lw / 2;
  if (it.kind === 'crate') { x.fillStyle = '#a7773f'; x.fillRect(l, top, lw, lh); x.strokeStyle = '#6e4b22'; x.lineWidth = Math.max(1, 0.18 * k); x.strokeRect(l, top, lw, lh); x.beginPath(); x.moveTo(l, top); x.lineTo(l + lw, top + lh); x.moveTo(l, top + lh / 3); x.lineTo(l + lw, top + lh / 3); x.moveTo(l, top + 2 * lh / 3); x.lineTo(l + lw, top + 2 * lh / 3); x.stroke();
    if (k > 3) { x.fillStyle = 'rgba(30,20,10,.6)'; x.font = `bold ${Math.round(0.5 * k)}px ui-monospace,monospace`; x.textAlign = 'center'; x.fillText('DEXM', cx, top + lh * 0.6); } }
  else if (it.kind === 'ac') { x.fillStyle = '#d6d9d6'; x.fillRect(l, top, lw, lh); x.fillStyle = '#9aa09c'; x.fillRect(l, top + lh - 0.25 * k, lw, 0.25 * k); x.strokeStyle = '#7c827e'; x.lineWidth = 1; x.beginPath(); x.arc(cx + lw * 0.18, top + lh * 0.5, lh * 0.32, 0, 7); x.stroke(); const a = s.t * 3; for (let i = 0; i < 3; i++) { x.beginPath(); x.moveTo(cx + lw * 0.18, top + lh * 0.5); x.lineTo(cx + lw * 0.18 + Math.cos(a + i * 2.1) * lh * 0.28, top + lh * 0.5 + Math.sin(a + i * 2.1) * lh * 0.28); x.stroke(); }
    x.beginPath(); for (let i = 1; i < 5; i++) { x.moveTo(l + lw * 0.06, top + lh * i / 5); x.lineTo(l + lw * 0.42, top + lh * i / 5); } x.stroke(); }
  else if (it.kind === 'log') { x.fillStyle = '#6b4a2e'; x.beginPath(); x.roundRect?.(l, top, lw, lh, lh / 2) ?? x.rect(l, top, lw, lh); x.fill(); x.strokeStyle = 'rgba(30,18,8,.5)'; x.lineWidth = 1; x.beginPath(); for (let i = 1; i < 8; i++) { x.moveTo(l + lw * i / 8, top + lh * 0.2); x.lineTo(l + lw * (i + 0.6) / 8, top + lh * 0.8); } x.stroke(); x.fillStyle = '#c99c62'; x.beginPath(); x.ellipse(l + lw - lh * 0.25, top + lh / 2, lh * 0.25, lh * 0.48, 0, 0, 7); x.fill(); x.strokeStyle = '#8d6738'; x.beginPath(); x.ellipse(l + lw - lh * 0.25, top + lh / 2, lh * 0.12, lh * 0.25, 0, 0, 7); x.stroke(); }
  else if (it.kind === 'bridge') { x.fillStyle = '#c4532f'; x.fillRect(l, top + lh * 0.75, lw, lh * 0.25); x.fillRect(l, top, lw, lh * 0.15); x.strokeStyle = '#c4532f'; x.lineWidth = Math.max(1.5, 0.22 * k); x.beginPath(); const n = 10; for (let i = 0; i <= n; i++) { const px = l + lw * i / n; x.moveTo(px, top); x.lineTo(px, top + lh); if (i < n) { x.moveTo(px, i % 2 ? top : top + lh); x.lineTo(px + lw / n, i % 2 ? top + lh : top); } } x.stroke(); }
  else if (it.kind === 'bucket') { const wt = s.water; x.fillStyle = '#e8762d'; x.beginPath(); x.moveTo(l, top); x.lineTo(l + lw, top); x.lineTo(l + lw * 0.82, top + lh); x.lineTo(l + lw * 0.18, top + lh); x.fill(); if (wt > 0) { x.fillStyle = 'rgba(120,190,240,.85)'; x.fillRect(l + lw * 0.1, top + lh * (1 - wt * 0.85), lw * 0.8, Math.max(1, lh * wt * 0.85 - 1)); }
    x.strokeStyle = '#7a3a14'; x.lineWidth = 1; x.beginPath(); x.moveTo(l, top); x.lineTo(cx, top - 0.9 * k); x.lineTo(l + lw, top); x.stroke(); x.fillStyle = '#222'; x.fillRect(l, top - 1, lw, Math.max(2, 0.18 * k)); }
}
function rope(x, X, Y, k) {
  const s = app.s, w = app.w, e = endOf(s), ax = X(s.x), ay = Y(s.y - HELI.attach), hx = X(s.hook.x), hy = Y(s.carry >= 0 ? e.y + e.h / 2 + 0.6 : s.hook.y);
  const d = Math.hypot(s.hook.x - s.x, s.hook.y - (s.y - HELI.attach)), slack = s.tension <= 0 && d < w.rope - 0.2;
  x.strokeStyle = '#222'; x.lineWidth = Math.max(1.3, 0.12 * k); x.beginPath(); x.moveTo(ax, ay); if (slack) { const sag = Math.min(6, (w.rope - d) * 0.8) * k; x.quadraticCurveTo((ax + hx) / 2 + sag * 0.3, (ay + hy) / 2 + sag, hx, hy); } else x.lineTo(hx, hy); x.stroke();
  if (s.carry >= 0 && e.kind !== 'bucket') { x.lineWidth = Math.max(1, 0.08 * k); x.strokeStyle = '#444'; x.beginPath(); x.moveTo(hx, hy); x.lineTo(X(e.x - e.w * 0.42), Y(e.y + e.h / 2)); x.moveTo(hx, hy); x.lineTo(X(e.x + e.w * 0.42), Y(e.y + e.h / 2)); x.stroke(); }
  x.fillStyle = s.carry >= 0 ? '#ffcc33' : ACID; x.beginPath(); x.arc(hx, hy, Math.max(2.5, 0.35 * k), 0, 7); x.fill();
}
function heli(x, X, Y, k) {
  const s = app.s, hx = X(s.x), hy = Y(s.y); if (s.done && !s.ok && s.fault && s.fault.k !== 'broken' && s.fault.k !== 'lost' && s.fault.k !== 'range' && s.fault.k !== 'fuel') return wreck(x, hx, hy, k);
  x.save(); x.translate(hx, hy); x.rotate(s.th); x.scale(app.faceT, 1); const m = k, P = (a, b) => [a * m, -b * m];
  // tail boom and fin
  x.fillStyle = '#2a2f2c'; x.beginPath(); x.moveTo(...P(-3.5, 1.6)); x.lineTo(...P(-12.5, 1.2)); x.lineTo(...P(-12.5, 0.5)); x.lineTo(...P(-3.5, -0.4)); x.fill();
  x.beginPath(); x.moveTo(...P(-11.6, 1.1)); x.lineTo(...P(-13.4, 3.6)); x.lineTo(...P(-12.6, 3.6)); x.lineTo(...P(-11.2, 1.1)); x.fill();
  x.fillStyle = ACID; x.fillRect(...P(-12, 1.15), 7 * m, 0.25 * m);
  // tail rotor
  const tr = app.rotor * 2.7; x.strokeStyle = 'rgba(30,30,30,.7)'; x.lineWidth = Math.max(1, 0.18 * m); x.beginPath(); for (let i = 0; i < 2; i++) { const a = tr + i * Math.PI / 2; x.moveTo(...P(-13 + Math.cos(a) * 1.5, 2.6 + Math.sin(a) * 1.5)); x.lineTo(...P(-13 - Math.cos(a) * 1.5, 2.6 - Math.sin(a) * 1.5)); } x.stroke();
  x.fillStyle = 'rgba(60,60,60,.18)'; x.beginPath(); x.arc(...P(-13, 2.6), 1.5 * m, 0, 7); x.fill();
  // cabin body
  const bg = x.createLinearGradient(0, -2.4 * m, 0, 1 * m); bg.addColorStop(0, '#3b423d'); bg.addColorStop(1, '#1d211f'); x.fillStyle = bg;
  x.beginPath(); x.moveTo(...P(-4.2, 1.9)); x.lineTo(...P(4.2, 1.9)); x.quadraticCurveTo(...P(7.6, 1.6), ...P(7.4, -0.2)); x.quadraticCurveTo(...P(6.8, -1.6), ...P(4.6, -1.7)); x.lineTo(...P(-3.8, -1.4)); x.quadraticCurveTo(...P(-4.8, 0), ...P(-4.2, 1.9)); x.fill();
  // glass
  x.fillStyle = 'rgba(150,200,230,.75)'; x.beginPath(); x.moveTo(...P(4.4, 1.6)); x.quadraticCurveTo(...P(7.1, 1.3), ...P(7, -0.1)); x.lineTo(...P(4.4, -0.2)); x.closePath(); x.fill(); x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(...P(5, 1.3), 0.9 * m, 0.4 * m);
  x.fillStyle = 'rgba(150,200,230,.5)'; x.fillRect(...P(1, 1.2), 1.6 * m, 1.1 * m); x.fillRect(...P(-1.6, 1.2), 1.6 * m, 1.1 * m);
  // stripe and name
  x.fillStyle = ACID; x.fillRect(...P(-4, 0), 8.6 * m, 0.35 * m); if (m > 3.5) { x.fillStyle = ACID; x.font = `900 ${Math.round(0.7 * m)}px Arial Black,Arial,sans-serif`; x.textAlign = 'left'; x.fillText('DEXM', ...P(-3.4, -1)); }
  // engine housing and mast
  x.fillStyle = '#2f3532'; x.beginPath(); x.moveTo(...P(-2.6, 1.9)); x.lineTo(...P(2.8, 1.9)); x.lineTo(...P(2.2, 2.7)); x.lineTo(...P(-2.2, 2.7)); x.fill(); x.fillStyle = '#111'; x.fillRect(...P(-0.25, 3.1), 0.5 * m, 0.5 * m);
  // skids
  x.strokeStyle = '#151816'; x.lineWidth = Math.max(1.5, 0.22 * m); x.beginPath(); x.moveTo(...P(-2.6, -1.4)); x.lineTo(...P(-3, -2.4)); x.moveTo(...P(2.6, -1.6)); x.lineTo(...P(3, -2.4)); x.moveTo(...P(-4.2, -2.4)); x.lineTo(...P(4.6, -2.4)); x.quadraticCurveTo(...P(5.4, -2.4), ...P(5.6, -1.9)); x.stroke();
  // hook point
  x.fillStyle = '#111'; x.fillRect(...P(-0.3, -1.6), 0.6 * m, 0.4 * m);
  // nav lights
  const on = Math.floor(s.t * 1.4) % 2 === 0; x.fillStyle = on ? '#ff3b2f' : '#5a1410'; x.beginPath(); x.arc(...P(0, 2.9), Math.max(1.5, 0.22 * m), 0, 7); x.fill(); x.fillStyle = '#7dff8c'; x.beginPath(); x.arc(...P(-13.3, 3.6), Math.max(1, 0.15 * m), 0, 7); x.fill();
  // main rotor: a blur disc and six blades seen edge on
  const R = HELI.rotorR; x.fillStyle = 'rgba(30,30,30,.16)'; x.beginPath(); x.ellipse(0, -3.4 * m, R * m, 0.55 * m, 0, 0, 7); x.fill();
  x.strokeStyle = 'rgba(20,20,20,.6)'; x.lineWidth = Math.max(1, 0.16 * m); x.beginPath(); for (let i = 0; i < 6; i++) { const a = app.rotor + i * Math.PI / 3, c = Math.cos(a), sn = Math.sin(a); x.moveTo(0, -3.4 * m); x.lineTo(c * R * m, -3.4 * m + sn * 0.35 * m); } x.stroke();
  x.restore();
}
function wreck(x, hx, hy, k) { x.fillStyle = '#1a1a1a'; x.save(); x.translate(hx, hy + 1.5 * k); x.rotate(0.5); x.fillRect(-4 * k, -1.5 * k, 8 * k, 3 * k); x.restore(); }
function drawParts(x, X, Y, k, which) {
  for (const p of app.parts) { if (!which(p)) continue; const px = X(p.x), py = Y(p.y), f = p.life / p.max; if (px < -30 || px > x.canvas.width + 30 || py < -30 || py > x.canvas.height + 30) continue;
    if (p.k === 'dust') { x.fillStyle = `rgba(196,170,120,${0.45 * f})`; const r = Math.max(2, (1.4 - f) * 1.3 * k); x.beginPath(); x.arc(px, py, r, 0, 7); x.fill(); }
    else if (p.k === 'grit') { x.fillStyle = `rgba(180,180,180,${0.45 * f})`; const r = Math.max(1.5, (1.4 - f) * 1 * k); x.beginPath(); x.arc(px, py, r, 0, 7); x.fill(); }
    else if (p.k === 'spray') { x.fillStyle = `rgba(235,248,255,${0.6 * f})`; const r = Math.max(1.5, (1.3 - f) * 0.9 * k); x.beginPath(); x.arc(px, py, r, 0, 7); x.fill(); }
    else if (p.k === 'leaf') { x.fillStyle = `rgba(90,140,60,${f})`; x.save(); x.translate(px, py); x.rotate(p.life * 5 + p.r); x.fillRect(-2, -1, 4, 2); x.restore(); }
    else if (p.k === 'flame') { const r = Math.max(2, (0.5 + f) * 0.9 * k), fg = x.createRadialGradient(px, py, 0, px, py, r * 1.6); fg.addColorStop(0, `rgba(255,${200 + Math.round(50 * f)},120,${0.9 * f})`); fg.addColorStop(0.5, `rgba(255,${90 + Math.round(80 * f)},30,${0.6 * f})`); fg.addColorStop(1, 'rgba(200,40,10,0)');
      x.globalCompositeOperation = 'lighter'; x.fillStyle = fg; x.beginPath(); x.moveTo(px - r, py); x.quadraticCurveTo(px - r * 0.6, py - r * 2.4 * f, px + Math.sin(p.life * 20) * r * 0.3, py - r * 3 * f); x.quadraticCurveTo(px + r * 0.6, py - r * 2.4 * f, px + r, py); x.arc(px, py, r, 0, Math.PI); x.fill(); x.globalCompositeOperation = 'source-over'; }
    else if (p.k === 'smoke') { const a = 0.22 * Math.min(1, f * 1.5) * Math.min(1, (1 - f) * 6), r = Math.max(3, (p.r * 0.6 + (1 - f) * 5) * k), sg = x.createRadialGradient(px, py, 0, px, py, r); sg.addColorStop(0, `rgba(95,88,84,${a})`); sg.addColorStop(1, 'rgba(95,88,84,0)'); x.fillStyle = sg; x.fillRect(px - r, py - r, r * 2, r * 2); }
    else if (p.k === 'steam') { x.fillStyle = `rgba(240,240,240,${0.5 * f})`; const r = Math.max(3, (2 - f) * 1.6 * k); x.beginPath(); x.arc(px, py, r, 0, 7); x.fill(); }
    else if (p.k === 'conf') { x.fillStyle = p.col; x.globalAlpha = Math.min(1, f * 2); x.save(); x.translate(px, py); x.rotate(p.life * 8 + p.r); x.fillRect(-3, -1.5, 6, 3); x.restore(); x.globalAlpha = 1; }
    else if (p.k === 'spark') { x.fillStyle = `rgba(255,240,150,${f})`; x.fillRect(px - 1, py - 1, 2, 2); } }
}
function overlays(x, W, H, X, Y, k, base) {
  const s = app.s, w = app.w, sw = swing(s), small = x.canvas.clientWidth > 0 && x.canvas.clientWidth < 640;
  x.font = '11px ui-monospace,monospace'; x.textAlign = 'left';
  // Wind
  const wx = wind(w, s.y, s.t); x.fillStyle = 'rgba(0,0,0,.42)'; x.fillRect(16, 12, 128, 26); x.fillStyle = '#fff'; x.fillText(`WIND ${Math.abs(wx).toFixed(0)} m/s`, 24, 29); x.strokeStyle = '#fff'; x.lineWidth = 2; x.beginPath(); const a0 = 122, al = Math.max(-14, Math.min(14, wx * 2)); x.moveTo(a0 - al, 25); x.lineTo(a0 + al, 25); if (Math.abs(al) > 2) { x.lineTo(a0 + al - Math.sign(al) * 5, 21); x.moveTo(a0 + al, 25); x.lineTo(a0 + al - Math.sign(al) * 5, 29); } x.stroke();
  // Swing meter: rope angle with a green band
  if (!s.done) { const cx = 80, cy = 98, r = 34; x.fillStyle = 'rgba(0,0,0,.42)'; x.fillRect(16, 44, 128, 76); x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 6; x.beginPath(); x.arc(cx, cy - 40, r + 6, Math.PI / 2 + 0.6, Math.PI / 2 - 0.6, true); x.stroke();
    x.strokeStyle = 'rgba(214,255,0,.7)'; x.beginPath(); x.arc(cx, cy - 40, r + 6, Math.PI / 2 + 0.1, Math.PI / 2 - 0.1, true); x.stroke();
    const an = Math.max(-0.6, Math.min(0.6, sw.angle)); x.strokeStyle = Math.abs(sw.angle) < 0.1 ? ACID : Math.abs(sw.angle) < 0.3 ? '#fff' : '#ff8a5c'; x.lineWidth = 2; x.beginPath(); x.moveTo(cx, cy - 40); x.lineTo(cx + Math.sin(an) * (r + 6), cy - 40 + Math.cos(an) * (r + 6)); x.stroke();
    x.fillStyle = '#fff'; x.fillText(`SWING ${Math.abs(sw.angle * DEG).toFixed(0)}°`, 24, 114); }
  // Load height tape on the right
  if (!s.done) { const cl = Math.max(0, clearance(w, s)), top = 50, bot = base - 20, tx = W - 30, mx = 30, ty = q => bot - Math.min(1, q / mx) * (bot - top); x.fillStyle = 'rgba(0,0,0,.42)'; x.fillRect(tx, top, 10, bot - top); x.fillStyle = 'rgba(214,255,0,.6)'; x.fillRect(tx, ty(2), 10, bot - ty(2));
    x.fillStyle = cl < 2 ? ACID : '#fff'; x.fillRect(tx - 6, ty(cl) - 1.5, 22, 3); x.textAlign = 'right'; x.fillText(`${s.carry >= 0 ? 'LOAD' : 'HOOK'} ${cl.toFixed(1)} m`, tx - 8, ty(cl) + 4); x.textAlign = 'left'; }
  // Job line
  const r = readings(); x.fillStyle = 'rgba(0,0,0,.45)'; const jt = `${r.job.toUpperCase()} · ${r.to}`; x.font = 'bold 13px ui-monospace,monospace'; const tw = x.measureText(jt).width + 24; x.fillRect(W / 2 - tw / 2, 12, tw, 26); x.fillStyle = ACID; x.textAlign = 'center'; x.fillText(jt, W / 2, 30);
  if (w.fire) { x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(W / 2 - 80, 42, 160, 14); x.fillStyle = '#ff7a2e'; x.fillRect(W / 2 - 78, 44, 156 * s.fire, 10); x.fillStyle = '#fff'; x.font = '10px ui-monospace,monospace'; x.fillText('FIRE', W / 2, 53); x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(W / 2 - 80, 58, 160, 14); x.fillStyle = '#7fd0ff'; x.fillRect(W / 2 - 78, 60, 156 * s.water, 10); x.fillStyle = '#fff'; x.fillText('BUCKET', W / 2, 69); }
  if (s.t < 8 && !s.done && !small) { x.fillStyle = 'rgba(0,0,0,.5)'; x.fillRect(W / 2 - 270, H - 40, 540, 28); x.fillStyle = '#fff'; x.textAlign = 'center'; x.font = '12px ui-monospace,monospace'; x.fillText('W/S up and down · A/D tilt, let go to brake · Space release · P pause', W / 2, H - 21); }
  if (small && !s.done) { const f = Math.min(34, Math.round(12 * W / x.canvas.clientWidth)); x.fillStyle = 'rgba(0,0,0,.55)'; x.fillRect(0, H - f * 1.7, W, f * 1.7); x.font = `bold ${f}px ui-monospace,monospace`; x.textAlign = 'left'; x.fillStyle = '#fff'; x.fillText(`${r.load} ${r.swing.split(' ')[0]} ${r.to}`, 10, H - f * 0.5); }
  // Big moment
  if (app.banner) { const b = app.banner, t = b.t, sc = t < 0.25 ? 0.6 + 1.6 * t : 1, al = t > 2 ? Math.max(0, 1 - (t - 2) / 0.6) : 1; x.save(); x.globalAlpha = al; x.translate(W / 2, H * 0.36); x.scale(sc, sc); x.fillStyle = 'rgba(0,0,0,.5)'; x.fillRect(-260, -46, 520, 84);
    x.fillStyle = ACID; x.font = '900 46px Arial Black,Arial,sans-serif'; x.textAlign = 'center'; x.fillText(b.big, 0, 4); x.fillStyle = '#fff'; x.font = 'bold 13px ui-monospace,monospace'; x.fillText(b.sub, 0, 28); x.restore(); }
  if (app.paused) { x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(0, 0, W, H); }
}

function finish() {
  app.ended = true; const s = app.s, w = app.w, L = w.level, st = store(), p = s.ok ? parts(s, w) : null, sc = p ? p.total : 0;
  sound(false); if (!s.ok) { crash(); app.shake = reduced() ? 0 : 14; if (!['broken', 'lost', 'range', 'fuel'].includes(s.fault.k)) puff(s.x, s.y, 50, 'smoke'); } else { fanfare(p.grade); confetti(s.x, s.y, 120); app.banner = {t: 0, big: `GRADE ${p.grade}`, sub: `${sc} points`}; }
  $('result').hidden = false; $('paused').hidden = true; st.flights = (st.flights || 0) + 1;
  $('result-head').textContent = s.ok ? `Job done. Grade ${p.grade}, ${sc} points.` : 'Job lost.'; $('result-grade').textContent = s.ok ? p.grade : '✕'; $('result-grade').dataset.g = s.ok ? p.grade : 'X';
  const R = s.results, avg = k => R.reduce((a, r) => a + r[k], 0) / Math.max(1, R.length);
  let txt = !s.ok ? s.fault.text : w.fire ? `Fire out with ${R.length} ${R.length > 1 ? 'buckets' : 'bucket'}, ${Math.round(avg('acc') * 100)}% of the water on target, in ${s.t.toFixed(0)} s with ${Math.round(s.fuel)} kg of fuel left.`
    : `${R.length > 1 ? `${R.length} loads set down` : 'Set down'} ${avg('d').toFixed(1)} m from the mark, swinging ${avg('slide').toFixed(1)} m/s, coming down at ${avg('impact').toFixed(1)} m/s, in ${s.t.toFixed(0)} s with ${Math.round(s.fuel)} kg of fuel left.`;
  if (p) { $('result-parts').innerHTML = [['Place', p.place], ['Steady', p.steady], ['Soft', p.soft], ['Time', p.time], ['Fuel', p.fuel]].map(([a, q]) => `<div><b>${q}</b><span>${a}</span></div>`).join('') + `<div><b>×${+p.mult.toFixed(3)}</b><span>${L.name}</span></div>`; $('result-parts').hidden = false; } else $('result-parts').hidden = true;
  st.best = st.best || {}; st.grade = st.grade || {};
  if (L.daily) { const rec = {no: L.no, kind: L.kind, ok: !!s.ok, score: sc, grade: p?.grade, d: avg('d'), slide: avg('slide'), hit: Math.round(avg('acc') * 100), lost: s.ok ? '' : s.fault.text, grid: p ? [p.place / 400, p.steady / 250, p.soft / 150, p.time / 100, p.fuel / 100] : []};
    if (!app.daily.practice && DAILY.put(L.date, rec)) txt += ' That was your scored try for today. Fly again to practise.'; else txt += ' Practice flight, not scored.'; app.daily.practice = true; }
  else if (s.ok && sc > (st.best[L.id] || 0)) { st.best[L.id] = sc; st.grade[L.id] = p.grade; txt += ' A new personal best.'; }
  $('result-text').textContent = txt; write(KEY, st);
  const i = LEVELS.findIndex(l => l.id === L.id), nx = LEVELS[i + 1]; $('next').hidden = !!L.daily || !s.ok || !nx; if (!$('next').hidden) $('next').textContent = `Next: ${nx.name} (N)`;
  app.share = `Helicopter sling load, ${L.name}\n${s.ok ? `Grade ${p.grade}, ${sc} points` : 'Job lost'}\n${SITE}`;
  const today = L.daily && DAILY.get(L.date); if (today) app.share = dailyCard(today); $('share').textContent = today ? 'Copy Daily Drop card' : 'Copy result'; showDailyResult(today);
  renderLevels(); setLevel(app.level); renderDaily(); $('again').focus({preventScroll: true});
  window.SlingGame.last = {daily: !!L.daily, ok: !!s.ok, score: sc, grade: p?.grade || null, fault: s.fault?.k || null, results: R};
}

// Sound: off unless switched on. All made here with WebAudio, no files.
function noiseBuf(ac) { const b = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; }
function chain(ac, type, freq, q = 0.7) { const src = ac.createBufferSource(); src.buffer = app.audio.buf; src.loop = true; const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; const g = ac.createGain(); g.gain.value = 0; src.connect(f).connect(g).connect(app.audio.out); src.start(); return {f, g}; }
function sound(on) {
  const st = store(); if (!st.sound) { if (app.audio) app.audio.out.gain.value = 0; return; }
  if (!app.audio) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; const ac = new AC(), out = ac.createGain(); out.gain.value = 0.8; out.connect(ac.destination); app.audio = {ac, out, buf: noiseBuf(ac)};
    const A = app.audio; A.thump = chain(ac, 'bandpass', 95, 0.9); A.slap = chain(ac, 'highpass', 700, 0.7); A.air = chain(ac, 'highpass', 1400, 0.5);
    // the blade beat: an LFO swings the rotor noise up and down at the blade passing rate
    A.lfo = ac.createOscillator(); A.lfo.type = 'sawtooth'; A.lfo.frequency.value = 16; A.depth = ac.createGain(); A.depth.gain.value = 0; A.lfo.connect(A.depth); A.depth.connect(A.thump.g.gain); A.sdepth = ac.createGain(); A.sdepth.gain.value = 0; A.lfo.connect(A.sdepth); A.sdepth.connect(A.slap.g.gain); A.lfo.start();
    const o = ac.createOscillator(), f = ac.createBiquadFilter(), og = ac.createGain(); o.type = 'sawtooth'; o.frequency.value = 1300; f.type = 'lowpass'; f.frequency.value = 2200; og.gain.value = 0; o.connect(f).connect(og).connect(out); o.start(); A.whine = {o, g: og}; }
  const A = app.audio, s = app.s; if (A.ac.state === 'suspended') A.ac.resume(); A.out.gain.value = 0.8;
  const live = on !== false && s && !s.done && !app.paused, c = live ? s.c : 0, sp = s ? Math.hypot(s.vx, s.vy) : 0, run = live ? 1 : 0;
  A.thump.g.gain.value = run * (0.25 + 0.35 * c); A.depth.gain.value = run * (0.22 + 0.3 * c); A.slap.g.gain.value = run * 0.03 * c; A.sdepth.gain.value = run * 0.05 * c; A.lfo.frequency.value = 15 + 3 * c;
  A.whine.g.gain.value = run * (0.012 + 0.012 * c); A.whine.o.frequency.value = 1250 + 260 * c; A.air.g.gain.value = live ? Math.min(0.12, sp / 200 + Math.abs(wind(app.w, s.y, s.t)) / 120) : 0;
}
function env(f, g0, len, type = 'sine', delay = 0, f1) { const A = app.audio; if (!store().sound || !A) return; const t = A.ac.currentTime + delay, o = A.ac.createOscillator(), g = A.ac.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1 ?? f * 0.5), t + len); g.gain.setValueAtTime(g0, t); g.gain.exponentialRampToValueAtTime(0.0001, t + len); o.connect(g).connect(A.out); o.start(t); o.stop(t + len + 0.05); }
function burst(len, g0, freq, delay = 0, type = 'lowpass') { const A = app.audio; if (!store().sound || !A) return; const t = A.ac.currentTime + delay, src = A.ac.createBufferSource(); src.buffer = A.buf; const f = A.ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; const g = A.ac.createGain(); g.gain.setValueAtTime(g0, t); g.gain.exponentialRampToValueAtTime(0.0001, t + len); src.connect(f).connect(g).connect(A.out); src.start(t); src.stop(t + len + 0.05); }
const clack = () => { env(900, 0.12, 0.06, 'square'); env(500, 0.1, 0.08, 'square', 0.05); };
const clunk = () => { env(260, 0.15, 0.1, 'square'); };
const thud = v => { env(80, 0.5 * v + 0.1, 0.3); burst(0.2, 0.25 * v, 500); };
const knock = () => { env(140, 0.35, 0.2, 'triangle'); burst(0.15, 0.2, 900); };
const buzz = () => env(180, 0.08, 0.3, 'square', 0, 170);
const chime = q => { const n = q > 0.85 ? [660, 880, 1320, 1760] : q > 0.6 ? [660, 880, 1320] : [660, 880]; n.forEach((f, i) => env(f, 0.12, 0.5, 'sine', i * 0.09, f)); };
const fanfare = g => { const n = g === 'S' ? [523, 659, 784, 1047, 1319] : g === 'A' ? [523, 659, 784, 1047] : [523, 659, 784]; n.forEach((f, i) => env(f, 0.13, 0.7, 'triangle', 0.3 + i * 0.12, f)); };
const crash = () => { burst(1.6, 0.7, 900); env(50, 0.6, 1.2); };
const splash = () => burst(0.6, 0.3, 2500, 0, 'highpass');
const whoosh = () => burst(1.2, 0.3, 1200, 0, 'bandpass');

// Input: A/D tilt and W/S up and down are held; Space releases.
const HOLD = {a: 'l', A: 'l', ArrowLeft: 'l', d: 'r', D: 'r', ArrowRight: 'r', w: 'u', W: 'u', ArrowUp: 'u', s: 'd', S: 'd', ArrowDown: 'd'};
const live = () => app.s && !app.s.done && !app.paused;
function rel() { if (live()) { app.rel = true; sound(); } }
function pause(on = !app.paused) { if (!app.s || app.s.done) return; app.paused = on; $('paused').hidden = !on; if (!on) app.last = performance.now(); sound(); }
addEventListener('keydown', e => {
  if (!app.s || $('flight').hidden) return; const k = HOLD[e.key], low = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (k && !app.s.done) { app.keys[k] = true; e.preventDefault(); }
  else if (e.key === ' ' || low === 'enter' && false) { if (!e.repeat) rel(); e.preventDefault(); }
  else if (low === 'p' || e.key === 'Escape') pause();
  else if (low === 'r' && app.s.done) again();
  else if (low === 'n' && app.s.done && !$('next').hidden) next();
});
addEventListener('keyup', e => { const k = HOLD[e.key]; if (k) app.keys[k] = false; });
addEventListener('blur', () => { app.keys = {}; if (app.s && !app.s.done && !$('flight').hidden) pause(true); });
document.addEventListener('visibilitychange', () => { if (document.hidden && app.s && !app.s.done && !$('flight').hidden) pause(true); });
document.querySelectorAll('[data-hold]').forEach(b => { const k = b.dataset.hold; b.addEventListener('pointerdown', e => { e.preventDefault(); app.keys[k] = true; b.setPointerCapture?.(e.pointerId); sound(); }); ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => b.addEventListener(ev, () => { app.keys[k] = false; })); b.addEventListener('contextmenu', e => e.preventDefault()); });
const tap = (id, f) => $(id).addEventListener('click', f);
tap('release', rel); tap('pause', () => pause()); tap('resume', () => pause(false));
function next() { const i = LEVELS.findIndex(l => l.id === app.level); start(LEVELS[Math.min(LEVELS.length - 1, i + 1)].id); }
const again = () => app.daily ? startDaily() : start(app.level);
tap('again', again); tap('daily-play', startDaily); tap('daily-copy', () => { const r = DAILY.get(ukDate()); if (r) copyShare(dailyCard(r)); }); tap('daily-share', () => { const r = DAILY.get(ukDate()); if (r) copyShare(dailyCard(r)); }); tap('next', next); tap('play', () => start(app.level));
tap('share', () => copyShare(app.share));
tap('back', () => { cancelAnimationFrame(app.raf); if (app.audio) app.audio.out.gain.value = 0; app.s = null; $('flight').hidden = true; $('screen-title').hidden = false; document.body.dataset.screen = 'title'; renderLevels(); setLevel(app.level); renderDaily(); scrollTo(0, 0); });
$('sound').checked = !!store().sound; $('sound').addEventListener('change', e => { const st = store(); st.sound = e.target.checked; write(KEY, st); if (e.target.checked && app.s) sound(); });
for (const [id, key] of [['hover', 'hover'], ['damp', 'damp']]) { const st = store(); app[key] = st[key] ?? true; $(id).checked = app[key]; $(id).addEventListener('change', e => { app[key] = e.target.checked; const q = store(); q[key] = app[key]; write(KEY, q); }); }
// For tests and the curious: read only views of the flight.
window.SlingGame = {flights: 0, last: null, state: () => app.s, world: () => app.w, level: () => app.level, levels: LEVELS.map(l => l.id), start: (id, o = {}) => { if ('hover' in o) app.hover = !!o.hover; if ('damp' in o) app.damp = !!o.damp; start(id); }, daily: () => dailyLevel(), startDaily, dailyRecord: () => DAILY.get(ukDate()), dailyCard: () => { const r = DAILY.get(ukDate()); return r && dailyCard(r); }, pause, photo: on => { app.photo = !!on; }};
renderLevels(); setLevel(level(store().level || 'first-lift').id);
renderDaily(); tickDaily(); setInterval(tickDaily, 1000);
if (new URLSearchParams(location.search).has('daily')) startDaily();
