import {SCENARIOS, IDS, scenarioFor, newGame, tick, setRods, setPumps, pressAz5, score, shareText, streak, londonKey, dayNumber} from './game.js';
import {voidFrac, ORM_LIMIT} from './rbmk.js';
const $ = id => document.getElementById(id);
const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const app = {g: null, timer: null, daily: false, hist: [], paused: false};
function start(id, daily) {
  clearInterval(app.timer); document.querySelector('#boom, .boom-static')?.remove();
  app.g = newGame(id); app.daily = daily; app.hist = []; app.paused = false; $('pause').textContent = 'Pause';
  $('desk').hidden = false; $('result').hidden = true; $('feedback').textContent = '';
  $('desk-h').textContent = (daily ? `Day ${dayNumber(londonKey())}: ` : 'Practice: ') + SCENARIOS[id].name; $('brief').textContent = SCENARIOS[id].brief;
  $('rods').value = Math.round(app.g.s.rods); render(); $('desk-h').focus();
  app.timer = setInterval(loop, 250);
}
function loop() { if (app.paused) return; app.g = tick(app.g); app.hist.push(app.g.s.P); render(); if (app.g.done) finish(); }
function render() {
  const g = app.g, s = g.s, sc = SCENARIOS[g.id], flow = s.flow ?? 1;
  $('v-power').textContent = s.P > 10 ? 'Off scale' : `${Math.round(s.P * 3200).toLocaleString('en-GB')} MW`; $('v-orm').textContent = Math.round(s.rods); $('orm-box').classList.toggle('warn', s.rods < ORM_LIMIT);
  $('v-flow').textContent = `${Math.round(flow * 100)}%`; $('v-void').textContent = `${Math.round(voidFrac(s.P, flow) * 100)}%`; $('v-xe').textContent = s.X.toFixed(2);
  $('v-time').textContent = `${Math.max(0, Math.ceil(sc.length - s.t))} s`; $('rods-n').textContent = Math.round(s.rods); $('pumps-n').textContent = g.pumps;
  if (document.activeElement !== $('rods')) $('rods').value = Math.round(s.rods);
  const c = $('chart'), x = c.getContext('2d'), W = c.width, Hh = c.height, top = 1.2, y = p => Hh - Math.min(p, top) / top * Hh, cs = getComputedStyle(document.body);
  x.clearRect(0, 0, W, Hh); x.fillStyle = 'rgba(214,255,0,.15)'; x.fillRect(0, y(sc.band[1]), W, y(sc.band[0]) - y(sc.band[1]));
  x.strokeStyle = cs.color; x.lineWidth = 2; x.beginPath(); const n = sc.length / 0.25; app.hist.forEach((p, i) => { const X = i / n * W; i ? x.lineTo(X, y(p)) : x.moveTo(X, y(p)); }); x.stroke();
}
function finish() {
  clearInterval(app.timer); const g = app.g, sc = score(g), label = app.daily ? `#${dayNumber(londonKey())}` : 'practice';
  $('result').hidden = false;
  $('result-head').textContent = g.failed === 'exploded' ? 'The core ran away.' : g.failed === 'meltdown' ? 'The fuel overheated.' : `Score ${sc}.`;
  $('result-text').textContent = g.failed ? 'In the real plant this was the end. Here you can read why below and try again in practice.' : `${g.ormBroken ? 'You went below 15 rods at some point, which cost 300. ' : ''}${SCENARIOS[g.id].az5From && g.s.state !== 'shutdown' ? 'You did not finish with AZ-5, which cost 200. ' : ''}Thanks for keeping it steady.`;
  app.share = shareText(g, label);
  if (app.daily) { const h = read('rbmk:stats', {history: {}}); if (!(londonKey() in h.history)) { h.history[londonKey()] = sc; write('rbmk:stats', h); if (sc > 0) window.DexmPoints?.earn('rbmk', 100, `rbmk:${londonKey()}`); } }
  else if (sc > 0) window.DexmPoints?.earnPractice('rbmk', londonKey());
  stats(); if (g.failed) boom(g.failed); $('result-head').focus({preventScroll: true});
}
function boom(kind) {
  if (reduced()) { const d = document.createElement('div'); d.className = 'boom-static'; document.body.append(d); setTimeout(() => d.remove(), 2500); return; }
  const c = document.createElement('canvas'); c.id = 'boom'; c.width = innerWidth; c.height = innerHeight; document.body.append(c);
  const x = c.getContext('2d'), cx = c.width / 2, cy = c.height * 0.62, parts = Array.from({length: 220}, () => ({a: Math.random() * Math.PI - Math.PI, v: 4 + Math.random() * 14, r: 1 + Math.random() * 4, x: cx, y: cy, h: Math.random()}));
  let f = 0; (function draw() {
    f++; x.clearRect(0, 0, c.width, c.height);
    const fl = Math.max(0, 1 - f / 40); x.fillStyle = `rgba(255,240,200,${fl * 0.9})`; x.fillRect(0, 0, c.width, c.height);
    const R = f * 9, g = x.createRadialGradient(cx, cy, 0, cx, cy, R); g.addColorStop(0, `rgba(255,255,255,${Math.max(0, 1 - f / 60)})`); g.addColorStop(0.3, `rgba(255,140,0,${Math.max(0, 0.9 - f / 90)})`); g.addColorStop(1, 'rgba(60,20,0,0)');
    x.fillStyle = g; x.beginPath(); x.arc(cx, cy, R, 0, 7); x.fill();
    if (kind === 'exploded') { x.save(); x.translate(cx, cy - f * 4); x.rotate(f / 14); x.fillStyle = '#333'; x.fillRect(-60, -8, 120, 16); x.restore(); }
    for (const p of parts) { p.x += Math.cos(p.a) * p.v; p.y += Math.sin(p.a) * p.v + f * 0.12; x.fillStyle = p.h > 0.5 ? '#ffb347' : '#aa3a00'; x.fillRect(p.x, p.y, p.r, p.r); }
    if (f < 140) requestAnimationFrame(draw); else c.remove();
  })();
}
function stats() { const s = streak(read('rbmk:stats', {history: {}}).history || {}); $('stats').innerHTML = [['Played', s.played], ['Streak', s.streak], ['Best', s.best]].map(([k, v]) => `<div><b>${v}</b><span>${k}</span></div>`).join(''); }
$('rods').addEventListener('input', e => { app.g = setRods(app.g, Number(e.target.value)); render(); });
$('rods-in').addEventListener('click', () => { app.g = setRods(app.g, app.g.s.rods + 2); render(); });
$('rods-out').addEventListener('click', () => { app.g = setRods(app.g, app.g.s.rods - 2); render(); });
$('pump-up').addEventListener('click', () => { app.g = setPumps(app.g, app.g.pumps + 1); render(); });
$('pump-down').addEventListener('click', () => { app.g = setPumps(app.g, app.g.pumps - 1); render(); });
$('pause').addEventListener('click', () => { app.paused = !app.paused; $('pause').textContent = app.paused ? 'Resume' : 'Pause'; });
$('az5').addEventListener('click', () => { const sc = SCENARIOS[app.g.id]; if (sc.az5From && app.g.s.t < sc.az5From) $('feedback').textContent = 'AZ-5 pressed before the test finished. The shutdown still counts as a finish.'; app.g = pressAz5(app.g); });
$('share').addEventListener('click', () => navigator.clipboard?.writeText(app.share).then(() => { $('feedback').textContent = 'Result copied.'; }, () => { $('share-text').hidden = false; $('share-text').value = app.share; }));
$('play-daily').addEventListener('click', () => start(scenarioFor(londonKey()), true));
const practice = () => start(IDS[Math.floor(Math.random() * IDS.length)], false);
$('play-practice').addEventListener('click', practice); $('again').addEventListener('click', practice);
$('header-day').textContent = `#${dayNumber(londonKey())}`; stats();
