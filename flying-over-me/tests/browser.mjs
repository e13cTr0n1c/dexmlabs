// Headless Chromium checks for What's flying over me? with every outside API mocked: blips render on the
// radar, tapping one opens the details card, a dead aircraft feed falls back to demo traffic, the sky dome
// and list views work, nothing overflows at 390 px, the location never shows up on screen or in the
// address, and there are no console errors.
// Run from the site root with a static server on BASE, for example:
//   python3 -m http.server 18658 --bind 127.0.0.1 &  node flying-over-me/tests/browser.mjs
// Needs playwright or playwright-core (PW_MODULE=/path/to/playwright-core/index.js) and a Chromium (CHROMIUM=/path).
import fs from 'fs'; import path from 'path'; import {fileURLToPath} from 'url';
const BASE = process.env.BASE || 'http://127.0.0.1:18658', PAGE = BASE + '/flying-over-me/';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const pw = await import(process.env.PW_MODULE || 'playwright-core').then(m => m.default || m);
const exe = process.env.CHROMIUM || (() => { const root = path.join(process.env.HOME, '.cache/ms-playwright'); const d = fs.existsSync(root) && fs.readdirSync(root).filter(n => /^chromium-\d+/.test(n)).sort().pop(); return d ? path.join(root, d, 'chrome-linux64/chrome') : undefined; })();
const browser = await pw.chromium.launch({executablePath: exe});
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };
const TLE = fs.readFileSync(path.join(HERE, '../data/tle-fallback.txt'), 'utf8');
const LAT = 51.4712, LON = -0.4521;
const fleet = () => ({now: Date.now(), total: 4, ac: [
  {hex: '400a1b', flight: 'TST101  ', r: 'G-TSTA', t: 'A320', alt_baro: 4200, gs: 210, track: 270, baro_rate: -800, lat: LAT + 0.05, lon: LON + 0.02, seen_pos: 1, squawk: '4521'},
  {hex: '400a1c', flight: 'TST202  ', t: 'B789', alt_baro: 36000, gs: 480, track: 95, lat: LAT - 0.12, lon: LON - 0.2, seen_pos: 0.5},
  {hex: '400a1d', flight: 'TST303  ', t: 'C172', alt_baro: 2200, gs: 90, track: 10, lat: LAT + 0.2, lon: LON - 0.1, seen_pos: 2},
  {hex: '400a1e', flight: 'TST404  ', alt_baro: 'ground', gs: 0, track: 0, lat: LAT, lon: LON + 0.001, seen_pos: 1},
  {hex: '400a1f', flight: 'NOPOS'}]});
async function setup(viewport, {feeds = 'ok', geo = true, reduced = false, proxy = true} = {}) {
  const ctx = await browser.newContext({bypassCSP: proxy, viewport, deviceScaleFactor: 1, hasTouch: viewport.width < 600, colorScheme: 'dark', reducedMotion: reduced ? 'reduce' : 'no-preference',
    geolocation: {latitude: LAT, longitude: LON}, permissions: geo ? ['geolocation'] : []});
  const seen = [];
  if (proxy) await ctx.addInitScript(() => { window.__FOM_PROXY_TEST = 'https://relay.test'; });
  await ctx.route(u => !u.href.startsWith(BASE), r => {
    const u = r.request().url(); seen.push(u);
    const cors = {'access-control-allow-origin': '*'};
    if (/api\.(airplanes\.live|adsb\.lol)/.test(u)) { seen.push('DIRECT ' + u); return r.abort(); }
    if (/relay\.test\/point\//.test(u)) return feeds === 'ok' ? r.fulfill({status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify(fleet())}) : r.fulfill({status: 503, headers: cors, body: 'down'});
    if (/celestrak\.org/.test(u)) return r.fulfill({status: 200, headers: cors, contentType: 'text/plain', body: TLE});
    if (/nominatim/.test(u)) return r.fulfill({status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify([{lat: '51.5072', lon: '-0.1276', name: 'Testtown'}])});
    return r.abort();
  });
  const page = await ctx.newPage(), errors = [];
  page.on('console', m => { if (m.type() === 'error' && !/cloudflareinsights|ERR_FAILED|503/.test(m.text())) errors.push(m.text()); }); page.on('pageerror', e => errors.push(String(e)));
  await page.goto(PAGE, {waitUntil: 'load'});
  return {ctx, page, errors, seen};
}
const noOverflow = page => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
for (const [name, viewport] of [['desktop', {width: 1366, height: 900}], ['phone-390', {width: 390, height: 844}]]) {
  // 1. live feed, location from the browser
  let {ctx, page, errors, seen} = await setup(viewport);
  ok(await page.isVisible('#fom-show') && !(await page.isVisible('#fom-app')), `${name}: intro and Show me first, radar hidden`);
  ok(await page.evaluate(() => [...document.querySelectorAll('details.dexm-more')].every(d => !d.open)), `${name}: longer sections start closed`);
  ok(await page.isHidden('#fom-pack'), `${name}: the Pi software card stays hidden while its link is empty`);
  await page.click('#fom-show');
  await page.waitForFunction(() => window.__fom && window.__fom.planes.size >= 4 && window.__fom.hits && window.__fom.hits.length >= 3, null, {timeout: 15000});
  ok(true, `${name}: blips render on the radar`);
  ok((await page.textContent('#fom-count')) === '3', `${name}: counts the three airborne aircraft, not the one on the ground or one without a position`);
  ok(/airplanes\.live/.test(await page.textContent('#fom-feed')) && /adsb\.lol/.test(await page.textContent('#fom-feed')), `${name}: credits the live ADS-B feeds`);
  const apiUrl = seen.find(u => /relay\.test/.test(u)) || '';
  ok(!seen.some(u => /^DIRECT/.test(u)), `${name}: never calls the CORS-less feeds directly`);
  ok(/\/point\/51\.47\/-0\.45\/\d+$/.test(apiUrl), `${name}: the feed only gets a rounded location (${apiUrl})`);
  const body = await page.evaluate(() => document.body.innerText + location.href);
  ok(!/51\.47|0\.45|51\.4712|-0\.4521/.test(body), `${name}: no coordinates on screen or in the address`);
  ok(await page.evaluate(() => !Object.keys(localStorage).some(k => /lat|lon|loc|place/i.test(k) || /51\.4/.test(localStorage.getItem(k) || '').valueOf() && !/^fom:tle:/.test(k))), `${name}: nothing about the location in storage`);
  // tap a blip
  const hit = await page.evaluate(() => { const c = document.querySelector('#fom-radar').getBoundingClientRect(), h = window.__fom.hits.find(h => window.__fom.planes.get(h.id).cs === 'TST101'); return h && {x: c.left + h.x, y: c.top + h.y}; });
  await page.mouse.click(hit.x, hit.y); await page.waitForTimeout(300);
  ok(await page.isVisible('#fom-card') && (await page.textContent('#fom-card-cs')) === 'TST101', `${name}: tapping a blip opens its details card`);
  const card = await page.textContent('#fom-card');
  ok(/A320/.test(card) && /4,200 ft/.test(card) && /210 kt/.test(card) && /mi to the/.test(card) && /descending/.test(card), `${name}: card shows type, altitude, speed, distance and climb`);
  ok((await page.getAttribute('#fom-card-link', 'href')) === 'https://globe.adsb.lol/?icao=400a1b', `${name}: card links out to the flight on globe.adsb.lol`);
  await page.keyboard.press('Escape'); ok(await page.isHidden('#fom-card'), `${name}: Escape closes the card`);
  // views
  await page.$eval('[data-view-btn=sky]', e => e.click());
  await page.waitForFunction(() => window.__fom.sats.length > 50 && window.__fom.iss, null, {timeout: 10000}); await page.waitForTimeout(400);
  ok(/ISS|International Space Station/.test(await page.textContent('#fom-iss-wrap, .fom-iss-panel')) && !/Loading/.test(await page.textContent('#fom-iss')), `${name}: ISS panel fills in`);
  await page.waitForFunction(() => /pass/i.test(document.querySelector('#fom-iss').textContent), null, {timeout: 10000}).catch(() => {});
  ok(/pass/i.test(await page.textContent('#fom-iss')), `${name}: next ISS pass worked out`);
  await page.$eval('[data-view-btn=list]', e => e.click()); await page.waitForTimeout(200);
  ok((await page.$$('#fom-list tbody .fom-cs')).length === 4 && /TST101/.test(await page.textContent('#fom-list')), `${name}: list view lists the aircraft`);
  await page.click('#fom-list .fom-cs >> nth=0'); ok(await page.isVisible('#fom-card'), `${name}: a callsign in the list opens the card`);
  ok(await noOverflow(page), `${name}: no sideways overflow with the app open`);
  ok(!errors.length, `${name}: no console errors ${errors.join(' | ')}`);
  await ctx.close();
  // 2. both aircraft feeds down: demo traffic, clearly marked
  ({ctx, page, errors} = await setup(viewport, {feeds: 'down', geo: false}));
  await page.fill('#fom-q', 'Testtown'); await page.click('#fom-form button[type=submit]');
  await page.waitForFunction(() => document.body.dataset.mode === 'demo' && window.__fom.planes.size > 5, null, {timeout: 20000});
  ok(/Testtown/.test(await page.textContent('#fom-place')), `${name}: a typed place is looked up and used`);
  ok(/demo/i.test(await page.textContent('#fom-feed')) && /not answering/.test(await page.textContent('#fom-status')), `${name}: dead feeds fall back to marked demo traffic`);
  ok(await page.isVisible('#fom-retry'), `${name}: offers to try the live feed again`);
  ok(await noOverflow(page), `${name}: no overflow in the fallback`);
  ok(!errors.length, `${name}: no console errors in the fallback ${errors.join(' | ')}`);
  await ctx.close();
  // 2b. as shipped, with no relay set yet: demo planes with a coming soon note, satellites still live
  ({ctx, page, errors} = await setup(viewport, {proxy: false}));
  await page.click('#fom-demo');
  await page.waitForFunction(() => document.body.dataset.mode === 'demo' && window.__fom.planes.size > 5 && window.__fom.sats.length > 50, null, {timeout: 15000});
  ok(/Live planes coming soon/.test(await page.textContent('#fom-status')) && !(await page.isVisible('#fom-retry')), `${name}: no relay yet: demo planes with a clear coming soon note`);
  ok(/CelesTrak/.test(await page.textContent('#fom-satsrc')) && !/saved copy/.test(await page.textContent('#fom-satsrc')), `${name}: satellites stay live without the relay`);
  ok(!errors.length, `${name}: no console errors without the relay ${errors.join(' | ')}`);
  await ctx.close();
  // 3. reduced motion and the demo link
  ({ctx, page, errors} = await setup(viewport, {reduced: true}));
  await page.goto(PAGE + '?demo', {waitUntil: 'load'});
  await page.waitForFunction(() => window.__fom.planes.size > 5 && window.__fom.hits.length > 3, null, {timeout: 10000});
  ok(true, `${name}: demo link starts demo traffic with reduced motion`);
  ok(!errors.length, `${name}: no console errors with reduced motion ${errors.join(' | ')}`);
  await ctx.close();
}
// no JS: the intro and the explanations are still there
{ const ctx = await browser.newContext({javaScriptEnabled: false, viewport: {width: 390, height: 844}}); await ctx.route(u => !u.href.startsWith(BASE), r => r.abort());
  const page = await ctx.newPage(); await page.goto(PAGE);
  const t = await page.evaluate(() => document.body.innerText);
  ok(/What's flying over me/.test(t) && /needs JavaScript/.test(t) && (await page.$$('details.dexm-more')).length >= 4, 'no JS: intro, a plain note and the explanations stay');
  ok(await page.isHidden('#fom-show'), 'no JS: no dead buttons');
  await ctx.close(); }
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
