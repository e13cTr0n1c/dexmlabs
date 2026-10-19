// Docking Run models and textures, all made in code: an original station and capsule, a procedural Earth,
// stars and the sun. No logos, no photographs.
import * as THREE from './vendor/three.min.js';
import {JETS, STATION, CAPSULE, RE, ALT} from './physics.js';

// ---------- procedural textures ----------
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function rng(seed) { let s = seed >>> 0; return () => ((s = Math.imul(s ^ (s >>> 15), 0x2c1b3c6d) + 0x9e3779b9 >>> 0) / 4294967296); }
function tex(c, rep = [1, 1], srgb = true) { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
export function mliTexture(base = '#e9e7df', seed = 1) {
  const [c, x] = canvas(256, 256), r = rng(seed); x.fillStyle = base; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) { const v = 200 + r() * 55 | 0, a = r() * 0.12; x.fillStyle = `rgba(${v - 30},${v - 30},${v - 40},${a})`; x.beginPath(); x.ellipse(r() * 256, r() * 256, 4 + r() * 22, 2 + r() * 8, r() * 3, 0, 7); x.fill(); }
  x.strokeStyle = 'rgba(80,80,70,.35)'; x.lineWidth = 1.5; for (let i = 0; i <= 256; i += 64) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 256); x.moveTo(0, i); x.lineTo(256, i); x.stroke(); }
  x.fillStyle = 'rgba(60,60,55,.5)'; for (let i = 32; i < 256; i += 64) for (let j = 32; j < 256; j += 64) x.fillRect(i - 1, j - 1, 3, 3);
  return tex(c);
}
export function solarTexture() {
  const [c, x] = canvas(256, 512); x.fillStyle = '#0d1a33'; x.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 8; i++) for (let j = 0; j < 16; j++) { const g = x.createLinearGradient(i * 32, j * 32, i * 32 + 32, j * 32 + 32); g.addColorStop(0, '#1d3768'); g.addColorStop(1, '#0f2147'); x.fillStyle = g; x.fillRect(i * 32 + 2, j * 32 + 2, 28, 28); }
  x.strokeStyle = 'rgba(190,200,220,.5)'; x.lineWidth = 1; for (let j = 0; j <= 512; j += 128) { x.beginPath(); x.moveTo(0, j); x.lineTo(256, j); x.stroke(); }
  return tex(c);
}
function radiatorTexture() { const [c, x] = canvas(64, 256); x.fillStyle = '#f2f2ee'; x.fillRect(0, 0, 64, 256); x.fillStyle = '#c9cbc6'; for (let j = 0; j < 256; j += 16) x.fillRect(0, j, 64, 3); return tex(c); }
function targetTexture() {
  const [c, x] = canvas(256, 256); x.fillStyle = '#0a0a0a'; x.beginPath(); x.arc(128, 128, 126, 0, 7); x.fill();
  x.strokeStyle = '#fff'; x.lineWidth = 10; x.beginPath(); x.arc(128, 128, 92, 0, 7); x.stroke(); x.lineWidth = 4;
  for (let a = 0; a < 4; a++) { const s = Math.sin(a * Math.PI / 2), co = Math.cos(a * Math.PI / 2); x.beginPath(); x.moveTo(128 + co * 104, 128 + s * 104); x.lineTo(128 + co * 124, 128 + s * 124); x.stroke(); }
  x.lineWidth = 2; x.beginPath(); x.arc(128, 128, 46, 0, 7); x.stroke(); return tex(c, [1, 1]);
}
function glowTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') { const [c, x] = canvas(64, 64), g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, inner); g.addColorStop(0.25, inner.replace(/[\d.]+\)$/, '0.6)')); g.addColorStop(1, outer); x.fillStyle = g; x.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
export const GLOW = {};
function glow(color) { return GLOW[color] || (GLOW[color] = glowTexture(color)); }

// Tileable value noise for the Earth: each octave wraps at its own integer period, so the texture repeats seamlessly.
function noiseField(N, seed) { const r = rng(seed), g = new Float32Array(N * N); for (let i = 0; i < g.length; i++) g[i] = r(); return (x, y, p) => { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy), m = v => (((v % p) + p) % p) % N; const a = g[m(xi) + m(yi) * N], b = g[m(xi + 1) + m(yi) * N], c = g[m(xi) + m(yi + 1) * N], d = g[m(xi + 1) + m(yi + 1) * N]; return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy; }; }
function fbm(f, x, y, oct, base) { let s = 0, a = 0.5, w = 0; for (let o = 0; o < oct; o++) { const k = base << o; s += a * f(x * k + o * 17, y * k + o * 31, k); w += a; a *= 0.5; } return s / w; }
export function earthTextures(size = 512) {
  const f = noiseField(64, 7), g = noiseField(64, 99), h = noiseField(64, 4242);
  const [c1, x1] = canvas(size, size), [c2, x2] = canvas(size, size), d1 = x1.createImageData(size, size), d2 = x2.createImageData(size, size);
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    const u = i / size, v = j / size, e = fbm(f, u, v, 6, 4), cl = fbm(g, u + 0.25 * (fbm(h, u, v, 3, 2) - 0.5), v, 6, 4), k = (i + j * size) * 4;
    const land = e > 0.53, coast = Math.max(0, 1 - Math.abs(e - 0.53) * 40);
    let r, gg, b;
    if (land) { const dry = fbm(h, u, v, 4, 8), t = Math.min(1, (e - 0.53) * 6); r = 70 + dry * 90 + t * 40; gg = 78 + dry * 50 - t * 10; b = 40 + dry * 30; if (e > 0.68) { r = gg = b = 200 + (e - 0.68) * 300; } }
    else { const dep = Math.min(1, (0.53 - e) * 5); r = 10 + 20 * (1 - dep); gg = 38 + 45 * (1 - dep) + coast * 30; b = 75 + 50 * (1 - dep) + coast * 20; }
    d1.data[k] = r; d1.data[k + 1] = gg; d1.data[k + 2] = b; d1.data[k + 3] = 255;
    const cloud = Math.max(0, Math.min(1, (cl - 0.52) * 2.6)), city = land && e < 0.66 ? Math.max(0, fbm(h, u * 3, v * 3, 3, 16) - 0.55) * 4 : 0;
    d2.data[k] = cloud * 255; d2.data[k + 1] = land ? 255 : 0; d2.data[k + 2] = Math.min(255, city * 255); d2.data[k + 3] = 255;
  }
  x1.putImageData(d1, 0, 0); x2.putImageData(d2, 0, 0);
  const t1 = tex(c1), t2 = tex(c2, [1, 1], false); return [t1, t2];
}

// ---------- Earth, stars and sun (background scene, in kilometres) ----------
export function buildBackground() {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(45, 16 / 9, 5, 60000);
  const R = RE / 1000, H = ALT / 1000, [day, aux] = earthTextures(768);
  const uniforms = {dayMap: {value: day}, auxMap: {value: aux}, sunDir: {value: new THREE.Vector3(1, 0, 0)}, rep: {value: new THREE.Vector2(10, 5)}, cloudShift: {value: 0}, night: {value: 0}};
  const earthMat = new THREE.ShaderMaterial({uniforms, vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vW;
    void main(){ vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `uniform sampler2D dayMap; uniform sampler2D auxMap; uniform vec3 sunDir; uniform vec2 rep; uniform float cloudShift; uniform float night;
    varying vec2 vUv; varying vec3 vN; varying vec3 vW;
    void main(){ vec2 uv = vUv * rep; vec3 n = normalize(vN); float l = dot(n, sunDir); float lit = smoothstep(-0.12, 0.18, l) * (1.0 - night);
      vec3 col = texture2D(dayMap, uv).rgb; vec4 aux = texture2D(auxMap, uv); float cl = texture2D(auxMap, uv * 0.73 + vec2(cloudShift, 0.0)).r;
      vec3 dayc = mix(col, vec3(0.95), cl * 0.9) * (0.08 + 1.05 * max(l, 0.0));
      vec3 cities = vec3(1.0, 0.72, 0.38) * aux.b * (1.0 - cl * 0.8) * 0.9;
      vec3 v = normalize(cameraPosition - vW); float rim = pow(1.0 - max(dot(n, v), 0.0), 3.0);
      vec3 c = mix(cities, dayc, lit) + vec3(0.25, 0.5, 1.0) * rim * (0.15 + 0.85 * lit) * 0.9;
      gl_FragColor = vec4(c, 1.0); }`});
  const earth = new THREE.Mesh(new THREE.SphereGeometry(R, 160, 120), earthMat);
  const ground = new THREE.Group(); ground.position.set(0, -(R + H), 0); ground.add(earth); scene.add(ground);
  const atmoMat = new THREE.ShaderMaterial({uniforms: {sunDir: uniforms.sunDir, night: uniforms.night}, transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec3 vN; varying vec3 vW; void main(){ vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform vec3 sunDir; uniform float night; varying vec3 vN; varying vec3 vW; void main(){ vec3 v = normalize(vW - cameraPosition); float f = pow(max(0.0, 1.0 - abs(dot(normalize(vN), v)) * 1.25), 2.2); float s = 0.25 + 0.75 * smoothstep(-0.3, 0.3, dot(normalize(vN), sunDir)); gl_FragColor = vec4(vec3(0.3, 0.6, 1.0) * f * s * (1.0 - 0.85 * night) * 1.6, 1.0); }`});
  const atmo = new THREE.Mesh(new THREE.SphereGeometry(R + 70, 120, 80), atmoMat); ground.add(atmo);
  // Stars, fixed in inertial space: they sit in a group that turns with the orbit.
  const sky = new THREE.Group(), r = rng(3), pos = [], col = [];
  for (let i = 0; i < 2600; i++) { const z = r() * 2 - 1, a = r() * Math.PI * 2, s = Math.sqrt(1 - z * z), d = 40000; pos.push(Math.cos(a) * s * d, Math.sin(a) * s * d, z * d); const b = 0.35 + r() ** 3 * 0.65, t = r(); col.push(b * (0.85 + 0.15 * t), b * 0.9, b * (1.05 - 0.15 * t)); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); sg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({size: 1.6, sizeAttenuation: false, vertexColors: true, depthWrite: false}));
  sky.add(stars); scene.add(sky);
  const sun = new THREE.Sprite(new THREE.SpriteMaterial({map: glow('rgba(255,250,235,1)'), blending: THREE.AdditiveBlending, depthWrite: false})); sun.scale.set(3200, 3200, 1); scene.add(sun);
  return {scene, camera, ground, earth, sky, sun, uniforms};
}

// ---------- the station (station body axes, metres) ----------
const M = (c, o = {}) => new THREE.MeshStandardMaterial({color: c, roughness: 0.6, metalness: 0.15, ...o});
function cylX(r, x0, x1, mat, seg = 32) { const g = new THREE.CylinderGeometry(r, r, x1 - x0, seg, 1); g.rotateZ(-Math.PI / 2); const m = new THREE.Mesh(g, mat); m.position.x = (x0 + x1) / 2; return m; }
function box(w, h, d, mat, x, y, z) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); return m; }
export function buildStation() {
  const g = new THREE.Group(), mli = M(0xffffff, {map: mliTexture('#ecebe4', 5), roughness: 0.8}), mli2 = M(0xffffff, {map: mliTexture('#d9d3c2', 9), roughness: 0.85});
  const metal = M(0x9ea3a8, {metalness: 0.6, roughness: 0.4}), dark = M(0x2a2d31, {metalness: 0.4, roughness: 0.5}), solar = M(0xffffff, {map: solarTexture(), metalness: 0.3, roughness: 0.35, emissive: 0x050a14});
  const rad = M(0xffffff, {map: radiatorTexture(), roughness: 0.7}), gold = M(0xc9a54a, {metalness: 0.8, roughness: 0.35});
  g.add(cylX(2.1, -14, 8, mli)); g.add(cylX(2.15, -14.3, -13.7, metal)); g.add(cylX(2.15, 7.7, 8.3, metal));
  g.add(cylX(1.7, -20.5, -14, mli2)); g.add(cylX(1.2, -21.2, -20.5, dark));
  const node = new THREE.Mesh(new THREE.SphereGeometry(2.2, 32, 20), mli); node.position.x = 9.3; node.scale.set(0.8, 1, 1); g.add(node);
  g.add(cylX(2.2, 8.4, 11.0, mli)); g.add(cylX(2.25, 10.85, 11.0, metal));
  g.add(cylX(0.92, 11.0, 12.45, metal)); g.add(cylX(0.98, 12.45, 12.6, dark)); // docking adapter and port flange
  // nadir module and a small sensor
  const nadir = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 7, 28), mli2); nadir.position.set(0, -5.8, 0); g.add(nadir);
  // truss along Z with four turning solar wings, and radiators
  g.add(box(1.4, 1.2, 48, metal, -4, 0, 0));
  const wings = [];
  for (const side of [-1, 1]) for (const k of [0, 1]) {
    const w = new THREE.Group(); w.position.set(-4, 0, side * (10 + k * 7.5));
    for (const dy of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.04, 6.6), solar); p.position.set(0, 0, 0); const holder = new THREE.Group(); holder.add(p); p.position.x = dy * 3.1; w.add(holder); }
    w.add(box(0.15, 0.15, 6.8, metal, 0, 0, 0)); wings.push(w); g.add(w);
  }
  const radMast = box(0.4, 7, 0.4, metal, -10, 5.8, 0); g.add(radMast);
  for (const y of [4.2, 6.4, 8.6]) g.add(box(3.6, 0.06, 2.2, rad, -10, y, 0));
  g.add(box(2.6, 0.04, 14, solar, -18.5, 0, 0));
  g.add(box(0.5, 0.5, 0.5, gold, -2, 2.4, 1.2));
  const dish = new THREE.Mesh(new THREE.SphereGeometry(0.7, 20, 10, 0, Math.PI * 2, 0, 0.9), M(0xdddddd, {side: THREE.DoubleSide})); dish.position.set(2, 2.6, -1.4); dish.rotation.z = 0.5; g.add(dish);
  // Docking target: a plate with a ring on the node face and a cross on a 0.5 m standoff in front of it.
  const T = STATION.target, plate = new THREE.Mesh(new THREE.CircleGeometry(0.28, 40), new THREE.MeshStandardMaterial({map: targetTexture(), roughness: 0.5, emissive: 0xffffff, emissiveIntensity: 0.05}));
  plate.rotation.y = Math.PI / 2; plate.position.set(T[0] + 0.02, T[1], T[2]); g.add(plate);
  const white = new THREE.MeshStandardMaterial({color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.12, roughness: 0.4});
  const post = box(STATION.standoff, 0.03, 0.03, dark, T[0] + STATION.standoff / 2, T[1], T[2]); g.add(post);
  const cross = new THREE.Group(); cross.position.set(T[0] + STATION.standoff, T[1], T[2]); cross.add(box(0.02, 0.2, 0.025, white, 0, 0, 0)); cross.add(box(0.02, 0.025, 0.2, white, 0, 0, 0)); g.add(cross);
  // Soft capture ring with three guide petals; it retracts during capture. Twelve hooks on the port face.
  const ring = new THREE.Group(), steel = M(0xc8ccd0, {metalness: 0.7, roughness: 0.3});
  const tor = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.05, 10, 48), steel); tor.rotation.y = Math.PI / 2; ring.add(tor);
  for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3 + Math.PI / 2, p = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.34, 0.3), steel); p.position.set(0.12, Math.sin(a) * 0.56, Math.cos(a) * 0.56); p.rotation.x = -a; p.rotateZ(0.5); ring.add(p); }
  for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3, rod = box(0.35, 0.03, 0.03, metal, -0.17, Math.sin(a) * 0.55, Math.cos(a) * 0.55); ring.add(rod); }
  ring.position.x = STATION.portFace + STATION.ringOut; g.add(ring);
  const hooks = [];
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6, h = new THREE.Group(); h.position.set(STATION.portFace, Math.sin(a) * 0.86, Math.cos(a) * 0.86); h.rotation.x = -a; const k = box(0.12, 0.05, 0.06, dark, 0.06, 0, 0); h.add(k); hooks.push(h); g.add(h); }
  // Lights: red and green wing tips, white strobes, and two approach lights by the port.
  const lights = [];
  const addLight = (color, x, y, z, size, blink) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({map: glow(color), blending: THREE.AdditiveBlending, depthWrite: false})); s.position.set(x, y, z); s.scale.set(size, size, 1); s.userData.blink = blink; g.add(s); lights.push(s); return s; };
  addLight('rgba(255,60,50,1)', -4, 0, -24.2, 1.3, 1); addLight('rgba(60,255,110,1)', -4, 0, 24.2, 1.3, 1);
  addLight('rgba(255,255,255,1)', -10, 9.6, 0, 1.6, 2); addLight('rgba(255,255,255,1)', -20.8, 0, 0, 1.4, 2);
  addLight('rgba(255,240,210,1)', 11.05, -1.0, 1.0, 0.7, 0); addLight('rgba(255,240,210,1)', 11.05, -1.0, -1.0, 0.7, 0); addLight('rgba(255,240,210,1)', 11.05, 1.9, 0.0, 0.5, 0);
  const portLight = new THREE.PointLight(0xffeedd, 6, 30, 1.6); portLight.position.set(12.0, -0.6, 0); g.add(portLight);
  const portSpot = new THREE.SpotLight(0xfff2e0, 40, 120, 0.35, 0.6, 1.4); portSpot.position.set(11.1, -1.2, 0); portSpot.target.position.set(60, -1.2, 0); g.add(portSpot, portSpot.target);
  return {group: g, ring, hooks, wings, lights, portLight, portSpot};
}

// ---------- the capsule (capsule body axes) ----------
export function buildCapsule() {
  const g = new THREE.Group(), o = CAPSULE.com.map(v => -v); // model in geometric axes, shifted so the group origin is the CoM
  const hull = new THREE.Group(); hull.position.set(o[0], o[1], o[2]); g.add(hull);
  const prof = [[0, -1.78], [1.2, -1.76], [1.85, -1.68], [2.02, -1.55], [2.02, -1.45], [0.92, 1.6], [0.72, 1.78], [0.62, 1.98], [0.6, 2.2]].map(([r, y]) => new THREE.Vector2(r, y));
  const lg = new THREE.LatheGeometry(prof, 64); lg.rotateZ(-Math.PI / 2);
  const body = new THREE.Mesh(lg, M(0xffffff, {map: mliTexture('#f1f0ea', 21), roughness: 0.75})); hull.add(body);
  const shield = new THREE.Mesh(new THREE.CylinderGeometry(2.03, 1.8, 0.26, 64), M(0x3a2c22, {roughness: 0.9})); shield.geometry.rotateZ(-Math.PI / 2); shield.position.x = -1.7; hull.add(shield);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(1.42, 1.62, 0.5, 64, 1, true), M(0x23262b, {metalness: 0.5, roughness: 0.4})); band.geometry.rotateZ(-Math.PI / 2); band.position.x = -0.2; hull.add(band);
  for (const a of [0.6, 2.2, 4.0]) { const w = new THREE.Mesh(new THREE.CircleGeometry(0.16, 20), M(0x0b1018, {metalness: 0.9, roughness: 0.1})); const r = 1.18, x = 0.75; w.position.set(x, Math.sin(a) * r, Math.cos(a) * r); w.lookAt(new THREE.Vector3(x + 0.35, Math.sin(a) * 3, Math.cos(a) * 3)); hull.add(w); }
  const steel = M(0xc8ccd0, {metalness: 0.7, roughness: 0.3}), dark = M(0x2a2d31, {metalness: 0.4, roughness: 0.5});
  const pr = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.05, 10, 48), steel); pr.rotation.y = Math.PI / 2; pr.position.x = CAPSULE.port[0] - 0.03; hull.add(pr);
  const hatch = new THREE.Mesh(new THREE.CircleGeometry(0.55, 32), dark); hatch.rotation.y = Math.PI / 2; hatch.position.x = 2.2; hull.add(hatch);
  for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3 + Math.PI / 6, p = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.3, 0.26), steel); p.position.set(2.3, Math.sin(a) * 0.5, Math.cos(a) * 0.5); p.rotation.x = -a; p.rotateZ(-0.5); hull.add(p); }
  // camera boom
  const cam = CAPSULE.cam; hull.add(box(0.06, cam[1] - 0.85, 0.06, dark, cam[0] - 0.05, (cam[1] + 0.85) / 2, cam[2])); hull.add(box(0.18, 0.12, 0.12, dark, cam[0] - 0.05, cam[1], cam[2]));
  const ant = box(0.03, 0.9, 0.03, steel, -0.6, -1.95, 0.6); ant.rotation.x = 0.3; hull.add(ant);
  // RCS pods and plumes at the real jet positions
  const podMat = M(0xb8bcc0, {metalness: 0.5, roughness: 0.45}), plumes = [], seen = {};
  const plumeGeo = new THREE.ConeGeometry(0.2, 1.3, 14, 1, true); plumeGeo.translate(0, -0.65, 0);
  const [pc, px] = canvas(4, 64), pg = px.createLinearGradient(0, 0, 0, 64); pg.addColorStop(0, '#fff'); pg.addColorStop(0.35, '#888'); pg.addColorStop(1, '#000'); px.fillStyle = pg; px.fillRect(0, 0, 4, 64); const plumeAlpha = new THREE.CanvasTexture(pc);
  for (const j of JETS) {
    const key = j.ring + j.pod; if (!seen[key]) { seen[key] = 1; const p = box(0.32, 0.26, 0.32, podMat, j.pos[0], j.pos[1], j.pos[2]); hull.add(p); }
    const mat = new THREE.MeshBasicMaterial({color: 0xcfe2ff, alphaMap: plumeAlpha, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide});
    const m = new THREE.Mesh(plumeGeo, mat), ex = new THREE.Vector3(-j.dir[0], -j.dir[1], -j.dir[2]);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), ex); m.position.set(j.pos[0] + ex.x * 0.17, j.pos[1] + ex.y * 0.17, j.pos[2] + ex.z * 0.17); m.visible = false; hull.add(m); plumes.push(m);
  }
  const flood = new THREE.SpotLight(0xe8f0ff, 0, 90, 0.42, 0.5, 1.3); flood.position.set(2.0, -0.7, 0); flood.target.position.set(30, -0.7, 0); hull.add(flood, flood.target);
  return {group: g, hull, plumes, flood};
}
export function puffSprite() { return new THREE.Sprite(new THREE.SpriteMaterial({map: glow('rgba(220,230,255,1)'), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false})); }
