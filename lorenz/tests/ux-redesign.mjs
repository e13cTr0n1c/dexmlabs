/** Browser checks for the pin rows, the cheat sheet button and the walkthrough, at 1440 and 390, with screenshots in tests/screens.
 *  Run: NODE_PATH=/tmp/cisbuild/node_modules node lorenz/tests/ux-redesign.mjs */
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require = createRequire(process.env.NODE_PATH ? process.env.NODE_PATH + '/' : import.meta.url); const {chromium} = require('playwright-core');
const SITE = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..'), OUT = path.resolve(path.dirname(new URL(import.meta.url).pathname), 'screens');
const HD = await import('../js/hard.js'), h = HD.makeHardRound({});
const TYPES = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg'};
const server = http.createServer((q, s) => { let f = path.join(SITE, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html';
  fs.readFile(f, (e, b) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, {'content-type': TYPES[path.extname(f)] || 'application/octet-stream'}); s.end(b); }); });
await new Promise(r => server.listen(0, '127.0.0.1', r)); const PAGE = `http://127.0.0.1:${server.address().port}/lorenz/`;
const b = await chromium.launch({executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
let pass = 0, fail = 0;
for (const [w, ht, touch] of [[1440, 900, false], [390, 844, true]]) {
  const ctx = await b.newContext({viewport: {width: w, height: ht}, isMobile: touch, hasTouch: touch, reducedMotion: 'reduce'});
  await ctx.addInitScript(() => { localStorage.setItem('dexm:storage-note-dismissed', '1'); localStorage.setItem('lorenz:difficulty', '"hard"'); });
  const p = await ctx.newPage(), errs = []; p.on('pageerror', e => errs.push(e.message));
  const tap = s => touch ? p.tap(s) : p.click(s), shot = n => p.screenshot({path: `${OUT}/${n}-${w}.png`}), noScroll = async l => assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'horizontal scroll ' + l);
  try {
    await p.goto(PAGE, {waitUntil: 'networkidle'}); await p.waitForTimeout(500); await noScroll('title');
    // walkthrough
    const wb = await p.$eval('#walk-open', e => { const r = e.getBoundingClientRect(); return [r.width, r.height]; }); assert.ok(wb[1] >= 48 && wb[0] >= 44);
    await tap('#walk-open'); await p.waitForTimeout(200); assert.equal(await p.$eval('#walk-dialog', d => d.open), true);
    assert.equal(await p.$eval('#walk-dialog', d => getComputedStyle(d).animationName), 'none', 'reduced motion respected');
    assert.equal(await p.$eval('[data-walk=back]', e => e.disabled), true);
    const N = 7; for (let s = 1; s <= N; s++) {
      assert.match(await p.textContent('#walk-count'), new RegExp(`Step ${s} of ${N}`));
      if ([1, 3, 5, 7].includes(s)) await shot(`walkthrough-step${s}`);
      await noScroll('walk step ' + s);
      if (s < N) await tap('[data-walk=next]');
    }
    assert.equal(await p.textContent('[data-walk=next]'), 'Done');
    await tap('[data-walk=back]'); assert.match(await p.textContent('#walk-count'), /Step 6 of 7/);
    // focus trap
    for (let k = 0; k < 8; k++) { await p.keyboard.press('Tab'); assert.equal(await p.evaluate(() => Boolean(document.activeElement.closest('#walk-dialog'))), true, 'focus stays in the modal'); }
    for (let k = 0; k < 8; k++) { await p.keyboard.press('Shift+Tab'); assert.equal(await p.evaluate(() => Boolean(document.activeElement.closest('#walk-dialog'))), true); }
    await p.keyboard.press('Escape'); await p.waitForTimeout(100); assert.equal(await p.$eval('#walk-dialog', d => d.open), false);
    assert.equal(await p.evaluate(() => document.activeElement.id), 'walk-open', 'focus returns');
    // game
    await tap('#play-daily'); await p.waitForTimeout(600); await noScroll('game');
    const cb = await p.$eval('#preamble-box [data-cheat]', e => { const r = e.getBoundingClientRect(), c = getComputedStyle(e); return [r.height, c.backgroundColor, c.color]; });
    assert.ok(cb[0] >= 44); assert.equal(cb[1], 'rgb(0, 0, 0)'); assert.equal(cb[2], 'rgb(214, 255, 0)');
    await p.$eval('#preamble-box', e => e.scrollIntoView({block: 'center'})); await p.waitForTimeout(200); await shot('cheat-button');
    await p.fill('#qep-guess', String(h.qep)); await tap('#qep-guess-go'); await p.waitForTimeout(500);
    await tap('[data-face=back]'); await p.waitForTimeout(500); await noScroll('pin rows');
    await p.$eval('#pin-sheet', e => e.scrollIntoView({block: 'start'})); await p.waitForTimeout(200); await shot('pin-rows');
    const sizes = await p.$$eval('#pin-rows [data-row=chi1] .pin', xs => xs.map(x => { const r = x.getBoundingClientRect(); return Math.min(r.width, r.height); })); assert.ok(sizes.length === 41 && sizes.every(s => s >= 44), 'pin targets');
    const rowsBox = await p.$eval('#pin-rows', e => e.scrollWidth <= e.clientWidth); assert.ok(rowsBox);
    // set chi1 from the sheet by tapping pin toggles; state must match the sheet
    h.patterns.chi1.forEach(() => {}); for (const [i, v] of h.patterns.chi1.entries()) if (v) await p.click(`#pin-rows [data-row=chi1] [data-pin="${i}"]`);
    const st = JSON.parse(await p.evaluate(k => localStorage.getItem(k), `lorenz:hard:round:${h.key}`));
    assert.equal(st.pins.grid.chi1, h.patterns.chi1.join('')); assert.equal(await p.getAttribute('#pin-rows [data-row=chi1] [data-pin="0"]', 'aria-pressed'), String(Boolean(h.patterns.chi1[0])));
    await p.$eval('#pin-sheet', e => e.scrollIntoView({block: 'start'})); await shot('pin-rows-set');
    await tap('#pin-rows-open'); await noScroll('all rows open'); await shot('pin-rows-all-open');
    assert.deepEqual(errs, []); pass++; console.log(`PASS ux redesign at ${w}`);
  } catch (e) { fail++; console.log(`FAIL ux redesign at ${w}\n  ${e.stack.split('\n').slice(0, 5).join('\n  ')}`); }
  await ctx.close();
}
await b.close(); server.close(); console.log(`${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0);
