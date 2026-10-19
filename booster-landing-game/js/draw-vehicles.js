// The two boosters, drawn in their own frame: base (where the legs or engines meet the ground) at 0,0,
// y up is negative, k pixels per metre. o: {throttle, gimbal, legs, legsBroken, fins, soot, heat, mach, thin, rcs, night, t, reduced}
const hash = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
function cyl(x, r, k, top, bot, stops) { const g = x.createLinearGradient(-r * k, 0, r * k, 0); stops.forEach(([p, c]) => g.addColorStop(p, c)); x.fillStyle = g; x.fillRect(-r * k, top * k, 2 * r * k, (bot - top) * k); }
function lattice(x, x0, y0, w, h, n, col, line) { x.fillStyle = col; x.fillRect(Math.min(x0, x0 + w), Math.min(y0, y0 + h), Math.abs(w), Math.abs(h)); if (Math.abs(w) < 4 && Math.abs(h) < 4) return; x.strokeStyle = line; x.lineWidth = Math.max(0.5, Math.abs(w) / 30); x.beginPath(); for (let i = 1; i < n; i++) { x.moveTo(x0 + w * i / n, y0); x.lineTo(x0 + w * i / n, y0 + h); x.moveTo(x0, y0 + h * i / n); x.lineTo(x0 + w, y0 + h * i / n); } x.stroke(); x.strokeStyle = col; x.lineWidth = Math.max(1, Math.abs(w) / 14); x.strokeRect(Math.min(x0, x0 + w), Math.min(y0, y0 + h), Math.abs(w), Math.abs(h)); }
function plume(x, k, o, r, exitY, many) {
  const th = o.throttle; if (!(th > 0)) return; const thin = o.thin, fl = o.reduced ? 1 : 0.85 + Math.random() * 0.3;
  const len = (many ? 30 : 14) * (1 + 1.8 * thin) * th * k * fl, wid = (r * 0.9 + (many ? 10 : 5) * thin) * k;
  const g = x.createLinearGradient(0, exitY * k, 0, exitY * k + len); g.addColorStop(0, 'rgba(255,255,235,.97)'); g.addColorStop(0.12, many ? 'rgba(255,215,150,.9)' : 'rgba(255,200,110,.9)'); g.addColorStop(0.5, 'rgba(255,130,50,.5)'); g.addColorStop(1, 'rgba(255,90,30,0)');
  x.fillStyle = g; x.beginPath(); x.moveTo(-r * 0.75 * k, exitY * k); x.quadraticCurveTo(-wid, exitY * k + len * 0.35, 0, exitY * k + len); x.quadraticCurveTo(wid, exitY * k + len * 0.35, r * 0.75 * k, exitY * k); x.fill();
  // Shock diamonds in thick air
  if (thin < 0.4 && k > 1.6) { x.fillStyle = 'rgba(255,255,255,.55)'; for (let i = 1; i <= 3; i++) { const yy = exitY * k + len * i * 0.17, ww = r * 0.35 * k * (1 - i * 0.18); x.beginPath(); x.moveTo(-ww, yy); x.lineTo(0, yy - ww * 0.8); x.lineTo(ww, yy); x.lineTo(0, yy + ww * 0.8); x.fill(); } }
  const gl = x.createRadialGradient(0, exitY * k, 0, 0, exitY * k, (many ? 40 : 22) * k); gl.addColorStop(0, `rgba(255,170,80,${0.4 * th})`); gl.addColorStop(1, 'rgba(255,170,80,0)'); x.fillStyle = gl; x.fillRect(-(many ? 40 : 22) * k, (exitY - (many ? 40 : 22)) * k, (many ? 80 : 44) * k, (many ? 80 : 44) * k);
}
// The engine glow seen a little from below: 9 engines in a ring of 8 round a centre one, or 33 in three rings.
function engineGlow(x, k, o, r, y, rings) {
  const th = o.throttle > 0 ? o.throttle : 0; if (!th) return; x.save(); x.translate(0, y * k);
  const eg = x.createRadialGradient(0, 0, 0, 0, 0, r * 1.2 * k); eg.addColorStop(0, `rgba(255,236,200,${0.85 * th})`); eg.addColorStop(1, 'rgba(255,150,60,0)'); x.fillStyle = eg; x.beginPath(); x.ellipse(0, 0, r * 1.2 * k, r * 0.35 * k, 0, 0, 7); x.fill();
  x.fillStyle = `rgba(255,255,240,${0.9 * th})`; for (const [n, rr] of rings) for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + 0.3; x.beginPath(); x.ellipse(Math.cos(a) * rr * r * k, Math.sin(a) * rr * r * 0.28 * k, Math.max(0.6, r * 0.09 * k), Math.max(0.4, r * 0.03 * k), 0, 0, 7); x.fill(); }
  x.restore();
}
function bell(x, k, cx, top, h, w0, w1, dark) { const g = x.createLinearGradient((cx - w1 / 2) * k, 0, (cx + w1 / 2) * k, 0); g.addColorStop(0, dark ? '#1a1b1d' : '#2b2c2f'); g.addColorStop(0.45, dark ? '#55585c' : '#777b80'); g.addColorStop(1, '#141517'); x.fillStyle = g; x.beginPath(); x.moveTo((cx - w0 / 2) * k, top * k); x.lineTo((cx + w0 / 2) * k, top * k); x.quadraticCurveTo((cx + w1 / 2) * k, (top + h * 0.5) * k, (cx + w1 / 2) * k, (top + h) * k); x.lineTo((cx - w1 / 2) * k, (top + h) * k); x.quadraticCurveTo((cx - w1 / 2) * k, (top + h * 0.5) * k, (cx - w0 / 2) * k, top * k); x.fill(); }
function soot(x, k, r, bot, o, height) {
  const sh = 5 + o.soot * height; const g = x.createLinearGradient(0, bot * k, 0, (bot - sh) * k); g.addColorStop(0, `rgba(34,28,24,${0.35 + 0.5 * o.soot})`); g.addColorStop(1, 'rgba(34,28,24,0)'); x.fillStyle = g; x.fillRect(-r * k, (bot - sh) * k, 2 * r * k, sh * k);
  if (k < 1.2) return; for (let i = 0; i < 16; i++) { const px = (hash(i) * 2 - 1) * r * 0.92, len = (0.3 + hash(i + 40)) * sh * (0.6 + o.soot * 0.9), wv = (0.08 + hash(i + 80) * 0.22) * r; const sg = x.createLinearGradient(0, bot * k, 0, (bot - len) * k); sg.addColorStop(0, `rgba(25,20,18,${0.25 + o.soot * 0.45})`); sg.addColorStop(1, 'rgba(25,20,18,0)'); x.fillStyle = sg; x.fillRect((px - wv / 2) * k, (bot - len) * k, wv * k, len * k); }
}
function vtext(x, k, txt, cx, cy, size, col, spacing = 0.15) { if (size * k < 5) return; x.save(); x.translate(cx * k, cy * k); x.rotate(-Math.PI / 2); x.fillStyle = col; x.font = `900 ${size * k}px "Arial Black",Arial,sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; if ('letterSpacing' in x) x.letterSpacing = `${spacing * size * k}px`; x.fillText(txt, 0, 0); x.restore(); }
function puff(x, k, side, y, r, len) { const g = x.createRadialGradient(side * (r + len * 0.5) * k, y * k, 0, side * (r + len * 0.5) * k, y * k, len * 0.6 * k); g.addColorStop(0, 'rgba(255,255,255,.85)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.beginPath(); x.moveTo(side * r * k, (y - 0.25) * k); x.lineTo(side * (r + len) * k, (y - len * 0.35) * k); x.lineTo(side * (r + len) * k, (y + len * 0.35) * k); x.lineTo(side * r * k, (y + 0.25) * k); x.fill(); }

// Falcon 9 style first stage: white body, black interstage, four grid fins, four carbon legs, nine engines.
export function drawF9(x, k, o) {
  const r = 1.85, bodyBot = -2.6, interTop = -42.5, interBot = -36.3, lg = o.legsBroken ? 0 : o.legs, fin = o.fins ?? 1, night = o.night;
  const carbon = night ? '#24272b' : '#1b1c1f', carbonHi = night ? '#3a3f45' : '#34363a';
  const legShape = (sg, front) => {
    if (front) { // the front leg swings out towards you: foreshortened
      const len = 6.7 * (1 - lg * 0.55), w0 = 0.9, w1 = 0.55 + lg * 0.5; x.fillStyle = carbon; x.beginPath(); x.moveTo(-w0 / 2 * k, bodyBot * k); x.lineTo(w0 / 2 * k, bodyBot * k); const ty = bodyBot - (1 - lg) * len + lg * (0.3 - bodyBot) * 0.999; x.lineTo(w1 / 2 * k, ty * k); x.lineTo(-w1 / 2 * k, ty * k); x.fill();
      if (lg > 0.6) { x.fillStyle = carbonHi; x.beginPath(); x.ellipse(0, ty * k, 1.0 * k * lg, 0.3 * k, 0, 0, 7); x.fill(); } return; }
    const hx = sg * r, hy = bodyBot, dxL = sg * (8 - r), dyL = -hy, len = Math.hypot(dxL, dyL), a0 = -Math.PI / 2, a1 = Math.atan2(dyL, dxL), da = ((a1 - a0 + 3 * Math.PI) % (2 * Math.PI)) - Math.PI, a = a0 + da * lg;
    const tx = hx + Math.cos(a) * len, ty = hy + Math.sin(a) * len, nx = -Math.sin(a), ny = Math.cos(a);
    x.fillStyle = carbon; x.beginPath(); x.moveTo((hx + nx * 0.45) * k, (hy + ny * 0.45) * k); x.lineTo((hx - nx * 0.45) * k, (hy - ny * 0.45) * k); x.lineTo((tx - nx * 0.25) * k, (ty - ny * 0.25) * k); x.lineTo((tx + nx * 0.25) * k, (ty + ny * 0.25) * k); x.fill();
    if (k > 3) { x.save(); x.clip(); x.strokeStyle = 'rgba(255,255,255,.06)'; x.lineWidth = 1; x.beginPath(); for (let i = -20; i < 20; i++) { x.moveTo((hx + i * 0.5) * k, (hy - 8) * k); x.lineTo((hx + i * 0.5 + 8) * k, (hy + 8) * k); } x.stroke(); x.restore(); }
    if (lg > 0.05) { x.strokeStyle = night ? '#6d737a' : '#8a8f94'; x.lineWidth = Math.max(1, 0.25 * k); x.beginPath(); x.moveTo(hx * k, (hy - 7.5) * k); x.lineTo((hx + (tx - hx) * 0.62) * k, (hy + (ty - hy) * 0.62) * k); x.stroke(); }
    x.fillStyle = carbonHi; x.beginPath(); x.ellipse(tx * k, ty * k, 0.7 * k, 0.22 * k, 0, 0, 7); x.fill();
  };
  // Behind the body: the rear leg and rear fin are hidden. Side legs first.
  legShape(-1); legShape(1);
  // Engines and octaweb
  x.save(); x.translate(0, bodyBot * k); x.rotate(o.gimbal || 0); x.translate(0, -bodyBot * k);
  for (const cx of [-1.15, 1.15, 0]) bell(x, k, cx, -1.7, 1.25, 0.5, 0.95, night);
  plume(x, k, o, r, -0.45, false); x.restore();
  x.fillStyle = night ? '#25272a' : '#2e3033'; x.fillRect(-(r + 0.05) * k, bodyBot * k, 2 * (r + 0.05) * k, 1 * k); // octaweb skirt
  engineGlow(x, k, o, r, -0.5, [[8, 0.62], [1, 0]]);
  // Body
  cyl(x, r, k, interBot, bodyBot, night ? [[0, '#6f757b'], [0.4, '#c3c8cc'], [0.55, '#d6dadd'], [1, '#4f555b']] : [[0, '#b9bec2'], [0.38, '#fdfdfd'], [0.55, '#f2f3f4'], [1, '#9aa0a5']]);
  if (k > 2.2) { x.strokeStyle = 'rgba(0,0,0,.07)'; x.lineWidth = 1; for (let y = bodyBot - 3.6; y > interBot; y -= 3.6) { x.beginPath(); x.moveTo(-r * k, y * k); x.lineTo(r * k, y * k); x.stroke(); } x.fillStyle = 'rgba(80,86,92,.35)'; x.fillRect(0.55 * r * k, interBot * k, 0.12 * k, (bodyBot - interBot) * k); }
  soot(x, k, r, bodyBot, o, 26);
  if (o.heat > 25) { const hg = x.createLinearGradient(0, bodyBot * k, 0, (bodyBot - 8) * k); hg.addColorStop(0, `rgba(255,120,40,${Math.min(0.85, (o.heat - 25) / 80)})`); hg.addColorStop(1, 'rgba(255,120,40,0)'); x.fillStyle = hg; x.fillRect(-(r + 0.4) * k, (bodyBot - 8) * k, 2 * (r + 0.4) * k, 9 * k); }
  // Livery: the name down the side, a DEXM band and stencil
  vtext(x, k, 'SPACEX', 0, -22, 2.2, night ? '#15181b' : '#16191c', 0.08);
  x.fillStyle = '#d6ff00'; x.fillRect(-r * k, -33.2 * k, 2 * r * k, 0.45 * k);
  vtext(x, k, 'DEXM', -0.9, -9.5, 0.8, '#4a5056', 0.1);
  // Front leg on top of the body
  legShape(0, true);
  // Interstage
  cyl(x, r, k, interTop, interBot, [[0, '#0b0c0d'], [0.4, '#2a2c2f'], [0.6, '#222427'], [1, '#060607']]);
  // Cold gas thruster pods
  x.fillStyle = '#3d4044'; for (const sg of [-1, 1]) x.fillRect((sg > 0 ? r - 0.05 : -r - 0.35) * k, -41.6 * k, 0.4 * k, 0.9 * k);
  if (o.rcs) puff(x, k, o.rcs, -41.2, r + 0.3, 5);
  // Grid fins: hinge at the base, fold up flat against the interstage, swing out to horizontal
  const fy = -40.3, fw = 1.7, fh = 1.35, ang = (1 - fin) * Math.PI / 2, titan = night ? '#55595e' : '#3c3f43', line = night ? '#2b2e31' : '#1d1f22';
  for (const sg of [-1, 1]) { x.save(); x.translate(sg * r * k, fy * k); x.rotate(-sg * ang); lattice(x, 0, 0, sg * fw * k, -fh * k, 6, titan, line); x.restore(); }
  // the front fin, seen face on when stowed and edge on when out
  const fwF = 1.3 * (1 - fin * 0.85); lattice(x, -0.65 * k, (fy - fh * (1 - fin * 0.2)) * k, 1.3 * k, fh * (1 - fin * 0.7) * k, 5, titan, line); void fwF;
}
// Super Heavy style booster: stainless steel, 33 engines, four big grid fins, catch pins under them, no legs.
export function drawSH(x, k, o) {
  const r = 4.5, bodyBot = -5.8, top = -71, night = o.night, fin = o.fins ?? 1;
  x.save(); x.translate(0, -2.4 * k); x.rotate(o.gimbal || 0); x.translate(0, 2.4 * k);
  for (let i = 0; i < 9; i++) { const cx = -3.6 + i * 0.9; bell(x, k, cx, -2.6, 2.3, 0.5, 0.95, true); }
  plume(x, k, o, r, -0.3, true); x.restore();
  cyl(x, r, k, -2.6, bodyBot, [[0, '#2a2d30'], [0.5, '#4b5055'], [1, '#1f2225']]); // aft skirt and shielding
  engineGlow(x, k, o, r, -0.4, [[20, 0.82], [10, 0.5], [3, 0.18]]);
  const steel = night ? [[0, '#3f454b'], [0.2, '#8d959d'], [0.33, '#b9c0c6'], [0.5, '#6c737a'], [0.7, '#a3aab1'], [1, '#353a3f']] : [[0, '#7d848a'], [0.18, '#d9dee2'], [0.32, '#f7f9fa'], [0.48, '#a9b0b6'], [0.68, '#e3e7ea'], [0.86, '#c2c8cd'], [1, '#6b7277']];
  cyl(x, r, k, -67.2, bodyBot, steel);
  // weld rings, more when close
  x.strokeStyle = night ? 'rgba(20,24,28,.35)' : 'rgba(60,66,72,.28)'; x.lineWidth = Math.max(0.6, 0.06 * k); const ringStep = k > 2 ? 1.8 : 9; x.beginPath(); for (let y = bodyBot - ringStep; y > -67; y -= ringStep) { x.moveTo(-r * k, y * k); x.lineTo(r * k, y * k); } x.stroke();
  if (k > 2) { x.strokeStyle = 'rgba(255,255,255,.18)'; x.beginPath(); x.moveTo(-1.5 * k, bodyBot * k); x.lineTo(-1.5 * k, -67 * k); x.stroke(); }
  // heat tint and soot near the base
  const tint = x.createLinearGradient(0, bodyBot * k, 0, (bodyBot - 14) * k); tint.addColorStop(0, `rgba(60,40,70,${0.25 + 0.3 * o.soot})`); tint.addColorStop(1, 'rgba(60,40,70,0)'); x.fillStyle = tint; x.fillRect(-r * k, (bodyBot - 14) * k, 2 * r * k, 14 * k);
  soot(x, k, r, bodyBot, o, 18);
  if (o.heat > 25) { const hg = x.createLinearGradient(0, bodyBot * k, 0, (bodyBot - 10) * k); hg.addColorStop(0, `rgba(255,120,40,${Math.min(0.85, (o.heat - 25) / 80)})`); hg.addColorStop(1, 'rgba(255,120,40,0)'); x.fillStyle = hg; x.fillRect(-r * k, (bodyBot - 10) * k, 2 * r * k, 10 * k); }
  // DEXM stencil and acid band
  vtext(x, k, 'DEXM', -2.4, -16, 1.6, night ? '#20252a' : '#3b4248', 0.1); vtext(x, k, 'SPACEX', -1.2, -40, 2.2, night ? '#1a1f24' : '#2b3137', 0.12); x.fillStyle = '#d6ff00'; x.fillRect(-r * k, -8.2 * k, 2 * r * k, 0.5 * k);
  // Hot staging ring with vents, and the top dome
  cyl(x, r, k, -69.6, -67.2, [[0, '#1d2023'], [0.5, '#3c4146'], [1, '#15171a']]);
  x.fillStyle = 'rgba(255,170,90,.15)'; for (let i = 0; i < 10; i++) { const vx = -r + 0.45 + i * 0.9; x.fillRect(vx * k, -69.1 * k, 0.45 * k, 1.4 * k); }
  x.fillStyle = steel[2][1]; x.beginPath(); x.moveTo(-r * k, -69.6 * k); x.quadraticCurveTo(-r * k, top * k, -r * 0.6 * k, top * k); x.lineTo(r * 0.6 * k, top * k); x.quadraticCurveTo(r * k, top * k, r * k, -69.6 * k); x.fill();
  // Catch pins: the hard points the arms lift it by
  for (const sg of [-1, 1]) { x.fillStyle = night ? '#9aa2a9' : '#5d646a'; x.fillRect((sg > 0 ? r : -r - 1.3) * k, -63.6 * k, 1.3 * k, 1.1 * k); x.fillStyle = '#d6ff00'; x.fillRect((sg > 0 ? r + 1.05 : -r - 1.3) * k, -63.6 * k, 0.25 * k, 1.1 * k); }
  // Grid fins: big, fixed, one each side and one face on
  const titan = night ? '#5a5f64' : '#41454a', line = night ? '#2c2f33' : '#202326';
  for (const sg of [-1, 1]) { x.save(); x.translate(sg * r * k, -64.6 * k); x.rotate(-sg * (1 - fin) * Math.PI / 2); lattice(x, 0, 0, sg * 3.4 * k, -2.6 * k, 7, titan, line); x.restore(); }
  lattice(x, -1.8 * k, -66.9 * k, 3.6 * k, 0.9 * k, 7, titan, line);
  if (o.rcs) puff(x, k, o.rcs, -68.4, r + 0.3, 8);
}
export const drawVehicle = (x, id, k, o) => (id === 'sh' ? drawSH : drawF9)(x, k, o);
