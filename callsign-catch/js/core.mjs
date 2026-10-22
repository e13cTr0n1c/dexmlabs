// Pure game rules: no DOM, no network. Shared by the page and the unit tests.
import {POINTS, DUPLICATE_XP, NIGHT_FROM, NIGHT_TO, NEW_TYPE_BONUS, NEW_VARIANT_BONUS} from './config.mjs';
export const TIERS = ['common', 'uncommon', 'rare', 'legendary'];
export const STORE_KEY = 'callsign:collection';

export function indexTypes(table) { const m = new Map(); for (const t of table.types) m.set(t.code, t); return m; }

// What did the player type? A hex code, a registration or a callsign, and often more than one could fit:
// ZZ171 is an RAF registration but could be a callsign, and a short military callsign can be just X.
// kind is the best guess; kinds lists every lookup worth making. Matching is exact, so asking more never widens a match.
export const norm = s => String(s || '').trim().toUpperCase().replace(/[\s-]+/g, '');
export function parseQuery(raw) {
  const q = String(raw || '').trim().toUpperCase().replace(/\s+/g, '').replace(/^~(?=[0-9A-F]{6}$)/, '');
  if (!q || q.length > 10 || !/^[A-Z0-9]+(-[A-Z0-9]+)?$/.test(q)) return null;
  const flat = q.replace('-', ''); if (flat.length > 8) return null;
  const hex = /^[0-9A-F]{6}$/.test(q), dash = q.includes('-'), letters = /[A-Z]/.test(q), digits = /\d/.test(q);
  const kinds = [];
  if (hex && digits && !/^[A-Z]{3}\d/.test(q)) kinds.push('hex');
  if (dash || (kinds.length && !letters)) kinds.push('reg'); // 088204 is valid hex but also a US serial typed without its dash
  else if (!kinds.length) {
    kinds.push('callsign');
    if (letters && flat.length >= 3) kinds.push('reg'); // ZZ171, N123AB, D1234 style registrations with no dash
    if (hex && !kinds.includes('hex')) kinds.push('hex'); // BAE146 looks like a callsign but is valid hex too
  }
  const kind = kinds[0];
  return {kind, value: kind === 'hex' ? q.toLowerCase() : q, kinds};
}
// The value to send for one kind of lookup.
export const queryValue = (q, kind) => kind === 'hex' ? q.value.toLowerCase() : q.value.toUpperCase();
// Only aircraft whose callsign, registration or hex is exactly what was typed. Dashes and spaces are ignored,
// so 088204 finds 08-8204, but X never matches XYZ12. Returns the airframes found, one per hex.
export function exactMatches(q, list) {
  const v = norm(q.value), out = new Map();
  for (const a of list || []) {
    if (!a) continue;
    const hex = String(a.hex || '').replace('~', '').toUpperCase();
    const hit = (q.kinds || [q.kind]).some(k => k === 'hex' ? hex === v : k === 'reg' ? norm(a.r) === v : norm(a.flight) === v);
    if (!hit) continue;
    const key = hex || norm(a.r) + '|' + norm(a.flight), prev = out.get(key);
    if (!prev || (a.seen != null && (prev.seen == null || a.seen < prev.seen))) out.set(key, a);
  }
  return [...out.values()];
}
// Several different airframes answer to the same text (two flights both calling X). Then I ask for the hex instead of guessing.
// Only the live ones count, so one flying and one parked is not ambiguous.
export function resolveMatches(q, list) {
  const m = exactMatches(q, list);
  const live = m.filter(a => a.alt_baro !== 'ground' && typeof a.alt_baro === 'number' && (a.seen == null || a.seen < 60));
  if (live.length > 1) return {ambiguous: true, matches: live};
  return {ambiguous: false, resp: {ac: live.length ? live : m}};
}
// A callsign too short or odd to tell one flight from another: blank, under three characters, or no letters at all.
export const oddCallsign = cs => { const c = norm(cs); return !c || c.length < 3 || !/[A-Z]/.test(c); };
// The key a catch is stored under for the once a day rule: the callsign, or the hex when the callsign is odd.
export const catchKey = ac => (oddCallsign(ac.flight != null ? ac.flight : ac.callsign) ? (String(ac.hex || '').replace('~', '') || ac.reg || ac.callsign) : ac.callsign).toUpperCase();

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

// Display teams are known by their own airframes (data/display-teams.json): a listed hex or registration names the team.
// A team callsign such as RED1 is the fallback. An RRR callsign or a Hawk on its own is not enough, since RAF Valley flies Hawks too.
let TEAMS = {hex: new Map(), reg: new Map(), cs: []};
export function setTeams(data) {
  TEAMS = {hex: new Map(), reg: new Map(), cs: []};
  for (const t of (data && data.teams) || []) {
    const team = {id: t.id, name: t.name, country: t.country};
    for (const a of t.airframes || []) { if (a.hex) TEAMS.hex.set(String(a.hex).toLowerCase(), team); if (a.reg) TEAMS.reg.set(String(a.reg).toUpperCase(), team); }
    if (t.callsigns) TEAMS.cs.push([new RegExp(t.callsigns), team]);
  }
}
export function teamFor(ac) {
  if (!ac) return null;
  const hex = String(ac.hex || '').replace('~', '').toLowerCase(), reg = String(ac.reg || '').toUpperCase(), cs = String(ac.callsign || '').toUpperCase();
  return (hex && TEAMS.hex.get(hex)) || (reg && TEAMS.reg.get(reg)) || (TEAMS.cs.find(([re]) => re.test(cs)) || [])[1] || null;
}
export function isDisplay(ac) { return !!teamFor(ac); }
// Military operators: the dbFlags military bit or a known military callsign. They lift a type one step, to at least rare.
const MILCS = /^(RRR|ASCOT|NATO|RCH|REACH|CFC|GAF|GAM|IAM|CTM|FAF|BAF|NAF|DAF|HAF|PLF|SVF|SHF|RFR|ARMY|NAVY|CNV|DUKE|SPAR|SAM|TARTN|COMET|KIWI|AME|MMF|LAGR|HRZ|SUI|BRK|NOW|TOPCAT|VIPER|MAGMA|SNAKE|NOBLE|GOLD|HAWK)\d/;
// ICAO address blocks (data/icao-ranges.json): the country an address was allocated to, and the military sub ranges.
let RANGES = {countries: [], military: []};
const hexNum = h => { const n = parseInt(String(h || '').replace('~', ''), 16); return /^~?[0-9a-f]{6}$/i.test(String(h || '')) ? n : NaN; };
export function setRanges(data) {
  const p = r => [parseInt(r[0], 16), parseInt(r[1], 16)];
  RANGES = {countries: ((data && data.countries) || []).map(r => [...p(r), r[2]]).sort((a, b) => (a[1] - a[0]) - (b[1] - b[0])), military: ((data && data.military) || []).map(p)};
}
export function countryOf(hex) { const n = hexNum(hex); if (isNaN(n)) return ''; const r = RANGES.countries.find(([a, b]) => n >= a && n <= b); return r ? r[2] : ''; }
export function milHex(hex) { const n = hexNum(hex); return !isNaN(n) && RANGES.military.some(([a, b]) => n >= a && n <= b); }
export const isMilitary = ac => !!((ac.dbFlags & 1) || MILCS.test(String(ac.callsign || '')) || milHex(ac.hex));
// Where an unidentified aircraft comes from, for its card: 'Czechia', or 'Czechia military' when it is military.
export function originOf(ac) { const c = countryOf(ac && ac.hex); return c ? c + (isMilitary(ac) ? ' military' : '') : (ac && isMilitary(ac) ? 'Military' : ''); }

// Exact types for airframes the feed leaves blank (data/hex-types.json).
let HEXTYPES = {};
export function setHexTypes(data) { HEXTYPES = {}; for (const [k, v] of Object.entries((data && data.types) || {})) HEXTYPES[k.toLowerCase()] = String(v).toUpperCase(); }
export const hexType = hex => HEXTYPES[String(hex || '').replace('~', '').toLowerCase()] || '';
// Types for military callsign prefixes (data/callsign-types.json), e.g. HNCHMN14 is an RAF Protector.
let CSTYPES = [];
export function setCallsignTypes(data) { CSTYPES = Object.entries((data && data.prefixes) || {}).map(([k, v]) => [new RegExp('^' + k.replace(/[^A-Z0-9]/gi, '') + '\\d{0,4}$', 'i'), String(v.type || v).toUpperCase()]); }
export const callsignType = cs => (CSTYPES.find(([re]) => re.test(norm(cs))) || [])[1] || '';
// The best type when the feed has none: a listed hex first, then a known callsign prefix.
export const resolveType = ac => String((ac && ac.type) || '').toUpperCase() || hexType(ac && ac.hex) || callsignType(ac && (ac.flight != null ? ac.flight : ac.callsign));
// Old catches that became unidentified cards move to their real type once the hex is in the table. Points stay as earned.
export function migrateHexTypes(state, idx, table) {
  const s = state; if (!s || !s.log) return s;
  for (const e of s.log) {
    const to = e && /^UNK/.test(e.type) && (hexType(e.hex) || callsignType(e.cs)); if (!to) continue;
    const from = s.cards[e.type], info = typeInfo(to, idx, table), tier = TIERS.indexOf(e.tier) > TIERS.indexOf(info.tier) ? e.tier : info.tier;
    if (from) { from.count--; if (from.count < 1) delete s.cards[e.type]; }
    e.type = to; e.tier = tier;
    const c = s.cards[to];
    if (c) { c.count++; if (TIERS.indexOf(tier) > TIERS.indexOf(c.tier)) c.tier = tier; if (!c.last || e.t > c.last.t) c.last = e; if (!c.first || e.t < c.first.t) c.first = e; }
    else s.cards[to] = {code: to, tier, count: 1, first: e, last: e};
  }
  for (const [k, c] of Object.entries(s.cards)) if (/^UNK/.test(k)) { const mine = s.log.filter(x => x.type === k); if (mine.length) { c.last = mine[0]; c.first = mine[mine.length - 1]; } }
  return s;
}
// Special liveries (data/liveries.json), known by registration or hex. A 1/1 scheme is Legendary, any other at least Rare.
let LIVERIES = {hex: new Map(), reg: new Map()};
export function setLiveries(data) {
  LIVERIES = {hex: new Map(), reg: new Map()};
  for (const l of (data && data.liveries) || []) { const v = {name: String(l.name || 'Special livery'), unique: !!l.unique, source: l.source || ''};
    if (l.hex) LIVERIES.hex.set(String(l.hex).toLowerCase(), v); if (l.reg) LIVERIES.reg.set(norm(l.reg), v); }
}
export function liveryFor(ac) {
  if (!ac) return null;
  const hex = String(ac.hex || '').replace('~', '').toLowerCase(), reg = norm(ac.reg != null ? ac.reg : ac.r);
  return (hex && LIVERIES.hex.get(hex)) || (reg && LIVERIES.reg.get(reg)) || null;
}
const atLeast = (t, floor) => TIERS.indexOf(t) >= TIERS.indexOf(floor) ? t : floor;
export const liveryFloor = l => l ? (l.unique ? 'legendary' : 'rare') : 'common';
export function tierFor(ac, info) { return atLeast(baseTierFor(ac, info), liveryFloor(liveryFor(ac))); }
function baseTierFor(ac, info) {
  if (isDisplay(ac)) return 'legendary';
  if (info.cat === 'drone' && isMilitary(ac)) return atLeast(TIERS.includes(info.tier) ? info.tier : 'uncommon', 'rare') === 'rare' ? 'rare' : 'legendary'; // military drones: rare at least, legendary when the type is
  const base = TIERS.includes(info.tier) ? info.tier : 'uncommon';
  // NASA research aircraft (N8xxNA style registrations or NASA callsigns) are at least rare.
  if ((/^N\d{3}NA$/.test(String(ac.r || '')) || /^NASA\d/.test(String(ac.callsign || ''))) && TIERS.indexOf(base) < TIERS.indexOf('rare') && !isMilitary(ac)) return 'rare';
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
  return {ok: true, ac: {hex: String(now.hex || '').replace('~', ''), flight: String(now.flight || '').trim(), callsign: String(now.flight || '').trim() || String(now.r || '').trim() || String(now.hex || '').replace('~', '').toUpperCase(), reg: String(now.r || '').trim(), type: String(now.t || '').trim().toUpperCase(), op: String(now.ownOp || now.operator || '').trim(), alt: Math.round(now.alt_baro), gs: now.gs != null ? Math.round(now.gs) : null, dbFlags: now.dbFlags | 0, category: String(now.category || ''), desc: String(now.desc || '').slice(0, 60), squawk: String(now.squawk || '')}};
}

export function dayKey(date) { const d = new Date(date); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
export function emptyState() { return {v: 1, cards: {}, log: [], days: {}, xp: 0, points: 0, night: 0, wantedHits: {}, pending: []}; }

// The callsign the board Worker can check: the flight's own callsign when it is 2 to 8 letters and numbers and not odd.
export const boardCallsign = e => { const c = norm(e && e.cs); return /^[A-Z0-9]{2,8}$/.test(c) && !oddCallsign(c) && !(e.hex && c === String(e.hex).toUpperCase()) ? c : ''; };

// Pending sightings: seen on another tracker but not in our feed yet. Saved with no points, rechecked for a while,
// then confirmed into a real catch through applyCatch, or dropped when the window closes.
export const PENDING_MS = 2 * 3600e3, PENDING_MAX = 10;
export function addPending(state, q, when) {
  const s = state || emptyState(), t = +new Date(when); s.pending = cleanPending(s.pending, t);
  const v = norm(q.value);
  if (s.pending.some(p => norm(p.value) === v)) return {status: 'already', state: s};
  if (s.pending.length >= PENDING_MAX) return {status: 'full', state: s};
  s.pending.push({value: q.value.toUpperCase(), kinds: [...(q.kinds || [q.kind])], t: new Date(t).toISOString(), until: new Date(t + PENDING_MS).toISOString(), tries: 0});
  return {status: 'added', state: s};
}
const KINDS = ['hex', 'reg', 'callsign'];
export function cleanPending(list, now) {
  return (Array.isArray(list) ? list : []).filter(p => p && typeof p.value === 'string' && /^[A-Z0-9-]{1,10}$/.test(p.value) && Array.isArray(p.kinds) && p.kinds.length && p.kinds.every(k => KINDS.includes(k)) && Date.parse(p.until) > +new Date(now) && Date.parse(p.until) - Date.parse(p.t) <= PENDING_MS).slice(0, PENDING_MAX);
}
// Drop the ones past their window. Returns what expired, so the page can say so.
export function expirePending(state, now) {
  const before = (state.pending || []).filter(Boolean); state.pending = cleanPending(before, now);
  return before.filter(p => !state.pending.includes(p));
}
export const pendingQuery = p => ({kind: p.kinds[0], value: p.kinds[0] === 'hex' ? p.value.toLowerCase() : p.value, kinds: p.kinds});
export function removePending(state, value) { const v = norm(value); state.pending = (state.pending || []).filter(p => norm(p.value) !== v); return state; }

// Variants within one ICAO type, e.g. H60 covers the UH-60 Black Hawk and the S-70 Firehawk.
// Sources, best first: hexdb.io 'Type' (e.g. 'UH-60L Blackhawk', 'S-70 I'), the Planespotters photo link slug
// (e.g. '.../n485df-cal-fire-sikorsky-s-70i-firehawk'), then the feed's 'desc'. Names are cut to a short family name.
const VARIANTS = [
  [/FIRE ?HAWK|^S-?70 ?I\b|^S-?70I\b/, 'S-70 Firehawk'], [/^S-?70 ?A|^S-?70$|^S-?70 /, 'S-70 Black Hawk'],
  [/SEA ?HAWK|^[SM]H-?60/, 'SH-60 Seahawk'], [/JAY ?HAWK|^HH-?60J/, 'HH-60J Jayhawk'],
  [/JOLLY GREEN|^HH-?60W/, 'HH-60W Jolly Green II'], [/PAVE ?HAWK|^HH-?60G?\b/, 'HH-60 Pave Hawk'], [/BLACK ?HAWK|^UH-?60|^EH-?60|^VH-?60/, 'UH-60 Black Hawk']];
export function variantName(raw) {
  let v = String(raw || '').toUpperCase().replace(/[_\u2013\u2014]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!v || v.length > 60) return '';
  v = v.replace(/^(SIKORSKY|PZL MIELEC|BOEING|AIRBUS|BELL|LEONARDO|AGUSTAWESTLAND|EUROCOPTER|LOCKHEED MARTIN|LOCKHEED|EMBRAER|CESSNA|PIPER|BEECHCRAFT|BEECH)( ?\/ ?[A-Z ]+?)? /, '');
  for (const [re, name] of VARIANTS) if (re.test(v)) return name;
  v = v.replace(/^([A-Z]*\d{3})-(\d)\d{2}([A-Z]*)\b/, '$1-$200$3'); // customer codes: 777-236ER is a 777-200ER
  if (!/^[A-Z0-9][A-Z0-9 .+\/-]{1,23}$/.test(v)) return '';
  return v.split(' ').map(w => /\d/.test(w) || w.length <= 3 ? w : w[0] + w.slice(1).toLowerCase()).join(' ');
}
// The variant text hidden in a Planespotters photo link: the slug after the registration and operator.
export function variantFromPhotoLink(link) {
  const m = String(link || '').match(/planespotters\.net\/photo\/\d+\/([a-z0-9-]+)/); if (!m) return '';
  const slug = m[1], hit = slug.match(/(?:^|-)((?:sikorsky|pzl-mielec)-.*)$/);
  if (!hit) return '';
  const words = hit[1].replace(/^(sikorsky|pzl-mielec)-/, '').split('-');
  for (let i = 0; i < words.length; i++) { const v = variantName(words.slice(i).join(' ')); if (v && VARIANTS.some(x => x[1] === v)) return v; }
  return '';
}
// The short word used in the catch message: 'S-70 Firehawk' becomes 'Firehawk'.
export const variantShort = v => { const w = String(v || '').split(' '); return w.length > 1 && /\d/.test(w[0]) ? w.slice(1).join(' ') : String(v || ''); };
export function pickVariant({hexdb, desc, photoLink} = {}) {
  return variantName(hexdb) || variantFromPhotoLink(photoLink) || variantName(desc);
}
const cleanVariants = v => Array.isArray(v) ? [...new Set(v.filter(x => typeof x === 'string' && x && x.length <= 40))] : [];
// Older saves have no variants: rebuild them from the log entries that carry one (entry.var or a photo link).
// When a type is promoted in the table (for example the X-59 to legendary), saved cards catch up and the first catch is re-scored.
export function upgradeTiers(state, idx, table) {
  // A catch whose airframe has since been listed as a special livery moves up, and its points with it, once.
  for (const e of state.log || []) {
    const l = e && liveryFor(e); if (!l) continue;
    e.liv = l.name; if (l.unique) e.uniq = 1;
    const to = atLeast(TIERS.includes(e.tier) ? e.tier : 'uncommon', liveryFloor(l)), c = state.cards && state.cards[e.type];
    if (to === e.tier) continue;
    const first = c && c.first && c.first.t === e.t, diff = ((first ? POINTS : DUPLICATE_XP)[to] || 0) - ((first ? POINTS : DUPLICATE_XP)[e.tier] || 0);
    e.tier = to; if (diff > 0) { state.points = (state.points || 0) + diff; if (!first) state.xp = (state.xp || 0) + diff; e.gain = (e.gain || 0) + diff; }
    if (c) { if (TIERS.indexOf(to) > TIERS.indexOf(c.tier)) c.tier = to; for (const k of ['first', 'last']) if (c[k] && c[k].t === e.t) c[k] = e; }
  }
  for (const c of Object.values(state.cards || {})) {
    const info = typeInfo(c.code, idx, table);
    if (!info || info.unknown || TIERS.indexOf(info.tier) <= TIERS.indexOf(c.tier)) continue;
    const diff = (POINTS[info.tier] || 0) - (POINTS[c.tier] || 0);
    c.tier = info.tier; if (c.first) c.first.tier = info.tier; if (c.last) c.last.tier = info.tier;
    if (diff > 0) state.points = (state.points || 0) + diff;
  }
  return state;
}
export function backfillVariants(state) {
  const s = state; if (!s || !s.cards) return s;
  for (const c of Object.values(s.cards)) c.variants = cleanVariants(c.variants);
  for (const e of [...(s.log || [])].reverse()) {
    if (!e || !s.cards[e.type]) continue;
    const v = e.var || variantFromPhotoLink(e.photo && e.photo.link); if (!v) continue;
    if (!e.var) e.var = v;
    const c = s.cards[e.type]; if (!c.variants.includes(v)) c.variants.push(v);
  }
  return s;
}

// Record a live aircraft. Returns {status: 'new' | 'dupe' | 'today', ...}.
export function applyCatch(state, ac, when, idx, table, wanted) {
  const s = state || emptyState(), day = dayKey(when), key = catchKey(ac);
  s.days[day] = s.days[day] || [];
  if (s.days[day].includes(key)) return {status: 'today', state: s};
  const info = typeInfo(ac.type, idx, table, ac), tier = tierFor(ac, info), code = info.code;
  const hour = new Date(when).getHours(), night = hour >= NIGHT_FROM && hour < NIGHT_TO;
  const entry = {t: new Date(when).toISOString(), cs: String(ac.callsign || ac.reg || ac.hex).toUpperCase().slice(0, 10), reg: ac.reg || '', hex: ac.hex || '', type: code, op: ac.op || '', alt: ac.alt, gs: ac.gs, tier, night, cat: info.cat};
  if (isMilitary(ac)) entry.mil = 1;
  if (info.unknown) { const o = originOf(ac); if (o) entry.origin = o; }
  const team = teamFor(ac); if (team) entry.team = team.name;
  const liv = liveryFor(ac); if (liv) { entry.liv = liv.name; if (liv.unique) entry.uniq = 1; }
  if (SQUAWKS[ac.squawk]) entry.sq = ac.squawk;
  if (ac.variant) entry.var = String(ac.variant).slice(0, 40);
  const had = s.cards[code], isWanted = !!(wanted && wanted.code === code && !s.wantedHits[day]);
  let gain = had ? DUPLICATE_XP[tier] : POINTS[tier];
  if (isWanted) { gain *= 2; s.wantedHits[day] = code; }
  const newType = !!(info.unknown && !had);
  if (newType) gain += NEW_TYPE_BONUS;
  // A first time variant of a type you already own earns a small bonus. Cards from before variants were tracked
  // (no variants recorded yet) just learn the variant, since it may be the one already caught.
  if (had) had.variants = cleanVariants(had.variants);
  const newVariant = !!(had && entry.var && had.variants.length && !had.variants.includes(entry.var));
  if (newVariant) gain += NEW_VARIANT_BONUS;
  if (had && entry.var && !had.variants.includes(entry.var)) had.variants.push(entry.var);
  if (had) { had.count++; had.last = entry; if (TIERS.indexOf(tier) > TIERS.indexOf(had.tier)) had.tier = tier; s.xp += gain; }
  else s.cards[code] = {code, tier, count: 1, first: entry, last: entry, variants: entry.var ? [entry.var] : []};
  s.points += gain; entry.gain = gain;
  if (night) s.night++;
  s.days[day].push(key); s.log.unshift(entry); s.log = s.log.slice(0, 5000); // one record per catch, kept for the catch detail view
  return {status: had ? 'dupe' : 'new', state: s, entry, info, tier, gain, wanted: isWanted, newType, newVariant, variant: entry.var || ''};
}

// Sets for the hangar. Each has a list of type codes (silhouettes until caught) or a rule.
// Albums need one of every main type in the family, so the Airbus album is 15 types, not 5.
export const SETS = [
  {id: 'airbus', name: 'Airbus Family Album', codes: ['BCS1', 'BCS3', 'A318', 'A319', 'A320', 'A321', 'A19N', 'A20N', 'A21N', 'A332', 'A333', 'A339', 'A359', 'A35K', 'A388']},
  {id: 'boeing', name: 'Boeing Family Album', codes: ['B737', 'B738', 'B739', 'B38M', 'B39M', 'B752', 'B763', 'B772', 'B77W', 'B788', 'B789', 'B78X', 'B744', 'B748']},
  {id: 'b737', name: '737 Club', codes: ['B736', 'B737', 'B738', 'B739', 'B37M', 'B38M', 'B39M', 'P8']},
  {id: 'giants', name: 'Queens and Giants', codes: ['B744', 'B748', 'A388', 'BLCF', 'A124']},
  {id: 'longhaul', name: 'Long Haul Heroes', codes: ['B77W', 'B788', 'B789', 'A333', 'A359', 'A35K']},
  {id: 'military', name: 'Military Ops', codes: ['EUFI', 'F35', 'HAWK', 'A332', 'E3TF', 'B52', 'C17', 'C130', 'A400', 'R135']},
  {id: 'props', name: 'Props and Turboprops', codes: ['AT76', 'DH8D', 'PC12', 'C172', 'C130', 'A400']},
  {id: 'rotor', name: 'Rotor Club', codes: ['EC35', 'EC45', 'A139', 'A169', 'A189', 'S92', 'H160', 'AS50', 'R44', 'R22', 'B06', 'B407', 'B429', 'H47', 'PUMA', 'EH10', 'LYNX', 'H64', 'H60', 'V22']},
  {id: 'unmanned', name: 'Unmanned', codes: ['Q9', 'Q9B', 'Q4', 'HRM9']},
  {id: 'display', name: 'Display teams', rule: 'display', goal: 1, desc: 'Catch a display team jet'},
  {id: 'night', name: 'Night owl', rule: 'night', goal: 3, desc: 'Catch three between 00:00 and 05:00'}];
export function setProgress(state, set) {
  const s = state || emptyState();
  if (set.codes) { const missing = set.codes.filter(c => !s.cards[c]), got = set.codes.length - missing.length; return {got, goal: set.codes.length, done: !missing.length, missing}; }
  const got = set.rule === 'night' ? s.night : s.log.filter(e => e.team).length;
  return {got: Math.min(got, set.goal), goal: set.goal, done: got >= set.goal, missing: []};
}

// Deck filters for the hangar. Each tests one card: its type info and every catch of it.
const BOMBERS = new Set(['B52', 'B1', 'B2', 'B21', 'TU95', 'T160', 'TU22', 'LANC', 'B17', 'MOSQ', 'VULC']);
const CARGO_TYPES = new Set(['BLCF', 'A3ST', 'A337', 'A124', 'A225', 'SGUP', 'CL4G', 'SNS2', 'B74F', 'B77F', 'MD11', 'A30B']);
const CARGO_CS = /^(FDX|UPS|BCS|GTI|CLX|BOX|CKS|ABW|ABR|MPH|DHK|DAE|DHL|BDA|AHO|SQC|CAO|GEC|NCA|CKK|KYE|TAY|SWN|ICV|ATN|PAC|MSX|EXS|BCY)\d/;
const LOGISTICS = new Set(['C17', 'C130', 'C30J', 'A400', 'C5M', 'C5', 'K35R', 'KC46', 'KC10', 'A332', 'A124', 'A225', 'C2', 'CN35', 'C295', 'IL76', 'KC39', 'C160', 'R135', 'MRTT']);
export const VINTAGE = new Set(['SPIT', 'HURI', 'LANC', 'B17', 'P51', 'MOSQ', 'DC3', 'DC6', 'C46', 'JU52', 'VULC', 'DHC1', 'TIGR', 'DH82', 'HUNT', 'MS76']);
export const DECK = [
  {id: 'legendary', name: 'Legendary', test: c => c.tier === 'legendary'},
  {id: 'rare', name: 'Rare and up', test: c => TIERS.indexOf(c.tier) >= TIERS.indexOf('rare')},
  {id: 'longhaul', name: 'Long haul', test: (c, i) => (i.cat === 'wide' || i.cat === 'quad') && !CARGO_TYPES.has(i.code)},
  {id: 'fighter', name: 'Fighters', test: (c, i) => i.cat === 'fighter' && !VINTAGE.has(i.code)},
  {id: 'bomber', name: 'Bombers', test: (c, i) => BOMBERS.has(i.code)},
  {id: 'cargo', name: 'Cargo', test: (c, i, es) => CARGO_TYPES.has(i.code) || /freight|cargo|lifter|beluga|guppy/i.test(i.name) || es.some(e => CARGO_CS.test(String(e.cs || '')))},
  {id: 'logistics', name: 'Military logistics', test: (c, i, es) => i.cat === 'miltransport' && !BOMBERS.has(i.code) || (LOGISTICS.has(i.code) && (i.cat !== 'wide' || es.some(e => e.mil)))},
  {id: 'drone', name: 'Drones', test: (c, i) => i.cat === 'drone'},
  {id: 'heli', name: 'Helicopters', test: (c, i) => i.cat === 'heli' || i.cat === 'gyro'},
  {id: 'bizjet', name: 'Bizjets', test: (c, i) => i.cat === 'bizjet'},
  {id: 'vintage', name: 'Vintage', test: (c, i) => VINTAGE.has(i.code)},
  {id: 'livery', name: 'Special livery', test: (c, i, es) => es.some(e => e.liv)},
  {id: 'display', name: 'Display teams', test: (c, i, es) => es.some(e => e.team)},
  {id: 'military', name: 'Military', test: (c, i, es) => !!i.mil || ['fighter', 'military', 'miltransport'].includes(i.cat) || es.some(e => e.mil)}];
// Owned cards that pass a deck filter, or a maker such as 'maker:Boeing'.
export function deckCodes(state, id, infoFor) {
  const s = state || emptyState(), f = DECK.find(d => d.id === id), maker = /^maker:/.test(id) ? id.slice(6) : '';
  return Object.keys(s.cards).filter(code => { const c = s.cards[code], i = infoFor(code), es = s.log.filter(e => e && e.type === code);
    if (!es.length && c.last) es.push(c.last);
    return maker ? (i.maker || 'Unknown maker') === maker : f ? !!f.test(c, i, es) : true; });
}
export function makersOwned(state, infoFor) { return [...new Set(Object.keys((state || emptyState()).cards).map(c => infoFor(c).maker || 'Unknown maker'))].sort(); }

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
  for (const [k, c] of Object.entries(s.cards)) { if (!c || typeof c !== 'object' || !(c.count >= 1)) { delete s.cards[k]; continue; } if (!TIERS.includes(c.tier)) c.tier = 'uncommon'; if (!/^[A-Z0-9?]{2,8}$/.test(k)) { delete s.cards[k]; continue; } if ('variants' in c) c.variants = cleanVariants(c.variants); } // repair, never throw a whole hangar away over one odd card
  s.pending = cleanPending(s.pending, Date.now());
  s.points = +s.points || 0; s.xp = +s.xp || 0; s.night = +s.night || 0; return s;
}
// Reward only after a legendary catch of that type, and only when it has a code and a link.
export function rewardFor(info, tier) { const r = info.reward || {}; return tier === 'legendary' && r.url && r.code ? r : null; }
