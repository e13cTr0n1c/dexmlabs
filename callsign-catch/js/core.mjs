// Pure game rules: no DOM, no network. Shared by the page and the unit tests.
import {POINTS, DUPLICATE_XP, NIGHT_FROM, NIGHT_TO, NEW_TYPE_BONUS} from './config.mjs';
export const TIERS = ['common', 'uncommon', 'rare', 'legendary'];
export const STORE_KEY = 'callsign:collection';

export function indexTypes(table) { const m = new Map(); for (const t of table.types) m.set(t.code, t); return m; }

// What did the player type? A hex code, a registration or a callsign.
export function parseQuery(raw) {
  const q = String(raw || '').trim().toUpperCase().replace(/\s+/g, '');
  if (!q || q.length > 10) return null;
  if (/^~?[0-9A-F]{6}$/.test(q) && /\d/.test(q) && !/^[A-Z]{3}\d/.test(q)) return {kind: 'hex', value: q.replace('~', '').toLowerCase()};
  if (/^[A-Z0-9]{1,2}-[A-Z0-9]{2,5}$/.test(q) || /^N\d{1,5}[A-Z]{0,2}$/.test(q)) return {kind: 'reg', value: q};
  if (/^[A-Z0-9]{2,8}$/.test(q)) return {kind: 'callsign', value: q};
  return null;
}

// The broad class of an aircraft with no known type: from the ADS-B emitter category, else the ICAO description.
export function classOf(ac, desc) {
  const c = String((ac && ac.category) || '').toUpperCase(), d = String(desc || '');
  if (c === 'B6' || /^U/.test(d)) return 'drone';
  if (c === 'A7' || /^[HGT]/.test(d)) return 'heli';
  return 'fixed';
}
const UNID = {fixed: {code: 'UNKFW', name: 'Unidentified aircraft', cat: 'unknown'}, heli: {code: 'UNKHE', name: 'Unidentified helicopter', cat: 'heli'}, drone: {code: 'UNKUV', name: 'Unidentified drone', cat: 'drone'}};
const ENG = {J: 'jet', P: 'piston', T: 'turboprop', E: 'electric', R: 'rocket'}, KIND = {L: 'aeroplane', S: 'seaplane', A: 'amphibian', H: 'helicopter', G: 'gyroplane', T: 'tiltrotor'};
const NUM = {1: 'one', 2: 'two', 3: 'three', 4: 'four', 6: 'six', 8: 'eight'}, WAKE = {L: 'light', M: 'medium', H: 'heavy', J: 'super heavy'};
// A plain fact for the types that came from the ICAO list, built from what the list says about them.
export function genFact(t) {
  const [k, n, e] = String(t.d || ''), kind = KIND[k] || 'aircraft', eng = ENG[e];
  if (t.cat === 'drone') return 'An uncrewed aircraft, flown remotely by a crew on the ground.';
  const what = `${/^[aeiou]/.test(WAKE[t.w] || kind) ? 'An' : 'A'} ${WAKE[t.w] ? WAKE[t.w] + ' ' : ''}${t.mil ? 'military ' : ''}${kind}`;
  return eng && NUM[n] ? `${what} with ${NUM[n]} ${eng} engine${n === '1' ? '' : 's'}.` : `${what}.`;
}
export function typeInfo(code, idx, table, ac) {
  const t = idx.get(code);
  if (t) return t.fact ? t : Object.assign(t, {maker: t.maker || '', fact: genFact(t), reward: t.reward || {url: '', label: '', code: ''}});
  const cls = code === 'UNKHE' ? 'heli' : code === 'UNKUV' ? 'drone' : code === 'UNKFW' ? 'fixed' : classOf(ac);
  const u = UNID[cls], named = code && !/^UNK(FW|HE|UV)$/.test(code) ? code : '';
  return {code: named || u.code, name: named ? 'Type ' + named : u.name, maker: '', tier: table.default || 'uncommon', cat: u.cat, unknown: true,
    fact: named ? "Not in my table yet, so it counts as uncommon and earns a new type bonus." : "The feed didn't say what type this is, so it counts as uncommon and earns a new type bonus.", reward: {url: '', label: '', code: ''}};
}

// Military aircraft and display team callsigns are always legendary.
const DISPLAY = /^(REDS?\d|PAT\d|FAF\d|SNOW|BLUE?ANG|THUNDER|FRECCE|PAF\d)/;
// RRR is the whole RAF, so it only counts as a display team on a Hawk (the Red Arrows); an RRR Voyager is just military.
export function isDisplay(callsign, type) { return DISPLAY.test(callsign || '') || (/^RRR/.test(callsign || '') && type === 'HAWK'); }
// Military operators: the dbFlags military bit or a known military callsign. They lift a type one step, to at least rare.
const MILCS = /^(RRR|ASCOT|NATO|RCH|REACH|CFC|GAF|GAM|IAM|CTM|FAF|BAF|NAF|DAF|HAF|PLF|SVF|SHF|RFR|ARMY|NAVY|CNV|DUKE|SPAR|SAM|TARTN|COMET|KIWI|AME|MMF|LAGR|HRZ|SUI|BRK|NOW|TOPCAT|VIPER|MAGMA|SNAKE|NOBLE|GOLD|HAWK)\d/;
export const isMilitary = ac => !!((ac.dbFlags & 1) || MILCS.test(String(ac.callsign || '')));
export function tierFor(ac, info) {
  if (isDisplay(ac.callsign, ac.t || info.code)) return 'legendary';
  const base = TIERS.includes(info.tier) ? info.tier : 'uncommon';
  if (!isMilitary(ac)) return base;
  return base === 'rare' || base === 'legendary' ? 'legendary' : 'rare';
}
// Emergency squawks earn a badge and nothing else, so nobody is rewarded for an emergency.
export const SQUAWKS = {'7700': 'Squawking 7700, general emergency, at time of catch', '7600': 'Squawking 7600, radio failure, at time of catch', '7500': 'Squawking 7500 at time of catch (often a mis-set code)'};

// The feed record that proves the aircraft is flying now.
export function pickLive(resp) {
  const list = (resp && (resp.ac || resp.aircraft)) || [];
  if (!list.length) return {ok: false, reason: 'notfound'};
  const now = list.find(a => a.alt_baro !== 'ground' && typeof a.alt_baro === 'number' && (a.seen == null || a.seen < 60));
  if (!now) return {ok: false, reason: list.some(a => a.alt_baro === 'ground') ? 'ground' : 'stale', ac: list[0]};
  return {ok: true, ac: {hex: now.hex || '', callsign: String(now.flight || '').trim() || String(now.r || '').trim(), reg: String(now.r || '').trim(), type: String(now.t || '').trim().toUpperCase(), op: String(now.ownOp || now.operator || '').trim(), alt: Math.round(now.alt_baro), gs: now.gs != null ? Math.round(now.gs) : null, dbFlags: now.dbFlags | 0, category: String(now.category || ''), squawk: String(now.squawk || '')}};
}

export function dayKey(date) { const d = new Date(date); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
export function emptyState() { return {v: 1, cards: {}, log: [], days: {}, xp: 0, points: 0, night: 0, wantedHits: {}}; }

// Record a live aircraft. Returns {status: 'new' | 'dupe' | 'today', ...}.
export function applyCatch(state, ac, when, idx, table, wanted) {
  const s = state || emptyState(), day = dayKey(when), key = (ac.callsign || ac.reg || ac.hex).toUpperCase();
  s.days[day] = s.days[day] || [];
  if (s.days[day].includes(key)) return {status: 'today', state: s};
  const info = typeInfo(ac.type, idx, table, ac), tier = tierFor(ac, info), code = info.code;
  const hour = new Date(when).getHours(), night = hour >= NIGHT_FROM && hour < NIGHT_TO;
  const entry = {t: new Date(when).toISOString(), cs: key, reg: ac.reg || '', hex: ac.hex || '', type: code, op: ac.op || '', alt: ac.alt, gs: ac.gs, tier, night, cat: info.cat};
  if (isMilitary(ac)) entry.mil = 1;
  if (SQUAWKS[ac.squawk]) entry.sq = ac.squawk;
  const had = s.cards[code], isWanted = !!(wanted && wanted.code === code && !s.wantedHits[day]);
  let gain = had ? DUPLICATE_XP[tier] : POINTS[tier];
  if (isWanted) { gain *= 2; s.wantedHits[day] = code; }
  const newType = !!(info.unknown && !had);
  if (newType) gain += NEW_TYPE_BONUS;
  if (had) { had.count++; had.last = entry; if (TIERS.indexOf(tier) > TIERS.indexOf(had.tier)) had.tier = tier; s.xp += gain; }
  else s.cards[code] = {code, tier, count: 1, first: entry, last: entry};
  s.points += gain; entry.gain = gain;
  if (night) s.night++;
  s.days[day].push(key); s.log.unshift(entry); s.log = s.log.slice(0, 500);
  return {status: had ? 'dupe' : 'new', state: s, entry, info, tier, gain, wanted: isWanted, newType};
}

// Sets for the hangar. Each has a list of type codes (silhouettes until caught) or a rule.
export const SETS = [
  {id: 'airbus', name: 'Airbus Family Album', codes: ['A319', 'A320', 'A20N', 'A321', 'A21N']},
  {id: 'b737', name: '737 Club', codes: ['B738', 'B739', 'B38M', 'P8']},
  {id: 'giants', name: 'Queens and Giants', codes: ['B744', 'B748', 'A388', 'BLCF', 'A124']},
  {id: 'longhaul', name: 'Long Haul Heroes', codes: ['B77W', 'B788', 'B789', 'A333', 'A359', 'A35K']},
  {id: 'military', name: 'Military Ops', codes: ['EUFI', 'F35', 'HAWK', 'A332', 'E3TF', 'B52', 'C17', 'C130', 'A400', 'R135']},
  {id: 'props', name: 'Props and Turboprops', codes: ['AT76', 'DH8D', 'PC12', 'C172', 'C130', 'A400']},
  {id: 'rotor', name: 'Rotor Club', codes: ['EC35', 'EC45', 'A139', 'A169', 'A189', 'S92', 'H160', 'AS50', 'R44', 'R22', 'B06', 'B407', 'B429', 'H47', 'PUMA', 'EH10', 'LYNX', 'H64', 'H60', 'V22']},
  {id: 'unmanned', name: 'Unmanned', codes: ['Q9', 'Q4', 'HRM9']},
  {id: 'display', name: 'Display teams', rule: 'display', goal: 1, desc: 'Catch a display team callsign or a Hawk'},
  {id: 'night', name: 'Night owl', rule: 'night', goal: 3, desc: 'Catch three between 00:00 and 05:00'}];
export function setProgress(state, set) {
  const s = state || emptyState();
  if (set.codes) { const got = set.codes.filter(c => s.cards[c]).length; return {got, goal: set.codes.length, done: got === set.codes.length}; }
  const got = set.rule === 'night' ? s.night : s.log.filter(e => isDisplay(e.cs, e.type) || e.type === 'HAWK').length;
  return {got: Math.min(got, set.goal), goal: set.goal, done: got >= set.goal};
}

// Today's wanted type, the same for everyone: a dated special card, otherwise a seeded pick by UTC date.
// Weekdays draw uncommon and rare types, weekends rare and legendary; no type repeats within 14 days.
export const WANTED_POOL = ['A388', 'B744', 'B748', 'BLCF', 'A124', 'B77W', 'B788', 'B789', 'A333', 'A359', 'A35K', 'B752', 'PC12', 'C172', 'EUFI', 'F35', 'HAWK', 'E3TF', 'B52', 'C17', 'C130', 'A400', 'P8', 'R135', 'A332'];
const utcDay = d => new Date(d).toISOString().slice(0, 10);
function seed(str) { let h = 2166136261; for (const ch of str) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
export function wantedCode(date, table) {
  const tier = c => (table.types.find(t => t.code === c) || {}).tier;
  const end = Date.parse(utcDay(date)), recent = [];
  let pick;
  for (let t = Date.UTC(2026, 0, 1); t <= end; t += 864e5) {
    const day = utcDay(t), wd = new Date(t).getUTCDay(), weekend = wd === 0 || wd === 6;
    const pool = WANTED_POOL.filter(c => (weekend ? ['rare', 'legendary'] : ['uncommon', 'rare']).includes(tier(c)) && !recent.includes(c));
    pick = pool[seed(day) % pool.length]; recent.push(pick); if (recent.length > 14) recent.shift();
  }
  return pick;
}
export function wantedFor(date, table, specials) {
  const day = utcDay(date), sp = (specials && specials.cards || []).find(c => c.date && c.date === day && c.mode === 'wanted');
  if (sp) return {code: sp.code, name: sp.name, special: sp};
  const code = wantedCode(date, table); return {code, name: table.types.find(t => t.code === code).name};
}
export function dropFor(date, specials) { const day = dayKey(date); return (specials && specials.cards || []).find(c => c.date && c.date === day && c.mode === 'drop') || null; }

export function totals(state) { const s = state || emptyState(), c = Object.values(s.cards); const by = {}; for (const t of TIERS) by[t] = c.filter(x => x.tier === t).length; return {types: c.length, catches: s.log.length, points: s.points, xp: s.xp, by, moments: s.log.filter(e => e.sq).length}; }

export function shareText(entry, info, tier) {
  const T = tier[0].toUpperCase() + tier.slice(1);
  const an = /^[AEIOU]/i.test(info.name) ? 'an' : 'a';
  return `I caught ${an} ${info.name} ✈ ${T}\n${entry.cs} at ${entry.alt.toLocaleString('en-GB')} ft${entry.gs != null ? ', ' + entry.gs + ' kt' : ''}\nCallsign Catch: dexmlabs.app/callsign-catch/`;
}

// Import: accept only a well formed collection.
export function validateImport(obj) {
  if (!obj || obj.v !== 1 || typeof obj.cards !== 'object' || !Array.isArray(obj.log)) return null;
  const s = Object.assign(emptyState(), obj);
  s.cards = {...s.cards};
  // Migration: older saves kept unidentified catches under '????'. Fold them into the fixed wing unidentified card.
  if (s.cards['????']) { const o = s.cards['????'], n = s.cards.UNKFW; delete s.cards['????'];
    if (o && typeof o === 'object') s.cards.UNKFW = n ? {...n, count: (n.count | 0) + (o.count | 0)} : {...o, code: 'UNKFW'}; }
  s.log = s.log.map(e => e && e.type === '????' ? {...e, type: 'UNKFW'} : e);
  for (const [k, c] of Object.entries(s.cards)) { if (!c || typeof c !== 'object' || !(c.count >= 1)) { delete s.cards[k]; continue; } if (!TIERS.includes(c.tier)) c.tier = 'uncommon'; if (!/^[A-Z0-9?]{2,8}$/.test(k)) { delete s.cards[k]; } } // repair, never throw a whole hangar away over one odd card
  s.points = +s.points || 0; s.xp = +s.xp || 0; s.night = +s.night || 0; return s;
}
// Reward only after a legendary catch of that type, and only when it has a code and a link.
export function rewardFor(info, tier) { const r = info.reward || {}; return tier === 'legendary' && r.url && r.code ? r : null; }
