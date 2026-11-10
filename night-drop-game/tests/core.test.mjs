import test from 'node:test';
import assert from 'node:assert/strict';
import { isFestive, landingOffset, scoreLanding, rng, bestScore } from '../js/core.mjs';

test('festive window in UK time', () => {
  assert.equal(isFestive(new Date('2026-12-01T00:30:00Z')), true);
  assert.equal(isFestive(new Date('2027-01-06T23:30:00Z')), true);
  assert.equal(isFestive(new Date('2027-01-07T00:30:00Z')), false);
  assert.equal(isFestive(new Date('2026-11-30T23:30:00Z')), false);
  assert.equal(isFestive(new Date('2026-07-01T12:00:00Z'), '?xmas=1'), true);
  assert.equal(isFestive(new Date('2026-12-25T12:00:00Z'), '?xmas=0'), false);
});
test('wind and speed shift the landing', () => {
  const still = landingOffset(200, 0, 0);
  assert.equal(still, 0);
  assert.ok(landingOffset(200, 100, 0) > 0);
  assert.ok(landingOffset(200, 100, 50) > landingOffset(200, 100, 0));
  assert.ok(landingOffset(200, 100, -50) < landingOffset(200, 100, 0));
});
test('scoring and combo', () => {
  assert.equal(scoreLanding(50, 40, 3).hit, false);
  assert.equal(scoreLanding(50, 40, 3).combo, 0);
  const p = scoreLanding(2, 40, 0);
  assert.equal(p.grade, 'perfect'); assert.equal(p.points, 300);
  assert.equal(scoreLanding(2, 40, 2).points, 450);
  assert.ok(scoreLanding(2, 40, 50).mult <= 4);
});
test('rng is deterministic and high score keeps the best', () => {
  const a = rng(7), b = rng(7);
  assert.equal(a(), b());
  let v = null; const s = { get: () => v, set: x => { v = x; } };
  assert.equal(bestScore(s, 100).isNew, true);
  assert.equal(bestScore(s, 50).best, 100);
});
