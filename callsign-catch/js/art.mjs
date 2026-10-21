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
  unknown: '<path d="M10 50h80l6 2-6 2H10l-4-2z"/><path d="M44 52 30 78h7l20-24M44 52 30 26h7l20 24M16 52l-6-12h5l9 11M16 52l-6 10h5l9-9"/>'};
export function silhouette(cat, tier, owned) {
  const c = owned ? tierColour(tier) : '#2c3a30';
  return `<svg class="sil" viewBox="0 0 100 104" aria-hidden="true" focusable="false"><g transform="rotate(-90 50 52)" fill="${c}" stroke="${c}" stroke-linejoin="round" stroke-width="1">${P[cat] || P.unknown}</g></svg>`;
}
let manifest = new Set();
export function setArtManifest(codes) { manifest = new Set(codes || []); }
const FALLBACK = {narrow: 'FB_JET', wide: 'FB_JET', quad: 'FB_JET', bizjet: 'FB_JET', turboprop: 'FB_PROP', prop: 'FB_PROP', heli: 'FB_HELI', fighter: 'FB_MIL', military: 'FB_MIL', miltransport: 'FB_MIL', unknown: 'FB_UNKNOWN'};
export function artKey(info) { if (manifest.has(info.code)) return info.code; const f = FALLBACK[info.cat] || 'FB_UNKNOWN'; return manifest.has(f) ? f : null; }
// The render for the type, or the closest fallback by category; a drawn silhouette only if neither exists.
export function cardArt(info, tier, owned, eager) {
  const key = artKey(info);
  if (!key) return silhouette(info.cat, tier, owned);
  return `<img class="art${owned ? '' : ' dark'}" src="./img/cards/${key}.webp" alt="" width="360" height="240"${eager ? '' : ' loading="lazy"'} decoding="async">`;
}
