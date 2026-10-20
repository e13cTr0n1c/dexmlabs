// Tesla Roadster Thruster Game (fan-made). Screens, input, juice, sound and drawing. The physics lives in physics.js.
import {makeWorld, step, score, parts, grade, groundAt, CAR, MPH60, DT} from './physics.js';
import {LEVELS, MISSIONS, level} from './levels.js';
import {ukDate, countdown, grid, makeStore} from './daily.js';
import {dailyLevel} from './daily-level.js';
const $ = id => document.getElementById(id);
const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const KEY = 'roadster:stats', store = () => read(KEY, {best: {}, grade: {}, runs: 0});
const DAILY = makeStore('roadster:daily'), SITE = 'https://dexmlabs.app/tesla-roadster-thruster-game/';
const app = {w: null, s: null, keys: {}, raf: 0, last: 0, acc: 0, parts: [], pops: [], shake: 0, flash: 0, level: 'quarter', audio: null, paused: false, lights: 0, daily: null, ended: false, stars: null, cam: {x: 0, y: 0}};
const MODE = Object.fromEntries(MISSIONS.map(m => [m.id, m]));
const NOTES = {sprint: 'Hold D (or the right arrow) to drive. Space fires the rear thruster. Before a gap, raise the lift thrusters with W and keep the nose level with Q and E. X cuts the lift.',
  hover: 'W and S raise and lower the lift thrusters, and the setting stays where you leave it, like a throttle. Q and E lean the car and it holds the angle. Lean to drift sideways, then level off and land flat on the green pad. A and D drive and brake on the ground.',
  space: 'No road and no air. W, S, A and D fire the thrusters on the car to move up, down, back and forward, Q and E turn it, Space is the main boost along the nose. Collect every star, in any order, then stop on the beacon under 1.5 m/s.'};
const fmtBest = id => { const b = store().best?.[id]; return b ? `Best ${b} · ${store().grade?.[id] || ''}` : 'Not driven yet'; };
const say = t => { $('feedback').textContent = t; };

function renderMissions() {
  $('missions').innerHTML = MISSIONS.map(m => `<section class="mission" data-mission="${m.id}" aria-labelledby="m-${m.id}"><canvas class="preview" width="192" height="120" data-preview="${m.id}" aria-hidden="true"></canvas><div class="mission-body"><h2 id="m-${m.id}">${m.name}</h2><p class="muted">${m.blurb}</p><div class="levels">${LEVELS.filter(l => l.mode === m.id).map(l => `<button type="button" data-level="${l.id}" aria-pressed="${l.id === app.level}">${l.name} <span class="mult">×${l.mult}</span><small>${l.blurb}</small><small class="best">${fmtBest(l.id)}</small></button>`).join('')}</div></div></section>`).join('');
  document.querySelectorAll('[data-level]').forEach(b => b.addEventListener('click', () => setLevel(b.dataset.level)));
  document.querySelectorAll('[data-preview]').forEach(c => drawPreview(c));
}
function setLevel(id) { app.level = id; document.querySelectorAll('[data-level]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.level === id))); document.querySelectorAll('.mission').forEach(m => m.classList.toggle('picked', m.dataset.mission === level(id).mode)); const st = store(); st.level = id; write(KEY, st); $('play').innerHTML = `Drive ${level(id).name} <span aria-hidden="true">&rarr;</span>`; }

// Daily Drop: one scored run a day for everyone, then practice that doesn't count.
function dailyCard(rec) { const head = `Roadster Daily Drop #${rec.no} · ${MODE[rec.mode].name}`;
  if (!rec.ok) return `${head} 💥 ${rec.lost}\n${grid([0, 0, 0, 0, 0])}\n${SITE}?daily`;
  const what = rec.mode === 'sprint' ? `🏁 ${rec.time.toFixed(2)} s · 0-60 ${rec.t60 ? rec.t60.toFixed(2) + ' s' : 'n/a'}` : rec.mode === 'hover' ? `🛬 ${rec.impact.toFixed(1)} m/s · ${rec.tilt.toFixed(0)}° tilt` : `⭐ ${rec.items} · docked ${rec.impact.toFixed(1)} m/s`;
  return `${head} ${what} · grade ${rec.grade}\n${grid(rec.grid)} ${rec.score} pts\n${SITE}?daily`; }
function startDaily() { const L = dailyLevel(), done = DAILY.get(L.date); app.daily = {L, practice: !!done || L.no < 0}; start(L, L.seed); }
function renderDaily() {
  const L = dailyLevel(), rec = DAILY.get(L.date), pre = L.no < 0;
  $('daily-h').textContent = pre ? 'Daily Drop #0 arrives at midnight' : `Daily Drop #${L.no}`;
  $('daily-blurb').textContent = (pre ? 'Preview: ' : '') + `${MODE[L.mode].name}. ${L.blurb}`;
  $('daily-status').textContent = pre ? 'Practise the preview now. Scoring starts with #0.' : rec ? (rec.ok ? `Today: ${rec.score} points, grade ${rec.grade}. Practice runs don't count.` : `Today: ${rec.lost} Practice runs don't count.`) : 'One scored run today, the same for everyone. Then practise as much as you like.';
  $('daily-play').innerHTML = `${rec || pre ? 'Practise today\'s drop' : 'Drive today\'s drop'} <span aria-hidden="true">&rarr;</span>`;
  $('daily-share').hidden = !rec; $('daily').classList.toggle('played', !!rec);
}
function showDailyResult(rec) { const b = $('daily-result'); b.hidden = !rec; if (rec) { $('daily-card').textContent = dailyCard(rec); $('daily-result-next').textContent = `Next drop in ${countdown()}`; } }
function tickDaily() { $('daily-next').textContent = `Next drop in ${countdown()}`; if (!$('daily-result').hidden) $('daily-result-next').textContent = `Next drop in ${countdown()}`; if (app.dailyDate && app.dailyDate !== ukDate()) renderDaily(); app.dailyDate = ukDate(); }

// A run
function start(id, seed = 1) {
  cancelAnimationFrame(app.raf); const L = typeof id === 'object' ? id : level(id); if (!L.daily) { app.level = L.id; app.daily = null; }
  const w = makeWorld(L, seed); app.w = w; app.s = {...w.start}; app.keys = {}; app.parts = []; app.pops = []; app.shake = 0; app.flash = 0; app.paused = false; app.ended = false; app.acc = 0; app.last = performance.now();
  app.lights = w.mode === 'sprint' ? 1.6 : 0; app.cam = {x: app.s.x, y: app.s.y}; app.stars = null; app.trail = [];
  $('screen-title').hidden = true; $('flight').hidden = false; document.body.dataset.screen = 'flight'; document.body.dataset.mode = w.mode;
  $('result').hidden = true; $('paused').hidden = true; $('daily-result').hidden = true;
  $('flight-h').textContent = `${L.name}${L.daily && app.daily.practice ? ' (practice)' : ''}: ${L.blurb}`;
  $('level-note').textContent = (L.daily ? (app.daily.practice ? 'Practice: this run is not scored. ' : 'Your one scored run today. ') : '') + NOTES[w.mode];
  $('mode-eyebrow').textContent = MODE[w.mode].name;
  document.querySelectorAll('[data-modes]').forEach(b => { b.hidden = !b.dataset.modes.split(' ').includes(w.mode); });
  say(w.mode === 'sprint' ? 'Lights. Hold D to launch.' : w.mode === 'hover' ? 'Raise the lift thrusters with W.' : 'Drifting. Head for the first star.');
  window.RoadsterGame.runs++; hud(); draw(); $('sky').focus({preventScroll: true});
  if (matchMedia('(max-width: 760px)').matches) $('sky').scrollIntoView({block: 'start'});
  app.raf = requestAnimationFrame(loop); sound();
}
function input() { const k = app.keys; return {up: !!k.up, down: !!k.down, left: !!k.left, right: !!k.right, rl: !!k.rl, rr: !!k.rr, boost: !!k.boost, cut: !!k.cut}; }
function loop(now) {
  const dt = Math.min(0.1, (now - app.last) / 1000); app.last = now;
  if (!app.paused && app.s && !app.s.done) {
    if (app.lights > 0) { app.lights -= dt; if (app.lights <= 0) { say('Go!'); pop('GO', 0, 0, '#d6ff00', true); blip(880, 0.15); } else if (Math.ceil(app.lights / 0.5) !== Math.ceil((app.lights + dt) / 0.5)) blip(440, 0.08); }
    else { app.acc += dt; let n = 0; while (app.acc >= DT && n < 8) { const pv = app.s; app.s = step(app.w, app.s, input()); app.keys.cut = false; juice(pv, app.s); app.acc -= DT; n++; if (app.s.done) break; } }
  }
  tickParts(dt); draw(); if ((app.f = (app.f || 0) + 1) % 6 === 0) hud(); sound();
  if (app.s?.done && !app.ended) { app.ended = true; hud(); setTimeout(finish, app.s.ok ? 700 : 900); }
  app.raf = requestAnimationFrame(loop);
}
// Juice: puffs, dust, sparks, shake, pop-up text and a few blips.
function puff(x, y, vx, vy, n, col, life = 0.6, size = 0.5) { if (reduced()) n = Math.ceil(n / 3); for (let i = 0; i < n; i++) app.parts.push({x, y, vx: vx + (Math.random() - 0.5) * 3, vy: vy + (Math.random() - 0.5) * 3, life, max: life, col, size: size * (0.6 + Math.random() * 0.8)}); }
function pop(text, x, y, col = '#fff', screen = false) { app.pops.push({text, x, y, col, t: 0, screen}); }
function juice(p, s) {
  const ca = Math.cos(s.a), sa = Math.sin(s.a), at = (lx, ly) => [s.x + lx * ca - ly * sa, s.y + lx * sa + ly * ca];
  if (s.boostOn) { const [x, y] = at(-2.2, 0.05); puff(x, y, s.vx - ca * 30, s.vy - sa * 30, 2, '#dfe8ff', 0.45, 0.7); }
  if (s.liftOn > 0.05) for (const lx of [-1.5, 1.5]) { const [x, y] = at(lx, -0.5); puff(x, y, s.vx + sa * 18 * s.liftOn, s.vy - ca * 18 * s.liftOn, 1, '#f0f4ff', 0.5, 0.6); }
  if (Math.abs(s.rcsOn) > 0.3 && Math.random() < 0.5) { const side = s.rcsOn > 0 ? 1 : -1, [x, y] = at(2.1, 0.3 * side); puff(x, y, s.vx - sa * side * 6, s.vy + ca * side * -6, 1, '#ffffff', 0.25, 0.3); }
  if (s.thr) { const {bx, by} = s.thr; if (bx) { const [x, y] = at(bx > 0 ? -2.2 : 2.2, 0); puff(x, y, s.vx - Math.sign(bx) * ca * 10, s.vy - Math.sign(bx) * sa * 10, 1, '#e6f0ff', 0.4, 0.4); } if (by) { const [x, y] = at(0, by > 0 ? -0.6 : 0.7); puff(x, y, s.vx + Math.sign(by) * sa * 10, s.vy - Math.sign(by) * ca * 10, 1, '#e6f0ff', 0.4, 0.4); } }
  if (s.contact && Math.abs(s.vx) > 30 && Math.random() < 0.3) puff(s.x - 1.4, s.y - 0.8, s.vx * 0.6, 1, 1, '#8a8574', 0.4, 0.4);
  for (const e of s.events) {
    if (e === 'land') { const t = s.touches[s.touches.length - 1]; app.shake = Math.min(14, 2 + t.impact * 1.6); puff(s.x, s.y - 0.8, 0, 2, 14, '#a39a80', 0.7, 0.6); blip(90 + t.impact * 10, 0.12, 'triangle');
      if (app.w.mode !== 'sprint' || t.impact > 0) pop(t.tilt < 0.06 && t.impact < 2.5 ? 'FLAT LANDING!' : t.impact < 4 ? 'Nice' : 'Oof', s.x, s.y + 3, t.tilt < 0.06 && t.impact < 2.5 ? '#d6ff00' : '#fff'); }
    if (e === 'item') { const i = s.got.findIndex((g, j) => g && !p.got[j]), it = app.w.items[i]; for (let k = 0; k < 18; k++) puff(it.x, it.y, 0, 0, 1, k % 2 ? '#ffd84a' : '#fff', 0.8, 0.5); const n = s.got.filter(Boolean).length; pop(`★ ${n}/${s.got.length}`, it.x, it.y + 6, '#ffd84a'); blip(660 + n * 80, 0.12); say(n === s.got.length ? 'Every star. Now stop on the beacon.' : `${s.got.length - n} to go.`); }
    if (e === 'finish' || e === 'parked' || e === 'dock') { app.flash = 1; for (let k = 0; k < 60; k++) puff(s.x, s.y + 2, (Math.random() - 0.5) * 30, Math.random() * 20, 1, ['#d6ff00', '#ff4a3d', '#ffffff', '#ffd84a'][k % 4], 1.4, 0.5); blip(520, 0.1); setTimeout(() => blip(780, 0.18), 120); }
    if (e === 'fault') { app.shake = 18; for (let k = 0; k < 30; k++) puff(s.x, s.y, s.vx * 0.3, 4, 1, k % 2 ? '#ff8a3d' : '#ffe08a', 0.9, 0.5); blip(60, 0.4, 'sawtooth'); }
  }
  if (app.w.mode === 'sprint' && s.t60 && !p.t60) { pop(`0-60 in ${s.t60.toFixed(2)} s`, s.x, s.y + 4, '#d6ff00'); say(`0 to 60 mph in ${s.t60.toFixed(2)} s.`); }
  if (s.t > 0 && Math.floor(s.t * 6) !== Math.floor(p.t * 6)) app.trail.push([s.x, s.y]); if (app.trail.length > 120) app.trail.shift();
}
function tickParts(dt) { const sp = app.w?.mode === 'space'; for (const q of app.parts) { q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; if (!sp) { q.vx *= 0.96; q.vy = q.vy * 0.96 + 2 * dt; } } app.parts = app.parts.filter(q => q.life > 0).slice(-600);
  for (const p of app.pops) p.t += dt; app.pops = app.pops.filter(p => p.t < 1.4); app.shake *= Math.pow(0.02, dt); app.flash = Math.max(0, app.flash - dt * 1.5); }

// Heads up display
function hud() { const s = app.s, w = app.w; if (!s) return; const v = Math.hypot(s.vx, s.vy);
  const set = (id, t) => { const e = $(id); if (e && e.textContent !== t) e.textContent = t; };
  set('h-speed', `${Math.round(v * 2.23694)} mph`); set('h-ms', `${v.toFixed(1)} m/s`);
  set('h-gas', `${Math.round(s.gas / w.gas * 100)}%`); set('h-tilt', `${Math.round(s.a * 180 / Math.PI)}°`); set('h-time', `${s.t.toFixed(1)} s`);
  if (w.mode === 'sprint') { set('h-a', s.t60 ? `${s.t60.toFixed(2)} s` : '...'); set('h-a-l', '0 to 60 mph'); set('h-b', `${Math.max(0, Math.round(w.finish - s.x))} m`); set('h-b-l', 'To the line'); set('h-c', `${Math.round(s.lift * 100)}%`); set('h-c-l', 'Lift thrusters'); }
  else if (w.mode === 'hover') { const g = groundAt(w, s.x, s.y), hb = s.y + CAR.wy; set('h-a', g === null ? 'gap' : `${Math.max(0, hb - g).toFixed(1)} m`); set('h-a-l', 'Height'); set('h-b', `${(w.pad.x - s.x).toFixed(1)} m`); set('h-b-l', 'To the pad'); set('h-c', `${Math.round(s.lift * 100)}%`); set('h-c-l', 'Lift thrusters'); }
  else { const n = s.got.filter(Boolean).length, all = n === s.got.length, T = w.target; set('h-a', `${n} / ${s.got.length}`); set('h-a-l', 'Stars'); set('h-b', all ? `${Math.hypot(T.x - s.x, T.y - s.y).toFixed(0)} m` : '...'); set('h-b-l', 'To the beacon'); set('h-c', s.boostOn ? 'BOOST' : 'RCS'); set('h-c-l', 'Thrusters'); }
  $('h-gas').parentElement.classList.toggle('warn', s.gas / w.gas < 0.15); }

// The end of a run
const LOST = {fell: 'Into the gap.', flip: 'On its roof.', hard: 'Landed too hard.', crash: 'Crunched.', wall: 'Into the wall.', time: 'Out of time.', lost: 'Lost in space.'};
function finish() {
  const s = app.s, w = app.w, L = w.level, sc = score(s, w), g = s.ok ? grade(sc, w) : '-', P = parts(s, w);
  $('result').hidden = false; const st = store(); st.runs = (st.runs || 0) + 1;
  let head, txt;
  if (s.ok) { head = w.mode === 'sprint' ? `Across the line. ${sc} points, grade ${g}.` : w.mode === 'hover' ? `Parked on the pad. ${sc} points, grade ${g}.` : `Docked on the beacon. ${sc} points, grade ${g}.`;
    txt = w.mode === 'sprint' ? `${s.t.toFixed(2)} s, 0 to 60 mph in ${s.t60 ? s.t60.toFixed(2) + ' s' : 'n/a'}, ${Math.round(s.vx * 2.23694)} mph at the line, ${Math.round(s.gas / w.gas * 100)}% gas left.`
      : w.mode === 'hover' ? `Touched down at ${s.touch.impact.toFixed(1)} m/s, ${(s.touch.tilt * 180 / Math.PI).toFixed(0)}° from flat, ${s.touch.dist.toFixed(1)} m from the centre, ${Math.round(s.gas / w.gas * 100)}% gas left, ${s.t.toFixed(1)} s.`
      : `${s.got.length} stars, docked at ${s.touch.impact.toFixed(1)} m/s, ${s.touch.dist.toFixed(1)} m from the centre, ${Math.round(s.gas / w.gas * 100)}% gas left, ${s.t.toFixed(0)} s.`;
    if (!L.daily && sc > (st.best[L.id] || 0)) { st.best[L.id] = sc; st.grade[L.id] = g; txt += ' A new best on this device.'; } }
  else { head = LOST[s.fault.k] || 'Run over.'; txt = s.fault.k === 'fell' ? 'Raise the lift thrusters a little before the edge, and keep the nose level.' : s.fault.k === 'hard' ? 'Come down under 9 m/s. Ease the lift up as you get close.' : s.fault.k === 'flip' || s.fault.k === 'crash' ? 'Keep it level with Q and E. Land flat on the wheels.' : s.fault.k === 'wall' ? 'Climb above the next platform before you drift over to it.' : s.fault.k === 'time' ? 'Keep moving. A gentle push and a long drift saves gas.' : 'Turn back sooner.'; }
  write(KEY, st);
  $('result-parts').hidden = !P; if (P) $('result-parts').innerHTML = Object.entries(P).map(([k, f]) => `<div><b>${Math.round(f * 100)}%</b><span>${k}</span></div>`).join('');
  if (L.daily) { const rec = {no: L.no, mode: w.mode, ok: !!s.ok, score: sc, grade: g, grid: P ? Object.values(P) : [0, 0, 0, 0, 0], time: s.t, t60: s.t60, impact: s.touch?.impact || 0, tilt: (s.touch?.tilt || 0) * 180 / Math.PI, items: s.got.filter(Boolean).length, lost: head};
    if (!app.daily.practice && DAILY.put(L.date, rec)) txt += ' That was your scored run for today. Go again to practise.'; else txt += ' Practice run, not scored.'; app.daily.practice = true; renderDaily(); }
  $('result-head').textContent = head; $('result-text').textContent = txt; say(head);
  const i = LEVELS.findIndex(l => l.id === L.id), nx = LEVELS[i + 1]; $('next').hidden = !!L.daily || !s.ok || !nx; if (!$('next').hidden) $('next').textContent = `Next: ${nx.name} (N)`;
  app.share = `Tesla Roadster Thruster Game (fan-made), ${L.name}\n${s.ok ? `${sc} points, grade ${g}${w.mode === 'sprint' ? `, ${s.t.toFixed(2)} s` : ''}` : head}\n${SITE}`;
  const today = L.daily && DAILY.get(L.date); if (today) app.share = dailyCard(today); $('share').textContent = today ? 'Copy Daily Drop card' : 'Copy result'; showDailyResult(today);
  window.RoadsterGame.last = {daily: !!L.daily, ok: !!s.ok, score: sc, grade: g, fault: s.fault?.k || null, t: s.t, t60: s.t60};
  $('result-head').focus({preventScroll: true}); $('result').scrollIntoView({block: 'nearest'});
}
async function copyShare(t) { try { await navigator.clipboard.writeText(t); say('Copied.'); } catch { const a = $('share-text'); a.hidden = false; a.value = t; a.select(); say('Select and copy the text below.'); } }

// Sound: off unless switched on. All made here with WebAudio, no files.
function sound() {
  const on = !!store().sound; if (!on) { if (app.audio) app.audio.out.gain.value = 0; return; }
  if (!app.audio) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; const ac = new AC(), out = ac.createGain(); out.connect(ac.destination);
    const b = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const hiss = (f, q) => { const src = ac.createBufferSource(); src.buffer = b; src.loop = true; const fl = ac.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.value = f; fl.Q.value = q; const g = ac.createGain(); g.gain.value = 0; src.connect(fl).connect(g).connect(out); src.start(); return g; };
    const o = ac.createOscillator(), og = ac.createGain(); o.type = 'sawtooth'; o.frequency.value = 60; og.gain.value = 0; o.connect(og).connect(out); o.start();
    app.audio = {ac, out, boost: hiss(900, 0.5), lift: hiss(2200, 0.8), rcs: hiss(5000, 2), motor: og, osc: o}; }
  const A = app.audio, s = app.s; if (A.ac.state === 'suspended') A.ac.resume(); const live = s && !s.done && !app.paused && !$('flight').hidden;
  A.out.gain.value = live ? 0.5 : 0; if (!live) return; const t = A.ac.currentTime;
  A.boost.gain.setTargetAtTime(s.boostOn ? 0.5 : 0, t, 0.03); A.lift.gain.setTargetAtTime((s.liftOn || 0) * 0.3 + (s.thr && (s.thr.bx || s.thr.by) ? 0.2 : 0), t, 0.03); A.rcs.gain.setTargetAtTime(Math.abs(s.rcsOn) > 0.2 ? 0.08 : 0, t, 0.03);
  const v = Math.abs(s.vx); A.motor.gain.setTargetAtTime(app.w.mode === 'space' ? 0 : app.keys.right && s.contact ? 0.05 : 0.015, t, 0.05); A.osc.frequency.setTargetAtTime(50 + v * 6, t, 0.05);
}
function blip(f, len, type = 'sine') { const A = app.audio; if (!A || !store().sound) return; const o = A.ac.createOscillator(), g = A.ac.createGain(), t = A.ac.currentTime; o.type = type; o.frequency.value = f; g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.001, t + len); o.connect(g).connect(A.out); o.start(t); o.stop(t + len + 0.02); }

// Drawing
const cv = $('sky'), cx = cv.getContext('2d');
function drawCar(c, s, ppm, opt = {}) {
  c.save(); c.scale(ppm, -ppm); c.rotate(s.a); const red = '#d11f1f';
  // Thruster flames, under the body.
  if (s.boostOn) { const L = 2.2 + Math.random() * 1.2; const g = c.createLinearGradient(-2.2, 0, -2.2 - L, 0); g.addColorStop(0, 'rgba(230,240,255,.95)'); g.addColorStop(1, 'rgba(160,200,255,0)'); c.fillStyle = g; c.beginPath(); c.moveTo(-2.15, 0.25); c.lineTo(-2.2 - L, 0.05); c.lineTo(-2.15, -0.15); c.fill(); }
  if (s.liftOn > 0.05) for (const lx of [-1.5, 1.5]) { const L = 0.6 + s.liftOn * 1.6 + Math.random() * 0.3, g = c.createLinearGradient(0, -0.45, 0, -0.45 - L); g.addColorStop(0, 'rgba(235,242,255,.9)'); g.addColorStop(1, 'rgba(200,220,255,0)'); c.fillStyle = g; c.beginPath(); c.moveTo(lx - 0.18, -0.45); c.lineTo(lx, -0.45 - L); c.lineTo(lx + 0.18, -0.45); c.fill(); }
  // Body: a generic low wedge, not a real body shape or logo.
  c.fillStyle = red; c.beginPath(); c.moveTo(-2.15, -0.35); c.lineTo(-2.2, 0.15); c.quadraticCurveTo(-1.9, 0.42, -1.2, 0.45); c.lineTo(-0.7, 0.5); c.quadraticCurveTo(-0.1, 0.95, 0.55, 0.85); c.quadraticCurveTo(1.0, 0.7, 1.45, 0.45); c.quadraticCurveTo(2.0, 0.32, 2.2, 0.05); c.lineTo(2.15, -0.3); c.closePath(); c.fill();
  c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(-1.9, 0.12, 3.8, 0.06);
  c.fillStyle = '#1b2430'; c.beginPath(); c.moveTo(-0.55, 0.52); c.quadraticCurveTo(-0.05, 0.9, 0.5, 0.82); c.quadraticCurveTo(0.85, 0.7, 1.1, 0.52); c.closePath(); c.fill();
  c.fillStyle = '#ffd9a0'; c.fillRect(2.05, -0.02, 0.14, 0.12); c.fillStyle = '#ff2a2a'; c.fillRect(-2.22, 0.02, 0.08, 0.1);
  c.fillStyle = '#20262c'; c.fillRect(-2.3, -0.36, 0.3, 0.1); // rear thruster nozzle
  if (opt.driver) { // A generic mannequin in a white suit, arm on the door. No logos.
    c.fillStyle = '#eef0f2'; c.beginPath(); c.ellipse(-0.25, 0.85, 0.24, 0.3, 0, 0, 7); c.fill(); c.beginPath(); c.arc(-0.2, 1.28, 0.22, 0, 7); c.fill();
    c.fillStyle = '#26303b'; c.beginPath(); c.ellipse(-0.08, 1.29, 0.12, 0.11, 0, 0, 7); c.fill(); c.strokeStyle = '#eef0f2'; c.lineWidth = 0.13; c.lineCap = 'round'; c.beginPath(); c.moveTo(-0.2, 0.92); c.lineTo(0.15, 0.62); c.lineTo(0.45, 0.6); c.stroke(); }
  for (const lx of [-1.35, 1.35]) { c.save(); c.translate(lx, -0.45); c.fillStyle = '#111'; c.beginPath(); c.arc(0, 0, 0.36, 0, 7); c.fill(); c.rotate(-(s.x || 0) / 0.36); c.strokeStyle = '#9aa3ab'; c.lineWidth = 0.06; for (let k = 0; k < 5; k++) { c.rotate(1.2566); c.beginPath(); c.moveTo(0, 0); c.lineTo(0.24, 0); c.stroke(); } c.restore(); }
  c.restore();
}
function drawPreview(c) { const x = c.getContext('2d'), m = c.dataset.preview; x.clearRect(0, 0, c.width, c.height);
  const g = x.createLinearGradient(0, 0, 0, c.height); g.addColorStop(0, m === 'space' ? '#03040a' : '#1c2a44'); g.addColorStop(1, m === 'space' ? '#0b1020' : '#c86b3c'); x.fillStyle = g; x.fillRect(0, 0, c.width, c.height);
  if (m === 'space') { x.fillStyle = '#2f6fd1'; x.beginPath(); x.arc(150, 100, 46, 0, 7); x.fill(); for (let i = 0; i < 30; i++) { x.fillStyle = '#fff'; x.fillRect((i * 53) % 192, (i * 37) % 120, 1, 1); } }
  else { x.fillStyle = '#2b2622'; if (m === 'hover') { x.fillRect(0, 95, 70, 25); x.fillRect(120, 70, 72, 50); } else x.fillRect(0, 90, 192, 30); }
  x.save(); x.translate(m === 'hover' ? 96 : 90, m === 'space' ? 60 : m === 'hover' ? 62 : 76); drawCar(x, {a: m === 'hover' ? -0.08 : m === 'space' ? 0.3 : 0.05, x: 0, boostOn: m !== 'hover', liftOn: m === 'hover' ? 0.8 : 0}, 14, {driver: m === 'space'}); x.restore(); }
function starsFor(w) { if (app.stars) return app.stars; const r = []; let a = w.seed + 7; const rnd = () => (a = (a * 16807) % 2147483647) / 2147483647; for (let i = 0; i < 220; i++) r.push([rnd(), rnd(), rnd()]); return app.stars = r; }
function draw() {
  const s = app.s, w = app.w; if (!s) return; const W = cv.width, H = cv.height, sp = w.mode === 'space', ppm = sp ? 18 : w.mode === "sprint" ? 20 : 22;
  const lead = sp ? 0 : w.mode === 'sprint' ? Math.min(14, s.vx * 0.12) : 0;
  app.cam.x += (s.x + lead - app.cam.x) * 0.15; app.cam.y += (s.y + (sp ? 0 : 2.5) - app.cam.y) * 0.12; if (!sp && w.mode === 'sprint') app.cam.y = s.y + 3;
  const sh = reduced() ? 0 : app.shake, ox = (Math.random() - 0.5) * sh, oy = (Math.random() - 0.5) * sh;
  const X = x => W / 2 + (x - app.cam.x) * ppm + ox, Y = y => H * 0.55 - (y - app.cam.y) * ppm + oy;
  // Sky
  const g = cx.createLinearGradient(0, 0, 0, H);
  if (sp) { g.addColorStop(0, '#02030a'); g.addColorStop(1, '#070b18'); } else if (w.mode === 'sprint') { g.addColorStop(0, '#13223f'); g.addColorStop(0.7, '#e0814a'); g.addColorStop(1, '#f2b26b'); } else { g.addColorStop(0, '#0e1a33'); g.addColorStop(1, '#5a6f96'); }
  cx.fillStyle = g; cx.fillRect(0, 0, W, H);
  if (sp) { for (const [a, b, c] of starsFor(w)) { const px = ((a * W * 3 - app.cam.x * ppm * 0.05 * (0.3 + c)) % W + W) % W, py = ((b * H * 3 + app.cam.y * ppm * 0.05 * (0.3 + c)) % H + H) % H; cx.fillStyle = `rgba(255,255,255,${0.3 + c * 0.7})`; cx.fillRect(px, py, c > 0.85 ? 2 : 1, c > 0.85 ? 2 : 1); }
    // Far planets: Earth or Mars as a backdrop, drifting slowly.
    const far = w.level.sky === 'mars' ? null : {x: W * 0.78 - app.cam.x * 0.3, y: H * 0.78 + app.cam.y * 0.3, r: 210};
    if (far) { const e = cx.createRadialGradient(far.x - 60, far.y - 70, 20, far.x, far.y, far.r); e.addColorStop(0, '#6fb2ff'); e.addColorStop(0.6, '#2a62c4'); e.addColorStop(1, '#0d2a63'); cx.fillStyle = e; cx.beginPath(); cx.arc(far.x, far.y, far.r, 0, 7); cx.fill(); cx.fillStyle = 'rgba(70,150,80,.75)'; cx.beginPath(); cx.ellipse(far.x - 40, far.y - 20, 70, 40, 0.5, 0, 7); cx.fill(); cx.fillStyle = 'rgba(255,255,255,.55)'; cx.beginPath(); cx.ellipse(far.x + 30, far.y - 120, 90, 14, -0.2, 0, 7); cx.fill(); cx.strokeStyle = 'rgba(120,180,255,.35)'; cx.lineWidth = 8; cx.beginPath(); cx.arc(far.x, far.y, far.r + 4, 0, 7); cx.stroke();
      const mx = W * 0.15 - app.cam.x * 0.1, my = H * 0.2 + app.cam.y * 0.1; cx.fillStyle = '#c1502e'; cx.beginPath(); cx.arc(mx, my, 16, 0, 7); cx.fill(); }
    for (const b of w.bodies) { const r = b.r * ppm, px = X(b.x), py = Y(b.y), m = cx.createRadialGradient(px - r * 0.3, py - r * 0.35, r * 0.1, px, py, r); m.addColorStop(0, '#f08a55'); m.addColorStop(0.7, '#b9472a'); m.addColorStop(1, '#5e1d10'); cx.fillStyle = m; cx.beginPath(); cx.arc(px, py, r, 0, 7); cx.fill(); cx.fillStyle = 'rgba(80,20,10,.35)'; cx.beginPath(); cx.ellipse(px + r * 0.2, py + r * 0.1, r * 0.4, r * 0.12, 0.3, 0, 7); cx.fill(); cx.fillStyle = 'rgba(255,255,255,.7)'; cx.beginPath(); cx.ellipse(px, py - r * 0.93, r * 0.25, r * 0.06, 0, 0, 7); cx.fill(); }
    // Trail, stars to collect, the beacon and an arrow to what is next.
    cx.strokeStyle = 'rgba(214,255,0,.25)'; cx.lineWidth = 1.5; cx.beginPath(); app.trail.forEach(([x, y], i) => i ? cx.lineTo(X(x), Y(y)) : cx.moveTo(X(x), Y(y))); cx.stroke();
    const tt = performance.now() / 1000; w.items.forEach((it, i) => { if (s.got[i]) return; const px = X(it.x), py = Y(it.y), r = 13 + Math.sin(tt * 4 + i) * 2; cx.fillStyle = '#ffd84a'; cx.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5 + tt * 0.6, rr = k % 2 ? r * 0.45 : r; cx.lineTo(px + Math.cos(a) * rr, py + Math.sin(a) * rr); } cx.fill(); });
    const T = w.target, all = s.got.every(Boolean), bx = X(T.x), by = Y(T.y); cx.strokeStyle = all ? '#d6ff00' : 'rgba(214,255,0,.35)'; cx.lineWidth = 3; cx.setLineDash([8, 6]); cx.beginPath(); cx.arc(bx, by, T.r * ppm, 0, 7); cx.stroke(); cx.setLineDash([]); cx.fillStyle = all && Math.sin(tt * 6) > 0 ? '#d6ff00' : '#56620a'; cx.beginPath(); cx.arc(bx, by, 5, 0, 7); cx.fill();
    let gi = -1, best = 1e9; w.items.forEach((it, j) => { const d = Math.hypot(it.x - s.x, it.y - s.y); if (!s.got[j] && d < best) { best = d; gi = j; } }); const goal = gi >= 0 ? w.items[gi] : T, ang = Math.atan2(-(goal.y - s.y), goal.x - s.x), d = Math.hypot(goal.x - s.x, goal.y - s.y);
    if (d * ppm > 60) { cx.save(); cx.translate(X(s.x) + Math.cos(ang) * 48, Y(s.y) + Math.sin(ang) * 48); cx.rotate(ang); cx.fillStyle = gi >= 0 ? '#ffd84a' : '#d6ff00'; cx.beginPath(); cx.moveTo(10, 0); cx.lineTo(-6, -7); cx.lineTo(-6, 7); cx.fill(); cx.restore(); cx.fillStyle = '#fff'; cx.font = '12px ui-monospace,monospace'; cx.fillText(`${d.toFixed(0)} m`, X(s.x) + Math.cos(ang) * 64 - 14, Y(s.y) + Math.sin(ang) * 64 + 4); }
  } else {
    // Hills far off, then the road blocks.
    cx.fillStyle = w.mode === 'sprint' ? 'rgba(90,50,40,.55)' : 'rgba(30,40,70,.6)'; cx.beginPath(); cx.moveTo(0, H); for (let x = 0; x <= W; x += 20) { const wx = x + app.cam.x * ppm * 0.15; cx.lineTo(x, H * 0.6 - 40 * Math.sin(wx / 160) - 25 * Math.sin(wx / 57)); } cx.lineTo(W, H); cx.fill();
    if (w.mode === 'sprint' && Math.abs(s.vx) > 25 && !reduced()) { cx.strokeStyle = 'rgba(255,255,255,.18)'; cx.lineWidth = 1; for (let i = 0; i < 14; i++) { const y = (i * 97 + 13) % H, x = ((i * 211 - app.cam.x * ppm * 1.3) % W + W) % W; cx.beginPath(); cx.moveTo(x, y); cx.lineTo(x + s.vx * 1.2, y); cx.stroke(); } }
    for (const [i, p] of w.plats.entries()) { const x0 = X(p.x0), x1 = X(p.x1), y = Y(p.y); cx.fillStyle = '#2b2622'; cx.fillRect(x0, y, x1 - x0, H - y + 40); cx.fillStyle = '#4a433b'; cx.fillRect(x0, y, x1 - x0, 5);
      if (w.mode === 'sprint') { cx.fillStyle = 'rgba(255,255,255,.6)'; for (let m = Math.ceil(p.x0 / 8) * 8; m < p.x1; m += 8) cx.fillRect(X(m), y + 1, 3 * ppm / 4, 2); }
      if (w.mode === 'hover' && i === w.pad.plat) { cx.fillStyle = s.settle > 0 ? '#d6ff00' : 'rgba(214,255,0,.7)'; cx.fillRect(X(w.pad.x - w.pad.half), y - 2, w.pad.half * 2 * ppm, 6); cx.fillStyle = '#d6ff00'; cx.fillRect(X(w.pad.x) - 1, y - 10, 3, 10); } }
    if (w.mode === 'sprint') { const fx = X(w.finish), fy = Y(groundAt(w, w.finish) ?? 0); for (let k = 0; k < 8; k++) for (let j = 0; j < 2; j++) { cx.fillStyle = (k + j) % 2 ? '#111' : '#fff'; cx.fillRect(fx + j * 6, fy - 60 + k * 7.5, 6, 7.5); } cx.fillStyle = '#ddd'; cx.fillRect(fx - 2, fy - 64, 2, 64);
      for (const m of [100, 200, 300]) if (m < w.finish) { cx.fillStyle = 'rgba(255,255,255,.7)'; cx.font = '12px ui-monospace,monospace'; cx.fillText(`${m} m`, X(m), Y(groundAt(w, m) ?? 0) - 14); } }
    if (w.wind) { cx.fillStyle = '#fff'; cx.font = '13px ui-monospace,monospace'; cx.fillText(`Wind ${w.wind < 0 ? '←' : '→'} ${Math.abs(w.wind).toFixed(2)} m/s²`, 16, H - 16); }
  }
  for (const q of app.parts) { cx.globalAlpha = Math.max(0, q.life / q.max) * 0.8; cx.fillStyle = q.col; const r = q.size * ppm * (1.6 - q.life / q.max); cx.beginPath(); cx.arc(X(q.x), Y(q.y), Math.max(1, r), 0, 7); cx.fill(); } cx.globalAlpha = 1;
  cx.save(); cx.translate(X(s.x), Y(s.y)); drawCar(cx, s, ppm, {driver: sp}); cx.restore();
  for (const p of app.pops) { const a = Math.max(0, 1 - p.t / 1.4); cx.globalAlpha = a; cx.fillStyle = p.col; cx.font = `900 ${p.screen ? 64 : 22}px "Arial Black",Arial,sans-serif`; cx.textAlign = 'center'; cx.fillText(p.text, p.screen ? W / 2 : X(p.x), p.screen ? H * 0.4 : Y(p.y) - p.t * 30); cx.textAlign = 'start'; } cx.globalAlpha = 1;
  if (app.lights > 0) { const lit = Math.min(3, Math.floor((1.6 - app.lights) / 0.5) + 1); for (let k = 0; k < 3; k++) { cx.fillStyle = k < lit ? '#ffb000' : '#3a3020'; cx.beginPath(); cx.arc(W / 2 - 50 + k * 50, 60, 16, 0, 7); cx.fill(); } }
  if (app.flash > 0) { cx.fillStyle = `rgba(214,255,0,${app.flash * 0.2})`; cx.fillRect(0, 0, W, H); }
  // Gauges on the picture: speed and gas.
  const v = Math.hypot(s.vx, s.vy); cx.fillStyle = 'rgba(0,0,0,.45)'; cx.fillRect(12, 12, 190, 58); cx.fillStyle = '#fff'; cx.font = '900 26px "Arial Black",Arial,sans-serif'; cx.fillText(`${Math.round(v * 2.23694)} mph`, 22, 44); cx.font = '11px ui-monospace,monospace'; cx.fillText('GAS', 22, 62); cx.fillStyle = '#333'; cx.fillRect(52, 54, 140, 8); cx.fillStyle = s.gas / w.gas < 0.15 ? '#ff6a3d' : '#d6ff00'; cx.fillRect(52, 54, 140 * s.gas / w.gas, 8);
}
function pause(on = !app.paused) { if (!app.s || app.s.done) return; app.paused = on; $('paused').hidden = !on; app.keys = {}; if (!on) app.last = performance.now(); sound(); }

// Keys: Booster style. W/S thrust, Q/E lean, A/D drive (or translate in space), Space boost, X cut.
const HOLD = {w: 'up', arrowup: 'up', s: 'down', arrowdown: 'down', a: 'left', arrowleft: 'left', d: 'right', arrowright: 'right', q: 'rl', e: 'rr', ' ': 'boost'};
addEventListener('keydown', e => { if ($('flight').hidden || e.metaKey || e.ctrlKey || e.altKey) return; const low = e.key.toLowerCase(), k = HOLD[low];
  if (k) { e.preventDefault(); app.keys[k] = true; sound(); return; }
  if (low === 'x') app.keys.cut = true; else if (low === 'p' || e.key === 'Escape') pause(); else if (low === 'r' && app.s?.done) again(); else if (low === 'n' && app.s?.done && !$('next').hidden) next(); });
addEventListener('keyup', e => { const k = HOLD[e.key.toLowerCase()]; if (k) app.keys[k] = false; });
addEventListener('blur', () => { app.keys = {}; if (app.s && !app.s.done && !$('flight').hidden) pause(true); });
document.addEventListener('visibilitychange', () => { if (document.hidden && app.s && !app.s.done && !$('flight').hidden) pause(true); });
document.querySelectorAll('[data-hold]').forEach(b => { const k = b.dataset.hold; b.addEventListener('pointerdown', e => { e.preventDefault(); app.keys[k] = true; b.setPointerCapture?.(e.pointerId); sound(); }); ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => b.addEventListener(ev, () => { app.keys[k] = false; })); b.addEventListener('contextmenu', e => e.preventDefault()); });
const tap = (id, f) => $(id).addEventListener('click', f);
function next() { const i = LEVELS.findIndex(l => l.id === app.level); start(LEVELS[Math.min(LEVELS.length - 1, i + 1)].id); }
const again = () => app.daily ? startDaily() : start(app.level);
tap('cut', () => { app.keys.cut = true; }); tap('pause', () => pause()); tap('resume', () => pause(false)); tap('again', again); tap('next', next); tap('play', () => start(app.level)); tap('daily-play', startDaily);
tap('daily-copy', () => { const r = DAILY.get(ukDate()); if (r) copyShare(dailyCard(r)); }); tap('daily-share', () => { const r = DAILY.get(ukDate()); if (r) copyShare(dailyCard(r)); }); tap('share', () => copyShare(app.share));
tap('back', () => { cancelAnimationFrame(app.raf); app.s = null; sound(); if (app.audio) app.audio.out.gain.value = 0; $('flight').hidden = true; $('screen-title').hidden = false; document.body.dataset.screen = 'title'; renderMissions(); setLevel(app.level); renderDaily(); scrollTo(0, 0); });
$('sound').checked = !!store().sound; $('sound').addEventListener('change', e => { const st = store(); st.sound = e.target.checked; write(KEY, st); sound(); });
// Read only views for the tests and the curious.
window.RoadsterGame = {runs: 0, last: null, state: () => app.s && {...app.s}, world: () => app.w, level: () => app.level, lights: () => app.lights, start: id => start(id), startDaily, daily: () => dailyLevel(), dailyRecord: () => DAILY.get(ukDate()), dailyCard: () => { const r = DAILY.get(ukDate()); return r && dailyCard(r); }};
renderMissions(); setLevel(level(store().level || 'quarter').id); renderDaily(); tickDaily(); setInterval(tickDaily, 1000);
if (new URLSearchParams(location.search).has('daily')) startDaily();
