// Pure game logic for Night Drop. No DOM here so node can test it.
export const G = 260; // px/s^2 gravity for parcels
export const ROUND_SECONDS = 75;

// UK date gate: 1 Dec to 6 Jan inclusive, in Europe/London.
export function isFestive(date = new Date(), search = '') {
  const q = new URLSearchParams(search);
  if (q.get('xmas') === '1') return true;
  if (q.get('xmas') === '0') return false;
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', month: 'numeric', day: 'numeric' }).formatToParts(date);
  const m = +parts.find(p => p.type === 'month').value;
  const d = +parts.find(p => p.type === 'day').value;
  return m === 12 || (m === 1 && d <= 6);
}

// Parcel falls from height h with horizontal speed vx; wind adds steady sideways acceleration.
export function landingOffset(h, vx, wind, drag = 0.35) {
  const t = Math.sqrt((2 * h) / G);
  // relative to the drop point in world space, wind pushes toward its own sign
  return vx * t * (1 - drag * 0.5) + 0.5 * wind * t * t;
}

// Score a landing given distance from the target centre and target half width.
export function scoreLanding(dist, halfWidth, combo) {
  const a = Math.abs(dist);
  if (a > halfWidth) return { hit: false, grade: 'miss', points: 0, combo: 0 };
  const r = a / halfWidth;
  const grade = r < 0.2 ? 'perfect' : r < 0.55 ? 'great' : 'good';
  const base = grade === 'perfect' ? 300 : grade === 'great' ? 150 : 75;
  const next = combo + 1;
  const mult = Math.min(1 + Math.floor(next / 3) * 0.5, 4);
  return { hit: true, grade, points: Math.round(base * mult), combo: next, mult };
}

// Deterministic pseudo random so a run can be reproduced in tests.
export function rng(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

export function makeWind(r) { return Math.round((r() * 2 - 1) * 60); }

export function bestScore(store, score) {
  const prev = +(store.get() || 0);
  if (score > prev) { store.set(String(score)); return { best: score, isNew: true }; }
  return { best: prev, isNew: false };
}
