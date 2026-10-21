import {step, deck, target, deckYAt, seaY, wind, rho, stopHeight, flipHeight, FLIP, hoverSeconds, throttleUp, throttleDown, deployLegs, closeArms, catchWindow, inWindow, makeWorld, score, parts, LIMITS, LEGS, TOWER, CATCH, DEG} from './physics.js';
import {LEVELS, MISSIONS, level} from './levels.js';
const D1 = Math.PI / 180;
import {drawVehicle} from './draw-vehicles.js';
import {ukDate, puzzleNo, countdown, grid, makeStore} from './daily.js';
import {dailyLevel} from './daily-level.js';
const $ = id => document.getElementById(id);
const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const KEY = 'booster:stats', store = () => read(KEY, {best: {}, landed: {}, flights: 0});
const DT = 1 / 60, REPLAY = 5;
const app = {w: null, s: null, keys: {}, raf: 0, last: 0, acc: 0, said: {}, parts: [], rings: [], shake: 0, flash: 0, bolt: null, level: 'calm', assist: false, audio: null, paused: false, cam: {scale: 0.05, x: 0}, prevWind: 0, clouds: [], ended: false, rec: [], replay: null, after: 0};

// Mission select
const fmtBest = id => { const b = store().best?.[id]; return b ? `Best ${b}` : 'Not flown yet'; };
function renderMissions() {
  $('missions').innerHTML = MISSIONS.map(m => `<section class="mission" data-mission="${m.id}" aria-labelledby="m-${m.id}"><canvas class="preview" width="150" height="300" data-preview="${m.vehicle}" aria-hidden="true"></canvas><div class="mission-body"><h2 id="m-${m.id}">${m.name}</h2><p class="muted">${m.blurb}</p><div class="levels">${LEVELS.filter(l => l.mission === m.id).map(l => `<button type="button" data-level="${l.id}" aria-pressed="${l.id === app.level}">${l.name} <span class="mult">×${l.mult}</span><small>${l.blurb}</small><small class="best">${fmtBest(l.id)}</small></button>`).join('')}</div>${m.id === 'shipcatch' ? `<p class="tiny mission-tip">Tip: let it fall flat, steer with Q and E, then light up with W and hold E to flip upright about ${FLIP.lead} m short of the arms.</p>` : ''}${m.id === 'tower' ? `<label class="assist"><input type="checkbox" id="assist"${app.assist ? ' checked' : ''}> Arm assist: the tower tracks your pins and closes the arms for you when you're in the window. Scores ×0.75.</label>` : ''}</div></section>`).join('');
  document.querySelectorAll('[data-level]').forEach(b => b.addEventListener('click', () => setLevel(b.dataset.level)));
  $('assist').addEventListener('change', e => { app.assist = e.target.checked; const st = store(); st.assist = app.assist; write(KEY, st); });
  document.querySelectorAll('[data-preview]').forEach(c => { const x = c.getContext('2d'), id = c.dataset.preview, k = id === 'sh' ? 3.6 : id === 'ship' ? 4.9 : 6.1; x.clearRect(0, 0, c.width, c.height); x.save(); x.translate(c.width / 2, c.height - 12); drawVehicle(x, id, k, {throttle: 0, gimbal: 0, legs: 1, fins: 1, soot: 0.55, heat: 0, thin: 0, night: false, reduced: true}); x.restore(); });
}
function setLevel(id) { app.level = id; document.querySelectorAll('[data-level]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.level === id))); document.querySelectorAll('.mission').forEach(m => m.classList.toggle('picked', m.dataset.mission === level(id).mission)); const st = store(); st.level = id; write(KEY, st); $('play').innerHTML = `Fly ${level(id).name} <span aria-hidden="true">&rarr;</span>`; }
function say(t) { $('feedback').textContent = t; }

const NOTES = {calm: 'Coast down, burn late and hard, then feather it onto the ring. Legs below 90 m/s.', windy: 'The wind is stronger up high. Lean into it and let the grid fins glide you over.', night: 'You start supersonic. A short entry burn keeps the heat down. Watch for the deck lights.', storm: 'You will cook without an entry burn. Then a gale, rain and a deck that rises and falls a few metres.',
  'ship-catch': 'The ship falls flat on its belly. Q and E pitch it with the flaps: nose down glides you towards the tower, nose up brakes. When the blue FLIP mark meets you, press W and hold E to swing upright, then catch it like the booster.',
  'double-booster': 'Double Catch, part one. Catch the giant booster as usual, then the ship comes in. Hover with the pins level with the arms and press C.',
  'catch-calm': 'Come in beside the tower, not over it. Hover with the catch pins level with the arms, centred, then close them with C.', 'catch-cross': 'The wind blows you towards the tower. Hold a little upwind and lean into it.', 'catch-night': 'Floodlit and gusty. The green marks show where the pins need to be.'};
// Daily Drop: one scored flight a day for everyone, then practice that doesn't count.
const DAILY = makeStore('booster:daily'), SITE = 'https://dexmlabs.app/booster-landing-game/';
function dailyCard(rec) {
  const head = `DEXM Booster #${rec.no}`, tower = rec.kind === 'tower';
  if (!rec.landed) return `${head} 💥 ${rec.lost}\n${grid([0, 0, 0, 0, 0])}\n${SITE}?daily`;
  return `${head} ${tower ? '🗼 Caught' : '🚀 Landed'} ${rec.impact.toFixed(1)} m/s · ${rec.dist.toFixed(1)} m off · ${rec.fuelPct}% fuel\n${grid(rec.grid)} ${rec.score} pts\n${SITE}?daily`;
}
function startDaily() {
  const L = dailyLevel(), done = DAILY.get(L.date);
  app.daily = {L, practice: !!done || L.no < 0}; start(L, L.seed);
}
function renderDaily() {
  const box = $('daily'); if (!box) return; const L = dailyLevel(), rec = DAILY.get(L.date), pre = L.no < 0;
  $('daily-h').textContent = pre ? `Daily Drop #0 lands at midnight` : `Daily Drop #${L.no}`;
  $('daily-blurb').textContent = (pre ? 'Preview: ' : '') + L.blurb;
  $('daily-status').textContent = pre ? 'Practise the preview now. Scoring starts with #0.' : rec ? (rec.landed ? `Today: ${rec.score} points. Practice flights don't count.` : `Today: ${rec.lost} Practice flights don't count.`) : 'One scored flight today, the same for everyone. Then practise as much as you like.';
  $('daily-play').innerHTML = `${rec || pre ? 'Practise today\'s drop' : 'Fly today\'s drop'} <span aria-hidden="true">&rarr;</span>`;
  $('daily-share').hidden = !rec; box.classList.toggle('played', !!rec);
}
function showDailyResult(rec) { const b = $('daily-result'); b.hidden = !rec; if (rec) { $('daily-card').textContent = dailyCard(rec); $('daily-result-next').textContent = `Next drop in ${countdown()}`; } }
function tickDaily() { const e = $('daily-next'); if (e) e.textContent = `Next drop in ${countdown()}`; if (!$('daily-result').hidden) $('daily-result-next').textContent = `Next drop in ${countdown()}`; if (app.dailyDate && app.dailyDate !== ukDate()) renderDaily(); app.dailyDate = ukDate(); }
function copyShare(text) { app.share = text; navigator.clipboard?.writeText(text).then(() => say('Result copied.'), () => { $('share-text').hidden = false; $('share-text').value = text; }); }
function start(id = app.level, seed = Math.floor(Math.random() * 2 ** 31), stage = false) {
  cancelAnimationFrame(app.raf); let L = typeof id === 'object' ? id : level(id);
  // Double Catch: two stages flown back to back, the booster then the ship. app.level stays on the Double Catch.
  if (L.double) { app.level = L.id; app.daily = null; app.double = {id: L.id, stages: L.double, i: 0, scores: [], caught: []}; L = level(L.double[0]); }
  else if (!stage) { app.double = null; if (!L.daily) { app.level = id; app.daily = null; } }
  const w = makeWorld(L, seed, {assist: L.daily ? false : app.assist});
  Object.assign(app, {w, s: {...w.start}, keys: {}, said: {}, parts: [], rings: [], shake: 0, flash: 0, bolt: null, paused: false, acc: 0, ended: false, rec: [], replay: null, after: 0});
  app.cam = {scale: camTarget(w, w.start).scale, x: w.start.x}; app.clouds = makeClouds(seed, L);
  $('flight').hidden = false; $('screen-title').hidden = true; document.body.dataset.screen = 'game'; document.body.dataset.kind = w.kind; scrollTo(0, 0); $('result').hidden = true; $('paused').hidden = true; say('');
  const dbl = app.double ? `Double Catch ${app.double.i + 1} of 2, ` : '';
  $('flight-h').textContent = `${dbl}${L.name}${L.daily && app.daily.practice ? ' (practice)' : ''}: ${L.blurb}`; $('level-note').textContent = (L.daily ? (app.daily.practice ? 'Practice: this flight is not scored. ' : 'Your one scored flight today. ') + (w.kind === 'tower' ? NOTES['catch-calm'] : NOTES.calm) : NOTES[L.id] || '') + (w.kind === 'tower' && w.assist ? ' Arm assist is on.' : '');
  const tower = w.kind === 'tower', lab = (k, t) => { $('h-' + k).nextElementSibling.textContent = t; }; document.body.dataset.vehicle = w.v.id;
  lab('tilt', w.v.flaps ? 'Attitude' : 'Tilt'); lab('vx', w.v.flaps ? 'Drift' : 'Sideways speed');
  lab('alt', tower ? 'Pins above arms' : 'Height above deck'); lab('range', tower ? 'To the arms' : 'To deck centre'); lab('legs', tower ? 'Arms' : 'Legs'); lab('deck', tower ? 'Carriage height' : 'Deck, m/s');
  $('legs').textContent = tower ? 'Close arms (C)' : 'Legs (L)'; $('legs').setAttribute('aria-label', tower ? 'Close the arms (C)' : 'Deploy legs (L)');
  $('sky').focus({preventScroll: true}); sound(true); app.last = performance.now(); app.raf = requestAnimationFrame(loop);
  window.BoosterGame.flights++;
}
function input() { return {rot: app.keys.rl ? -1 : app.keys.rr ? 1 : 0, gim: app.keys.gl ? -1 : app.keys.gr ? 1 : 0}; }
function loop(now) {
  const dt = Math.min(0.1, (now - app.last) / 1000); app.last = now;
  if (app.replay) { replayStep(dt); }
  else if (!app.paused && !app.s.done) {
    app.acc += dt; const inp = input();
    while (app.acc >= DT && !app.s.done) { const before = app.s; app.s = step(app.w, app.s, inp, DT); app.acc -= DT; events(before, app.s); }
    app.rec.push({s: app.s, keys: {...app.keys}}); while (app.rec.length > 2 && app.rec[0].s.t < app.s.t - REPLAY) app.rec.shift();
  } else if (app.s.done) app.after += dt;
  juice(dt); draw(dt); hud(); sound(); if (!app.s.done && !app.replay) callouts(app.s);
  if (app.s.done && !app.ended) finish();
  app.raf = requestAnimationFrame(loop);
}
// Replay: the last five seconds at half speed, then back to the end.
function startReplay() { if (!app.ended || app.rec.length < 10) return; app.replay = {i: 0, end: app.s, keys: app.keys}; app.parts = []; $('result').hidden = true; say('Replay, half speed. Press V to skip.'); }
function replayStep(dt) {
  const r = app.replay; r.i += dt * 60 * 0.5; const f = app.rec[Math.min(app.rec.length - 1, Math.floor(r.i))];
  app.s = f.s; app.keys = f.keys;
  if (r.i >= app.rec.length - 1) stopReplay();
}
function stopReplay() { const r = app.replay; if (!r) return; app.replay = null; app.s = r.end; app.keys = {}; $('result').hidden = false; if (!app.s.landed) blast(); else app.shake = reduced() ? 0 : 5; say(''); $('replay').focus({preventScroll: true}); }
function events(a, b) {
  if (a.mach >= 1 && b.mach < 1) { say('Through Mach 1. Sonic boom.'); app.shake = Math.max(app.shake, 14); app.rings.push({x: b.x, y: b.y + 20, r: 0, life: 1.6}); boom(); }
  if (!a.legsBroken && b.legsBroken) { say('The legs tore off. Too fast. You cannot land now.'); beep(160, 0.4); app.shake = Math.max(app.shake, 6); }
  if (a.legs < 1 && b.legs >= 1) clunk();
  if (!a.armsCmd && b.armsCmd === 1) { say(app.w.assist ? 'In the window. The arms are closing.' : 'Arms closing.'); clank(); }
  if ((b.misses || 0) > (a.misses || 0)) { say(`Missed. ${b.lastMiss} The arms are opening again.`); beep(220, 0.25); }
  const g = wind(app.w, b.y, b.t), slot = 'gust' + Math.floor(b.t / 6);
  if (Math.abs(g - app.w.level.wind.base) > app.w.level.wind.gust * 0.9 && !app.said[slot] && app.w.level.wind.gust > 3) { app.said[slot] = 1; say(`Gust, ${Math.abs(g).toFixed(0)} m/s ${g > 0 ? 'to the right' : 'to the left'}.`); }
}
function callouts(s) {
  const w = app.w, v = w.v, d = target(w, s), alt = s.y - d.y, speed = Math.hypot(s.vx, s.vy), c = (k, t) => { if (!app.said[k]) { app.said[k] = 1; say(t); } };
  if (v.flaps) shipCallouts(w, s, alt, c); else if (s.t < 0.5) c('fins', 'Grid fins out. Q and E to lean, W to light the engine.');
  if (s.heat > 40 && s.throttle === 0) c('heat', 'Heating up. Entry burn now: W, or Space for full thrust.');
  if (s.heat > 75) c('heat2', 'Heat critical.');
  if (!v.flaps && s.throttle === 0 && alt < stopHeight(s, v) * 1.3 + 60 && alt > 30 && speed > 40 && s.y < 4000) c('burn', 'Burn now.');
  if (w.kind === 'ship') { if (!s.legsOut && speed < LEGS.maxSpeed && alt < 1500) c('legs', 'Legs: L.'); if (s.legsOut && !s.legsBroken && speed > LEGS.maxSpeed - 10) c('legfast', 'Slow down, the legs are out.'); }
  else { if (s.y < 400 && Math.abs(s.x) < 200) c('tw', 'Come in beside the tower, on the right of it.'); if (!w.assist && inWindow(w, s) && !s.armsCmd) c('win' + (s.misses || 0), 'In the window. Close the arms: C.'); }
  if (s.fuel < w.fuel * 0.15 && s.fuel > 0) c('bingo', 'Bingo fuel.'); if (s.fuel <= 0) c('out', 'Out of fuel.');
  if (s.limit && !v.flaps) c('lim', 'Attitude limit, 40°.');
}
// The ship's own hints: the belly flop, the flip, then the catch.
const shipPhase = s => s.angle < -55 * D1 ? 'belly' : s.angle < -8 * D1 ? 'flip' : 'upright';
function shipCallouts(w, s, alt, c) {
  const ph = shipPhase(s), fh = flipHeight(s, w.v);
  if (s.t < 0.5) c('belly', 'Belly flop. Q noses down and glides you towards the tower, E noses up and brakes. A and D tuck or spread the flaps.');
  if (ph === 'belly' && s.throttle === 0 && alt < fh * 1.25 + 80) c('flipsoon', `Flip soon. Aim to be about ${FLIP.lead} m to the right of the arms.`);
  if (ph === 'belly' && s.throttle === 0 && alt < fh) c('flip', 'Flip now: W to light the engine, hold E to swing upright.');
  if (ph === 'belly' && alt < fh * 0.6) c('late', 'Late! Flip now or you will not stop in time.');
  if (ph === 'upright' && s.throttle > 0 && app.said.flip) c('up', 'Upright. Now ease it down with the pins level with the arms and press C.');
}
const fuelText = (s, v) => `${s.fuel > 9999 ? (s.fuel / 1000).toFixed(1) + ' t' : Math.round(s.fuel) + ' kg'}, ${Math.round(hoverSeconds(s, v))} s`;
function readings() {
  const s = app.s, w = app.w, v = w.v, d = target(w, s), alt = s.y - d.y, wx = wind(w, s.y, s.t), tower = w.kind === 'tower';
  return {alt: `${alt.toFixed(Math.abs(alt) < 100 ? 1 : 0)} m`, vy: `${s.vy.toFixed(1)} m/s`, vx: `${(s.vx - d.vx).toFixed(1)} m/s`, range: `${Math.abs(s.x - d.x).toFixed(Math.abs(s.x - d.x) < 20 ? 1 : 0)} m ${s.x < d.x ? 'right' : 'left'}`,
    tilt: v.flaps ? `${(s.angle * DEG).toFixed(0)}° ${({belly: 'belly flop', flip: 'flipping', upright: 'upright'})[shipPhase(s)]}` : `${(s.angle * DEG).toFixed(0)}°`, th: s.throttle <= 0 || s.fuel <= 0 ? 'Off' : `${Math.round(s.throttle * 100)}%`, fuel: fuelText(s, v), rcs: `${Math.round(s.rcs / w.level.rcs * 100)}%`,
    wind: `${Math.abs(wx).toFixed(0)} m/s ${wx > 0.5 ? '→' : wx < -0.5 ? '←' : ''}`, legs: tower ? (s.armsCmd === 1 ? 'Closing' : s.armsCmd === 2 ? 'Opening' : s.caught ? 'Closed' : 'Open') : s.legsBroken ? 'Torn off' : s.legs >= 1 ? 'Down' : s.legsOut ? 'Moving' : 'Stowed', mach: (s.mach || 0).toFixed(2), heat: `${Math.round(s.heat)}%`,
    deck: tower ? `${s.armY.toFixed(0)} m` : `${d.vy > 0.15 ? 'Rising' : d.vy < -0.15 ? 'Falling' : 'Level'} ${Math.abs(d.vy).toFixed(1)}`};
}
function hud() {
  const r = readings(), s = app.s, w = app.w, d = target(w, s), alt = s.y - d.y, tower = w.kind === 'tower';
  for (const k of ['alt', 'vy', 'vx', 'range', 'tilt', 'th', 'fuel', 'rcs', 'wind', 'legs', 'mach', 'heat', 'deck']) { const e = $('h-' + k); if (e.textContent !== r[k]) e.textContent = r[k]; }
  const warn = (k, on) => $('h-' + k).parentElement.classList.toggle('warn', !!on);
  warn('vy', -s.vy > (tower ? CATCH.vyDown : LIMITS.down) && alt < 40); warn('vx', Math.abs(s.vx) > (tower ? CATCH.vx : LIMITS.side) && alt < 40); warn('fuel', s.fuel < w.fuel * 0.15); warn('tilt', (Math.abs(s.angle) > (tower ? CATCH.tilt : LIMITS.tilt) && alt < 40) || (w.v.flaps && shipPhase(s) !== 'upright' && alt < flipHeight(s, w.v) * 0.6));
  warn('legs', !tower && (s.legsBroken || (!s.legsOut && alt < 300))); warn('heat', s.heat > 50); warn('rcs', s.rcs < w.level.rcs * 0.15);
}

// Effects
function blast() { const s = app.s; if (reduced()) return; const ex = s.fault?.k === 'sea' ? 'spray' : 'fire', big = app.w.v.id === 'sh' ? 2 : 1; for (let i = 0; i < 160 * big; i++) { const a = Math.random() * Math.PI, sp = (10 + Math.random() * 45) * big; app.parts.push({x: s.x, y: s.y + 4, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1 + Math.random() * 1.5, max: 2.5, k: ex}); } for (let i = 0; i < 50; i++) app.parts.push({x: s.x + (Math.random() - 0.5) * 10 * big, y: s.y + Math.random() * 20 * big, vx: (Math.random() - 0.5) * 10, vy: Math.random() * 6, life: 2 + Math.random() * 2, max: 4, k: 'smoke'}); app.shake = 16; }
function juice(dt) {
  const s = app.s, w = app.w, v = w.v, d = deck(w, s.t), red = reduced(), on = !s.done && s.fuel > 0 && s.throttle > 0, still = app.paused && !app.replay;
  if (on && !still && !red) {
    const n = 2 + Math.round(s.throttle * 3) * (v.id === 'sh' ? 2 : 1), a = s.angle + s.gimbal, spread = v.radius * 1.4;
    for (let i = 0; i < n; i++) { const sp = 40 + Math.random() * 30; app.parts.push({x: s.x - Math.sin(s.angle) * 1.5 + (Math.random() - 0.5) * spread, y: s.y + 0.5, vx: s.vx - Math.sin(a) * sp + (Math.random() - 0.5) * 8, vy: s.vy - Math.cos(a) * sp, life: 0.5 + Math.random() * 0.5, max: 1, k: 'fire'}); }
    const ground = w.kind === 'tower' ? 0 : Math.abs(s.x) < d.half ? deckYAt(d, s.x) : seaY(w, s.x, s.t), alt = s.y - ground, reach = v.id === 'sh' ? 110 : 60;
    if (alt < reach) for (let i = 0; i < 4 * (v.id === 'sh' ? 2 : 1); i++) { const dir = Math.random() < 0.5 ? -1 : 1, near = 1 - alt / reach; app.parts.push({x: s.x + dir * Math.random() * 6, y: ground + 1, vx: dir * (15 + Math.random() * 35) * near * (v.id === 'sh' ? 1.6 : 1), vy: Math.random() * 6 * near, life: 1.2 + Math.random(), max: 2.2, k: w.kind === 'ship' && Math.abs(s.x) >= d.half ? 'spray' : 'smoke'}); }
  }
  // Cold gas: little clouds that drift off the top
  if (!red && !still && !s.done && (app.keys.rl || app.keys.rr) && s.rcs > 0) { const side = app.keys.rl ? 1 : -1, top = v.height - 1.5; for (let i = 0; i < 2; i++) app.parts.push({x: s.x + Math.sin(s.angle) * top + Math.cos(s.angle) * side * (v.radius + 0.5), y: s.y + Math.cos(s.angle) * top - Math.sin(s.angle) * side * (v.radius + 0.5), vx: s.vx + Math.cos(s.angle) * side * (14 + Math.random() * 6), vy: s.vy - Math.sin(s.angle) * side * 14 + (Math.random() - 0.5) * 4, life: 0.5, max: 0.5, k: 'gas'}); }
  if (!still) { app.parts = app.parts.filter(p => (p.life -= dt) > 0); for (const p of app.parts) { const drag = p.k === 'fire' ? 0.9 : p.k === 'gas' ? 0.88 : 0.97; p.vx *= drag ** (dt * 60); p.vy *= drag ** (dt * 60); if (p.k === 'smoke') p.vy += 1.5 * dt; if (p.k === 'spray') p.vy -= 9.8 * dt; p.x += p.vx * dt; p.y += p.vy * dt; } }
  if (app.parts.length > 1100) app.parts.splice(0, app.parts.length - 1100);
  app.rings = app.rings.filter(r => (r.life -= dt) > 0); for (const r of app.rings) r.r += 600 * dt;
  app.shake = red ? 0 : Math.max(0, app.shake - dt * 18); app.flash = Math.max(0, app.flash - dt * 3);
  if (on && !red) app.shake = Math.max(app.shake, s.throttle * 2.5 * Math.min(1, rho(s.y)) * (s.y < 200 ? 1.5 : 0.6));
  if (w.level.sky === 'storm' && !still && Math.random() < dt * 0.18 && !red) { app.flash = 1; app.bolt = {x: Math.random(), segs: Array.from({length: 9}, () => Math.random() - 0.5)}; thunder(); }
}
function makeClouds(seed, L) {
  let a = seed % 9973 + 1; const r = () => (a = (a * 16807) % 2147483647) / 2147483647, out = [];
  const n = L.sky === 'storm' ? 120 : L.sky === 'night' ? 40 : L.sky === 'dusk' ? 60 : 30;
  for (let i = 0; i < n; i++) { const y = L.sky === 'storm' ? 1200 + r() * 3500 : 900 + r() * 7000; out.push({x: (r() - 0.5) * 9000, y, w: 300 + r() * 900, h: 60 + r() * 180, a: 0.25 + r() * 0.5}); }
  return out;
}
const SKY = {dawn: ['#1f3563', '#c97f73', '#f6cf9c'], day: ['#2f6fb5', '#9cc7e8', '#e8f2f7'], dusk: ['#2b2a55', '#c4597a', '#f4b26b'], night: ['#020309', '#07101f', '#101b2c'], storm: ['#15191d', '#2e353a', '#4a5157']};
const SEA = {day: ['#1d5f8a', '#0b2c45'], dusk: ['#3b3f6b', '#141833'], night: ['#050b14', '#010306'], storm: ['#273238', '#0d1316']};
const LAND = {dawn: ['#7d6e62', '#4f5640'], day: ['#8a8467', '#5d6a45'], dusk: ['#5b4a52', '#2f2b33'], night: ['#121417', '#07080a']};
// Camera: zoomed out high up, closing in on the final approach, a slow push in after a landing.
function camTarget(w, s) {
  const c = $('sky'), H = c.height, v = w.v, done = s.done && s.landed;
  if (w.kind === 'tower') { const topY = Math.max(s.y + v.height + 25, TOWER.top + 20); let sc = Math.max(0.022, Math.min(3.2, (H - 120) / topY)); if (done) sc = 3.3; return {scale: sc, x: s.x + (0 - s.x) * Math.min(0.6, 120 / Math.max(120, s.y)) - (done ? 8 : 0)}; }
  const d = deck(w, s.t), alt = Math.max(0, s.y - d.y); let sc = Math.max(0.022, Math.min(6.2, (H - 210) / (alt + 50))); if (done) sc = 7.4;
  const W = c.width, viewW = W / sc, pull = alt < 250 ? 0.4 + 0.5 * (1 - alt / 250) : 0.4;
  return {scale: sc, x: done ? s.x : s.x + Math.max(-viewW * 0.3, Math.min(viewW * 0.3, (d.x - s.x) * pull))};
}
function draw(dt) {
  const c = $('sky'), x = c.getContext('2d'), W = c.width, H = c.height, s = app.s, w = app.w, L = w.level, v = w.v, d = deck(w, s.t), tower = w.kind === 'tower';
  const ct = camTarget(w, s), cam = app.cam, ease = s.done ? 0.03 : 0.12; cam.scale *= Math.pow(ct.scale / cam.scale, ease); cam.x += (ct.x - cam.x) * (s.done ? 0.05 : 0.2); const scale = cam.scale;
  const alt = s.y - target(w, s).y;
  const sh = app.shake, ox = W / 2 + (Math.random() - 0.5) * sh, oy = (Math.random() - 0.5) * sh, SEAY = H - 82;
  const X = v2 => ox + (v2 - cam.x) * scale, Y = v2 => oy + SEAY - v2 * scale;
  // Sky
  const sk = SKY[L.sky], g = x.createLinearGradient(0, 0, 0, SEAY); g.addColorStop(0, sk[0]); g.addColorStop(0.6, sk[1]); g.addColorStop(1, sk[2]); x.fillStyle = g; x.fillRect(0, 0, W, H);
  const hi = Math.min(1, s.y / 12000); if (hi > 0.2) { x.fillStyle = `rgba(2,4,12,${(hi - 0.2) * 0.75})`; x.fillRect(0, 0, W, SEAY); }
  if (L.sky === 'night' || hi > 0.5) { x.fillStyle = '#fff'; for (let i = 0; i < 110; i++) { const sx = ((i * 151 - cam.x * 0.002 * (i % 3)) % W + W) % W, sy = (i * 97) % (SEAY - 40); x.globalAlpha = L.sky === 'night' ? 0.4 + (i % 5) * 0.12 : (hi - 0.5) * 2 * 0.6; x.fillRect(sx, sy, i % 7 ? 1.2 : 2, i % 7 ? 1.2 : 2); } x.globalAlpha = 1; }
  if (L.sky === 'day') { x.fillStyle = 'rgba(255,250,225,.9)'; x.beginPath(); x.arc(W * 0.8, 70, 26, 0, 7); x.fill(); }
  if (L.sky === 'dawn') { const sg = x.createRadialGradient(W * 0.86, SEAY - 6, 5, W * 0.86, SEAY - 6, 190); sg.addColorStop(0, 'rgba(255,226,170,.95)'); sg.addColorStop(1, 'rgba(255,170,120,0)'); x.fillStyle = sg; x.fillRect(0, 0, W, SEAY); }
  if (L.sky === 'dusk') { const sg = x.createRadialGradient(W * 0.2, SEAY - 10, 5, W * 0.2, SEAY - 10, 160); sg.addColorStop(0, 'rgba(255,214,140,.95)'); sg.addColorStop(1, 'rgba(255,140,90,0)'); x.fillStyle = sg; x.fillRect(0, 0, W, SEAY); }
  if (L.sky === 'night') { x.fillStyle = '#e8ecf2'; x.beginPath(); x.arc(W * 0.78, 64, 16, 0, 7); x.fill(); x.fillStyle = SKY.night[0]; x.beginPath(); x.arc(W * 0.78 + 7, 59, 14, 0, 7); x.fill(); }
  if (app.flash > 0) { x.fillStyle = `rgba(220,230,255,${app.flash * 0.45})`; x.fillRect(0, 0, W, SEAY); if (app.bolt && app.flash > 0.6) { x.strokeStyle = `rgba(255,255,255,${app.flash})`; x.lineWidth = 2; x.beginPath(); let bx = app.bolt.x * W, by = 0; x.moveTo(bx, by); for (const q of app.bolt.segs) { bx += q * 60; by += SEAY / 9; x.lineTo(bx, by); } x.stroke(); } }
  for (let i = 0; i < 6; i++) { const px = ((i * 263 - cam.x * 0.004) % (W + 300) + W + 300) % (W + 300) - 150, py = SEAY - 30 - (i % 3) * 18; x.fillStyle = L.sky === 'night' ? 'rgba(30,40,60,.35)' : L.sky === 'storm' ? 'rgba(20,24,28,.55)' : 'rgba(255,255,255,.25)'; x.beginPath(); x.ellipse(px, py, 140, 14, 0, 0, 7); x.fill(); }
  const cloudCol = L.sky === 'storm' ? '60,66,72' : L.sky === 'night' ? '40,52,72' : L.sky === 'dusk' || L.sky === 'dawn' ? '250,206,190' : '255,255,255';
  for (const cl of app.clouds) { const cx = X(cl.x), cy = Y(cl.y), rw = cl.w * scale, rh = Math.max(2, cl.h * scale); if (cx + rw < 0 || cx - rw > W || cy + rh < 0 || cy - rh > H) continue; x.fillStyle = `rgba(${cloudCol},${cl.a * 0.7})`; x.beginPath(); x.ellipse(cx, cy, rw / 2, rh / 2, 0, 0, 7); x.ellipse(cx - rw * 0.25, cy + rh * 0.1, rw / 3, rh / 2.4, 0, 0, 7); x.ellipse(cx + rw * 0.22, cy - rh * 0.1, rw / 3.2, rh / 2.2, 0, 0, 7); x.fill(); }
  const sp = Math.hypot(s.vx, s.vy); if (!s.done && sp > 60 && !reduced()) { x.strokeStyle = `rgba(255,255,255,${Math.min(0.35, (sp - 60) / 600)})`; x.lineWidth = 1; for (let i = 0; i < 26; i++) { const sx = (i * 89 + s.x * 0.8) % W, sy = ((i * 53 - s.y * 0.9) % H + H) % H, l = sp * 0.12; x.beginPath(); x.moveTo((sx + W) % W, sy); x.lineTo((sx + W) % W - s.vx * l / sp, sy + s.vy * l / sp); x.stroke(); } }
  const x0 = cam.x - W / 2 / scale - 10, x1 = cam.x + W / 2 / scale + 10, stp = Math.max(1, 6 / scale), se = SEA[L.sky];
  if (tower) drawLand(x, X, Y, W, H, SEAY, scale, L, cam); else { const sg = x.createLinearGradient(0, SEAY - 4, 0, H); sg.addColorStop(0, se[0]); sg.addColorStop(1, se[1]); x.fillStyle = sg; x.beginPath(); x.moveTo(0, H); for (let m = x0; m <= x1; m += stp) x.lineTo(X(m), Y(seaY(w, m, s.t)) - 2); x.lineTo(W, H); x.fill(); drawShip(x, X, Y, d, scale, L); }
  if (tower) drawTower(x, X, Y, scale, L, s, 'back');
  drawBooster(x, X, Y, scale, L, d);
  if (tower) drawTower(x, X, Y, scale, L, s, 'front');
  for (const p of app.parts) { const px = X(p.x), py = Y(p.y), f = p.life / p.max; if (px < -20 || px > W + 20 || py < -20 || py > H + 20) continue;
    if (p.k === 'fire') { x.fillStyle = `rgba(255,${150 + Math.round(90 * f)},${60 + Math.round(120 * f)},${0.5 * f})`; const r = Math.max(1.5, (1 - f) * 3 * Math.max(1, scale)); x.fillRect(px - r / 2, py - r / 2, r, r); }
    else if (p.k === 'smoke') { x.fillStyle = `rgba(220,220,215,${0.35 * f})`; const r = Math.max(2, (1 - f + 0.3) * 4 * scale); x.beginPath(); x.arc(px, py, r, 0, 7); x.fill(); }
    else if (p.k === 'spray') { x.fillStyle = `rgba(230,245,255,${0.6 * f})`; x.fillRect(px, py, 2, 2); }
    else { x.fillStyle = `rgba(255,255,255,${0.55 * f})`; x.beginPath(); x.arc(px, py, Math.max(1.5, (1.4 - f) * 1.6 * scale), 0, 7); x.fill(); } }
  if (!tower) { x.fillStyle = se[0]; x.globalAlpha = 0.75; x.beginPath(); x.moveTo(0, H); for (let m = x0; m <= x1; m += stp) x.lineTo(X(m), Y(seaY(w, m + 13, s.t) - 0.8 - L.sea.heave * 0.4)); x.lineTo(W, H); x.fill(); x.globalAlpha = 1;
    x.strokeStyle = L.sky === 'night' ? 'rgba(120,160,200,.18)' : 'rgba(255,255,255,.22)'; x.lineWidth = 1; for (let k = 1; k < 6; k++) { x.beginPath(); for (let m = x0; m <= x1; m += stp * 2) x.lineTo(X(m), Y(seaY(w, m * (1 + k * 0.1), s.t) - k * 1.5) + k * 9); x.stroke(); } }
  for (const r of app.rings) { x.strokeStyle = `rgba(255,255,255,${r.life / 1.6 * 0.7})`; x.lineWidth = 3; x.beginPath(); x.arc(X(r.x), Y(r.y), r.r, 0, 7); x.stroke(); }
  if (L.sky === 'storm' && !reduced()) { const wx = wind(w, 200, s.t); x.strokeStyle = 'rgba(180,200,220,.35)'; x.lineWidth = 1; x.beginPath(); for (let i = 0; i < 140; i++) { const rx = ((i * 137 + s.t * (wx * 18) + Math.sin(i) * 300) % W + W) % W, ry = ((i * 71 + s.t * 900) % H); x.moveTo(rx, ry); x.lineTo(rx + wx * 0.8, ry + 14); } x.stroke(); }
  // Overlays
  const rs = q => 20 + (q + 3000) / 6000 * (W - 40); x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(20, 12, W - 40, 6); x.fillStyle = '#d6ff00'; const half = tower ? 15 : d.half; x.fillRect(rs(-half), 10, Math.max(3, rs(half) - rs(-half)), 10); x.fillStyle = '#fff'; x.fillRect(Math.max(20, Math.min(W - 24, rs(s.x))) - 2, 8, 4, 14);
  const tY = tower ? s.armY : d.y, dxs = X(0); if (dxs < 10 || dxs > W - 10) { const right = dxs > W; x.fillStyle = '#d6ff00'; x.font = 'bold 13px ui-monospace,monospace'; x.textAlign = right ? 'right' : 'left'; const ay = Math.min(SEAY - 20, Math.max(40, Y(tY))); x.fillText(`${right ? '' : '◀ '}${tower ? 'TOWER' : 'DECK'} ${Math.abs(s.x).toFixed(0)} m${right ? ' ▶' : ''}`, right ? W - 12 : 12, ay); }
  else if ((tower ? 40 : d.half * 2) * scale < 14) { x.strokeStyle = '#d6ff00'; x.lineWidth = 2; x.beginPath(); x.moveTo(dxs - 8, Y(tY) - 18); x.lineTo(dxs, Y(tY) - 8); x.lineTo(dxs + 8, Y(tY) - 18); x.stroke(); }
  if (!s.done && !app.replay) { const tapeTop = 40, tapeBot = SEAY - 10, tapeX = W - 34, maxA = Math.max(500, Math.min(12000, alt * 1.15)); const ty = q => tapeBot - Math.min(1, Math.max(0, q / maxA)) * (tapeBot - tapeTop);
    x.fillStyle = 'rgba(0,0,0,.4)'; x.fillRect(tapeX, tapeTop, 10, tapeBot - tapeTop); const stopH = stopHeight(s, v);
    if (v.flaps && shipPhase(s) === 'belly') { const fh = flipHeight(s, v); x.fillStyle = 'rgba(90,200,255,.9)'; x.fillRect(tapeX - 4, ty(fh) - 2, 18, 4); x.font = '11px ui-monospace,monospace'; x.textAlign = 'right'; x.fillStyle = '#9fe0ff'; x.fillText('FLIP', tapeX - 8, ty(fh) + 4); } x.fillStyle = 'rgba(255,90,60,.8)'; x.fillRect(tapeX - 4, ty(stopH) - 2, 18, 4);
    x.fillStyle = '#fff'; x.fillRect(tapeX - 6, ty(alt) - 1.5, 22, 3); x.font = '11px ui-monospace,monospace'; x.textAlign = 'right'; x.fillStyle = '#ffb08f'; x.fillText('BURN', tapeX - 8, ty(stopH) + 4); x.fillStyle = '#fff'; x.fillText(`${alt.toFixed(0)} m`, tapeX - 8, ty(alt) - 6); }
  const wx = wind(w, s.y, s.t); x.fillStyle = 'rgba(0,0,0,.4)'; x.fillRect(20, 30, 132, 26); x.fillStyle = '#fff'; x.font = '11px ui-monospace,monospace'; x.textAlign = 'left'; x.fillText(`WIND ${Math.abs(wx).toFixed(0)} m/s`, 28, 47); x.strokeStyle = '#fff'; x.lineWidth = 2; x.beginPath(); const ax0 = 128, al = Math.max(-16, Math.min(16, wx * 1.4)); x.moveTo(ax0 - al, 43); x.lineTo(ax0 + al, 43); if (Math.abs(al) > 2) { x.lineTo(ax0 + al - Math.sign(al) * 5, 39); x.moveTo(ax0 + al, 43); x.lineTo(ax0 + al - Math.sign(al) * 5, 47); } x.stroke();
  if (s.mach > 0.9 && !s.done) { x.fillStyle = s.mach >= 1 ? '#ffb347' : '#fff'; x.fillText(`MACH ${s.mach.toFixed(2)}`, 28, 72); }
  if (v.flaps && !s.done && !app.replay) shipPanel(x, W, alt);
  if (tower && !s.done && s.y < 300 && Math.abs(s.x) < 120 && !(v.flaps && shipPhase(s) !== 'upright')) catchPanel(x, W);
  const small = c.clientWidth > 0 && c.clientWidth < 640;
  if (s.t < 7 && !s.done && !small && !app.replay) { const hw = v.flaps ? 350 : 250; x.fillStyle = 'rgba(0,0,0,.5)'; x.fillRect(W / 2 - hw, H - 58, hw * 2, 40); x.fillStyle = '#fff'; x.textAlign = 'center'; x.font = '12px ui-monospace,monospace'; x.fillText(v.flaps ? 'Q/E pitch with the flaps · A/D tuck or spread them · W light up and hold E to flip · C close arms' : `W/S throttle · Q/E lean · A/D gimbal · ${tower ? 'C close arms' : 'L legs'} · Space full · X cut`, W / 2, H - 34); }
  if (small && !s.done) { const f = Math.min(34, Math.round(12 * W / c.clientWidth)), r = readings(); x.fillStyle = 'rgba(0,0,0,.55)'; x.fillRect(0, H - f * 1.7, W, f * 1.7); x.font = `bold ${f}px ui-monospace,monospace`; x.textAlign = 'left'; x.fillStyle = -s.vy > LIMITS.down && alt < 40 ? '#ff8a5c' : '#fff';
    x.fillText(`↓${(-s.vy).toFixed(0)} ↔${(s.vx - d.vx).toFixed(1)} ${v.flaps ? Math.round(s.angle * DEG) + '° ' : ''}${r.th} ${Math.round(s.fuel / w.fuel * 100)}% ${tower ? (inWindow(w, s) ? 'IN WINDOW' : '') : s.legs >= 1 ? 'LEGS' : ''}`, 10, H - f * 0.5); }
  if (app.replay) { x.fillStyle = 'rgba(0,0,0,.55)'; x.fillRect(W / 2 - 90, 34, 180, 30); x.fillStyle = '#d6ff00'; x.font = 'bold 14px ui-monospace,monospace'; x.textAlign = 'center'; x.fillText('▶ REPLAY  ½×', W / 2, 54); x.strokeStyle = 'rgba(214,255,0,.5)'; x.lineWidth = 4; x.strokeRect(2, 2, W - 4, H - 4); }
  if (app.paused) { x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(0, 0, W, H); }
  if (L.sky === 'night') { const vg = x.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.9); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.5)'); x.fillStyle = vg; x.fillRect(0, 0, W, H); }
}
// The ship's panel: phase, attitude dial, speed, drift and fuel. Under it, once upright, the catch window with its tolerances.
function shipPanel(x, W, alt) {
  const s = app.s, w = app.w, ph = shipPhase(s), fh = flipHeight(s, w.v), X0 = W - 270, Y0 = 34, small = $('sky').clientWidth < 640;
  if (small) return; x.fillStyle = 'rgba(0,0,0,.55)'; x.fillRect(X0, Y0, 160, 132); x.textAlign = 'left'; x.font = 'bold 11px ui-monospace,monospace';
  const late = ph === 'belly' && alt < fh, col = late ? '#9fe0ff' : ph === 'upright' ? '#d6ff00' : '#fff';
  x.fillStyle = col; x.fillText(ph === 'belly' ? (late ? 'FLIP NOW: W + E' : 'BELLY FLOP') : ph === 'flip' ? 'FLIPPING' : 'UPRIGHT', X0 + 8, Y0 + 16);
  // attitude dial: a little ship drawn at its real angle, 0° up
  const cx = X0 + 32, cy = Y0 + 56; x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 1; x.beginPath(); x.arc(cx, cy, 22, 0, 7); x.stroke(); x.beginPath(); x.moveTo(cx, cy - 25); x.lineTo(cx, cy - 19); x.moveTo(cx - 25, cy); x.lineTo(cx - 19, cy); x.stroke();
  x.save(); x.translate(cx, cy); x.rotate(s.angle); x.fillStyle = '#cfd5da'; x.fillRect(-3, -16, 6, 28); x.fillStyle = '#111'; x.fillRect(-3, -16, 3, 28); x.beginPath(); x.moveTo(-3, -16); x.lineTo(0, -21); x.lineTo(3, -16); x.fill(); x.restore();
  x.font = '11px ui-monospace,monospace'; x.fillStyle = '#fff'; const sp = Math.hypot(s.vx, s.vy);
  x.fillText(`${Math.round(s.angle * DEG)}°`, X0 + 62, Y0 + 40); x.fillText(`SPD ${sp.toFixed(0)} m/s`, X0 + 62, Y0 + 56); x.fillText(`DRIFT ${s.vx.toFixed(1)}`, X0 + 62, Y0 + 72);
  x.fillText(`TO ARMS ${s.x.toFixed(0)} m`, X0 + 8, Y0 + 98); x.fillText('FUEL', X0 + 8, Y0 + 118); const f = s.fuel / w.fuel; x.fillStyle = 'rgba(255,255,255,.2)'; x.fillRect(X0 + 44, Y0 + 110, 106, 9); x.fillStyle = f < 0.15 ? '#ff6a4a' : '#d6ff00'; x.fillRect(X0 + 44, Y0 + 110, 106 * f, 9);
}
function catchPanel(x, W) {
  const s = app.s, cw = catchWindow(app.w, s), items = [['HEIGHT', cw.height], ['CENTRE', cw.centre], ['DRIFT', cw.still], ['SPEED', cw.slow], ['LEVEL', cw.level]], all = items.every(i => i[1]);
  x.fillStyle = 'rgba(0,0,0,.55)'; x.fillRect(20, 82, 150, 26 + items.length * 18); x.font = 'bold 11px ui-monospace,monospace'; x.textAlign = 'left';
  x.fillStyle = all ? '#d6ff00' : '#fff'; x.fillText(s.armsCmd === 1 ? 'ARMS CLOSING' : s.armsCmd === 2 ? 'ARMS OPENING' : all ? 'IN WINDOW: C' : 'CATCH WINDOW', 28, 99);
  const tol = [`±${CATCH.dy} m`, `±${CATCH.dx} m`, `<${CATCH.vx} m/s`, `<${CATCH.vyDown} m/s`, `<${Math.round(CATCH.tilt * DEG)}°`];
  items.forEach(([n, ok], i) => { x.fillStyle = ok ? '#d6ff00' : '#ff6a4a'; x.fillRect(28, 108 + i * 18, 9, 9); x.fillStyle = '#fff'; x.fillText(n, 44, 117 + i * 18); if (app.w.v.flaps && i) { x.fillStyle = '#bbb'; x.fillText(tol[i], 104, 117 + i * 18); } });
  x.fillStyle = '#bbb'; x.fillText(`${cw.dy > 0 ? '+' : ''}${cw.dy.toFixed(1)} m`, 112, 117);
}
function drawLand(x, X, Y, W, H, SEAY, scale, L, cam) {
  const s = app.s; if (app.w.v.flaps && !s.done && shipPhase(s) === 'belly') { const fx = X(FLIP.lead); x.strokeStyle = 'rgba(90,200,255,.6)'; x.setLineDash([5, 6]); x.lineWidth = 1.5; x.beginPath(); x.moveTo(fx, Y(0)); x.lineTo(fx, Math.max(30, Y(Math.min(s.y, 6000)))); x.stroke(); x.setLineDash([]); x.fillStyle = '#9fe0ff'; x.font = 'bold 11px ui-monospace,monospace'; x.textAlign = 'center'; x.fillText('FLIP ZONE', fx, Math.max(44, Y(0) - 12)); }
  const lc = LAND[L.sky] || LAND.day, night = L.sky === 'night';
  // the sea far off, then low scrub, then the pad
  x.fillStyle = night ? '#0a1424' : L.sky === 'dusk' ? '#4a4f7d' : L.sky === 'dawn' ? '#6b7fa6' : '#4d86b0'; x.fillRect(0, SEAY - 10, W, 10);
  for (let i = 0; i < 8; i++) { const px = ((i * 211 - cam.x * 0.01) % (W + 200) + W + 200) % (W + 200) - 100; x.fillStyle = night ? 'rgba(20,24,30,.9)' : 'rgba(70,74,70,.5)'; x.fillRect(px, SEAY - 22 - (i % 3) * 6, 26 + (i % 4) * 10, 22 + (i % 3) * 6); x.beginPath(); x.ellipse(px + 40, SEAY - 14, 18, 14, 0, Math.PI, 0); x.fill(); if (night) { x.fillStyle = '#ffd98a'; x.fillRect(px + 5, SEAY - 20, 2, 2); } }
  const gg = x.createLinearGradient(0, Y(0), 0, H); gg.addColorStop(0, lc[0]); gg.addColorStop(1, lc[1]); x.fillStyle = gg; x.fillRect(0, Math.min(Y(0), SEAY), W, H);
  x.fillStyle = night ? '#2a2d31' : '#b9b6aa'; x.fillRect(X(-70), Y(0), 150 * scale, Math.max(3, 2 * scale));
  if (scale > 0.6) { x.strokeStyle = night ? 'rgba(214,255,0,.4)' : 'rgba(80,80,70,.5)'; x.lineWidth = 1; x.setLineDash([6, 6]); x.beginPath(); x.moveTo(X(-70), Y(0) + 1); x.lineTo(X(80), Y(0) + 1); x.stroke(); x.setLineDash([]); }
}
// The catch tower: a steel lattice, a carriage that rides up and down, two arms that swing shut.
function drawTower(x, X, Y, scale, L, s, layer) {
  const T = TOWER, night = L.sky === 'night', steel = night ? '#2c3136' : '#4b5157', hi = night ? '#4a5157' : '#6d747b', k = scale;
  const arm = (front) => { const open = 1 - s.arms, ang = open * 1.05, len = T.armLen * Math.cos(ang), dy = (front ? -1 : 1) * (Math.sin(ang) * 6 + 0.6), y = s.armY + dy, hx = T.x1;
    x.fillStyle = front ? hi : steel; x.beginPath(); x.moveTo(X(hx), Y(y + 1.2)); x.lineTo(X(hx + len), Y(y + 0.8)); x.lineTo(X(hx + len), Y(y - 0.6)); x.lineTo(X(hx), Y(y - 1.6)); x.fill();
    if (k > 1) { x.strokeStyle = front ? steel : '#22262a'; x.lineWidth = 1; x.beginPath(); for (let i = 0; i < 8; i++) { const a = hx + len * i / 8, b = hx + len * (i + 1) / 8; x.moveTo(X(a), Y(y - 0.5)); x.lineTo(X(b), Y(y + 0.8)); } x.stroke(); }
    x.fillStyle = '#d6ff00'; x.fillRect(X(hx + len * 0.55), Y(y + 1.15), Math.max(2, len * 0.35 * k), Math.max(1.5, 0.3 * k)); };
  if (layer === 'back') {
    // lattice tower
    x.fillStyle = steel; x.fillRect(X(T.x0), Y(T.top), 1.8 * k + 1, T.top * k); x.fillRect(X(T.x1) - 1.8 * k - 1, Y(T.top), 1.8 * k + 1, T.top * k);
    x.strokeStyle = steel; x.lineWidth = Math.max(1, 0.5 * k); x.beginPath(); for (let y = 0; y < T.top; y += 9) { x.moveTo(X(T.x0), Y(y)); x.lineTo(X(T.x1), Y(y + 9)); x.moveTo(X(T.x1), Y(y)); x.lineTo(X(T.x0), Y(y + 9)); x.moveTo(X(T.x0), Y(y)); x.lineTo(X(T.x1), Y(y)); } x.stroke();
    x.fillStyle = steel; x.fillRect(X(T.x0 - 1), Y(T.top + 1.5), (T.x1 - T.x0 + 2) * k, 1.5 * k + 1); x.fillRect(X((T.x0 + T.x1) / 2) - 1, Y(T.top + 18), Math.max(2, 0.6 * k), 18 * k); // top deck and lightning mast
    x.fillStyle = (Math.floor(s.t * 1.2) % 2) ? '#ff3b2f' : '#5a1410'; x.beginPath(); x.arc(X((T.x0 + T.x1) / 2), Y(T.top + 18), Math.max(2, 0.6 * k), 0, 7); x.fill();
    if (night) { for (const yy of [30, 70, 120]) { const g = x.createLinearGradient(X(T.x1), 0, X(T.x1 + 70), 0); g.addColorStop(0, 'rgba(255,248,215,.13)'); g.addColorStop(1, 'rgba(255,248,215,0)'); x.fillStyle = g; x.beginPath(); x.moveTo(X(T.x1), Y(yy)); x.lineTo(X(T.x1 + 70), Y(yy - 22)); x.lineTo(X(T.x1 + 70), Y(yy - 50)); x.closePath(); x.fill(); x.fillStyle = '#fff6c8'; x.fillRect(X(T.x1), Y(yy) - 2, 4, 4); } }
    // carriage and the back arm
    x.fillStyle = hi; x.fillRect(X(T.x0 - 1), Y(s.armY + 4), (T.x1 - T.x0 + 2) * k, 8 * k);
    arm(false);
    // target marks: where the pins need to be
    if (!s.done) { const ok = inWindow(app.w, s); x.strokeStyle = ok ? '#d6ff00' : 'rgba(214,255,0,.55)'; x.lineWidth = 2; for (const sg of [-1, 1]) { const px = sg * (app.w.v.radius + 0.7); x.beginPath(); x.moveTo(X(px - CATCH.dx * 0.5), Y(s.armY + CATCH.dy)); x.lineTo(X(px), Y(s.armY + CATCH.dy)); x.lineTo(X(px), Y(s.armY - CATCH.dy)); x.lineTo(X(px - CATCH.dx * 0.5), Y(s.armY - CATCH.dy)); x.stroke(); } }
  } else arm(true);
}
function drawShip(x, X, Y, d, scale, L) {
  const night = L.sky === 'night' || L.sky === 'storm';
  x.save(); x.translate(X(d.x), Y(d.y)); x.rotate(-d.pitch); const k = scale, hw = d.half * k;
  x.fillStyle = night ? '#1d2328' : '#39424a'; x.beginPath(); x.moveTo(-hw - 4 * k, 0); x.lineTo(hw + 4 * k, 0); x.lineTo(hw + 1 * k, 9 * k); x.lineTo(-hw - 1 * k, 9 * k); x.closePath(); x.fill();
  x.fillStyle = night ? '#2c343a' : '#57616a'; x.fillRect(-hw - 4 * k, 0, (d.half * 2 + 8) * k, 1.6 * k);
  x.fillStyle = '#c6a63a'; x.fillRect(-hw - 4 * k, 1.6 * k, (d.half * 2 + 8) * k, 0.8 * k);
  const depth = Math.max(2, 7 * k); x.fillStyle = night ? '#262d33' : '#4a545c'; x.beginPath(); x.moveTo(-hw, 0); x.lineTo(hw, 0); x.lineTo(hw - 3 * k, -depth); x.lineTo(-hw + 3 * k, -depth); x.closePath(); x.fill();
  if (k > 2) { x.strokeStyle = 'rgba(0,0,0,.25)'; x.lineWidth = 1; x.beginPath(); for (let i = -40; i <= 40; i += 5) { x.moveTo(i * k, 0); x.lineTo(i * k * 0.93, -depth); } x.stroke(); }
  x.strokeStyle = night ? 'rgba(214,255,0,.85)' : '#d6ff00'; x.lineWidth = Math.max(1, 0.8 * k); x.beginPath(); x.ellipse(0, -depth / 2, 18 * k, depth * 0.42, 0, 0, 7); x.stroke(); x.beginPath(); x.ellipse(0, -depth / 2, 3 * k, depth * 0.12, 0, 0, 7); x.stroke();
  x.fillStyle = night ? 'rgba(214,255,0,.85)' : '#d6ff00'; x.fillRect(-12 * k, -depth / 2 - Math.max(0.5, depth * 0.05), 24 * k, Math.max(1, depth * 0.1));
  x.fillStyle = night ? '#30383f' : '#6a747c'; x.fillRect(-hw - 3 * k, -6 * k, 2.5 * k, 6 * k); x.fillRect(hw + 0.5 * k, -6 * k, 2.5 * k, 6 * k); x.fillRect(hw - 2 * k, -4 * k, 4 * k, 4 * k);
  if (k > 1.2) { x.fillStyle = night ? '#9aa4ad' : '#e6e9ea'; x.font = `bold ${Math.max(8, 2.6 * k)}px ui-monospace,monospace`; x.textAlign = 'center'; x.fillText('PATIENCE', -hw * 0.55, 6 * k); }
  for (let i = -4; i <= 4; i++) { const lx = i * d.half / 4 * k; x.fillStyle = night ? '#fff6c8' : '#ffe9a0'; x.beginPath(); x.arc(lx, -1, Math.max(1.2, 0.5 * k), 0, 7); x.fill(); if (night) { const lg = x.createRadialGradient(lx, -1, 0, lx, -1, Math.max(6, 5 * k)); lg.addColorStop(0, 'rgba(255,240,180,.45)'); lg.addColorStop(1, 'rgba(255,240,180,0)'); x.fillStyle = lg; x.fillRect(lx - 6 * k - 6, -6 * k - 6, 12 * k + 12, 12 * k + 12); } }
  if (night) { x.fillStyle = 'rgba(255,250,210,.06)'; for (const sgn of [-1, 1]) { x.beginPath(); x.moveTo(sgn * (hw - 2 * k), -6 * k); x.lineTo(sgn * 60 * k, -400 * k); x.lineTo(sgn * 20 * k, -400 * k); x.closePath(); x.fill(); } }
  x.restore();
}
function drawBooster(x, X, Y, scale, L, d) {
  const s = app.s, w = app.w, v = w.v, k = Math.max(scale, v.id === 'f9' ? 1.3 : 0.9);
  let by = s.y, ang = s.angle;
  if (s.done && s.landed && w.kind === 'ship') { by = deckYAt(d, s.x); ang = -d.pitch; }
  if (s.done && !s.landed) return;
  x.save(); x.translate(X(s.x), Y(by)); x.rotate(ang);
  const on = !s.done && s.fuel > 0 ? s.throttle : 0, rcs = !s.done && s.rcs > 0 && (app.keys.rl || app.keys.rr) ? (app.keys.rl ? 1 : -1) : 0;
  drawVehicle(x, v.id, k, {throttle: on, gimbal: s.gimbal, legs: s.legs, legsBroken: s.legsBroken, fins: s.fins ?? 1, soot: s.soot ?? 0.25, heat: s.heat, thin: 1 - Math.min(1, rho(s.y) / 1.225), rcs, flaps: s.flaps || 0, pitch: s.done ? 0 : (app.keys.rl ? -1 : app.keys.rr ? 1 : 0), night: L.sky === 'night', reduced: reduced()});
  if (!s.done && s.mach > 0.92 && s.mach < 1.08 && rho(s.y) > 0.25) { const a = 1 - Math.abs(s.mach - 1) / 0.08, r = v.radius; x.fillStyle = `rgba(255,255,255,${0.35 * a})`; x.beginPath(); x.moveTo(-r * k, -6 * k); x.quadraticCurveTo(-r * 5 * k, -14 * k, -r * 4.8 * k, -24 * k); x.lineTo(r * 4.8 * k, -24 * k); x.quadraticCurveTo(r * 5 * k, -14 * k, r * k, -6 * k); x.fill(); }
  x.restore();
}

function finish() {
  app.ended = true; const s = app.s, w = app.w, L = w.level, sc = score(s, w), st = store(), tower = w.kind === 'tower';
  sound(false); if (!s.landed) { blast(); crash(); } else { app.shake = reduced() ? 0 : 5; tower ? clank() : thump(); }
  $('result').hidden = false; $('paused').hidden = true;
  const t = s.touch || {impact: 0, slide: 0, tilt: 0, dist: 0}; st.flights = (st.flights || 0) + 1;
  $('result-head').textContent = s.landed ? (tower ? `${w.v.flaps ? 'Ship caught' : 'Caught'}. ${sc} points.` : `Booster recovered. ${sc} points.`) : s.fault.k === 'heat' ? 'Lost on entry.' : s.fault.k === 'sea' || s.fault.k === 'range' ? 'Lost at sea.' : tower ? 'Lost at the tower.' : 'Lost on the deck.';
  let txt = !s.landed ? s.fault.text : tower ? `Caught coming down at ${t.impact.toFixed(1)} m/s, drifting ${t.slide.toFixed(1)} m/s, tilted ${(t.tilt * DEG).toFixed(1)}°, ${t.dist.toFixed(1)} m off centre, with ${fuelText(s, w.v).split(',')[0]} of fuel left${w.assist ? ', with arm assist' : ', closing the arms yourself'}.${s.misses ? ` ${s.misses} missed ${s.misses > 1 ? 'tries' : 'try'} first.` : ''}`
    : `Touchdown at ${t.impact.toFixed(1)} m/s onto the deck, sliding ${t.slide.toFixed(1)} m/s, tilted ${(t.tilt * DEG).toFixed(1)}° to it, ${t.dist.toFixed(1)} m from the centre${t.dist <= 3 ? ' (bullseye)' : ''}, with ${Math.round(s.fuel)} kg of fuel left.`;
  if (s.landed) { const p = parts(s, w); $('result-parts').innerHTML = [['Soft', p.soft], ['Level', p.level], ['Still', p.still], ['Centre', p.centre], ['Fuel', p.fuel], ['Bullseye', p.bull]].map(([k, q]) => `<div><b>${q}</b><span>${k}</span></div>`).join('') + `<div><b>×${+p.mult.toFixed(3)}</b><span>${L.name}${w.assist ? ', assist' : ''}</span></div>`; $('result-parts').hidden = false; }
  else $('result-parts').hidden = true;
  st.best = st.best || {}; st.landed = st.landed || {};
  if (L.daily) { const p = s.landed ? parts(s, w) : null, rec = {no: L.no, kind: w.kind, landed: !!s.landed, score: sc, impact: t.impact, dist: t.dist, fuelPct: Math.round(s.fuel / w.fuel * 100), lost: $('result-head').textContent,
      grid: p ? [p.soft / 300, p.level / 150, p.still / 100, p.centre / 350, p.fuel / 250].map(x => x / p.mult) : []};
    if (!app.daily.practice && DAILY.put(L.date, rec)) txt += ' That was your scored flight for today. Fly again to practise.'; else txt += ' Practice flight, not scored.';
    app.daily.practice = true; }
  else if (app.double) { const dc = app.double; dc.scores[dc.i] = sc; dc.caught[dc.i] = !!s.caught; dc.done = !s.caught || dc.i === dc.stages.length - 1;
    if (dc.done) { dc.total = doubleTotal(dc); const both = dc.caught.length === 2 && dc.caught.every(Boolean);
      $('result-head').textContent = both ? `Double Catch! ${dc.total} points.` : dc.i === 0 ? 'Double Catch over: the booster was lost.' : `Booster caught, ship lost. ${dc.total} points.`;
      txt += ` Double Catch: booster ${dc.scores[0] || 0}${dc.i ? ` + ship ${dc.scores[1] || 0}` : ''}${both ? ` + ${Math.round(DOUBLE_BONUS * 100)}% bonus for both` : ''} = ${dc.total} points.`;
      if (dc.total > 0) { st.landed[dc.id] = (st.landed[dc.id] || 0) + (both ? 1 : 0); if (dc.total > (st.best[dc.id] || 0)) { st.best[dc.id] = dc.total; txt += ' A new personal best.'; } } }
    else txt += ' One down. Now the ship is on its way in, belly first.'; }
  else if (s.landed) { st.landed[L.id] = (st.landed[L.id] || 0) + 1; if (sc > (st.best[L.id] || 0)) { st.best[L.id] = sc; txt += ' A new personal best.'; } }
  $('result-text').textContent = txt; write(KEY, st);
  const i = LEVELS.findIndex(l => l.id === L.id), nx = LEVELS[i + 1]; $('next').hidden = L.daily || !s.landed || !nx || nx.mission !== L.mission || !!app.double; if (!$('next').hidden) $('next').textContent = `Next: ${nx.name} (N)`;
  if (app.double && !app.double.done) { $('next').hidden = false; $('next').textContent = 'Now catch the ship (N)'; }
  $('replay').hidden = app.rec.length < 10;
  app.share = app.double?.done ? `Booster landing, Double Catch\n${app.double.total} points, booster ${app.double.scores[0] || 0}${app.double.scores[1] != null ? `, ship ${app.double.scores[1]}` : ''}\nhttps://dexmlabs.app/booster-landing-game/?level=double-catch` : `Booster landing, ${L.name}\n${s.landed ? `${tower ? 'Caught' : 'Recovered'}, ${sc} points, ${t.dist.toFixed(1)} m from centre at ${t.impact.toFixed(1)} m/s` : 'Lost'}\nhttps://dexmlabs.app/booster-landing-game/`;
  const today = L.daily && DAILY.get(L.date); if (today) app.share = dailyCard(today); $('share').textContent = today ? 'Copy Daily Drop card' : 'Copy result'; showDailyResult(today);
  renderMissions(); setLevel(app.level); renderDaily(); $('again').focus({preventScroll: true});
  window.BoosterGame.last = {daily: !!L.daily, level: L.id, vehicle: w.v.id, landed: !!s.landed, caught: !!s.caught, score: sc, fault: s.fault?.k || null, touch: s.touch || null,
    double: app.double ? {stage: app.double.i + 1, done: !!app.double.done, scores: [...app.double.scores], total: app.double.total ?? null} : null};
}

// Sound: off unless switched on. All made here with WebAudio, no files.
function noiseBuf(ac) { const b = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; }
function chain(ac, type, freq, q = 0.7) { const src = ac.createBufferSource(); src.buffer = app.audio.buf; src.loop = true; const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; const g = ac.createGain(); g.gain.value = 0; src.connect(f).connect(g).connect(app.audio.out); src.start(); return {f, g}; }
function sound(on) {
  const st = store(); if (!st.sound) { if (app.audio) app.audio.out.gain.value = 0; return; }
  if (!app.audio) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; const ac = new AC(), out = ac.createGain(); out.gain.value = 0.9; out.connect(ac.destination); app.audio = {ac, out, buf: noiseBuf(ac)}; app.audio.eng = chain(ac, 'lowpass', 300); app.audio.rcs = chain(ac, 'highpass', 2500); app.audio.air = chain(ac, 'bandpass', 500, 0.6); const o = ac.createOscillator(), og = ac.createGain(); o.type = 'sawtooth'; o.frequency.value = 42; og.gain.value = 0; o.connect(og).connect(out); o.start(); app.audio.rum = og; }
  const A = app.audio, s = app.s; if (A.ac.state === 'suspended') A.ac.resume(); A.out.gain.value = 0.9;
  const live = on !== false && s && !s.done && !app.paused, th = live && s.fuel > 0 ? s.throttle : 0, sp = s ? Math.hypot(s.vx, s.vy) : 0, big = app.w?.v.id === 'sh';
  A.eng.g.gain.value = th * 0.45; A.eng.f.frequency.value = (big ? 120 : 180) + th * (big ? 380 : 520) * Math.max(0.4, Math.min(1, rho(s?.y || 0))); A.rum.gain.value = th * (big ? 0.09 : 0.05);
  A.rcs.g.gain.value = live && s.rcs > 0 && (app.keys.rl || app.keys.rr) ? 0.08 : 0;
  A.air.g.gain.value = live ? Math.min(0.25, rho(s.y) * sp / 900 + Math.abs(wind(app.w, s.y, s.t)) / 120) : 0; A.air.f.frequency.value = 300 + Math.min(1500, sp * 3);
}
function env(f, g0, len, type = 'sine', delay = 0) { const A = app.audio; if (!store().sound || !A) return; const t = A.ac.currentTime + delay, o = A.ac.createOscillator(), g = A.ac.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f * 0.4), t + len); g.gain.setValueAtTime(g0, t); g.gain.exponentialRampToValueAtTime(0.0001, t + len); o.connect(g).connect(A.out); o.start(t); o.stop(t + len + 0.05); }
function burst(len, g0, freq, delay = 0) { const A = app.audio; if (!store().sound || !A) return; const t = A.ac.currentTime + delay, src = A.ac.createBufferSource(); src.buffer = A.buf; const f = A.ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq; const g = A.ac.createGain(); g.gain.setValueAtTime(g0, t); g.gain.exponentialRampToValueAtTime(0.0001, t + len); src.connect(f).connect(g).connect(A.out); src.start(t); src.stop(t + len + 0.05); }
const beep = (f, len) => env(f, 0.08, len, 'square');
const boom = () => { env(60, 0.6, 0.5); burst(0.4, 0.5, 400); env(55, 0.5, 0.5, 'sine', 0.22); burst(0.4, 0.4, 350, 0.22); };
const thunder = () => { burst(1.6, 0.25, 220, 0.3 + Math.random() * 0.6); };
const thump = () => { env(90, 0.5, 0.3); burst(0.25, 0.3, 600); };
const crash = () => { burst(1.8, 0.7, 900); env(50, 0.6, 1.2); };
const clunk = () => { env(220, 0.15, 0.08, 'square'); env(140, 0.15, 0.1, 'square', 0.09); };
const clank = () => { env(160, 0.2, 0.25, 'square'); env(95, 0.25, 0.4, 'sawtooth', 0.12); burst(0.3, 0.2, 1500, 0.1); };

// Input. Q/E and A/D are held, W/S step the throttle, like the Apollo game.
const HOLD = {q: 'rl', Q: 'rl', ArrowLeft: 'rl', e: 'rr', E: 'rr', ArrowRight: 'rr', a: 'gl', A: 'gl', d: 'gr', D: 'gr'};
const live = () => app.s && !app.s.done && !app.paused && !app.replay;
function thr(f) { if (live()) app.s = {...app.s, throttle: f(app.s.throttle)}; }
function legs() { const s = app.s; if (!live()) return; if (app.w.kind === 'tower') return arms(); if (s.legsOut) return; if (Math.hypot(s.vx, s.vy) > LEGS.maxSpeed) { say(`Legs locked until you are below ${LEGS.maxSpeed} m/s.`); beep(300, 0.12); return; } app.s = deployLegs(s); say('Legs deploying.'); }
function arms() { if (!live() || app.w.kind !== 'tower') return; if (app.s.armsCmd) return; if (app.w.assist) { say('Arm assist is on: the tower closes the arms when you are in the window.'); return; } app.s = closeArms(app.s); }
function pause(on = !app.paused) { if (!app.s || app.s.done || app.replay) return; app.paused = on; $('paused').hidden = !on; if (!on) app.last = performance.now(); sound(); }
addEventListener('keydown', e => {
  if (!app.s || $('flight').hidden) return; const k = HOLD[e.key], low = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (app.replay) { if (low === 'v' || e.key === 'Escape' || e.key === ' ') { stopReplay(); e.preventDefault(); } return; }
  if (k && !app.s.done) { app.keys[k] = true; e.preventDefault(); }
  else if (low === 'w' || e.key === 'ArrowUp') { thr(throttleUp); e.preventDefault(); }
  else if (low === 's' || e.key === 'ArrowDown') { thr(throttleDown); e.preventDefault(); }
  else if (e.key === ' ') { thr(() => 1); e.preventDefault(); }
  else if (low === 'x') thr(() => 0);
  else if (low === 'l' || low === 'g') legs();
  else if (low === 'c') arms();
  else if (low === 'p' || e.key === 'Escape') pause();
  else if (low === 'r' && app.s.done) again();
  else if (low === 'v' && app.s.done) startReplay();
  else if (low === 'n' && app.s.done && !$('next').hidden) next();
});
addEventListener('keyup', e => { const k = HOLD[e.key]; if (k) app.keys[k] = false; });
addEventListener('blur', () => { if (!app.replay) app.keys = {}; if (app.s && !app.s.done && !$('flight').hidden) pause(true); });
document.addEventListener('visibilitychange', () => { if (document.hidden && app.s && !app.s.done && !$('flight').hidden) pause(true); });
document.querySelectorAll('[data-hold]').forEach(b => { const k = b.dataset.hold; b.addEventListener('pointerdown', e => { e.preventDefault(); app.keys[k] = true; b.setPointerCapture?.(e.pointerId); sound(); }); ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => b.addEventListener(ev, () => { app.keys[k] = false; })); b.addEventListener('contextmenu', e => e.preventDefault()); });
const tap = (id, f) => $(id).addEventListener('click', f);
tap('th-up', () => thr(throttleUp)); tap('th-down', () => thr(throttleDown)); tap('th-full', () => thr(() => 1)); tap('th-cut', () => thr(() => 0)); tap('legs', legs); tap('pause', () => pause()); tap('resume', () => pause(false));
function next() { const dc = app.double; if (dc && !dc.done) { dc.i++; return start(level(dc.stages[dc.i]), Math.floor(Math.random() * 2 ** 31), true); } const i = LEVELS.findIndex(l => l.id === app.level); start(LEVELS[Math.min(LEVELS.length - 1, i + 1)].id); }
// Double Catch: the two catches added up, with a bonus when you catch both.
const DOUBLE_BONUS = 0.25, doubleTotal = dc => Math.round(dc.scores.reduce((a, b) => a + (b || 0), 0) * (dc.caught.length === 2 && dc.caught.every(Boolean) ? 1 + DOUBLE_BONUS : 1));
const again = () => app.daily ? startDaily() : start(app.level); // a Double Catch starts again from the booster
tap('again', again); tap('daily-play', startDaily); tap('daily-copy', () => { const r = DAILY.get(ukDate()); if (r) copyShare(dailyCard(r)); }); tap('daily-share', () => { const r = DAILY.get(ukDate()); if (r) copyShare(dailyCard(r)); }); tap('next', next); tap('play', () => start(app.level)); tap('replay', startReplay);
tap('share', () => copyShare(app.share));
tap('back', () => { cancelAnimationFrame(app.raf); if (app.audio) app.audio.out.gain.value = 0; app.s = null; app.replay = null; $('flight').hidden = true; $('screen-title').hidden = false; document.body.dataset.screen = 'title'; renderMissions(); setLevel(app.level); renderDaily(); scrollTo(0, 0); });
$('sound').checked = !!store().sound; $('sound').addEventListener('change', e => { const st = store(); st.sound = e.target.checked; write(KEY, st); if (e.target.checked && app.s) sound(); });
// For tests and the curious: read only views of the flight.
window.BoosterGame = {flights: 0, last: null, state: () => app.s && {...app.s}, world: () => app.w, deck: () => app.s && deck(app.w, app.s.t), level: () => app.level, replaying: () => !!app.replay, start: (id, opts = {}) => { if ('assist' in opts) app.assist = !!opts.assist; start(id); }, daily: () => dailyLevel(), startDaily, next: () => next(), double: () => app.double && {...app.double}, dailyRecord: () => DAILY.get(ukDate()), dailyCard: () => { const r = DAILY.get(ukDate()); return r && dailyCard(r); }};
app.assist = !!store().assist; renderMissions(); setLevel(level(store().level || 'calm').id);
renderDaily(); tickDaily(); setInterval(tickDaily, 1000);
const qs = new URLSearchParams(location.search), deep = qs.get('level');
if (qs.has('daily')) startDaily(); else if (deep && LEVELS.some(l => l.id === deep)) { setLevel(deep); start(deep); }
