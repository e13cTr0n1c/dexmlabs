// What's flying over me? Live aircraft from a public ADS-B feed and satellites from CelesTrak,
// drawn on a radar and a sky dome. Everything runs in the browser. The location never leaves it,
// apart from a rounded copy sent to the data services, and it is never saved or shown.
import * as sat from './vendor/satellite.es.js';

// Set this to the page for my Pi radar software pack and its card appears next to the Radar Scope link.
export const RADAR_PACK_URL = '';

// adsb.lol and airplanes.live send no CORS headers, so the page asks my relay Worker instead
// (GET {PROXY_API}/point/{lat}/{lon}/{radius}, see callsign-worker). Until it is live this stays empty and
// the radar shows demo planes with a note. When you set it, add its host to connect-src in index.html.
export const PROXY_API = '';
const PROXY = (window.__FOM_PROXY_TEST || PROXY_API).replace(/\/$/, '');
const FEED = {name: 'airplanes.live and adsb.lol', site: 'https://airplanes.live/', url: (la, lo, nm) => `${PROXY}/point/${la}/${lo}/${nm}`};
const CELESTRAK = g => `https://celestrak.org/NORAD/elements/gp.php?GROUP=${g}&FORMAT=tle`;
const TLE_GROUPS = ['stations', 'visual'];
const TLE_TTL = 6 * 3600e3;           // CelesTrak asks for no more than one download every two hours per group
const POLL_MS = 12000;                // aircraft refresh, politely spaced
const DEMO = {lat: 51.47, lon: -0.45, label: 'the Heathrow area'};
const NM_PER_MI = 0.868976, M_PER_FT = 0.3048;
const DEG = Math.PI / 180;

const $ = s => document.querySelector(s);
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const params = new URLSearchParams(location.search);
const FORCE_DEMO = params.has('demo');

const S = {
  obs: null, place: '', rangeMi: 25, view: 'radar', planes: new Map(), feed: null, feedState: 'idle',
  demoTraffic: false, sats: [], satNow: [], iss: null, pass: null, selected: null, timer: 0, fails: 0, lastFetch: 0, started: false,
};
window.__fom = S;

// ---------- small helpers ----------
const round2 = x => Math.round(x * 100) / 100;     // about a kilometre: all anyone downstream ever gets
function haversineNm(a, b) {
  const dLa = (b.lat - a.lat) * DEG, dLo = (b.lon - a.lon) * DEG;
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * DEG) * Math.cos(b.lat * DEG) * Math.sin(dLo / 2) ** 2;
  return 2 * 3440.065 * Math.asin(Math.min(1, Math.sqrt(h)));
}
function bearing(a, b) {
  const y = Math.sin((b.lon - a.lon) * DEG) * Math.cos(b.lat * DEG);
  const x = Math.cos(a.lat * DEG) * Math.sin(b.lat * DEG) - Math.sin(a.lat * DEG) * Math.cos(b.lat * DEG) * Math.cos((b.lon - a.lon) * DEG);
  return (Math.atan2(y, x) / DEG + 360) % 360;
}
function move(p, brg, nm) {
  const d = nm / 3440.065, t = brg * DEG, la = p.lat * DEG, lo = p.lon * DEG;
  const la2 = Math.asin(Math.sin(la) * Math.cos(d) + Math.cos(la) * Math.sin(d) * Math.cos(t));
  const lo2 = lo + Math.atan2(Math.sin(t) * Math.sin(d) * Math.cos(la), Math.cos(d) - Math.sin(la) * Math.sin(la2));
  return {lat: la2 / DEG, lon: ((lo2 / DEG + 540) % 360) - 180};
}
const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
const compass = d => COMPASS[Math.round(((d % 360) + 360) % 360 / 45) % 8];
const fmtAlt = a => a === 'ground' ? 'on the ground' : a == null ? 'unknown' : a >= 6000 ? 'FL' + String(Math.round(a / 100)).padStart(3, '0') : Math.round(a).toLocaleString('en-GB') + ' ft';
const fmtAltLong = a => a === 'ground' ? 'On the ground' : a == null ? 'Not sent' : Math.round(a).toLocaleString('en-GB') + ' ft';
const fmtMi = nm => { const mi = nm / NM_PER_MI; return (mi < 10 ? mi.toFixed(1) : Math.round(mi)) + ' mi'; };
const fmtTime = d => d.toLocaleTimeString('en-GB', {hour: '2-digit', minute: '2-digit'});
const fmtDay = d => { const t = new Date(); const tm = new Date(t); tm.setDate(t.getDate() + 1);
  return d.toDateString() === t.toDateString() ? 'Today' : d.toDateString() === tm.toDateString() ? 'Tomorrow' : d.toLocaleDateString('en-GB', {weekday: 'short', day: 'numeric', month: 'short'}); };
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
function setStatus(kind, html) { const el = $('#fom-status'); el.dataset.kind = kind; el.innerHTML = html; }

// ---------- location ----------
function useLocation(lat, lon, label) {
  S.obs = {lat: round2(lat), lon: round2(lon)}; S.place = label;
  $('#fom-place').textContent = label;
  document.body.classList.add('fom-on'); document.body.classList.remove('fom-change');
  $('#fom-app').hidden = false; $('#fom-start').classList.add('fom-start--small');
  S.planes.clear(); S.selected = null; closeCard();
  start();
}
function askBrowser() {
  if (!('geolocation' in navigator)) { setStatus('warn', 'Your browser does not share a location. Type a town or postcode instead.'); $('#fom-q').focus(); return; }
  setStatus('busy', 'Asking your browser where you are…');
  navigator.geolocation.getCurrentPosition(
    p => { setStatus('ok', ''); useLocation(p.coords.latitude, p.coords.longitude, 'your location'); },
    () => { setStatus('warn', 'No location came back. That is fine: type a town or postcode, or try the Heathrow demo.'); $('#fom-q').focus(); },
    {enableHighAccuracy: false, maximumAge: 600000, timeout: 15000});
}
let lastGeocode = 0;
async function geocode(q) {
  // Nominatim asks for at most one request a second and no autocomplete, so this only runs on submit.
  const wait = 1100 - (Date.now() - lastGeocode); if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastGeocode = Date.now();
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`, {headers: {'Accept-Language': 'en-GB'}});
    if (r.ok) { const j = await r.json(); if (j[0]) return {lat: +j[0].lat, lon: +j[0].lon, label: j[0].name || q}; }
  } catch (e) { /* try the next one */ }
  const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?count=1&language=en&name=${encodeURIComponent(q)}`);
  if (r.ok) { const j = await r.json(); if (j.results && j.results[0]) return {lat: j.results[0].latitude, lon: j.results[0].longitude, label: j.results[0].name}; }
  return null;
}

// ---------- aircraft ----------
function start() {
  clearTimeout(S.timer); S.started = true; S.fails = 0;
  if (FORCE_DEMO) startDemoTraffic('Demo traffic, as you asked for with the demo link.');
  else if (!PROXY) startDemoTraffic('Live planes coming soon. Until my relay is switched on, these are demo planes; the satellites are live.');
  else poll();
  loadSats();
}
async function poll() {
  clearTimeout(S.timer);
  if (!S.obs || S.demoTraffic) return;
  if (document.hidden) { S.timer = setTimeout(poll, 2000); return; }
  const nm = Math.min(100, Math.ceil(S.rangeMi * NM_PER_MI * 1.15));
  for (const f of [FEED]) {
    try {
      const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 9000);
      const r = await fetch(f.url(S.obs.lat.toFixed(2), S.obs.lon.toFixed(2), nm), {signal: ctl.signal, cache: 'no-store'});
      clearTimeout(to);
      if (r.status === 429) throw new Error('busy');
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      if (!Array.isArray(j.ac)) throw new Error('shape');
      S.feed = f; S.fails = 0; ingest(j.ac, Date.now());
      showFeed();
      S.timer = setTimeout(poll, POLL_MS);
      return;
    } catch (e) { /* next feed */ }
  }
  S.fails++;
  if (S.fails >= 1 || !S.planes.size) startDemoTraffic('The live aircraft feeds are not answering just now, so these are demo planes. I will keep trying the real ones.');
  else S.timer = setTimeout(poll, POLL_MS * 2);
}
function ingest(list, now) {
  const seen = new Set();
  for (const a of list) {
    if (typeof a.lat !== 'number' || typeof a.lon !== 'number') continue;
    const id = a.hex || a.flight; seen.add(id);
    const t = now - (a.seen_pos || 0) * 1000;
    const prev = S.planes.get(id);
    const p = {id, hex: a.hex, cs: (a.flight || '').trim() || (a.r || a.hex || '').toUpperCase(), reg: a.r || '', type: a.t || '', desc: a.desc || '',
      lat: a.lat, lon: a.lon, t, alt: a.alt_baro ?? a.alt_geom, gs: a.gs ?? 0, trk: a.track ?? a.true_heading ?? a.mag_heading ?? 0,
      vs: a.baro_rate ?? a.geom_rate ?? 0, squawk: a.squawk || '', cat: a.category || '', demo: !!a.demo, born: prev ? prev.born : now, off: {x: 0, y: 0}};
    if (prev && !reduce.matches) { // ease from where it was drawn to where the new data puts it
      const was = predict(prev, now), will = predict(p, now);
      p.off = {lat: was.lat - will.lat, lon: was.lon - will.lon};
    } else p.off = {lat: 0, lon: 0};
    p.offT = now;
    S.planes.set(id, p);
  }
  for (const id of [...S.planes.keys()]) if (!seen.has(id)) S.planes.delete(id);
  if (S.selected && !S.planes.has(S.selected)) closeCard();
  S.lastFetch = now;
  renderList(); updateCard();
}
function predict(p, now) {
  if (p.alt === 'ground' || !p.gs) return {lat: p.lat, lon: p.lon};
  const dt = Math.min(90, Math.max(0, (now - p.t) / 1000));
  return move(p, p.trk, p.gs * dt / 3600);
}
function planePos(p, now) {
  const q = predict(p, now), k = Math.exp(-(now - p.offT) / 700);
  return {lat: q.lat + p.off.lat * k, lon: q.lon + p.off.lon * k};
}
function showFeed() {
  const f = S.feed; S.demoTraffic = false;
  $('#fom-feed').innerHTML = `Live aircraft from <a href="https://airplanes.live/" rel="noopener">airplanes.live</a> and <a href="https://adsb.lol/" rel="noopener">adsb.lol</a>, refreshed every ${POLL_MS / 1000} s`;
  setStatus('ok', '');
  document.body.dataset.mode = 'live';
}
// demo traffic: made up planes on believable routes, clearly marked
const DEMO_FLEET = [['DMX101', 'A320', 3400, 160, 270], ['DMX207', 'B77W', 11800, 280, 95], ['DMX33', 'A35K', 36000, 470, 120], ['DMX480', 'E190', 6200, 250, 300],
  ['DMX512', 'B738', 24000, 410, 20], ['DMX66', 'A21N', 2100, 145, 268], ['DMX712', 'B789', 38000, 490, 300], ['DMX9', 'C172', 2300, 95, 40],
  ['DMX150', 'A319', 15000, 330, 200], ['DMX88', 'B744', 31000, 480, 60], ['DMX61', 'AT76', 9000, 240, 155], ['DMX303', 'A333', 40000, 500, 250],
  ['DMX19', 'EC35', 1500, 120, 330], ['DMX245', 'A20N', 7800, 260, 85]];
function startDemoTraffic(msg) {
  clearTimeout(S.timer); S.demoTraffic = true; document.body.dataset.mode = 'demo';
  const now = Date.now(), list = DEMO_FLEET.map(([cs, t, alt, gs, trk], i) => {
    const p = move(S.obs, (i * 137.5) % 360, S.rangeMi * NM_PER_MI * (0.15 + 0.8 * ((i * 0.618) % 1)));
    return {hex: 'demo' + i, flight: cs, t, alt_baro: alt, gs, track: trk, lat: p.lat, lon: p.lon, baro_rate: i % 3 ? 0 : (alt < 10000 ? -700 : 900), demo: true};
  });
  S.planes.clear(); ingest(list, now);
  $('#fom-feed').textContent = 'Demo traffic: made up planes, not real flights';
  setStatus('warn', esc(msg) + (FORCE_DEMO || !PROXY ? '' : ' <button type="button" class="fom-link" id="fom-retry">Try the live feed now</button>'));
  const rb = $('#fom-retry'); if (rb) rb.onclick = () => { S.demoTraffic = false; S.fails = 0; setStatus('busy', 'Trying the live feed…'); poll(); };
  if (!FORCE_DEMO && PROXY) S.timer = setTimeout(() => { if (S.demoTraffic) { S.demoTraffic = false; poll(); } }, 60000);
}

// ---------- satellites ----------
async function getGroup(g) {
  const key = 'fom:tle:' + g; let cached = null;
  try { cached = JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { /* storage may be off */ }
  if (cached && Date.now() - cached.t < TLE_TTL) return cached.text;
  try {
    const r = await fetch(CELESTRAK(g)); if (!r.ok) throw new Error(r.status);
    const text = await r.text(); if (!/^1 /m.test(text)) throw new Error('not TLE');
    try { localStorage.setItem(key, JSON.stringify({t: Date.now(), text})); } catch (e) { /* fine */ }
    return text;
  } catch (e) { return cached ? cached.text : null; }
}
async function loadSats() {
  if (S.sats.length) return;
  let texts = await Promise.all(TLE_GROUPS.map(getGroup)), src = 'live';
  if (texts.some(t => !t)) {
    try { const r = await fetch('data/tle-fallback.txt'); texts = [await r.text()]; src = 'saved'; } catch (e) { texts = []; }
  }
  const byId = new Map();
  for (const text of texts) {
    const L = text.split(/\r?\n/).map(s => s.trimEnd()).filter(Boolean);
    for (let i = 0; i + 2 < L.length + 0; i++) {
      if (L[i + 1] && L[i + 1].startsWith('1 ') && L[i + 2] && L[i + 2].startsWith('2 ')) {
        const id = L[i + 1].slice(2, 7);
        if (!byId.has(id)) { try { const rec = sat.twoline2satrec(L[i + 1], L[i + 2]); if (!rec.error) byId.set(id, {id, name: L[i].trim(), rec}); } catch (e) { /* skip */ } }
        i += 2;
      }
    }
  }
  S.sats = [...byId.values()]; S.iss = S.sats.find(s => s.id === '25544') || null;
  $('#fom-satsrc').innerHTML = src === 'live' ? 'Satellites from <a href="https://celestrak.org/" rel="noopener">CelesTrak</a>, worked out in your browser'
    : 'Satellites from a saved copy of <a href="https://celestrak.org/" rel="noopener">CelesTrak</a> data, as the live copy did not load';
  tickSats(); setTimeout(findPass, 50);
}
function look(rec, date, gd) {
  const pv = sat.propagate(rec, date); if (!pv || !pv.position || typeof pv.position.x !== 'number') return null;
  const gmst = sat.gstime(date), ecf = sat.eciToEcf(pv.position, gmst), la = sat.ecfToLookAngles(gd, ecf);
  return {az: la.azimuth / DEG, el: la.elevation / DEG, range: la.rangeSat, eci: pv.position, geo: sat.eciToGeodetic(pv.position, gmst)};
}
const obsGd = () => ({latitude: S.obs.lat * DEG, longitude: S.obs.lon * DEG, height: 0.03});
function tickSats() {
  if (!S.obs || !S.sats.length) return;
  const now = new Date(), gd = obsGd(), out = [];
  for (const s of S.sats) {
    const l = look(s.rec, now, gd); if (!l) continue;
    if (s === S.iss) S.issNow = l;
    if (l.el > 0) {
      if (!s.trail || now - s.trailT > 20000) { s.trail = []; for (let k = -240; k <= 240; k += 20) { const q = look(s.rec, new Date(+now + k * 1000), gd); if (q) s.trail.push(q); } s.trailT = +now; }
      out.push({s, ...l});
    }
  }
  S.satNow = out.sort((a, b) => b.el - a.el);
  renderIss(); renderSatList();
}
function sunEci(date) { // low precision solar position, good to a fraction of a degree
  const jd = date / 86400000 + 2440587.5, n = jd - 2451545.0;
  const L = (280.46 + 0.9856474 * n) * DEG, g = (357.528 + 0.9856003 * n) * DEG;
  const lam = L + (1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * DEG, eps = (23.439 - 4e-7 * n) * DEG, au = 149597870.7;
  return {x: au * Math.cos(lam), y: au * Math.cos(eps) * Math.sin(lam), z: au * Math.sin(eps) * Math.sin(lam)};
}
function sunEl(date, gd) { const s = sunEci(date), ecf = sat.eciToEcf(s, sat.gstime(date)); return sat.ecfToLookAngles(gd, ecf).elevation / DEG; }
function sunlit(r, date) {
  const s = sunEci(date), m = Math.hypot(s.x, s.y, s.z), u = {x: s.x / m, y: s.y / m, z: s.z / m};
  const d = r.x * u.x + r.y * u.y + r.z * u.z; if (d > 0) return true;
  return Math.hypot(r.x - d * u.x, r.y - d * u.y, r.z - d * u.z) > 6371;
}
function findPass() {
  if (!S.iss || !S.obs) return;
  const gd = obsGd(), t0 = Date.now(), passes = []; let cur = null;
  for (let k = -900; k < 48 * 3600; k += 20) {
    const d = new Date(t0 + k * 1000), l = look(S.iss.rec, d, gd); if (!l) continue;
    if (l.el > 0) { if (!cur) cur = {start: d, max: l, maxT: d, pts: []}; cur.pts.push({...l, t: d}); if (l.el > cur.max.el) { cur.max = l; cur.maxT = d; } cur.end = d; }
    else if (cur) { if (cur.end > t0 && cur.max.el >= 10) passes.push(cur); cur = null; if (passes.length >= 12) break; }
  }
  for (const p of passes) {
    p.visible = p.pts.some(q => q.el >= 10 && sunEl(q.t, gd) < -6 && sunlit(q.eci, q.t));
  }
  S.pass = passes[0] || null; S.visPass = passes.find(p => p.visible) || null;
  renderIss();
}
function renderIss() {
  const el = $('#fom-iss'); if (!el || !S.iss) return;
  const l = S.issNow; let now = '';
  if (l) {
    const geoLa = l.geo.latitude / DEG, geoLo = l.geo.longitude / DEG, dist = haversineNm(S.obs, {lat: geoLa, lon: geoLo}) / NM_PER_MI;
    now = l.el > 0 ? `<b class="fom-up">Above you now</b>, ${Math.round(l.el)}° up in the ${compass(l.az)}, ${Math.round(l.range).toLocaleString('en-GB')} km away.`
      : `Below your horizon right now, about ${Math.round(dist).toLocaleString('en-GB')} miles away over the ground, ${Math.round(l.geo.height)} km up and moving at about 17,500 mph.`;
  }
  const pp = p => `${fmtDay(p.start)} ${fmtTime(p.start)} to ${fmtTime(p.end)}, rising in the ${compass(p.pts[0].az)}, highest ${Math.round(p.max.el)}° in the ${compass(p.max.az)}`;
  let next = '';
  if (S.visPass) next += `<p><span class="fom-k">Next pass you can see</span>${pp(S.visPass)}. Look for a bright steady star sliding across the sky.</p>`;
  if (S.pass && S.pass !== S.visPass) next += `<p><span class="fom-k">Next pass overhead</span>${pp(S.pass)}${S.pass.visible ? '' : ', but the sky will be too light or the station in shadow'}.</p>`;
  if (!S.pass && S.iss) next = '<p>Working out the next passes…</p>';
  el.innerHTML = `<p>${now}</p>${next}`;
}

// ---------- drawing ----------
const cv = $('#fom-radar'), ctx = cv.getContext('2d');
let W = 0, H = 0, R = 0, CX = 0, CY = 0, dpr = 1, hits = [];
function size() {
  dpr = Math.min(2, window.devicePixelRatio || 1);
  const r = cv.getBoundingClientRect(); W = r.width; H = r.height;
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  CX = W / 2; CY = H / 2; R = Math.min(W, H) / 2 - (W < 420 ? 18 : 26);
}
const css = n => getComputedStyle(document.body).getPropertyValue(n).trim();
function frame(ts) {
  if (!document.hidden && S.obs && S.view !== 'list') draw(Date.now());
  if (!reduce.matches) requestAnimationFrame(frame);
}
function draw(now) {
  if (Math.abs(cv.getBoundingClientRect().width - W) > 0.5 || !W) size();
  if (R <= 10) return;
  const G = css('--scope') || '#d6ff00', BG = css('--scope-bg') || '#050805', DIM = css('--scope-dim') || 'rgba(214,255,0,.22)';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(CX, CY, R * 0.1, CX, CY, R * 1.05);
  glow.addColorStop(0, css('--scope-bg2') || '#0b140a'); glow.addColorStop(1, BG);
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(CX, CY, R + 6, 0, 7); ctx.fill();
  ctx.strokeStyle = DIM; ctx.lineWidth = 1; ctx.fillStyle = DIM;
  ctx.font = `${W < 420 ? 10 : 11}px ui-monospace,Menlo,Consolas,monospace`;
  for (let i = 1; i <= 4; i++) { ctx.beginPath(); ctx.arc(CX, CY, R * i / 4, 0, 7); ctx.stroke(); }
  for (let a = 0; a < 360; a += 30) { const t = a * DEG; ctx.beginPath(); ctx.moveTo(CX + Math.sin(t) * R * 0.04, CY - Math.cos(t) * R * 0.04); ctx.lineTo(CX + Math.sin(t) * R, CY - Math.cos(t) * R); ctx.globalAlpha = a % 90 ? 0.45 : 1; ctx.stroke(); ctx.globalAlpha = 1; }
  for (let a = 0; a < 360; a += 5) { const t = a * DEG, l = a % 10 ? 4 : 8; ctx.beginPath(); ctx.moveTo(CX + Math.sin(t) * R, CY - Math.cos(t) * R); ctx.lineTo(CX + Math.sin(t) * (R + l), CY - Math.cos(t) * (R + l)); ctx.stroke(); }
  ctx.fillStyle = G; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  [['N', 0], ['E', 90], ['S', 180], ['W', 270]].forEach(([s, a]) => { const t = a * DEG; ctx.fillText(s, CX + Math.sin(t) * (R + 14), CY - Math.cos(t) * (R + 14)); });
  ctx.textAlign = 'left'; ctx.fillStyle = DIM;
  if (S.view === 'radar') for (let i = 1; i <= 4; i++) ctx.fillText(`${Math.round(S.rangeMi * i / 4)} mi`, CX + 4, CY - R * i / 4 + 9);
  else [30, 60].forEach(e => ctx.fillText(e + '°', CX + 4, CY - R * (90 - e) / 90 + 9));
  // sweep
  const sweep = reduce.matches || S.view === 'sky' ? null : ((now / 4200) % 1) * Math.PI * 2;
  if (sweep != null) {
    if (ctx.createConicGradient) {
      const g = ctx.createConicGradient(sweep - Math.PI / 2 - 1.1, CX, CY);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1.1 / (Math.PI * 2), css('--scope-sweep') || 'rgba(214,255,0,.30)'); g.addColorStop(1.1 / (Math.PI * 2) + 0.0001, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(CX, CY); ctx.arc(CX, CY, R, 0, 7); ctx.fill();
    }
    ctx.strokeStyle = G; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.moveTo(CX, CY); ctx.lineTo(CX + Math.sin(sweep) * R, CY - Math.cos(sweep) * R); ctx.stroke(); ctx.globalAlpha = 1;
  }
  const lit = brg => { if (sweep == null) return 1; const d = ((sweep / DEG - brg) % 360 + 360) % 360; return 0.38 + 0.62 * Math.exp(-d / 70); };
  hits = []; S.hits = hits; const boxes = [];
  const label = (x, y, lines, a, col) => {
    const lh = W < 420 ? 11 : 12.5, w = Math.max(...lines.map(s => ctx.measureText(s).width)) + 4, h = lines.length * lh;
    let lx = x + 10, ly = y - h / 2; if (lx + w > W - 4) lx = x - 10 - w;
    const box = [lx, ly, w, h]; if (boxes.some(b => lx < b[0] + b[2] && lx + w > b[0] && ly < b[1] + b[3] && ly + h > b[1])) return;
    boxes.push(box); ctx.globalAlpha = a; ctx.fillStyle = col; lines.forEach((s, i) => ctx.fillText(s, lx + 2, ly + lh * (i + 0.5))); ctx.globalAlpha = 1;
  };
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  if (S.view === 'radar') {
    const list = [...S.planes.values()].map(p => { const q = planePos(p, now), d = haversineNm(S.obs, q); return {p, d, b: bearing(S.obs, q)}; })
      .filter(o => o.d <= S.rangeMi * NM_PER_MI * 1.02).sort((a, b) => a.d - b.d);
    // own position
    ctx.fillStyle = G; ctx.beginPath(); ctx.arc(CX, CY, 3, 0, 7); ctx.fill();
    const small = W < 420;
    let airborne = 0;
    for (const o of list) {
      if (o.p.alt === 'ground') { const r = o.d / (S.rangeMi * NM_PER_MI) * R; ctx.fillStyle = G; ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.arc(CX + Math.sin(o.b * DEG) * r, CY - Math.cos(o.b * DEG) * r, 1.6, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
        if (S.selected === o.p.id) hits.push({x: CX + Math.sin(o.b * DEG) * r, y: CY - Math.cos(o.b * DEG) * r, id: o.p.id}); continue; }
      airborne++;
      const r = o.d / (S.rangeMi * NM_PER_MI) * R, x = CX + Math.sin(o.b * DEG) * r, y = CY - Math.cos(o.b * DEG) * r, a = lit(o.b), sel = S.selected === o.p.id;
      // trail: where it was over the last minute
      ctx.strokeStyle = G; ctx.globalAlpha = a * 0.35; ctx.lineWidth = 1; ctx.beginPath();
      const back = move(planePos(o.p, now), o.p.trk + 180, o.p.gs * 40 / 3600), db = haversineNm(S.obs, back), bb = bearing(S.obs, back), rb = db / (S.rangeMi * NM_PER_MI) * R;
      ctx.moveTo(x, y); ctx.lineTo(CX + Math.sin(bb * DEG) * rb, CY - Math.cos(bb * DEG) * rb); ctx.stroke(); ctx.globalAlpha = 1;
      plane(x, y, o.p.trk, a, sel ? '#ffffff' : G, 6.5);
      if (sel) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, 13, 0, 7); ctx.stroke(); }
      const lines = [o.p.cs || o.p.hex, fmtAlt(o.p.alt) + (small ? '' : '  ' + Math.round(o.p.gs) + ' kt')];
      if (!small) lines.push(String(Math.round(o.p.trk)).padStart(3, '0') + '°' + (o.p.type ? '  ' + o.p.type : ''));
      label(x, y, lines, Math.max(a, sel ? 1 : 0.55), sel ? '#ffffff' : G);
      hits.push({x, y, id: o.p.id});
    }
    $('#fom-count').textContent = airborne;
  } else {
    // sky dome: zenith in the middle, horizon at the edge
    const pt = (az, el) => { const r = (90 - el) / 90 * R; return [CX + Math.sin(az * DEG) * r, CY - Math.cos(az * DEG) * r]; };
    // the next ISS pass as a dotted arc that marches along
    const pass = S.pass && S.pass.pts;
    if (pass) {
      ctx.save(); ctx.setLineDash([3, 6]); ctx.lineDashOffset = reduce.matches ? 0 : -now / 60; ctx.strokeStyle = css('--iss') || '#7fe7ff'; ctx.globalAlpha = 0.75; ctx.lineWidth = 1.5;
      ctx.beginPath(); pass.forEach((q, i) => { const [x, y] = pt(q.az, q.el); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); ctx.restore();
      const [ex, ey] = pt(pass[pass.length - 1].az, pass[pass.length - 1].el); ctx.fillStyle = css('--iss') || '#7fe7ff'; ctx.font = `${small2()}px ui-monospace,Menlo,monospace`;
      if (!reduce.matches && pass.length > 2) { // a comet that runs along the pass, so you can see which way it goes
        const f = (now / 5000) % 1, i = Math.min(pass.length - 2, Math.floor(f * (pass.length - 1))), u = f * (pass.length - 1) - i;
        const [ax, ay] = pt(pass[i].az, pass[i].el), [bx, by] = pt(pass[i + 1].az, pass[i + 1].el), cx = ax + (bx - ax) * u, cy = ay + (by - ay) * u;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 14); g.addColorStop(0, 'rgba(127,231,255,.9)'); g.addColorStop(1, 'rgba(127,231,255,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 14, 0, 7); ctx.fill(); ctx.fillStyle = '#e8fbff'; ctx.beginPath(); ctx.arc(cx, cy, 2.5, 0, 7); ctx.fill();
      }
      const [sx, sy] = pt(pass[0].az, pass[0].el); label(sx, sy, ['ISS rises ' + fmtTime(S.pass.start)], 0.9, css('--iss') || '#7fe7ff');
    }
    for (const o of S.satNow) {
      const isIss = o.s === S.iss, col = isIss ? (css('--iss') || '#7fe7ff') : G;
      if (o.s.trail) { ctx.strokeStyle = col; ctx.lineWidth = isIss ? 2 : 1; ctx.beginPath(); let first = true;
        for (const q of o.s.trail) { if (q.el < 0) { first = true; continue; } const [x, y] = pt(q.az, q.el); first ? ctx.moveTo(x, y) : ctx.lineTo(x, y); first = false; }
        ctx.globalAlpha = 0.28; ctx.stroke(); ctx.globalAlpha = 1; }
      const [x, y] = pt(o.az, o.el), pulse = reduce.matches ? 0 : (Math.sin(now / 300 + o.s.id * 1) + 1) / 2;
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, isIss ? 5 : 2.6, 0, 7); ctx.fill();
      ctx.globalAlpha = 0.25 + 0.3 * pulse; ctx.beginPath(); ctx.arc(x, y, (isIss ? 9 : 5) + 3 * pulse, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
      if (isIss || o.el > 25) label(x, y, [isIss ? 'ISS' : o.s.name.replace(/ ?\(.*\)/, '').slice(0, 14), Math.round(o.el) + '° ' + compass(o.az)], isIss ? 1 : 0.7, col);
    }
    for (const p of S.planes.values()) {
      const q = planePos(p, now), d = haversineNm(S.obs, q) * 1852, h = p.alt === 'ground' ? 0 : (p.alt || 0) * M_PER_FT, el = Math.atan2(h, d) / DEG;
      if (el < 10) continue; const [x, y] = pt(bearing(S.obs, q), el);
      plane(x, y, p.trk, 0.5, S.selected === p.id ? '#fff' : G, 5); hits.push({x, y, id: p.id});
      label(x, y, [p.cs], 0.45, G);
    }
    $('#fom-count').textContent = S.satNow.length;
  }
}
const small2 = () => W < 420 ? 10 : 11;
function plane(x, y, trk, a, col, s) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(trk * DEG); ctx.globalAlpha = a; ctx.fillStyle = col;
  ctx.shadowColor = col; ctx.shadowBlur = reduce.matches ? 0 : 8 * a;
  ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s * 0.22, -s * 0.3); ctx.lineTo(s, s * 0.15); ctx.lineTo(s, s * 0.35); ctx.lineTo(s * 0.2, s * 0.15);
  ctx.lineTo(s * 0.15, s * 0.7); ctx.lineTo(s * 0.45, s); ctx.lineTo(-s * 0.45, s); ctx.lineTo(-s * 0.15, s * 0.7); ctx.lineTo(-s * 0.2, s * 0.15);
  ctx.lineTo(-s, s * 0.35); ctx.lineTo(-s, s * 0.15); ctx.lineTo(-s * 0.22, -s * 0.3); ctx.closePath(); ctx.fill(); ctx.restore();
}

// ---------- list view and details card ----------
function rows() {
  const now = Date.now();
  return [...S.planes.values()].map(p => { const q = planePos(p, now); return {p, d: haversineNm(S.obs, q), b: bearing(S.obs, q)}; })
    .filter(o => o.d <= S.rangeMi * NM_PER_MI * 1.02).sort((a, b) => (a.p.alt === 'ground') - (b.p.alt === 'ground') || a.d - b.d);
}
function renderList() {
  const tb = $('#fom-list tbody'); if (!tb || !S.obs) return;
  const rs = rows();
  tb.innerHTML = rs.length ? rs.map(o => `<tr><td><button type="button" class="fom-cs" data-id="${esc(o.p.id)}">${esc(o.p.cs || o.p.hex)}</button></td><td>${esc(o.p.type || '')}</td><td>${fmtAlt(o.p.alt)}</td><td>${Math.round(o.p.gs)} kt</td><td>${fmtMi(o.d)} ${compass(o.b)}</td></tr>`).join('')
    : '<tr><td colspan="5">No aircraft in range just now. Try a wider range.</td></tr>';
  if (S.view === 'radar') $('#fom-count').textContent = rs.filter(o => o.p.alt !== 'ground').length;
}
function renderSatList() {
  const ul = $('#fom-sats'); if (!ul) return;
  ul.innerHTML = S.satNow.length ? S.satNow.slice(0, 12).map(o => `<li${o.s === S.iss ? ' class="fom-iss-li"' : ''}><b>${esc(o.s.name)}</b><span>${Math.round(o.el)}° up, ${compass(o.az)}</span></li>`).join('')
    : '<li>No satellites from these lists are above your horizon at this moment. Give it a few minutes.</li>';
}
function openCard(id) {
  S.selected = id; updateCard(); const c = $('#fom-card'); c.hidden = false;
  if (!reduce.matches) c.animate([{opacity: 0, transform: 'translateY(8px)'}, {opacity: 1, transform: 'none'}], {duration: 180, easing: 'ease-out'});
  if (reduce.matches) draw(Date.now());
}
function closeCard() { S.selected = null; const c = $('#fom-card'); if (c) c.hidden = true; }
function updateCard() {
  const p = S.selected && S.planes.get(S.selected); if (!p) return;
  const q = planePos(p, Date.now()), d = haversineNm(S.obs, q), b = bearing(S.obs, q);
  const vs = p.vs > 250 ? `climbing ${Math.round(p.vs).toLocaleString('en-GB')} ft/min` : p.vs < -250 ? `descending ${Math.round(-p.vs).toLocaleString('en-GB')} ft/min` : 'level';
  $('#fom-card-cs').textContent = p.cs || p.hex;
  $('#fom-card-sub').textContent = [p.type, p.reg, p.desc].filter(Boolean).join(' · ') || 'Type not sent';
  $('#fom-card-dl').innerHTML = [['Altitude', fmtAltLong(p.alt)], ['Speed', `${Math.round(p.gs)} kt (${Math.round(p.gs * 1.15078)} mph)`], ['Heading', `${String(Math.round(p.trk)).padStart(3, '0')}° ${compass(p.trk)}`],
    ['Distance', `${fmtMi(d)} to the ${compass(b)}`], ['Vertical', vs], ['Squawk', p.squawk || 'Not sent']].map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('');
  const a = $('#fom-card-link');
  if (p.demo) { a.hidden = true; $('#fom-card-demo').hidden = false; } else { a.hidden = false; $('#fom-card-demo').hidden = true; a.href = `https://globe.adsb.lol/?icao=${encodeURIComponent(p.hex)}`; }
}
function hitTest(ev) {
  const r = cv.getBoundingClientRect(), x = ev.clientX - r.left, y = ev.clientY - r.top;
  let best = null, bd = 26 * 26;
  for (const h of hits) { const d = (h.x - x) ** 2 + (h.y - y) ** 2; if (d < bd) { bd = d; best = h; } }
  if (best) openCard(best.id); else closeCard();
}

// ---------- wiring ----------
function setView(v) {
  S.view = v; document.body.dataset.view = v;
  document.querySelectorAll('[data-view-btn]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.viewBtn === v)));
  $('#fom-scope').hidden = v === 'list'; $('#fom-listwrap').hidden = v !== 'list';
  $('#fom-count-k').textContent = v === 'sky' ? 'satellites up' : 'aircraft in the air';
  $('#fom-legend').textContent = v === 'sky' ? 'Sky dome: straight up is the middle, the horizon is the edge. Dots are satellites above you, the blue dotted line is the next ISS pass, planes show when they are high in your sky.'
    : v === 'radar' ? 'Radar: you are in the middle, north is up. Each blip shows callsign, altitude, speed and heading. Tap one for details.' : 'Nearest first, with aircraft on the ground at the end. Tap a callsign for details.';
  if (v === 'list') { renderList(); renderSatList(); } else { size(); draw(Date.now()); }
}
function init() {
  document.documentElement.classList.add('fom-js');
  $('#fom-show').addEventListener('click', askBrowser);
  $('#fom-demo').addEventListener('click', () => useLocation(DEMO.lat, DEMO.lon, DEMO.label + ' (demo location)'));
  $('#fom-form').addEventListener('submit', async e => {
    e.preventDefault(); const q = $('#fom-q').value.trim(); if (!q) return;
    setStatus('busy', 'Looking that up…');
    try { const g = await geocode(q); if (!g) setStatus('warn', 'I could not find that place. Try a town name or a full postcode.'); else { setStatus('ok', ''); useLocation(g.lat, g.lon, g.label); } }
    catch (err) { setStatus('warn', 'The place search is not answering. Try again in a moment, or use the Heathrow demo.'); }
  });
  document.querySelectorAll('[data-view-btn]').forEach(b => b.addEventListener('click', () => setView(b.dataset.viewBtn)));
  $('#fom-range').addEventListener('change', e => { S.rangeMi = +e.target.value; if (S.demoTraffic) startDemoTraffic(FORCE_DEMO ? 'Demo traffic, as you asked for with the demo link.' : PROXY ? 'Still demo planes for now.' : 'Live planes coming soon. Until my relay is switched on, these are demo planes; the satellites are live.'); else poll(); renderList(); });
  cv.addEventListener('click', hitTest);
  $('#fom-change').addEventListener('click', () => { document.body.classList.toggle('fom-change'); if (document.body.classList.contains('fom-change')) $('#fom-q').focus(); });
  $('#fom-list').addEventListener('click', e => { const b = e.target.closest('.fom-cs'); if (b) openCard(b.dataset.id); });
  $('#fom-card-close').addEventListener('click', closeCard);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeCard(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && S.obs && !S.demoTraffic && Date.now() - S.lastFetch > POLL_MS) poll(); });
  addEventListener('resize', () => { size(); if (reduce.matches && S.obs) draw(Date.now()); });
  if (RADAR_PACK_URL) { const c = $('#fom-pack'); c.querySelector('a').href = RADAR_PACK_URL; c.hidden = false; }
  setInterval(() => { tickSats(); if (S.selected) updateCard(); if (reduce.matches && S.obs && S.view !== 'list') draw(Date.now()); }, 1000);
  setInterval(() => { if (S.view === 'list') renderList(); }, 3000);
  setInterval(findPass, 10 * 60000);
  setView('radar');
  if (FORCE_DEMO) useLocation(DEMO.lat, DEMO.lon, DEMO.label + ' (demo location)');
  requestAnimationFrame(frame);
}
init();
