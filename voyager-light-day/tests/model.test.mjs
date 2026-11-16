import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EPOCH_MS, EPOCH_KM, EPOCH_MILES, RATE_KM_S, C_KM_S, UNIT_MS,
  countdown, elapsedParts, distanceKm, distanceMiles, distanceAu, lightTimeSeconds, formatClock,
  morseEvents, loopGap, timelineMs, flashAllowed,
} from '../js/model.mjs';

const DAY = 86400000;

test('countdown reaches the NASA instant and not a second early', () => {
  assert.equal(countdown(EPOCH_MS).passed, true);
  assert.equal(countdown(EPOCH_MS + 1).passed, true);
  const almost = countdown(EPOCH_MS - 1);
  assert.equal(almost.passed, false);
  assert.equal(almost.totalSeconds, 1);
  const left = countdown(EPOCH_MS - (2 * DAY + 3 * 3600000 + 4 * 60000 + 5000));
  assert.deepEqual(
    { days: left.days, hours: left.hours, minutes: left.minutes, seconds: left.seconds },
    { days: 2, hours: 3, minutes: 4, seconds: 5 },
  );
  const hour = countdown(EPOCH_MS - 90 * 60000);
  assert.equal(hour.passed, false);
  assert.equal(hour.days, 0);
  assert.equal(hour.hours, 1);
  assert.equal(hour.minutes, 30);
  assert.equal(hour.seconds, 0);
});

test('a fraction over an exact second still rounds the countdown up', () => {
  const left = countdown(EPOCH_MS - 1001);
  assert.equal(left.totalSeconds, 2);
});

test('elapsed time starts at the mark', () => {
  assert.equal(elapsedParts(EPOCH_MS - 1).totalSeconds, 0);
  const over = elapsedParts(EPOCH_MS + 3661000);
  assert.deepEqual(
    { days: over.days, hours: over.hours, minutes: over.minutes, seconds: over.seconds },
    { days: 0, hours: 1, minutes: 1, seconds: 1 },
  );
});

test('distance is NASA at the mark and then moves at the Horizons rate', () => {
  assert.equal(distanceKm(EPOCH_MS), EPOCH_KM);
  assert.equal(Math.round(distanceMiles(EPOCH_MS)), EPOCH_MILES);
  assert.equal(distanceKm(EPOCH_MS + 1000), EPOCH_KM + RATE_KM_S);
  assert.equal(distanceKm(EPOCH_MS + 3600000), EPOCH_KM + RATE_KM_S * 3600);
  assert.ok(Math.abs(distanceAu(EPOCH_MS) - EPOCH_KM / 149597870.7) < 1e-12);
  assert.equal(lightTimeSeconds(EPOCH_MS), 86400);
  assert.equal(formatClock(lightTimeSeconds(EPOCH_MS)), '24:00:00.000');
  const later = lightTimeSeconds(EPOCH_MS + 1000);
  assert.ok(Math.abs(later - (86400 + RATE_KM_S / C_KM_S)) < 1e-9);
  assert.equal(formatClock(86400.001), '24:00:00.001');
});

test('VGR Morse uses a 120 ms dot, a dash of 3, one unit inside a letter and three between letters', () => {
  const events = morseEvents('VGR');
  const units = events.map((ev) => (ev.on ? (ev.units === 3 ? '-' : '.') : String(ev.units)));
  assert.deepEqual(units, ['.', '1', '.', '1', '.', '1', '-', '3', '-', '1', '-', '1', '.', '3', '.', '1', '-', '1', '.']);
  for (const ev of events) assert.equal(ev.ms, ev.units * UNIT_MS);
  assert.equal(UNIT_MS, 120);
  assert.equal(events.find((ev) => ev.on && ev.units === 3).ms, 360);
  const gaps = events.filter((ev) => !ev.on).map((ev) => ev.units);
  assert.deepEqual(gaps, [1, 1, 1, 3, 1, 1, 3, 1, 1]);
  assert.equal(timelineMs(events), 31 * 120);
  const again = loopGap();
  assert.equal(again.on, false);
  assert.equal(again.units, 7);
  assert.equal(again.ms, 840);
  assert.equal(timelineMs(events.concat([again])) - timelineMs(events), 7 * 120);
});

test('reduced motion blocks the flashes until someone agrees', () => {
  assert.equal(flashAllowed(false, false), true);
  assert.equal(flashAllowed(true, false), false);
  assert.equal(flashAllowed(true, true), true);
});
