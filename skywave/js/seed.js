/** Deterministic, versioned daily seeds. No locale-dependent dates or Math.random. */
export const SEED_VERSION = 'skywave-v1';
export function hashString(text) {
  let h = 2166136261;
  for (const c of String(text)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function mulberry32(seed) {
  let state = seed >>> 0;
  return function random() {
    let t = state += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
export function utcDateKey(date = new Date()) {
  const d = new Date(date);
  if (!Number.isFinite(d.getTime())) throw new RangeError('Invalid UTC date');
  return d.toISOString().slice(0, 10);
}
export function dailySeed(date = new Date()) { return hashString(`${SEED_VERSION}:${utcDateKey(date)}`); }
export function dayNumber(date = new Date()) { return Math.floor((Date.parse(utcDateKey(date)) - Date.UTC(2026,0,1))/86400000) + 1; }
export const randomInt = (rng, min, max) => min + Math.floor(rng() * (max - min + 1));
export const pick = (rng, values) => values[Math.floor(rng() * values.length)];
export function shuffle(rng, values) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) { const j = randomInt(rng,0,i); [result[i],result[j]] = [result[j],result[i]]; }
  return result;
}
