/** Browser regression for the hard practice report: on SZ40 and SZ42A, straight away and after New random settings,
 *  set χ1, let the rest fill, run on today's line and get the true tape; run on another day's line for the same QEP
 *  and be told which page that was. Serves the site itself; PAGE points it elsewhere.
 *  Run: NODE_PATH=/tmp/cisbuild/node_modules node lorenz/tests/practice-ui.mjs */
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
const ctx = await b.newContext({viewport: {width: 1440, height: 900}});
await ctx.addInitScript(() => { localStorage.setItem('dexm:storage-note-dismissed', '1'); localStorage.setItem('lorenz:difficulty', '"hard"'); });
const p = await ctx.newPage(), errs = []; p.on('pageerror', e => errs.push(e.message));
const tapeNow = () => p.$$eval('#out-tape button.frame', x => x.map(f => [...f.querySelectorAll('i.h')].map(i => i.classList.contains('on') ? 1 : 0).join('')));
const runWith = async start => { for (const [id, v] of Object.entries(start)) await p.$eval(`#dial-${id}`, (el, v) => { el.value = v; el.dispatchEvent(new Event('change', {bubbles: true})); }, String(v));
  await p.evaluate(() => document.getElementById('run-button').click()); await p.waitForTimeout(150); await p.click('#skip-button').catch(() => {}); await p.waitForTimeout(300); };
await p.goto(PAGE, {waitUntil: 'networkidle'}); await p.waitForTimeout(400); await p.click('#play-practice'); await p.waitForTimeout(400);
for (const [k, how] of [[1, 'SZ42A'], [2, 'SZ40'], [3, 'new'], [4, 'SZ42A'], [5, 'new']]) {
  const name = `practice ${how} #${k}`;
  try {
    const seed = (k * 2654435761) >>> 0, model = how === 'new' ? await p.$eval('#practice-model [aria-pressed=true]', e => e.dataset.model) : how;
    await p.evaluate(() => { if (!document.getElementById('pin-face').hidden) document.querySelector('#pin-face [data-face=back]').click(); });
    await p.evaluate(s => { const orig = Math.random; Math.random = () => { Math.random = orig; return s / 2 ** 32; }; }, seed);
    await p.click(how === 'new' ? '#practice-new' : `#practice-model [data-model=${how}]`); await p.waitForTimeout(300);
    const h = HD.makeHardRound({mode: 'practice', seed, model}), want = L.crypt(h.cipherCodes, {patterns: h.patterns, start: h.start, model: h.model}).map(c => L.bitsOf(c).join(''));
    assert.equal(await p.$$eval('#preamble-tape .frame', x => x.length), h.preamble.length);
    await p.fill('#qep-guess', String(h.qep)); await p.click('#qep-guess-go'); await p.waitForTimeout(300);
    if (await p.isHidden('#pin-face')) await p.click('#pin-open');
    for (let i = 0; i < 41; i++) { if (h.patterns.chi1[i]) await p.click('[data-face=pin]'); await p.click('[data-face=step-forward]'); }
    assert.match(await p.textContent('#feedback'), /set for you/); await p.click('#pin-face [data-face=back]');
    const other = h.pages.find(x => !x.today); await runWith(other.book.find(l => l.qep === h.qep).start);
    assert.notDeepEqual(await tapeNow(), want); assert.match(await p.textContent('#feedback'), new RegExp(`settings on the ${HD.pageDate(other.key)} page`));
    await runWith(h.start); assert.deepEqual(await tapeNow(), want, 'today\'s line, the true tape');
    pass++; console.log(`PASS ${name}`);
  } catch (e) { fail++; console.log(`FAIL ${name}\n  ${e.message.split('\n').slice(0, 4).join('\n  ')}`); }
}
if (errs.length) { fail++; console.log('FAIL page errors', errs); }
await b.close(); server.close(); console.log(`${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0);
