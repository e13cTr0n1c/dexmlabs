// Headless Chromium checks: the page loads with no console errors, the autopilot flies every level through the real
// key state the keyboard handlers set, the phone buttons work, the Daily Drop flows, and it takes the screenshots.
// Run from the site root with a static server on BASE, for example:
//   python3 -m http.server 18473 --bind 127.0.0.1 &  node glider-thermals-game/tests/browser.mjs
// Needs playwright or playwright-core (PW_MODULE=/path/to/playwright-core/index.js) and a Chromium (CHROMIUM=/path).
import fs from 'fs'; import path from 'path'; import {fileURLToPath} from 'url';
const here = path.dirname(fileURLToPath(import.meta.url)), shots = path.join(here, '..', 'screenshots'); fs.mkdirSync(shots, {recursive: true});
const BASE = process.env.BASE || 'http://127.0.0.1:18473', PAGE = BASE + '/glider-thermals-game/';
const pw = await import(process.env.PW_MODULE || 'playwright-core').then(m => m.default || m);
const exe = process.env.CHROMIUM || (() => { const root = path.join(process.env.HOME, '.cache/ms-playwright'); const d = fs.existsSync(root) && fs.readdirSync(root).filter(n => /^chromium-\d+/.test(n)).sort().pop(); return d ? path.join(root, d, 'chrome-linux64/chrome') : undefined; })();
const browser = await pw.chromium.launch({executablePath: exe});
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };
async function open(viewport, init) {
  const ctx = await browser.newContext({viewport, deviceScaleFactor: 1, hasTouch: viewport.width < 600}); if (init) await ctx.addInitScript(init); const page = await ctx.newPage(), errors = [], missing = [];
  page.on('console', m => { if (m.type() === 'error' && !/cloudflareinsights|ERR_FAILED/.test(m.text())) errors.push(m.text()); }); page.on('pageerror', e => errors.push(String(e)));
  page.on('response', r => { if (r.status() >= 400 && r.url().startsWith(BASE)) missing.push(r.url()); });
  await ctx.route(u => !u.href.startsWith(BASE), r => r.abort());
  await page.goto(PAGE, {waitUntil: 'load'}); await page.waitForFunction(() => window.GliderGame && document.querySelectorAll('[data-level]').length === 7);
  return {ctx, page, errors, missing};
}
// The autopilot sets the same held keys the keyboard does, every tenth of a second of flight; time runs fast.
const PILOT = `(async () => { const {decide} = await import('./tests/pilot.mjs'); const G = window.GliderGame, held = {};
  const key = (k, down) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', {key: k, bubbles: true}));
  const hold = (k, on) => { if (!!held[k] !== on) { held[k] = on; key(k, on); } };
  G.autopilot(() => { const s = G.state(); if (!s || s.done) return; const p = decide(G.world(), s); hold('a', p.roll < 0); hold('d', p.roll > 0); hold('w', p.pitch > 0); hold('s', p.pitch < 0); hold(' ', !!p.brake); }); })()`;
const fly = async (page, id, warp = 40, shot) => { await page.evaluate(() => window.GliderGame.last = null); await page.evaluate(id => id === 'daily' ? window.GliderGame.startDaily() : window.GliderGame.start(id), id);
  await page.evaluate(PILOT); await page.evaluate(n => window.GliderGame.testWarp(n), warp); if (shot) await shot();
  await page.waitForFunction(() => window.GliderGame.last, null, {timeout: 600000, polling: 250}); return page.evaluate(() => window.GliderGame.last); };
const D = await open({width: 1440, height: 900});
ok(D.errors.length === 0, 'desktop loads with no console errors ' + JSON.stringify(D.errors));
ok(D.missing.length === 0, 'every local file resolves ' + JSON.stringify(D.missing));
ok(await D.page.evaluate(() => !!document.querySelector('#result .dexm-support')), 'support button on the finish screen');
ok(await D.page.evaluate(() => document.getElementById('trim').checked && !document.getElementById('sound').checked), 'autotrim on and sound off by default');
const snap = (pg, name, cond) => async () => { await pg.waitForFunction(cond, null, {timeout: 300000, polling: 50}); await pg.evaluate(() => window.GliderGame.testWarp(1)); await pg.waitForTimeout(1500); await pg.locator('#sky').screenshot({path: path.join(shots, name)}); await pg.evaluate(() => window.GliderGame.testWarp(40)); };
const SHOTS = {'first-thermal': ['1-first-thermal.png', () => { const s = window.GliderGame.state(); return s.done || (s.ap?.mode === 'climb' && s.h > 700); }],
  wave: ['2-mountain-wave.png', () => { const s = window.GliderGame.state(); return s.done || (s.ap?.mode === 'wave' && s.h > 1500); }],
  'sunset-xc': ['3-sunset-landing.png', () => { const s = window.GliderGame.state(); return s.done || (s.tp >= 2 && s.ap?.mode === 'land-final' && s.h < 120); }]};
for (const id of await D.page.evaluate(() => window.GliderGame.levels)) { const sh = SHOTS[id];
  const r = await fly(D.page, id, 40, sh && snap(D.page, sh[0], sh[1])); console.log(id, JSON.stringify(r)); ok(r.ok && r.score > 0, `autopilot completes ${id}`); }
ok(await D.page.evaluate(() => !document.getElementById('result').hidden && /Grade [SABCD]/.test(document.getElementById('result-head').textContent)), 'result card shows a grade');
ok(await D.page.evaluate(() => JSON.parse(localStorage.getItem('glider:stats')).best['evening-glide'] > 0), 'best score kept locally');
ok(D.errors.length === 0, 'no console errors after seven flights ' + JSON.stringify(D.errors));
await D.page.evaluate(() => { window.GliderGame.autopilot(null); window.GliderGame.testWarp(0); window.GliderGame.start('first-thermal'); }); await D.page.waitForFunction(() => window.GliderGame.state()?.t > 0.3);
await D.page.keyboard.press('p'); ok(await D.page.evaluate(() => !document.getElementById('paused').hidden), 'P pauses'); await D.page.keyboard.press('p');
await D.page.keyboard.down('d'); await D.page.waitForTimeout(900); await D.page.keyboard.up('d'); ok(await D.page.evaluate(() => window.GliderGame.state().phi > 0.2), 'holding D banks right');
await D.ctx.close();
const M = await open({width: 390, height: 844});
ok(await M.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'phone title fits the width');
await M.page.tap('#play'); await M.page.waitForFunction(() => window.GliderGame.state()?.t > 0.3);
ok(await M.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'phone flight screen fits the width');
const hold = async (sel, ms) => { const b = await M.page.locator(sel).boundingBox(); await M.page.mouse.move(b.x + 10, b.y + 10); await M.page.mouse.down(); await M.page.waitForTimeout(ms); await M.page.mouse.up(); };
await hold('[data-hold="l"]', 800); ok(await M.page.evaluate(() => window.GliderGame.state().phi < -0.2), 'holding Bank (A) banks left');
await hold('[data-hold="b"]', 600); ok(await M.page.evaluate(() => window.GliderGame.state().brake > 0.3), 'holding Airbrakes opens them');
ok(M.errors.length === 0, 'phone has no console errors ' + JSON.stringify(M.errors)); await M.ctx.close();
const SHIFT = `(() => { const off = Date.parse('2026-10-21T09:00:00Z') - Date.now(), D = Date; class F extends D { constructor(...a) { a.length ? super(...a) : super(D.now() + off); } static now() { return D.now() + off; } } window.Date = F; })()`;
{ const Dl = await open({width: 1440, height: 900}, SHIFT), pg = Dl.page;
  ok(await pg.evaluate(() => { const d = document.getElementById('daily'), m = document.getElementById('levels'); return !!(d.compareDocumentPosition(m) & Node.DOCUMENT_POSITION_FOLLOWING) && /Daily Drop #1/.test(d.textContent); }), 'Daily Drop card sits above the flights');
  await pg.waitForTimeout(1100); ok(await pg.evaluate(() => /^Next drop in \d+:\d\d:\d\d$/.test(document.getElementById('daily-next').textContent)), 'countdown to the next drop');
  await pg.goto(PAGE + '?daily', {waitUntil: 'load'}); await pg.waitForFunction(() => window.GliderGame?.state()?.t > 0.2);
  ok(await pg.evaluate(() => window.GliderGame.world().level.daily === true), '?daily opens straight into the Daily Drop');
  const r = await fly(pg, 'daily'); console.log('daily', JSON.stringify(r)); ok(r.daily && r.ok, 'the autopilot completes the drop');
  await pg.waitForTimeout(800); const card = await pg.evaluate(() => window.GliderGame.dailyCard()); console.log(card);
  ok(/^DEXM Glider Thermals #1 🪶 Grade [SABCD] · .+\n[🟩🟨🟧🟥]{5} \d+ pts\nhttps:\/\/dexmlabs\.app\/glider-thermals-game\/\?daily$/u.test(card), 'share card');
  ok(await pg.evaluate(() => !document.getElementById('daily-result').hidden), 'share card on the result screen');
  const first = await pg.evaluate(() => window.GliderGame.dailyRecord().score); const r2 = await fly(pg, 'daily');
  ok(await pg.evaluate(f => window.GliderGame.dailyRecord().score === f && /practice/.test(document.getElementById('flight-h').textContent), first), 'flying again is practice and keeps the scored result');
  ok(Dl.errors.length === 0, 'Daily Drop has no console errors ' + JSON.stringify(Dl.errors)); await Dl.ctx.close(); }
await browser.close(); console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
