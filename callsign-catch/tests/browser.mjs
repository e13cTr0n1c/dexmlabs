// Headless Chromium checks with a mocked adsb.lol: catch, not airborne, same day duplicate, rarity reveal,
// hangar updates, export and import, no overflow at 390px, no console errors. Also writes screenshots.
// Run from the site root with a static server on BASE, for example:
//   python3 -m http.server 18660 --bind 127.0.0.1 &  node callsign-catch/tests/browser.mjs
// Needs playwright-core (PW_MODULE=/path/to/playwright-core/index.js) and a Chromium (CHROMIUM=/path). SHOTS=dir for screenshots.
import fs from 'fs'; import path from 'path';
const BASE = process.env.BASE || 'http://127.0.0.1:18660', PAGE = BASE + '/callsign-catch/';
const SHOTS = process.env.SHOTS || '/tmp/cc-shots'; fs.mkdirSync(SHOTS, {recursive: true});
const pw = await import(process.env.PW_MODULE || 'playwright-core').then(m => m.default || m);
const exe = process.env.CHROMIUM || (() => { const root = path.join(process.env.HOME, '.cache/ms-playwright'); const d = fs.existsSync(root) && fs.readdirSync(root).filter(n => /^chromium-\d+/.test(n)).sort().pop(); return d ? path.join(root, d, 'chrome-linux64/chrome') : undefined; })();
const browser = await pw.chromium.launch({executablePath: exe});
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('PASS ' + m); } else { fail++; console.log('FAIL ' + m); } };
const AC = {
  BAW1: {hex: '4005c1', flight: 'BAW1    ', r: 'G-XLEA', t: 'A388', alt_baro: 37000, gs: 488, ownOp: 'British Airways', seen: 1},
  BAW2: {hex: '4005c2', flight: 'BAW2    ', r: 'G-EUUA', t: 'A320', alt_baro: 12000, gs: 300, seen: 1},
  BAW3: {hex: '4005c3', flight: 'BAW3    ', r: 'G-EUUB', t: 'A320', alt_baro: 9000, gs: 280, seen: 1},
  EZY9: {hex: '4005c4', flight: 'EZY9    ', r: 'G-EZAA', t: 'A319', alt_baro: 'ground', gs: 3, seen: 1},
  RRR1: {hex: '43c001', flight: 'RRR1    ', r: 'XX177', t: 'HAWK', alt_baro: 4000, gs: 300, dbFlags: 1, seen: 1}};
let calls = 0;
async function open(viewport) {
  const ctx = await browser.newContext({viewport, deviceScaleFactor: 1, acceptDownloads: true, colorScheme: process.env.SCHEME || 'dark'}); const page = await ctx.newPage(), errors = [];
  page.on('console', m => { if (m.type() === 'error' && !/cloudflareinsights|ERR_FAILED/.test(m.text())) errors.push(m.text()); }); page.on('pageerror', e => errors.push(String(e)));
  await ctx.route(u => !u.href.startsWith(BASE), r => {
    const u = r.request().url();
    if (/workers\.dev\/board/.test(u)) return r.fulfill({status: 200, contentType: 'application/json', headers: {'access-control-allow-origin': '*'}, body: '{"today":[],"alltime":[]}'});
    const m = u.match(/(?:api\.adsb\.lol|workers\.dev)\/v2\/(callsign|reg|hex)\/([^/?]+)/);
    if (!m) return r.abort(); calls++;
    const a = Object.values(AC).find(x => (m[1] === 'callsign' ? x.flight.trim() : m[1] === 'reg' ? x.r : x.hex).toUpperCase() === decodeURIComponent(m[2]).toUpperCase());
    return r.fulfill({status: 200, contentType: 'application/json', headers: {'access-control-allow-origin': '*'}, body: JSON.stringify({ac: a ? [a] : [], now: Date.now()})});
  });
  await page.addInitScript(() => { window.__ccFast = true; });
  await page.goto(PAGE, {waitUntil: 'load'}); await page.waitForFunction(() => window.CallsignCatch && window.CallsignCatch.ready);
  await page.evaluate(() => { localStorage.clear(); }); await page.reload(); await page.waitForFunction(() => window.CallsignCatch && window.CallsignCatch.ready);
  return {ctx, page, errors};
}
const go = async (page, cs) => { await page.evaluate(() => window.CallsignCatch.resetGap()); await page.fill('#cs', cs); await page.click('#go'); await page.waitForFunction(() => !/Listening/.test(document.getElementById('status').textContent)); await page.waitForTimeout(150); return page.textContent('#status'); };
const closeReveal = async page => { if (await page.isVisible('#reveal')) await page.click('#close'); };
for (const [label, vp] of [['desktop', {width: 1366, height: 900}], ['phone', {width: 390, height: 844}]]) {
  const {ctx, page, errors} = await open(vp);
  ok(await page.$eval('.dexm-homebar', e => !!e) && /adsb\.lol/.test(await page.textContent('.credit')), `${label}: homebar and adsb.lol credit`);
  let s = await go(page, 'BAW1');
  ok(/Caught/.test(s) && await page.isVisible('#reveal'), `${label}: live A380 is caught and revealed`);
  await page.waitForTimeout(1600);
  ok(await page.$eval('#reveal', d => d.classList.contains('tier-rare') && d.classList.contains('go')), `${label}: reveal glows rare for the A380`);
  ok(/37,000 ft/.test(await page.textContent('#reveal-card')) && /British Airways/.test(await page.textContent('#reveal-card')), `${label}: card carries altitude and operator`);
  await page.screenshot({path: path.join(SHOTS, `${label}-reveal-rare.png`)});
  await closeReveal(page);
  ok(await page.$eval('#hangar', h => !!h.querySelector('.cc-card[data-code="A388"]:not(.empty)')), `${label}: hangar shows the A380 as owned`);
  ok(await page.textContent('#stat-types') === '1' && await page.textContent('#stat-points') === '60', `${label}: counts and points update`);
  s = await go(page, 'BAW1'); ok(/already caught/.test(s), `${label}: same callsign twice in a day is refused`);
  const before = calls; s = await go(page, 'BAW1'); ok(calls === before, `${label}: a same day repeat makes no lookup`);
  s = await go(page, 'EZY9'); ok(/on the ground/.test(s) && !(await page.isVisible('#reveal')), `${label}: on the ground is no catch`);
  s = await go(page, 'NOPE1'); ok(/can't hear/.test(s), `${label}: not found is a friendly message`);
  await go(page, 'BAW2'); await closeReveal(page); s = await go(page, 'BAW3');
  ok(/Another/.test(s) && await page.$eval('.cc-card[data-code="A320"] .cc-count', e => e.textContent.includes('2')), `${label}: duplicate type adds XP and a tally`);
  ok(+(await page.textContent('#stat-xp')) > 0, `${label}: XP counted`); await closeReveal(page);
  await go(page, 'RRR1'); await page.waitForTimeout(1600);
  ok(await page.$eval('#reveal', d => d.classList.contains('tier-legendary')), `${label}: display team Hawk is legendary`);
  await page.screenshot({path: path.join(SHOTS, `${label}-reveal-legendary.png`)});
  ok(await page.isHidden('#reward'), `${label}: reward stays hidden with no code`);
  await closeReveal(page);
  const wide = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  ok(wide <= 0, `${label}: no horizontal overflow (${wide})`);
  ok(await page.isVisible('#board'), `${label}: leaderboard shown now LEADERBOARD_API is set`);
  await page.evaluate(() => document.getElementById('hangar-h').scrollIntoView());
  await page.screenshot({path: path.join(SHOTS, `${label}-hangar.png`)});
  if (label === 'desktop') {
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#export')]);
    const file = path.join(SHOTS, 'export.json'); await dl.saveAs(file);
    const data = JSON.parse(fs.readFileSync(file, 'utf8')); ok(data.cards.A388 && data.cards.A320.count === 2, 'export writes the collection');
    await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForFunction(() => window.CallsignCatch && window.CallsignCatch.ready);
    ok(await page.textContent('#stat-types') === '0', 'cleared collection');
    await page.setInputFiles('#import', file); await page.waitForFunction(() => document.getElementById('stat-types').textContent === '3');
    ok(true, 'import restores the collection');
    await page.setInputFiles('#import', {name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"v":9}')});
    await page.waitForFunction(() => /doesn't look/.test(document.getElementById('status').textContent)); ok(await page.textContent('#stat-types') === '3', 'bad import is refused and keeps the collection');
    await page.goto(PAGE + '?cs=baw1'); await page.waitForFunction(() => window.CallsignCatch && window.CallsignCatch.ready);
    ok(await page.inputValue('#cs') === 'BAW1' && /overhead/.test(await page.textContent('#status')), '?cs= deep link fills the callsign without a lookup');
    await page.evaluate(() => window.CallsignCatch.resetGap(-1)); await page.fill('#cs', 'NOPE2'); await page.click('#go'); await page.waitForTimeout(200);
    await page.fill('#cs', 'NOPE3'); await page.click('#go'); await page.waitForTimeout(100);
    ok(/One lookup every/.test(await page.textContent('#status')), 'submits are rate limited');
  }
  ok(errors.length === 0, `${label}: no console errors ${JSON.stringify(errors)}`);
  await ctx.close();
}
await browser.close();
console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
