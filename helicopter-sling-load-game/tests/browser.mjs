// Headless Chromium checks: the page loads with no console errors, the autopilot flies jobs through the real
// keyboard handlers, the phone buttons work, the Daily Drop flows, and it takes the screenshots in ../screenshots.
// Run from the site root with a static server on BASE, for example:
//   python3 -m http.server 18473 --bind 127.0.0.1 &  node helicopter-sling-load-game/tests/browser.mjs
// Needs playwright or playwright-core (PW_MODULE=/path/to/playwright-core/index.js) and a Chromium (CHROMIUM=/path).
import fs from 'fs'; import path from 'path'; import {fileURLToPath} from 'url';
const here = path.dirname(fileURLToPath(import.meta.url)), shots = path.join(here, '..', 'screenshots');
const BASE = process.env.BASE || 'http://127.0.0.1:18473', PAGE = BASE + '/helicopter-sling-load-game/';
const pw = await import(process.env.PW_MODULE || 'playwright-core').then(m => m.default || m);
const exe = process.env.CHROMIUM || (() => { const root = path.join(process.env.HOME, '.cache/ms-playwright'); const d = fs.existsSync(root) && fs.readdirSync(root).filter(n => /^chromium-\d+/.test(n)).sort().pop(); return d ? path.join(root, d, 'chrome-linux64/chrome') : undefined; })();
const browser = await pw.chromium.launch({executablePath: exe, args: ['--autoplay-policy=no-user-gesture-required']});
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };
async function open(viewport, init) {
  const ctx = await browser.newContext({viewport, deviceScaleFactor: 1, hasTouch: viewport.width < 600}); if (init) await ctx.addInitScript(init); const page = await ctx.newPage(), errors = [], missing = [];
  page.on('console', m => { if (m.type() === 'error' && !(m.location()?.url || '').startsWith('https://') && !/cloudflareinsights|ERR_FAILED/.test(m.text())) errors.push(m.text()); }); page.on('pageerror', e => errors.push(String(e)));
  page.on('response', r => { if (r.status() >= 400 && r.url().startsWith(BASE)) missing.push(r.url()); });
  await ctx.route(u => !u.href.startsWith(BASE), r => r.abort()); // nothing leaves the box, no analytics from tests
  await page.goto(PAGE, {waitUntil: 'load'}); await page.waitForFunction(() => window.SlingGame && document.querySelectorAll('[data-level]').length === 7);
  return {ctx, page, errors, missing};
}
// The autopilot runs inside the page and only presses keys, 20 times a second.
const PILOT = `(async () => {
  const {decide} = await import('./tests/pilot.mjs'); const G = window.SlingGame, held = {};
  const key = (k, down) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', {key: k, bubbles: true}));
  const hold = (k, on) => { if (!!held[k] !== on) { held[k] = on; key(k, on); } };
  window.__pilot = setInterval(() => { const s = G.state(); if (!s || s.done) { for (const k of Object.keys(held)) hold(k, false); clearInterval(window.__pilot); return; }
    const p = decide(G.world(), s); hold('a', p.tilt < 0); hold('d', p.tilt > 0); hold('w', p.lift > 0); hold('s', p.lift < 0); if (p.rel) { key(' ', true); key(' ', false); } }, 50);
})()`;
const flyJob = async (page, id, o = {}) => { await page.evaluate(() => window.SlingGame.last = null); await page.evaluate(([id, o]) => window.SlingGame.start(id, o), [id, o]); await page.waitForFunction(() => window.SlingGame.state()?.t > 0.2); await page.evaluate(PILOT); };
const D = await open({width: 1440, height: 900});
ok(D.errors.length === 0, 'desktop loads with no console errors ' + JSON.stringify(D.errors));
ok(D.missing.length === 0, 'every local file resolves ' + JSON.stringify(D.missing));
ok(await D.page.evaluate(() => !!document.querySelector('.dexm-support-site') && !!document.querySelector('#result .dexm-support')), 'support buttons on the page and on the finish screen');
ok(await D.page.evaluate(() => document.getElementById('hover').checked && document.getElementById('damp').checked && !document.getElementById('sound').checked), 'assists on and sound off by default');
// 1. Every job, flown by the keyboard autopilot.
const results = {};
for (const id of await D.page.evaluate(() => window.SlingGame.levels)) {
  await flyJob(D.page, id);
  if (id === 'rooftop') { await D.page.waitForFunction(() => { const s = window.SlingGame.state(); return s.done || (s.carry === 0 && s.x > 150 && s.items[0].y < 40); }, null, {timeout: 120000, polling: 100}); await D.page.locator('#sky').screenshot({path: path.join(shots, '2-rooftop-ac.png')}); }
  if (id === 'fire-bucket') { await D.page.waitForFunction(() => { const s = window.SlingGame.state(); return s.done || (s.drops.length > 60 && s.results.length === 0); }, null, {timeout: 150000, polling: 50}); await D.page.waitForTimeout(500); await D.page.locator('#sky').screenshot({path: path.join(shots, '3-fire-bucket.png')}); }
  if (id === 'crate-yard') { await D.page.waitForFunction(() => { const s = window.SlingGame.state(); return s.done || (s.carry === 0 && s.items[0].y > 6 && s.items[0].x > 95 && s.items[0].x < 130); }, null, {timeout: 120000, polling: 50}); await D.page.locator('#sky').screenshot({path: path.join(shots, '1-crate-lift.png')}); }
  await D.page.waitForFunction(() => window.SlingGame.last, null, {timeout: 240000, polling: 250});
  results[id] = await D.page.evaluate(() => window.SlingGame.last); console.log(id, JSON.stringify({...results[id], results: undefined}));
  ok(results[id].ok && results[id].score > 0, `keyboard autopilot completes ${id}`);
}
ok(await D.page.evaluate(() => !document.getElementById('result').hidden && /Grade [SABCD]/.test(document.getElementById('result-head').textContent)), 'result card shows a grade');
ok(await D.page.evaluate(() => JSON.parse(localStorage.getItem('sling:stats')).best['first-lift'] > 0), 'best score kept locally');
ok(D.errors.length === 0, 'no console errors after seven jobs ' + JSON.stringify(D.errors));
await D.page.evaluate(() => window.SlingGame.start('first-lift')); await D.page.waitForFunction(() => window.SlingGame.state()?.t > 0.3);
await D.page.keyboard.press('p'); ok(await D.page.evaluate(() => !document.getElementById('paused').hidden), 'P pauses'); await D.page.keyboard.press('p');
await D.page.keyboard.down('d'); await D.page.waitForTimeout(800); ok(await D.page.evaluate(() => window.SlingGame.state().vx > 0.5), 'holding D flies right'); await D.page.keyboard.up('d');
await D.ctx.close();
// 2. Phone: touch buttons, no sideways overflow.
const M = await open({width: 390, height: 844});
ok(await M.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'phone title fits the width');
await M.page.tap('#play'); await M.page.waitForFunction(() => window.SlingGame.state()?.t > 0.3);
ok(await M.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'phone flight screen fits the width');
const hold = async (sel, ms) => { const b = await M.page.locator(sel).boundingBox(); await M.page.mouse.move(b.x + 10, b.y + 10); await M.page.mouse.down(); await M.page.waitForTimeout(ms); await M.page.mouse.up(); };
const y0 = await M.page.evaluate(() => window.SlingGame.state().y); await hold('[data-hold="u"]', 700); ok(await M.page.evaluate(y => window.SlingGame.state().y > y + 0.5, y0), 'holding Up climbs');
await hold('[data-hold="r"]', 700); ok(await M.page.evaluate(() => window.SlingGame.state().vx > 0.3), 'holding Tilt (D) flies right');
await M.page.tap('#release'); await M.page.waitForTimeout(100); ok(await M.page.evaluate(() => window.SlingGame.state().carry === -1), 'tap Release lets go of the load');
ok(M.errors.length === 0, 'phone has no console errors ' + JSON.stringify(M.errors)); await M.ctx.close();
// 3. Daily Drop: on the title above the jobs, ?daily starts it, one scored try, then practice, and a share card.
// The page clock is moved to 2026-10-21 (puzzle #1), so the scored path runs whatever the box date.
const SHIFT = `(() => { const off = Date.parse('2026-10-21T09:00:00Z') - Date.now(), D = Date; class F extends D { constructor(...a) { a.length ? super(...a) : super(D.now() + off); } static now() { return D.now() + off; } } window.Date = F; })()`;
{ const Dl = await open({width: 1440, height: 900}, SHIFT), pg = Dl.page;
  ok(await pg.evaluate(() => { const d = document.getElementById('daily'), m = document.getElementById('levels'); return !!(d.compareDocumentPosition(m) & Node.DOCUMENT_POSITION_FOLLOWING) && /Daily Drop #1/.test(d.textContent); }), 'Daily Drop card sits above the jobs on the title');
  await pg.waitForTimeout(1100); ok(await pg.evaluate(() => /^Next drop in \d+:\d\d:\d\d$/.test(document.getElementById('daily-next').textContent)), 'countdown to the next drop');
  await pg.goto(PAGE + '?daily', {waitUntil: 'load'}); await pg.waitForFunction(() => window.SlingGame?.state()?.t > 0.2);
  ok(await pg.evaluate(() => window.SlingGame.world().level.daily === true && /Daily Drop #1/.test(document.getElementById('flight-h').textContent)), '?daily opens straight into the Daily Drop');
  await pg.evaluate(PILOT); await pg.waitForFunction(() => window.SlingGame.last, null, {timeout: 240000, polling: 250});
  const r = await pg.evaluate(() => window.SlingGame.last); console.log('daily', JSON.stringify({...r, results: undefined})); ok(r.daily && r.ok, 'the keyboard autopilot completes the drop');
  await pg.waitForTimeout(1200); ok(await pg.evaluate(() => { const b = document.getElementById('daily-result'); return !b.hidden && document.getElementById('daily-card').textContent === window.SlingGame.dailyCard() && /^Next drop in \d+:\d\d:\d\d$/.test(document.getElementById('daily-result-next').textContent); }), 'result screen shows the card, a Copy button and the countdown');
  const card = await pg.evaluate(() => window.SlingGame.dailyCard()); console.log(card); ok(/^DEXM Sling Load #1 🚁 Grade [SABCD] · .+\n[🟩🟨🟧🟥]{5} \d+ pts\nhttps:\/\/dexmlabs\.app\/helicopter-sling-load-game\/\?daily$/u.test(card), 'share card');
  const first = await pg.evaluate(() => window.SlingGame.dailyRecord().score); await pg.evaluate(() => window.SlingGame.last = null); await pg.keyboard.press('r'); await pg.waitForFunction(() => window.SlingGame.state()?.t > 0.2);
  ok(await pg.evaluate(() => /practice/.test(document.getElementById('flight-h').textContent)), 'flying again is practice'); await pg.evaluate(PILOT); await pg.waitForFunction(() => window.SlingGame.last, null, {timeout: 240000, polling: 250});
  ok(await pg.evaluate(f => window.SlingGame.dailyRecord().score === f, first), 'practice does not change the scored result');
  ok(Dl.errors.length === 0, 'Daily Drop has no console errors ' + JSON.stringify(Dl.errors)); await Dl.ctx.close(); }
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
