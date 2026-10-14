import {newBase, act, canBuild, UNIT, CREW, HAB, COST, SOLS, solarFactor} from './base.js';
import {makeMission, score, shareText, streak, londonKey, dayNumber} from './game.js';
const $ = id => document.getElementById(id);
const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const NAMES = {solar: 'a solar array', o2: 'an oxygen plant', drill: 'an ice drill', green: 'a greenhouse', battery: 'a battery'};
const app = {b: null, d: null};
function start(d) {
  app.d = d; app.b = newBase(); $('base').hidden = false; $('result').hidden = true; $('feedback').textContent = '';
  $('base-h').textContent = `${d.practice ? 'Practice' : `Mission #${d.number}`}: ${d.site}`; render(); $('base-h').focus();
}
function render() {
  const b = app.b, d = app.d, t = d.tau[b.sol - 1];
  $('sol').textContent = `Sol ${b.sol} of ${SOLS}`;
  const days = (v, per) => `${Math.floor(v / per)} sols`;
  $('res').innerHTML = [['Oxygen', `${b.o2.toFixed(1)} kg`, days(b.o2, CREW.o2), b.o2 < 12], ['Water', `${Math.round(b.water)} kg`, days(b.water, CREW.water), b.water < 36], ['Food', `${Math.round(b.food)} kg`, days(b.food, CREW.food), b.food < 18], ['Battery', `${Math.round(b.charge)} kWh`, `of ${b.battery * UNIT.battery.store}`, false], ['Spare parts', b.parts, `${Math.floor(b.parts / COST)} builds`, false], ['Science', b.science, 'points', false]]
    .map(([k, v, s, w]) => `<div class="${w ? 'warn' : ''}"><b>${v}</b><span>${k}, ${s}</span></div>`).join('');
  $('forecast').innerHTML = d.tau.slice(b.sol - 1, b.sol + 3).map((v, i) => `<li><b>Sol ${b.sol + i}</b> dust ${v.toFixed(1)}, solar ${Math.round(b.solar * UNIT.solar.kwh * solarFactor(v))} kWh</li>`).join('');
  $('kit').textContent = `${b.solar} solar arrays, ${b.o2u} oxygen plants, ${b.drill} ice drills, ${b.green.length} greenhouses, ${b.battery} batteries. Daily load ${HAB + b.o2u * UNIT.o2.use + b.drill * UNIT.drill.use + b.green.length * UNIT.green.use} kWh.`;
  document.querySelectorAll('[data-a]').forEach(x => { x.disabled = b.done || (x.dataset.a !== 'research' && !canBuild(b)); });
  draw(t);
}
function draw(tau) {
  const c = $('sky'), x = c.getContext('2d'), W = c.width, H = c.height, b = app.b, k = Math.min(1, tau / 3);
  x.fillStyle = `rgb(${200 - 40 * k},${150 - 50 * k},${110 - 50 * k})`; x.fillRect(0, 0, W, H);
  x.fillStyle = `rgba(255,240,200,${0.9 - 0.8 * k})`; x.beginPath(); x.arc(W * 0.8, H * 0.2, 22, 0, 7); x.fill();
  x.fillStyle = '#8c4a2a'; x.fillRect(0, H * 0.72, W, H); x.fillStyle = '#74391f'; for (let i = 0; i < 9; i++) { x.beginPath(); x.arc((i * 137) % W, H * 0.72, 10 + (i * 7) % 20, Math.PI, 0); x.fill(); }
  const gy = H * 0.72; let px = 40;
  const put = (n, w, h, col, top) => { for (let i = 0; i < n; i++) { x.fillStyle = col; x.fillRect(px, gy - h, w, h); if (top) top(px, w, h); px += w + 12; } };
  put(b.solar, 70, 10, '#1d3a6b', (p, w) => { x.fillStyle = '#888'; x.fillRect(p + w / 2 - 2, gy - 10, 4, 10); });
  x.fillStyle = '#e8e4da'; x.beginPath(); x.arc(px + 60, gy, 60, Math.PI, 0); x.fill(); px += 132;
  put(b.o2u, 34, 40, '#bfc4c8'); put(b.drill, 14, 60, '#d1b13a'); b.green.forEach(() => put(1, 60, 34, '#2f7a3a')); put(b.battery, 26, 22, '#555');
  if (tau > 1) { x.fillStyle = `rgba(150,90,50,${0.25 * k})`; x.fillRect(0, 0, W, H); }
}
function go(a) {
  if (!app.b || app.b.done) return; const before = app.b; app.b = act(app.b, a, app.d.tau[before.sol - 1]); const l = app.b.log.at(-1);
  $('feedback').textContent = `Sol ${l.sol}: ${a === 'research' ? 'science' : `built ${NAMES[a]}`}. Solar gave ${l.solar} kWh${l.full ? '' : ', not enough to run everything'}.`;
  render(); if (app.b.done) finish();
}
function finish() {
  const b = app.b, sc = score(b), label = app.d.practice ? 'practice' : `#${app.d.number}`; app.share = shareText(b, label);
  $('result').hidden = false;
  $('result-head').textContent = b.lost ? `${b.lost} The crew left on sol ${b.sol}.` : `The crew made it to sol ${SOLS}. Score ${sc}.`;
  $('result-text').textContent = `${b.science} science points, ${b.o2.toFixed(1)} kg of oxygen, ${Math.round(b.water)} kg of water and ${Math.round(b.food)} kg of food left.`;
  if (!app.d.practice) { const h = read('mars:stats', {history: {}}); if (!(app.d.key in h.history)) { h.history[app.d.key] = sc; write('mars:stats', h); if (sc) window.DexmPoints?.earn('mars', 100, `mars:${app.d.key}`); } }
  else if (sc) window.DexmPoints?.earnPractice('mars', londonKey());
  stats(); $('result-head').focus({preventScroll: true});
}
function stats() { const s = streak(read('mars:stats', {history: {}}).history || {}); $('stats').innerHTML = [['Played', s.played], ['Streak', s.streak], ['Best', s.best]].map(([k, v]) => `<div><b>${v}</b><span>${k}</span></div>`).join(''); }
document.querySelectorAll('[data-a]').forEach(x => x.addEventListener('click', () => go(x.dataset.a)));
$('share').addEventListener('click', () => navigator.clipboard?.writeText(app.share).then(() => { $('feedback').textContent = 'Result copied.'; }, () => { $('share-text').hidden = false; $('share-text').value = app.share; }));
$('play-daily').addEventListener('click', () => start(makeMission()));
const practice = () => start(makeMission({seed: Math.floor(Math.random() * 2 ** 31)}));
$('play-practice').addEventListener('click', practice); $('again').addEventListener('click', practice);
$('header-day').textContent = `#${dayNumber(londonKey())}`; stats();
