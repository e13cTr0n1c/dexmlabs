import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {prepare} from '../../shared/engine.mjs';
import {createPreview} from '../../shared/preview.mjs';
import {DEMO_FEED} from '../../shared/demo-feed.mjs';
import {encodeImport, decodeImport} from '../js/fragment.mjs';
import {shouldMock} from '../js/account.mjs';

const read = rel => JSON.parse(fs.readFileSync(new URL(rel, import.meta.url), 'utf8'));
const ctx = prepare({
  table: read('../../shared/types.json'),
  teams: read('../data/display-teams.json'),
  hexTypes: read('../data/hex-types.json'),
  liveries: read('../data/liveries.json'),
  oneOffs: read('../data/one-offs.json'),
  csTypes: read('../data/callsign-types.json'),
  ranges: read('../data/icao-ranges.json'),
});

test('practice mode is on when no project is configured', () => {
  assert.equal(shouldMock(''), true);
  assert.equal(shouldMock('?mock=1'), true);
  globalThis.window = {CALLSIGN_CONFIG: {supabaseUrl: 'https://example.supabase.co', supabaseAnonKey: 'public-anon'}};
  assert.equal(shouldMock(''), false);
  assert.equal(shouldMock('?mock=1'), true);
  assert.equal(shouldMock('?mock=0'), false);
  delete globalThis.window;
});

test('the practice account catches preview traffic and refuses a second pass', async () => {
  const preview = createPreview({ctx, feed: DEMO_FEED, now: () => Date.parse('2026-11-19T15:00:00Z')});
  const caught = await preview.catch('practice-google', 'BAW117');
  assert.equal(caught.ok, true);
  assert.equal(caught.card.aircraft_type, 'A320');
  assert.equal(caught.card.rarity, 'common');
  assert.equal(caught.card.source, 'live');
  const again = await preview.catch('practice-google', 'BAW117');
  assert.equal(again.ok, false);
  assert.equal(again.error, 'dupe');
  const ground = await preview.catch('practice-google', 'GROUND1');
  assert.equal(ground.error, 'ground');
  const cards = await preview.cards('practice-google');
  assert.equal(cards.length, 1);
});

test('a guest save migrates once and lists what was left out', async () => {
  const preview = createPreview({ctx, feed: DEMO_FEED, now: () => Date.parse('2026-11-19T15:00:00Z')});
  const save = {
    v: 1,
    cards: {A388: {code: 'A388', tier: 'rare', count: 1}, A320: {code: 'A320', tier: 'legendary', count: 1}},
    log: [
      {t: '2026-10-21T14:00:00.000Z', cs: 'UAE1', hex: '8963f4', type: 'A388', tier: 'rare', reg: 'A6-EOW'},
      {t: '2026-10-21T14:05:00.000Z', cs: 'BAW117', hex: '4009c6', type: 'A320', tier: 'legendary'},
    ],
  };
  const first = await preview.migrate('practice-google', save);
  assert.equal(first.ok, true);
  assert.equal(first.imported.length, 1);
  assert.equal(first.imported[0].source, 'legacy');
  assert.equal(first.imported[0].aircraft_type, 'A388');
  assert.equal(first.rejected.length, 1);
  assert.match(first.rejected[0].reason, /works out as common/);
  const second = await preview.migrate('practice-google', save);
  assert.equal(second.ok, false);
  assert.equal(second.error, 'already');
  assert.equal((await preview.cards('practice-google')).length, 1);
});

test('a carried hangar survives a round trip through the address fragment', () => {
  const save = {v: 1, cards: {A320: {count: 1}}, log: [{t: '2026-10-21T12:00:00.000Z', cs: 'BAW117', type: 'A320'}]};
  const frag = '#import=' + encodeImport(JSON.stringify(save));
  const back = decodeImport(frag);
  assert.deepEqual(back, save);
  assert.throws(() => decodeImport('#import=' + encodeImport('{"v":2}')));
});

test('the game page copy has no spaced dash or dash punctuation', () => {
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const text = html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ');
  assert.equal(/[\u2013\u2014]|\s-\s/.test(text), false);
});
