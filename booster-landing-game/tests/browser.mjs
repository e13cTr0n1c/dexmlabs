// Headless Chromium checks: the page loads with no console errors, a scripted pilot lands Calm through the
// real keyboard handlers, the phone buttons work, and it takes the screenshots in ../screenshots.
// Run from the site root with a static server on BASE, for example:
//   python3 -m http.server 18473 --bind 127.0.0.1 &  node booster-landing-game/tests/browser.mjs
// Needs playwright or playwright-core (PW_MODULE=/path/to/node_modules/playwright-core) and a Chromium (CHROMIUM=/path).
import fs from 'fs'; import path from 'path'; import {fileURLToPath} from 'url';
const here = path.dirname(fileURLToPath(import.meta.url)), shots = path.join(here, '..', 'screenshots');
const BASE = process.env.BASE || 'http://127.0.0.1:18473';
const pw = await import(process.env.PW_MODULE || 'playwright-core').then(m => m.default || m);
const exe = process.env.CHROMIUM || (() => { const root = path.join(process.env.HOME, '.cache/ms-playwright'); const d = fs.existsSync(root) && fs.readdirSync(root).filter(n => /^chromium-\d+/.test(n)).sort().pop(); return d ? path.join(root, d, 'chrome-linux64/chrome') : undefined; })();
const browser = await pw.chromium.launch({executablePath: exe, args: ['--autoplay-policy=no-user-gesture-required']});
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };
async function open(viewport) {
  const ctx = await browser.newContext({viewport, deviceScaleFactor: 1, hasTouch: viewport.width < 600}); const page = await ctx.newPage(), errors = [], missing = [];
  page.on('console', m => { if (m.type() === 'error' && !(m.location()?.url || '').startsWith('https://') && !/cloudflareinsights/.test(m.text())) errors.push(m.text()); }); page.on('pageerror', e => errors.push(String(e)));
  page.on('response', r => { if (r.status() >= 400 && r.url().startsWith(BASE)) missing.push(r.url()); });
  await ctx.route(u => !u.href.startsWith(BASE), r => r.abort()); // nothing leaves the box, no analytics from tests
  await page.goto(BASE + '/booster-landing-game/', {waitUntil: 'load'}); await page.waitForFunction(() => window.BoosterGame && document.querySelectorAll('[data-level]').length === 4);
  return {ctx, page, errors, missing};
}
// The pilot runs inside the page and only presses keys, 20 times a second.
const PILOT = `(async () => {
  const {decide} = await import('./tests/pilot.mjs'); const G = window.BoosterGame, held = {};
  const key = (k, down) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', {key: k, bubbles: true}));
  const hold = (k, on) => { if (!!held[k] !== on) { held[k] = on; key(k, on); } };
  window.__pilot = setInterval(() => { const s = G.state(); if (!s || s.done) { for (const k of Object.keys(held)) hold(k, false); clearInterval(window.__pilot); return; }
    const p = decide(G.world(), s); hold('q', p.rot < 0); hold('e', p.rot > 0); hold('a', p.gim < 0); hold('d', p.gim > 0);
    if (p.th === 0 && s.throttle > 0) { key('x', true); key('x', false); } else if (p.th > s.throttle + 0.03) { key('w', true); key('w', false); } else if (p.th < s.throttle - 0.03 && s.throttle > 0.4) { key('s', true); key('s', false); }
    if (p.legs && !s.legsOut) { key('l', true); key('l', false); } }, 50);
})()`;
async function flyLevel(page, id, shotAt, shotName) {
  await page.evaluate(id => { document.querySelector(`[data-level="${id}"]`).click(); document.getElementById('play').click(); }, id);
  await page.waitForFunction(() => window.BoosterGame.state()?.t > 0.2);
  await page.evaluate(PILOT);
  if (shotAt) { await page.waitForFunction(f => { const s = window.BoosterGame.state(); return s.done || f(s); }, null, {timeout: 120000, polling: 100}).catch(() => {}); }
  return page;
}
// 1. Desktop: loads clean, title screenshot.
const D = await open({width: 1440, height: 900});
ok(D.errors.length === 0, 'desktop loads with no console errors ' + JSON.stringify(D.errors));
ok(D.missing.length === 0, 'every local file resolves ' + JSON.stringify(D.missing));
ok(await D.page.evaluate(() => !!document.querySelector('.dexm-support-site') && !!document.querySelector('#result .dexm-support')), 'support buttons on the page and on the finish screen');
await D.page.screenshot({path: path.join(shots, '1-title.png')});
// 2. Scripted landing on Calm through the keyboard.
await D.page.evaluate(() => { document.querySelector('[data-level="calm"]').click(); document.getElementById('play').click(); });
await D.page.waitForFunction(() => window.BoosterGame.state()?.t > 0.2); await D.page.evaluate(PILOT);
await D.page.waitForFunction(() => { const s = window.BoosterGame.state(); return s.done || (s.throttle > 0 && s.y < 700); }, null, {timeout: 120000, polling: 100});
await D.page.waitForFunction(() => window.BoosterGame.last, null, {timeout: 120000, polling: 250});
const calm = await D.page.evaluate(() => window.BoosterGame.last); console.log('calm result', JSON.stringify(calm));
ok(calm.landed && calm.score > 0, 'scripted keyboard pilot lands Calm');
ok(await D.page.evaluate(() => !document.getElementById('result').hidden && /recovered/i.test(document.getElementById('result-head').textContent)), 'result card shows the landing');
ok(await D.page.evaluate(() => JSON.parse(localStorage.getItem('booster:stats')).best.calm > 0), 'best score kept locally');
await D.page.waitForTimeout(700); await D.page.screenshot({path: path.join(shots, '2-calm-landed.png')});
// 3. Storm: entry burn and heavy weather, screenshot mid-flight, see how the pilot does.
await D.page.evaluate(() => window.BoosterGame.last = null);
await D.page.evaluate(() => window.BoosterGame.start('storm')); await D.page.waitForFunction(() => window.BoosterGame.state()?.t > 0.2); await D.page.evaluate(PILOT);
await D.page.waitForFunction(() => { const s = window.BoosterGame.state(); return s.done || (s.y < 260 && s.throttle > 0); }, null, {timeout: 150000, polling: 100});
await D.page.locator('#sky').screenshot({path: path.join(shots, '3-storm-approach.png')});
await D.page.waitForFunction(() => window.BoosterGame.last, null, {timeout: 150000, polling: 250});
console.log('storm result', JSON.stringify(await D.page.evaluate(() => window.BoosterGame.last)));
ok(D.errors.length === 0, 'no console errors after three flights ' + JSON.stringify(D.errors));
// 4. Night, a quick look.
await D.page.evaluate(() => window.BoosterGame.start('night')); await D.page.waitForFunction(() => window.BoosterGame.state()?.t > 9, null, {timeout: 30000});
ok(await D.page.evaluate(() => window.BoosterGame.state().mach < 1), 'night starts supersonic and goes subsonic within 9 s');
await D.page.keyboard.press('p'); ok(await D.page.evaluate(() => !document.getElementById('paused').hidden), 'P pauses');
await D.page.keyboard.press('p');
await D.ctx.close();
// 5. Phone: touch buttons, no sideways overflow.
const M = await open({width: 390, height: 844});
ok(await M.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'phone title fits the width');
await M.page.tap('#play'); await M.page.waitForFunction(() => window.BoosterGame.state()?.t > 0.3);
ok(await M.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'phone flight screen fits the width');
await M.page.tap('#th-up'); ok(await M.page.evaluate(() => window.BoosterGame.state().throttle === 0.4), 'tap Throttle + lights the engine at 40%');
const b = await M.page.locator('[data-hold="rr"]').boundingBox(); await M.page.mouse.move(b.x + 10, b.y + 10); await M.page.mouse.down(); await M.page.waitForTimeout(600); await M.page.mouse.up();
ok(await M.page.evaluate(() => window.BoosterGame.state().angle > 0.05), 'holding Lean (E) leans the booster');
await M.page.screenshot({path: path.join(process.env.TMPDIR || '/tmp', 'booster-phone.png')});
ok(M.errors.length === 0, 'phone has no console errors ' + JSON.stringify(M.errors));
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
