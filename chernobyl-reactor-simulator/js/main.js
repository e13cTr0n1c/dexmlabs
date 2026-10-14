import {SCENARIOS, byId, scenarioFor, newGame, tick, setRods, setAr, setArSet, togglePump, setFeed, setAutoFeed, setLoad, pressAz5, score, verdict, shareText, streak, unlocked, londonKey, dayNumber, inBand, ORM_LIMIT} from './game.js';
import {voidFrac} from './rbmk.js';
import {pumpsOn} from './plant.js';
const $ = id => document.getElementById(id);
const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const store = () => read('rbmk:stats', {history: {}, best: {}});
const app = {g: null, timer: null, daily: false, hist: [], paused: false, said: []};
const ALARMS = [['power', 'Power high'], ['orm', 'Fewer than 15 rods'], ['phigh', 'Pressure high'], ['plow', 'Pressure low'], ['lvlhigh', 'Drum level high'], ['lvllow', 'Drum level low'], ['flow', 'Coolant flow low'], ['xenon', 'Xenon high']];
function picker() {
  const st = store(), open = unlocked(st.best);
  $('scenarios').innerHTML = SCENARIOS.map(s => `<button type="button" data-sc="${s.id}" ${open.includes(s.id) ? '' : 'disabled'}><b>${s.name}</b><small>${open.includes(s.id) ? (st.best?.[s.id] ? `Your best: ${st.best[s.id]}` : 'Not played yet') : 'Score 500 on the one before to open it'}</small></button>`).join('');
  document.querySelectorAll('[data-sc]').forEach(b => b.addEventListener('click', () => start(b.dataset.sc, false)));
}
function start(id, daily) {
  clearInterval(app.timer); document.querySelector('#boom, .boom-static')?.remove(); document.body.classList.remove('shake');
  const seed = daily ? dayNumber(londonKey()) * 7919 : Math.floor(Math.random() * 2 ** 31);
  app.g = newGame(id, seed); app.daily = daily; app.hist = []; app.paused = false; app.said = []; $('pause').textContent = 'Pause';
  $('desk').hidden = false; $('result').hidden = true; $('feedback').textContent = '';
  const sc = byId(id); $('desk-h').textContent = (daily ? `Day ${dayNumber(londonKey())}: ` : 'Practice: ') + sc.name; $('brief').textContent = sc.brief;
  $('ar-row').hidden = !sc.tools.includes('ar');
  $('pumps').innerHTML = app.g.u.pumps.map((on, i) => `<button type="button" data-pump="${i}" aria-pressed="${on}">${i + 1}</button>`).join('');
  document.querySelectorAll('[data-pump]').forEach(b => b.addEventListener('click', () => { app.g = togglePump(app.g, +b.dataset.pump); render(); }));
  render(); $('desk-h').focus(); app.timer = setInterval(loop, 250);
}
function loop() {
  if (app.paused) return; app.g = tick(app.g); app.hist.push([app.g.u.c.P, app.g.demand(app.g.t), app.g.u.p, app.g.u.lvl]);
  for (const k of app.g.fired) if (!app.said.includes(k)) { app.said.push(k); const e = app.g.events.find(x => x.k === k); $('feedback').textContent = e.text; }
  render(); if (app.g.done) finish();
}
const mw = P => P > 10 ? 'Off scale' : `${Math.round(P * 3200).toLocaleString('en-GB')} MW`;
function render() {
  const g = app.g, u = g.u, c = u.c, sc = byId(g.id), d = g.demand(g.t), flow = c.flow ?? 1;
  const set = (id, v) => { $(id).textContent = v; };
  set('v-power', mw(c.P)); set('v-demand', d === null ? 'Free' : `${mw(d)} ±${Math.round(g.band * 3200)}`); set('v-orm', Math.round(c.rods)); set('v-flow', `${Math.round(flow * 100)}%`);
  set('v-void', `${Math.round(voidFrac(c.P, flow, u.p, Math.min(1, u.feed / Math.max(c.P, 0.05))) * 100)}%`); set('v-xe', c.X.toFixed(2)); set('v-p', `${(u.p * 70).toFixed(1)} bar`); set('v-lvl', `${u.lvl >= 0 ? '+' : ''}${Math.round(u.lvl * 100)}`);
  set('v-feed', `${Math.round(u.feed * 100)}%${u.autoFeed ? ' auto' : ''}`); set('v-turb', `${Math.round((u.turbine ?? u.load) * 1000)} MWe`); set('v-time', `${Math.max(0, Math.ceil(sc.length - g.t))} s`); set('v-score', g.log.length ? Math.round(1000 * g.log.reduce((a, b) => a + b, 0) / g.log.length) : '…');
  $('power-box').classList.toggle('warn', inBand(g) === false); $('orm-box').classList.toggle('warn', c.rods < ORM_LIMIT);
  $('ann').innerHTML = ALARMS.map(([k, t]) => `<li class="${u.alarms.includes(k) ? 'on' : ''}">${t}</li>`).join('');
  set('rods-n', Math.round(c.rods)); if (document.activeElement !== $('rods')) $('rods').value = Math.round(c.rods);
  if (document.activeElement !== $('feed')) $('feed').value = Math.round(u.feed * 100); if (document.activeElement !== $('load')) $('load').value = Math.round(u.load * 100);
  $('auto-feed').checked = u.autoFeed; $('auto-feed').disabled = g.fired.includes('feed') || g.id === 'night'; $('load').disabled = u.testAt !== undefined;
  $('ar').setAttribute('aria-pressed', String(u.ar)); $('ar').textContent = u.ar ? `Regulator on, holding ${mw(u.arSet)}` : 'Regulator off';
  set('pumps-n', pumpsOn(u)); document.querySelectorAll('[data-pump]').forEach((b, i) => b.setAttribute('aria-pressed', String(u.pumps[i])));
  draw();
}
function draw() {
  const g = app.g, sc = byId(g.id), c = $('chart'), x = c.getContext('2d'), W = c.width, H = c.height, top = 1.2, n = sc.length / 0.25, y = p => H - Math.min(p, top) / top * H, cs = getComputedStyle(document.body);
  x.clearRect(0, 0, W, H);
  x.fillStyle = 'rgba(214,255,0,.15)'; let run = null; for (let i = 0; i <= n; i += 4) { const d = i < n ? g.demand(i * 0.25) : null, X = i / n * W; if (d !== null) { if (!run) { run = []; } run.push([X, d]); } if ((d === null || i + 4 > n) && run) { x.beginPath(); run.forEach(([a, v], k) => k ? x.lineTo(a, y(v + g.band)) : x.moveTo(a, y(v + g.band))); x.lineTo(X, y(run.at(-1)[1] + g.band)); x.lineTo(X, y(run.at(-1)[1] - g.band)); [...run].reverse().forEach(([a, v]) => x.lineTo(a, y(v - g.band))); x.fill(); run = null; } }
  const line = (k, col, f) => { x.strokeStyle = col; x.lineWidth = 2; x.beginPath(); app.hist.forEach((h, i) => { const X = i / n * W, Y = f(h[k]); i ? x.lineTo(X, Y) : x.moveTo(X, Y); }); x.stroke(); };
  line(2, 'rgba(90,160,255,.8)', p => H / 2 - (p - 1) * H * 2); line(3, 'rgba(255,170,80,.8)', l => H / 2 - l * H * 0.4); line(0, cs.color, y);
}
function finish() {
  clearInterval(app.timer); const g = app.g, sc = score(g), label = app.daily ? `#${dayNumber(londonKey())}` : 'practice';
  $('result').hidden = false; app.share = shareText(g, label);
  $('result-head').textContent = g.failed === 'exploded' ? 'The core ran away.' : g.failed === 'scram' ? 'Scrammed.' : g.failed ? 'Lost the unit.' : `Score ${sc}.`;
  $('result-text').textContent = verdict(g); $('result-grid').textContent = app.share.split('\n')[1];
  const st = store(); st.best = st.best || {}; const was = unlocked(st.best);
  if (sc > (st.best[g.id] || 0)) st.best[g.id] = sc;
  if (app.daily) { if (!(londonKey() in st.history)) { st.history[londonKey()] = sc; if (sc > 0) window.DexmPoints?.earn('rbmk', 100, `rbmk:${londonKey()}`); } }
  else if (sc > 0) window.DexmPoints?.earnPractice('rbmk', londonKey());
  write('rbmk:stats', st); const now = unlocked(st.best), next = now.find(id => !was.includes(id));
  $('next').hidden = !next; if (next) { $('next').dataset.sc = next; $('next').textContent = `Next: ${byId(next).name}`; }
  picker(); stats(); if (g.failed) boom(g.failed); else if (g.outcome?.k === 'shutdown' && !reduced()) { document.body.classList.add('shake'); setTimeout(() => document.body.classList.remove('shake'), 300); }
  $('result-head').focus({preventScroll: true});
}
function boom(kind) {
  if (reduced()) { const d = document.createElement('div'); d.className = 'boom-static'; document.body.append(d); setTimeout(() => d.remove(), 2500); return; }
  document.body.classList.add('shake'); setTimeout(() => document.body.classList.remove('shake'), 600);
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
function stats() { const s = streak(store().history || {}); $('stats').innerHTML = [['Played', s.played], ['Streak', s.streak], ['Best streak', s.best]].map(([k, v]) => `<div><b>${v}</b><span>${k}</span></div>`).join(''); }
const rods = d => { if (app.g && !app.g.done) { app.g = setRods(app.g, app.g.u.c.rods + d); render(); } };
$('rods').addEventListener('input', e => { app.g = setRods(app.g, Number(e.target.value)); render(); });
for (const [id, d] of [['out5', -5], ['out1', -1], ['in1', 1], ['in5', 5]]) $(id).addEventListener('click', () => rods(d));
$('ar').addEventListener('click', () => { app.g = setAr(app.g, !app.g.u.ar); render(); });
$('ar-down').addEventListener('click', () => { app.g = setArSet(app.g, app.g.u.arSet - 0.05); render(); });
$('ar-up').addEventListener('click', () => { app.g = setArSet(app.g, app.g.u.arSet + 0.05); render(); });
$('feed').addEventListener('input', e => { app.g = setFeed(app.g, e.target.value / 100); render(); });
$('auto-feed').addEventListener('change', e => { app.g = setAutoFeed(app.g, e.target.checked); render(); });
$('load').addEventListener('input', e => { app.g = setLoad(app.g, e.target.value / 100); render(); });
$('pause').addEventListener('click', () => { app.paused = !app.paused; $('pause').textContent = app.paused ? 'Resume' : 'Pause'; });
$('az5').addEventListener('click', () => { if (app.g && !app.g.done) { app.g = pressAz5(app.g); $('feedback').textContent = 'AZ-5 pressed. All rods driving in.'; } });
addEventListener('keydown', e => { if (!app.g || app.g.done || $('desk').hidden || /INPUT|SELECT/.test(e.target.tagName)) return; const m = {q: -1, a: 1, Q: -5, A: 5}[e.key]; if (m) { rods(m); e.preventDefault(); } if (e.key === 'p') $('pause').click(); });
$('share').addEventListener('click', () => navigator.clipboard?.writeText(app.share).then(() => { $('feedback').textContent = 'Result copied.'; }, () => { $('share-text').hidden = false; $('share-text').value = app.share; }));
$('play-daily').addEventListener('click', () => start(scenarioFor(londonKey()), true));
$('again').addEventListener('click', () => start(app.g.id, false)); $('next').addEventListener('click', e => start(e.target.dataset.sc, false));
$('header-day').textContent = `#${dayNumber(londonKey())}`; picker(); stats();
