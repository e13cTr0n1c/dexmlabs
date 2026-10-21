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
const escA = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
// Only Planespotters thumbnails and photo pages are trusted from a saved catch.
export const safeSpot = p => p && /^https:\/\/[a-z0-9.-]+\.plnspttrs\.net\/[\w./-]+$/.test(p.src || '') && /^https:\/\/www\.planespotters\.net\/[\w./?=&%-]*$/.test(p.link || '') ? p : null;
// What to show: the exact airframe photo from the catch, the type photo, the family render, then a silhouette.
export function cardArt(info, tier, owned, eager, entry) {
  const lazy = eager ? '' : ' loading="lazy"';
  if (!owned) return silhouette(info.cat, tier, false);
  const spot = safeSpot(entry && entry.photo);
  if (spot) return `<img class="photo" src="${escA(spot.src)}" alt="${escA((entry.reg || entry.cs) + ', the ' + info.name + ' you caught')}" width="420" height="280"${lazy} decoding="async" referrerpolicy="no-referrer">`;
  if (photos[info.code]) return `<img class="photo" src="./img/photos/${info.code}.webp" alt="${escA(info.name)}" width="640" height="400"${lazy} decoding="async">`;
  // A military operator's A306 is a tanker, so it gets the tanker render when there is one.
  const key = entry && entry.mil && manifest.has(info.code + '_TKR') ? info.code + '_TKR' : artKey(info);
  if (!key) return silhouette(info.cat, tier, owned);
  return `<img class="art" src="./img/cards/${key}.webp" alt="" width="360" height="240"${lazy} decoding="async">`;
}
// The credit each photo licence asks for, as a small line on the card.
export function photoCredit(info, entry, owned) {
  if (!owned) return '';
  const spot = safeSpot(entry && entry.photo);
  if (spot) return `<p class="cc-credit">Photo <a href="${escA(spot.link)}" target="_blank" rel="noopener">${escA(spot.by || 'Planespotters.net')}</a> via Planespotters.net</p>`;
  const p = photos[info.code];
  if (!p) return '';
  return `<p class="cc-credit">Photo <a href="${escA(p.source)}" target="_blank" rel="noopener">${escA(p.author)}</a>, ${p.licenceUrl ? `<a href="${escA(p.licenceUrl)}" target="_blank" rel="noopener">${escA(p.licence)}</a>` : escA(p.licence)}</p>`;
}
