// Headless Chromium checks for Flight Path: the first visit briefing, solving today's puzzle by a simulated
// drag (with a backtrack on the way), the share text, the streak, the points award, practice mode,
// no sideways overflow on desktop or a 390 px phone, no console errors, and screenshots into SHOTS.
// Run from the site root with a static server on BASE, for example:
//   python3 -m http.server 18659 --bind 127.0.0.1 &  node flight-path/tests/browser.mjs
// Needs playwright or playwright-core (PW_MODULE=/path/to/playwright-core/index.js) and a Chromium (CHROMIUM=/path).
import fs from 'fs'; import path from 'path';
const BASE = process.env.BASE || 'http://127.0.0.1:18659', PAGE = BASE + '/flight-path/';
const SHOTS = process.env.SHOTS || '/workspace/shots/flight-path'; fs.mkdirSync(SHOTS, {recursive: true});
const pw = await import(process.env.PW_MODULE || 'playwright-core').then(m => m.default || m);
const exe = process.env.CHROMIUM || (() => { const root = path.join(process.env.HOME, '.cache/ms-playwright'); const d = fs.existsSync(root) && fs.readdirSync(root).filter(n => /^chromium-\d+/.test(n)).sort().pop(); return d ? path.join(root, d, 'chrome-linux64/chrome') : undefined; })();
const browser = await pw.chromium.launch({executablePath: exe});
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };
const today = new Date().toISOString().slice(0, 10), yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);

async function dragThrough(page, cells, {down = true, up = true} = {}) {
  const c0 = await page.evaluate(c => window.__fp.cellCenter(c), cells[0]);
  if (down) { await page.mouse.move(c0.x, c0.y); await page.mouse.down(); }
  for (const c of cells.slice(1)) { const p = await page.evaluate(c => window.__fp.cellCenter(c), c); await page.mouse.move(p.x, p.y, {steps: 3}); }
  if (up) await page.mouse.up();
}
for (const [name, viewport] of [['desktop', {width: 1366, height: 900}], ['phone-390', {width: 390, height: 844}]]) {
  const ctx = await browser.newContext({viewport, deviceScaleFactor: 2, hasTouch: viewport.width < 600, isMobile: viewport.width < 600, reducedMotion: 'no-preference', colorScheme: 'dark'});
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], {origin: BASE});
  const page = await ctx.newPage(), errors = [];
  page.on('console', m => { if (m.type() === 'error' && !/cloudflareinsights|ERR_FAILED/.test(m.text())) errors.push(m.text()); }); page.on('pageerror', e => errors.push(String(e)));
  await ctx.route(u => !u.href.startsWith(BASE), r => r.abort());
  await page.goto(PAGE, {waitUntil: 'load'});
  await page.waitForFunction(() => window.__fp && window.__fp.puzzle);
  ok(await page.evaluate(() => document.querySelector('#fp-howto').open), `${name}: how to play opens on the first visit`);
  await page.click('#fp-howto-go');
  ok(!(await page.evaluate(() => document.querySelector('#fp-howto').open)), `${name}: briefing closes`);
  // a streak of 3 ending yesterday, so solving today makes it 4
  await page.evaluate(([y]) => { localStorage.setItem('dexm:storage-note-dismissed', '1'); localStorage.setItem('flightpath:stats', JSON.stringify({streak: 3, maxStreak: 3, last: y, played: 3, best: {}, history: {[y]: 61}})); }, [yesterday]);
  await page.reload({waitUntil: 'load'}); await page.waitForFunction(() => window.__fp && window.__fp.puzzle);
  ok(!(await page.evaluate(() => document.querySelector('#fp-howto').open)), `${name}: briefing only on the first visit`);
  const pz = await page.evaluate(() => window.__fp.puzzle);
  const before = await page.evaluate(() => window.DexmPoints ? window.DexmPoints.balance() : -1);
  const sol = pz.solution, half = Math.floor(sol.length / 2);
  await page.locator('#fp-board').scrollIntoViewIfNeeded();
  const scrollY0 = await page.evaluate(() => scrollY);
  // fly half way, back three squares, then on again: the path must follow
  await dragThrough(page, sol.slice(0, half + 1), {up: false});
  await dragThrough(page, [sol[half], sol[half - 1], sol[half - 2], sol[half - 3]], {down: false, up: false});
  let p = await page.evaluate(() => window.__fp.path);
  ok(p.length === half - 2 && p.every((c, i) => c === sol[i]), `${name}: dragging back rubs the path out (${p.length} of ${half - 2})`);
  await dragThrough(page, sol.slice(half - 3, half + 1), {down: false, up: false});
  p = await page.evaluate(() => window.__fp.path);
  ok(p.length === half + 1, `${name}: drag carries on after a backtrack (${p.length})`);
  await page.waitForTimeout(250);
  await page.screenshot({path: `${SHOTS}/${name}-mid.png`});
  ok(await page.evaluate(() => scrollY) === scrollY0, `${name}: the page does not scroll while dragging`);
  await page.mouse.up();
  // tap the head to undo one step
  const hc = await page.evaluate(c => window.__fp.cellCenter(c), sol[half]);
  await page.mouse.click(hc.x, hc.y);
  ok((await page.evaluate(() => window.__fp.path.length)) === half, `${name}: tapping the plane undoes one step`);
  await dragThrough(page, sol.slice(half - 1));
  ok(await page.evaluate(() => window.__fp.solved), `${name}: solved by dragging`);
  await page.waitForTimeout(700); await page.screenshot({path: `${SHOTS}/${name}-flight.png`});
  await page.waitForSelector('#fp-win:not([hidden])', {timeout: 8000});
  await page.waitForTimeout(500);
  await page.screenshot({path: `${SHOTS}/${name}-win.png`});
  const share = await page.evaluate(() => window.__fp.shareText());
  ok(/^Flight Path #\d+ \u2708 \d+:\d\d \uD83D\uDFE9 dexmlabs\.app\/flight-path\/$/.test(share), `${name}: spoiler-free share text: ${share}`);
  await page.click('#fp-share');
  const clip = await page.evaluate(() => navigator.clipboard.readText()).catch(() => '');
  ok(clip === share, `${name}: share button copies the result`);
  ok((await page.textContent('#fp-streak')) === '4', `${name}: streak goes from 3 to 4`);
  const st = await page.evaluate(() => JSON.parse(localStorage.getItem('flightpath:stats')));
  ok(st.history[today] > 0 && st.best[pz.n] > 0 && st.played === 4, `${name}: history and best time saved`);
  const after = await page.evaluate(() => window.DexmPoints ? window.DexmPoints.balance() : -1);
  ok(after - before === 100, `${name}: today's puzzle earns 100 points (${before} to ${after})`);
  // already solved: a reload shows the result, and the streak stays put
  await page.reload({waitUntil: 'load'}); await page.waitForFunction(() => window.__fp && window.__fp.puzzle);
  ok(await page.evaluate(() => window.__fp.solved && !document.querySelector('#fp-win').hidden), `${name}: today's result stays after a reload`);
  ok((await page.textContent('#fp-streak')) === '4', `${name}: the streak counts once a day`);
  // practice
  await page.click('#fp-next');
  const pp = await page.evaluate(() => window.__fp.puzzle);
  ok(await page.evaluate(() => window.__fp.mode === 'practice' && !window.__fp.solved), `${name}: practice gives a fresh puzzle`);
  await page.locator('#fp-board').scrollIntoViewIfNeeded(); await dragThrough(page, pp.solution);
  ok(await page.evaluate(() => window.__fp.solved), `${name}: practice solved`);
  // a weekend puzzle with walls, half flown, for the screenshots
  await page.goto(PAGE + '?date=2026-10-25', {waitUntil: 'load'}); await page.waitForFunction(() => window.__fp && window.__fp.puzzle);
  const wp = await page.evaluate(() => window.__fp.puzzle);
  ok(wp.n === 7 && wp.walls.length > 0, `${name}: Sunday is 7x7 with walls (${wp.walls.length})`);
  await page.locator('#fp-board').scrollIntoViewIfNeeded();
  await dragThrough(page, wp.solution.slice(0, 20)); await page.waitForTimeout(300);
  await page.screenshot({path: `${SHOTS}/${name}-walls-mid.png`});
  const ow = await page.evaluate(() => ({sw: document.documentElement.scrollWidth, w: innerWidth}));
  ok(ow.sw <= ow.w, `${name}: no sideways overflow (${ow.sw} <= ${ow.w})`);
  ok(!errors.length, `${name}: no console errors ${errors.join(' | ')}`);
  await ctx.close();
}
// reduced motion: no win flight, the result shows at once
{
  const ctx = await browser.newContext({viewport: {width: 390, height: 844}, reducedMotion: 'reduce', colorScheme: 'light'}), page = await ctx.newPage();
  await ctx.route(u => !u.href.startsWith(BASE), r => r.abort());
  await page.goto(PAGE + '?nohelp', {waitUntil: 'load'}); await page.waitForFunction(() => window.__fp && window.__fp.puzzle);
  const sol = await page.evaluate(() => window.__fp.puzzle.solution);
  await dragThrough(page, sol);
  ok(await page.evaluate(() => !document.querySelector('#fp-win').hidden), 'reduced motion: the result shows straight away');
  await ctx.close();
}
await browser.close();
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
