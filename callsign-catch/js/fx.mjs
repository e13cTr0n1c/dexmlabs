// Game feel with no libraries: count-up numbers, canvas sparks, holo tilt and a buzz on a hit.
export const calm = () => !!window.__ccFast || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const fmt = n => n.toLocaleString('en-GB');

// Counts a stat up from what it showed before. Sets the final value at once when motion is off.
export function countTo(el, to) {
  const from = +(el.dataset.n || 0); el.dataset.n = to;
  if (calm() || from === to) { el.textContent = fmt(to); return; }
  const t0 = performance.now(), dur = Math.min(900, 300 + Math.abs(to - from) * 6);
  el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
  const step = t => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
    el.textContent = fmt(Math.round(from + (to - from) * e)); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}

const COUNT = {common: 70, uncommon: 100, rare: 150, legendary: 240};
// Sparks burst out from the centre of the card, fall with a little gravity and fade.
export function sparks(canvas, colour, tier = 'common') {
  if (!canvas || calm()) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1), w = canvas.clientWidth, h = canvas.clientHeight;
  canvas.width = w * dpr; canvas.height = h * dpr;
  const g = canvas.getContext('2d'); if (!g) return; g.scale(dpr, dpr);
  const cols = [colour, '#ffffff', '#d6ff00'], ps = [];
  for (let i = 0; i < (COUNT[tier] || 50); i++) {
    const a = Math.random() * Math.PI * 2, v = 2 + Math.random() * (tier === 'legendary' ? 9 : 6);
    ps.push({x: w / 2, y: h * 0.45, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, life: 1, d: 0.008 + Math.random() * 0.014, s: 2.5 + Math.random() * 3.5, c: cols[i % 3]});
  }
  const tick = () => {
    g.clearRect(0, 0, w, h); let alive = 0;
    for (const p of ps) { if (p.life <= 0) continue; alive++;
      p.x += p.vx; p.y += p.vy; p.vy += 0.12; p.vx *= 0.985; p.life -= p.d;
      g.globalAlpha = Math.max(0, p.life); g.fillStyle = p.c; g.shadowColor = p.c; g.shadowBlur = 8; g.beginPath();
      g.moveTo(p.x, p.y); g.lineTo(p.x - p.vx * 2.2, p.y - p.vy * 2.2); g.lineTo(p.x + p.s, p.y); g.closePath(); g.fill(); }
    if (alive) requestAnimationFrame(tick); else g.clearRect(0, 0, w, h);
  };
  requestAnimationFrame(tick);
}

// A short buzz on phones that support it. Longer for rarer cards.
export function buzz(tier) {
  if (calm() || !navigator.vibrate) return;
  try { navigator.vibrate({common: 30, uncommon: [30, 40, 30], rare: [40, 50, 60], legendary: [60, 40, 60, 40, 120]}[tier] || 30); } catch {}
}

// Cards lean a little towards the pointer and the foil follows it. Kept small so the text stays readable.
export const TILT_MAX = 3; // degrees, either way
export const tiltFor = (x, y) => { const k = v => Math.max(-1, Math.min(1, v)); return {rx: +(k((0.5 - y) * 2) * TILT_MAX).toFixed(2), ry: +(k((x - 0.5) * 2) * TILT_MAX).toFixed(2)}; };
// One listener for the whole wall. Off with reduced motion and on touch screens.
export function holo(root) {
  if (!root || calm() || !(window.matchMedia && matchMedia('(hover: hover)').matches)) return;
  let cur = null;
  root.addEventListener('pointermove', e => {
    const c = e.target.closest('.cc-card:not(.empty)');
    if (cur && cur !== c) reset(cur); cur = c; if (!c) return;
    const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    const t = tiltFor(x, y); c.style.setProperty('--rx', t.rx + 'deg'); c.style.setProperty('--ry', t.ry + 'deg');
    c.style.setProperty('--mx', (x * 100).toFixed(1) + '%'); c.style.setProperty('--my', (y * 100).toFixed(1) + '%'); c.classList.add('tilt');
  });
  root.addEventListener('pointerleave', () => { if (cur) reset(cur); cur = null; });
  const reset = c => { c.classList.remove('tilt'); ['--rx', '--ry', '--mx', '--my'].forEach(p => c.style.removeProperty(p)); };
}
