// Headless Chromium checks for Docking Run: no console errors, the keyboard and touch controls work, the
// scripted autopilot docks on every level through the real keyboard handlers, and the screenshots.
// From the site root, with a static server on BASE:
//   python3 -m http.server 18490 --bind 127.0.0.1 &  node docking-run-game/tests/browser.mjs
// Needs playwright-core (PW_MODULE=/path/to/playwright-core/index.mjs) and a Chromium (CHROMIUM=/path).
import fs from 'fs'; import path from 'path'; import {fileURLToPath} from 'url';
const here = path.dirname(fileURLToPath(import.meta.url)), shots = path.join(here, '..', 'screenshots');
const BASE = process.env.BASE || 'http://127.0.0.1:18490';
const pw = await import(process.env.PW_MODULE || 'playwright-core').then(m => m.default || m);
const exe = process.env.CHROMIUM || (() => { const root = path.join(process.env.HOME, '.cache/ms-playwright'); const d = fs.existsSync(root) && fs.readdirSync(root).filter(n => /^chromium-\d+/.test(n)).sort().pop(); return d ? path.join(root, d, 'chrome-linux64/chrome') : undefined; })();
const browser = await pw.chromium.launch({executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']});
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };
fs.mkdirSync(shots, {recursive: true});
async function open(viewport, scheme = 'dark') {
  const ctx = await browser.newContext({viewport, deviceScaleFactor: 1, colorScheme: scheme, hasTouch: viewport.width < 600}); const page = await ctx.newPage(), errors = [], missing = [];
  page.on('console', m => { if (m.type() === 'error' && !/cloudflareinsights|ERR_FAILED/.test(m.text() + (m.location()?.url || ''))) errors.push(m.text()); }); page.on('pageerror', e => errors.push(String(e)));
  page.on('response', r => { if (r.status() >= 400 && r.url().startsWith(BASE)) missing.push(r.url()); });
  await ctx.route(u => !u.href.startsWith(BASE), r => r.abort()); // nothing leaves the box, no analytics from tests
  await page.goto(BASE + '/docking-run-game/', {waitUntil: 'load'}); await page.waitForFunction(() => window.DockingRun && document.querySelectorAll('[data-level]').length === 5);
  return {ctx, page, errors, missing};
}
const key = (page, code, down) => page.evaluate(([c, d]) => window.dispatchEvent(new KeyboardEvent(d ? 'keydown' : 'keyup', {code: c, key: c.replace(/^Key/, '').toLowerCase(), bubbles: true})), [code, down]);
const tap = async (page, code) => { await key(page, code, true); await key(page, code, false); };

// ---- page, defaults and controls ----
{
  const {ctx, page, errors, missing} = await open({width: 1440, height: 900});
  ok(!(await page.isChecked('#sound')), 'sound is off by default');
  ok(await page.evaluate(() => !!document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.content.includes("script-src 'self'")), 'CSP keeps scripts to this site (three.js is vendored)');
  const ld = await page.evaluate(() => [...document.querySelectorAll('script[type="application/ld+json"]')].map(s => JSON.parse(s.textContent)['@type']));
  ok(ld.includes('VideoGame') && ld.includes('FAQPage'), 'structured data parses: ' + ld.join(', '));
  ok(await page.evaluate(() => !!document.querySelector('.dexm-support-site') && !!document.querySelector('#result .dexm-support-end')), 'support button above the footer and on the result screen');
  await page.screenshot({path: path.join(shots, '1-title.png')});
  await page.click('[data-level="final"]'); await page.click('#play'); await page.waitForTimeout(1500);
  ok(await page.isVisible('#keys-overlay'), 'keys overlay is shown over the view');
  await key(page, 'KeyW', true); await page.waitForTimeout(1200);
  const held = await page.evaluate(() => ({on: document.querySelector('kbd[data-key="tx+"]').classList.contains('on'), jets: [...DockingRun.sim().jets].filter(x => x > 0).length}));
  await key(page, 'KeyW', false);
  const r1 = await page.evaluate(() => DockingRun.P.rel(DockingRun.sim()));
  ok(held.jets === 4 && held.on, `holding W fires the 4 aft jets and lights the W key in the overlay (${held.jets} jets)`);
  ok(r1.closing > 0.005, `W closes on the port (${r1.closing.toFixed(4)} m/s after ~1 s of fine thrust)`);
  await tap(page, 'KeyT'); ok((await page.evaluate(() => DockingRun.state().fine)) === false, 'T switches fine to coarse');
  await tap(page, 'KeyH'); ok((await page.evaluate(() => DockingRun.state().assist)) === true, 'H switches kill rotation on');
  await page.waitForTimeout(2500); const rr = await page.evaluate(() => DockingRun.P.rel(DockingRun.sim()).rate);
  ok(rr < 0.05, `kill rotation nulls the relative rates (${rr.toFixed(3)}°/s)`); await tap(page, 'KeyH');
  await tap(page, 'KeyC'); ok((await page.evaluate(() => DockingRun.state().cam)) === 'chase', 'C switches to the chase camera'); await tap(page, 'KeyC');
  await tap(page, 'KeyP'); const tA = await page.evaluate(() => DockingRun.sim().t); await page.waitForTimeout(400); const tB = await page.evaluate(() => DockingRun.sim().t); ok(tA === tB, 'P pauses'); await tap(page, 'KeyP');
  const b = await page.$('[data-hold="ry+"]'); await b.scrollIntoViewIfNeeded(); const box = await b.boundingBox(); await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down(); await page.waitForTimeout(300);
  const pad = await page.evaluate(() => DockingRun.state().keys); await page.mouse.up(); ok(pad.includes('ry+'), 'holding a pad button fires (mouse and touch fallback)');
  await tap(page, 'Slash'); ok(!(await page.isVisible('#keys-overlay')), '? hides the keys overlay'); await tap(page, 'Slash');
  await page.evaluate(() => DockingRun.start('rendezvous')); await page.waitForTimeout(300);
  for (let i = 0; i < 6; i++) await tap(page, 'BracketRight');
  ok((await page.evaluate(() => DockingRun.state().warp)) === 100, 'time warp goes to 100× at 2 km');
  const t0 = await page.evaluate(() => DockingRun.sim().t); await page.waitForTimeout(1000); const t1 = await page.evaluate(() => DockingRun.sim().t);
  ok(t1 - t0 > 20, `warp runs the orbit faster (${(t1 - t0).toFixed(0)} s of mission time in about 1 s)`);
  ok(!errors.length && !missing.length, `no console errors or missing files (${[...errors, ...missing].join(' | ') || 'clean'})`);
  await ctx.close();
}

// ---- the autopilot docks on every level, pressing keys only ----
const PILOT = `(async () => {
  const {decide} = await import('./tests/pilot.mjs'); const held = {}, G = window.DockingRun;
  const ev = (code, down) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', {code, bubbles: true}));
  const hold = (code, on) => { if (!!held[code] !== on) { held[code] = on; ev(code, on); } };
  const AX = [['KeyW', 'KeyS'], ['KeyR', 'KeyF'], ['KeyD', 'KeyA']], RX = [['KeyO', 'KeyU'], ['KeyJ', 'KeyL'], ['KeyK', 'KeyI']];
  let n = 0;
  G.onStep = sim => { if (sim.phase !== 'fly') { for (const k of Object.keys(held)) hold(k, false); return; } if (n++ % 2) return;
    const c = decide(sim); if (c.fine !== G.state().fine) { ev('KeyT', true); ev('KeyT', false); }
    for (let i = 0; i < 3; i++) { hold(AX[i][0], c.t[i] > 0); hold(AX[i][1], c.t[i] < 0); hold(RX[i][0], c.r[i] > 0); hold(RX[i][1], c.r[i] < 0); } };
})()`;
{
  const {ctx, page, errors} = await open({width: 1440, height: 900});
  await page.evaluate(PILOT);
  for (const id of ['final', 'approach', 'tumble', 'rendezvous', 'night']) {
    await page.evaluate(i => { DockingRun.start(i); DockingRun.setScale(i === 'rendezvous' ? 80 : 25); }, id);
    let shot = null; const t0 = Date.now();
    while (Date.now() - t0 < 240000) {
      const st = await page.evaluate(() => { const s = DockingRun.sim(), r = DockingRun.P.rel(s); return {phase: s.phase, range: r.range, t: s.t, shown: !document.getElementById('result').hidden}; });
      if (id === 'final' && !shot && st.range < 7) { await page.evaluate(() => DockingRun.setScale(0)); await page.waitForTimeout(500); await page.screenshot({path: path.join(shots, '2-docking-camera.png')}); shot = 1; await page.evaluate(() => DockingRun.setScale(25)); }
      if (id === 'rendezvous' && !shot && st.range < 900) { await page.evaluate(() => DockingRun.setScale(0)); await tap(page, 'KeyC'); await page.waitForTimeout(1500); await page.screenshot({path: path.join(shots, '3-rendezvous-chase.png')}); await tap(page, 'KeyC'); shot = 1; await page.evaluate(() => DockingRun.setScale(80)); }
      if (id === 'night' && !shot && st.range < 12) { await page.evaluate(() => DockingRun.setScale(0)); await page.waitForTimeout(500); await page.screenshot({path: path.join(shots, '4-night-pass.png')}); shot = 1; await page.evaluate(() => DockingRun.setScale(25)); }
      if (st.shown) break; await page.waitForTimeout(250);
    }
    const res = await page.evaluate(() => ({phase: DockingRun.sim().phase, head: document.getElementById('result-head').textContent, text: document.getElementById('result-text').textContent, ev: DockingRun.sim().events.map(e => e.type).join(',')}));
    ok(res.phase === 'docked' && /Hard capture/.test(res.head) && /soft,retract,hard$/.test(res.ev), `${id}: autopilot docked through the keyboard: ${res.head} ${res.text.slice(0, 160)}`);
    if (id === 'tumble') await page.screenshot({path: path.join(shots, '5-hard-capture-result.png')});
  }
  const best = await page.evaluate(() => JSON.parse(localStorage.getItem('docking:stats')).best);
  ok(Object.keys(best).length === 5, 'best scores kept locally for all five runs: ' + JSON.stringify(best));
  ok(!errors.length, `no console errors during the autopilot runs (${errors.join(' | ') || 'clean'})`);
  await ctx.close();
}
// ---- phone layout ----
{
  const {ctx, page, errors} = await open({width: 390, height: 844});
  await page.click('#play'); await page.waitForTimeout(1200);
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'no sideways scroll on a phone');
  ok(!errors.length, 'no console errors on a phone'); await ctx.close();
}
// ---- Daily Drop: on the title, ?daily, one scored run then practice, the share card. The page clock is moved to 2026-10-21 (#1). ----
{
  const SHIFT = `(() => { const off = Date.parse('2026-10-21T09:00:00Z') - Date.now(), D = Date; class F extends D { constructor(...a) { a.length ? super(...a) : super(D.now() + off); } static now() { return D.now() + off; } } window.Date = F; })()`;
  const ctx = await browser.newContext({viewport: {width: 1440, height: 900}, deviceScaleFactor: 1}); await ctx.addInitScript(SHIFT); const page = await ctx.newPage(), errors = [];
  page.on('console', m => { if (m.type() === 'error' && !/cloudflareinsights|ERR_FAILED/.test(m.text() + (m.location()?.url || ''))) errors.push(m.text()); }); page.on('pageerror', e => errors.push(String(e)));
  await ctx.route(u => !u.href.startsWith(BASE), r => r.abort());
  await page.goto(BASE + '/docking-run-game/', {waitUntil: 'load'}); await page.waitForFunction(() => window.DockingRun); await page.waitForTimeout(1100);
  ok(await page.evaluate(() => { const d = document.getElementById('daily'); return /Daily Drop #1/.test(d.textContent) && !!(d.compareDocumentPosition(document.getElementById('levels')) & Node.DOCUMENT_POSITION_FOLLOWING) && /^Next drop in \d+:\d\d:\d\d$/.test(document.getElementById('daily-next').textContent); }), 'Daily Drop card above the runs, with a countdown');
  await page.screenshot({path: path.join(shots, '6-daily-title.png')});
  await page.goto(BASE + '/docking-run-game/?daily', {waitUntil: 'load'}); await page.waitForFunction(() => window.DockingRun?.sim());
  ok(await page.evaluate(() => DockingRun.sim().level.daily && !document.getElementById('flight').hidden), '?daily opens straight into the Daily Drop');
  await page.evaluate(PILOT); await page.evaluate(() => DockingRun.setScale(25));
  await page.waitForFunction(() => DockingRun.last, null, {timeout: 240000, polling: 250});
  const card = await page.evaluate(() => DockingRun.dailyCard()); console.log(card);
  await page.waitForTimeout(1200); ok(await page.evaluate(() => { const b = document.getElementById('daily-result'); return !b.hidden && b.offsetHeight > 0 && document.getElementById('daily-card').textContent === window.DockingRun.dailyCard() && /^Next drop in \d+:\d\d:\d\d$/.test(document.getElementById('daily-result-next').textContent) && document.getElementById('daily-copy').offsetHeight > 0; }), 'result screen shows the card, a Copy share card button and the countdown');
  ok(/^DEXM Docking #1 🛰️ Docked [\d.]+ cm\/s · [\d.]+ cm off · \d+% fuel\n[🟩🟨🟧🟥]{6} \d+ pts\nhttps:\/\/dexmlabs\.app\/docking-run-game\/\?daily$/u.test(card || ''), 'scored run docked and the share card is built');
  const first = await page.evaluate(() => DockingRun.dailyRecord().score); await page.evaluate(() => { DockingRun.last = null; document.getElementById('again').click(); });
  ok(await page.evaluate(() => /practice/.test(document.getElementById('flight-h').textContent)), 'flying again is practice');
  await page.evaluate(() => DockingRun.setScale(25)); await page.waitForFunction(() => DockingRun.last, null, {timeout: 240000, polling: 250});
  ok(await page.evaluate(f => DockingRun.dailyRecord().score === f, first), 'practice does not change the scored result');
  ok(!errors.length, `Daily Drop has no console errors (${errors.join(' | ') || 'clean'})`); await ctx.close();
}
await browser.close(); console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
