import {prepare, planCatch, reviewSave, hangarFromCards, expectedRarity} from '../../shared/engine.mjs';
import {memoryRepo} from '../../shared/repo.mjs';
import {handleCatch, handleMigrate, fetchAdsb, adsbUrl} from '../functions/_shared/http.mjs';

const read = async rel => JSON.parse(await Deno.readTextFile(new URL(rel, import.meta.url)));
const ctx = prepare({
  table: await read('../../shared/types.json'),
  teams: await read('../../web/data/display-teams.json'),
  hexTypes: await read('../../web/data/hex-types.json'),
  liveries: await read('../../web/data/liveries.json'),
  oneOffs: await read('../../web/data/one-offs.json'),
  csTypes: await read('../../web/data/callsign-types.json'),
  ranges: await read('../../web/data/icao-ranges.json'),
});

const NOW = Date.parse('2026-11-19T12:00:00Z');
const eq = (a, b, msg) => { if (a !== b) throw new Error((msg ? msg + ': ' : '') + JSON.stringify(a) + ' !== ' + JSON.stringify(b)); };
const ok = (v, msg) => { if (!v) throw new Error(msg || 'expected truth'); };

const air = (over = {}) => ({hex: '4009c6', flight: 'BAW117', r: 'G-EUUI', t: 'A320', alt_baro: 35000, gs: 430, seen: 4, dbFlags: 0, category: 'A3', ...over});

function harness(over = {}) {
  const repo = over.repo || memoryRepo();
  const calls = [];
  const deps = {
    repo,
    now: () => over.now == null ? NOW : over.now,
    ctx: async () => ctx,
    getUser: async () => over.user === null ? null : {id: over.user || 'user-1'},
    fetchFeed: async callsign => {
      calls.push(callsign);
      if (over.fetchFeed) return over.fetchFeed(callsign);
      return {body: {ac: [air()]}};
    },
  };
  return {repo, calls, deps};
}

const post = (body, deps, fn) => (fn || handleCatch)(new Request('http://local/fn', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(body)}), deps);

Deno.test('adsb.lol is asked by callsign and the answer is not trusted for rarity', async () => {
  let seen = '';
  const fetched = await fetchAdsb('BAW117', async url => {
    seen = url;
    return new Response(JSON.stringify({ac: [air({t: 'A388'})]}), {status: 200, headers: {'content-type': 'application/json'}});
  });
  eq(seen, 'https://api.adsb.lol/v2/callsign/BAW117');
  eq(adsbUrl('BAW117'), seen);
  const h = harness({fetchFeed: async () => fetched});
  const res = await post({callsign: ' baw-117 ', rarity: 'mythic'}, h.deps);
  eq(res.status, 200);
  const body = await res.json();
  eq(body.ok, true);
  eq(body.card.aircraft_type, 'A388');
  eq(body.card.rarity, 'rare');
  eq(body.card.source, 'live');
  eq(h.calls[0], 'BAW117');
  eq(body.card.rarity === 'mythic', false);
});

Deno.test('a plane on the ground or gone quiet is not a card', async () => {
  const ground = harness({fetchFeed: async () => ({body: {ac: [air({flight: 'GROUND1', t: 'B738', alt_baro: 'ground'})]}})});
  const g = await (await post({callsign: 'GROUND1'}, ground.deps)).json();
  eq(g.ok, false);
  eq(g.error, 'ground');
  eq(ground.repo.state.cards.length, 0);
  ok(ground.repo.state.log.length === 1);

  const stale = harness({fetchFeed: async () => ({body: {ac: [air({flight: 'QUIET1', seen: 180})]}})});
  const s = await (await post({callsign: 'QUIET1'}, stale.deps)).json();
  eq(s.error, 'stale');

  const missing = harness({fetchFeed: async () => ({body: {ac: []}})});
  const m = await (await post({callsign: 'NOBODY'}, missing.deps)).json();
  eq(m.error, 'notfound');
});

Deno.test('the same callsign and aircraft are refused for six hours, and the rate limit skips the feed', async () => {
  const h = harness();
  const first = await (await post({callsign: 'BAW117'}, h.deps)).json();
  eq(first.ok, true);
  const second = await post({callsign: 'BAW117'}, h.deps);
  eq(second.status, 409);
  eq((await second.json()).error, 'dupe');
  eq(h.repo.state.cards.length, 1);

  const other = await (await post({callsign: 'BAW117'}, harness({
    repo: h.repo,
    fetchFeed: async () => ({body: {ac: [air({hex: '400aaa'})]}}),
  }).deps)).json();
  eq(other.ok, true, 'a different aircraft with the same callsign is still a catch');

  const limited = harness();
  for (let i = 0; i < 30; i++) {
    await limited.repo.insertLog({user_id: 'user-1', callsign: 'X' + i, icao24: 'abc123', caught_at: new Date(NOW - 1000).toISOString(), accepted: false, reason: 'notfound'});
  }
  const blocked = await post({callsign: 'BAW117'}, limited.deps);
  eq(blocked.status, 429);
  eq(limited.calls.length, 0);

  const recent = Array.from({length: 500}, (_, i) => ({callsign: 'OLD', icao24: '00000' + (i % 10), caught_at: new Date(NOW - 60 * 60 * 1000).toISOString(), accepted: false, reason: 'notfound'}));
  const day = planCatch({callsign: 'BAW117', feedBody: {ac: [air()]}, recent, now: NOW, ctx});
  eq(day.error, 'rate');
});

Deno.test('signed out requests are refused', async () => {
  const h = harness({user: null});
  const res = await post({callsign: 'BAW117'}, h.deps);
  eq(res.status, 401);
  eq(h.repo.state.cards.length, 0);
});

Deno.test('an old save is checked and can only be brought across once', async () => {
  const good = {t: '2026-10-21T12:00:00.000Z', cs: 'BAW117', hex: '4009c6', type: 'A320', tier: 'common', reg: 'G-EUUI'};
  const bumped = {t: '2026-10-21T12:05:00.000Z', cs: 'RRR2303', hex: '43c700', type: 'A332', tier: 'rare', reg: 'ZZ343', mil: 1};
  eq(expectedRarity(bumped, ctx).rarity, 'rare');
  const future = {t: new Date(NOW + 60 * 60 * 1000).toISOString(), cs: 'UAE1', hex: '8963f4', type: 'A388', tier: 'rare'};
  const gift = {t: '2026-10-21T12:10:00.000Z', cs: 'GIFT1', hex: '4009c6', type: 'A320', tier: 'mythic', gift: true};
  const invented = {t: '2026-10-21T12:20:00.000Z', cs: 'NOPE1', hex: '4009c6', type: 'NOPE', tier: 'uncommon'};
  const mythicClaim = {t: '2026-10-21T12:30:00.000Z', cs: 'FAST1', hex: '111111', type: 'A320', tier: 'mythic'};
  const save = {v: 1, cards: {A320: {count: 1}, A332: {count: 1}}, log: [good, bumped, future, gift, invented, mythicClaim]};
  const h = harness();
  const res = await post({save}, h.deps, handleMigrate);
  eq(res.status, 200);
  const body = await res.json();
  eq(body.ok, true);
  eq(body.imported.length, 2);
  eq(body.imported.every(c => c.source === 'legacy'), true);
  const reasons = body.rejected.map(r => r.reason).join(' ');
  ok(reasons.includes('future'), reasons);
  ok(reasons.includes('Gift'), reasons);
  ok(reasons.includes('not in my list'), reasons);
  ok(reasons.includes('works out as'), reasons);

  const again = await post({save}, h.deps, handleMigrate);
  eq(again.status, 409);
  eq((await again.json()).error, 'already');
  eq(h.repo.state.cards.length, 2);

  const burst = [];
  for (let i = 0; i < 4; i++) burst.push({t: new Date(NOW - 86400000 + i * 1000).toISOString(), cs: 'BAW' + i, hex: '4009c' + i, type: 'A320', tier: 'common'});
  const tight = reviewSave({v: 1, cards: {}, log: burst}, ctx, NOW, {maxPerHour: 3, maxCards: 2});
  eq(tight.accepted.length, 2);
  eq(tight.rejected.length, 2);
});

Deno.test('the hangar shows the rarity the server stored', () => {
  const s = hangarFromCards([
    {aircraft_type: 'A388', rarity: 'common', callsign: 'UAE1', icao24: '8963f4', caught_at: '2026-10-21T12:00:00.000Z', source: 'legacy'},
    {aircraft_type: 'A388', rarity: 'common', callsign: 'UAE2', icao24: '8963f5', caught_at: '2026-10-21T13:00:00.000Z', source: 'live'},
  ], ctx, []);
  eq(s.cards.A388.tier, 'common');
  eq(s.cards.A388.count, 2);
  eq(s.points, 12);
  eq(s.log[0].legacy, false);
  eq(s.log[1].legacy, true);
});

Deno.test('row level security is enabled and players cannot write cards', async () => {
  const sql = await Deno.readTextFile(new URL('../migrations/20261119120000_init.sql', import.meta.url));
  for (const table of ['profiles', 'cards', 'catches_log']) {
    ok(new RegExp('alter table public\\.' + table + ' enable row level security', 'i').test(sql), table);
  }
  ok(/create view public\.scores/i.test(sql));
  ok(/security_invoker = true/i.test(sql));
  ok(/using \(user_id = auth\.uid\(\)\)/i.test(sql));
  ok(/using \(id = auth\.uid\(\)\)/i.test(sql));
  ok(!/on public\.cards[\s\S]{0,80}for insert/i.test(sql));
  ok(!/on public\.cards[\s\S]{0,80}for update/i.test(sql));
  ok(!/on public\.cards[\s\S]{0,80}for delete/i.test(sql));
  ok(!/grant\s+(insert|update|delete)/i.test(sql));
  ok(/grant select on public\.cards to authenticated/i.test(sql));
  ok(/revoke all on public\.cards from anon, authenticated/i.test(sql));

  const canRead = (role, uid, owner) => role === 'authenticated' && uid === owner;
  const canWrite = role => role === 'service_role';
  eq(canRead('authenticated', 'a', 'a'), true);
  eq(canRead('authenticated', 'a', 'b'), false);
  eq(canRead('anon', 'a', 'a'), false);
  eq(canWrite('authenticated'), false);
  eq(canWrite('service_role'), true);
});
