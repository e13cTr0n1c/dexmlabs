/** Browser regression for the second 9 October pin report: in hard mode with Set one chi wheel, edit pins on a motor
 *  wheel first by mistake, then set χ1 right. The fill must overwrite every other wheel, the motor included, and the
 *  run must read. Serves the site itself; PAGE points it elsewhere.
 *  Run: NODE_PATH=/tmp/cisbuild/node_modules node lorenz/tests/motor-ui.mjs */
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require = createRequire(process.env.NODE_PATH ? process.env.NODE_PATH + '/' : import.meta.url); const {chromium} = require('playwright-core');
const SITE = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const HD = await import('../js/hard.js'), L = await import('../js/lorenz.js'), h = HD.makeHardRound({});
const TYPES = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2'};
const server = http.createServer((q, s) => { let f = path.join(SITE, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html';
  fs.readFile(f, (e, b) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, {'content-type': TYPES[path.extname(f)] || 'application/octet-stream'}); s.end(b); }); });
await new Promise(r => server.listen(0, '127.0.0.1', r)); const PAGE = process.env.PAGE || `http://127.0.0.1:${server.address().port}/lorenz/`;
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
    // a motor wheel first, by mistake: next wheel until μ37, then raise a few pins and lower one the sheet has up
    while (await p.$eval('.face-wheel', e => e.dataset.wheel) !== 'mu37') await tap('[data-face=prev-wheel]');
    for (let n = 0; n < 6; n++) { await tap('[data-face=pin]'); await tap('[data-face=step-forward]'); }
    const strip = await p.$$eval('.strip-pin:not([aria-hidden])', x => x.map(e => e.dataset.strip)); await tap(`.strip-pin[data-strip="${strip[0]}"]:not([aria-hidden])`);
    const mu = (await S()).pins.grid.mu37; assert.notEqual(mu, h.patterns.mu37.join(''), 'the motor wheel is wrong now');
    // then χ1, all of it, on the cog
    while (await p.$eval('.face-wheel', e => e.dataset.wheel) !== 'chi1') await tap('[data-face=next-wheel]');
    const ups = h.patterns.chi1.map((v, i) => v ? i : -1).filter(i => i >= 0);
    for (const i of ups) { while (await pos() !== i) await tap('[data-face=step-forward]'); await tap('[data-face=pin]'); }
    const st = await S(); assert.equal(st.pins.grid.chi1, h.patterns.chi1.join('')); assert.equal(st.pins.auto, true, 'the fill ran');
    const off = Object.entries(st.pins.grid).filter(([k, v]) => v !== h.patterns[k].join('')).map(([k]) => k); assert.deepEqual(off, [], 'every wheel from the sheet, the touched motor too');
    await tap('#pin-face .face-extra [data-step=start]'); await setStart(); await run();
    assert.deepEqual(await tapeNow(), want, 'the run is the true tape'); assert.equal((await S()).pins.ranRight, true);
    await p.fill('#hard-answer', h.text); await tap('#hard-answer-go'); assert.match(await p.textContent('#feedback'), /^Message read/);
    assert.deepEqual(errs, []); pass++; console.log(`PASS motor first, then χ1, in the browser at ${w}`);
  } catch (e) { fail++; console.log(`FAIL motor first, then χ1, in the browser at ${w}\n  ${e.message.split('\n').slice(0, 4).join('\n  ')}`); }
  await ctx.close();
}
await b.close(); server.close(); console.log(`${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0);
