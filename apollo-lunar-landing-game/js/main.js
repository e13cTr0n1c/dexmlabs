import {step, abort, ground, boulderUnder, hoverSeconds, detentUp, detentDown, altitude, LIMITS} from './lm.js';
import {makeLanding, score, shareText, grid, streak, londonKey, dayNumber, precision, TIERS} from './game.js';
const $ = id => document.getElementById(id);
const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const DEG = 180 / Math.PI;
const app = {s: null, d: null, keys: {}, raf: 0, last: 0, said: {}, alarm: null, alarmsOk: true, frozen: null, parts: [], shake: 0, tier: 'commander', audio: null};
const store = () => read('apollo:stats', {history: {}, best: {}});
function setTier(t) { app.tier = t; document.querySelectorAll('[data-tier]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tier === t))); const st = store(); st.tier = t; write('apollo:stats', st); $('best').textContent = st.best?.[t] ? `Your best as ${TIERS[t].name}: ${st.best[t]}` : ''; }
function say(t) { $('feedback').textContent = t; }
function start(d) {
  cancelAnimationFrame(app.raf); app.d = d; app.s = {...d.world.start}; app.said = {}; app.keys = {}; app.alarm = null; app.alarmsOk = true; app.frozen = null; app.parts = []; app.shake = 0;
  app.pending = d.world.alarms.map(a => ({...a}));
  $('flight').hidden = false; $('result').hidden = true; $('alarm').hidden = true; say('');
  const w = d.world; $('flight-h').textContent = `${d.practice ? 'Practice' : `Landing #${d.number}`}: ${w.site.name}, ${TIERS[d.tier].name}`;
  $('site-note').textContent = `${w.site.mission}. ${w.site.note}`;
  $('sky').scrollIntoView({block: 'center', behavior: 'auto'}); $('sky').focus({preventScroll: true});
  sound(true); app.last = performance.now(); app.raf = requestAnimationFrame(loop);
}
function loop(now) {
  const dt = Math.min(0.1, (now - app.last) / 1000); app.last = now; let s = app.s; const w = app.d.world;
  const input = {rot: app.keys.rl ? -1 : app.keys.rr ? 1 : 0, trans: app.keys.tl ? -1 : app.keys.tr ? 1 : 0};
  const n = Math.max(1, Math.round(dt * 60)); for (let k = 0; k < n; k++) s = step(w, s, input, dt / n); app.s = s;
  if (!app.alarm && app.pending.length && s.t >= app.pending[0].t && !s.done) { app.alarm = {...app.pending.shift(), at: s.t}; app.frozen = readings(); $('alarm-code').textContent = app.alarm.code; $('alarm').hidden = false; beep(880, 0.25); }
  if (app.alarm && s.t - app.alarm.at > 10) { app.alarmsOk = false; ack(); }
  callouts(s); juice(s, dt); draw(); hud(); sound();
  if (s.done) return finish(); app.raf = requestAnimationFrame(loop);
}
function ack() { if (!app.alarm) return; if (app.s.t - app.alarm.at > 8) app.alarmsOk = false; app.alarm = null; app.frozen = null; $('alarm').hidden = true; say('Go on that alarm.'); }
function callouts(s) {
  const h = hoverSeconds(s), a = altitude(app.d.world, s), c = (k, t) => { if (!app.said[k]) { app.said[k] = 1; say(t); } };
  if (h < 60) c('60', 'Sixty seconds.'); if (h < 30) c('30', 'Thirty seconds.'); if (s.fuel <= 0 && !s.aborted) c('out', 'Out of descent fuel. Abort now, or ride it down.');
  if (s.limit) c('lim', 'Attitude limit, 45°.'); if (a < 30 && !s.aborted) c('dust', 'Picking up some dust.'); if (s.aborted) c('ab', 'Abort stage. Ascent engine firing.');
}
function readings() {
  const s = app.s, w = app.d.world, radar = Math.abs(s.angle) <= LIMITS.radarTilt;
  return {alt: radar ? `${altitude(w, s).toFixed(altitude(w, s) < 100 ? 1 : 0)} m` : 'No data', vy: radar ? `${s.vy.toFixed(1)} m/s` : 'No data', vx: radar ? `${s.vx.toFixed(1)} m/s` : 'No data',
    range: `${Math.abs(s.x - w.target).toFixed(0)} m ${s.x < w.target ? 'ahead' : 'behind'}`, pitch: `${(s.angle * DEG).toFixed(0)}°`, th: s.throttle >= 1 ? 'Full' : `${Math.round(s.throttle * 100)}%`, fuel: `${Math.round(hoverSeconds(s))} s`, rcs: `${Math.round(s.rcs / TIERS[app.d.tier].rcs * 100)}%`, radar};
}
function hud() {
  const r = app.frozen || readings(), s = app.s, a = altitude(app.d.world, s);
  for (const k of ['alt', 'vy', 'vx', 'range', 'pitch', 'th', 'fuel', 'rcs']) $('h-' + k).textContent = r[k];
  $('h-vy').parentElement.classList.toggle('warn', -s.vy > LIMITS.down && a < 40); $('h-vx').parentElement.classList.toggle('warn', Math.abs(s.vx) > LIMITS.side && a < 40);
  $('h-fuel').parentElement.classList.toggle('warn', hoverSeconds(s) < 30); $('h-pitch').parentElement.classList.toggle('warn', Math.abs(s.angle) > LIMITS.radarTilt);
  $('h-alt').parentElement.classList.toggle('warn', !r.radar); $('sky').classList.toggle('frozen', !!app.frozen);
}
function juice(s, dt) {
  const w = app.d.world, a = altitude(w, s); if (reduced()) { app.parts = []; return; }
  if (!s.aborted && s.fuel > 0 && s.throttle > 0 && a < 30) for (let i = 0; i < 3; i++) app.parts.push({x: s.x, y: ground(w, s.x), vx: (Math.random() < 0.5 ? -1 : 1) * (20 + Math.random() * 40) * (1 - a / 30), vy: Math.random() * 3, life: 0.8});
  app.parts = app.parts.filter(p => (p.life -= dt) > 0); for (const p of app.parts) { p.x += p.vx * dt; p.y += p.vy * dt; }
  app.shake = Math.max(0, app.shake - dt * 30);
}
function draw() {
  const c = $('sky'), x = c.getContext('2d'), W = c.width, H = c.height, s = app.s, w = app.d.world, a = Math.max(0, altitude(w, s));
  const scale = Math.max(0.35, Math.min(8, (H - 140) / (a + 25))), gy = ground(w, s.x), ox = W / 2 + (Math.random() - 0.5) * app.shake, oy = (Math.random() - 0.5) * app.shake;
  const X = v => ox + (v - s.x) * scale, Y = v => oy + H - 70 - (v - gy) * scale;
  x.fillStyle = '#000'; x.fillRect(0, 0, W, H); x.fillStyle = '#fff'; for (let i = 0; i < 70; i++) x.fillRect((i * 151 - s.x * 0.02 * (i % 3)) % W + (i * 151 - s.x * 0.02 * (i % 3) < 0 ? W : 0), (i * 97) % (H - 160), 1.5, 1.5);
  const x0 = s.x - W / 2 / scale - 4, x1 = s.x + W / 2 / scale + 4, stepM = Math.max(2, 2 / scale);
  x.fillStyle = '#86837a'; x.beginPath(); x.moveTo(0, H); for (let m = x0; m <= x1; m += stepM) x.lineTo(X(m), Y(ground(w, m))); x.lineTo(W, H); x.fill();
  x.strokeStyle = '#b9b5aa'; x.lineWidth = 1.5; x.beginPath(); for (let m = x0; m <= x1; m += stepM) x.lineTo(X(m), Y(ground(w, m))); x.stroke();
  for (const [r, col] of [[100, 'rgba(214,255,0,.35)'], [30, '#d6ff00']]) { x.fillStyle = col; x.fillRect(X(w.target - r), Y(ground(w, w.target)) + 2, 2 * r * scale, 4); }
  x.fillStyle = '#d6ff00'; x.font = '13px monospace'; x.textAlign = 'center'; x.fillText('×3', X(w.target), Y(ground(w, w.target)) + 22); x.fillText('×2', X(w.target - 65), Y(ground(w, w.target - 65)) + 22); x.fillText('×2', X(w.target + 65), Y(ground(w, w.target + 65)) + 22);
  x.fillStyle = '#5e5b55'; for (const b of w.boulders) if (b.x > x0 && b.x < x1) { const g = ground(w, b.x); x.beginPath(); x.ellipse(X(b.x), Y(g), Math.max(1.5, b.w / 2 * scale), Math.max(1.5, b.h * scale), 0, Math.PI, 0); x.fill(); }
  x.fillStyle = 'rgba(201,195,181,.6)'; for (const p of app.parts) x.fillRect(X(p.x), Y(p.y), 2, 2);
  // Lander, 4.5 m half-width to the leg tips.
  const L = Math.max(scale, 2.4), lx = X(s.x), ly = Y(s.y);
  if (s.done && !s.landed && !s.safe) { x.fillStyle = '#ffb347'; x.beginPath(); x.arc(lx, ly, 6 * L, Math.PI, 0); x.fill(); } else {
  x.save(); x.translate(lx, ly); x.rotate(s.angle);
  if (!s.aborted) { x.strokeStyle = '#ccc'; x.lineWidth = 2; x.beginPath(); x.moveTo(-2.2 * L, -2 * L); x.lineTo(-4.5 * L, 0); x.moveTo(2.2 * L, -2 * L); x.lineTo(4.5 * L, 0); x.stroke(); x.fillStyle = '#c9a227'; x.fillRect(-2.6 * L, -4.2 * L, 5.2 * L, 2.4 * L); }
  x.fillStyle = '#ddd'; x.fillRect(-1.9 * L, (s.aborted ? -3 : -7.2) * L, 3.8 * L, 3 * L);
  const th = s.aborted ? 0.35 : s.fuel > 0 ? s.throttle : 0;
  if (th > 0) { const fl = reduced() ? 1 : 0.8 + Math.random() * 0.4, by = s.aborted ? 0 : -1.8 * L; x.fillStyle = '#ffb347'; x.beginPath(); x.moveTo(-0.8 * L, by); x.lineTo(0.8 * L, by); x.lineTo(0, by + th * 10 * L * fl); x.fill(); }
  if (app.keys.rl || app.keys.rr || app.keys.tl || app.keys.tr) { x.fillStyle = '#fff'; const sd = app.keys.rl || app.keys.tr ? 1 : -1; x.fillRect(sd * 2.6 * L - (sd < 0 ? 4 : 0), -6.5 * L, 4, 2); }
  x.restore(); }
  // Range strip
  const sx = v => 20 + (v + w.W) / (2 * w.W) * (W - 40); x.fillStyle = '#333'; x.fillRect(20, 14, W - 40, 4); x.fillStyle = '#d6ff00'; x.fillRect(sx(w.target) - 2, 10, 4, 12); x.fillStyle = '#fff'; x.fillRect(sx(s.x) - 3, 9, 6, 14);
}
function finish() {
  const s = app.s, d = app.d, sc = score(s, d.tier), label = d.practice ? 'practice' : `#${d.number}`; app.share = shareText(s, label, d.tier, d.world.site, app.alarmsOk);
  sound(false); if (!reduced() && s.touch) app.shake = s.landed ? 4 : 12; if (s.done && !s.safe) beep(s.landed ? 520 : 110, 0.2);
  if (s.landed) say('Contact light.'); draw();
  $('result').hidden = false; $('alarm').hidden = true;
  $('result-head').textContent = s.landed ? `The Eagle has landed. ${sc} points.` : s.safe ? 'Abort. Crew safe.' : 'Lost on landing.';
  const t = s.touch;
  $('result-text').textContent = s.landed ? `Touchdown at ${t.vy.toFixed(1)} m/s down and ${t.vx.toFixed(1)} m/s sideways, tilted ${(t.angle * DEG).toFixed(1)}°, ${t.dist.toFixed(0)} m from the target (×${precision(t.dist)}), with ${Math.round(hoverSeconds(s))} seconds of fuel left.${app.alarmsOk ? '' : ' An alarm sat unanswered for too long.'}` : s.fault.text;
  $('result-grid').textContent = grid(s, app.alarmsOk);
  const st = store(); st.best = st.best || {};
  if (sc > (st.best[d.tier] || 0)) { st.best[d.tier] = sc; if (s.landed) $('result-text').textContent += ' A new personal best.'; }
  if (!d.practice) { const prev = st.history[d.key] || 0; st.history[d.key] = Math.max(prev, sc); if (sc && !prev) window.DexmPoints?.earn('apollo', 100, `apollo:${d.key}`); }
  else if (sc) window.DexmPoints?.earnPractice('apollo', londonKey());
  write('apollo:stats', st); setTier(d.tier); stats(); $('again').focus({preventScroll: true});
}
function stats() { const s = streak(store().history || {}); $('stats').innerHTML = [['Played', s.played], ['Streak', s.streak], ['Best streak', s.best]].map(([k, v]) => `<div><b>${v}</b><span>${k}</span></div>`).join(''); }
// Sound: off unless switched on. Engine noise follows throttle.
function sound(on) {
  const st = store(); if (!st.sound) { if (app.audio) app.audio.g.gain.value = 0; return; }
  if (!app.audio) { const ac = new AudioContext(), b = ac.createBuffer(1, ac.sampleRate, ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; const src = ac.createBufferSource(); src.buffer = b; src.loop = true; const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 300; const g = ac.createGain(); g.gain.value = 0; src.connect(f).connect(g).connect(ac.destination); src.start(); app.audio = {ac, g}; }
  const s = app.s; app.audio.g.gain.value = on === false || !s || s.done ? 0 : (s.aborted ? 0.15 : s.fuel > 0 ? s.throttle * 0.25 : 0);
}
function beep(f, len) { const st = store(); if (!st.sound || !app.audio) return; const {ac} = app.audio, o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = f; g.gain.value = 0.1; o.connect(g).connect(ac.destination); o.start(); o.stop(ac.currentTime + len); }
const HOLD = {ArrowLeft: 'rl', ArrowRight: 'rr', a: 'tl', d: 'tr', A: 'tl', D: 'tr'};
addEventListener('keydown', e => {
  if (!app.s || $('flight').hidden) return; const k = HOLD[e.key];
  if (k && !app.s.done) { app.keys[k] = true; e.preventDefault(); }
  else if ((e.key === 'ArrowUp' || e.key === 'w') && !app.s.done) { app.s.throttle = detentUp(app.s.throttle); e.preventDefault(); }
  else if ((e.key === 'ArrowDown' || e.key === 's') && !app.s.done) { app.s.throttle = detentDown(app.s.throttle); e.preventDefault(); }
  else if (e.key === ' ' && !app.s.done) { app.s = abort(app.s); e.preventDefault(); }
  else if ((e.key === 'g' || e.key === 'G') && app.alarm) ack();
  else if ((e.key === 'r' || e.key === 'R') && app.s.done) retry();
});
addEventListener('keyup', e => { const k = HOLD[e.key]; if (k) app.keys[k] = false; });
document.querySelectorAll('[data-hold]').forEach(b => { const k = b.dataset.hold; b.addEventListener('pointerdown', e => { e.preventDefault(); app.keys[k] = true; b.setPointerCapture(e.pointerId); }); ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => b.addEventListener(ev, () => { app.keys[k] = false; })); });
$('th-up').addEventListener('click', () => { if (app.s && !app.s.done) app.s.throttle = detentUp(app.s.throttle); });
$('th-down').addEventListener('click', () => { if (app.s && !app.s.done) app.s.throttle = detentDown(app.s.throttle); });
$('abort').addEventListener('click', () => { if (app.s && !app.s.done) app.s = abort(app.s); });
$('go').addEventListener('click', ack);
$('share').addEventListener('click', () => navigator.clipboard?.writeText(app.share).then(() => say('Result copied.'), () => { $('share-text').hidden = false; $('share-text').value = app.share; }));
const practice = () => start(makeLanding({seed: Math.floor(Math.random() * 2 ** 31), tier: app.tier}));
function retry() { if (app.d.practice) practice(); else start(makeLanding({key: app.d.key, tier: app.d.tier})); }
$('play-daily').addEventListener('click', () => start(makeLanding({tier: app.tier})));
$('play-practice').addEventListener('click', practice); $('again').addEventListener('click', retry);
document.querySelectorAll('[data-tier]').forEach(b => b.addEventListener('click', () => setTier(b.dataset.tier)));
$('sound').checked = !!store().sound; $('sound').addEventListener('change', e => { const st = store(); st.sound = e.target.checked; write('apollo:stats', st); });
$('header-day').textContent = `#${dayNumber(londonKey())}`; setTier(store().tier || 'commander'); stats();
