import {fly, liftoffMass, deltaV, stages, ENGINES, G0} from './flight.js';
import {makeMission, score, shareText, grid, streak, londonKey, dayNumber} from './game.js';
const $ = id => document.getElementById(id);
const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const app = {d: null, raf: 0};
const design = () => ({...app.d, n1: +$('n1').value, p1: +$('p1').value, e2: $('e2').value, n2: 1, p2: +$('p2').value, turn: +$('turn').value});
function start(d) {
  app.d = d; $('build').hidden = false; $('result').hidden = true; $('feedback').textContent = ''; $('launch').disabled = false;
  $('build-h').textContent = `${d.practice ? 'Practice' : `Launch #${d.number}`}: ${d.payload} t, ${d.cargo}`; update(); drawPath(null, 0); $('build-h').focus();
}
function update() {
  const d = design(), m = liftoffMass(d), [a, b] = stages(d), tw = a.n * a.e.thrust / (m * G0), tw2 = b.e.thrust / ((b.prop + b.dry + d.payload * 1000) * G0);
  for (const k of ['n1', 'p1', 'p2', 'turn']) $(k + '-v').textContent = $(k).value;
  $('readout').innerHTML = [['Liftoff mass', `${(m / 1000).toFixed(0)} t`, false], ['Liftoff thrust to weight', tw.toFixed(2), tw < 1.05], ['Upper stage thrust to weight', tw2.toFixed(2), tw2 < 0.5], ['Total delta v', `${(deltaV(d) / 1000).toFixed(2)} km/s`, deltaV(d) < 9200]]
    .map(([k, v, w]) => `<div class="${w ? 'warn' : ''}"><b>${v}</b><span>${k}</span></div>`).join('');
}
function drawPath(r, upto) {
  const c = $('sky'), x = c.getContext('2d'), W = c.width, H = c.height, top = 300e3, span = 2200e3, X = v => 30 + v / span * (W - 60), Y = v => H - 30 - v / top * (H - 60);
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#02030a'); g.addColorStop(0.75, '#0b1a3a'); g.addColorStop(1, '#3a6fb0'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.fillStyle = '#fff'; for (let i = 0; i < 50; i++) x.fillRect((i * 151) % W, (i * 89) % (H * 0.6), 1.5, 1.5);
  x.strokeStyle = 'rgba(255,255,255,.35)'; x.setLineDash([6, 6]); x.font = '14px monospace'; x.fillStyle = '#ccd';
  for (const [h, t] of [[100e3, 'Space, 100 km'], [150e3, 'Orbit, 150 km']]) { x.beginPath(); x.moveTo(0, Y(h)); x.lineTo(W, Y(h)); x.stroke(); x.fillText(t, W - 150, Y(h) - 6); }
  x.setLineDash([]); x.fillStyle = '#2d5a27'; x.fillRect(0, H - 30, W, 30);
  if (!r) return; const p = r.path.slice(0, upto); x.lineWidth = 3;
  for (let i = 1; i < p.length; i++) { x.strokeStyle = p[i][2] ? '#d6ff00' : '#ffb347'; x.beginPath(); x.moveTo(X(p[i - 1][0]), Y(p[i - 1][1])); x.lineTo(X(p[i][0]), Y(p[i][1])); x.stroke(); }
  const l = p.at(-1); if (l) { x.fillStyle = '#fff'; x.beginPath(); x.arc(X(l[0]), Y(l[1]), 5, 0, 7); x.fill(); }
}
function launch() {
  const d = design(), r = fly(d, {trace: true}); app.r = r; app.dd = d; $('launch').disabled = true; cancelAnimationFrame(app.raf);
  if (reduced() || !r.path.length) { drawPath(r, r.path.length); return finish(); }
  const t0 = performance.now(); const go = now => { const k = Math.min(1, (now - t0) / 5000); drawPath(r, Math.ceil(k * r.path.length)); if (k < 1) app.raf = requestAnimationFrame(go); else finish(); }; app.raf = requestAnimationFrame(go);
}
const WHY = {pad: 'It never left the pad. The engines can\'t lift that much.', crash: 'It came down soon after liftoff.', fell: 'It ran out of fuel and fell back.', fuel: 'It ran out of fuel before reaching a stable orbit.', orbit: 'Orbit.'};
function finish() {
  const d = app.dd, r = app.r, sc = score(d, r), label = d.practice ? 'practice' : `#${d.number}`; app.share = shareText(d, r, label);
  $('result').hidden = false; $('launch').disabled = false;
  $('result-head').textContent = r.ok ? `In orbit. Score ${sc}.` : WHY[r.why];
  $('result-text').textContent = r.why === 'pad' ? `Thrust to weight was ${r.tw.toFixed(2)}. It needs to be above 1.` : `Lowest point ${Math.max(0, r.peri / 1000).toFixed(0)} km, highest ${Math.min(99999, r.apo / 1000).toFixed(0)} km, peak air load ${(r.maxQ / 1000).toFixed(0)} kPa. ${r.ok ? `Payload fraction ${(d.payload * 1000 / liftoffMass(d) * 100).toFixed(2)}%.` : 'Try more fuel, more engines or a different turn.'} ${grid(d, r)}`;
  if (!d.practice) { const h = read('rocket:stats', {history: {}}); if (!(d.key in h.history) && r.ok) { h.history[d.key] = sc; write('rocket:stats', h); window.DexmPoints?.earn('rocket', 100, `rocket:${d.key}`); } }
  else if (sc) window.DexmPoints?.earnPractice('rocket', londonKey());
  stats(); $('result-head').focus({preventScroll: true});
}
function stats() { const s = streak(read('rocket:stats', {history: {}}).history || {}); $('stats').innerHTML = [['Played', s.played], ['Streak', s.streak], ['Best', s.best]].map(([k, v]) => `<div><b>${v}</b><span>${k}</span></div>`).join(''); }
for (const k of ['n1', 'p1', 'p2', 'turn', 'e2']) $(k).addEventListener('input', update);
$('launch').addEventListener('click', launch);
$('share').addEventListener('click', () => navigator.clipboard?.writeText(app.share).then(() => { $('feedback').textContent = 'Result copied.'; }, () => { $('share-text').hidden = false; $('share-text').value = app.share; }));
$('play-daily').addEventListener('click', () => start(makeMission()));
const practice = () => start(makeMission({seed: Math.floor(Math.random() * 2 ** 31)}));
$('play-practice').addEventListener('click', practice); $('again').addEventListener('click', practice);
$('header-day').textContent = `#${dayNumber(londonKey())}`; stats();
