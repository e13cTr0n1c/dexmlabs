import {step, hoverSeconds, LIMITS, MIN_T, MAX_T} from './lm.js';
import {makeLanding, score, shareText, streak, londonKey, dayNumber} from './game.js';
const $ = id => document.getElementById(id);
const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const app = {s: null, d: null, keys: {}, raf: 0, last: 0, said: 0};
function start(d) {
  cancelAnimationFrame(app.raf); app.d = d; app.s = {...d.start}; app.said = 0; app.keys = {};
  $('flight').hidden = false; $('result').hidden = true; $('feedback').textContent = '';
  $('flight-h').textContent = `${d.practice ? 'Practice' : `Landing #${d.number}`}: ${d.site}`; $('flight-h').focus();
  $('sky').scrollIntoView({block: 'center', behavior: 'auto'}); app.last = performance.now(); app.raf = requestAnimationFrame(loop);
}
function loop(now) {
  const dt = Math.min(0.1, (now - app.last) / 1000); app.last = now; let s = app.s;
  if (app.keys.up) s.throttle = Math.min(MAX_T, s.throttle + 0.25 * dt); if (app.keys.down) s.throttle = Math.max(MIN_T, s.throttle - 0.25 * dt);
  s.rcs = app.keys.left ? -1 : app.keys.right ? 1 : 0;
  for (let k = 0; k < 4; k++) s = step(s, dt / 4); app.s = s;
  const h = hoverSeconds(s); if (h < 60 && app.said < 1) { app.said = 1; $('feedback').textContent = 'Sixty seconds.'; } if (h < 30 && app.said < 2) { app.said = 2; $('feedback').textContent = 'Thirty seconds.'; }
  draw(); hud(); if (s.done) return finish(); app.raf = requestAnimationFrame(loop);
}
function hud() {
  const s = app.s; $('h-alt').textContent = `${s.y.toFixed(1)} m`; $('h-vy').textContent = `${(-s.vy).toFixed(1)} m/s`; $('h-vx').textContent = `${s.vx.toFixed(1)} m/s`;
  $('h-x').textContent = `${Math.abs(s.x).toFixed(0)} m`; $('h-fuel').textContent = `${Math.round(hoverSeconds(s))} s`; $('h-th').textContent = `${Math.round(s.throttle * 100)}%`;
  $('h-vy-box').classList.toggle('warn', -s.vy > LIMITS.down && s.y < 30); $('h-vx-box').classList.toggle('warn', Math.abs(s.vx) > LIMITS.side && s.y < 30); $('h-fuel-box').classList.toggle('warn', hoverSeconds(s) < 30);
}
function draw() {
  const c = $('sky'), x = c.getContext('2d'), W = c.width, H = c.height, s = app.s, scale = H / 260, gy = H - 40, X = v => W / 2 + (v - s.x * 0.6) * scale, Y = v => gy - v * scale;
  x.fillStyle = '#000'; x.fillRect(0, 0, W, H); x.fillStyle = '#fff'; for (let i = 0; i < 60; i++) x.fillRect((i * 151) % W, (i * 97) % (H - 120), 1.5, 1.5);
  x.fillStyle = '#7d7a72'; x.fillRect(0, gy, W, H - gy); x.fillStyle = '#5b5852'; for (const r of app.d.rocks) { x.beginPath(); x.arc(X(r.x), gy, r.r * scale, Math.PI, 0); x.fill(); }
  x.fillStyle = '#d6ff00'; x.fillRect(X(-LIMITS.pad), gy - 2, LIMITS.pad * 2 * scale, 4);
  if (s.done && !s.landed) { if (reduced()) { x.fillStyle = '#c9c3b5'; x.beginPath(); x.arc(X(s.x), gy, 40, Math.PI, 0); x.fill(); } else dust(X(s.x), gy); return; }
  const lx = X(s.x), ly = Y(s.y); x.save(); x.translate(lx, ly);
  x.fillStyle = '#c9a227'; x.fillRect(-9 * scale / 2, -14 * scale, 9 * scale, 7 * scale); x.fillStyle = '#ddd'; x.fillRect(-6 * scale / 2, -20 * scale, 6 * scale, 6 * scale);
  x.strokeStyle = '#ccc'; x.lineWidth = 2; x.beginPath(); x.moveTo(-4.5 * scale, -7 * scale); x.lineTo(-7 * scale, 0); x.moveTo(4.5 * scale, -7 * scale); x.lineTo(7 * scale, 0); x.stroke();
  if (s.fuel > 0) { x.fillStyle = '#ffb347'; x.beginPath(); x.moveTo(-2 * scale, -7 * scale); x.lineTo(2 * scale, -7 * scale); x.lineTo(0, (-7 + s.throttle * 18 * (0.8 + Math.random() * 0.4)) * scale); x.fill(); }
  x.restore();
}
function dust(cx, cy) {
  const c = $('sky'), x = c.getContext('2d'); let f = 0;
  (function go() { f++; x.fillStyle = `rgba(201,195,181,${Math.max(0, 0.5 - f / 120)})`; x.beginPath(); x.arc(cx, cy, f * 3, Math.PI, 0); x.fill(); x.fillStyle = '#ffb347'; for (let i = 0; i < 12; i++) x.fillRect(cx + Math.cos(i) * f * 2.5, cy - Math.abs(Math.sin(i)) * f * 2, 3, 3); if (f < 60) requestAnimationFrame(go); })();
}
function finish() {
  const s = app.s, sc = score(s), label = app.d.practice ? 'practice' : `#${app.d.number}`; app.share = shareText(s, label);
  $('result').hidden = false;
  $('result-head').textContent = s.landed ? `The Eagle has landed. Score ${sc}.` : 'That was too hard a landing.';
  $('result-text').textContent = `Touchdown at ${s.touch.vy.toFixed(1)} m/s down and ${s.touch.vx.toFixed(1)} m/s sideways, ${s.touch.dist.toFixed(0)} m from the pad, with ${Math.round(hoverSeconds(s))} seconds of hover fuel left.`;
  if (!app.d.practice) { const h = read('apollo:stats', {history: {}}); if (!(app.d.key in h.history)) { h.history[app.d.key] = sc; write('apollo:stats', h); if (sc) window.DexmPoints?.earn('apollo', 100, `apollo:${app.d.key}`); } }
  else if (sc) window.DexmPoints?.earnPractice('apollo', londonKey());
  stats(); $('result-head').focus({preventScroll: true});
}
function stats() { const s = streak(read('apollo:stats', {history: {}}).history || {}); $('stats').innerHTML = [['Played', s.played], ['Streak', s.streak], ['Best', s.best]].map(([k, v]) => `<div><b>${v}</b><span>${k}</span></div>`).join(''); }
const KEYMAP = {ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right'};
addEventListener('keydown', e => { const k = KEYMAP[e.key]; if (k && app.s && !app.s.done) { app.keys[k] = true; e.preventDefault(); } });
addEventListener('keyup', e => { const k = KEYMAP[e.key]; if (k) app.keys[k] = false; });
document.querySelectorAll('.pad button').forEach(b => { const k = b.dataset.k; b.addEventListener('pointerdown', e => { app.keys[k] = true; b.setPointerCapture(e.pointerId); }); ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => b.addEventListener(ev, () => { app.keys[k] = false; })); });
$('share').addEventListener('click', () => navigator.clipboard?.writeText(app.share).then(() => { $('feedback').textContent = 'Result copied.'; }, () => { $('share-text').hidden = false; $('share-text').value = app.share; }));
$('play-daily').addEventListener('click', () => start(makeLanding()));
const practice = () => start(makeLanding({seed: Math.floor(Math.random() * 2 ** 31)}));
$('play-practice').addEventListener('click', practice); $('again').addEventListener('click', practice);
$('header-day').textContent = `#${dayNumber(londonKey())}`; stats();
