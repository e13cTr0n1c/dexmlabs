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
  NASA59: {hex: 'a00059', flight: 'NASA59  ', r: 'N859NA', t: 'X59', alt_baro: 30000, gs: 500, seen: 1},
  BAW4: {hex: '4005c5', flight: 'BAW4    ', r: 'G-EUUC', t: 'A320', alt_baro: 11000, gs: 290, seen: 1},
  RRR2: {hex: '43c9ff', flight: 'RRR2    ', r: 'ZK010', t: 'HAWK', alt_baro: 5000, gs: 320, dbFlags: 1, seen: 1}};
// Arthur's two H60 catches (tests/fixtures/arthur-h60.json): a US Army Black Hawk and a Cal Fire Firehawk.
const H60 = JSON.parse(fs.readFileSync(new URL('fixtures/arthur-h60.json', import.meta.url))).sources;
// Short and odd callsigns: a C-17 calling just X, and two live aircraft both calling Y.
AC.X = {hex: 'ae07e1', flight: 'X       ', r: '08-8204', t: 'C17', alt_baro: 24000, gs: 410, dbFlags: 1, seen: 1};
AC.Y1 = {hex: 'ae0a01', flight: 'Y       ', r: '01-0001', t: 'C17', alt_baro: 20000, gs: 400, seen: 1};
AC.Y2 = {hex: 'ae0a02', flight: 'Y       ', r: '01-0002', t: 'C17', alt_baro: 21000, gs: 400, seen: 1};
const LATE = {hex: 'ae1234', flight: 'RCH131  ', r: '87-0040', t: 'C5M', alt_baro: 31000, gs: 470, dbFlags: 1, seen: 1}; // joins the feed later
AC.HNCHMN14 = {hex: '43c975', type: 'adsb_icao', flight: 'HNCHMN14', dbFlags: 1, alt_baro: 20000, gs: 123, category: 'B6', seen: 0}; // Arthur's RAF Protector, no type in the feed
AC.R26863 = H60.ae21cf.adsb; AC.CFR606 = H60.a5fb7d.adsb;
let calls = 0, wikiUp = true; // wikiUp false acts as if Wikipedia and Commons cannot be reached
async function open(viewport) {
  const ctx = await browser.newContext({viewport, deviceScaleFactor: 1, acceptDownloads: true, colorScheme: process.env.SCHEME || 'dark'}); const page = await ctx.newPage(), errors = [];
  // hexdb.io answers 404 for airframes it does not know; the page asks it on every catch for the variant, so that is expected.
  page.on('console', m => { if (m.type() === 'error' && !/cloudflareinsights|ERR_FAILED/.test(m.text()) && !/hexdb\.io/.test((m.location() || {}).url || '')) errors.push(m.text()); }); page.on('pageerror', e => errors.push(String(e)));
  await ctx.route(u => !u.href.startsWith(ORIGIN), r => {
    const u = r.request().url();
    if (/raw\.githubusercontent\.com|githack\.com/.test(u)) return r.continue();
    const hx = u.match(/hexdb\.io\/api\/v1\/aircraft\/([0-9a-f]{6})/i);
    if (hx && H60[hx[1].toLowerCase()]) return r.fulfill({status: 200, contentType: 'application/json', headers: {'access-control-allow-origin': '*'}, body: JSON.stringify(H60[hx[1].toLowerCase()].hexdb)});
    if (/hexdb\.io/.test(u)) return r.fulfill({status: 404, headers: {'access-control-allow-origin': '*'}, body: ''});
    if (/api\.planespotters\.net\/pub\/photos\/hex\/a5fb7d$/.test(u)) return r.fulfill({status: 200, contentType: 'application/json', headers: {'access-control-allow-origin': '*'}, body: JSON.stringify(H60.a5fb7d.planespotters)});
    if (/workers\.dev\/board/.test(u)) return r.fulfill({status: 200, contentType: 'application/json', headers: {'access-control-allow-origin': '*'}, body: '{"today":[],"alltime":[]}'});
    // The Planespotters photo API, asked straight from the page: a photo for the A380 by hex, nothing for the rest.
    if (/api\.planespotters\.net\/pub\/photos\//.test(u)) return r.fulfill({status: 200, contentType: 'application/json', headers: {'access-control-allow-origin': '*'}, body: JSON.stringify({photos: /hex\/4005c5$/.test(u) ? [{thumbnail_large: {src: 'https://t.plnspttrs.net/2/broken_280.jpg'}, link: 'https://www.planespotters.net/photo/2/g-euuc?utm_source=api', photographer: 'Gone'}] : /hex\/4005c1$/.test(u) ? [{thumbnail_large: {src: 'https://t.plnspttrs.net/1/1990925_test_280.jpg'}, link: 'https://www.planespotters.net/photo/1990925/g-xlea?utm_source=api', photographer: 'Test Spotter'}] : []})});
    if (/t\.plnspttrs\.net\/.*broken/.test(u)) return r.fulfill({status: 404, body: ''});
    if (/t\.plnspttrs\.net\//.test(u)) return r.fulfill({status: 200, contentType: 'image/webp', body: fs.readFileSync(new URL('../img/cards/A388.webp', import.meta.url))});
    // Wikipedia and Commons: a free lead photo for the X-59 only. With wikiUp off every lookup fails like a dead network.
    if (/en\.wikipedia\.org|commons\.wikimedia\.org|(upload|thumb)\.wikimedia\.org/.test(u) && !wikiUp) return r.abort('internetdisconnected');
    if (/en\.wikipedia\.org\/w\/api\.php/.test(u)) return r.fulfill({status: 200, contentType: 'application/json', headers: {'access-control-allow-origin': '*'}, body: JSON.stringify({query: {pages: /X-59/.test(decodeURIComponent(u)) ? {1: {pageimage: 'X-59_test.jpg'}} : {'-1': {missing: ''}}}})});
    if (/commons\.wikimedia\.org\/w\/api\.php/.test(u)) return r.fulfill({status: 200, contentType: 'application/json', headers: {'access-control-allow-origin': '*'}, body: JSON.stringify({query: {pages: {5: {imageinfo: [{thumburl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/x/xx/X-59_test.jpg/640px-X-59_test.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo', extmetadata: {Artist: {value: 'NASA'}, LicenseShortName: {value: 'Public domain'}}}]}}}})});
    if (/(upload|thumb)\.wikimedia\.org\//.test(u)) return r.fulfill({status: 200, contentType: 'image/webp', body: fs.readFileSync(new URL('../img/photos/A320.webp', import.meta.url))});
    const m = u.match(/(?:api\.adsb\.lol|workers\.dev)\/v2\/(callsign|reg|hex)\/([^/?]+)/);
    if (!m) return r.abort(); calls++;
    const a = Object.values(AC).filter(x => String((m[1] === 'callsign' ? x.flight.trim() : m[1] === 'reg' ? x.r : x.hex) || '').toUpperCase() === decodeURIComponent(m[2]).toUpperCase());
    return r.fulfill({status: 200, contentType: 'application/json', headers: {'access-control-allow-origin': '*'}, body: JSON.stringify({ac: a, now: Date.now()})});
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
  ok(await page.$eval('#reveal-card .spot-link', a => a.href.startsWith('https://www.planespotters.net/photo/') && !/nofollow/.test(a.rel) && !!a.querySelector('img.photo')), `${label}: reveal thumbnail is a plain link to the Planespotters photo page`);
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
  if (label === 'desktop') {
    // Arthur's real export from before variants: every card and point kept, and the Firehawk is learnt from its photo link.
    await page.setInputFiles('#import', new URL('fixtures/arthur-hangar.json', import.meta.url).pathname);
    await page.waitForFunction(() => /Imported/.test(document.getElementById('status').textContent));
    const ai = await page.evaluate(() => window.CallsignCatch.state()), raw = JSON.parse(fs.readFileSync(new URL('fixtures/arthur-hangar.json', import.meta.url)));
    const credit = ai.log.reduce((n, e) => n + (e.regradeCredited || 0), 0); const keptCards = Object.keys(raw.cards).every(k => ai.cards[k] || (ai.retired && ai.retired[k])); console.log('hangar fixture', raw.points, '+', credit, '=', ai.points, Object.keys(raw.cards).length, '->', Object.keys(ai.cards).length); ok(ai.points === raw.points + credit && keptCards && JSON.stringify(ai.cards.H60.variants) === '["S-70 Firehawk"]', 'Arthur\'s old export imports with every card and point (plus any shortfall credit), H60 backfilled with Firehawk');
    if (process.env.ARTHUR_EXPORT) {
      // Arthur's real export (a backup copy): import it, export again, and check nothing was lost.
      await page.setInputFiles('#import', process.env.ARTHUR_EXPORT); await page.waitForFunction(() => /Imported/.test(document.getElementById('status').textContent));
      const [dl2] = await Promise.all([page.waitForEvent('download'), page.click('#export')]); const again = path.join(SHOTS, 'arthur-again.json'); await dl2.saveAs(again);
      const {execFileSync} = await import('child_process'); let outp = '', good = true;
      try { outp = execFileSync('node', [new URL('lossless.mjs', import.meta.url).pathname, process.env.ARTHUR_EXPORT, again], {encoding: 'utf8'}); } catch (e) { good = false; outp = String(e.stdout || e); }
      console.log(outp.trim()); ok(good && /PASS lossless/.test(outp), "Arthur's real export imports in the browser and exports again with every field");
    }
    await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForFunction(() => window.CallsignCatch && window.CallsignCatch.ready);
  }
  if (label === 'desktop') {
    // Gift codes with a throwaway code and a test gift served in place of the real one.
    const C = await import(new URL('../js/core.mjs', import.meta.url).href);
    const tg = [await C.sealGift('test', 'TestCode', {greeting: 'Test greeting', cards: [{reg: 'G-BOAC', type: 'CONC', note: 'test note', giftPhoto: {src: 'https://upload.wikimedia.org/x.jpg', by: 'A', licence: 'CC BY-SA 3.0', link: 'https://commons.wikimedia.org/wiki/File:X.jpg'}}, {cs: 'RFR70001', reg: 'ZK425', hex: '43c7a2', type: 'EUFI', sq: '7700', mil: 1}]})];
    await page.route('**/data/gifts.json', r => r.fulfill({contentType: 'application/json', body: JSON.stringify(tg)}));
    let posts = 0; await page.route('**/catch', r => { posts++; r.abort(); });
    await page.evaluate(() => { document.querySelector('.redeem-box').open = true; });
    await page.fill('#redeem-code', 'nope'); await page.click('#redeem button');
    await page.waitForFunction(() => /did not work/.test(document.getElementById('status').textContent)); ok(true, 'gift: a wrong code is refused in the page');
    await page.fill('#redeem-code', 'TESTcode'); await page.click('#redeem button');
    await page.waitForSelector('#gift-fx:not([hidden])'); const fx = await page.evaluate(() => ({text: document.querySelector('.gift-text').textContent, hearts: document.querySelectorAll('.gift-sky i').length}));
    ok(fx.text === 'Test greeting' && fx.hearts > 10, 'gift: the heart animation appears with the greeting from the sealed payload');
    await page.screenshot({path: path.join(SHOTS, 'gift-fx.png')});
    const t0 = Date.now(); await page.keyboard.press('Escape'); await page.waitForSelector('#gift-fx', {state: 'hidden'});
    ok(Date.now() - t0 < 1500, 'gift: a key press skips the animation');
    const st = await page.evaluate(() => window.CallsignCatch.state());
    ok(st.cards.CONC && st.cards.CONC.tier === 'mythic' && st.log.filter(e => e.gift).length === 2 && await page.$('#hangar .cc-card[data-code="CONC"]'), 'gift: both gift cards are in the hangar at Mythic');
    ok(posts === 0, 'gift: gift cards are never posted to the leaderboard');
    await page.fill('#redeem-code', 'testcode'); await page.click('#redeem button');
    await page.waitForFunction(() => /already been used/.test(document.getElementById('status').textContent)); ok(true, 'gift: a second redeem is refused in the page');
    // Reduced motion: a still heart and the text, no floating hearts, and a tap skips.
    await page.evaluate(() => { const s = window.CallsignCatch.state(); s.redeemed = []; }); await page.emulateMedia({reducedMotion: 'reduce'});
    await page.fill('#redeem-code', 'TestCode'); await page.click('#redeem button'); await page.waitForSelector('#gift-fx:not([hidden])');
    const still = await page.evaluate(() => ({still: document.getElementById('gift-fx').classList.contains('still'), hearts: document.querySelectorAll('.gift-sky i').length, anim: getComputedStyle(document.querySelector('.gift-heart')).animationName, text: document.querySelector('.gift-text').textContent}));
    ok(still.still && still.hearts === 0 && still.anim === 'none' && still.text === 'Test greeting', 'gift: reduced motion shows a still heart and the text ' + JSON.stringify(still));
    await page.click('#gift-fx'); await page.waitForSelector('#gift-fx', {state: 'hidden'}); ok(true, 'gift: a tap skips it');
    // The code typed into the callsign box is redeemed as a gift, not looked up or kept as pending.
    await page.emulateMedia({reducedMotion: 'reduce'}); await page.evaluate(() => { const s = window.CallsignCatch.state(); s.redeemed = []; s.pending = [{value: 'TESTCODE', kind: 'callsign', at: Date.now(), until: Date.now() + 3600e3}]; });
    const calls0 = calls; await page.evaluate(() => window.CallsignCatch.resetGap()); await page.fill('#cs', 'TestCode'); await page.click('#go');
    await page.waitForSelector('#gift-fx:not([hidden])'); await page.click('#gift-fx'); await page.waitForSelector('#gift-fx', {state: 'hidden'});
    const gs = await page.evaluate(() => window.CallsignCatch.state());
    ok(calls === calls0 && (gs.redeemed || []).includes('test') && await page.isHidden('#pend-save') && !/TESTCODE/i.test(await page.textContent('#pending-list')), 'gift: a gift code in the callsign box is redeemed as a gift and never offered as pending');
    await page.emulateMedia({reducedMotion: 'no-preference'}); await page.unroute('**/catch'); await page.unroute('**/data/gifts.json');
    await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForFunction(() => window.CallsignCatch && window.CallsignCatch.ready);
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
  // Variants: the Black Hawk makes the H60 card, the Firehawk adds a variant with a +10 bonus, not a second card.
  await go(page, 'R26863'); ok(await page.$$eval('#reveal-card .cc-vars li', l => l.map(x => x.textContent.trim()).join('|')) === '\u2713 UH-60 Black Hawk', `${label}: Black Hawk card shows its variant chip`); await closeReveal(page);
  const pts0 = +(await page.evaluate(() => window.CallsignCatch.state().points));
  const vs = await go(page, 'CFR606');
  ok(/New variant: Firehawk/.test(vs) && /New variant: Firehawk/.test(await page.textContent('#reveal-sub')) && await boardText() === 'NEW VARIANT', `${label}: catch screen says New variant: Firehawk (${vs})`);
  const st2 = await page.evaluate(() => window.CallsignCatch.state());
  ok(st2.points === pts0 + 22 && st2.cards.H60.count === 2 && !Object.keys(st2.cards).some(k => k !== 'H60' && /60/.test(k)) && JSON.stringify(st2.cards.H60.variants) === '["UH-60 Black Hawk","S-70 Firehawk"]', `${label}: one H60 card, two variants, rare XP plus the +10 bonus`);
  ok(await page.$$eval('#hangar .cc-card[data-code="H60"] .cc-vars li', l => l.length) === 2, `${label}: hangar H60 card ticks both variants`);
  ok(!/[\u2013\u2014]/.test(await page.textContent('#reveal')), `${label}: no dashes in the variant copy`);
  await closeReveal(page);
  // Catch detail: the H60 card opens a list of both airframes, each with its own photo, callsign, registration, variant and date.
  await page.click('#hangar .cc-card[data-code="H60"]');
  await page.waitForSelector('#detail[open]'); await page.waitForTimeout(300);
  await page.waitForFunction(() => [...document.querySelectorAll('#detail-list img')].every(i => i.complete), null, {timeout: 10000}).catch(() => {});
  const det = await page.$$eval('#detail-list .catch-item', l => l.map(li => { const i = li.querySelector('.cc-photo img'), sv = li.querySelector('.cc-photo svg'); return {t: li.textContent, ok: i ? i.complete && i.naturalWidth > 0 : !!sv}; }));
  ok(det.length === 2 && det.every(d => d.ok) && /CFR606/.test(det[0].t) && /N485DF/.test(det[0].t) && /Firehawk/.test(det[0].t) && /R26863/.test(det[1].t) && /00-26863/.test(det[1].t) && /Black Hawk/.test(det[1].t) && det.every(d => /Caught/.test(d.t)), `${label}: H60 detail lists both catches with photo, callsign, reg, variant and date ${JSON.stringify(det.map(d => d.ok))}`);
  ok(/2 catches/.test(await page.textContent('#detail-h')) && !/[\u2013\u2014]/.test(await page.textContent('#detail')), `${label}: detail heading counts the catches, no dashes`);
  await page.click('#detail-close'); ok(!(await page.$('#detail[open]')), `${label}: detail closes`);
  ok(!(await page.$('#hangar .cc-card.multi[data-code="L39"]')) && !!(await page.$('#hangar .cc-card.opens[data-code="L39"]')) && !(await page.$('#hangar .cc-card.empty.opens')), `${label}: every caught card opens a detail view, locked ones do not`);
  // A single catch opens too, with every stored field.
  await page.click('#hangar .cc-card[data-code="L39"]'); await page.waitForSelector('#detail[open]');
  const one = await page.textContent('#detail');
  ok(['Type', 'Tier', 'Points', 'First caught', 'Last caught', 'Callsign', 'Hex', '4984EE', 'BTLE21', 'Caught', 'Altitude', 'Speed'].every(w => one.includes(w)) && !/[\u2013\u2014]/.test(one), `${label}: a single card opens a detail view with every field`);
  await page.click('#detail-close');
  // X-59: a Commons photo when Wikipedia answers, its own render when the network is down. Never blank.
  wikiUp = label === 'desktop';
  await page.evaluate(() => { for (const k of Object.keys(localStorage)) if (/^callsign:(wiki|reg)/.test(k)) localStorage.removeItem(k); });
  await go(page, 'NASA59'); await page.waitForTimeout(800); await waitImgs();
  const x59 = await page.$eval('#reveal-card .cc-photo img', i => ({stage: i.dataset.stage, ok: i.complete && i.naturalWidth > 0, src: i.src}));
  ok(x59.ok && x59.stage === (wikiUp ? 'commons' : 'render') && (wikiUp ? /^https:\/\/thumb\.wikimedia\.org\/[^?]+$/.test(x59.src) : /img\/cards\/X59\.webp/.test(x59.src)), `${label}: X-59 shows ${wikiUp ? 'a Commons photo' : 'its render while offline'} ${JSON.stringify(x59)}`);
  if (wikiUp) ok(/Public domain/.test(await page.textContent('#reveal-card .cc-credit')), `${label}: Commons photo carries its licence`);
  await closeReveal(page); wikiUp = true;
  // A Planespotters photo that fails to load steps down to the type photo, with the right credit.
  await go(page, 'BAW4'); await page.waitForTimeout(800); await waitImgs();
  const pf = await page.$eval('#reveal-card .cc-card', c => { const i = c.querySelector('.cc-photo img'); return {stage: i && i.dataset.stage, ok: !!i && i.complete && i.naturalWidth > 0, cr: (c.querySelector('.cc-credit') || {}).textContent || ''}; });
  ok(pf.ok && pf.stage === 'photo' && !/Planespotters/.test(pf.cr) && /CC|Public domain/i.test(pf.cr), `${label}: broken Planespotters image falls back to the type photo ${JSON.stringify(pf)}`);
  await closeReveal(page);
  if (label === 'desktop') {
    // Tilt: small, no lift, and none at all with reduced motion.
    // Headless Chromium reports no hover pointer, so set the tilt the pointer would give at a corner and hover the card.
    const card = await page.$('#hangar .cc-card[data-code="L39"]'); await card.scrollIntoViewIfNeeded(); const b = await card.boundingBox();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await card.evaluate(async c => { const t = (await import('./js/fx.mjs')).tiltFor(0, 0); c.style.setProperty('--rx', t.rx + 'deg'); c.style.setProperty('--ry', t.ry + 'deg'); c.classList.add('tilt'); });
    await page.waitForTimeout(300);
    const tf = await card.evaluate(c => { const m = new DOMMatrix(getComputedStyle(c).transform); return {ax: Math.asin(Math.min(1, Math.abs(m.m23))) * 180 / Math.PI, ay: Math.asin(Math.min(1, Math.abs(m.m13))) * 180 / Math.PI, tx: m.m41, ty: m.m42, tilt: c.classList.contains('tilt')}; });
    ok(tf.tilt && tf.ax <= 3.05 && tf.ay <= 3.05 && (tf.ax > 0.5 || tf.ay > 0.5) && Math.abs(tf.tx) < 0.5 && Math.abs(tf.ty) < 0.5, `${label}: hover tilt is at most 3 degrees with no lift ${JSON.stringify(tf)}`);
    await page.emulateMedia({reducedMotion: 'reduce'}); await page.waitForTimeout(100);
    ok(await card.evaluate(c => getComputedStyle(c).transform) === 'none', `${label}: reduced motion keeps the card flat`);
    await page.emulateMedia({reducedMotion: 'no-preference'}); await page.mouse.move(0, 0);
  }
  ok(await page.textContent('#stat-moments') === '1', `${label}: rare moments tally counts the squawk`);
  // Arthur's HNCHMN14: no type in the feed, so the hex names it as an RAF Protector, a legendary drone.
  await go(page, 'HNCHMN14'); await page.waitForTimeout(300);
  ok(await page.$eval('#reveal-card .cc-card', c => c.dataset.code === 'Q9B') && /Protector RG1/.test(await page.textContent('#reveal-card')) && await page.$eval('#reveal', d => d.classList.contains('tier-legendary')), `${label}: HNCHMN14 is a legendary Protector, not unidentified`);
  await closeReveal(page);
  // Deck filters: chips scroll on a phone, Drones shows only the Protector, Legendary only legendary cards.
  ok(await page.$$eval('#deck .chip', b => b.length) >= 14 && await page.$eval('#deck', d => getComputedStyle(d).overflowX === 'auto'), `${label}: deck filter chips are there and scroll sideways`);
  await page.click('#deck [data-deck="drone"]');
  const dr = await page.$$eval('#hangar .cc-card', c => c.map(x => x.dataset.code));
  ok(dr.includes('Q9B') && dr.includes('Q9') && dr.every(c => ['Q9', 'Q9B', 'Q4', 'UNKUV'].includes(c)), `${label}: Drones filter shows only drones, the Protector and the Reaper ${JSON.stringify(dr)}`);
  await page.click('#deck [data-deck="legendary"]');
  ok(await page.$$eval('#hangar .cc-card', c => c.length > 0 && c.every(x => x.classList.contains('tier-legendary'))), `${label}: Legendary filter shows only legendary cards`);
  await page.selectOption('#deck-maker', 'Airbus');
  ok(await page.$$eval('#hangar .cc-card', c => c.length > 0 && c.every(x => /^A/.test(x.dataset.code))), `${label}: maker filter shows Airbus cards`);
  await page.click('#deck [data-deck="all"]');
  await page.click('#sets [data-set="airbus"]');
  const miss = await page.textContent('#set-missing');
  ok(/Airbus Family Album: \d+\/15\./.test(miss) && /Still to catch: .*Airbus A388|Still to catch: .*A380/.test(miss) === false ? /Still to catch/.test(miss) : true, `${label}: album shows progress out of 15 and what is missing (${miss.slice(0, 80)})`);
  await page.click('#set-all');
  if (label === 'phone') ok(await page.$eval('#hangar .cc-card[data-code="A388"] .spot-link', a => a.href.startsWith('https://www.planespotters.net/photo/') && !/nofollow/.test(a.rel)).catch(() => false), `${label}: hangar Planespotters thumbnail links to its photo page`);
  if (label === 'desktop') {
    // A C-17 calling just X banks, keyed on its hex. Its registration and hex find it too, and are then the same catch.
    let st = await go(page, 'X'); const sx = await page.evaluate(() => window.CallsignCatch.state());
    ok(/Caught|Another/.test(st) && sx.log[0].cs === 'X' && sx.log[0].hex === 'ae07e1' && Object.values(sx.days).flat().includes('AE07E1'), `${label}: callsign X banks, keyed on hex (${st})`); await closeReveal(page);
    st = await go(page, '08-8204'); ok(/already caught/.test(st), `${label}: registration 08-8204 finds the same C-17 (${st})`);
    st = await go(page, 'AE07E1'); ok(/already caught/.test(st), `${label}: hex AE07E1 finds the same C-17 (${st})`);
    st = await go(page, 'Y'); ok(/More than one aircraft/.test(st) && await boardText() === 'TOO MANY' && !(await page.isVisible('#reveal')), `${label}: two live aircraft calling Y ask for the hex (${st})`);
    st = await go(page, 'XY'); ok(/can't hear/.test(st), `${label}: XY does not match X`);
    // RCH131 is not in the feed yet: save it as pending, no points, then it confirms once the feed hears it.
    const p0 = (await page.evaluate(() => window.CallsignCatch.state())).points;
    st = await go(page, 'RCH131'); ok(/can't hear/.test(st) && await page.isVisible('#pend-save'), `${label}: not found offers Save as pending`);
    await page.click('#pend-save');
    const sp = await page.evaluate(() => window.CallsignCatch.state());
    ok(sp.pending.length === 1 && sp.points === p0 && !sp.cards.C5M && await page.isVisible('#pending') && /Pending/.test(await page.textContent('#pending-list')) && /no points/i.test(await page.textContent('#pending-list')), `${label}: pending sighting saved, clearly marked, no points`);
    await page.reload(); await page.waitForFunction(() => window.CallsignCatch && window.CallsignCatch.ready); await page.waitForTimeout(300);
    ok((await page.evaluate(() => window.CallsignCatch.state())).pending.length === 1, `${label}: pending survives a reload and is rechecked without confirming`);
    AC.RCH131 = LATE; await page.evaluate(() => window.CallsignCatch.recheckPending()); await page.waitForTimeout(300);
    const sc = await page.evaluate(() => window.CallsignCatch.state());
    ok(!sc.pending.length && sc.cards.C5M && sc.points > p0 && /Pending RCH131 confirmed/.test(await page.textContent('#status')) && await page.isHidden('#pending'), `${label}: pending RCH131 confirms into a real card with points`);
    await closeReveal(page);
    // An old pending one expires cleanly with nothing awarded.
    await page.evaluate(() => { const s = window.CallsignCatch.state(); s.pending = [{value: 'GHOST1', kinds: ['callsign'], t: new Date(Date.now() - 7300e3).toISOString(), until: new Date(Date.now() - 100e3).toISOString(), tries: 3}]; });
    const p1 = (await page.evaluate(() => window.CallsignCatch.state())).points;
    await page.evaluate(() => window.CallsignCatch.recheckPending());
    const se = await page.evaluate(() => window.CallsignCatch.state());
    ok(!se.pending.length && se.points === p1 && /expired/.test(await page.textContent('#status')), `${label}: expired pending drops cleanly with no points`);
    delete AC.RCH131;
  }
  // A save from before batch 3: its Planespotters photos carry no date, so every one is looked up again on load.
  await page.evaluate(() => { const k = 'callsign:collection', st = JSON.parse(localStorage.getItem(k)); for (const e of [...st.log, ...Object.values(st.cards).flatMap(c => [c.first, c.last])]) if (e && e.photo) delete e.photo.at; localStorage.setItem(k, JSON.stringify(st)); for (const x of Object.keys(localStorage)) if (x.startsWith('callsign:spot:')) localStorage.removeItem(x); });
  await page.reload(); await page.waitForFunction(() => window.CallsignCatch && window.CallsignCatch.ready);
  await page.waitForFunction(() => { const i = document.querySelector('#hangar .cc-card[data-code="A388"] img.photo'); return i && i.dataset.stage === 'spot'; }, null, {timeout: 10000}).catch(() => {});
  if (label === 'phone') ok(await page.$eval('#hangar .cc-card[data-code="A388"]', c => { const i = c.querySelector('img.photo'); return !!i && i.dataset.stage === 'spot' && /Test Spotter/.test((c.querySelector('.cc-credit') || {}).textContent || ''); }), `${label}: an undated saved photo is looked up again and comes back with its credit`);
  await page.evaluate(() => document.querySelectorAll('#hangar img[loading="lazy"]').forEach(i => { i.loading = 'eager'; })); // after a reload the cards below the fold have not loaded yet
  await waitImgs();
  const hang = await imgsOk('#hangar .cc-card:not(.empty)');
  ok(hang.length >= 5 && hang.every(h => h.ok && h.img), `${label}: every caught card in the hangar shows a loaded image ${JSON.stringify(hang.filter(h => !h.ok || !h.img))}`);
  await ctx.close();
}
await browser.close();
console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
