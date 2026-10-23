// Card art: a picture for the type if there is one, otherwise a clean silhouette for its broad category.
const COL = {common: '#7dffb0', uncommon: '#4fd8ff', rare: '#c58bff', legendary: '#ffc94d'};
export const tierColour = t => COL[t] || COL.uncommon;
const P = {
  narrow: '<path d="M8 50h84l6 2-6 2H8l-4-2z"/><path d="M44 52 30 76h7l20-22M44 52 32 30h6l18 20M14 52l-6-12h5l9 11M14 52l-6 10h5l9-9"/><ellipse cx="40" cy="61" rx="6" ry="2.4"/>',
  wide: '<path d="M6 48h86l7 3-7 3H6l-4-3z"/><path d="M42 51 22 84h9l28-31M42 51 24 18h9l26 31M12 51l-7-14h6l11 13M12 51l-7 12h6l11-11"/><ellipse cx="36" cy="64" rx="7" ry="3"/><ellipse cx="36" cy="38" rx="7" ry="3"/>',
  quad: '<path d="M6 48h86l7 3-7 3H6l-4-3z"/><path d="M42 51 20 86h9l30-33M42 51 22 16h9l28 33M12 51l-7-14h6l11 13M12 51l-7 12h6l11-11"/><ellipse cx="38" cy="62" rx="5" ry="2.4"/><ellipse cx="31" cy="72" rx="5" ry="2.4"/><ellipse cx="38" cy="40" rx="5" ry="2.4"/><ellipse cx="31" cy="30" rx="5" ry="2.4"/>',
  bizjet: '<path d="M16 50h70l6 2-6 2H16l-4-2z"/><path d="M48 52 38 72h6l14-18M48 52 38 32h6l14 18M20 52l-6-10h5l8 9M20 52l-6 9h5l8-8"/><ellipse cx="26" cy="47" rx="5" ry="2"/><ellipse cx="26" cy="57" rx="5" ry="2"/>',
  turboprop: '<path d="M14 50h72l6 2-6 2H14l-4-2z"/><path d="M46 49h-6L38 22h5zM46 55h-6l-2 27h5z"/><path d="M42 30v-6M42 74v6" stroke-width="2"/><rect x="45" y="27" width="10" height="4"/><rect x="45" y="73" width="10" height="4"/><path d="M18 52l-6-10h5l8 9M18 52l-6 9h5l8-8"/>',
  prop: '<path d="M22 50h56l5 2-5 2H22l-3-2z"/><path d="M56 49h-8l-2-26h6zM56 55h-8l-2 26h6z"/><path d="M84 42v20" stroke-width="2"/><path d="M26 52l-5-8h4l7 7M26 52l-5 8h4l7-7"/>',
  heli: '<path d="M30 46c0-6 6-10 18-10s20 6 20 14-8 12-20 12-18-6-18-16z"/><path d="M30 50H8l-2-6h4l4 4h16"/><path d="M4 30l92 8M10 66l80-16" stroke-width="2.5"/><path d="M40 64v6h30v-6" stroke-width="2"/>',
  fighter: '<path d="M10 50h72l12 2-12 2H10z"/><path d="M40 52 30 80h6l26-28M40 52 30 24h6l26 28M14 52l-8-12h5l10 10M14 52l-8 12h5l10-10"/>',
  miltransport: '<path d="M8 48h82l8 4-8 4H8l-4-4z"/><path d="M50 50 44 14h8l10 36M50 54 44 90h8l10-36"/><ellipse cx="54" cy="30" rx="6" ry="2.4"/><ellipse cx="54" cy="74" rx="6" ry="2.4"/><path d="M12 52l-4-14h6l8 12M12 52l-4 14h6l8-12"/>',
  drone: '<path d="M14 50h70l6 2-6 2H14l-3-2z"/><path d="M46 51 30 86h6l20-34M46 53 30 18h6l20 34"/><path d="M12 52l-8-10h5l9 9M12 52l-8 10h5l9-9"/><circle cx="80" cy="52" r="5"/>',
  gyro: '<path d="M30 46c0-6 6-10 18-10s20 6 20 14-8 12-20 12-18-6-18-16z"/><path d="M30 50H8l-2-6h4l4 4h16"/><path d="M10 40l80-4" stroke-width="2.5"/>',
  unknown: '<path d="M10 50h80l6 2-6 2H10l-4-2z"/><path d="M44 52 30 78h7l20-24M44 52 30 26h7l20 24M16 52l-6-12h5l9 11M16 52l-6 10h5l9-9"/>'};
export function silhouette(cat, tier, owned) {
  const c = owned ? tierColour(tier) : '#2c3a30';
  return `<svg class="sil" viewBox="0 0 100 104" aria-hidden="true" focusable="false"><g transform="rotate(-90 50 52)" fill="${c}" stroke="${c}" stroke-linejoin="round" stroke-width="1">${P[cat] || P.unknown}</g></svg>`;
}
let manifest = new Set(), photos = {};
export function setArtManifest(codes) { manifest = new Set(codes || []); }
// Free type photos from Wikimedia Commons, self hosted in img/photos, with credits in data/photos.json.
export function setPhotos(map) { photos = map || {}; }
export const photoFor = code => photos[code] || null;
const FALLBACK = {narrow: 'FB_JET', wide: 'FB_JET', quad: 'FB_JET', bizjet: 'FB_JET', turboprop: 'FB_PROP', prop: 'FB_PROP', heli: 'FB_HELI', fighter: 'FB_MIL', military: 'FB_MIL', miltransport: 'FB_MIL', drone: 'FB_DRONE', gyro: 'FB_HELI', unknown: 'FB_UNKNOWN'};
// The nearest family render when a type has none of its own, so a 777-200 shows a 777, not a blank.
export const FAMILY = {A318: 'A319', A19N: 'A319', A338: 'A333', A339: 'A333', A332: 'A333', B712: 'B738', B732: 'B738', B733: 'B738', B734: 'B738', B735: 'B738', B736: 'B738', B737: 'B738',
  B37M: 'B38M', B39M: 'B38M', B3XM: 'B38M', B753: 'B752', B772: 'B77W', B77L: 'B77W', B773: 'B77W', B778: 'B77W', B779: 'B77W', B77F: 'B77W', B78X: 'B789',
  B741: 'B744', B742: 'B744', B743: 'B744', B74S: 'B744', K35R: 'R135', E6: 'R135', B703: 'R135', B720: 'R135', E3CF: 'E3TF', E737: 'P8', C30J: 'C130',
  E170: 'E190', E75L: 'E190', E75S: 'E190', E195: 'E190', E290: 'E190', E295: 'E190', CRJ2: 'CRJ9', CRJ7: 'CRJ9', CRJX: 'CRJ9',
  DH8A: 'DH8D', DH8B: 'DH8D', DH8C: 'DH8D', AT43: 'AT76', AT45: 'AT76', AT72: 'AT76', AT75: 'AT76', C152: 'C172', C182: 'C172'};
export function artKey(info) {
  if (manifest.has(info.code)) return info.code;
  const fam = FAMILY[info.code]; if (fam && manifest.has(fam)) return fam;
  const f = FALLBACK[info.cat] || 'FB_UNKNOWN'; return manifest.has(f) ? f : null;
}
// Wikimedia now answers with thumbnails on thumb.wikimedia.org with a tracking query, where it used to give
// upload.wikimedia.org. Both are its own servers; the query is dropped and anything else is refused.
export const wikiSrc = u => { const m = /^(https:\/\/(?:upload|thumb)\.wikimedia\.org\/[\w./%()-]+)(?:\?[\w.=&%-]*)?$/.exec(String(u || '')); return m ? m[1] : ''; };
// A lookup that found no free photo is only remembered for a day, so a passing hiccup cannot blank a card for a week.
const WEEK = 7 * 864e5, DAY = 864e5;
const fresh = c => c && (c.p ? Date.now() - c.at < WEEK : Date.now() - c.at < DAY);
const escA = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
// Only Planespotters thumbnails and photo pages are trusted from a saved catch. Their terms let an API answer be kept
// for 24 hours at most, so an older one is not shown and is looked up again instead.
export const SPOT_TTL = 24 * 3600e3;
export const safeSpot = (p, now = Date.now()) => p && /^https:\/\/[a-z0-9.-]+\.(plnspttrs|planespotters)\.net\/[\w./-]+$/.test(p.src || '') && /^https:\/\/www\.planespotters\.net\/[\w./?=&%-]*$/.test(p.link || '') && +p.at > 0 && now - p.at < SPOT_TTL && now - p.at > -60e3 ? p : null;
// What to show, best first: the exact airframe photo from Planespotters, the self hosted type photo, a Commons photo
// looked up live from the type's Wikipedia page, the type or family render, then a silhouette for its category.
// The card first shows the best picture it has without the network; upgradeArt() and the error handler move it along.
// A gift card carries its own Commons photo with its licence and credit.
export const giftPhoto = e => { const p = e && e.gift && e.giftPhoto; return p && wikiSrc(p.src) === p.src && /^https:\/\/commons\.wikimedia\.org\/wiki\/[\w.:%()-]+$/.test(p.link || '') ? p : null; };
export const ART_CHAIN = ['gift', 'spot', 'photo', 'commons', 'render', 'silhouette'];
export function renderKey(info, entry) { return entry && entry.mil && manifest.has(info.code + '_TKR') ? info.code + '_TKR' : artKey(info); }
export function artStages(info, entry) {
  const st = [];
  if (giftPhoto(entry)) st.push('gift');
  if (safeSpot(entry && entry.photo)) st.push('spot');
  if (photos[info.code]) st.push('photo');
  if (wikiTitle(info)) st.push('commons');
  if (renderKey(info, entry)) st.push('render');
  st.push('silhouette'); return st;
}
function stageHTML(stage, info, tier, entry, lazy) {
  const spot = safeSpot(entry && entry.photo);
  // Planespotters asks for the thumbnail itself to link to the photo page, as a plain link.
  if (stage === 'gift') { const g = giftPhoto(entry); return `<a class="spot-link" href="${escA(g.link)}" target="_blank" rel="noopener"><img class="photo" data-stage="gift" src="${escA(g.src)}" alt="${escA(info.name)}" width="640" height="400"${lazy} decoding="async"></a>`; }
  if (stage === 'spot') return `<a class="spot-link" href="${escA(spot.link)}" target="_blank" rel="noopener"><img class="photo" data-stage="spot" src="${escA(spot.src)}" alt="${escA((entry.reg || entry.cs) + ', the ' + info.name + ' you caught')}" width="420" height="280"${lazy} decoding="async"></a>`;
  if (stage === 'photo') return `<img class="photo" data-stage="photo" src="./img/photos/${escA(info.code)}.webp" alt="${escA(info.name)}" width="640" height="400"${lazy} decoding="async">`;
  if (stage === 'render') return `<img class="art" data-stage="render" src="./img/cards/${escA(renderKey(info, entry))}.webp" alt="" width="360" height="240"${lazy} decoding="async">`;
  return silhouette(info.cat, tier, true);
}
export function cardArt(info, tier, owned, eager, entry) {
  const lazy = eager ? '' : ' loading="lazy"';
  if (!owned) return silhouette(info.cat, tier, false);
  const st = artStages(info, entry), first = st.find(x => x !== 'commons');
  // The stages left after the one shown go on the slot, so a failed image knows where to go next.
  const rest = st.slice(st.indexOf(first) + 1), wiki = st.indexOf('commons') > -1 && st.indexOf('commons') < st.indexOf(first);
  // A special livery with no fresh Planespotters photo looks for that exact airframe on Commons by its registration.
  const reg = first !== 'spot' && entry && entry.liv && entry.reg && /^[A-Z0-9-]{3,10}$/i.test(entry.reg) ? entry.reg : '';
  return `<span class="art-slot" data-code="${escA(info.code)}" data-tier="${escA(tier)}" data-next="${rest.join(' ')}"${wiki ? ` data-wiki="${escA(wikiTitle(info))}"` : ''}${reg ? ` data-reg="${escA(reg)}"` : ''}${entry && entry.mil ? ' data-mil="1"' : ''}>${stageHTML(first, info, tier, entry, lazy)}</span>`;
}
// The next picture after one fails to load (Planespotters down, offline, a missing file). Never leaves a blank.
export function nextArt(img, infoFor, onWiki) {
  const slot = img && img.closest && img.closest('.art-slot'); if (!slot) return false;
  const info = infoFor(slot.dataset.code), tier = slot.dataset.tier, entry = slot.dataset.mil ? {mil: 1} : null;
  const rest = (slot.dataset.next || '').split(' ').filter(Boolean);
  let stage = rest.shift() || 'silhouette';
  // Commons is looked up in the background: show the next picture now and let the lookup replace it.
  if (stage === 'commons') { slot.dataset.wiki = wikiTitle(info); stage = rest.shift() || 'silhouette'; }
  slot.dataset.next = rest.join(' ');
  slot.innerHTML = stageHTML(stage, info, tier, entry, '');
  const inner = slot.closest('.cc-in'), cr = inner && inner.querySelector('.cc-credit'); if (cr) cr.remove();
  if (stage === 'photo' && inner) inner.querySelector('.cc-photo').insertAdjacentHTML('afterend', creditHTML(photos[info.code]));
  if (slot.dataset.wiki && onWiki) onWiki(slot.parentNode);
  return true;
}
// The Wikipedia article for a type: its own source link when that is Wikipedia, otherwise its name.
export function wikiTitle(info) {
  if (!info || info.unknown || info.cat === 'special') return '';
  const m = String(info.source || '').match(/^https:\/\/en\.wikipedia\.org\/wiki\/([^#?]+)/);
  if (m) { try { return decodeURIComponent(m[1]).replace(/_/g, ' '); } catch { return ''; } }
  return info.gen ? '' : String(info.name || '');
}
const WIKI_API = 'https://en.wikipedia.org/w/api.php', COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
const stripTags = s => String(s || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 60);
// The lead image of the type's Wikipedia article, only if the file lives on Commons (so it is freely licensed),
// with its author and licence for the credit. Free, keyless and run from the browser. Remembered per type for a week.
export async function commonsPhoto(title, f = fetch, store = null) {
  const key = 'callsign:wiki2:' + title;
  try { const c = store && JSON.parse(store.getItem(key)); if (fresh(c)) return c.p; } catch {}
  const get = async u => { const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 5000); try { const r = await f(u, {signal: ctl.signal}); if (!r.ok) throw new Error('http ' + r.status); return await r.json(); } finally { clearTimeout(t); } };
  let p = null;
  try {
    const a = await get(`${WIKI_API}?action=query&format=json&origin=*&redirects=1&prop=pageimages&piprop=name&titles=${encodeURIComponent(title)}`);
    const page = Object.values((a.query && a.query.pages) || {})[0], file = page && page.pageimage;
    if (file) {
      const b = await get(`${COMMONS_API}?action=query&format=json&origin=*&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=640&titles=${encodeURIComponent('File:' + file)}`);
      const pg = Object.values((b.query && b.query.pages) || {})[0], ii = pg && !pg.missing && pg.imageinfo && pg.imageinfo[0], md = (ii && ii.extmetadata) || {};
      const lic = stripTags(md.LicenseShortName && md.LicenseShortName.value);
      if (ii && wikiSrc(ii.thumburl) && lic && !/fair use|non.?free/i.test(lic))
        p = {src: wikiSrc(ii.thumburl), source: 'https://commons.wikimedia.org/wiki/' + encodeURIComponent('File:' + file).replace(/%20/g, '_'), author: stripTags(md.Artist && md.Artist.value) || 'Wikimedia Commons', licence: lic, licenceUrl: /^https?:\/\//.test((md.LicenseUrl && md.LicenseUrl.value) || '') ? md.LicenseUrl.value : ''};
    }
  } catch { return null; } // a network failure is not remembered, so it can try again next visit
  try { store && store.setItem(key, JSON.stringify({at: Date.now(), p})); } catch {}
  return p;
}
const creditHTML = p => `<p class="cc-credit">Photo <a href="${escA(p.source)}" target="_blank" rel="noopener">${escA(p.author)}</a>, ${p.licenceUrl ? `<a href="${escA(p.licenceUrl)}" target="_blank" rel="noopener">${escA(p.licence)}</a>` : escA(p.licence)}</p>`;
// A Commons photo of one exact airframe, found by searching file names for its registration. The registration has to
// appear in the file name as a whole word (G-EUPJ, not G-EUPJX), and the licence has to be free. Remembered for a week.
const regNorm = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
export function titleHasReg(title, reg) {
  const r = regNorm(reg); if (r.length < 3) return false;
  return String(title || '').toUpperCase().split(/[^A-Z0-9-]+/).some(w => regNorm(w) === r);
}
export async function commonsByReg(reg, f = fetch, store = null) {
  const key = 'callsign:reg2:' + regNorm(reg);
  try { const c = store && JSON.parse(store.getItem(key)); if (fresh(c)) return c.p; } catch {}
  const get = async u => { const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 5000); try { const r = await f(u, {signal: ctl.signal}); if (!r.ok) throw new Error('http ' + r.status); return await r.json(); } finally { clearTimeout(t); } };
  let p = null;
  try {
    const a = await get(`${COMMONS_API}?action=query&format=json&origin=*&list=search&srnamespace=6&srlimit=8&srsearch=${encodeURIComponent('intitle:"' + String(reg).toUpperCase() + '"')}`);
    const titles = ((a.query && a.query.search) || []).map(x => x.title).filter(t => /\.(jpe?g|png|webp)$/i.test(t) && titleHasReg(t.replace(/^File:/, '').replace(/\.\w+$/, ''), reg)).slice(0, 4);
    if (titles.length) {
      const b = await get(`${COMMONS_API}?action=query&format=json&origin=*&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=640&titles=${encodeURIComponent(titles.join('|'))}`);
      const pages = Object.values((b.query && b.query.pages) || {}).sort((x, y) => titles.indexOf(x.title) - titles.indexOf(y.title));
      for (const pg of pages) { const ii = !pg.missing && pg.imageinfo && pg.imageinfo[0], md = (ii && ii.extmetadata) || {}, lic = stripTags(md.LicenseShortName && md.LicenseShortName.value);
        if (ii && wikiSrc(ii.thumburl) && lic && !/fair use|non.?free/i.test(lic)) {
          p = {src: wikiSrc(ii.thumburl), source: 'https://commons.wikimedia.org/wiki/' + encodeURIComponent(pg.title).replace(/%20/g, '_').replace(/%3A/i, ':'), author: stripTags(md.Artist && md.Artist.value) || 'Wikimedia Commons', licence: lic, licenceUrl: /^https?:\/\//.test((md.LicenseUrl && md.LicenseUrl.value) || '') ? md.LicenseUrl.value : ''}; break; } }
    }
  } catch { return null; }
  try { store && store.setItem(key, JSON.stringify({at: Date.now(), p})); } catch {}
  return p;
}
// Swap in a Commons photo wherever a card is waiting for one: the exact airframe first, then the type.
// Whatever is showing stays if there is none or it fails.
export async function upgradeArt(root, f = fetch, store = null) {
  const slots = [...((root && root.querySelectorAll('.art-slot[data-wiki], .art-slot[data-reg]')) || [])];
  await Promise.all(slots.map(async slot => {
    const title = slot.dataset.wiki, reg = slot.dataset.reg; delete slot.dataset.wiki; delete slot.dataset.reg;
    let p = reg ? await commonsByReg(reg, f, store) : null, exact = !!p;
    if (!p && title) p = await commonsPhoto(title, f, store);
    if (!p || !slot.isConnected) return;
    if (exact) { const inner = slot.closest('.cc-in'), cr = inner && inner.querySelector('.cc-credit'); if (cr) cr.remove(); }
    const cur = slot.innerHTML;
    // Whatever was showing (the render or silhouette) becomes the next fallback again if this image fails.
    if (/data-stage="render"/.test(cur)) slot.dataset.next = ('render ' + slot.dataset.next).trim();
    slot.innerHTML = `<img class="photo" data-stage="${exact ? 'airframe' : 'commons'}" src="${escA(p.src)}" alt="" width="640" height="400" decoding="async" referrerpolicy="no-referrer">`;
    const inner = slot.closest('.cc-in');
    if (inner && !inner.querySelector('.cc-credit')) inner.querySelector('.cc-photo').insertAdjacentHTML('afterend', creditHTML(p));
  }));
}
// The credit each photo licence asks for, as a small line on the card.
export function photoCredit(info, entry, owned) {
  if (!owned) return '';
  const note = entry && entry.gift && entry.note ? `<p class="cc-gift">${escA(entry.note)}</p>` : '', g = giftPhoto(entry);
  if (g) return `<p class="cc-credit">Photo <a href="${escA(g.link)}" target="_blank" rel="noopener">${escA(g.by)}</a>, ${escA(g.licence)}, via Wikimedia Commons</p>${note}`;
  const spot = safeSpot(entry && entry.photo);
  if (note && !spot) return note + (photos[info.code] ? creditHTML(photos[info.code]) : '');
  if (spot) return note + `<p class="cc-credit">Photo <a href="${escA(spot.link)}" target="_blank" rel="noopener">${escA(spot.by || 'Planespotters.net')}</a> via Planespotters.net</p>`;
  const p = photos[info.code];
  if (!p) return '';
  return creditHTML(p);
}
