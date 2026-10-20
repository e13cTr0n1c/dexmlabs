// Headless Chromium checks for the MMX replay: no console errors, the slider and play button drive the
// shared replay engine, every phase shows with the right status, no sideways overflow on desktop or a
// 390 px phone, a frame time check while playing, and screenshots into SHOTS.
// Run from the site root with a static server on BASE, for example:
//   python3 -m http.server 18474 --bind 127.0.0.1 &  node missions/mmx/tests/browser.mjs
// Needs playwright or playwright-core (PW_MODULE=/path/to/playwright-core/index.js) and a Chromium (CHROMIUM=/path).
import fs from 'fs'; import path from 'path';
const BASE = process.env.BASE || 'http://127.0.0.1:18474', PAGE = BASE + '/missions/mmx/';
const SHOTS = process.env.SHOTS || '/workspace/shots/missions'; fs.mkdirSync(SHOTS, {recursive: true});
const pw = await import(process.env.PW_MODULE || 'playwright-core').then(m => m.default || m);
const exe = process.env.CHROMIUM || (() => { const root = path.join(process.env.HOME, '.cache/ms-playwright'); const d = fs.existsSync(root) && fs.readdirSync(root).filter(n => /^chromium-\d+/.test(n)).sort().pop(); return d ? path.join(root, d, 'chrome-linux64/chrome') : undefined; })();
const browser = await pw.chromium.launch({executablePath: exe});
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };
const PHASES = [['launch', 'Launch', 'Happened'], ['cruise', 'Earth to Mars transfer', 'Happened'], ['moi', 'Mars orbit insertion', 'Planned'],
  ['qso', 'Phobos approach, quasi satellite orbit', 'Planned'], ['land', 'Landing and sampling', 'Planned'], ['return', 'Mars departure and Earth return', 'Planned']];
for (const [name, viewport] of [['desktop', {width: 1366, height: 900}], ['phone-390', {width: 390, height: 844}]]) {
  const ctx = await browser.newContext({viewport, deviceScaleFactor: 1, hasTouch: viewport.width < 600, reducedMotion: 'reduce'});
  const page = await ctx.newPage(), errors = [];
  page.on('console', m => { if (m.type() === 'error' && !/cloudflareinsights|ERR_FAILED/.test(m.text())) errors.push(m.text()); }); page.on('pageerror', e => errors.push(String(e)));
  await ctx.route(u => !u.href.startsWith(BASE), r => r.abort());
  await page.goto(PAGE, {waitUntil: 'load'}); await page.waitForFunction(() => window.__replay && document.querySelectorAll('#rp-phases button').length === 6);
  const read = () => page.evaluate(() => ({phase: document.querySelector('#rp-phase').textContent, status: document.querySelector('#rp-status').textContent, date: document.querySelector('#rp-date').textContent, id: document.querySelector('#replay').dataset.phase, v: +document.querySelector('#rp-slider').value}));
  let r = await read();
  ok(r.id === 'launch' && /20 Oct 2026|19 Oct 2026/.test(r.date) && r.status === 'Happened', `${name}: starts at launch, ${r.date}`);
  ok(/19 Oct 2026, 19:41:03 UTC/.test(r.date), `${name}: launch shows 19:41:03 UTC`);
  // drag the slider with the keyboard and by setting it, as a person would
  await page.focus('#rp-slider'); for (let i = 0; i < 20; i++) await page.keyboard.press('ArrowRight'); await page.waitForTimeout(80);
  r = await read(); ok(r.v === 20 && r.id === 'launch', `${name}: arrow keys move the slider (${r.v})`);
  const seen = [];
  for (let v = 0; v <= 1000; v += 25) {
    await page.$eval('#rp-slider', (s, v) => { s.value = v; s.dispatchEvent(new Event('input', {bubbles: true})); }, v); await page.waitForTimeout(25);
    r = await read(); if (!seen.length || seen[seen.length - 1].id !== r.id) seen.push(r);
  }
  ok(JSON.stringify(seen.map(s => s.id)) === JSON.stringify(PHASES.map(p => p[0])), `${name}: slider walks the phases in order ${seen.map(s => s.id)}`);
  ok(seen.every((s, i) => s.phase === PHASES[i][1] && s.status === PHASES[i][2]), `${name}: phase names and happened or planned status`);
  ok(/2031/.test(r.date), `${name}: the end of the bar is in 2031 (${r.date})`);
  // the phase buttons jump
  await page.click('#rp-phases button[data-phase=qso]'); await page.waitForTimeout(80); r = await read();
  ok(r.id === 'qso' && /Sep 2027/.test(r.date), `${name}: phase button jumps to the quasi satellite orbit (${r.date})`);
  // play and pause
  await page.click('#rp-play'); await page.waitForTimeout(700); const r2 = await read();
  ok(r2.v > r.v && await page.$eval('#rp-play', b => b.getAttribute('aria-pressed')) === 'true', `${name}: play moves time on (${r.v} to ${r2.v})`);
  await page.click('#rp-play'); const a = (await read()).v; await page.waitForTimeout(400);
  ok((await read()).v === a, `${name}: pause holds time`);
  ok(!await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), `${name}: no horizontal overflow`);
  const ft = await page.evaluate(() => new Promise(res => { __replay.seekFrac(0.3); __replay.play(); const ts = []; const f = n => { ts.push(n); if (ts.length < 120) requestAnimationFrame(f); else { __replay.pause(); const d = ts.slice(1).map((x, i) => x - ts[i]).sort((a, b) => a - b); res({med: d[d.length >> 1], p95: d[Math.floor(d.length * .95)]}); } }; requestAnimationFrame(f); }));
  ok(ft.med < 20 && ft.p95 < 40, `${name}: smooth while playing, median ${ft.med.toFixed(1)} ms, p95 ${ft.p95.toFixed(1)} ms a frame`);
  for (const [f, tag] of [[0.06, 'launch'], [0.24, 'cruise'], [0.38, 'moi'], [0.55, 'qso'], [0.75, 'land'], [0.9, 'return']]) {
    await page.evaluate(f => { __replay.pause(); __replay.seekFrac(f); scrollTo(0, 0); }, f); await page.waitForTimeout(150);
    await page.screenshot({path: path.join(SHOTS, `mmx-${name}-${tag}.png`)});
  }
  await page.screenshot({path: path.join(SHOTS, `mmx-${name}-full.png`), fullPage: true});
  ok(errors.length === 0, `${name}: no console errors ${JSON.stringify(errors)}`);
  await ctx.close();
}
await browser.close();
console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
