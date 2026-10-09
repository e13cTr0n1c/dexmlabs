/** Browser regression for the 9 October pin report: set χ1 on the cog and the strip in real Chrome, spin it, run the
 *  tape too early, fix the pins, and check the old tape goes and the new run reads. Serves the site itself.
 *  Run: NODE_PATH=/tmp/cisbuild/node_modules node lorenz/tests/pins-ui.mjs */
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require = createRequire(process.env.NODE_PATH ? process.env.NODE_PATH + '/' : import.meta.url); const {chromium} = require('playwright-core');
const SITE = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const HD = await import('../js/hard.js'), L = await import('../js/lorenz.js'), h = HD.makeHardRound({});
const TYPES = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2'};
const server = http.createServer((q, s) => { let f = path.join(SITE, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html';
  fs.readFile(f, (e, b) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, {'content-type': TYPES[path.extname(f)] || 'application/octet-stream'}); s.end(b); }); });
await new Promise(r => server.listen(0, '127.0.0.1', r)); const PAGE = `http://127.0.0.1:${server.address().port}/lorenz/`;
const b = await chromium.launch({executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
let pass = 0, fail = 0;
for (const [w, ht, touch] of [[1440, 900, false], [390, 844, true]]) {
  const ctx = await b.newContext({viewport: {width: w, height: ht}, isMobile: touch, hasTouch: touch});
  await ctx.addInitScript(() => { localStorage.setItem('dexm:storage-note-dismissed', '1'); localStorage.setItem('lorenz:difficulty', '"hard"'); });
  const p = await ctx.newPage(), errs = []; p.on('pageerror', e => errs.push(e.message));
  try {
    const tap = s => touch ? p.tap(s) : p.click(s), key = `lorenz:hard:round:${h.key}`, S = async () => JSON.parse(await p.evaluate(k => localStorage.getItem(k), key));
    const pos = () => p.$eval('.face-wheel', e => Number(e.dataset.pos)), tapeNow = () => p.$$eval('#out-tape button.frame', x => x.map(f => [...f.querySelectorAll('i.h')].map(i => i.classList.contains('on') ? 1 : 0).join('')));
    const want = L.crypt(h.cipherCodes, {patterns: h.patterns, start: h.start, model: h.model}).map(c => L.bitsOf(c).join(''));
    const setStart = async () => { for (const [id, v] of Object.entries(h.start)) await p.$eval(`#dial-${id}`, (el, v) => { el.value = v; el.dispatchEvent(new Event('change', {bubbles: true})); }, String(v)); };
    const run = async () => { await tap('#guide-nav [data-step=run]'); await p.waitForTimeout(200); await p.click('#skip-button').catch(() => {}); await p.waitForTimeout(400); };
    await p.goto(PAGE, {waitUntil: 'networkidle'}); await p.waitForTimeout(500); await tap('#play-daily'); await p.waitForTimeout(500);
    await p.fill('#qep-guess', String(h.qep)); await tap('#qep-guess-go'); await p.waitForTimeout(400);
    // spin: back twice, forward once, a drag round the cog
    await tap('[data-face=step-back]'); await tap('[data-face=step-back]'); await tap('[data-face=step-forward]'); assert.equal(await pos(), 40);
    const bx = await p.$eval('.face-wheel', e => { const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2, r.width]; });
    await p.mouse.move(bx[0] + bx[2] * .3, bx[1] - bx[2] * .3); await p.mouse.down(); await p.mouse.move(bx[0] + bx[2] * .35, bx[1] + bx[2] * .1, {steps: 6}); await p.mouse.up();
    const ups = h.patterns.chi1.map((v, i) => v ? i : -1).filter(i => i >= 0);
    for (const [n, i] of ups.slice(0, -1).entries()) { while (await pos() !== i) await tap('[data-face=step-forward]'); await tap(n % 2 ? '[data-face=pin]' : '.strip-pin.cur'); }
    assert.equal((await S()).pins.auto, false);
    await tap('#pin-face .face-extra [data-step=start]'); await setStart(); await run();
    assert.notDeepEqual(await tapeNow(), want); assert.match(await p.textContent('#feedback'), /still blank/);
    await tap('#guide-nav [data-step=pins]'); await p.waitForTimeout(300);
    while (await pos() !== ups.at(-1)) await tap('[data-face=step-back]');
    await tap('[data-face=pin]'); const st = await S();
    assert.equal(st.pins.grid.chi1, h.patterns.chi1.join('')); assert.equal(st.pins.auto, true); assert.equal(st.ran, null);
    assert.ok(Object.entries(st.pins.grid).every(([k, v]) => v === h.patterns[k].join('')), 'every wheel from the sheet');
    assert.equal((await tapeNow()).length, 0, 'the old tape is gone');
    await tap('#pin-face .face-extra [data-step=start]'); await run();
    assert.deepEqual(await tapeNow(), want, 'the new run is the true tape'); assert.equal((await S()).pins.ranRight, true);
    await p.fill('#hard-answer', h.text); await tap('#hard-answer-go'); assert.match(await p.textContent('#feedback'), /^Message read\./);
    assert.deepEqual(errs, []); pass++; console.log(`PASS pins in the browser at ${w}`);
  } catch (e) { fail++; console.log(`FAIL pins in the browser at ${w}\n  ${e.message.split('\n').slice(0, 4).join('\n  ')}`); }
  await ctx.close();
}
await b.close(); server.close(); console.log(`${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0);
