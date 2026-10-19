// Docking Run: the game loop, cameras, HUD, controls and sound. Physics lives in physics.js.
import * as THREE from './vendor/three.min.js';
import * as P from './physics.js';
import {LEVELS, byId} from './levels.js';
import {buildBackground, buildStation, buildCapsule, puffSprite} from './scene.js';

const $ = id => document.getElementById(id);
const KEY = 'docking:stats';
const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const write = v => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch {} };
const store = () => { const s = read(); s.best = s.best || {}; s.docks = s.docks || {}; return s; };
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const H = 1 / 60;
const app = {sim: null, level: byId(store().level), keys: new Set(), fine: false, assist: !!store().assist, cam: 'port', warp: 1, paused: false, testScale: 1, acc: 0, last: 0, raf: 0,
  orbit: {yaw: 0, pitch: 0.2, dist: 16}, said: {}, trail: [], prevJets: new Float32Array(P.JETS.length), finished: false, chaseOff: null, chaseUp: null, evIdx: 0, hudT: 0, puffs: [], resultShown: false};
window.DockingRun = {sim: () => app.sim, start: id => start(byId(id)), setScale: k => { app.testScale = k; }, onStep: null, P, levels: LEVELS,
  orbit: () => app.orbit, setCam: c => { app.cam = c; syncToggles(); }, clean: on => { app.clean = on; over.style.visibility = on ? 'hidden' : ''; $('keys-overlay').style.visibility = on ? 'hidden' : ''; },
  state: () => ({phase: app.sim?.phase, warp: app.warp, cam: app.cam, fine: app.fine, assist: app.assist, paused: app.paused, finished: app.finished, keys: [...app.keys]})};

// ---------- renderer and scenes ----------
const view = $('view'), over = $('overlay'), ox = over.getContext('2d');
let renderer = null, scene, bg, station, capsule, portCam, chaseCam, sunLight, earthshine, ambient, glReady = false;
function initGL() {
  try { renderer = new THREE.WebGLRenderer({canvas: view, antialias: true, powerPreference: 'high-performance'}); }
  catch (e) { $('nogl').hidden = false; return false; }
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; renderer.autoClear = false;
  scene = new THREE.Scene(); bg = buildBackground(); station = buildStation(); capsule = buildCapsule();
  scene.add(station.group, capsule.group);
  sunLight = new THREE.DirectionalLight(0xfff6ea, 2.8); scene.add(sunLight, sunLight.target);
  earthshine = new THREE.HemisphereLight(0x000000, 0x4a78b8, 0.8); scene.add(earthshine);
  ambient = new THREE.AmbientLight(0x8090a0, 0.05); scene.add(ambient);
  portCam = new THREE.PerspectiveCamera(40, 16 / 9, 0.05, 9000); chaseCam = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 9000);
  for (let i = 0; i < 90; i++) { const s = puffSprite(); s.visible = false; scene.add(s); app.puffs.push({s, life: 0, v: new THREE.Vector3()}); }
  glReady = true; resize(); return true;
}
function resize() {
  if (!renderer) return; const w = view.clientWidth || 960, h = view.clientHeight || 540, dpr = Math.min(1.6, devicePixelRatio || 1);
  renderer.setPixelRatio(dpr); renderer.setSize(w, h, false); over.width = Math.round(w * dpr); over.height = Math.round(h * dpr);
}
addEventListener('resize', resize);
const V3 = a => new THREE.Vector3(a[0], a[1], a[2]), Q = q => new THREE.Quaternion(q[1], q[2], q[3], q[0]);
const CAM_TURN = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2);

// ---------- a run ----------
function start(level) {
  cancelAnimationFrame(app.raf); app.level = level; const st = store(); st.level = level.id; write(st);
  app.sim = P.makeSim(level); app.keys.clear(); app.warp = 1; app.paused = false; app.said = {}; app.trail = []; app.finished = false; app.resultShown = false; app.evIdx = 0; app.chaseOff = null; app.acc = 0;
  app.fine = level.start.ax < 60; syncToggles();
  $('flight').hidden = false; $('screen-title').hidden = true; document.body.dataset.screen = 'game'; scrollTo(0, 0); $('result').hidden = true;
  $('flight-h').textContent = level.name; $('level-note').textContent = level.blurb; say('');
  if (!glReady && !initGL()) return;
  resize(); view.focus({preventScroll: true}); app.last = performance.now(); app.raf = requestAnimationFrame(loop);
}
function readInput() {
  const k = app.keys, a = (p, m) => (k.has(p) ? 1 : 0) - (k.has(m) ? 1 : 0);
  return {t: [a('tx+', 'tx-'), a('ty+', 'ty-'), a('tz+', 'tz-')], r: [a('rx+', 'rx-'), a('ry+', 'ry-'), a('rz+', 'rz-')], fine: app.fine, assist: app.assist};
}
function loop(now) {
  const dt = Math.min(0.1, (now - app.last) / 1000); app.last = now; const sim = app.sim;
  if (!app.paused) {
    const r = P.rel(sim), mw = P.maxWarp(r.range);
    if (app.warp > mw) { app.warp = P.WARPS.filter(w => w <= mw).pop(); say(`Time warp down to ${app.warp}× this close to the station.`); syncToggles(); }
    app.acc += dt * app.warp * app.testScale; let n = 0;
    while (app.acc >= H && n < 6000) { if (window.DockingRun.onStep) window.DockingRun.onStep(sim); P.step(sim, readInput(), H); app.acc -= H; n++; }
    if (n >= 6000) app.acc = 0;
    if (!app.trail.length || sim.t - app.trail[app.trail.length - 1].t > Math.max(1, P.rel(sim).range / 50)) { app.trail.push({t: sim.t, p: sim.cap.p.slice()}); if (app.trail.length > 400) app.trail.shift(); }
    events(); callouts(); sound(dt);
  }
  draw(dt); if (now - app.hudT > 90) { hud(); app.hudT = now; }
  if ((sim.phase === 'docked' || sim.phase === 'crash' || sim.phase === 'lost') && !app.finished) { app.finished = true; setTimeout(finish, sim.phase === 'docked' ? 900 : 1400); }
  app.raf = requestAnimationFrame(loop);
}
function events() {
  const ev = app.sim.events;
  for (; app.evIdx < ev.length; app.evIdx++) {
    const e = ev[app.evIdx];
    if (e.type === 'soft') { say('Contact. Capture latches engaged: soft capture.'); clunk(0.5); }
    if (e.type === 'retract') { say('Ring retracting, pulling you in.'); motor(P.CAPTURE.retract); }
    if (e.type === 'hard') { say('Hooks closed. Hard capture.'); clunk(0.8); setTimeout(() => clunk(0.6), 180); }
    if (e.type === 'bounce') { say(`Contact, no capture: ${e.why}. The ring's springs pushed you back out.`); clunk(0.35); }
    if (e.type === 'crash') { clunk(1); }
  }
}
function callouts() {
  const s = app.sim, r = P.rel(s), c = (k, t) => { if (!app.said[k]) { app.said[k] = 1; say(t); } };
  if (s.phase !== 'fly') return;
  if (s.prop <= 0) c('dry', 'Propellant depleted. You are coasting now.');
  else if (s.prop < s.prop0 * 0.15) c('low', 'Propellant low: 15% left.');
  if (r.range < 10) c('10', 'Ten metres. Fine mode, and keep the closing rate between 0.03 and 0.1 m/s.');
  if (r.range < 3 && r.closing > 0.12) c('fast', `Too fast for capture: ${r.closing.toFixed(2)} m/s. Brake with S.`);
  if (r.range < 30 && !app.said.fine && !app.fine) c('finehint', 'Inside 30 m. Press T for fine mode.');
}
function say(t) { $('feedback').textContent = t; }

// ---------- drawing ----------
const tmpV = new THREE.Vector3();
function poseObjects(dt) {
  const s = app.sim, st = s.station, cap = s.cap;
  station.group.quaternion.copy(Q(st.q));
  capsule.group.position.copy(V3(cap.p)); capsule.group.quaternion.copy(Q(cap.q));
  const ring = s.phase === 'fly' || !s.capture ? P.STATION.ringOut : s.capture.ring; station.ring.position.x = P.STATION.portFace + ring;
  const hk = s.capture?.hooks || 0; station.hooks.forEach(h => { h.children[0].rotation.z = 1.1 * (1 - hk); });
  const sun = P.sunDir(s), lit = P.sunlit(s), sunB = P.qrotT(st.q, sun);
  for (const w of station.wings) w.rotation.z = Math.atan2(-sunB[0], sunB[1]);
  sunLight.position.set(sun[0] * 100, sun[1] * 100, sun[2] * 100); sunLight.intensity = 2.8 * lit;
  const below = THREE.MathUtils.smoothstep(sun[1], -0.25, 0.35); earthshine.intensity = 0.9 * below * (app.level.night ? 0 : 1);
  const dark = 1 - lit; capsule.flood.intensity = 30 * dark + 3; station.portSpot.intensity = 50 * dark + 6; station.portLight.intensity = 5 + 10 * dark;
  const t = performance.now() / 1000;
  for (const L of station.lights) { const b = L.userData.blink; L.material.opacity = b === 1 ? (t % 1.6 < 0.9 ? 1 : 0.15) : b === 2 ? (t % 2.1 < 0.12 ? 1 : 0.05) : 0.9; L.material.opacity *= 0.35 + 0.65 * dark; }
  // plumes and puffs
  const jets = s.jets, fineK = app.fine ? 0.45 : 1, inFlight = s.phase === 'fly';
  capsule.plumes.forEach((m, i) => { const l = inFlight ? jets[i] : 0; m.visible = l > 0.01; if (m.visible) { const f = reduced() ? 1 : 0.75 + Math.random() * 0.5; m.scale.set(fineK, fineK * f * (0.4 + 0.6 * l), fineK); m.material.opacity = 0.5 * Math.min(1, l * 1.5); } });
  if (inFlight && !reduced() && app.warp <= 5) jets.forEach((l, i) => { if (l > 0.2 && (app.prevJets[i] < 0.05 || Math.random() < 0.08)) emitPuff(i, l); });
  for (let i = 0; i < jets.length; i++) app.prevJets[i] = inFlight ? jets[i] : 0;
  for (const p of app.puffs) if (p.life > 0) { p.life -= dt; p.s.position.addScaledVector(p.v, dt); const k = 1 - p.life / 0.6; p.s.scale.setScalar((0.25 + 1.6 * k) * (app.fine ? 0.6 : 1)); p.s.material.opacity = 0.32 * (1 - k); if (p.life <= 0) p.s.visible = false; }
  // background
  bg.ground.rotation.z = s.n * s.t + 1.3; bg.sky.rotation.z = s.n * s.t; bg.uniforms.sunDir.value.set(sun[0], sun[1], sun[2]); bg.uniforms.cloudShift.value = s.t * 2e-6;
  bg.sun.position.set(sun[0] * 30000, sun[1] * 30000, sun[2] * 30000); bg.sun.visible = lit > 0.02; bg.sun.material.opacity = lit;
}
function emitPuff(i, l) {
  const p = app.puffs.find(p => p.life <= 0); if (!p) return; const j = P.JETS[i], ex = new THREE.Vector3(-j.dir[0], -j.dir[1], -j.dir[2]);
  const pos = new THREE.Vector3(...j.pos).add(ex.clone().multiplyScalar(0.25)); capsule.hull.localToWorld(pos);
  const exW = ex.applyQuaternion(capsule.group.quaternion); p.s.position.copy(pos); p.v.copy(exW).multiplyScalar(4 + Math.random() * 3 * l); p.life = 0.6; p.s.visible = true;
}
function placeCameras(dt) {
  const s = app.sim, cap = s.cap, qc = Q(cap.q);
  const camB = P.sub(P.CAPSULE.cam, P.CAPSULE.com); portCam.position.copy(V3(cap.p)).add(V3(camB).applyQuaternion(qc)); portCam.quaternion.copy(qc).multiply(CAM_TURN);
  const o = app.orbit, off = new THREE.Vector3(-Math.cos(o.pitch) * Math.cos(o.yaw), Math.sin(o.pitch), Math.cos(o.pitch) * Math.sin(o.yaw)).multiplyScalar(o.dist).applyQuaternion(qc);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(qc), k = 1 - Math.exp(-dt * 3);
  if (!app.chaseOff) { app.chaseOff = off.clone(); app.chaseUp = up.clone(); } else { app.chaseOff.lerp(off, k); app.chaseUp.lerp(up, k).normalize(); }
  chaseCam.position.copy(V3(cap.p)).add(app.chaseOff); chaseCam.up.copy(app.chaseUp);
  chaseCam.lookAt(V3(cap.p).add(new THREE.Vector3(5, 0, 0).applyQuaternion(qc)));
}
function renderView(cam, x, y, w, h) {
  renderer.setViewport(x, y, w, h); renderer.setScissor(x, y, w, h); renderer.setScissorTest(true);
  cam.aspect = w / h; cam.updateProjectionMatrix();
  bg.camera.quaternion.copy(cam.quaternion); bg.camera.fov = cam.fov; bg.camera.aspect = w / h; bg.camera.updateProjectionMatrix();
  renderer.clear(); renderer.render(bg.scene, bg.camera); renderer.clearDepth(); renderer.render(scene, cam);
}
function draw(dt) {
  if (!glReady) return; poseObjects(dt); placeCameras(dt);
  const W = view.clientWidth, Hh = view.clientHeight, main = app.cam === 'port' ? portCam : chaseCam, inset = app.cam === 'port' ? chaseCam : portCam;
  renderView(main, 0, 0, W, Hh);
  const iw = Math.round(W * 0.27), ih = Math.round(iw * 9 / 16), ix = W - iw - 10, iy = 10;
  if (W > 420 && !app.clean) renderView(inset, ix, Hh - iy - ih, iw, ih);
  overlay({x: 0, y: 0, w: W, h: Hh}, main, app.cam, true); if (W > 420) overlay({x: ix, y: iy, w: iw, h: ih}, inset, app.cam === 'port' ? 'chase' : 'port', false);
}

// ---------- 2D overlay: reticle, target cross, brackets, the Hill plot ----------
const LIME = '#d6ff00', BAD = '#ff8a5c';
function project(cam, p, rect) { tmpV.set(p[0], p[1], p[2]).project(cam); const behind = tmpV.z > 1; return {x: rect.x + (tmpV.x + 1) / 2 * rect.w, y: rect.y + (1 - tmpV.y) / 2 * rect.h, behind, nx: tmpV.x, ny: tmpV.y}; }
function overlay(rect, cam, kind, isMain) {
  const d = over.width / (view.clientWidth || 1), x = ox; if (isMain) { x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, over.width, over.height); }
  x.setTransform(d, 0, 0, d, 0, 0); x.save(); x.beginPath(); x.rect(rect.x, rect.y, rect.w, rect.h); x.clip();
  const s = app.sim, r = P.rel(s), cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2, sz = Math.min(rect.w, rect.h), small = !isMain;
  x.font = `${small ? 10 : 12}px ui-monospace,Menlo,Consolas,monospace`; x.textBaseline = 'middle';
  const tgtW = P.add(P.qrot(s.station.q, [P.STATION.target[0] + P.STATION.standoff, P.STATION.target[1], P.STATION.target[2]]), [0, 0, 0]);
  if (kind === 'port') {
    // fixed reticle on the camera boresight
    x.strokeStyle = 'rgba(214,255,0,.85)'; x.lineWidth = small ? 1 : 1.5; const R = sz * 0.09, g = R * 0.35;
    x.beginPath(); x.arc(cx, cy, R, 0, Math.PI * 2); x.moveTo(cx - R * 2.6, cy); x.lineTo(cx - g, cy); x.moveTo(cx + g, cy); x.lineTo(cx + R * 2.6, cy); x.moveTo(cx, cy - R * 2.6); x.lineTo(cx, cy - g); x.moveTo(cx, cy + g); x.lineTo(cx, cy + R * 2.6); x.stroke();
    for (let i = 1; i <= 4; i++) { const t = R * 0.65 * i; x.beginPath(); x.moveTo(cx + t, cy - 4); x.lineTo(cx + t, cy + 4); x.moveTo(cx - t, cy - 4); x.lineTo(cx - t, cy + 4); x.moveTo(cx - 4, cy + t); x.lineTo(cx + 4, cy + t); x.moveTo(cx - 4, cy - t); x.lineTo(cx + 4, cy - t); x.stroke(); }
    // where the target cross is: a diamond, so it can be found at range and at night
    const tp = project(cam, tgtW, rect);
    if (!tp.behind && Math.abs(tp.nx) < 1 && Math.abs(tp.ny) < 1) { const good = r.lat < P.LIMITS.lat && r.ang < P.LIMITS.ang; x.strokeStyle = good ? LIME : '#fff'; x.lineWidth = 1.5; const k = small ? 6 : 10; x.beginPath(); x.moveTo(tp.x, tp.y - k); x.lineTo(tp.x + k, tp.y); x.lineTo(tp.x, tp.y + k); x.lineTo(tp.x - k, tp.y); x.closePath(); x.moveTo(tp.x - k * 1.8, tp.y); x.lineTo(tp.x - k * 0.5, tp.y); x.moveTo(tp.x + k * 0.5, tp.y); x.lineTo(tp.x + k * 1.8, tp.y); x.stroke(); }
    else edgeArrow(rect, tp, 'TARGET');
    if (!small) {
      x.fillStyle = LIME; x.textAlign = 'left'; const lx = cx + R * 2.8, ly = cy - R * 1.6;
      x.fillText(`R  ${fmtRange(r.range)}`, lx, ly); x.fillStyle = closingOk(r) ? LIME : BAD; x.fillText(`Ṙ  ${(-r.closing).toFixed(3)} m/s`, lx, ly + 16);
      x.fillStyle = LIME; x.fillText(`Y ${sgn(r.y, 2)}  Z ${sgn(-r.z, 2)} m`, lx, ly + 32);
      x.fillText(`P ${sgn(r.pitch, 1)}°  Y ${sgn(-r.yaw, 1)}°  R ${sgn(r.roll, 1)}°`, lx, ly + 48);
    }
  } else {
    const pp = project(cam, r.Ps, rect);
    if (!pp.behind && Math.abs(pp.nx) < 1 && Math.abs(pp.ny) < 1) { x.strokeStyle = LIME; x.lineWidth = 1.2; const k = small ? 7 : 12, c = k * 0.5; for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { x.beginPath(); x.moveTo(pp.x + sx * k, pp.y + sy * (k - c)); x.lineTo(pp.x + sx * k, pp.y + sy * k); x.lineTo(pp.x + sx * (k - c), pp.y + sy * k); x.stroke(); } if (!small) { x.fillStyle = LIME; x.textAlign = 'left'; x.fillText(`PORT ${fmtRange(r.range)}`, pp.x + k + 6, pp.y); } }
    else edgeArrow(rect, pp, 'PORT');
  }
  x.textAlign = 'left'; x.fillStyle = 'rgba(255,255,255,.85)'; x.fillText(kind === 'port' ? 'DOCKING CAMERA' : 'CHASE CAMERA', rect.x + 10, rect.y + (small ? 10 : 16));
  if (isMain) {
    const tags = [app.fine ? 'FINE' : 'COARSE', app.assist ? 'KILL ROT' : null, app.warp > 1 ? `WARP ${app.warp}×` : null, app.testScale > 1 ? `TEST ${app.testScale}×` : null, app.paused ? 'PAUSED' : null, P.sunlit(s) < 0.5 ? 'NIGHT' : null].filter(Boolean);
    x.fillStyle = LIME; x.fillText(tags.join('  ·  '), rect.x + 10, rect.y + 34); x.fillStyle = 'rgba(255,255,255,.7)'; x.fillText(`T+${fmtTime(s.t)}  ·  fuel ${s.prop.toFixed(1)} kg`, rect.x + 10, rect.y + 52);
    if (rect.w >= 480) hill({x: rect.x + 10, y: rect.y + rect.h - 150, w: 210, h: 140});
    if (s.phase !== 'fly') banner(rect);
  } else { x.strokeStyle = 'rgba(255,255,255,.4)'; x.lineWidth = 1; x.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1); }
  x.restore();
}
function edgeArrow(rect, p, label) {
  const x = ox, cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2; let dx = p.nx, dy = -p.ny; if (p.behind) { dx = -dx; dy = -dy; }
  const a = Math.atan2(dy, dx), R = Math.min(rect.w, rect.h) * 0.42, px = cx + Math.cos(a) * R, py = cy + Math.sin(a) * R;
  x.save(); x.translate(px, py); x.rotate(a); x.fillStyle = LIME; x.beginPath(); x.moveTo(10, 0); x.lineTo(-6, -7); x.lineTo(-6, 7); x.fill(); x.restore();
  x.fillStyle = LIME; x.textAlign = 'center'; x.fillText(label, px - Math.cos(a) * 22, py - Math.sin(a) * 18);
}
function banner(rect) {
  const s = app.sim, x = ox, t = {soft: 'SOFT CAPTURE', hard: 'RETRACTING · HOOKS CLOSING', docked: 'HARD CAPTURE', crash: 'COLLISION', lost: 'LOST CONTACT'}[s.phase];
  x.font = '900 28px "Arial Black",Arial,sans-serif'; x.textAlign = 'center'; x.fillStyle = s.phase === 'crash' || s.phase === 'lost' ? BAD : LIME; x.fillText(t, rect.x + rect.w / 2, rect.y + rect.h * 0.22);
  x.font = '12px ui-monospace,Menlo,Consolas,monospace';
}
// The Hill plot: along track across, radial up, station at the centre, with the coast prediction.
function hill(b) {
  const x = ox, s = app.sim, p = s.cap.p, n = s.n;
  x.fillStyle = 'rgba(8,10,8,.72)'; x.fillRect(b.x, b.y, b.w, b.h); x.strokeStyle = 'rgba(214,255,0,.35)'; x.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
  const pred = []; for (let i = 0; i <= 60; i++) pred.push(P.cwCoast(p, s.cap.v, n, i * 45).p);
  let m = Math.max(30, Math.abs(p[0]) * 1.25, Math.abs(p[1]) * 2.5); const nice = [30, 60, 120, 250, 500, 1000, 2000, 3000, 5000]; m = nice.find(v => v >= m) || m;
  const ox0 = b.x + b.w / 2, oy0 = b.y + b.h / 2 + 6, k = (b.w / 2 - 8) / m, X = v => ox0 + v[0] * k, Y = v => oy0 - v[1] * k;
  x.strokeStyle = 'rgba(255,255,255,.18)'; x.beginPath(); x.moveTo(b.x + 4, oy0); x.lineTo(b.x + b.w - 4, oy0); x.moveTo(ox0, b.y + 16); x.lineTo(ox0, b.y + b.h - 4); x.stroke();
  x.setLineDash([3, 3]); x.strokeStyle = 'rgba(214,255,0,.6)'; x.beginPath(); pred.forEach((q, i) => i ? x.lineTo(X(q), Y(q)) : x.moveTo(X(q), Y(q))); x.stroke(); x.setLineDash([]);
  x.strokeStyle = 'rgba(255,255,255,.45)'; x.beginPath(); app.trail.forEach((q, i) => i ? x.lineTo(X(q.p), Y(q.p)) : x.moveTo(X(q.p), Y(q.p))); x.stroke();
  x.fillStyle = '#fff'; x.fillRect(ox0 - 3, oy0 - 2, 6, 4); x.fillStyle = LIME; x.beginPath(); x.arc(X(p), Y(p), 3.5, 0, 7); x.fill();
  x.font = '10px ui-monospace,Menlo,Consolas,monospace'; x.fillStyle = 'rgba(255,255,255,.75)'; x.textAlign = 'left'; x.fillText(`V-bar ±${m >= 1000 ? m / 1000 + ' km' : m + ' m'}  · coast 45 min`, b.x + 6, b.y + 9);
  x.textAlign = 'right'; x.fillText('prograde →', b.x + b.w - 5, oy0 - 7); x.textAlign = 'left'; x.fillText('↑ up', ox0 + 4, b.y + 22); x.font = '12px ui-monospace,Menlo,Consolas,monospace';
}
const sgn = (v, d) => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(d);
const fmtRange = m => m >= 1000 ? `${(m / 1000).toFixed(2)} km` : m >= 100 ? `${m.toFixed(0)} m` : `${m.toFixed(2)} m`;
const fmtTime = t => { t = Math.floor(t); const h = Math.floor(t / 3600), m = Math.floor(t / 60) % 60, s = t % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s).padStart(2, '0'); };
const closingOk = r => r.range > 5 || app.sim?.phase !== 'fly' || (r.closing >= P.LIMITS.vMin - 0.005 && r.closing <= P.LIMITS.vMax);

// ---------- HUD ----------
function hud() {
  const s = app.sim; if (!s) return; const r = P.rel(s), L = P.LIMITS, set = (id, t, warn) => { const e = $(id); e.textContent = t; e.parentElement.classList.toggle('warn', !!warn); };
  set('h-range', fmtRange(r.range)); set('h-closing', `${r.closing >= 0 ? '' : '−'}${Math.abs(r.closing).toFixed(3)} m/s`, !closingOk(r));
  set('h-y', `${sgn(r.y, 2)} m`, r.range < 5 && Math.abs(r.y) > L.lat); set('h-z', `${sgn(-r.z, 2)} m`, r.range < 5 && Math.abs(r.z) > L.lat);
  set('h-dy', `${sgn(r.dy, 3)} / ${sgn(-r.dz, 3)}`, r.range < 5 && r.latRate > L.latRate);
  set('h-pitch', `${sgn(r.pitch, 1)}°`, Math.abs(r.pitch) > L.ang); set('h-yaw', `${sgn(-r.yaw, 1)}°`, Math.abs(r.yaw) > L.ang); set('h-roll', `${sgn(r.roll, 1)}°`, Math.abs(r.roll) > L.roll);
  set('h-rates', `${sgn(r.rates[2], 2)} ${sgn(-r.rates[1], 2)} ${sgn(r.rates[0], 2)}`, r.rate > L.rate);
  const pct = s.prop / s.prop0 * 100; set('h-fuel', `${s.prop.toFixed(1)} kg · ${pct.toFixed(0)}%`, pct < 15); $('fuel-bar').style.width = `${pct}%`;
  set('h-time', `T+${fmtTime(s.t)}`); set('h-warp', `${app.warp}×${P.maxWarp(r.range) > app.warp ? ` (max ${P.maxWarp(r.range)}×)` : ''}`);
  const lim = [['l-close', r.closing >= L.vMin && r.closing <= L.vMax, `${r.closing.toFixed(3)} m/s`], ['l-lat', r.lat < L.lat, `${r.lat.toFixed(2)} m`], ['l-ang', r.ang < L.ang, `${r.ang.toFixed(1)}°`], ['l-roll', Math.abs(r.roll) < L.roll, `${Math.abs(r.roll).toFixed(1)}°`], ['l-rate', r.rate < L.rate, `${r.rate.toFixed(2)}°/s`], ['l-slide', r.latRate < L.latRate, `${r.latRate.toFixed(3)} m/s`]];
  for (const [id, ok, v] of lim) { const e = $(id); e.classList.toggle('ok', ok); e.querySelector('b').textContent = v; }
  document.querySelectorAll('[data-key]').forEach(k => k.classList.toggle('on', app.keys.has(k.dataset.key)));
}
function syncToggles() {
  $('t-fine').textContent = app.fine ? 'Fine RCS (T)' : 'Coarse RCS (T)'; $('t-fine').setAttribute('aria-pressed', String(app.fine));
  $('t-assist').setAttribute('aria-pressed', String(app.assist)); $('t-assist').textContent = app.assist ? 'Kill rotation: on (H)' : 'Kill rotation: off (H)';
  $('t-cam').textContent = app.cam === 'port' ? 'Chase camera (C)' : 'Docking camera (C)'; $('t-warp').textContent = `Warp ${app.warp}×`;
  $('t-pause').textContent = app.paused ? 'Resume (P)' : 'Pause (P)';
}

// ---------- finish ----------
function finish() {
  const s = app.sim, L = app.level, sc = P.score(s), st = store(); app.resultShown = true; sound(0, true);
  const ok = s.phase === 'docked';
  $('result').hidden = false; const c = s.contact;
  if (ok) {
    const prev = st.best[L.id] || 0, nb = sc.total > prev; if (nb) st.best[L.id] = sc.total; st.docks[L.id] = (st.docks[L.id] || 0) + 1; write(st);
    $('result-head').textContent = `Hard capture. ${sc.total} points: ${P.rank(sc.total)}.`;
    $('result-text').textContent = `Contact at ${c.closing.toFixed(3)} m/s, ${(c.lat * 100).toFixed(1)} cm off the centreline, ${c.ang.toFixed(2)}° off axis, ${c.roll.toFixed(2)}° of roll, turning at ${c.rate.toFixed(2)}°/s, after ${fmtTime(c.t)} with ${s.prop.toFixed(1)} kg of propellant left${s.bounces ? ` and ${s.bounces} bounce${s.bounces > 1 ? 's' : ''} off the ring` : ''}.${nb ? ' A new best for this run.' : ` Your best here is ${prev}.`}`;
    const p = sc.parts; $('result-parts').innerHTML = [['Closing rate', p.speed], ['Centreline', p.centre], ['Alignment', p.align], ['Rates', p.rates], ['Fuel', p.fuel], ['Time', p.time]].map(([k, v]) => `<div><b>${v}</b><span>${k}</span></div>`).join(''); $('result-parts').hidden = false;
    app.share = `Docking Run, ${L.name}: hard capture, ${sc.total} points (${P.rank(sc.total)}). ${c.closing.toFixed(3)} m/s, ${(c.lat * 100).toFixed(1)} cm off, ${c.ang.toFixed(2)}°. https://dexmlabs.app/docking-run-game/`;
  } else {
    $('result-head').textContent = s.phase === 'lost' ? 'Lost the station.' : 'Collision.'; $('result-text').textContent = s.fault || ''; $('result-parts').hidden = true;
    app.share = `Docking Run, ${L.name}: ${s.phase === 'lost' ? 'lost the station' : 'collision'}. https://dexmlabs.app/docking-run-game/`;
  }
  const i = LEVELS.indexOf(L); $('next').hidden = !ok || i === LEVELS.length - 1; levelList(); $('again').focus({preventScroll: true});
}

// ---------- sound: off unless switched on ----------
let audio = null;
function ensureAudio() {
  if (audio || !store().sound) return audio; const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
  const ac = new AC(), b = ac.createBuffer(1, ac.sampleRate, ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource(); src.buffer = b; src.loop = true; const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 0.6; const g = ac.createGain(); g.gain.value = 0;
  src.connect(f).connect(g).connect(ac.destination); src.start(); audio = {ac, g, noise: b}; return audio;
}
function sound(dt, off) {
  const a = store().sound ? ensureAudio() : null; if (!a) return; if (a.ac.state === 'suspended') a.ac.resume();
  const s = app.sim; let sum = 0, edges = 0; if (s && s.phase === 'fly' && !off) s.jets.forEach((l, i) => { sum += l; if (l > 0.2 && app.prevJets[i] < 0.05) edges++; });
  a.g.gain.setTargetAtTime(off || app.paused ? 0 : Math.min(0.22, sum * 0.025 * (app.fine ? 0.45 : 1)), a.ac.currentTime, 0.03);
  if (edges && app.warp <= 5) puff(Math.min(1, edges / 4) * (app.fine ? 0.5 : 1));
}
function puff(k) { const a = audio, t = a.ac.currentTime, src = a.ac.createBufferSource(); src.buffer = a.noise; const f = a.ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2400; const g = a.ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35 * k + 0.02, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14); src.connect(f).connect(g).connect(a.ac.destination); src.start(t, Math.random() * 0.5); src.stop(t + 0.16); }
function clunk(k) { const a = store().sound ? ensureAudio() : null; if (!a) return; const t = a.ac.currentTime, o = a.ac.createOscillator(), g = a.ac.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.25); g.gain.setValueAtTime(0.5 * k, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35); o.connect(g).connect(a.ac.destination); o.start(t); o.stop(t + 0.4); }
function motor(len) { const a = store().sound ? ensureAudio() : null; if (!a) return; const t = a.ac.currentTime, o = a.ac.createOscillator(), f = a.ac.createBiquadFilter(), g = a.ac.createGain(); o.type = 'sawtooth'; o.frequency.value = 95; f.type = 'lowpass'; f.frequency.value = 400; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05, t + 0.3); g.gain.setValueAtTime(0.05, t + len - 0.3); g.gain.linearRampToValueAtTime(0.0001, t + len); o.connect(f).connect(g).connect(a.ac.destination); o.start(t); o.stop(t + len); }

// ---------- controls ----------
const HOLD = {KeyW: 'tx+', KeyS: 'tx-', KeyD: 'tz+', KeyA: 'tz-', KeyR: 'ty+', KeyF: 'ty-',
  KeyI: 'rz-', ArrowUp: 'rz-', KeyK: 'rz+', ArrowDown: 'rz+', KeyJ: 'ry+', ArrowLeft: 'ry+', KeyL: 'ry-', ArrowRight: 'ry-', KeyU: 'rx-', KeyQ: 'rx-', KeyO: 'rx+', KeyE: 'rx+'};
const BYKEY = {w: 'KeyW', s: 'KeyS', d: 'KeyD', a: 'KeyA', r: 'KeyR', f: 'KeyF', i: 'KeyI', k: 'KeyK', j: 'KeyJ', l: 'KeyL', u: 'KeyU', o: 'KeyO', q: 'KeyQ', e: 'KeyE', t: 'KeyT', h: 'KeyH', c: 'KeyC', p: 'KeyP', n: 'KeyN', m: 'KeyM'};
const codeOf = e => e.code && e.code !== 'Unidentified' ? e.code : BYKEY[(e.key || '').toLowerCase()] || e.key;
const inFlight = () => app.sim && !$('flight').hidden;
function setWarp(dir) { const r = P.rel(app.sim), mw = P.maxWarp(r.range), i = P.WARPS.indexOf(app.warp), nw = P.WARPS[Math.max(0, Math.min(P.WARPS.length - 1, i + dir))]; if (nw > mw) { say(`Time warp is limited to ${mw}× at ${fmtRange(r.range)}.`); app.warp = mw; } else app.warp = nw; syncToggles(); }
function toggle(what) {
  if (what === 'fine') app.fine = !app.fine;
  if (what === 'assist') { app.assist = !app.assist; const st = store(); st.assist = app.assist; write(st); }
  if (what === 'cam') app.cam = app.cam === 'port' ? 'chase' : 'port';
  if (what === 'pause') app.paused = !app.paused;
  if (what === 'keys') { const k = $('keys-overlay'); k.hidden = !k.hidden; const st = store(); st.keysHidden = k.hidden; write(st); }
  syncToggles();
}
addEventListener('keydown', e => {
  if (!inFlight() || e.ctrlKey || e.metaKey || e.altKey) return; const c = codeOf(e), h = HOLD[c];
  if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
  if (h) { app.keys.add(h); e.preventDefault(); return; }
  if (e.repeat) return;
  const act = {KeyT: () => toggle('fine'), KeyH: () => toggle('assist'), KeyC: () => toggle('cam'), KeyP: () => toggle('pause'), Escape: () => toggle('pause'), BracketRight: () => setWarp(1), Period: () => setWarp(1), BracketLeft: () => setWarp(-1), Comma: () => setWarp(-1), Slash: () => toggle('keys'),
    Enter: () => { if (app.resultShown) start(app.level); }, KeyN: () => { if (app.resultShown && !$('next').hidden) next(); }, KeyM: () => { const st = store(); st.sound = !st.sound; write(st); $('sound').checked = st.sound; say(st.sound ? 'Sound on.' : 'Sound off.'); if (!st.sound && audio) audio.g.gain.value = 0; }}[c];
  if (act) { act(); e.preventDefault(); }
});
addEventListener('keyup', e => { const h = HOLD[codeOf(e)]; if (h) app.keys.delete(h); });
addEventListener('blur', () => app.keys.clear());
document.querySelectorAll('[data-hold]').forEach(b => {
  const k = b.dataset.hold, on = e => { e.preventDefault(); app.keys.add(k); b.classList.add('on'); try { b.setPointerCapture(e.pointerId); } catch {} }, offf = () => { app.keys.delete(k); b.classList.remove('on'); };
  b.addEventListener('pointerdown', on); ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => b.addEventListener(ev, offf)); b.addEventListener('contextmenu', e => e.preventDefault());
});
$('t-fine').addEventListener('click', () => toggle('fine')); $('t-assist').addEventListener('click', () => toggle('assist')); $('t-cam').addEventListener('click', () => toggle('cam')); $('t-pause').addEventListener('click', () => toggle('pause'));
$('t-warp-up').addEventListener('click', () => setWarp(1)); $('t-warp-down').addEventListener('click', () => setWarp(-1)); $('t-keys').addEventListener('click', () => toggle('keys'));
// chase camera: drag to orbit, wheel or pinch to zoom
let drag = null;
view.addEventListener('pointerdown', e => { drag = {x: e.clientX, y: e.clientY, yaw: app.orbit.yaw, pitch: app.orbit.pitch}; view.focus({preventScroll: true}); });
addEventListener('pointermove', e => { if (!drag || app.cam !== 'chase') return; app.orbit.yaw = drag.yaw + (e.clientX - drag.x) * 0.008; app.orbit.pitch = Math.max(-1.3, Math.min(1.3, drag.pitch + (e.clientY - drag.y) * 0.006)); });
addEventListener('pointerup', () => { drag = null; });
view.addEventListener('wheel', e => { if (app.cam !== 'chase') return; e.preventDefault(); app.orbit.dist = Math.max(6, Math.min(120, app.orbit.dist * Math.exp(e.deltaY * 0.001))); }, {passive: false});
$('again').addEventListener('click', () => start(app.level)); $('next').addEventListener('click', next);
function next() { const i = LEVELS.indexOf(app.level); start(LEVELS[Math.min(LEVELS.length - 1, i + 1)]); }
$('share').addEventListener('click', () => navigator.clipboard?.writeText(app.share).then(() => say('Result copied.'), () => { $('share-text').hidden = false; $('share-text').value = app.share; }));
$('back').addEventListener('click', () => { cancelAnimationFrame(app.raf); sound(0, true); app.sim = null; $('flight').hidden = true; $('screen-title').hidden = false; document.body.dataset.screen = 'title'; levelList(); scrollTo(0, 0); });

// ---------- title screen ----------
function levelList() {
  const st = store(), box = $('levels'); box.innerHTML = '';
  for (const L of LEVELS) { const b = document.createElement('button'); b.type = 'button'; b.dataset.level = L.id; b.setAttribute('aria-pressed', String(L.id === app.level.id)); b.innerHTML = `${L.name} <em>${L.short}</em><small>${st.best[L.id] ? `Best ${st.best[L.id]} · ${P.rank(st.best[L.id])}` : 'Not docked yet'}</small>`; b.addEventListener('click', () => { app.level = L; const s = store(); s.level = L.id; write(s); levelList(); }); b.addEventListener('dblclick', () => start(L)); box.appendChild(b); }
  $('play').innerHTML = `Fly: ${app.level.name} <span aria-hidden="true">&rarr;</span>`; $('play-blurb').textContent = app.level.blurb;
  const total = LEVELS.reduce((a, L) => a + (st.best[L.id] || 0), 0), n = LEVELS.filter(L => st.best[L.id]).length;
  $('best').textContent = n ? `Docked ${n} of ${LEVELS.length} runs. Best scores add up to ${total}.` : 'Your best scores are kept in this browser.';
}
$('play').addEventListener('click', () => start(app.level));
$('sound').checked = !!store().sound; $('sound').addEventListener('change', e => { const st = store(); st.sound = e.target.checked; write(st); if (!st.sound && audio) audio.g.gain.value = 0; });
if (store().keysHidden) $('keys-overlay').hidden = true;
levelList(); syncToggles();
