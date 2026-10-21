// Headless Chromium checks with a mocked adsb.lol: catch, not airborne, same day duplicate, rarity reveal,
// hangar updates, export and import, no overflow at 390px, no console errors. Also writes screenshots.
// Run from the site root with a static server on BASE, for example:
//   python3 -m http.server 18660 --bind 127.0.0.1 &  node callsign-catch/tests/browser.mjs
// Needs playwright-core (PW_MODULE=/path/to/playwright-core/index.js) and a Chromium (CHROMIUM=/path). SHOTS=dir for screenshots.
import fs from 'fs'; import path from 'path';
// PAGE can point at a raw.githack preview, for example PAGE=https://raw.githack.com/<user>/<repo>/<hash>/callsign-catch/index.html
const BASE = process.env.BASE || 'http://127.0.0.1:18660', PAGE = process.env.PAGE || BASE + '/callsign-catch/', ORIGIN = PAGE.replace(/\/callsign-catch\/.*$/, '');
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
  HELI: {hex: '400777', flight: 'HELI    ', r: 'G-HELI', alt_baro: 1500, gs: 110, category: 'A7', seen: 1},
  DRN1: {hex: '43c0a1', flight: 'DRN1    ', r: 'ZZ001', t: 'Q9', alt_baro: 9000, gs: 150, dbFlags: 1, seen: 1},
  SQK1: {hex: '400778', flight: 'SQK1    ', r: 'G-SQKA', t: 'A319', alt_baro: 7000, gs: 250, squawk: '7700', seen: 1},
  RRR1: {hex: '43c0ee', flight: 'RRR1    ', r: 'XX177', t: 'HAWK', alt_baro: 4000, gs: 300, dbFlags: 1, seen: 1},
  BTLE21: {hex: '4984ee', flight: 'BTLE21  ', alt_baro: 8000, gs: 300, seen: 1},
  CZM1: {hex: '498421', flight: 'CZM1    ', alt_baro: 9000, gs: 320, seen: 1},
  RRR2: {hex: '43c9ff', flight: 'RRR2    ', r: 'ZK010', t: 'HAWK', alt_baro: 5000, gs: 320, dbFlags: 1, seen: 1}};
let calls = 0;
async function open(viewport) {
  const ctx = await browser.newContext({viewport, deviceScaleFactor: 1, acceptDownloads: true, colorScheme: process.env.SCHEME || 'dark'}); const page = await ctx.newPage(), errors = [];
  page.on('console', m => { if (m.type() === 'error' && !/cloudflareinsights|ERR_FAILED/.test(m.text())) errors.push(m.text()); }); page.on('pageerror', e => errors.push(String(e)));
  await ctx.route(u => !u.href.startsWith(ORIGIN), r => {
    const u = r.request().url();
    if (/raw\.githubusercontent\.com|githack\.com/.test(u)) return r.continue();
    if (/hexdb\.io/.test(u)) return r.fulfill({status: 404, headers: {'access-control-allow-origin': '*'}, body: ''});
    if (/workers\.dev\/board/.test(u)) return r.fulfill({status: 200, contentType: 'application/json', headers: {'access-control-allow-origin': '*'}, body: '{"today":[],"alltime":[]}'});
    // The Worker's Planespotters relay: a photo for the A380 by hex, nothing for the rest.
    if (/workers\.dev\/photos\//.test(u)) return r.fulfill({status: 200, contentType: 'application/json', headers: {'access-control-allow-origin': '*'}, body: JSON.stringify({photos: /hex\/4005c1$/.test(u) ? [{thumbnail_large: {src: 'https://t.plnspttrs.net/1/1990925_test_280.jpg'}, link: 'https://www.planespotters.net/photo/1990925/g-xlea?utm_source=api', photographer: 'Test Spotter'}] : []})});
    if (/t\.plnspttrs\.net\//.test(u)) return r.fulfill({status: 200, contentType: 'image/webp', body: fs.readFileSync(new URL('../img/cards/A388.webp', import.meta.url))});
    const m = u.match(/(?:api\.adsb\.lol|workers\.dev)\/v2\/(callsign|reg|hex)\/([^/?]+)/);
    if (!m) return r.abort(); calls++;
    const a = Object.values(AC).find(x => (m[1] === 'callsign' ? x.flight.trim() : m[1] === 'reg' ? x.r : x.hex).toUpperCase() === decodeURIComponent(m[2]).toUpperCase());
    return r.fulfill({status: 200, contentType: 'application/json', headers: {'access-control-allow-origin': '*'}, body: JSON.stringify({ac: a ? [a] : [], now: Date.now()})});
  });
  await page.addInitScript(() => { window.__ccFast = true; });
  await page.goto(PAGE, {waitUntil: 'load'});
  if (await page.$('.url-action-button')) await Promise.all([page.waitForNavigation(), page.click('.url-action-button')]);
  await page.waitForFunction(() => window.CallsignCatch && window.CallsignCatch.ready);
  await page.evaluate(() => { localStorage.clear(); }); await page.reload(); await page.waitForFunction(() => window.CallsignCatch && window.CallsignCatch.ready);
  return {ctx, page, errors};
}
const go = async (page, cs) => { await page.evaluate(() => window.CallsignCatch.resetGap()); await page.fill('#cs', cs); await page.click('#go'); await page.waitForFunction(() => !/Listening/.test(document.getElementById('status').textContent)); await page.waitForTimeout(150); return page.textContent('#status'); };
const closeReveal = async page => { if (await page.isVisible('#reveal')) await page.click('#close'); };
for (const [label, vp] of [['desktop', {width: 1366, height: 900}], ['phone', {width: 390, height: 844}]]) {
  const {ctx, page, errors} = await open(vp);
  ok(await page.$eval('.dexm-homebar', e => !!e) && /adsb\.lol/.test(await page.textContent('.credit')), `${label}: homebar and adsb.lol credit`);
  const boardText = () => page.$$eval('#flapboard .flap', c => c.map(x => x.textContent).join('').trim());
  let s = await go(page, 'BAW1');
  ok(/Caught/.test(s) && await page.isVisible('#reveal'), `${label}: live A380 is caught and revealed`);
  ok(await boardText() === 'CAUGHT' && await page.$eval('#sound', b => b.getAttribute('aria-pressed') === 'false' && /off/i.test(b.textContent)), `${label}: board says CAUGHT and sound is off by default`);
  ok((await page.$$eval('#wanted-flap .flap', c => c.map(x => x.textContent).join(''))).replace(/\s+/g, ' ').trim().length > 3, `${label}: wanted plane on the flap board`);
  await page.waitForTimeout(1600);
  ok(await page.$eval('#reveal', d => d.classList.contains('tier-rare') && d.classList.contains('go')), `${label}: reveal glows rare for the A380`);
  ok(/37,000 ft/.test(await page.textContent('#reveal-card')) && /British Airways/.test(await page.textContent('#reveal-card')), `${label}: card carries altitude and operator`);
  ok(await page.$eval('#reveal-card img.photo', i => i.src.startsWith('https://t.plnspttrs.net/') && i.complete && i.naturalWidth > 0) && /Test Spotter/.test(await page.textContent('#reveal-card .cc-credit')) && await page.$eval('#reveal-card .cc-credit a', a => a.href.startsWith('https://www.planespotters.net/photo/')), `${label}: exact airframe photo shows with its credit and link`);
  ok(await page.$eval('#reveal-card .cc-photo', e => { const t = e.querySelector('.cc-title').getBoundingClientRect(), b = e.getBoundingClientRect(); return t.bottom <= b.bottom + 0.5 && t.top >= b.top; }), `${label}: card name sits inside the photo, not over the frame`);
  await page.screenshot({path: path.join(SHOTS, `${label}-reveal-rare.png`)});
  await closeReveal(page);
  ok(await page.$eval('#hangar', h => !!h.querySelector('.cc-card[data-code="A388"]:not(.empty)')), `${label}: hangar shows the A380 as owned`);
  ok(await page.$eval('.cc-card[data-code="A388"] img.photo', i => /plnspttrs/.test(i.src)), `${label}: hangar keeps the photo of the plane you caught`);
  ok(await page.textContent('#stat-types') === '1' && await page.textContent('#stat-points') === '60', `${label}: counts and points update`);
  s = await go(page, 'BAW1'); ok(/already caught/.test(s), `${label}: same callsign twice in a day is refused`);
  const before = calls; s = await go(page, 'BAW1'); ok(calls === before, `${label}: a same day repeat makes no lookup`);
  s = await go(page, 'EZY9'); ok(/on the ground/.test(s) && !(await page.isVisible('#reveal')), `${label}: on the ground is no catch`);
  ok(await boardText() === 'NOT AIRBORNE', `${label}: departures board says NOT AIRBORNE`);
  s = await go(page, 'NOPE1'); ok(/can't hear/.test(s), `${label}: not found is a friendly message`);
  await go(page, 'BAW2'); await closeReveal(page); s = await go(page, 'BAW3');
  ok(/Another/.test(s) && await page.$eval('.cc-card[data-code="A320"] .cc-count', e => e.textContent.includes('2')), `${label}: duplicate type adds XP and a tally`);
  ok(await page.$eval('.cc-card[data-code="A320"]', c => { const i = c.querySelector('img.photo'), cr = c.querySelector('.cc-credit'); return !!i && i.src.includes('/img/photos/A320.webp') && !!cr && /CC|Public domain/i.test(cr.textContent) && !!cr.querySelector('a[href^="https://commons.wikimedia.org/"]'); }), `${label}: type photo from Commons carries its credit and licence`);
  ok(+(await page.textContent('#stat-xp')) > 0, `${label}: XP counted`); await closeReveal(page);
  await go(page, 'RRR1'); await page.waitForTimeout(1600);
  ok(await page.$eval('#reveal', d => d.classList.contains('tier-legendary')), `${label}: display team Hawk is legendary`);
  ok(await page.textContent('#reveal-card .cc-team') === 'Red Arrows' && !(await page.$('#reveal-card .cc-team img')), `${label}: Red Arrows airframe shows a text team badge`);
  await page.screenshot({path: path.join(SHOTS, `${label}-reveal-legendary.png`)});
  ok(await page.isHidden('#reward'), `${label}: reward stays hidden with no code`);
  await closeReveal(page);
  await go(page, 'RRR2'); ok(!(await page.$('#reveal-card .cc-team')), `${label}: a training Hawk on RRR gets no team badge`); await closeReveal(page);
  ok(/1\/1/.test(await page.textContent('#sets [data-set="display"]')), `${label}: Display teams set counts only the team jet`);
  const wide = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  ok(wide <= 0, `${label}: no horizontal overflow (${wide})`);
  ok(await page.isVisible('#board'), `${label}: leaderboard shown now LEADERBOARD_API is set`);
  ok(await page.evaluate(async () => { await document.fonts.ready; return document.fonts.check('20px Bungee') && [...document.fonts].some(f => f.family.includes('Bungee') && f.status === 'loaded'); }), `${label}: self hosted display font loads`);
  ok(await page.$$eval('#sets .set .badge', b => b.length >= 6) && await page.$eval('#sets .set', b => b.style.getPropertyValue('--p') !== ''), `${label}: sets show as progress badges`);
  ok(await page.$eval('#sparks', c => c.tagName === 'CANVAS') && await page.$eval('.console-top', e => /radar live/i.test(e.textContent)), `${label}: spark canvas and catch console are there`);
  await page.evaluate(() => document.getElementById('hangar-h').scrollIntoView());
  await page.screenshot({path: path.join(SHOTS, `${label}-hangar.png`)});
  if (label === 'desktop') {
    const nTypes = await page.textContent('#stat-types');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#export')]);
    const file = path.join(SHOTS, 'export.json'); await dl.saveAs(file);
    const data = JSON.parse(fs.readFileSync(file, 'utf8')); ok(data.cards.A388 && data.cards.A320.count === 2, 'export writes the collection');
    await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForFunction(() => window.CallsignCatch && window.CallsignCatch.ready);
    ok(await page.textContent('#stat-types') === '0', 'cleared collection');
    await page.setInputFiles('#import', file); await page.waitForFunction(n => document.getElementById('stat-types').textContent === n, nTypes);
    ok(true, 'import restores the collection');
    await page.setInputFiles('#import', {name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"v":9}')});
    await page.waitForFunction(() => /doesn't look/.test(document.getElementById('status').textContent)); ok(await page.textContent('#stat-types') === nTypes, 'bad import is refused and keeps the collection');
    await page.goto(PAGE + '?cs=baw1'); await page.waitForFunction(() => window.CallsignCatch && window.CallsignCatch.ready);
    ok(await page.inputValue('#cs') === 'BAW1' && /overhead/.test(await page.textContent('#status')), '?cs= deep link fills the callsign without a lookup');
    await page.evaluate(() => window.CallsignCatch.resetGap(-1)); await page.fill('#cs', 'NOPE2'); await page.click('#go'); await page.waitForTimeout(200);
    await page.fill('#cs', 'NOPE3'); await page.click('#go'); await page.waitForTimeout(100);
    ok(/One lookup every/.test(await page.textContent('#status')), 'submits are rate limited');
  }
  ok(errors.length === 0, `${label}: no console errors ${JSON.stringify(errors)}`);
  await go(page, 'BTLE21'); ok(await page.$eval('#reveal-card .cc-card', c => c.dataset.code === 'L39') && /L-39NG/.test(await page.textContent('#reveal-card')), `${label}: blank type 4984EE becomes the L-39 card`); await closeReveal(page);
  await go(page, 'CZM1'); ok(await page.textContent('#reveal-card .cc-origin') === 'Czechia military', `${label}: unidentified military jet shows its country`); await closeReveal(page);
  // Unknown, drone and squawk catches, then every caught card must show a loaded picture.
  const imgsOk = sel => page.$$eval(sel, cs => cs.map(c => { const i = c.querySelector('.cc-photo img'), sv = c.querySelector('.cc-photo svg'); return {code: c.dataset.code, ok: i ? i.complete && i.naturalWidth > 0 : !!sv, img: !!i}; }));
  const waitImgs = () => page.waitForFunction(() => [...document.querySelectorAll('.cc-card:not(.empty) .cc-photo img')].every(i => i.complete), null, {timeout: 15000}).catch(() => {});
  for (const cs of ['HELI', 'DRN1', 'SQK1']) {
    const st = await go(page, cs); await waitImgs();
    const rv = await imgsOk('#reveal-card .cc-card');
    ok(rv.length === 1 && rv[0].ok && rv[0].img, `${label}: ${cs} reveal shows a loaded image ${JSON.stringify(rv)}`);
    if (cs === 'HELI') ok(/New type discovered/.test(st) && rv[0].code === 'UNKHE' && /400777/i.test(await page.textContent('#reveal-card')), `${label}: unknown helicopter still catches, with hex and a new type bonus`);
    if (cs === 'SQK1') ok(/Legendary squawk/.test(await page.textContent('#reveal-card .cc-squawk')) && await page.$eval('#reveal-card .cc-card', c => c.classList.contains('sq')), `${label}: squawk badge shows on the card`);
    await closeReveal(page);
  }
  ok(await page.textContent('#stat-moments') === '1', `${label}: rare moments tally counts the squawk`);
  await waitImgs();
  const hang = await imgsOk('#hangar .cc-card:not(.empty)');
  ok(hang.length >= 5 && hang.every(h => h.ok && h.img), `${label}: every caught card in the hangar shows a loaded image ${JSON.stringify(hang.filter(h => !h.ok || !h.img))}`);
  await ctx.close();
}
await browser.close();
console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
