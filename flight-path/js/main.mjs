// Flight Path: the page. Draws the radar on a canvas, handles drag, taps and keys, keeps stats in localStorage.
import {daily, practice, utcDate, checkPath, adjacency, wallKey} from './gen.mjs';

const $ = s => document.querySelector(s);
const canvas = $('#fp-board'), ctx = canvas.getContext('2d');
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const STATS = 'flightpath:stats', SEEN = 'flightpath:seen', SOUND = 'flightpath:sound', PRACTICE_SIZE = 'flightpath:size';
const URL_TEXT = 'dexmlabs.app/flight-path/';
const store = {
  get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};
const fmt = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
const prevDay = d => { const t = new Date(d + 'T12:00:00Z'); t.setUTCDate(t.getUTCDate() - 1); return t.toISOString().slice(0, 10); };

// ---------- state ----------
const params = new URLSearchParams(location.search);
const today = utcDate();
const dailyDate = /^\d{4}-\d{2}-\d{2}$/.test(params.get('date') || '') ? params.get('date') : today;
let mode = 'daily', puz, adj, wpAt, lastNum, path = [], onPath, solved = false;
let t0 = 0, elapsed = 0, timerOn = false, winAnim = null, flash = null;
let headX = 0, headY = 0, headAng = 0, pulse = 0;
let stats = Object.assign({streak: 0, maxStreak: 0, last: '', played: 0, best: {}, history: {}}, store.get(STATS, {}));

function load(p) {
  puz = p; adj = adjacency(p.n, p.walls); wpAt = new Map(p.waypoints.map(w => [w.cell, w.num]));
  lastNum = p.waypoints.length; path = []; onPath = new Int32Array(p.n * p.n).fill(-1);
  solved = false; elapsed = 0; timerOn = false; winAnim = null; $('#fp-win').hidden = true;
  const s = cellXY(p.waypoints[0].cell); headX = s[0]; headY = s[1]; headAng = 0;
  $('#fp-title').textContent = mode === 'daily' ? '#' + p.number : p.n + 'x' + p.n;
  $('#fp-level').textContent = p.label;
  status(mode === 'daily' ? `${p.n} by ${p.n}, ${lastNum} beacons${p.walls.length ? ', ' + p.walls.length + ' walls' : ''}. Start on beacon 1.` : 'Practice. Start on beacon 1.');
  tick(); resize();
}
function startDaily() {
  mode = 'daily'; tabs(); load(daily(dailyDate));
  const h = stats.history[dailyDate];
  if (h && dailyDate === today) { // already flown today: show the finished route and the result
    path = puz.solution.slice(); path.forEach((c, i) => { onPath[c] = i; }); solved = true; elapsed = h;
    const e = cellXY(path[path.length - 1]); headX = e[0]; headY = e[1]; headAng = angleAt(path.length - 1);
    tick(); showWin(false);
  }
}
let practiceSize = store.get(PRACTICE_SIZE, 6);
function startPractice() { mode = 'practice'; tabs(); load(practice((Math.random() * 2 ** 32) >>> 0, practiceSize)); }
function tabs() {
  $('#tab-daily').setAttribute('aria-selected', mode === 'daily'); $('#tab-practice').setAttribute('aria-selected', mode === 'practice');
  $('#fp-sizes').hidden = mode !== 'practice';
  document.querySelectorAll('#fp-sizes button').forEach(b => b.setAttribute('aria-pressed', +b.dataset.size === practiceSize));
  $('#fp-kicker').textContent = mode === 'daily' ? 'DAILY PATH PUZZLE / ' + dailyDate : 'PRACTICE / ENDLESS';
}
function status(t, bad) { const s = $('#fp-status'); s.textContent = t; s.classList.toggle('bad', !!bad); if (bad && !reduce.matches) { s.classList.remove('shake'); void s.offsetWidth; s.classList.add('shake'); } }

// ---------- geometry ----------
let W = 0, cell = 0, pad = 0, dpr = 1;
function resize() {
  const r = canvas.getBoundingClientRect(); dpr = Math.min(3, devicePixelRatio || 1);
  W = r.width; canvas.width = Math.round(W * dpr); canvas.height = Math.round(W * dpr);
  pad = Math.max(10, W * .04); cell = (W - 2 * pad) / puz.n;
  const h = path.length ? cellXY(path[path.length - 1]) : cellXY(puz.waypoints[0].cell); headX = h[0]; headY = h[1];
}
const cellXY = c => [pad + (c % puz.n + .5) * cell, pad + (((c / puz.n) | 0) + .5) * cell];
function hit(e) {
  const r = canvas.getBoundingClientRect(), x = e.clientX - r.left - pad, y = e.clientY - r.top - pad;
  const cx = Math.floor(x / cell), cy = Math.floor(y / cell);
  if (cx < 0 || cy < 0 || cx >= puz.n || cy >= puz.n) return {c: -1};
  return {c: cy * puz.n + cx, fx: x / cell - cx, fy: y / cell - cy};
}
function angleAt(i) { if (i < 1) return 0; const a = cellXY(path[i - 1]), b = cellXY(path[i]); return Math.atan2(b[1] - a[1], b[0] - a[0]); }

// ---------- moves ----------
const head = () => path[path.length - 1];
function nextNum() { let n = 1; for (const c of path) if (wpAt.has(c)) n = wpAt.get(c) + 1; return n; }
function canStep(to) {
  if (onPath[to] >= 0) return 'visited';
  if (!adj[head()].includes(to)) return 'wall';
  const k = wpAt.get(to); if (k && k !== nextNum()) return 'order';
  if (k === lastNum && path.length + 1 < puz.n * puz.n) return 'early';
  return '';
}
function push(c) {
  path.push(c); onPath[c] = path.length - 1;
  if (!timerOn && !solved) { timerOn = true; t0 = performance.now() - elapsed * 1000; }
  const k = wpAt.get(c);
  if (k && path.length > 1) { sound.ping(k / lastNum); flashCell(c, 'ok'); buzz(12); } else sound.step(path.length / (puz.n * puz.n));
  if (path.length === puz.n * puz.n) win(); else progress();
}
function progress() {
  if (!path.length) return status('Start on beacon 1.');
  const left = puz.n * puz.n - path.length, nx = nextNum();
  status(nx > lastNum ? `${left} ${left === 1 ? 'square' : 'squares'} left.` : `Next: beacon ${nx}. ${left} ${left === 1 ? 'square' : 'squares'} left.`);
}
function popTo(len) { if (path.length <= len) return; while (path.length > len) { onPath[path.pop()] = -1; } if (len >= 1) sound.back(); progress(); }
function begin() { if (!path.length) push(puz.waypoints[0].cell); }
function explain(why, to) {
  if (why === 'order') { status(`Beacon ${wpAt.get(to)} comes later. Head for beacon ${nextNum()} first.`, true); flashCell(to, 'bad'); sound.err(); buzz(30); }
  else if (why === 'early') { status(`Beacon ${lastNum} is the landing. Fill every other square first.`, true); flashCell(to, 'bad'); sound.err(); buzz(30); }
  else if (why === 'wall') { status('There is a wall in the way.', true); sound.err(); }
}
// walk the head toward a cell under the pointer one square at a time, so quick drags never skip squares
function steer(target) {
  if (target < 0 || solved || !path.length) return;
  if (onPath[target] >= 0) { if (onPath[target] < path.length - 1) popTo(onPath[target] + 1); return; }
  for (let guard = 0; guard < 12 && head() !== target; guard++) {
    const n = puz.n, h = head(), hx = h % n, hy = (h / n) | 0, tx = target % n, ty = (target / n) | 0;
    const dx = Math.sign(tx - hx), dy = Math.sign(ty - hy);
    const opts = Math.abs(tx - hx) >= Math.abs(ty - hy) ? [[dx, 0], [0, dy]] : [[0, dy], [dx, 0]];
    let moved = false, why = '';
    for (const [ox, oy] of opts) {
      if (!ox && !oy) continue;
      const to = h + ox + oy * n, w = canStep(to);
      if (!w) { push(to); moved = true; break; }
      if (!why || w === 'order' || w === 'early') why = w;
      if (to === target && w) { explain(w, to); return; }
    }
    if (!moved) { if (why === 'order' || why === 'early') explain(why, h); return; }
    if (solved) return;
  }
}

// ---------- pointer ----------
let drag = null;
canvas.addEventListener('pointerdown', e => {
  if (solved || winAnim) return;
  e.preventDefault(); sound.unlock();
  const {c} = hit(e); if (c < 0) return;
  canvas.setPointerCapture(e.pointerId);
  drag = {id: e.pointerId, start: c, moved: false, t: performance.now(), wasHead: path.length && c === head()};
  if (!path.length) { if (c === puz.waypoints[0].cell) begin(); else { status('Start on beacon 1.', true); flashCell(puz.waypoints[0].cell, 'ok'); drag = null; } return; }
  if (onPath[c] >= 0) { if (c !== head()) { popTo(onPath[c] + 1); drag.cut = true; } return; }
  steer(c);
});
canvas.addEventListener('pointermove', e => {
  if (!drag || e.pointerId !== drag.id) return;
  e.preventDefault();
  const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
  for (const ev of (evs.length ? evs : [e])) {
    const h = hit(ev); if (h.c < 0 || h.c === head()) continue;
    // a little hysteresis: only take a new square once the pointer is clear of the edge
    if (Math.abs(h.fx - .5) > .42 || Math.abs(h.fy - .5) > .42) continue;
    drag.moved = true; steer(h.c);
  }
});
function up(e) {
  if (!drag || e.pointerId !== drag.id) return;
  const tap = !drag.moved && !drag.cut && drag.wasHead && performance.now() - drag.t < 350;
  if (tap && !solved) popTo(path.length - 1);
  drag = null;
}
canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
canvas.addEventListener('touchmove', e => e.preventDefault(), {passive: false});
canvas.addEventListener('keydown', e => {
  if (solved) return;
  const n = puz.n, d = {ArrowUp: -n, ArrowDown: n, ArrowLeft: -1, ArrowRight: 1}[e.key];
  if (d !== undefined) {
    e.preventDefault(); sound.unlock();
    if (!path.length) { begin(); return; }
    const h = head(), to = h + d;
    if ((d === 1 && h % n === n - 1) || (d === -1 && h % n === 0) || to < 0 || to >= n * n) return;
    if (path.length > 1 && to === path[path.length - 2]) { popTo(path.length - 1); return; }
    const w = canStep(to); if (!w) push(to); else explain(w, to);
  } else if (e.key === 'Backspace' || e.key === 'z' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); popTo(path.length - 1); }
});
$('#fp-undo').onclick = () => { if (!solved) popTo(path.length - 1); };
$('#fp-reset').onclick = () => { if (solved) return; popTo(0); elapsed = 0; timerOn = false; tick(); status('Reset. Start on beacon 1.'); };
$('#tab-daily').onclick = () => { if (mode !== 'daily') startDaily(); };
$('#tab-practice').onclick = () => { if (mode !== 'practice') startPractice(); };
document.querySelectorAll('#fp-sizes button').forEach(b => b.onclick = () => { practiceSize = +b.dataset.size; store.set(PRACTICE_SIZE, practiceSize); startPractice(); });
$('#fp-next').onclick = () => { startPractice(); canvas.focus({preventScroll: true}); };

// ---------- win ----------
function win() {
  if (!checkPath(puz, path)) return;
  solved = true; timerOn = false; elapsed = Math.max(1, Math.round((performance.now() - t0) / 1000)); tick();
  status('Route complete. Every square flown.');
  const s = stats;
  if (mode === 'daily' && dailyDate === today && !s.history[today]) {
    s.streak = s.last === prevDay(today) ? s.streak + 1 : 1; s.maxStreak = Math.max(s.maxStreak, s.streak); s.last = today; s.played++;
    s.history[today] = elapsed; const keys = Object.keys(s.history).sort(); while (keys.length > 60) delete s.history[keys.shift()];
    winBest(); store.set(STATS, s);
    award(() => window.DexmPoints.earn('flightpath', window.DexmPoints.EARN.flightpath || 100, 'flightpath:' + today));
  } else if (mode === 'practice') { winBest(); store.set(STATS, s); award(() => window.DexmPoints.earnPractice('flightpath', today)); }
  sound.win();
  if (reduce.matches) showWin(true); else { winAnim = {t: performance.now(), dur: 900 + path.length * 45}; }
}
let newBest = false;
function winBest() { const k = puz.n, b = stats.best[k]; newBest = !b || elapsed < b; if (newBest) stats.best[k] = elapsed; }
let earned = null;
function award(fn) { earned = null; try { if (window.DexmPoints) { const r = fn(); if (r && r.ok) earned = r.balance; } } catch (e) {} }
function shareText() { return mode === 'daily' ? `Flight Path #${puz.number} \u2708 ${fmt(elapsed)} \uD83D\uDFE9 ${URL_TEXT}` : `Flight Path practice ${puz.n}x${puz.n} \u2708 ${fmt(elapsed)} \uD83D\uDFE9 ${URL_TEXT}`; }
function showWin(fresh) {
  winAnim = null; renderStats();
  $('#fp-win').hidden = false;
  $('#fp-win-h').textContent = mode === 'daily' ? `Puzzle #${puz.number} landed` : 'Practice landed';
  $('#fp-win-time').textContent = fmt(elapsed);
  const bits = [];
  if (mode === 'daily') bits.push(`Streak ${stats.streak} ${stats.streak === 1 ? 'day' : 'days'}`);
  if (fresh && newBest) bits.push(`new best for ${puz.n}x${puz.n}`); else if (stats.best[puz.n]) bits.push(`best ${puz.n}x${puz.n} ${fmt(stats.best[puz.n])}`);
  if (fresh && earned != null) bits.push(mode === 'daily' ? 'plus 100 points' : 'plus 20 points');
  $('#fp-win-detail').textContent = bits.join(', ') + '.';
  if (mode === 'daily') $('#fp-win-detail').textContent += ' A new one at midnight UTC.';
  const ta = $('#fp-share-text'); ta.value = shareText(); ta.hidden = true; $('#fp-copied').textContent = '';
  $('#fp-share').hidden = false;
  if (fresh) $('#fp-win-h').focus({preventScroll: true});
}
$('#fp-share').onclick = async () => {
  const t = shareText(), ta = $('#fp-share-text'); ta.value = t;
  try { await navigator.clipboard.writeText(t); $('#fp-copied').textContent = 'Copied. Paste it anywhere.'; }
  catch (e) { ta.hidden = false; ta.select(); $('#fp-copied').textContent = 'Copy the text above.'; }
};

// ---------- stats ----------
function renderStats() {
  const s = stats, b = [5, 6, 7].map(k => s.best[k] ? `${k}x${k} ${fmt(s.best[k])}` : '').filter(Boolean);
  const days = []; for (let i = 6, d = today; i >= 0; i--) days.unshift(d), d = prevDay(d);
  const strip = days.map(d => `<span class="${s.history[d] ? 'on' : ''}" title="${d}${s.history[d] ? ': ' + fmt(s.history[d]) : ''}"></span>`).join('');
  const live = s.last === today || s.last === prevDay(today) ? s.streak : 0;
  $('#fp-streak').textContent = live;
  $('#fp-stats').innerHTML = `<div><small>Last 7 days</small><span class="fp-strip" aria-label="${days.filter(d => s.history[d]).length} of the last 7 days solved">${strip}</span></div><div><small>Best streak</small><b>${s.maxStreak}</b></div><div><small>Solved</small><b>${s.played}</b></div><div><small>Best times</small><b>${b.join(' / ') || 'none yet'}</b></div>`;
}
function tick() { $('#fp-time').textContent = fmt(timerOn ? (performance.now() - t0) / 1000 : elapsed); }
setInterval(() => { if (timerOn) tick(); }, 250);

// ---------- sound (off until you turn it on) ----------
const sound = (() => {
  let on = store.get(SOUND, false), ac = null;
  const btn = $('#fp-sound'), show = () => { btn.textContent = on ? 'Sound on' : 'Sound off'; btn.setAttribute('aria-pressed', on); };
  show(); btn.onclick = () => { on = !on; store.set(SOUND, on); show(); unlock(); if (on) tone(880, .08, .05, 'sine'); };
  function unlock() { if (!on) return; try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume(); } catch (e) {} }
  function tone(f, dur, vol, type = 'sine', when = 0, f2) {
    if (!on || !ac) return; const t = ac.currentTime + when, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .008); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g).connect(ac.destination); o.start(t); o.stop(t + dur + .02);
  }
  return {unlock, step: p => tone(420 + 380 * p, .05, .035, 'triangle'), back: () => tone(300, .04, .025, 'triangle'),
    ping: p => { tone(900 + 500 * p, .18, .06, 'sine'); tone(1350 + 700 * p, .22, .03, 'sine', .05); },
    err: () => tone(160, .14, .05, 'square', 0, 110),
    win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, .35, .05, 'sine', i * .09))};
})();
const buzz = ms => { try { if (navigator.vibrate && matchMedia('(pointer: coarse)').matches) navigator.vibrate(ms); } catch (e) {} };
function flashCell(c, kind) { flash = {c, kind, t: performance.now()}; }

// ---------- drawing ----------
const ACID = '#d6ff00', GREEN = '120,255,150';
let sweep = 0, lastT = performance.now();
function plane(x, y, a, s, alpha = 1) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(s, s); ctx.globalAlpha = alpha;
  ctx.shadowColor = ACID; ctx.shadowBlur = 12 * dpr;
  ctx.fillStyle = '#f4ffd0'; ctx.strokeStyle = '#0b1206'; ctx.lineWidth = .9;
  ctx.beginPath(); // nose to the right
  ctx.moveTo(11, 0); ctx.quadraticCurveTo(9, -1.6, 5, -1.6); ctx.lineTo(1, -1.6); ctx.lineTo(-3, -9.5); ctx.lineTo(-5.4, -9.5); ctx.lineTo(-3.2, -1.6);
  ctx.lineTo(-7.5, -1.4); ctx.lineTo(-9.6, -4.6); ctx.lineTo(-11, -4.6); ctx.lineTo(-10, 0);
  ctx.lineTo(-11, 4.6); ctx.lineTo(-9.6, 4.6); ctx.lineTo(-7.5, 1.4); ctx.lineTo(-3.2, 1.6); ctx.lineTo(-5.4, 9.5); ctx.lineTo(-3, 9.5); ctx.lineTo(1, 1.6); ctx.lineTo(5, 1.6); ctx.quadraticCurveTo(9, 1.6, 11, 0);
  ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0; ctx.stroke(); ctx.restore();
}
function trail(pts, upto, alphaMul = 1) {
  if (pts.length < 2) return;
  const line = w => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); if (upto) ctx.lineTo(upto[0], upto[1]); ctx.lineWidth = w; ctx.stroke(); };
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = `rgba(214,255,0,${.16 * alphaMul})`; line(cell * .62);
  ctx.save(); ctx.shadowColor = ACID; ctx.shadowBlur = 16 * dpr; ctx.strokeStyle = `rgba(214,255,0,${.9 * alphaMul})`; line(cell * .2); ctx.restore();
  ctx.strokeStyle = `rgba(250,255,225,${.85 * alphaMul})`; line(Math.max(1.5, cell * .05));
}
function draw(now) {
  const dt = Math.min(64, now - lastT); lastT = now;
  if (!puz || !W) return requestAnimationFrame(draw);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const n = puz.n, motion = !reduce.matches, cx = W / 2, cy = W / 2, R = W * .72;
  // scope
  ctx.fillStyle = '#040704'; ctx.fillRect(0, 0, W, W);
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R); g.addColorStop(0, 'rgba(40,90,40,.35)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, W);
  ctx.strokeStyle = `rgba(${GREEN},.08)`; ctx.lineWidth = 1;
  for (let r = W * .12; r < R; r += W * .12) { ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, W); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.stroke();
  if (motion) {
    sweep = (sweep + dt * .0011) % (Math.PI * 2);
    if (ctx.createConicGradient) {
      const cg = ctx.createConicGradient(sweep - .9, cx, cy);
      cg.addColorStop(0, 'rgba(120,255,150,0)'); cg.addColorStop(.14, 'rgba(120,255,150,.13)'); cg.addColorStop(.1435, 'rgba(120,255,150,0)'); cg.addColorStop(1, 'rgba(120,255,150,0)');
      ctx.fillStyle = cg; ctx.fillRect(0, 0, W, W);
    }
  }
  // cells
  for (let c = 0; c < n * n; c++) {
    const x = pad + (c % n) * cell, y = pad + ((c / n) | 0) * cell;
    ctx.fillStyle = onPath[c] >= 0 ? 'rgba(214,255,0,.075)' : 'rgba(120,255,150,.025)';
    ctx.fillRect(x + 1.5, y + 1.5, cell - 3, cell - 3);
  }
  ctx.strokeStyle = `rgba(${GREEN},.22)`; ctx.lineWidth = 1; ctx.beginPath();
  for (let i = 0; i <= n; i++) { const p = pad + i * cell; ctx.moveTo(pad, p); ctx.lineTo(W - pad, p); ctx.moveTo(p, pad); ctx.lineTo(p, W - pad); }
  ctx.stroke();
  ctx.strokeStyle = `rgba(${GREEN},.55)`; ctx.lineWidth = 1.5; ctx.strokeRect(pad, pad, W - 2 * pad, W - 2 * pad);
  // walls
  ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = '#eafff0'; ctx.shadowColor = 'rgba(160,255,190,.9)'; ctx.shadowBlur = 8 * dpr; ctx.lineWidth = Math.max(3, cell * .1);
  for (const [a, b] of puz.walls) {
    const [ax, ay] = cellXY(a), [bx, by] = cellXY(b), mx = (ax + bx) / 2, my = (ay + by) / 2, h = cell * .5;
    ctx.beginPath(); if (ax !== bx) { ctx.moveTo(mx, my - h); ctx.lineTo(mx, my + h); } else { ctx.moveTo(mx - h, my); ctx.lineTo(mx + h, my); } ctx.stroke();
  }
  ctx.restore();
  // the trail, with a smoothly moving head
  const pts = path.map(cellXY);
  let fly = null;
  if (winAnim) {
    const k = Math.min(1, (now - winAnim.t) / winAnim.dur), e = k < .5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2, f = e * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(f)), u = f - i;
    fly = {x: pts[i][0] + (pts[i + 1][0] - pts[i][0]) * u, y: pts[i][1] + (pts[i + 1][1] - pts[i][1]) * u, a: Math.atan2(pts[i + 1][1] - pts[i][1], pts[i + 1][0] - pts[i][0]), i, k};
    trail(pts, null, .35); trail(pts.slice(0, i + 1), [fly.x, fly.y], 1);
    if (k >= 1) setTimeout(() => showWin(true), 120);
  } else if (pts.length) {
    const tgt = pts[pts.length - 1], s = motion ? 1 - Math.pow(.0005, dt / 1000 * 2.2) : 1;
    headX += (tgt[0] - headX) * s; headY += (tgt[1] - headY) * s;
    if (Math.hypot(tgt[0] - headX, tgt[1] - headY) > cell * 1.5) { headX = tgt[0]; headY = tgt[1]; }
    trail(pts.slice(0, -1), [headX, headY]);
  }
  // beacons
  pulse = motion ? now / 1000 : 0;
  const want = nextNum(), r0 = cell * .3;
  for (const w of puz.waypoints) {
    const [x, y] = cellXY(w.cell), done = onPath[w.cell] >= 0 && (!fly || onPath[w.cell] <= fly.i + 1), next = !solved && w.num === want && path.length;
    if (!done) {
      const ph = (pulse * .8 + w.num * .13) % 1;
      if (motion || next) { ctx.strokeStyle = `rgba(${next ? '214,255,0' : GREEN},${(next ? .7 : .35) * (1 - ph)})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, r0 + ph * cell * .32, 0, 7); ctx.stroke(); }
    }
    ctx.save(); ctx.shadowColor = done ? ACID : `rgba(${GREEN},.9)`; ctx.shadowBlur = (done ? 14 : 8) * dpr;
    ctx.fillStyle = done ? ACID : '#07140a'; ctx.beginPath(); ctx.arc(x, y, r0, 0, 7); ctx.fill(); ctx.restore();
    ctx.strokeStyle = done ? '#f6ffd6' : (next ? ACID : `rgba(${GREEN},.95)`); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r0, 0, 7); ctx.stroke();
    ctx.fillStyle = done ? '#0b1206' : '#eaffef'; ctx.font = `800 ${Math.round(cell * .3)}px ui-monospace,Menlo,Consolas,monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(w.num, x, y + 1);
  }
  // flash
  if (flash) {
    const k = (now - flash.t) / 450;
    if (k >= 1) flash = null; else { const [x, y] = cellXY(flash.c); ctx.strokeStyle = flash.kind === 'bad' ? `rgba(255,90,70,${1 - k})` : `rgba(214,255,0,${1 - k})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, r0 + k * cell * .45, 0, 7); ctx.stroke(); }
  }
  // the plane
  const sc = cell / 30;
  if (fly) { plane(fly.x, fly.y, fly.a, sc * 1.1); }
  else if (pts.length) {
    let a = pts.length > 1 ? angleAt(path.length - 1) : -Math.PI / 2, d = ((a - headAng + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    headAng += motion ? d * Math.min(1, dt / 70) : d;
    plane(headX, headY, headAng, sc * (solved ? 1.05 : 1));
  }
  requestAnimationFrame(draw);
}

// ---------- start ----------
new ResizeObserver(() => puz && resize()).observe(canvas);
const help = $('#fp-howto');
const openHelp = () => { if (help.showModal) help.showModal(); else help.setAttribute('open', ''); };
$('#fp-help').onclick = openHelp;
$('#fp-howto-go').onclick = () => { help.close ? help.close() : help.removeAttribute('open'); store.set(SEEN, 1); canvas.focus({preventScroll: true}); };
help.addEventListener('close', () => store.set(SEEN, 1));
startDaily(); renderStats();
if (!store.get(SEEN, 0) && !params.has('nohelp')) openHelp();
requestAnimationFrame(draw);
window.__fp = {
  get puzzle() { return puz; }, get path() { return path.slice(); }, get solved() { return solved; }, get mode() { return mode; }, shareText,
  cellCenter(c) { const r = canvas.getBoundingClientRect(), [x, y] = cellXY(c); return {x: r.left + x, y: r.top + y}; }
};
