/** A light three.js model of the SZ40/42 wheel rack. Twelve pinwheels side by side, each with its cams shown
 *  (raised cams stick out and glow), a reading pointer at the top of each, and the wheels turning as each
 *  character goes through. Renders only while something is moving. */
import * as THREE from 'three';
import {LAYOUT, WIDTH, angleFor} from './layout.js';

const ACID = new THREE.Color('#d6ff00'), DOWN = new THREE.Color('#3a4235'), READ_UP = new THREE.Color('#ffffff'), READ_DOWN = new THREE.Color('#8a9585');

export function createMachine3D(stage, {reducedMotion = () => false, labels} = {}) {
  const renderer = new THREE.WebGLRenderer({antialias: true, alpha: true, powerPreference: 'low-power'});
  // phones get a lower pixel ratio: the rack still looks sharp and the GPU does far less work
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 760 ? 1.5 : 2));
  renderer.setClearColor(0x000000, 0);
  stage.prepend(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  scene.add(new THREE.HemisphereLight(0xeef5dd, 0x0b0e0c, 1.4));
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(3, 6, 7); scene.add(key);
  const rim = new THREE.DirectionalLight(0xd6ff00, 0.5); rim.position.set(-6, 2, -4); scene.add(rim);

  const rack = new THREE.Group(); scene.add(rack);
  const shared = [];
  const keep = x => (shared.push(x), x);
  const base = new THREE.Mesh(keep(new THREE.BoxGeometry(WIDTH + 1.6, 0.18, 2.2)), keep(new THREE.MeshStandardMaterial({color: 0x1a2017, roughness: .85, metalness: .2})));
  base.position.y = -2.0; rack.add(base);
  const axle = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.05, 0.05, WIDTH + 1.2, 12)), keep(new THREE.MeshStandardMaterial({color: 0x6f7a66, metalness: .8, roughness: .3})));
  axle.rotation.z = Math.PI / 2; rack.add(axle);
  const bodyMat = keep(new THREE.MeshStandardMaterial({color: 0x2b3327, metalness: .55, roughness: .45}));
  const muMat = keep(new THREE.MeshStandardMaterial({color: 0x3a3424, metalness: .55, roughness: .45}));
  const camGeo = keep(new THREE.BoxGeometry(0.09, 0.12, 0.06));
  const camMat = keep(new THREE.MeshLambertMaterial({color: 0xffffff}));
  const pointerGeo = keep(new THREE.ConeGeometry(0.07, 0.16, 4));
  const pointerMat = keep(new THREE.MeshBasicMaterial({color: 0xd6ff00}));

  const wheels = LAYOUT.map(w => {
    const g = new THREE.Group(); g.position.x = w.x; rack.add(g);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(w.r, w.r, 0.1, Math.max(32, w.size)), w.group === 'mu' ? muMat : bodyMat);
    disc.rotation.z = Math.PI / 2; g.add(disc);
    const cams = new THREE.InstancedMesh(camGeo, camMat, w.size); g.add(cams);
    const pointer = new THREE.Mesh(pointerGeo, pointerMat); pointer.rotation.x = Math.PI; pointer.position.set(w.x, w.r + 0.34, 0); rack.add(pointer);
    return {...w, group3: g, disc, cams, bits: new Array(w.size).fill(0), angle: 0, target: 0, pos: 0, dim: false};
  });
  const tmp = new THREE.Object3D(), col = new THREE.Color();
  function paint(wh) {
    for (let i = 0; i < wh.size; i++) {
      const a = i * Math.PI * 2 / wh.size, up = wh.bits[i] === 1, r = wh.r + (up ? 0.07 : -0.02);
      tmp.position.set(0, Math.cos(a) * r, Math.sin(a) * r); tmp.rotation.set(a, 0, 0); tmp.scale.set(1, up ? 1.3 : .7, 1); tmp.updateMatrix();
      wh.cams.setMatrixAt(i, tmp.matrix);
      const reading = i === wh.pos;
      col.copy(up ? (reading ? READ_UP : ACID) : (reading ? READ_DOWN : DOWN));
      if (wh.dim) col.multiplyScalar(.28);
      wh.cams.setColorAt(i, col);
    }
    wh.cams.instanceMatrix.needsUpdate = true; if (wh.cams.instanceColor) wh.cams.instanceColor.needsUpdate = true;
  }

  let width = 1, height = 1, yaw = -0.55, targetYaw = -0.55, idle = false, frame = null, disposed = false, spin = null, onScreen = true;
  const pitch = 0.32;
  function place() {
    const aspect = width / height; camera.aspect = aspect;
    const fit = (WIDTH + 3.2) / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / aspect;
    const dist = Math.max(9, fit * (aspect < 1 ? 1.02 : 1.1));
    camera.position.set(Math.sin(yaw) * dist, Math.sin(pitch) * dist * 0.9 + 0.4, Math.cos(yaw) * dist);
    camera.lookAt(0, -0.25, 0); camera.updateProjectionMatrix();
  }
  function resize() { const r = stage.getBoundingClientRect(); width = Math.max(1, r.width); height = Math.max(1, r.height); renderer.setSize(width, height, false); place(); request(); }
  const ro = new ResizeObserver(resize); ro.observe(stage);
  // stop drawing while the rack is scrolled out of view
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; if (onScreen) request(); }) : null;
  io?.observe(stage);
  const v = new THREE.Vector3();
  function updateLabels() {
    if (!labels) return;
    wheels.forEach((wh, i) => {
      const el = labels[i]; if (!el) return;
      v.set(wh.x, wh.r + 0.55, 0).applyMatrix4(rack.matrixWorld).project(camera);
      el.style.transform = `translate(${((v.x + 1) / 2 * width).toFixed(1)}px,${((1 - v.y) / 2 * height).toFixed(1)}px) translate(-50%,-100%)`;
    });
  }
  function tick(now) {
    frame = null; if (disposed) return;
    let moving = false;
    if (spin) { const t = Math.min(1, (now - spin.start) / spin.ms), k = 1 - (1 - t) ** 3; wheels.forEach(wh => { wh.angle = wh.target - Math.PI * 2 * (1 - k); }); if (t >= 1) spin = null; moving = true; }
    else for (const wh of wheels) { const d = wh.target - wh.angle; if (Math.abs(d) > 1e-4) { wh.angle += d * (reducedMotion() ? 1 : .3); moving = true; } else wh.angle = wh.target; }
    wheels.forEach(wh => { wh.group3.rotation.x = wh.angle; });
    if (Math.abs(targetYaw - yaw) > 1e-4) { yaw += (targetYaw - yaw) * .12; place(); moving = true; }
    if (onScreen) { renderer.render(scene, camera); updateLabels(); }
    if (moving && onScreen && !document.hidden) request();
  }
  function request() { if (frame === null && !disposed) frame = requestAnimationFrame(tick); }
  // Drag to look round the rack a little.
  let drag = null;
  const el = renderer.domElement;
  el.addEventListener('pointerdown', e => { if (e.pointerType === 'touch') return; drag = {x: e.clientX, yaw: targetYaw}; el.setPointerCapture(e.pointerId); });
  el.addEventListener('pointermove', e => { if (!drag) return; targetYaw = Math.max(-1.1, Math.min(1.1, drag.yaw + (e.clientX - drag.x) / 260)); request(); });
  el.addEventListener('pointerup', () => { drag = null; });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) request(); });
  resize();

  return {
    kind: '3d',
    setPatterns(patterns) { wheels.forEach(wh => { if (patterns?.[wh.id]) wh.bits = patterns[wh.id].slice(); paint(wh); }); request(); },
    setPositions(pos, {animate = true} = {}) {
      wheels.forEach(wh => {
        if (pos?.[wh.id] === undefined) return;
        const p = pos[wh.id] - 1, base = angleFor(p, wh.size);
        // carry on turning the same way rather than spinning back round
        let t = base; while (t > wh.target + 1e-6) t -= Math.PI * 2; if (wh.target - t > Math.PI) t += Math.PI * 2;
        if (p !== wh.pos) { wh.pos = p; paint(wh); }
        wh.target = animate && !reducedMotion() ? t : base; if (!animate || reducedMotion()) wh.angle = wh.target;
      });
      request();
    },
    setDim(ids) { const s = new Set(ids || []); wheels.forEach(wh => { const d = s.has(wh.id); if (d !== wh.dim) { wh.dim = d; paint(wh); } }); request(); },
    // the title view is a still three quarter view; it only moves when you drag it or a tape runs
    setIdle(on) { idle = on; targetYaw = on ? -0.55 : -0.35; request(); },
    celebrate() { if (reducedMotion()) return false; spin = {start: performance.now(), ms: 1300}; request(); return true; },
    dispose() {
      disposed = true; ro.disconnect(); io?.disconnect(); if (frame !== null) cancelAnimationFrame(frame);
      wheels.forEach(wh => { wh.disc.geometry.dispose(); wh.cams.dispose(); });
      shared.forEach(x => x.dispose()); renderer.dispose(); el.remove();
    }
  };
}
