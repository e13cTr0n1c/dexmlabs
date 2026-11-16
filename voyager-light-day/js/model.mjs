// Countdown, distance sketch and Morse timing for the Voyager light day page.
// The puzzle pages print Morse with the same dot, dash and letter gap. They do not time it, so the clock lives here.

// NASA Science, "Voyager 1: What Is a Light-Day":
// Wednesday, Nov. 18, 2026, at 5:16:07 a.m. EST.
// NASA Science, "Where Are Voyager 1 and Voyager 2 Now?":
// Wednesday, Nov. 18, 2026, at 2:16:07 a.m. PST.
// Those are the same instant: 10:16:07 GMT.
export const EPOCH_MS = Date.parse('2026-11-18T10:16:07Z');

// Same NASA page: a light day is 16,094,799,096 miles (25,902,068,356 kilometres).
export const EPOCH_KM = 25902068356;
export const EPOCH_MILES = 16094799096;

// Geocentric range rate around that instant, from NASA/JPL Horizons (Voyager 1, target -31,
// geometric state as seen from Earth). The daily samples on 18 and 19 November 2026 UTC
// give 25.40699 km/s at 10:16:07 when the rate is taken to change evenly through the day.
// Rounded to three decimal places.
export const RATE_KM_S = 25.407;

// Printed on a Horizons ephemeris: 1 au = 149597870.700 km, c = 299792.458 km/s.
export const AU_KM = 149597870.7;
export const C_KM_S = 299792.458;

// Dot length for Flash VGR. A dash is three dots. One dot inside a letter. Three dots between letters.
export const UNIT_MS = 120;
export const LETTER_GAP_UNITS = 3;
export const WORD_GAP_UNITS = 7;

const PATTERN = { V: '...-', G: '--.', R: '.-.' };

export function splitSeconds(total) {
  const whole = Math.max(0, total);
  return {
    days: Math.floor(whole / 86400),
    hours: Math.floor((whole % 86400) / 3600),
    minutes: Math.floor((whole % 3600) / 60),
    seconds: whole % 60,
    totalSeconds: whole,
  };
}

// Time left until the mark. A part second still shows as one second, then the mark has passed.
export function countdown(nowMs, targetMs = EPOCH_MS) {
  const ms = targetMs - nowMs;
  if (ms <= 0) return { passed: true, ms: 0, days: 0, hours: 0, minutes: 0, seconds: 0, totalSeconds: 0 };
  return { passed: false, ms, ...splitSeconds(Math.ceil(ms / 1000)) };
}

export function elapsedParts(nowMs, targetMs = EPOCH_MS) {
  if (nowMs < targetMs) return splitSeconds(0);
  return splitSeconds(Math.floor((nowMs - targetMs) / 1000));
}

// Straight line through NASA's published distance, at the Horizons range rate.
export function distanceKm(nowMs) {
  return EPOCH_KM + RATE_KM_S * (nowMs - EPOCH_MS) / 1000;
}

export function distanceMiles(nowMs) {
  return distanceKm(nowMs) * EPOCH_MILES / EPOCH_KM;
}

export function distanceAu(nowMs) {
  return distanceKm(nowMs) / AU_KM;
}

// NASA's kilometre figure is treated as exactly 24 hours of light. A strict c times 86400
// is about 15 km longer, which is rounding on the published mile figure.
export function lightTimeSeconds(nowMs) {
  return 86400 + (distanceKm(nowMs) - EPOCH_KM) / C_KM_S;
}

export function formatClock(totalSeconds) {
  const safe = Math.max(0, totalSeconds);
  const whole = Math.floor(safe + 1e-9);
  const ms = Math.min(999, Math.floor((safe - whole) * 1000 + 1e-6));
  const h = Math.floor(whole / 3600);
  const m = Math.floor((whole % 3600) / 60);
  const s = whole % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return `${h}:${pad(m)}:${pad(s)}.${String(ms).padStart(3, '0')}`;
}

export function morseEvents(text, unitMs = UNIT_MS) {
  const letters = String(text).toUpperCase().replace(/[^A-Z]/g, '');
  const events = [];
  for (let i = 0; i < letters.length; i++) {
    const pat = PATTERN[letters[i]];
    if (!pat) throw new Error('No pattern for ' + letters[i]);
    for (let j = 0; j < pat.length; j++) {
      const units = pat[j] === '-' ? 3 : 1;
      events.push({ on: true, units, ms: units * unitMs });
      if (j < pat.length - 1) events.push({ on: false, units: 1, ms: unitMs });
    }
    if (i < letters.length - 1) events.push({ on: false, units: LETTER_GAP_UNITS, ms: LETTER_GAP_UNITS * unitMs });
  }
  return events;
}

export function loopGap(unitMs = UNIT_MS) {
  return { on: false, units: WORD_GAP_UNITS, ms: WORD_GAP_UNITS * unitMs };
}

export function timelineMs(events) {
  return events.reduce((sum, ev) => sum + ev.ms, 0);
}

// Flashes need an explicit yes when the browser asks for less motion.
export function flashAllowed(reducedMotion, consented) {
  return !reducedMotion || consented === true;
}
