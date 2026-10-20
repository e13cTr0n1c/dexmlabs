import {step, makeWorld, parts, groundH, surface, windAt, lift, liftAt, sinkRate, speedToFly, stallSpeed, progress, trimTarget, GL, KMH} from './physics.js';
import {LEVELS, level} from './levels.js';
import {ukDate, countdown, grid, makeStore} from './daily.js';
import {dailyLevel} from './daily-level.js';
const $ = id => document.getElementById(id);
const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const KEY = 'glider:stats', store = () => read(KEY, {best: {}, grade: {}, flights: 0});
const DT = 1 / 60, ACID = '#d6ff00', clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const WARPS = [1, 3, 6];
const app = {w: null, s: null, keys: {}, raf: 0, last: 0, acc: 0, said: {}, parts: [], banner: null, level: 'evening-glide', trim: true, audio: null, paused: false, warp: 3, beepT: 0, daily: null, photo: false};
const cv = $('sky'), x = cv.getContext('2d');

const fmtBest = id => { const st = store(), b = st.best?.[id]; return b ? `Best ${b} · ${st.grade?.[id] || ''}` : 'Not flown yet'; };
function renderLevels() {
  $('levels').innerHTML = LEVELS.map((l, i) => `<button type="button" data-level="${l.id}" aria-pressed="${l.id === app.level}"><span class="lv-n">${i + 1}</span> ${l.name} <span class="mult">×${l.mult}</span><small>${l.blurb}</small><small class="best">${fmtBest(l.id)}</small></button>`).join('');
  document.querySelectorAll('[data-level]').forEach(b => b.addEventListener('click', () => setLevel(b.dataset.level)));
}
function setLevel(id) { app.level = id; document.querySelectorAll('[data-level]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.level === id))); const st = store(); st.level = id; write(KEY, st); $('play').innerHTML = `Fly ${level(id).name} <span aria-hidden="true">&rarr;</span>`; }
function say(t) { $('feedback').textContent = t; }
const NOTES = {'evening-glide': 'Just glide down to the airfield and land near the mark. The autotrim flies the right speed; hold Space for the airbrakes if you are high.', 'first-thermal': 'Fly under the cloud. When the vario beeps, bank with A or D and keep circling until you are high, then glide on.',
  'cloud-street': 'Out to the Mill and back. Climb under each cloud on the way; leave when the climb gets weak.', ridge: 'Fly along the windward face of the ridge, a little in front of the top, to climb. Then run downwind to the airfield.',
  wave: 'Climb on the ridge, then fly downwind into the smooth wave lift behind it, marked by the lens shaped clouds. Climb high before going upwind.', 'land-out': 'You will not get home. Go as far as you can, then pick an open field: not trees, houses or water.',
  'sunset-xc': 'A triangle: Church, then Reservoir off to the side, then home. Watch the map.', daily: 'Same task for everyone today.'};
const DAILY = makeStore('glider:daily'), SITE = 'https://dexmlabs.app/glider-thermals-game/';
function dailyCard(rec) { const head = `DEXM Glider Thermals #${rec.no}`;
  if (!rec.ok) return `${head} 🪂 ${rec.lost}\n${grid(rec.grid || [0, 0, 0, 0, 0])}\n${SITE}?daily`;
  return `${head} 🪶 Grade ${rec.grade} · ${rec.km} km · ${rec.min} min\n${grid(rec.grid)} ${rec.score} pts\n${SITE}?daily`; }
function startDaily() { const L = dailyLevel(), done = DAILY.get(L.date); app.daily = {L, practice: !!done || L.no < 0}; start(L, L.seed); }
function renderDaily() { const L = dailyLevel(), rec = DAILY.get(L.date), pre = L.no < 0;
  $('daily-h').textContent = pre ? 'Daily Drop #0 arrives at midnight' : `Daily Drop #${L.no}`; $('daily-blurb').textContent = (pre ? 'Preview: ' : '') + L.blurb;
  $('daily-status').textContent = pre ? 'Practise the preview now. Scoring starts with #0.' : rec ? (rec.ok ? `Today: grade ${rec.grade}, ${rec.score} points. Practice flights don't count.` : `Today: ${rec.lost} Practice flights don't count.`) : 'One scored try today.';
  $('daily-play').innerHTML = `${rec || pre ? 'Practise today\'s task' : 'Fly today\'s task'} <span aria-hidden="true">&rarr;</span>`; $('daily-share').hidden = !rec; }
function showDailyResult(rec) { $('daily-result').hidden = !rec; if (rec) { $('daily-card').textContent = dailyCard(rec); $('daily-result-next').textContent = `Next drop in ${countdown()}`; } }
function tickDaily() { $('daily-next').textContent = `Next drop in ${countdown()}`; if (!$('daily-result').hidden) $('daily-result-next').textContent = `Next drop in ${countdown()}`; if (app.dDate && app.dDate !== ukDate() && $('flight').hidden) renderDaily(); app.dDate = ukDate(); }
function copyShare(text) { app.share = text; navigator.clipboard?.writeText(text).then(() => say('Copied.'), () => { $('share-text').hidden = false; $('share-text').value = text; }); }

function start(id = app.level, seed = Math.floor(Math.random() * 2 ** 31)) {
  cancelAnimationFrame(app.raf); const L = typeof id === 'object' ? id : level(id); if (!L.daily) { app.level = L.id; app.daily = null; }
  const w = makeWorld(L, seed, L.daily ? {} : {trim: app.trim}); app.rnd = mulberry(seed);
  Object.assign(app, {w, s: structuredClone(w.start), keys: {}, said: {}, parts: [], banner: null, paused: false, acc: 0, ended: false, shake: 0});
  app.cam = {x: app.s.x, h: app.s.h, scale: 0.5}; app.stars = Array.from({length: 60}, () => [app.rnd(), app.rnd() * 0.5, app.rnd()]);
  $('flight').hidden = false; $('screen-title').hidden = true; document.body.dataset.screen = 'game'; scrollTo(0, 0); $('result').hidden = true; $('paused').hidden = true; say('');
  $('flight-h').textContent = `${L.name}${L.daily && app.daily.practice ? ' (practice)' : ''}`; $('level-note').textContent = (L.daily ? (app.daily.practice ? 'Practice: this flight is not scored. ' : 'Your one scored try today. ') + L.blurb + ' ' : '') + (NOTES[L.id] || NOTES.daily);
  cv.focus({preventScroll: true}); sound(); app.last = performance.now(); app.raf = requestAnimationFrame(loop); window.GliderGame.flights++;
}
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function input() { const k = app.keys; return {roll: (k.r ? 1 : 0) - (k.l ? 1 : 0), pitch: (k.u ? 1 : 0) - (k.d ? 1 : 0), brake: !!k.b}; }
function loop(now) {
  const real = Math.min(0.1, (now - app.last) / 1000); app.last = now; const agl = app.s.h - groundH(app.w, app.s.x);
  const warp = app.testWarp || (app.s.onGround || agl < 120 || app.s.done ? 1 : app.warp);
  if (!app.paused && !app.s.done) { app.acc += real * warp; let n = 0; while (app.acc >= DT && !app.s.done && n++ < 600) { if (app.pilot && n % 6 === 1) app.pilot(); step(app.w, app.s, input(), DT); app.acc -= DT; events(app.s.ev); } }
  juice(app.paused ? 0 : real); draw(); hud(); sound(real); if (!app.s.done) callouts();
  if (app.s.done && !app.ended) finish();
  app.raf = requestAnimationFrame(loop);
}
function events(ev) { for (const e of ev) {
  if (e.k === 'tp') { banner(`TURNPOINT`, `${e.name} · ${app.w.tps.length - e.i - 1 ? 'next leg' : 'now home'}`); chime(); puff(app.s.x, app.s.h, 40, ACID); }
  if (e.k === 'stall') { say('Stall: the wing ran out of lift. Let it pick up speed (W) and level the wings.'); buzz(); }
  if (e.k === 'vne') say('Too fast. Ease off with S.');
  if (e.k === 'touch') { thud(e.sink); for (let i = 0; i < 24; i++) app.parts.push({x: app.s.x, h: app.s.h + 1, vx: (app.rnd() - 0.5) * 8 - 4, vh: app.rnd() * 3, life: 1.2, c: '#c9a46a', r: 3}); }
} }
function banner(big, sub) { app.banner = {big, sub, t: 0}; }
function puff(px, ph, n, c) { for (let i = 0; i < n; i++) { const a = app.rnd() * 6.28, v = 10 + app.rnd() * 25; app.parts.push({x: px, h: ph, vx: Math.cos(a) * v, vh: Math.sin(a) * v, life: 1 + app.rnd(), c, r: 2.5}); } }
function juice(dt) { for (const p of app.parts) { p.x += p.vx * dt; p.h += p.vh * dt; p.vh -= 4 * dt; p.life -= dt; } app.parts = app.parts.filter(p => p.life > 0); if (app.banner) { app.banner.t += dt; if (app.banner.t > 2.8) app.banner = null; } app.shake *= 0.9; }
function callouts() { const s = app.s, w = app.w, agl = s.h - groundH(w, s.x), once = (k, t) => { if (!app.said[k]) { app.said[k] = 1; say(t); } };
  if (s.vario > 1 && Math.abs(s.phi) < 0.2) once('lift' + Math.round(s.x / 2000), 'Lift! Bank with A or D and circle to stay in it.');
  if (agl < 300 && !s.onGround) once('low', 'Getting low. Head for an open field or the airfield and hold Space for the airbrakes to come down steeper.');
}

// Drawing: a side view of the evening, with a map of the task in the corner.
const SKY = {gold: ['#1d2a4a', '#e88a4a', '#ffd58a'], dusk: ['#141a36', '#9a4a7a', '#f2a066'], sunset: ['#0e1430', '#c2455a', '#ffb05c']};
const KIND = {forest: '#1f3a24', town: '#5a4b52', water: '#3a6a8a', airfield: '#7aa35a', field: '#5f7f3f'};
function camera() { const s = app.s, W = cv.width, H = cv.height, agl = s.h - groundH(app.w, s.x), want = clamp(260 / Math.max(120, agl + 200), 0.06, 0.7);
  app.cam.scale += (want - app.cam.scale) * 0.03; app.cam.x += (s.x + s.V * 6 - app.cam.x) * 0.08; const gh = groundH(app.w, s.x), ch = Math.max(s.h, gh + 0.3 * H / app.cam.scale); app.cam.h += (ch - app.cam.h) * 0.08;
  const sc = app.cam.scale; return {sc, X: q => W * 0.45 + (q - app.cam.x) * sc, Y: q => H * 0.5 - (q - app.cam.h) * sc}; }
function draw() {
  const s = app.s, w = app.w, W = cv.width, H = cv.height, sky = SKY[w.level.sky] || SKY.gold, {sc, X, Y} = camera(), t = s.t;
  x.save(); if (app.shake > 0.3) x.translate((app.rnd() - 0.5) * app.shake, (app.rnd() - 0.5) * app.shake);
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, sky[0]); g.addColorStop(0.62, sky[1]); g.addColorStop(1, sky[2]); x.fillStyle = g; x.fillRect(0, 0, W, H);
  for (const [a, b, c] of app.stars) { x.fillStyle = `rgba(255,255,255,${0.15 + 0.3 * c})`; x.fillRect(a * W, b * H * 0.6, 1.5, 1.5); }
  const sunY = H * 0.78 + Math.min(80, t / 30); x.fillStyle = 'rgba(255,220,150,.9)'; x.beginPath(); x.arc(W * 0.8, sunY, 34, 0, 7); x.fill(); const halo = x.createRadialGradient(W * 0.8, sunY, 30, W * 0.8, sunY, 220); halo.addColorStop(0, 'rgba(255,200,120,.35)'); halo.addColorStop(1, 'rgba(255,200,120,0)'); x.fillStyle = halo; x.fillRect(0, 0, W, H);
  // Far hills, parallax
  x.fillStyle = '#4a3352'; x.beginPath(); x.moveTo(0, H); for (let i = 0; i <= W; i += 12) x.lineTo(i, H * 0.72 + Math.sin((i + app.cam.x * 0.02) / 90) * 18 + Math.sin((i + app.cam.x * 0.02) / 37) * 8); x.lineTo(W, H); x.fill();
  const x0 = app.cam.x - W * 0.45 / sc, x1 = x0 + W / sc;
  // Wave: lens shaped clouds over each lift band
  for (const v of w.waves) for (let k = 0; k < v.n; k++) { const cx = v.x + (k + 0.25) * v.lambda, ch = Math.min(v.hmax - 200, v.hmin + 1600); const px = X(cx), py = Y(ch); if (px < -400 || px > W + 400) continue; for (let j = 0; j < 3; j++) { x.fillStyle = `rgba(255,${200 - j * 20},${190 - j * 20},${0.5 - j * 0.12})`; x.beginPath(); x.ellipse(px, py - j * 8 * Math.max(0.4, sc * 4), Math.max(40, 900 * sc) - j * 20, Math.max(6, 70 * sc) - j * 2, 0, 0, 7); x.fill(); } }
  // Thermals: shimmer near the ground, birds, and a cumulus at the base
  w.thermals.forEach((q, i) => { const u = windAt(w, q.base, t), cx = q.x + u * q.base / 3.2, near = clamp(1 - Math.abs(s.z - q.z) / 2500, 0.25, 1), px = X(cx); if (px < -600 || px > W + 600) return;
    for (let j = 0; j < 4; j++) { const ph = (t * 40 + j * 70) % 280, gx = q.x + u * ph / 3.2, gy = Y(groundH(w, q.x) + ph); x.strokeStyle = `rgba(255,240,220,${0.12 * near * (1 - ph / 280)})`; x.lineWidth = 2; x.beginPath(); for (let k = -3; k <= 3; k++) x.lineTo(X(gx) + k * 6 + Math.sin(t * 3 + k + j) * 3, gy - Math.abs(k) * 2); x.stroke(); }
    cloud(px, Y(q.base), q.r * 2.4 * sc, near); });
  for (const b of w.birds) { const q = w.thermals[b.q], u = windAt(w, b.h, t), a = b.a + t * b.sp, bx = q.x + u * b.h / 3.2 + Math.cos(a) * b.rad, bh = b.h + Math.sin(t * 0.3 + b.a) * 20 + t * 0.4 % 50, px = X(bx), py = Y(bh); if (px < -20 || px > W + 20) continue; const f = Math.sin(t * 4 + b.a) * 2; x.strokeStyle = 'rgba(20,15,25,.8)'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(px - 6, py - 2 + f); x.quadraticCurveTo(px - 2, py - 4, px, py); x.quadraticCurveTo(px + 2, py - 4, px + 6, py - 2 + f); x.stroke(); }
  // Ground with fields, forest, houses, water
  const step = Math.max(4, 6 / sc); for (let gx = Math.floor(x0 / step) * step; gx < x1 + step; gx += step) { const f = surface(w, gx), gy = groundH(w, gx); x.fillStyle = KIND[f.kind]; x.fillRect(X(gx), Y(gy), step * sc + 1, H); }
  x.strokeStyle = 'rgba(255,210,150,.5)'; x.lineWidth = 2; x.beginPath(); for (let gx = x0; gx < x1; gx += step) x.lineTo(X(gx), Y(groundH(w, gx))); x.stroke();
  if (sc > 0.15) for (const f of w.surface) { if (f.x1 < x0 || f.x0 > x1) continue; for (let gx = f.x0 + 15; gx < f.x1; gx += f.kind === 'town' ? 40 : 18) { const gy = Y(groundH(w, gx)), px = X(gx);
    if (f.kind === 'forest') { x.fillStyle = '#163020'; x.beginPath(); x.moveTo(px - 7 * sc * 4, gy); x.lineTo(px, gy - 22 * sc * 2); x.lineTo(px + 7 * sc * 4, gy); x.fill(); }
    if (f.kind === 'town') { x.fillStyle = '#3e3540'; x.fillRect(px - 10 * sc * 2, gy - 18 * sc * 2, 20 * sc * 2, 18 * sc * 2); x.fillStyle = 'rgba(255,200,110,.8)'; x.fillRect(px - 3 * sc * 2, gy - 12 * sc * 2, 4 * sc * 2, 4 * sc * 2); } } }
  if (w.finish) { const fx = X(w.finish.spot), fy = Y(groundH(w, w.finish.spot)); x.fillStyle = ACID; x.fillRect(fx - 3, fy - 40, 3, 40); x.fillRect(fx, fy - 40, 18, 10); x.strokeStyle = 'rgba(214,255,0,.6)'; x.setLineDash([6, 6]); x.beginPath(); x.moveTo(X(w.finish.x0), fy + 2); x.lineTo(X(w.finish.x1), fy + 2); x.stroke(); x.setLineDash([]); }
  // Trail and the glider
  x.strokeStyle = 'rgba(255,255,255,.25)'; x.lineWidth = 1; x.beginPath(); for (const [tx, , th] of s.trail) x.lineTo(X(tx), Y(th)); x.lineTo(X(s.x), Y(s.h)); x.stroke();
  for (const p of app.parts) { x.globalAlpha = clamp(p.life, 0, 1); x.fillStyle = p.c; x.fillRect(X(p.x), Y(p.h), p.r, p.r); } x.globalAlpha = 1;
  glider(X(s.x), Y(s.h), s); x.restore(); overlay(W, H); map(W, H);
}
function cloud(px, py, r, a) { r = Math.max(30, r); for (let i = 0; i < 7; i++) { const ox = (i - 3) * r * 0.28, oy = -Math.abs(Math.sin(i * 1.7)) * r * 0.35 - (i % 2) * r * 0.1, rr = r * (0.32 + 0.12 * Math.sin(i * 2.3 + 1));
  const gr = x.createRadialGradient(px + ox, py + oy - rr * 0.3, rr * 0.1, px + ox, py + oy, rr); gr.addColorStop(0, `rgba(255,236,214,${0.85 * a})`); gr.addColorStop(0.7, `rgba(240,170,150,${0.6 * a})`); gr.addColorStop(1, 'rgba(240,170,150,0)'); x.fillStyle = gr; x.beginPath(); x.arc(px + ox, py + oy, rr, 0, 7); x.fill(); }
  x.fillStyle = `rgba(110,80,110,${0.35 * a})`; x.fillRect(px - r, py - 2, r * 2, 4); }
function glider(px, py, s) { // side view; the heading decides which way it points, the bank foreshortens the wing
  const dir = Math.cos(s.psi) >= 0 ? 1 : -1, size = 1.3, sp = 30 * size * Math.cos(s.phi), cs = Math.sin(s.psi);
  x.save(); x.translate(px, py); x.rotate(-s.gam * dir); x.scale(dir, 1);
  x.fillStyle = '#f4f1ea'; x.strokeStyle = '#1a1820'; x.lineWidth = 1;
  x.beginPath(); x.moveTo(-26 * size, -1); x.quadraticCurveTo(-6, -5, 10 * size, -3); x.quadraticCurveTo(18 * size, -1, 18 * size, 1); x.quadraticCurveTo(4, 4, -26 * size, 2); x.fill(); x.stroke();
  x.fillStyle = '#2a3550'; x.beginPath(); x.ellipse(8 * size, -3.4, 5 * size, 2, -0.1, 0, 7); x.fill();
  x.fillStyle = '#f4f1ea'; x.beginPath(); x.moveTo(-24 * size, -1); x.lineTo(-28 * size, -12 * size); x.lineTo(-23 * size, -12 * size); x.lineTo(-19 * size, -1); x.fill(); x.stroke();
  x.fillStyle = ACID; x.fillRect(-28 * size, -12 * size, 4, 3);
  // wing seen from the side: a thin line when level, a long sliver when banked
  const wy = Math.sin(s.phi) * 30 * size * (cs >= 0 ? 1 : -1); x.strokeStyle = '#f4f1ea'; x.lineWidth = 3; x.beginPath(); x.moveTo(-1, -1 - wy); x.lineTo(2, -1 + wy); x.stroke();
  if (s.brake > 0.1) { x.fillStyle = ACID; x.fillRect(-2, -5, 2, -4 * s.brake); }
  x.restore(); }
function overlay(W, H) { const s = app.s, w = app.w, agl = s.h - groundH(w, s.x); x.font = '12px ui-monospace,monospace'; x.textAlign = 'left';
  // Vario tape
  const vx = 22, vy = H / 2, v = clamp(s.vario, -5, 5); x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(vx - 10, vy - 110, 44, 220); x.fillStyle = v > 0 ? ACID : '#ff8a5c'; x.fillRect(vx, vy, 16, -v * 20);
  x.fillStyle = '#fff'; x.fillRect(vx - 4, vy, 24, 1); x.fillText(`${v >= 0 ? '+' : ''}${v.toFixed(1)}`, vx - 6, vy + 124); x.fillText('VARIO', vx - 6, vy - 116);
  // Speed with the speed to fly marker
  const tx = 74, kmh = s.V * KMH, tgt = (w.assist.trim ? trimTarget(w, s) : speedToFly(1, -Math.min(0, liftAt(w, s)), s.h)) * KMH, Yk = k => vy + 100 - clamp((k - 50) / 150, 0, 1) * 200;
  x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(tx - 6, vy - 110, 70, 220); x.fillStyle = 'rgba(255,90,60,.6)'; x.fillRect(tx, Yk(stallSpeed(s.phi, s.h) * KMH), 6, vy + 100 - Yk(stallSpeed(s.phi, s.h) * KMH)); x.fillStyle = ACID; x.fillRect(tx, Yk(tgt) - 2, 12, 4);
  x.fillStyle = '#fff'; x.fillRect(tx, Yk(kmh) - 1, 22, 2); x.fillText(`${kmh.toFixed(0)}`, tx + 26, Yk(kmh) + 4); x.fillText('KM/H', tx, vy - 116);
  // Top line: task and height
  const pr = progress(w, s), next = w.tps[s.tp], goal = next ? next.name : w.finish ? 'Finish' : 'Far as you can', dist = next ? Math.hypot(next.x - s.x, next.z - s.z) : w.finish ? Math.abs(w.finish.spot - s.x) : 0;
  const line = `${goal.toUpperCase()} ${(dist / 1000).toFixed(1)} km · ${Math.round(agl)} m above ground · ${Math.round(pr.frac * 100)}%`; x.font = 'bold 13px ui-monospace,monospace'; const lw = x.measureText(line).width + 24; x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(W / 2 - lw / 2, 10, lw, 24); x.fillStyle = '#fff'; x.textAlign = 'center'; x.fillText(line, W / 2, 27);
  x.font = '11px ui-monospace,monospace'; x.fillText(`WIND ${Math.abs(windAt(w, s.h, s.t)).toFixed(0)} m/s ${windAt(w, s.h, s.t) >= 0 ? '→' : '←'} · TIME ×${s.onGround || agl < 120 ? 1 : app.warp} (T)`, W / 2, 48);
  if (s.t < 10 && !s.done) { x.fillStyle = 'rgba(0,0,0,.5)'; x.fillRect(W / 2 - 280, H - 40, 560, 28); x.fillStyle = '#fff'; x.fillText('A/D bank · W/S faster/slower · Space airbrakes · T time · P pause', W / 2, H - 21); }
  if (app.banner) { const b = app.banner, sc = b.t < 0.25 ? 0.6 + 1.6 * b.t : 1, al = b.t > 2 ? Math.max(0, 1 - (b.t - 2) / 0.8) : 1; x.save(); x.globalAlpha = al; x.translate(W / 2, H * 0.36); x.scale(sc, sc); x.fillStyle = 'rgba(0,0,0,.4)'; x.fillRect(-220, -40, 440, 80); x.fillStyle = ACID; x.font = '900 46px Arial Black,Arial,sans-serif'; x.fillText(b.big, 0, 4); x.fillStyle = '#fff'; x.font = 'bold 13px ui-monospace,monospace'; x.fillText(b.sub, 0, 28); x.restore(); }
  x.textAlign = 'left'; if (app.paused) { x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(0, 0, W, H); } }
function map(W, H) { const s = app.s, w = app.w, mw = 220, mh = 130, mx = W - mw - 12, my = 12, pts = [s.start, ...w.tps, ...(w.finish ? [{x: w.finish.spot, z: 0}] : [{x: s.start.x + w.target, z: 0}]), {x: s.x, z: s.z}];
  const lo = Math.min(...pts.map(p => p.x)) - 1500, hi = Math.max(...pts.map(p => p.x)) + 1500, zl = Math.min(-2500, ...pts.map(p => p.z - 1000)), zh = Math.max(2500, ...pts.map(p => p.z + 1000)), k = Math.min(mw / (hi - lo), mh / (zh - zl));
  const MX = q => mx + mw / 2 + (q - (lo + hi) / 2) * k, MZ = q => my + mh / 2 + (q - (zl + zh) / 2) * k;
  x.fillStyle = 'rgba(0,0,0,.5)'; x.fillRect(mx, my, mw, mh); x.save(); x.beginPath(); x.rect(mx, my, mw, mh); x.clip();
  for (const f of w.surface) { x.fillStyle = KIND[f.kind]; x.globalAlpha = 0.6; x.fillRect(MX(f.x0), my, Math.max(1, (f.x1 - f.x0) * k), mh); } x.globalAlpha = 1;
  for (const q of w.thermals) { x.fillStyle = 'rgba(255,236,214,.8)'; x.beginPath(); x.arc(MX(q.x + windAt(w, s.h, s.t) * s.h / 3.2), MZ(q.z), Math.max(3, q.r * k * 1.5), 0, 7); x.fill(); }
  x.strokeStyle = ACID; x.setLineDash([4, 4]); x.beginPath(); pts.slice(0, -1).forEach(p => x.lineTo(MX(p.x), MZ(p.z))); x.stroke(); x.setLineDash([]);
  w.tps.forEach((p, i) => { x.strokeStyle = i < s.tp ? 'rgba(214,255,0,.4)' : ACID; x.beginPath(); x.arc(MX(p.x), MZ(p.z), Math.max(4, p.r * k), 0, 7); x.stroke(); });
  x.strokeStyle = 'rgba(255,255,255,.5)'; x.beginPath(); for (const [tx, tz] of s.trail) x.lineTo(MX(tx), MZ(tz)); x.stroke();
  x.save(); x.translate(MX(s.x), MZ(s.z)); x.rotate(s.psi); x.fillStyle = '#fff'; x.beginPath(); x.moveTo(7, 0); x.lineTo(-5, -4); x.lineTo(-5, 4); x.fill(); x.restore(); x.restore();
  x.fillStyle = '#fff'; x.font = '10px ui-monospace,monospace'; x.fillText('MAP · from above', mx + 6, my + mh - 6); }
function hud() { const s = app.s, w = app.w, agl = s.h - groundH(w, s.x), sk = sinkRate(s.V, s.phi, s.h, s.brake), pr = progress(w, s);
  const set = (id, v) => { const e = $(id); if (e.textContent !== v) e.textContent = v; };
  set('h-v', `${(s.V * KMH).toFixed(0)} km/h`); set('h-var', `${s.vario >= 0 ? '+' : ''}${s.vario.toFixed(1)} m/s`); set('h-agl', `${Math.round(agl)} m`); set('h-ld', `${(s.V / Math.max(0.3, sk)).toFixed(0)}:1`);
  set('h-bank', `${Math.round(s.phi * 57.3)}°`); set('h-task', `${Math.round(pr.frac * 100)}%`); set('h-time', `${Math.floor(s.t / 60)}:${String(Math.floor(s.t % 60)).padStart(2, '0')}`); set('h-warp', `×${app.warp}`); }

function finish() {
  app.ended = true; const s = app.s, w = app.w, L = w.level, st = store(), p = s.landed ? parts(s, w) : null, sc = p ? p.total : 0, safe = !!s.landed;
  if (!safe) { crash(); app.shake = reduced() ? 0 : 14; puff(s.x, s.h, 40, '#c9a46a'); } else { fanfare(p.grade); puff(s.x, s.h + 5, 120, ACID); banner(s.ok ? `GRADE ${p.grade}` : 'SAFE LANDING', s.ok ? `${sc} points` : 'out in a field'); }
  $('result').hidden = false; st.flights = (st.flights || 0) + 1; const ok = safe && (s.ok || !w.finish);
  $('result-head').textContent = safe ? `${s.ok ? 'Task done' : 'Landed out'}. Grade ${p.grade}, ${sc} points.` : 'Flight over.'; $('result-grade').textContent = safe ? p.grade : '✕'; $('result-grade').dataset.g = safe ? p.grade : 'X';
  const km = (progress(w, s).done / 1000).toFixed(1); let txt = !safe ? s.fault.text : `${s.ok ? 'Home' : s.fault ? s.fault.text : 'Down safely'}: ${km} km in ${Math.floor(s.t / 60)} min, touching down at ${s.landed.sink.toFixed(1)} m/s${s.landed.spot != null ? `, ${s.landed.spot.toFixed(0)} m from the mark` : ''}${p.avgClimb ? `, climbing at ${p.avgClimb.toFixed(1)} m/s on average` : ''}.`;
  if (p) { $('result-parts').innerHTML = [['Route', p.route], ['Speed', p.speed], ['Landing', p.landing], ['Climb', p.climb], ['Smooth', p.smooth]].map(([a, q]) => `<div><b>${q}</b><span>${a}</span></div>`).join('') + `<div><b>×${p.mult.toFixed(2)}</b><span>Level</span></div>`; $('result-parts').hidden = false; } else $('result-parts').hidden = true;
  st.best = st.best || {}; st.grade = st.grade || {};
  if (L.daily) { const rec = {no: L.no, ok: ok, score: sc, grade: p?.grade, km, min: Math.round(s.t / 60), lost: ok ? '' : s.fault.text, grid: p ? [p.route / 400, p.speed / 150, p.landing / 250, p.climb / 100, p.smooth / 100] : [0, 0, 0, 0, 0]};
    if (!app.daily.practice && DAILY.put(L.date, rec)) txt += ' That was your scored try for today. Fly again to practise.'; else txt += ' Practice flight, not scored.'; app.daily.practice = true; }
  else if (ok && sc > (st.best[L.id] || 0)) { st.best[L.id] = sc; st.grade[L.id] = p.grade; txt += ' A new personal best.'; }
  $('result-text').textContent = txt; write(KEY, st);
  const i = LEVELS.findIndex(l => l.id === L.id), nx = LEVELS[i + 1]; $('next').hidden = !!L.daily || !ok || !nx; if (!$('next').hidden) $('next').textContent = `Next: ${nx.name} (N)`;
  app.share = `Glider thermals, ${L.name}\n${ok ? `Grade ${p.grade}, ${sc} points, ${km} km` : 'Flight over'}\n${SITE}`;
  const today = L.daily && DAILY.get(L.date); if (today) app.share = dailyCard(today); $('share').textContent = today ? 'Copy Daily Drop card' : 'Copy result'; showDailyResult(today);
  renderLevels(); setLevel(app.level); renderDaily(); $('again').focus({preventScroll: true});
  window.GliderGame.last = {daily: !!L.daily, ok, score: sc, grade: p?.grade || null, fault: s.fault?.k || null};
}

// Sound: off unless switched on. Wind noise rising with speed and the vario: beeps that quicken and rise as you climb, a low tone in sink.
function sound(dt = 0) { const st = store(); if (!st.sound) { if (app.audio) app.audio.out.gain.value = 0; return; }
  if (!app.audio) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; const ac = new AC(), out = ac.createGain(); out.connect(ac.destination);
    const b = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource(); src.buffer = b; src.loop = true; const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 500; const g = ac.createGain(); g.gain.value = 0; src.connect(f).connect(g).connect(out); src.start();
    const lo = ac.createOscillator(), lg = ac.createGain(); lo.type = 'sine'; lo.frequency.value = 220; lg.gain.value = 0; lo.connect(lg).connect(out); lo.start(); app.audio = {ac, out, buf: b, wind: {f, g}, lo, lg}; }
  const A = app.audio, s = app.s; if (A.ac.state === 'suspended') A.ac.resume(); A.out.gain.value = 0.7; const live = s && !s.done && !app.paused && !$('flight').hidden;
  A.wind.g.gain.value = live && !s.onGround ? 0.04 + Math.min(0.12, s.V / 500) + s.brake * 0.05 : 0; A.wind.f.frequency.value = 300 + s?.V * 12 || 300;
  A.lg.gain.value = live && s.vario < -1.5 && !s.onGround ? 0.02 : 0; A.lo.frequency.value = 260 + (s?.vario || 0) * 15;
  if (live && s.vario > 0.2 && !s.onGround) { app.beepT -= dt; if (app.beepT <= 0) { const v = Math.min(5, s.vario); app.beepT = 0.55 - v * 0.08; env(600 + v * 140, 0.08, app.beepT * 0.5, 'sine'); } } }
function env(f, g0, len, type = 'sine', delay = 0, f1) { const A = app.audio; if (!store().sound || !A) return; const t = A.ac.currentTime + delay, o = A.ac.createOscillator(), g = A.ac.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (f1) o.frequency.linearRampToValueAtTime(f1, t + len); g.gain.setValueAtTime(g0, t); g.gain.exponentialRampToValueAtTime(0.0001, t + len); o.connect(g).connect(A.out); o.start(t); o.stop(t + len + 0.05); }
function burst(len, g0, freq) { const A = app.audio; if (!store().sound || !A) return; const t = A.ac.currentTime, src = A.ac.createBufferSource(); src.buffer = A.buf; const f = A.ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq; const g = A.ac.createGain(); g.gain.setValueAtTime(g0, t); g.gain.exponentialRampToValueAtTime(0.0001, t + len); src.connect(f).connect(g).connect(A.out); src.start(t); src.stop(t + len); }
const chime = () => [660, 880, 1320].forEach((f, i) => env(f, 0.12, 0.5, 'sine', i * 0.09));
const fanfare = g => (g === 'S' ? [523, 659, 784, 1047, 1319] : g === 'A' ? [523, 659, 784, 1047] : [523, 659, 784]).forEach((f, i) => env(f, 0.13, 0.7, 'triangle', 0.3 + i * 0.12));
const thud = v => { env(80, 0.3 * Math.min(2, v) + 0.1, 0.3); burst(0.4, 0.2, 600); };
const buzz = () => env(180, 0.08, 0.4, 'square', 0, 150);
const crash = () => { burst(1.4, 0.6, 900); env(50, 0.5, 1); };

const HOLD = {a: 'l', A: 'l', ArrowLeft: 'l', d: 'r', D: 'r', ArrowRight: 'r', w: 'u', W: 'u', ArrowUp: 'u', s: 'd', S: 'd', ArrowDown: 'd', ' ': 'b'};
const pause = (on = !app.paused) => { if (!app.s || app.s.done) return; app.paused = on; $('paused').hidden = !on; if (!on) app.last = performance.now(); sound(); };
const cycleWarp = () => { app.warp = WARPS[(WARPS.indexOf(app.warp) + 1) % WARPS.length]; const st = store(); st.warp = app.warp; write(KEY, st); say(`Time ×${app.warp}. It drops to ×1 low down.`); };
addEventListener('keydown', e => { if (!app.s || $('flight').hidden) return; const k = HOLD[e.key], low = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (k && !app.s.done) { app.keys[k] = true; e.preventDefault(); } else if (low === 'p' || e.key === 'Escape') pause(); else if (low === 't') cycleWarp();
  else if (low === 'r' && app.s.done) again(); else if (low === 'n' && app.s.done && !$('next').hidden) next(); });
addEventListener('keyup', e => { const k = HOLD[e.key]; if (k) app.keys[k] = false; });
addEventListener('blur', () => { app.keys = {}; if (app.s && !app.s.done && !$('flight').hidden) pause(true); });
document.addEventListener('visibilitychange', () => { if (document.hidden && app.s && !app.s.done && !$('flight').hidden) pause(true); });
document.querySelectorAll('[data-hold]').forEach(b => { const k = b.dataset.hold; b.addEventListener('pointerdown', e => { e.preventDefault(); app.keys[k] = true; b.setPointerCapture?.(e.pointerId); sound(); }); ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => b.addEventListener(t, () => { app.keys[k] = false; })); });
const tap = (id, f) => $(id).addEventListener('click', f);
function next() { const i = LEVELS.findIndex(l => l.id === app.level); start(LEVELS[Math.min(LEVELS.length - 1, i + 1)].id); }
const again = () => app.daily ? startDaily() : start(app.level);
tap('play', () => start(app.level)); tap('again', again); tap('next', next); tap('warp', cycleWarp); tap('pause', () => pause()); tap('resume', () => pause(false)); tap('daily-play', startDaily);
tap('daily-copy', () => { const r = DAILY.get(ukDate()); if (r) copyShare(dailyCard(r)); }); tap('daily-share', () => { const r = DAILY.get(ukDate()); if (r) copyShare(dailyCard(r)); }); tap('share', () => copyShare(app.share));
tap('back', () => { cancelAnimationFrame(app.raf); if (app.audio) app.audio.out.gain.value = 0; app.s = null; $('flight').hidden = true; $('screen-title').hidden = false; document.body.dataset.screen = 'title'; renderLevels(); renderDaily(); });
$('sound').checked = !!store().sound; $('sound').addEventListener('change', e => { const st = store(); st.sound = e.target.checked; write(KEY, st); if (e.target.checked) sound(); });
{ const st = store(); app.trim = st.trim ?? true; app.warp = WARPS.includes(st.warp) ? st.warp : 3; $('trim').checked = app.trim; $('trim').addEventListener('change', e => { app.trim = e.target.checked; const q = store(); q.trim = app.trim; write(KEY, q); }); }
window.GliderGame = {flights: 0, last: null, state: () => app.s, world: () => app.w, level: () => app.level, levels: LEVELS.map(l => l.id), start: (id, o = {}) => { if ('trim' in o) app.trim = !!o.trim; start(id); }, startDaily, daily: () => dailyLevel(),
  dailyRecord: () => DAILY.get(ukDate()), dailyCard: () => { const r = DAILY.get(ukDate()); return r && dailyCard(r); }, pause, warp: n => { app.warp = n; }, testWarp: n => { app.testWarp = n; }, autopilot: f => { app.pilot = f; }, set: f => f(app.s, app.w), photo: on => { app.photo = !!on; }};
renderLevels(); setLevel(level(store().level || 'evening-glide').id); renderDaily(); tickDaily(); setInterval(tickDaily, 1000);
if (new URLSearchParams(location.search).has('daily')) startDaily();
