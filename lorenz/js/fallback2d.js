/** Flat fallback when WebGL or the three.js download isn't available. Same API as machine3d.js.
 *  Each wheel is drawn face on in its place in the row, cams round the rim, the reading point at the top. */
import {LAYOUT, WIDTH} from './layout.js';
const PALETTE = {dark: {mu: '#ffbf69', rim: '#606b58', pos: '#ffffff', up: '#d6ff00', down: '#3a4235', pointer: '#d6ff00'},
  light: {mu: '#9a6a00', rim: '#828a78', pos: '#15170f', up: '#5f7800', down: '#c3c8ba', pointer: '#4b5e00'}};
const colours = () => PALETTE[document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'];
export function createMachine2D(stage, {reducedMotion = () => false, labels} = {}) {
  const canvas = document.createElement('canvas'); stage.prepend(canvas);
  const ctx = canvas.getContext('2d');
  const wheels = LAYOUT.map(w => ({...w, bits: new Array(w.size).fill(0), pos: 0, angle: 0, target: 0, dim: false}));
  let w = 1, h = 1, scale = 1, frame = null, disposed = false;
  function resize() {
    const r = stage.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    w = Math.max(1, r.width); h = Math.max(1, r.height); canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px'; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    scale = Math.min((w - 24) / (WIDTH + 0.8), (h - 40) / 1.2); draw();
  }
  const cx = x => w / 2 + x * scale, cy = () => h / 2 + 14;
  function draw() {
    ctx.clearRect(0, 0, w, h); const c = colours();
    for (const wh of wheels) {
      const x = cx(wh.x), y = cy(), r = scale * 0.29 * (0.55 + 0.45 * wh.size / 61);
      ctx.globalAlpha = wh.dim ? .3 : 1;
      ctx.strokeStyle = wh.group === 'mu' ? c.mu : c.rim; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
      for (let i = 0; i < wh.size; i++) {
        const a = -Math.PI / 2 + (i - wh.pos) * Math.PI * 2 / wh.size + (wh.angle - wh.target), up = wh.bits[i] === 1, rr = r + (up ? 3 : -2);
        ctx.fillStyle = i === wh.pos ? c.pos : up ? c.up : c.down;
        ctx.beginPath(); ctx.arc(x + Math.cos(a) * rr, y + Math.sin(a) * rr, up ? 2.2 : 1.5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = c.pointer; ctx.beginPath(); ctx.moveTo(x, y - r - 6); ctx.lineTo(x - 4, y - r - 12); ctx.lineTo(x + 4, y - r - 12); ctx.fill();
      ctx.globalAlpha = 1;
      const el = labels?.[LAYOUT.indexOf(LAYOUT.find(l => l.id === wh.id))];
      if (el) el.style.transform = `translate(${x.toFixed(1)}px,${(y - r - 14).toFixed(1)}px) translate(-50%,-100%)`;
    }
  }
  function tick() {
    frame = null; if (disposed) return; let moving = false;
    for (const wh of wheels) { const d = wh.target - wh.angle; if (Math.abs(d) > 1e-3) { wh.angle += d * .3; moving = true; } else wh.angle = wh.target; }
    draw(); if (moving) frame = requestAnimationFrame(tick);
  }
  const request = () => { if (frame === null && !disposed) frame = requestAnimationFrame(tick); };
  const ro = new ResizeObserver(resize); ro.observe(stage); resize();
  const retheme = () => { if (!disposed) draw(); }; window.addEventListener('dexm:theme', retheme);
  return {
    kind: '2d',
    setPatterns(p) { wheels.forEach(wh => { if (p?.[wh.id]) wh.bits = p[wh.id].slice(); }); draw(); },
    setPositions(pos, {animate = true} = {}) {
      wheels.forEach(wh => { if (pos?.[wh.id] === undefined) return; const p = pos[wh.id] - 1; if (p !== wh.pos) { const step = (p - wh.pos + wh.size) % wh.size; wh.pos = p; wh.angle = wh.target + (animate && !reducedMotion() ? step * Math.PI * 2 / wh.size : 0); } });
      request();
    },
    setDim(ids) { const s = new Set(ids || []); wheels.forEach(wh => { wh.dim = s.has(wh.id); }); draw(); },
    setIdle() {}, celebrate() { return false; },
    dispose() { disposed = true; ro.disconnect(); window.removeEventListener('dexm:theme', retheme); if (frame !== null) cancelAnimationFrame(frame); canvas.remove(); }
  };
}
