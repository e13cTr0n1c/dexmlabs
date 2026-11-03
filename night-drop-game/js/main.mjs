import { G, ROUND_SECONDS, isFestive, scoreLanding, rng, makeWind, bestScore } from './core.mjs';

const festive = isFestive(new Date(), location.search);
document.documentElement.classList.toggle('festive', festive);
const cv = document.getElementById('game');
const ctx = cv.getContext('2d');
const hud = { score: document.getElementById('score'), combo: document.getElementById('combo'), time: document.getElementById('time'), wind: document.getElementById('wind'), best: document.getElementById('best') };
const overlay = document.getElementById('overlay');
const ovTitle = document.getElementById('ov-title');
const ovText = document.getElementById('ov-text');
const playBtn = document.getElementById('play');
const muteBtn = document.getElementById('mute');
const BEST_KEY = festive ? 'dexm:nightdrop:best:xmas' : 'dexm:nightdrop:best';
const store = { get: () => { try { return localStorage.getItem(BEST_KEY); } catch (e) { return null; } }, set: v => { try { localStorage.setItem(BEST_KEY, v); } catch (e) {} } };
hud.best.textContent = store.get() || 0;
document.getElementById('mode-tag').textContent = festive ? 'Christmas Eve run' : 'Night post run';
if (festive) { document.getElementById('lead').textContent = 'Christmas Eve over Lincolnshire. Drop the presents down the chimneys, mind the wind, and keep the combo going before the clock runs out.'; }

// Sound
let actx = null, muted = false;
try { muted = localStorage.getItem('dexm:nightdrop:mute') === '1'; } catch (e) {}
const setMuteLabel = () => { muteBtn.textContent = muted ? 'Sound off' : 'Sound on'; muteBtn.setAttribute('aria-pressed', String(!muted)); };
setMuteLabel();
muteBtn.addEventListener('click', e => { e.stopPropagation(); muted = !muted; try { localStorage.setItem('dexm:nightdrop:mute', muted ? '1' : '0'); } catch (er) {} setMuteLabel(); });
function tone(f, dur = 0.12, type = 'square', vol = 0.06, slide = 0) {
  if (muted) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime;
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, f + slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(actx.destination); o.start(t); o.stop(t + dur + 0.02);
  } catch (e) {}
}
const jingle = [659, 659, 659, 0, 659, 659, 659, 0, 659, 784, 523, 587, 659];
function chime(perfect) { if (festive && perfect) jingle.slice(0, 4).forEach((f, i) => f && setTimeout(() => tone(f * 1.5, 0.1, 'triangle', 0.05), i * 70)); else tone(perfect ? 880 : 660, 0.15, 'triangle', 0.06, 220); }

// Canvas sizing
let W = 0, H = 0, DPR = 1;
function resize() { DPR = Math.min(window.devicePixelRatio || 1, 2); const r = cv.getBoundingClientRect(); W = r.width; H = r.height; cv.width = W * DPR; cv.height = H * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0); }
window.addEventListener('resize', resize); resize();

// State
let S;
const stars = Array.from({ length: 90 }, () => [Math.random(), Math.random() * 0.6, Math.random()]);
const flakes = Array.from({ length: 120 }, () => ({ x: Math.random(), y: Math.random(), r: 0.8 + Math.random() * 2, s: 20 + Math.random() * 40 }));
function reset() {
  const r = rng((Date.now() & 0xffff) + 1);
  S = { r, t: 0, left: ROUND_SECONDS, score: 0, combo: 0, best: +(store.get() || 0), alt: 0.4, targetAlt: 0.4, speed: 150, world: 0, wind: makeWind(r), windIn: 6, houses: [], parcels: [], parts: [], pops: [], stars: [], shake: 0, running: true, nextHouse: 300, cooldown: 0, drops: 0, hits: 0 };
}
reset(); S.running = false;
const groundY = () => H - Math.max(56, H * 0.12);
const planeX = () => Math.max(70, W * 0.24);
const planeY = () => 40 + S.alt * (groundY() - 160);
const HALF = 26;

function spawnHouse() {
  const x = S.world + W + 60;
  S.houses.push({ x, w: 54 + S.r() * 40, h: 34 + S.r() * 26, done: false, lit: S.r() < 0.8, tc: 0.25 + S.r() * 0.5 });
  if (festive && S.r() < 0.35) S.stars.push({ x: x + 80, y: 60 + S.r() * (groundY() - 200), got: false });
  S.nextHouse = x + 170 + S.r() * 220 - Math.min(80, S.t * 1.2);
}
function drop() {
  if (!S.running || S.cooldown > 0) return;
  S.cooldown = 0.28; S.drops++;
  S.parcels.push({ x: S.world + planeX(), y: planeY() + 10, vx: S.speed * 0.825, vy: 0, rot: 0, c: festive ? ['#e03a3a', '#2fa35a', '#f2c84b', '#e8e8f0'][S.drops % 4] : '#c9a46b' });
  tone(320, 0.08, 'sawtooth', 0.04, -160);
}
function burst(x, y, n, colours, spd = 160) { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = spd * (0.3 + Math.random()); S.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, life: 0.6 + Math.random() * 0.6, c: colours[i % colours.length] }); } }
function pop(x, y, text, c) { S.pops.push({ x, y, text, c, life: 1 }); }

function update(dt) {
  if (!S.running) return;
  S.t += dt; S.left -= dt; S.cooldown -= dt; S.windIn -= dt;
  if (S.windIn <= 0) { S.wind = makeWind(S.r); S.windIn = 5 + S.r() * 5; tone(200, 0.2, 'sine', 0.03, 100); }
  S.speed = 150 + Math.min(70, S.t * 1.1);
  S.world += S.speed * dt;
  S.alt += (S.targetAlt - S.alt) * Math.min(1, dt * 4);
  while (S.nextHouse < S.world + W + 60) spawnHouse();
  const gy = groundY();
  for (const p of S.parcels) {
    p.vy += G * dt; p.vx += S.wind * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += dt * 3;
    if (p.y >= gy - 4 && !p.done) {
      p.done = true;
      let best = null, bd = 1e9;
      for (const h of S.houses) { if (h.done) continue; const cx = h.x + h.w * h.tc; const d = p.x - cx; if (Math.abs(d) < Math.abs(bd)) { bd = d; best = h; } }
      const res = best ? scoreLanding(bd, HALF, S.combo) : { hit: false, grade: 'miss', points: 0, combo: 0 };
      const sx = p.x - S.world;
      if (res.hit) {
        best.done = true; S.hits++; S.combo = res.combo; S.score += res.points;
        burst(sx, gy - best.h, res.grade === 'perfect' ? 40 : 22, festive ? ['#f2c84b', '#e03a3a', '#2fa35a', '#fff'] : ['#f2c84b', '#ffe9b0', '#fff']);
        pop(sx, gy - best.h - 20, (res.grade === 'perfect' ? 'Perfect! ' : res.grade === 'great' ? 'Great ' : 'Good ') + '+' + res.points, '#f2c84b');
        if (res.grade === 'perfect') S.shake = 10;
        chime(res.grade === 'perfect');
        if (navigator.vibrate) try { navigator.vibrate(res.grade === 'perfect' ? 30 : 12); } catch (e) {}
      } else {
        if (S.combo >= 3) pop(sx, gy - 30, 'Combo lost', '#ff7a7a');
        S.combo = 0; S.shake = 5; burst(sx, gy, 14, ['#ffffff', '#c9d3e0'], 90); tone(110, 0.18, 'square', 0.05, -50);
      }
    }
  }
  S.parcels = S.parcels.filter(p => !p.done);
  const px = S.world + planeX(), py = planeY();
  for (const s of S.stars) if (!s.got && Math.abs(s.x - px) < 22 && Math.abs(s.y - py) < 22) { s.got = true; S.left += 3; S.score += 100; pop(planeX(), py - 24, 'Star +3s', '#fff3a0'); burst(planeX(), py, 24, ['#fff3a0', '#f2c84b']); tone(1046, 0.25, 'triangle', 0.05, 400); }
  for (const p of S.parts) { p.vy += 300 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
  S.parts = S.parts.filter(p => p.life > 0);
  for (const p of S.pops) { p.y -= 40 * dt; p.life -= dt; }
  S.pops = S.pops.filter(p => p.life > 0);
  S.houses = S.houses.filter(h => h.x + h.w > S.world - 40);
  S.stars = S.stars.filter(s => s.x > S.world - 40);
  S.shake = Math.max(0, S.shake - dt * 30);
  if (S.left <= 0) end();
}

function end() {
  S.running = false; S.left = 0;
  const b = bestScore(store, S.score);
  hud.best.textContent = b.best;
  ovTitle.textContent = b.isNew && S.score > 0 ? 'New best: ' + S.score : 'Run over: ' + S.score;
  ovText.textContent = S.hits + ' of ' + S.drops + ' parcels delivered. Best ' + b.best + '. Tap or press Space to fly again.';
  playBtn.textContent = 'Fly again';
  overlay.hidden = false; tone(b.isNew ? 784 : 392, 0.4, 'triangle', 0.06, b.isNew ? 300 : -150);
}

function draw() {
  const gy = groundY();
  ctx.save();
  if (S.shake > 0) ctx.translate((Math.random() - 0.5) * S.shake, (Math.random() - 0.5) * S.shake);
  const sky = ctx.createLinearGradient(0, 0, 0, gy);
  sky.addColorStop(0, festive ? '#0a1430' : '#060b18'); sky.addColorStop(1, festive ? '#2a3a66' : '#1a2540');
  ctx.fillStyle = sky; ctx.fillRect(-20, -20, W + 40, H + 40);
  for (const [x, y, tw] of stars) { ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(S.t * 2 + tw * 9)); ctx.fillStyle = '#fff'; ctx.fillRect(((x * W - S.world * 0.02) % W + W) % W, y * gy, 1.6, 1.6); }
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#f4f0d8'; ctx.beginPath(); ctx.arc(W * 0.82, gy * 0.18, 22, 0, 7); ctx.fill();
  ctx.fillStyle = festive ? '#0a1430' : '#060b18'; ctx.beginPath(); ctx.arc(W * 0.82 + 9, gy * 0.18 - 5, 19, 0, 7); ctx.fill();
  // distant cathedral on the hill, parallax
  const cx = ((W * 0.6 - S.world * 0.08) % (W + 400) + W + 400) % (W + 400) - 200;
  ctx.fillStyle = '#121a30'; ctx.beginPath(); ctx.moveTo(-20, gy - 30); ctx.quadraticCurveTo(W * 0.5, gy - 70, W + 20, gy - 25); ctx.lineTo(W + 20, gy); ctx.lineTo(-20, gy); ctx.fill();
  ctx.fillRect(cx, gy - 110, 120, 60); ctx.fillRect(cx + 5, gy - 150, 22, 50); ctx.fillRect(cx + 93, gy - 150, 22, 50); ctx.fillRect(cx + 48, gy - 170, 26, 70);
  // ground
  ctx.fillStyle = festive ? '#dfe6f2' : '#1d2a1f'; ctx.fillRect(-20, gy, W + 40, H - gy + 20);
  ctx.fillStyle = festive ? '#c4cfe0' : '#16211a'; for (let i = 0; i < 12; i++) { const x = ((i * 140 - S.world) % (W + 140) + W + 140) % (W + 140) - 70; ctx.fillRect(x, gy + 12, 80, 3); }
  // houses
  for (const h of S.houses) {
    const x = h.x - S.world, top = gy - h.h;
    ctx.fillStyle = '#2b2233'; ctx.fillRect(x, top, h.w, h.h);
    ctx.fillStyle = festive ? '#f4f7ff' : '#3a2a30'; ctx.beginPath(); ctx.moveTo(x - 6, top); ctx.lineTo(x + h.w / 2, top - 22); ctx.lineTo(x + h.w + 6, top); ctx.fill();
    const tx = x + h.w * h.tc;
    ctx.fillStyle = '#5a3a32'; ctx.fillRect(tx - 7, top - 30, 14, 22);
    if (!h.done) { ctx.strokeStyle = 'rgba(242,200,75,' + (0.4 + 0.3 * Math.sin(S.t * 6)) + ')'; ctx.lineWidth = 2; ctx.strokeRect(tx - HALF, top - 34, HALF * 2, 4); }
    if (h.lit) { ctx.fillStyle = h.done ? '#ffd76a' : '#9a7a3a'; ctx.fillRect(x + 8, top + 10, 10, 10); ctx.fillRect(x + h.w - 18, top + 10, 10, 10); }
    if (festive) { for (let i = 0; i < 6; i++) { ctx.fillStyle = ['#e03a3a', '#2fa35a', '#f2c84b'][(i + Math.floor(S.t * 3)) % 3]; ctx.fillRect(x + i * h.w / 6 + 3, top + 1, 3, 3); } }
    if (h.done) { ctx.fillStyle = 'rgba(200,200,200,0.35)'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(tx + Math.sin(S.t * 2 + i) * 4, top - 36 - i * 10 - (S.t * 20 % 10), 4 + i, 0, 7); ctx.fill(); } }
  }
  // bonus stars
  for (const s of S.stars) if (!s.got) { const x = s.x - S.world; ctx.fillStyle = '#fff3a0'; ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 + S.t, r = i % 2 ? 5 : 12; ctx.lineTo(x + Math.cos(a) * r, s.y + Math.sin(a) * r); } ctx.fill(); }
  // drop guide: predicted landing marker with current wind
  if (S.running) {
    const h = gy - planeY() - 10, t = Math.sqrt(2 * h / G), lx = planeX() + S.speed * 0.825 * t + 0.5 * S.wind * t * t;
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.setLineDash([4, 6]); ctx.beginPath(); ctx.moveTo(planeX(), planeY() + 12); ctx.lineTo(lx, gy - 40); ctx.stroke(); ctx.setLineDash([]); ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.moveTo(lx - 8, gy - 40); ctx.lineTo(lx + 8, gy - 40); ctx.stroke();
  }
  // parcels
  for (const p of S.parcels) { const x = p.x - S.world; ctx.save(); ctx.translate(x, p.y); ctx.rotate(Math.sin(p.rot) * 0.3); ctx.fillStyle = p.c; ctx.fillRect(-7, -7, 14, 14); ctx.fillStyle = festive ? '#f2c84b' : '#7a5a30'; ctx.fillRect(-1.5, -7, 3, 14); ctx.fillRect(-7, -1.5, 14, 3); ctx.restore(); }
  // plane
  const px = planeX(), py = planeY(), tilt = (S.targetAlt - S.alt) * 0.8;
  ctx.save(); ctx.translate(px, py); ctx.rotate(tilt);
  ctx.fillStyle = festive ? '#c8283a' : '#d8dde6';
  ctx.beginPath(); ctx.ellipse(0, 0, 30, 7, 0, 0, 7); ctx.fill();
  ctx.fillStyle = festive ? '#e9eef7' : '#9aa6b8'; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(8, 0); ctx.lineTo(-10, 18); ctx.lineTo(-18, 18); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-22, -2); ctx.lineTo(-30, -16); ctx.lineTo(-34, -16); ctx.lineTo(-30, 0); ctx.fill();
  ctx.fillStyle = '#8fd0ff'; ctx.fillRect(14, -4, 8, 4);
  ctx.fillStyle = S.t % 1 < 0.5 ? '#ff4040' : '#40ff70'; ctx.beginPath(); ctx.arc(-32, -16, 2.2, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(31, -8 + Math.sin(S.t * 60) * 8); ctx.lineTo(31, 8 - Math.sin(S.t * 60) * 8); ctx.stroke();
  if (festive) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-4, -6); ctx.lineTo(4, -16); ctx.lineTo(8, -6); ctx.fill(); ctx.fillStyle = '#e03a3a'; ctx.fillRect(-5, -7, 14, 3); }
  ctx.restore();
  // particles and popups
  for (const p of S.parts) { ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, 3, 3); }
  ctx.globalAlpha = 1; ctx.font = 'bold 16px system-ui, sans-serif'; ctx.textAlign = 'center';
  for (const p of S.pops) { ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.c; ctx.fillText(p.text, p.x, p.y); }
  ctx.globalAlpha = 1;
  // wind sock
  const wx = W - 40, wy = 30, k = S.wind / 60;
  ctx.strokeStyle = '#ccc'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx, wy + 30); ctx.stroke();
  ctx.fillStyle = '#ff8a3a'; ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx + k * 26, wy + 3 + (1 - Math.abs(k)) * 8); ctx.lineTo(wx, wy + 8); ctx.fill();
  if (festive) { ctx.fillStyle = 'rgba(255,255,255,0.85)'; for (const f of flakes) { f.y += f.s / 60 / 60 * 1; f.x += (S.wind / 6000) - 0.0008; if (f.y > 1) f.y = 0; if (f.x < 0) f.x = 1; if (f.x > 1) f.x = 0; ctx.beginPath(); ctx.arc(f.x * W, f.y * H, f.r, 0, 7); ctx.fill(); } }
  ctx.restore();
  hud.score.textContent = S.score; hud.combo.textContent = 'x' + S.combo; hud.time.textContent = Math.ceil(S.left);
  hud.wind.textContent = (S.wind === 0 ? 'calm' : (S.wind > 0 ? 'tail ' : 'head ') + Math.abs(Math.round(S.wind / 6)) + ' kt');
}

let last = performance.now();
function loop(now) { const dt = Math.min(0.05, (now - last) / 1000); last = now; update(dt); draw(); requestAnimationFrame(loop); }
requestAnimationFrame(loop);

function start() { reset(); overlay.hidden = true; tone(523, 0.1, 'triangle', 0.05); cv.focus(); }
playBtn.addEventListener('click', e => { e.stopPropagation(); start(); });
// Keyboard
const keys = new Set();
window.addEventListener('keydown', e => {
  if (e.target && e.target.closest && e.target.closest('details,a,input')) return;
  if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyX') { e.preventDefault(); if (!S.running && e.code !== 'KeyX') start(); else drop(); }
  if (['ArrowUp', 'KeyW', 'ArrowDown', 'KeyS'].includes(e.code)) { e.preventDefault(); keys.add(e.code); }
  if (e.code === 'KeyM') muteBtn.click();
});
window.addEventListener('keyup', e => keys.delete(e.code));
setInterval(() => { if (!S.running) return; if (keys.has('ArrowUp') || keys.has('KeyW')) S.targetAlt = Math.max(0, S.targetAlt - 0.03); if (keys.has('ArrowDown') || keys.has('KeyS')) S.targetAlt = Math.min(1, S.targetAlt + 0.03); }, 16);
// Touch and mouse: drag up or down to climb or descend, quick tap to drop
let ptr = null;
cv.addEventListener('pointerdown', e => { if (!S.running) { start(); return; } ptr = { y: e.clientY, alt: S.targetAlt, t: performance.now(), moved: 0 }; cv.setPointerCapture(e.pointerId); });
cv.addEventListener('pointermove', e => { if (!ptr) return; const dy = e.clientY - ptr.y; ptr.moved = Math.max(ptr.moved, Math.abs(dy)); S.targetAlt = Math.min(1, Math.max(0, ptr.alt + dy / (H * 0.6))); });
cv.addEventListener('pointerup', () => { if (ptr && ptr.moved < 10 && performance.now() - ptr.t < 350) drop(); ptr = null; });
cv.addEventListener('pointercancel', () => { ptr = null; });
