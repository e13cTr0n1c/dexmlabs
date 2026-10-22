// Rarity, catch and set rules. Run: node callsign-catch/tests/unit.mjs
import fs from 'fs'; import assert from 'assert/strict';
import * as C from '../js/core.mjs'; import {POINTS} from '../js/config.mjs';
const dir = new URL('../data/', import.meta.url);
const table = JSON.parse(fs.readFileSync(new URL('types.json', dir))), specials = JSON.parse(fs.readFileSync(new URL('specials.json', dir)));
const teams = JSON.parse(fs.readFileSync(new URL('display-teams.json', dir))); C.setTeams(teams);
const hexTypes = JSON.parse(fs.readFileSync(new URL('hex-types.json', dir))), ranges = JSON.parse(fs.readFileSync(new URL('icao-ranges.json', dir))); C.setHexTypes(hexTypes); C.setRanges(ranges);
const idx = C.indexTypes(table); let n = 0; const t = (name, fn) => { fn(); n++; console.log('PASS ' + name); };
const live = (o = {}) => C.pickLive({ac: [Object.assign({flight: 'BAW1  ', r: 'G-XLEA', hex: '4005c1', t: 'A388', alt_baro: 37000, gs: 488, seen: 1}, o)]}).ac;
t('table: at least 150 types, valid tiers and categories, unique codes, reward fields', () => {
  assert.ok(table.types.length >= 150); assert.equal(new Set(table.types.map(x => x.code)).size, table.types.length);
  for (const x of table.types) { assert.ok(C.TIERS.includes(x.tier), x.code); assert.ok(x.name, x.code);
    if (x.gen) { assert.ok(/^[A-Z][0-8C][A-Z-]$/.test(x.d) && 'LMHJ-'.includes(x.w), x.code); continue; }
    assert.ok(x.fact && x.maker !== undefined, x.code); assert.deepEqual(Object.keys(x.reward).sort(), ['code', 'label', 'url']); }
  assert.ok(!/[\u2013\u2014]/.test(JSON.stringify(table) + JSON.stringify(specials)), 'no dashes');
});
t('rarity by type: A320 and 737 common, 747 and A380 rare, Beluga and An-124 legendary', () => {
  for (const c of ['A320', 'A20N', 'B738', 'B38M']) assert.equal(idx.get(c).tier, 'common', c);
  for (const c of ['B744', 'B748', 'A388', 'A35K', 'B77F']) assert.equal(idx.get(c).tier, 'rare', c);
  for (const c of ['A3ST', 'A337', 'A124', 'E3TF', 'HAWK', 'BLCF']) assert.equal(idx.get(c).tier, 'legendary', c);
});
t('unknown types default to uncommon; military operators lift to at least rare, display callsigns are legendary', () => {
  const u = C.typeInfo('ZZZZ', idx, table); assert.equal(u.tier, 'uncommon'); assert.equal(C.tierFor({}, u), 'uncommon');
  assert.equal(C.tierFor({dbFlags: 1, callsign: 'ASCOT1'}, idx.get('A320')), 'rare'); assert.equal(C.tierFor({dbFlags: 1, callsign: 'ASCOT1'}, idx.get('B744')), 'legendary');
  assert.equal(C.tierFor({callsign: 'RED1'}, idx.get('A320')), 'legendary');
});
t('query parsing: callsign, registration and hex', () => {
  assert.deepEqual(C.parseQuery(' baw117 '), {kind: 'callsign', value: 'BAW117', kinds: ['callsign', 'reg']});
  assert.deepEqual(C.parseQuery('g-xlea'), {kind: 'reg', value: 'G-XLEA', kinds: ['reg']});
  assert.deepEqual(C.parseQuery('4ca7b5'), {kind: 'hex', value: '4ca7b5', kinds: ['hex']});
  assert.equal(C.parseQuery(''), null); assert.equal(C.parseQuery('<script>'), null);
});
t('live only: ground, stale and not found never catch', () => {
  assert.equal(C.pickLive({ac: []}).reason, 'notfound');
  assert.equal(C.pickLive({ac: [{flight: 'X1', alt_baro: 'ground', seen: 1}]}).reason, 'ground');
  assert.equal(C.pickLive({ac: [{flight: 'X1', alt_baro: 3000, seen: 300}]}).reason, 'stale');
  assert.equal(live().callsign, 'BAW1');
});
t('catch scoring, once per callsign per day, duplicates add XP', () => {
  const day = new Date(2026, 9, 21, 12); let r = C.applyCatch(null, live(), day, idx, table, null);
  assert.equal(r.status, 'new'); assert.equal(r.gain, POINTS.rare); assert.equal(r.state.points, 60);
  assert.equal(C.applyCatch(r.state, live(), day, idx, table, null).status, 'today');
  r = C.applyCatch(r.state, live({flight: 'UAE1'}), day, idx, table, null); assert.equal(r.status, 'dupe'); assert.ok(r.state.xp > 0); assert.equal(r.state.cards.A388.count, 2);
  assert.equal(C.applyCatch(r.state, live(), new Date(2026, 9, 22, 12), idx, table, null).status, 'dupe', 'next day it counts again');
});
t('wanted type: same for everyone, double points once, no repeat within 14 days', () => {
  const w = C.wantedFor(new Date(Date.UTC(2026, 9, 21, 9)), table, specials); assert.ok(C.WANTED_POOL.includes(w.code));
  assert.equal(C.wantedFor(new Date(Date.UTC(2026, 9, 21, 22)), table, specials).code, w.code);
  const seq = []; for (let d = 0; d < 60; d++) seq.push(C.wantedCode(Date.UTC(2026, 9, 1) + d * 864e5, table));
  for (let i = 0; i < seq.length; i++) assert.ok(!seq.slice(Math.max(0, i - 14), i).includes(seq[i]), 'repeat at ' + i);
  const r = C.applyCatch(null, live({t: w.code}), new Date(2026, 9, 21, 12), idx, table, w); assert.ok(r.wanted); assert.equal(r.gain, 2 * POINTS[C.tierFor({}, C.typeInfo(w.code, idx, table))]);
});
t('special cards switch on only with a date', () => {
  assert.ok(specials.cards.length >= 8 && specials.cards.every(c => c.date === '' && c.reward.code === ''));
  const sp = {cards: [Object.assign({}, specials.cards[0], {date: '2026-10-21', mode: 'wanted'})]};
  assert.equal(C.wantedFor(new Date(Date.UTC(2026, 9, 21, 9)), table, sp).code, 'SHIP_CATCH');
});
t('sets and Night owl progress', () => {
  let s = null; for (const [cs, ty] of [['A1', 'A319'], ['A2', 'A320'], ['A3', 'A20N'], ['A4', 'A321'], ['A5', 'A21N']]) s = C.applyCatch(s, live({flight: cs, t: ty, hex: '40000' + cs[1]}), new Date(2026, 9, 21, 2), idx, table, null).state;
  assert.ok(C.setProgress(s, C.SETS.find(x => x.id === 'airbus')).done);
  assert.equal(C.setProgress(s, C.SETS.find(x => x.id === 'night')).got, 3);
  assert.ok(C.setProgress(s, C.SETS.find(x => x.id === 'night')).done);
});
t('rewards only after a legendary catch with a code', () => {
  const info = {reward: {url: 'https://cults3d.com/x', label: 'Model', code: 'ABC'}};
  assert.equal(C.rewardFor(info, 'rare'), null); assert.ok(C.rewardFor(info, 'legendary'));
  assert.equal(C.rewardFor(idx.get('HAWK'), 'legendary'), null, 'empty for now');
});
t('import validation and share text', () => {
  assert.equal(C.validateImport({v: 9}), null); assert.deepEqual(C.validateImport({v: 1, cards: {'<x>': {tier: 'rare', count: 1}, '????': {tier: 'uncommon', count: 1}}, log: []}).cards, {UNKFW: {code: 'UNKFW', tier: 'uncommon', count: 1}});
  const r = C.applyCatch(null, live(), new Date(2026, 9, 21, 12), idx, table, null);
  assert.ok(C.validateImport(JSON.parse(JSON.stringify(r.state))));
  assert.match(C.shareText(r.entry, r.info, r.tier), /I caught an Airbus A380 ✈ Rare[\s\S]*dexmlabs\.app\/callsign-catch\//);
});

t('full ICAO list: L-39, helicopters and drones are in with sensible tiers', () => {
  assert.ok(table.types.length > 2000);
  const L39 = C.typeInfo('L39', idx, table), q9 = C.typeInfo('Q9', idx, table), mi8 = C.typeInfo('MI8', idx, table);
  assert.equal(L39.cat, 'fighter'); assert.ok(['rare', 'legendary'].includes(L39.tier));
  assert.equal(q9.cat, 'drone'); assert.equal(q9.tier, 'legendary'); assert.equal(mi8.cat, 'heli'); assert.ok(/helicopter with two turboprop engines/.test(mi8.fact), mi8.fact);
});
t('an unknown type never loses a catch: generic card by class plus a one off bonus', () => {
  const base = {hex: 'abc123', callsign: 'XYZ1', reg: 'G-ABCD', alt: 3000, gs: 100, dbFlags: 0, op: ''};
  let s = C.emptyState();
  const r1 = C.applyCatch(s, {...base, type: '', category: 'A7'}, new Date('2026-10-21T10:00:00Z'), idx, table, null);
  assert.equal(r1.info.code, 'UNKHE'); assert.equal(r1.info.cat, 'heli'); assert.ok(r1.newType); assert.equal(r1.gain, 25 + 25);
  const r2 = C.applyCatch(r1.state, {...base, callsign: 'XYZ2', type: '', category: 'B6'}, new Date('2026-10-21T10:01:00Z'), idx, table, null);
  assert.equal(r2.info.code, 'UNKUV'); assert.equal(r2.info.cat, 'drone');
  const r3 = C.applyCatch(r2.state, {...base, callsign: 'XYZ3', type: 'ZZ9Q', category: 'A1'}, new Date('2026-10-21T10:02:00Z'), idx, table, null);
  assert.equal(r3.info.code, 'ZZ9Q'); assert.ok(r3.newType);
  const r4 = C.applyCatch(r3.state, {...base, callsign: 'XYZ4', type: 'ZZ9Q', category: 'A1'}, new Date('2026-10-21T10:03:00Z'), idx, table, null);
  assert.equal(r4.status, 'dupe'); assert.ok(!r4.newType);
  assert.ok(C.validateImport(JSON.parse(JSON.stringify(r4.state))), 'unknown cards survive export and import');
});
t('military operators lift a type to at least rare; squawks give a badge and no points', () => {
  const info = C.typeInfo('A332', idx, table);
  assert.equal(C.tierFor({callsign: 'BAW12', dbFlags: 0}, info), info.tier);
  assert.equal(C.tierFor({callsign: 'RRR6612', dbFlags: 0}, {tier: 'common'}), 'rare', 'RRR alone is military, not a display team');
  assert.equal(C.tierFor({callsign: 'ASCOT481', dbFlags: 0}, {tier: 'common'}), 'rare');
  assert.equal(C.tierFor({callsign: 'XYZ', dbFlags: 1}, {tier: 'rare'}), 'legendary');
  const ac = {hex: 'abc124', callsign: 'EZY77', reg: 'G-EZZZ', type: 'A319', alt: 9000, gs: 250, dbFlags: 0, op: '', squawk: '7700'};
  const quiet = C.applyCatch(C.emptyState(), {...ac, squawk: '1200'}, new Date('2026-10-21T11:00:00Z'), idx, table, null);
  const loud = C.applyCatch(C.emptyState(), ac, new Date('2026-10-21T11:00:00Z'), idx, table, null);
  assert.equal(loud.gain, quiet.gain); assert.equal(loud.entry.sq, '7700'); assert.equal(C.totals(loud.state).moments, 1);
  assert.ok(/general emergency/.test(C.SQUAWKS['7700']) && /radio failure/.test(C.SQUAWKS['7600']));
});
t('Rotor Club and Unmanned sets use real table codes', () => {
  for (const id of ['rotor', 'unmanned']) for (const c of C.SETS.find(x => x.id === id).codes) assert.ok(idx.get(c), c);
});
t('old saves migrate: a ???? card becomes the unidentified card instead of being lost', () => {
  const old = {v: 1, cards: {'????': {code: '????', tier: 'uncommon', count: 2}, A320: {code: 'A320', tier: 'common', count: 1}}, log: [{type: '????', cs: 'X', alt: 1}], days: {}, xp: 0, points: 50};
  const s = C.validateImport(old); assert.ok(s.cards.UNKFW && s.cards.UNKFW.count === 2 && s.cards.A320 && !s.cards['????']); assert.equal(s.log[0].type, 'UNKFW');
});
t('display teams by airframe: a training Hawk on RRR is not the Red Arrows, a listed serial is', () => {
  assert.ok(!/[\u2013\u2014]/.test(JSON.stringify(teams)), 'no dashes');
  const ra = teams.teams.find(x => x.id === 'red-arrows'); assert.ok(ra.airframes.length >= 14 && ra.sources.length);
  for (const t of teams.teams) { assert.ok(t.name && t.country && t.sources.length, t.id); for (const a of t.airframes) assert.ok(a.reg || a.hex); }
  const valley = {hex: '43c9ff', callsign: 'RRR1234', reg: 'ZK010', type: 'HAWK', alt: 3000, gs: 300, dbFlags: 1, op: ''};
  assert.equal(C.teamFor(valley), null); assert.equal(C.tierFor(valley, idx.get('HAWK')), 'legendary', 'a Hawk type is legendary anyway');
  let r = C.applyCatch(null, valley, new Date(2026, 9, 21, 12), idx, table, null);
  assert.equal(r.entry.team, undefined); assert.equal(C.setProgress(r.state, C.SETS.find(x => x.id === 'display')).got, 0);
  const reds = {...valley, hex: '43c0ee', callsign: 'RRR8', reg: 'XX177'};
  assert.equal(C.teamFor(reds).name, 'Red Arrows'); assert.equal(C.teamFor({hex: '43C0EE'}).name, 'Red Arrows', 'hex alone'); assert.equal(C.teamFor({reg: 'xx242'}).name, 'Red Arrows', 'serial alone');
  r = C.applyCatch(r.state, reds, new Date(2026, 9, 21, 12), idx, table, null);
  assert.equal(r.entry.team, 'Red Arrows'); assert.equal(r.tier, 'legendary'); assert.ok(C.setProgress(r.state, C.SETS.find(x => x.id === 'display')).done);
  assert.equal(C.teamFor({callsign: 'RED10'}).name, 'Red Arrows', 'team callsign fallback'); assert.equal(C.teamFor({callsign: 'RED11'}), null);
  assert.equal(C.tierFor({callsign: 'RRR6612', type: 'A332'}, {tier: 'common'}), 'rare');
});
t('hex type overrides: 4984EE is the L-39, and old unidentified catches move to it without losing anything', () => {
  assert.equal(C.hexType('4984EE'), 'L39'); assert.equal(idx.get('L39').name, 'Aero L-39 / L-39NG Albatros');
  assert.ok(!/[\u2013\u2014]/.test(JSON.stringify(hexTypes) + JSON.stringify(ranges)), 'no dashes');
  const base = {callsign: 'BTLE21', reg: '', type: '', alt: 8000, gs: 300, dbFlags: 0, op: '', category: 'A1'};
  let s = C.applyCatch(null, {...base, hex: '4984ee'}, new Date('2026-10-20T10:00:00Z'), idx, table, null).state;
  s = C.applyCatch(s, {...base, callsign: 'XYZ9', hex: '400abc'}, new Date('2026-10-20T10:05:00Z'), idx, table, null).state;
  assert.equal(s.cards.UNKFW.count, 2); const pts = s.points, xp = s.xp, n0 = s.log.length;
  const m = C.migrateHexTypes(C.validateImport(JSON.parse(JSON.stringify(s))), idx, table);
  assert.equal(m.cards.UNKFW.count, 1); assert.equal(m.cards.L39.count, 1); assert.equal(m.cards.L39.last.cs, 'BTLE21');
  assert.equal(m.cards.UNKFW.last.cs, 'XYZ9'); assert.equal(m.points, pts); assert.equal(m.xp, xp); assert.equal(m.log.length, n0);
  assert.equal(m.log.find(e => e.cs === 'BTLE21').type, 'L39');
  const one = C.migrateHexTypes(C.applyCatch(null, {...base, hex: '4984ee'}, new Date('2026-10-20T10:00:00Z'), idx, table, null).state, idx, table);
  assert.ok(!one.cards.UNKFW && one.cards.L39, 'an emptied unidentified card is dropped');
  assert.deepEqual(C.migrateHexTypes(JSON.parse(JSON.stringify(m)), idx, table), m, 'running it twice changes nothing');
});
t('ICAO blocks: 4984EE is Czechia, the military sub range gives the military bump', () => {
  assert.equal(C.countryOf('4984EE'), 'Czechia'); assert.equal(C.countryOf('400abc'), 'United Kingdom'); assert.equal(C.countryOf('zzz'), '');
  assert.ok(C.milHex('498420') && !C.milHex('4984ee') && C.milHex('43c0ee'));
  const r = C.applyCatch(null, {hex: '4984ee', callsign: 'BTLE21', type: 'ZZZZ', alt: 8000, gs: 300, dbFlags: 0}, new Date(2026, 9, 21, 12), idx, table, null);
  assert.equal(r.entry.origin, 'Czechia');
  const mil = C.applyCatch(null, {hex: '498421', callsign: 'XYZ1', type: '', alt: 8000, gs: 300, dbFlags: 0, category: 'A1'}, new Date(2026, 9, 21, 12), idx, table, null);
  assert.equal(mil.entry.origin, 'Czechia military'); assert.equal(mil.tier, 'rare'); assert.equal(mil.entry.mil, 1);
  assert.equal(C.applyCatch(null, {hex: '4984ee', callsign: 'CEF21', type: '', alt: 8000, gs: 300, dbFlags: 1}, new Date(2026, 9, 21, 12), idx, table, null).entry.origin, 'Czechia military', 'dbFlags military');
});
const H60 = JSON.parse(fs.readFileSync(new URL('fixtures/arthur-h60.json', import.meta.url))), SRC = H60.sources;
t('variants: every source for Arthur\'s two H60s normalises to a short name', () => {
  assert.equal(C.variantName(SRC.ae21cf.hexdb.Type), 'UH-60 Black Hawk'); assert.equal(C.variantName(SRC.a5fb7d.hexdb.Type), 'S-70 Firehawk');
  assert.equal(C.variantFromPhotoLink(SRC.a5fb7d.planespotters.photos[0].link), 'S-70 Firehawk');
  assert.equal(C.pickVariant({hexdb: '', photoLink: SRC.a5fb7d.planespotters.photos[0].link}), 'S-70 Firehawk', 'photo link is the fallback');
  assert.equal(C.pickVariant({desc: 'SIKORSKY UH-60 Black Hawk'}), 'UH-60 Black Hawk', 'feed desc is the last fallback');
  assert.equal(C.pickVariant({}), ''); assert.equal(C.variantShort('S-70 Firehawk'), 'Firehawk');
  assert.equal(C.variantName('MH-60R Seahawk'), 'SH-60 Seahawk'); assert.equal(C.variantName('Boeing 777-236ER'), '777-200ER');
  assert.equal(C.variantName('<script>'), ''); assert.ok(!/[\u2013\u2014]/.test(C.variantName('UH\u201360L')));
});
t('variants: one H60 card, Black Hawk then Firehawk gives New variant and +10, a repeat gives no bonus', () => {
  const ac = id => ({...live(SRC[id].adsb), variant: C.pickVariant({hexdb: SRC[id].hexdb.Type})});
  let r = C.applyCatch(null, ac('ae21cf'), new Date(2026, 9, 21, 17, 1), idx, table, null);
  assert.equal(r.status, 'new'); assert.deepEqual(r.state.cards.H60.variants, ['UH-60 Black Hawk']); assert.equal(r.newVariant, false);
  const p0 = r.state.points;
  r = C.applyCatch(r.state, ac('a5fb7d'), new Date(2026, 9, 21, 17, 6), idx, table, null);
  assert.equal(r.status, 'dupe'); assert.equal(r.newVariant, true); assert.equal(r.variant, 'S-70 Firehawk');
  assert.equal(r.gain, 12 + 10, 'rare duplicate XP plus the variant bonus'); assert.equal(r.state.points, p0 + 22); assert.equal(Object.keys(r.state.cards).length, 1);
  assert.deepEqual(r.state.cards.H60.variants, ['UH-60 Black Hawk', 'S-70 Firehawk']); assert.equal(r.state.cards.H60.count, 2);
  r = C.applyCatch(r.state, {...ac('a5fb7d'), callsign: 'CFR607', hex: 'a5fb7e'}, new Date(2026, 9, 21, 17, 9), idx, table, null);
  assert.equal(r.newVariant, false); assert.equal(r.gain, 12, 'a variant you have already earns no bonus');
  const plain = C.applyCatch(null, live(), new Date(2026, 9, 21, 12), idx, table, null);
  assert.deepEqual(plain.state.cards.A388.variants, []); assert.equal(plain.entry.var, undefined);
});
t('variants: old cards learn their first variant without a bonus', () => {
  const s = C.emptyState(); s.cards.H60 = {code: 'H60', tier: 'rare', count: 1, first: {}, last: {}};
  const r = C.applyCatch(s, {...live({flight: 'X1', hex: 'ae0001', t: 'H60'}), variant: 'S-70 Firehawk'}, new Date(2026, 9, 21, 12), idx, table, null);
  assert.equal(r.newVariant, false); assert.deepEqual(r.state.cards.H60.variants, ['S-70 Firehawk']);
});
t('validateImport and backfill: Arthur\'s real export keeps every card and point, H60 learns Firehawk', () => {
  const raw = JSON.parse(fs.readFileSync(new URL('fixtures/arthur-hangar.json', import.meta.url)));
  const s = C.backfillVariants(C.migrateHexTypes(C.validateImport(JSON.parse(JSON.stringify(raw))), idx, table));
  assert.equal(s.points, raw.points); assert.equal(s.xp, raw.xp); assert.equal(s.log.length, raw.log.length);
  assert.deepEqual(Object.keys(s.cards).sort(), Object.keys(raw.cards).sort());
  for (const k of Object.keys(raw.cards)) assert.equal(s.cards[k].count, raw.cards[k].count, k);
  assert.deepEqual(s.cards.H60.variants, ['S-70 Firehawk'], 'the Black Hawk catch carries no variant data, the Firehawk photo link does');
  assert.equal(s.log.find(e => e.hex === 'a5fb7d').var, 'S-70 Firehawk');
  const again = C.backfillVariants(C.validateImport(JSON.parse(JSON.stringify(s))));
  assert.deepEqual(again.cards, s.cards, 'a save with variants round trips, and backfill twice changes nothing');
  const bad = C.validateImport({...JSON.parse(JSON.stringify(s)), cards: {...s.cards, H60: {...s.cards.H60, variants: 'oops'}}});
  assert.deepEqual(bad.cards.H60.variants, [], 'a malformed variants list is repaired, not fatal');
  const mixed = C.validateImport({...JSON.parse(JSON.stringify(s)), cards: {...s.cards, H60: {...s.cards.H60, variants: ['UH-60 Black Hawk', 5, null, 'UH-60 Black Hawk']}}});
  assert.deepEqual(mixed.cards.H60.variants, ['UH-60 Black Hawk']);
});
console.log(n + ' passed');
t('a promoted type upgrades saved cards and tops up points', () => {
  const s = C.emptyState(); s.points = 25; s.cards.X59 = {code: 'X59', tier: 'uncommon', count: 1, first: {tier: 'uncommon'}, last: {tier: 'uncommon'}, variants: []};
  C.upgradeTiers(s, idx, table); assert.equal(s.cards.X59.tier, 'legendary'); assert.equal(s.points, 150);
  C.upgradeTiers(s, idx, table); assert.equal(s.points, 150, 'only once');
});
t('NASA research aircraft are at least rare', () => { assert.equal(C.tierFor({callsign: 'NASA946', r: 'N946NA'}, {tier: 'common'}), 'rare'); assert.equal(C.tierFor({callsign: 'NASA859', r: 'N859NA'}, idx.get('X59')), 'legendary'); });

// Card art fallback chain: Planespotters, self hosted photo, live Commons, render, silhouette. Never blank.
const A = await import('../js/art.mjs'), FX = await import('../js/fx.mjs');
const artJson = JSON.parse(fs.readFileSync(new URL('art.json', dir))), photosJson = JSON.parse(fs.readFileSync(new URL('photos.json', dir)));
A.setArtManifest(artJson.codes); A.setPhotos(photosJson.photos);
t('art chain: the stages come in order and every type owned shows an image or a silhouette', () => {
  const spot = {photo: {src: 'https://t.plnspttrs.net/1/1_280.jpg', link: 'https://www.planespotters.net/photo/1/x', by: 'A'}};
  assert.deepEqual(A.ART_CHAIN, ['spot', 'photo', 'commons', 'render', 'silhouette']);
  assert.deepEqual(A.artStages(idx.get('A320'), spot), ['spot', 'photo', 'commons', 'render', 'silhouette']);
  assert.deepEqual(A.artStages(idx.get('X59'), null), ['commons', 'render', 'silhouette'], 'X-59 has a render now');
  assert.ok(fs.existsSync(new URL('../img/cards/X59.webp', import.meta.url)));
  const x = A.cardArt(idx.get('X59'), 'legendary', true, true, null);
  assert.match(x, /data-stage="render"[^>]*X59\.webp|X59\.webp[^>]*data-stage="render"/); assert.match(x, /data-wiki="Lockheed Martin X-59 QueSST"/); assert.match(x, /data-next="silhouette"/);
  const sp = A.cardArt(idx.get('A320'), 'common', true, true, spot); assert.match(sp, /data-stage="spot"/); assert.match(sp, /data-next="photo commons render silhouette"/); assert.ok(!/data-wiki/.test(sp));
  for (const ty of table.types) { const h = A.cardArt(C.typeInfo(ty.code, idx, table), ty.tier, true, false, {}); assert.ok(/<img |<svg /.test(h), ty.code); }
  for (const code of artJson.codes) assert.ok(fs.existsSync(new URL(`../img/cards/${code}.webp`, import.meta.url)), code);
  assert.equal(A.wikiTitle({code: 'UNKFW', unknown: true, name: 'x'}), '');
  assert.equal(A.wikiTitle({code: 'Q', source: 'https://en.wikipedia.org/wiki/Sikorsky_UH-60_Black_Hawk', name: 'x'}), 'Sikorsky UH-60 Black Hawk');
});
const mem = () => { const m = new Map(); return {getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, v), m}; };
const res = j => ({ok: true, status: 200, json: async () => j});
const wikiOK = async u => /en\.wikipedia/.test(u) ? res({query: {pages: {1: {pageimage: 'X-59_in_flight.jpg'}}}}) : res({query: {pages: {'-1': {imageinfo: [{thumburl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/X-59_in_flight.jpg/640px-X-59_in_flight.jpg', extmetadata: {Artist: {value: '<a href="x">NASA</a>'}, LicenseShortName: {value: 'Public domain'}, LicenseUrl: {value: ''}}}]}}}});
{
  const st = mem(); let p = await A.commonsPhoto('Lockheed Martin X-59 QueSST', wikiOK, st);
  assert.ok(p && /^https:\/\/upload\.wikimedia\.org\//.test(p.src) && p.author === 'NASA' && p.licence === 'Public domain' && /commons\.wikimedia\.org\/wiki\/File/.test(p.source));
  let calls = 0; p = await A.commonsPhoto('Lockheed Martin X-59 QueSST', async () => { calls++; throw new Error('offline'); }, st); assert.ok(p && calls === 0, 'cached for a week');
  // A local, non free enwiki file is missing on Commons, so it is never used.
  const st2 = mem(); p = await A.commonsPhoto('Some type', async u => /en\.wikipedia/.test(u) ? res({query: {pages: {1: {pageimage: 'Logo.png'}}}}) : res({query: {pages: {'-1': {missing: '', title: 'File:Logo.png'}}}}), st2); assert.equal(p, null);
  const st3 = mem(); p = await A.commonsPhoto('Offline', async () => { throw new TypeError('Failed to fetch'); }, st3); assert.equal(p, null); assert.equal(st3.m.size, 0, 'network failure is not remembered');
  p = await A.commonsPhoto('Fair', async u => /en\.wikipedia/.test(u) ? res({query: {pages: {1: {pageimage: 'F.jpg'}}}}) : res({query: {pages: {1: {imageinfo: [{thumburl: 'https://upload.wikimedia.org/a.jpg', extmetadata: {LicenseShortName: {value: 'Fair use'}}}]}}}}), mem()); assert.equal(p, null, 'non free licence refused');
  n++; console.log('PASS commons lookup: free Commons file with credit, cached, non free and offline give nothing');
}
t('card tilt is small: at most 3 degrees either way, flat in the middle', () => {
  assert.equal(FX.TILT_MAX, 3);
  for (const [x, y] of [[0, 0], [1, 1], [0, 1], [1, 0], [-5, 9]]) { const r = FX.tiltFor(x, y); assert.ok(Math.abs(r.rx) <= 3 && Math.abs(r.ry) <= 3, JSON.stringify(r)); }
  assert.deepEqual(FX.tiltFor(0.5, 0.5), {rx: 0, ry: 0});
  const css = fs.readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
  assert.ok(!/\.cc-card:not\(\.empty\):hover\{[^}]*(translateY|scale\()/.test(css), 'no lift or zoom on hover');
  assert.ok(css.includes('.cc-card,.cc-card:not(.empty):hover{transform:none!important}'), 'reduced motion keeps cards flat');
});
t('every catch is kept as its own record for the detail view', () => {
  let s = null; for (const [cs, r] of [['R26863', '00-26863'], ['CFR606', 'N485DF']]) s = C.applyCatch(s, live({flight: cs, r, t: 'H60', hex: cs === 'CFR606' ? 'a5fb7d' : 'ae21cf', variant: undefined}), new Date(2026, 9, 21, 12), idx, table, null).state;
  const mine = s.log.filter(e => e.type === 'H60'); assert.equal(mine.length, 2); assert.deepEqual(mine.map(e => e.reg), ['N485DF', '00-26863']); assert.ok(mine.every(e => e.hex && e.cs && e.t));
});
t('short and odd input: X, ZZ171, 08-8204, hex all parse; junk and over 8 characters do not', () => {
  assert.deepEqual(C.parseQuery('x'), {kind: 'callsign', value: 'X', kinds: ['callsign']});
  assert.deepEqual(C.parseQuery('zz171').kinds, ['callsign', 'reg']);
  assert.deepEqual(C.parseQuery('08-8204'), {kind: 'reg', value: '08-8204', kinds: ['reg']});
  assert.deepEqual(C.parseQuery('~AE07E1'), {kind: 'hex', value: 'ae07e1', kinds: ['hex']});
  assert.deepEqual(C.parseQuery('BAE146').kinds, ['callsign', 'reg', 'hex']);
  assert.deepEqual(C.parseQuery('123456').kinds, ['hex', 'reg']);
  for (const bad of ['ABCDEFGHI', 'A_B', 'A--B', '-AB', 'AB-', 'RCH 131 X!', 'A-B-C']) assert.equal(C.parseQuery(bad), null, bad);
  assert.equal(C.parseQuery('RCH 131').value, 'RCH131');
});
const fl = o => Object.assign({flight: 'X       ', r: '08-8204', hex: 'ae07e1', t: 'C17', alt_baro: 24000, gs: 410, seen: 2}, o);
t('exact matching only: X never matches XYZ12, regs match without the dash, hex is case blind', () => {
  const list = [fl(), fl({flight: 'XYZ12', hex: '400001', r: 'G-ABCD'}), fl({flight: 'RCH131', hex: 'ae1234', r: '87-0040', t: 'C5M'})];
  assert.deepEqual(C.exactMatches(C.parseQuery('X'), list).map(a => a.hex), ['ae07e1']);
  assert.deepEqual(C.exactMatches(C.parseQuery('088204'), list).map(a => a.hex), ['ae07e1']);
  assert.deepEqual(C.exactMatches(C.parseQuery('08-8204'), list).map(a => a.hex), ['ae07e1']);
  assert.deepEqual(C.exactMatches(C.parseQuery('AE07E1'), list).map(a => a.hex), ['ae07e1']);
  assert.deepEqual(C.exactMatches(C.parseQuery('XY'), list), []);
  assert.deepEqual(C.exactMatches(C.parseQuery('RCH13'), list), []);
  assert.equal(C.exactMatches(C.parseQuery('X'), [fl(), fl({seen: 1})]).length, 1, 'one airframe from two kinds of lookup counts once');
});
t('ambiguity: two live aircraft both calling X ask for the hex; a parked twin does not count', () => {
  const two = C.resolveMatches(C.parseQuery('X'), [fl(), fl({hex: 'ae0999', r: '09-9999'})]);
  assert.ok(two.ambiguous); assert.equal(two.matches.length, 2);
  const one = C.resolveMatches(C.parseQuery('X'), [fl(), fl({hex: 'ae0999', alt_baro: 'ground'})]);
  assert.ok(!one.ambiguous); assert.ok(C.pickLive(one.resp).ok); assert.equal(C.pickLive(one.resp).ac.hex, 'ae07e1');
  assert.equal(C.resolveMatches(C.parseQuery('Q'), [fl()]).resp.ac.length, 0);
});
t('a C-17 calling just X is banked, keyed on its hex, and two different X flights both count', () => {
  const day = new Date(2026, 9, 22, 15);
  const a = C.pickLive({ac: [fl()]}).ac; assert.equal(C.catchKey(a), 'AE07E1');
  let r = C.applyCatch(null, a, day, idx, table, null); assert.equal(r.status, 'new'); assert.equal(r.entry.cs, 'X'); assert.equal(r.entry.hex, 'ae07e1');
  assert.ok(r.state.days[C.dayKey(day)].includes('AE07E1'));
  r = C.applyCatch(r.state, C.pickLive({ac: [fl({hex: 'ae0999', r: '09-9999'})]}).ac, day, idx, table, null); assert.equal(r.status, 'dupe');
  r = C.applyCatch(r.state, a, day, idx, table, null); assert.equal(r.status, 'today');
  const blank = C.pickLive({ac: [fl({flight: '', r: 'ZZ171', hex: '43c6a2'})]}).ac; assert.equal(C.catchKey(blank), '43C6A2'); assert.equal(blank.callsign, 'ZZ171');
  assert.equal(C.catchKey(C.pickLive({ac: [fl({flight: 'RCH131 '})]}).ac), 'RCH131');
  for (const odd of ['', 'X', '12', '1234']) assert.ok(C.oddCallsign(odd), odd);
  for (const ok of ['RCH131', 'BAW1', 'ZZ171']) assert.ok(!C.oddCallsign(ok), ok);
});
t('pending sightings: saved with no points, deduped, capped, expire after two hours, survive import', () => {
  const t0 = new Date(2026, 9, 22, 15), q = C.parseQuery('RCH131');
  let r = C.addPending(null, q, t0); assert.equal(r.status, 'added'); const s = r.state;
  assert.equal(s.points, 0); assert.equal(s.xp, 0); assert.equal(Object.keys(s.cards).length, 0); assert.equal(s.log.length, 0);
  assert.equal(C.addPending(s, C.parseQuery('rch131'), t0).status, 'already');
  for (let i = 0; i < 9; i++) C.addPending(s, C.parseQuery('TST' + i), t0);
  assert.equal(C.addPending(s, C.parseQuery('TST99'), t0).status, 'full'); assert.equal(s.pending.length, 10);
  assert.deepEqual(C.pendingQuery(s.pending[0]), {kind: 'callsign', value: 'RCH131', kinds: ['callsign', 'reg']});
  assert.equal(C.expirePending(s, new Date(+t0 + 119 * 60e3)).length, 0);
  const gone = C.expirePending(s, new Date(+t0 + 121 * 60e3)); assert.equal(gone.length, 10); assert.equal(s.pending.length, 0);
  const back = C.validateImport({v: 1, cards: {}, log: [], pending: [{value: 'RCH131', kinds: ['callsign'], t: new Date().toISOString(), until: new Date(Date.now() + 3600e3).toISOString()}, {value: '<x>', kinds: ['callsign'], t: new Date().toISOString(), until: new Date(Date.now() + 3600e3).toISOString()}, {value: 'LONG', kinds: ['callsign'], t: new Date().toISOString(), until: new Date(Date.now() + 9e9).toISOString()}]});
  assert.deepEqual(back.pending.map(p => p.value), ['RCH131']);
  C.removePending(back, 'rch131'); assert.equal(back.pending.length, 0);
});
{
  const {lookup} = await import('../js/api.mjs');
  const res = (ac, status = 200) => Promise.resolve({ok: status === 200, status, json: async () => ({ac})});
  const seen = [];
  const f = url => { seen.push(url); return /fallback/.test(url) ? res(/callsign\/RCH131/.test(url) ? [fl({flight: 'RCH131', t: 'C5M', hex: 'ae1234'})] : []) : res(/callsign\/RCH131/.test(url) ? [fl({flight: 'RCH1310'})] : []); };
  const fb = [{base: 'https://fallback.test', name: 'adsb.fi', paths: {hex: 'hex', reg: 'registration', callsign: 'callsign'}}];
  let r = await lookup(C.parseQuery('RCH131'), f, fb);
  assert.equal(r.source, 'adsb.fi'); assert.equal(C.exactMatches(C.parseQuery('RCH131'), r.data.ac)[0].hex, 'ae1234');
  assert.ok(seen.some(u => /fallback\.test\/v2\/registration\/RCH131/.test(u)), 'fallback uses its own path names');
  r = await lookup(C.parseQuery('NOPE1'), f, fb); assert.equal(r.source, 'adsb.lol'); assert.equal(r.data.ac.length, 0);
  r = await lookup(C.parseQuery('X'), url => res([]).then(x => (/fallback/.test(url) ? x : {ok: false, status: 429})), fb); assert.equal(r.error, 'busy');
  r = await lookup(C.parseQuery('X'), () => Promise.reject(new TypeError('Failed to fetch')), fb); assert.equal(r.error, 'offline');
  n++; console.log('PASS lookup: main feed first, fallback feed only when nothing exact matched, busy and offline reported');
}
console.log(`${n} unit tests passed`);
