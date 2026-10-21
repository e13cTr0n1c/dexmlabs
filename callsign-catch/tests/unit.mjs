// Rarity, catch and set rules. Run: node callsign-catch/tests/unit.mjs
import fs from 'fs'; import assert from 'assert/strict';
import * as C from '../js/core.mjs'; import {POINTS} from '../js/config.mjs';
const dir = new URL('../data/', import.meta.url);
const table = JSON.parse(fs.readFileSync(new URL('types.json', dir))), specials = JSON.parse(fs.readFileSync(new URL('specials.json', dir)));
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
  assert.equal(C.tierFor({callsign: 'RRR1'}, idx.get('A320')), 'legendary');
});
t('query parsing: callsign, registration and hex', () => {
  assert.deepEqual(C.parseQuery(' baw117 '), {kind: 'callsign', value: 'BAW117'});
  assert.deepEqual(C.parseQuery('g-xlea'), {kind: 'reg', value: 'G-XLEA'});
  assert.deepEqual(C.parseQuery('4ca7b5'), {kind: 'hex', value: '4ca7b5'});
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
  let s = null; for (const [cs, ty] of [['A1', 'A319'], ['A2', 'A320'], ['A3', 'A20N'], ['A4', 'A321'], ['A5', 'A21N']]) s = C.applyCatch(s, live({flight: cs, t: ty}), new Date(2026, 9, 21, 2), idx, table, null).state;
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
  assert.equal(C.tierFor({callsign: 'RRR6612', dbFlags: 0}, {tier: 'common'}), 'legendary', 'RRR stays a display style legendary');
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
console.log(n + ' passed');
