import { createReplay, fitCanvas } from '../../../assets/replay-engine.mjs';
import { MISSION, T, ASCENT, EVENTS, planet, craft, MOONS } from './mission.mjs';

const $ = s => document.querySelector(s);
const helio = $('#rp-helio'), close = $('#rp-close'), closeCap = $('#rp-close-cap');
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const TAU = Math.PI * 2;
let col = {};
function colours() { col = { ink: css('--ink'), muted: css('--muted'), edge: css('--edge'), acid: css('--acid-ink'), bg: css('--panel'), earth: '#4f9be8', mars: '#d9653b', moon: '#a59c8e' }; }
colours();
new MutationObserver(() => { colours(); replay.redraw(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

function dot(g, x, y, r, c) { g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
function ring(g, x, y, r, c, dash) { g.strokeStyle = c; g.setLineDash(dash || []); g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke(); g.setLineDash([]); }
function label(g, txt, x, y, c, align) { g.fillStyle = c || col.ink; g.textAlign = align || 'left'; g.fillText(txt, x, y); }

// Heliocentric view: the Sun, the real orbits of Earth and Mars, MMX's path so far and still to come.
function drawHelio(t) {
  const { g, w, h } = fitCanvas(helio);
  g.clearRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2, k = Math.min(w, h) / 2 / 1.75, P = p => [cx + p.x * k, cy - p.y * k];
  g.font = '11px ui-monospace,Menlo,monospace'; g.lineWidth = 1;
  dot(g, cx, cy, 6, '#f4c542');
  ring(g, cx, cy, 1.0 * k, col.edge); ring(g, cx, cy, 1.524 * k, col.edge);
  // the whole path, faint, then the flown part
  const steps = 240, pts = [];
  for (let i = 0; i <= steps; i++) { const tt = T.sep + (T.ret - T.sep) * i / steps; pts.push([tt, P(craft(tt))]); }
  const leg = tt => tt <= T.moi || tt >= T.depart; // while MMX stays at Mars it rides along with the planet, so no trail
  g.strokeStyle = col.muted; g.setLineDash([3, 4]); g.beginPath(); let pen = false; for (const [tt, p] of pts) { if (!leg(tt)) { pen = false; continue; } pen ? g.lineTo(...p) : g.moveTo(...p); pen = true; } g.stroke(); g.setLineDash([]);
  g.strokeStyle = col.acid; g.lineWidth = 2; g.beginPath(); let started = false;
  for (const [tt, p] of pts) { if (tt > t) break; if (!leg(tt)) { started = false; continue; } started ? g.lineTo(...p) : g.moveTo(...p); started = true; }
  if (started && leg(t)) g.lineTo(...P(craft(t))); g.stroke();
  g.lineWidth = 1;
  const E = P(planet('earth', t)), M = P(planet('mars', t)), C = P(craft(t));
  dot(g, ...E, 5, col.earth); label(g, 'Earth', E[0] + 8, E[1] - 6);
  dot(g, ...M, 4.5, col.mars); label(g, 'Mars', M[0] + 8, M[1] - 6);
  g.strokeStyle = col.acid; g.lineWidth = 2; g.beginPath(); g.moveTo(C[0] - 6, C[1]); g.lineTo(C[0] + 6, C[1]); g.moveTo(C[0], C[1] - 6); g.lineTo(C[0], C[1] + 6); g.stroke(); g.lineWidth = 1;
  label(g, 'MMX', C[0] + 8, C[1] + 14, col.acid);
  label(g, 'Sun', cx + 9, cy + 4, col.muted);
  label(g, 'Heliocentric view, from above the Sun', 10, h - 10, col.muted);
}

// Close view: changes with the phase.
function drawClose(t, p, now) {
  const { g, w, h } = fitCanvas(close);
  g.clearRect(0, 0, w, h);
  g.font = '11px ui-monospace,Menlo,monospace'; g.lineWidth = 1;
  const cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2;
  if (p.id === 'launch') return ascent(g, w, h, t);
  if (p.id === 'cruise') return cruise(g, w, h, t);
  // Mars system. Moons move on a display clock: one Phobos orbit every 6 seconds, Deimos at its real ratio.
  const k = R * 0.9 / MOONS.deimos.a, phA = now / 6000 * TAU, deA = phA * MOONS.phobos.p / MOONS.deimos.p;
  const mars = (x, y, s) => { dot(g, x, y, MOONS.marsR * s, col.mars); };
  const ph = [cx + Math.cos(phA) * MOONS.phobos.a * k, cy - Math.sin(phA) * MOONS.phobos.a * k];
  const de = [cx + Math.cos(deA) * MOONS.deimos.a * k, cy - Math.sin(deA) * MOONS.deimos.a * k];
  if (p.id === 'land') return landing(g, w, h, t);
  ring(g, cx, cy, MOONS.phobos.a * k, col.edge); ring(g, cx, cy, MOONS.deimos.a * k, col.edge);
  mars(cx, cy, k); label(g, 'Mars', cx, cy + 4, '#fff', 'center');
  dot(g, ...ph, 3, col.moon); label(g, 'Phobos', ph[0] + 6, ph[1] - 6);
  dot(g, ...de, 2.5, col.moon); label(g, 'Deimos', de[0] + 6, de[1] - 6);
  let sc;
  if (p.id === 'moi') {
    // capture: a long ellipse that is lowered towards Phobos's orbit through the month
    const u = (t - T.moi) / (T.qso - T.moi), ra = 1 + (1 - u) * 0.9, ang = now / 9000 * TAU;
    const a = MOONS.deimos.a * ra * k * 0.7, b = a * (0.35 + 0.6 * u), off = a - MOONS.phobos.a * k * 1.1;
    g.strokeStyle = col.acid; g.setLineDash([4, 3]); g.beginPath(); g.ellipse(cx + off, cy, a, b, 0, 0, TAU); g.stroke(); g.setLineDash([]);
    sc = [cx + off + Math.cos(ang) * a, cy - Math.sin(ang) * b];
    closeCap.textContent = 'Mars system. MMX is captured into a long orbit and works down towards Phobos. The shape of this orbit is my sketch.';
  } else if (p.id === 'qso') {
    // in the frame that turns with Phobos MMX traces a loop around it, twice as long as it is wide
    const q = now / 6000 * TAU, rr = 14;
    const rx = -Math.sin(q) * rr, ry = 2 * Math.cos(q) * rr * 0.5;
    const cs = Math.cos(phA), sn = Math.sin(phA);
    sc = [ph[0] + (ry * cs - rx * sn), ph[1] - (ry * sn + rx * cs)];
    g.strokeStyle = col.acid; g.beginPath(); for (let i = 0; i <= 48; i++) { const a = i / 48 * TAU, x = -Math.sin(a) * rr, y = Math.cos(a) * rr; g.lineTo(ph[0] + (y * cs - x * sn), ph[1] - (y * sn + x * cs)); } g.stroke();
    inset(g, w, h, now, t);
    closeCap.textContent = 'Mars system with Phobos and Deimos to scale. MMX rides in a quasi satellite orbit, a loop around Phobos as seen from the moon. Moon motion is speeded up.';
  } else {
    const u = (t - T.depart) / (T.ret - T.depart);
    if (u > 0.85) return homecoming(g, w, h, (u - 0.85) / 0.15);
    const r = MOONS.phobos.a * k * (1 + u * 14);
    sc = [cx + Math.cos(u * 6 + 0.4) * r, cy - Math.sin(u * 6 + 0.4) * r];
    closeCap.textContent = 'MMX climbs away from Mars, passing Deimos on the way out, then the return module heads for Earth.';
  }
  dot(g, ...sc, 3, col.acid); label(g, 'MMX', sc[0] + 6, sc[1] + 12, col.acid);
}

function inset(g, w, h, now, t) {
  const s = Math.min(w, h) * 0.28, x0 = w - s - 8, y0 = 8, cx = x0 + s / 2, cy = y0 + s / 2;
  g.fillStyle = col.bg; g.strokeStyle = col.edge; g.fillRect(x0, y0, s, s); g.strokeRect(x0, y0, s, s);
  g.fillStyle = col.moon; g.beginPath(); g.ellipse(cx, cy, s * 0.13, s * 0.1, 0, 0, TAU); g.fill();
  const rx = s * 0.2, ry = s * 0.4, q = now / 6000 * TAU;
  g.strokeStyle = col.acid; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, TAU); g.stroke();
  dot(g, cx + Math.cos(q) * rx, cy - Math.sin(q) * ry, 2.5, col.acid);
  label(g, 'Seen from Phobos', x0 + 4, y0 + s - 6, col.muted);
  if (Math.abs(t - EVENTS[0].t) < 40 * 864e5) label(g, 'Idefix released', x0 + 4, y0 + 14, col.acid);
}

function ascent(g, w, h, t) {
  const sec = (t - T.launch) / 1000, Rr = Math.max(w, h) * 1.6, ex = w * 0.28, ey = h + Rr - h * 0.22;
  g.fillStyle = col.earth; g.beginPath(); g.arc(ex, ey, Rr, 0, TAU); g.fill();
  const u = Math.min(1, sec / 4273), path = v => { const a = -Math.PI / 2 + v * 0.55, r = Rr + h * 0.6 * Math.sqrt(v); return [ex + Math.cos(a) * r, ey + Math.sin(a) * r]; };
  g.strokeStyle = col.muted; g.setLineDash([3, 4]); g.beginPath(); for (let i = 0; i <= 60; i++) g.lineTo(...path(i / 60)); g.stroke(); g.setLineDash([]);
  g.strokeStyle = col.acid; g.lineWidth = 2; g.beginPath(); for (let i = 0; i <= 60 * u; i++) g.lineTo(...path(i / 60)); g.lineTo(...path(u)); g.stroke(); g.lineWidth = 1;
  const p = path(u); dot(g, ...p, 4, col.acid);
  let last = ASCENT[0]; for (const e of ASCENT) if (t >= e.t) last = e;
  g.font = '12px ui-monospace,Menlo,monospace';
  ASCENT.forEach((e, i) => { const done = t >= e.t; label(g, `${done ? '✓' : '·'} ${fmtT((e.t - T.launch) / 1000)} ${e.label}`, 10, 18 + i * 16, e === last ? col.acid : done ? col.ink : col.muted); });
  closeCap.textContent = 'H3 ascent from Tanegashima. Event times are from JAXA\'s flight plan; the drawn track is not to scale.';
}
function fmtT(s) { s = Math.round(s); return `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; }

function cruise(g, w, h, t) {
  const c = craft(t), e = planet('earth', t), m = planet('mars', t);
  const de = Math.hypot(c.x - e.x, c.y - e.y), dm = Math.hypot(c.x - m.x, c.y - m.y);
  const u = (t - T.sep) / (T.moi - T.sep);
  dot(g, w * 0.12, h * 0.5, Math.max(2, 22 * (1 - u) + 2), col.earth);
  dot(g, w * 0.88, h * 0.5, Math.max(2, 4 + 26 * u), col.mars);
  const x = w * (0.12 + 0.76 * u); dot(g, x, h * 0.5, 4, col.acid);
  g.font = '12px ui-monospace,Menlo,monospace';
  label(g, 'Earth', w * 0.12, h * 0.5 + 44, col.ink, 'center'); label(g, 'Mars', w * 0.88, h * 0.5 + 44, col.ink, 'center');
  label(g, `${(de * 149.6).toFixed(0)} million km from Earth`, 10, 20, col.ink);
  label(g, `${(dm * 149.6).toFixed(0)} million km from Mars`, 10, 38, col.ink);
  label(g, 'Distances from my sketched path, not the flown one', 10, h - 10, col.muted);
  closeCap.textContent = 'Cruise. Earth shrinks behind and Mars grows ahead over about ten months.';
}

function landing(g, w, h, t) {
  const u = (t - T.land) / (T.depart - T.land), cx = w / 2, gy = h * 0.72;
  g.fillStyle = col.moon; g.beginPath(); g.ellipse(cx, gy + h * 0.9, w * 0.9, h * 0.95, 0, 0, TAU); g.fill();
  // descend, touch down and sample, lift off: two landings across the phase
  const hop = (u * 2) % 1, alt = hop < 0.4 ? 1 - hop / 0.4 : hop < 0.6 ? 0 : (hop - 0.6) / 0.4;
  const y = gy - 22 - alt * h * 0.5;
  g.fillStyle = col.ink; g.fillRect(cx - 18, y - 14, 36, 22);
  g.strokeStyle = col.ink; g.lineWidth = 2; g.beginPath(); g.moveTo(cx - 14, y + 8); g.lineTo(cx - 24, y + 22); g.moveTo(cx + 14, y + 8); g.lineTo(cx + 24, y + 22); g.stroke();
  g.fillStyle = col.acid; g.fillRect(cx - 44, y - 8, 24, 6); g.fillRect(cx + 20, y - 8, 24, 6);
  if (alt === 0) { g.strokeStyle = col.acid; g.beginPath(); g.moveTo(cx + 10, y + 4); g.lineTo(cx + 34, gy - 2); g.stroke(); label(g, 'Sampling', cx + 40, gy - 8, col.acid); }
  g.lineWidth = 1; g.font = '12px ui-monospace,Menlo,monospace';
  label(g, u < 0.5 ? 'Landing 1 of 2' : 'Landing 2 of 2', 10, 20, col.ink);
  label(g, 'Goal: at least 10 g of Phobos', 10, 38, col.ink);
  closeCap.textContent = 'On Phobos. MMX settles in very low gravity, its arm fires the coring sampler and a gas sampler by the footpad picks up surface grains.';
}

function homecoming(g, w, h, u) {
  const R = Math.min(w, h) * 0.32;
  dot(g, w * 0.5, h * 0.62, R, col.earth);
  const x = w * 0.5 + (1 - u) * w * 0.4, y = h * 0.62 - R - 30 + u * 30;
  dot(g, x, y, 3, col.acid); label(g, 'Capsule', x + 6, y - 6, col.acid);
  label(g, 'Return capsule lands in Australia', 10, 20, col.ink);
  closeCap.textContent = 'Earth return. The return module releases the capsule, which comes down in Australia.';
}

const ui = { slider: $('#rp-slider'), play: $('#rp-play'), speed: $('#rp-speed'), date: $('#rp-date'), elapsed: $('#rp-elapsed'), phase: $('#rp-phase'), status: $('#rp-status'), note: $('#rp-note'), phaseList: $('#rp-phases'), ticks: $('#rp-ticks'), root: $('#replay') };
let lastT = 0, lastP = MISSION.phases[0];
const replay = createReplay(MISSION, ui, (t, p) => { lastT = t; lastP = p; drawHelio(t); drawClose(t, p, performance.now()); });
// the moons keep moving while paused, so the close view has its own loop at a gentle pace
(function tick(now) { if (!document.hidden && lastP.id !== 'launch' && lastP.id !== 'cruise' && !replay.state.playing) drawClose(lastT, lastP, now); requestAnimationFrame(tick); })(0);
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) replay.play();
window.__replay = replay;
