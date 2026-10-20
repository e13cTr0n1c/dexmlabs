// Headless Chromium checks: the page loads with no console errors, the autopilot finishes a level of each mode
// through the real keyboard handlers, the Daily Drop shows its share card, the phone buttons work, and it takes the screenshots.
// Run from the site root with a static server on BASE, for example:
//   python3 -m http.server 18474 --bind 127.0.0.1 &  node tesla-roadster-thruster-game/tests/browser.mjs
// Needs playwright-core (PW_MODULE=/path/to/node_modules/playwright-core/index.mjs) and a Chromium (CHROMIUM=/path).
import fs from 'fs'; import path from 'path'; import {fileURLToPath} from 'url';
const here = path.dirname(fileURLToPath(import.meta.url)), shots = path.join(here, '..', 'screenshots');
const BASE = process.env.BASE || 'http://127.0.0.1:18474', PAGE = BASE + '/tesla-roadster-thruster-game/';
const pw = await import(process.env.PW_MODULE || 'playwright-core').then(m => m.default || m);
const exe = process.env.CHROMIUM || (() => { const root = path.join(process.env.HOME, '.cache/ms-playwright'); const d = fs.existsSync(root) && fs.readdirSync(root).filter(n => /^chromium-\d+/.test(n)).sort().pop(); return d ? path.join(root, d, 'chrome-linux64/chrome') : undefined; })();
const browser = await pw.chromium.launch({executablePath: exe});
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };
const allErrors = [];
async function open(viewport, q = '') {
  const ctx = await browser.newContext({viewport, deviceScaleFactor: 1, hasTouch: viewport.width < 600}); const page = await ctx.newPage(), errors = [], missing = [];
  page.on('console', m => { if (m.type() === 'error' && !/cloudflareinsights/.test(m.text() + (m.location()?.url || ''))) { errors.push(m.text()); allErrors.push(m.text()); } }); page.on('pageerror', e => { errors.push(String(e)); allErrors.push(String(e)); });
  page.on('response', r => { if (r.status() >= 400 && r.url().startsWith(BASE)) missing.push(r.url()); });
  await ctx.route(u => !u.href.startsWith(BASE), r => r.abort()); // nothing leaves the box, no analytics from tests
  await page.goto(PAGE + q, {waitUntil: 'load'}); await page.waitForFunction(() => window.RoadsterGame && document.querySelectorAll('[data-level]').length === 9);
  return {ctx, page, errors, missing};
}
// The pilot runs inside the page and only presses keys, 20 times a second.
const PILOT = `(async () => {
  const {decide} = await import('./tests/pilot.mjs'); const G = window.RoadsterGame, held = {}, map = {up: 'w', down: 's', left: 'a', right: 'd', rl: 'q', rr: 'e', boost: ' '};
  const key = (k, down) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', {key: k, bubbles: true}));
  const hold = (k, on) => { if (!!held[k] !== on) { held[k] = on; key(k, on); } };
  window.__pilot = setInterval(() => { const s = G.state(); if (!s || s.done) { for (const k of Object.keys(held)) hold(k, false); clearInterval(window.__pilot); return; }
    const p = decide(G.world(), s); for (const [n, k] of Object.entries(map)) hold(k, !!p[n]); if (p.cut) { key('x', true); key('x', false); } }, 50);
})()`;
async function drive(page, id, until, shot) {
  await page.evaluate(id => { window.RoadsterGame.last = null; document.querySelector(`[data-level="${id}"]`).click(); document.getElementById('play').click(); }, id);
  await page.waitForFunction(() => window.RoadsterGame.state()); await page.evaluate(PILOT);
  if (until) { await page.waitForFunction(until, null, {timeout: 120000, polling: 50}); await page.locator('#sky').screenshot({path: path.join(shots, shot)}); }
  await page.waitForFunction(() => window.RoadsterGame.last, null, {timeout: 240000, polling: 250}); return page.evaluate(() => window.RoadsterGame.last);
}
const NOTE = 'Fan-made game. Not affiliated with, endorsed or sponsored by Tesla, Inc. or SpaceX. Tesla and Roadster are trademarks of their owners.';
// 1. Desktop: loads clean, title screenshot.
const D = await open({width: 1440, height: 900});
ok(D.errors.length === 0, 'desktop loads with no console errors ' + JSON.stringify(D.errors));
ok(D.missing.length === 0, 'every local file resolves ' + JSON.stringify(D.missing));
ok(await D.page.evaluate(() => !!document.querySelector('.dexm-support-site') && !!document.querySelector('#result .dexm-support') && !!document.querySelector('.support-cta')), 'support buttons on the page and on the finish screen');
ok(await D.page.evaluate(n => document.querySelector('.site-footer').textContent.includes(n) && document.querySelector('.title-copy .disclaimer').textContent.includes(n) && document.querySelector('.article').textContent.includes(n), NOTE), 'trademark notice in the title area, the about text and the footer');
ok(await D.page.evaluate(() => !document.getElementById('sound').checked), 'sound is off by default');
ok(await D.page.evaluate(() => /^Daily Drop #\d+$/.test(document.getElementById('daily-h').textContent) && /Next drop in \d+:\d\d:\d\d/.test(document.getElementById('daily-next').textContent)), 'Daily Drop card on the title screen with a countdown');
await D.page.screenshot({path: path.join(shots, '1-title.png')});
// 2. One level of each mode, flown by the keyboard pilot.
const r1 = await drive(D.page, 'gap', () => { const s = window.RoadsterGame.state(); return s && s.liftOn > 0.3 && s.x > 226; }, '2-thruster-sprint-gap.png'); console.log('gap', JSON.stringify(r1));
ok(r1.ok && r1.score > 0 && r1.t60 < 1, 'keyboard pilot clears Gap jump, 0 to 60 under a second with the boost');
ok(await D.page.evaluate(() => !document.getElementById('result').hidden && /line/.test(document.getElementById('result-head').textContent) && !document.getElementById('result-parts').hidden), 'result card shows the run and its parts');
ok(await D.page.evaluate(() => JSON.parse(localStorage.getItem('roadster:stats')).best.gap > 0), 'best score kept locally');
const r2 = await drive(D.page, 'hop'); console.log('hop', JSON.stringify(r2)); ok(r2.ok && r2.score > 0, 'keyboard pilot parks on the pad in First hop');
const r3 = await drive(D.page, 'drift', () => { const s = window.RoadsterGame.state(); return s && s.got.filter(Boolean).length >= 1 && s.t > 14; }, '3-space-drive-earth.png'); console.log('drift', JSON.stringify(r3));
ok(r3.ok && r3.score > 0, 'keyboard pilot collects every star and docks in First drift');
await D.page.keyboard.press('n'); await D.page.waitForTimeout(200); ok(await D.page.evaluate(() => window.RoadsterGame.level() === 'flyby'), 'N goes to the next level');
await D.page.keyboard.press('p'); ok(await D.page.evaluate(() => !document.getElementById('paused').hidden), 'P pauses'); await D.page.keyboard.press('p');
await D.page.click('#back'); ok(await D.page.evaluate(() => !document.getElementById('screen-title').hidden), 'Back returns to the title');
// 3. Daily Drop: one scored run, then the share card on the result screen.
await D.page.evaluate(() => { window.RoadsterGame.last = null; }); await D.page.click('#daily-play'); await D.page.waitForFunction(() => window.RoadsterGame.state()); await D.page.evaluate(PILOT);
await D.page.waitForFunction(() => window.RoadsterGame.last, null, {timeout: 400000, polling: 250}); const dr = await D.page.evaluate(() => window.RoadsterGame.last); console.log('daily', JSON.stringify(dr));
ok(dr.daily && dr.ok, 'the pilot finishes today\'s Daily Drop');
ok(await D.page.evaluate(() => !document.getElementById('daily-result').hidden && /Roadster Daily Drop #\d+/.test(document.getElementById('daily-card').textContent) && /\?daily/.test(document.getElementById('daily-card').textContent)), 'share card and countdown on the result screen');
ok(await D.page.evaluate(() => !!window.RoadsterGame.dailyRecord()), 'the scored run is kept for today');
await D.ctx.close();
// 4. Phone: the layout fits, and the touch buttons drive the car.
const M = await open({width: 390, height: 844});
ok(M.errors.length === 0, 'phone loads with no console errors');
ok(await M.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'no sideways scroll on a phone');
await M.page.evaluate(() => { document.querySelector('[data-level="hop"]').click(); document.getElementById('play').click(); });
const btn = M.page.locator('.pad [data-hold="up"]:not([hidden])'); const box = await btn.boundingBox(); await M.page.mouse.move(box.x + 10, box.y + 10); await M.page.mouse.down(); await M.page.waitForTimeout(500); await M.page.mouse.up();
ok(await M.page.evaluate(() => window.RoadsterGame.state().lift > 0.3), 'holding the Lift button raises the lift thrusters');
ok(await M.page.evaluate(() => document.querySelectorAll('.pad button:not([hidden])').length === 8), 'the phone pad shows the eight buttons for this mode');
await M.ctx.close();
ok(allErrors.length === 0, 'no console errors in any run ' + JSON.stringify(allErrors));
await browser.close(); console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
