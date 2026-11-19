// Server rules for a catch and for bringing an old hangar across.
// Rarity comes from the same type table and the same functions as the guest game.
import * as C from '../web/js/core.mjs';
import {POINTS, DUPLICATE_XP} from '../web/js/config.mjs';

export const LIMITS = {
  perMinute: 30,
  perDay: 500,
  windowMs: 6 * 60 * 60 * 1000,
  maxCards: 2000,
  maxPerHour: 150,
  maxPerDay: 500,
  futureSkewMs: 5 * 60 * 1000,
  earliest: Date.parse('2020-01-01T00:00:00Z'),
};

export const KNOWN_EXTRA = new Set(['UNKFW', 'UNKHE', 'UNKUV']);

export const normCs = s => String(s || '').trim().toUpperCase().replace(/[\s-]+/g, '');

export function prepare(data) {
  C.setTeams(data.teams || {teams: []});
  C.setHexTypes(data.hexTypes || {types: {}});
  C.setLiveries(data.liveries || {liveries: []});
  C.setOneOffs(data.oneOffs || {airframes: []});
  C.setCallsignTypes(data.csTypes || {prefixes: {}});
  C.setRanges(data.ranges || {countries: [], military: []});
  const table = data.table;
  if (!table || !Array.isArray(table.types)) throw new Error('type table missing');
  return {table, idx: C.indexTypes(table)};
}

export function expectedRarity(entry, ctx) {
  const type = String(entry.type || entry.aircraft_type || '').toUpperCase();
  const ac = {
    callsign: entry.cs || entry.callsign || '',
    flight: entry.flight != null ? entry.flight : (entry.cs || entry.callsign || ''),
    hex: String(entry.hex || entry.icao24 || '').replace('~', ''),
    reg: entry.reg || entry.r || '',
    r: entry.reg || entry.r || '',
    dbFlags: entry.mil ? 1 : (entry.dbFlags | 0),
    squawk: entry.squawk || entry.sq || '',
    type,
    category: entry.category || '',
  };
  const info = C.typeInfo(type, ctx.idx, ctx.table, ac);
  return {type: info.code, rarity: C.tierFor(ac, info), info, ac};
}

function feedMessage(error, cs) {
  if (error === 'ground') return `${cs} is on the ground. It has to be flying to count.`;
  if (error === 'stale') return `${cs} has gone quiet. Try again when it shows up live.`;
  if (error === 'busy') return 'The tracker is busy. Give it a minute and try again.';
  if (error === 'offline') return 'I could not reach the live tracker just now. Try again in a moment.';
  return `I can't hear ${cs} right now. Check the spelling, or it may be out of range.`;
}

// Decide a live catch from an adsb.lol style body. The caller has already rate limited.
export function assessFeed(body, typed, ctx) {
  const want = normCs(typed);
  const list = (body && (body.ac || body.aircraft)) || [];
  const matches = list.filter(a => a && normCs(a.flight) === want);
  if (!matches.length) return {ok: false, error: 'notfound', message: feedMessage('notfound', want)};
  const picked = C.pickLive({ac: matches});
  if (!picked.ok) return {ok: false, error: picked.reason, message: feedMessage(picked.reason, want)};
  const ac = picked.ac;
  ac.type = C.resolveType(ac);
  const info = C.typeInfo(ac.type, ctx.idx, ctx.table, ac);
  const rarity = C.tierFor(ac, info);
  const icao = String(ac.hex || '').replace('~', '').toLowerCase();
  if (!/^[0-9a-f]{6}$/.test(icao)) return {ok: false, error: 'notfound', message: 'The feed did not give an aircraft address, so I could not keep that one.'};
  return {
    ok: true,
    card: {
      aircraft_type: info.code,
      rarity,
      callsign: normCs(ac.callsign || want).slice(0, 8),
      icao24: icao,
      name: info.name,
      alt: ac.alt,
      gs: ac.gs,
      reg: ac.reg || '',
    },
  };
}

export function planCatch({callsign, feedBody, feedError, recent, now, ctx}) {
  const typed = normCs(callsign);
  const at = new Date(now).toISOString();
  const logBase = {callsign: typed, icao24: '', caught_at: at, accepted: false, reason: 'bad'};
  if (!/^[A-Z0-9]{2,8}$/.test(typed)) {
    return {ok: false, error: 'bad', message: 'Type a callsign made of letters and numbers, up to 8 characters.', log: logBase};
  }
  const minute = now - 60 * 1000, day = now - 24 * 60 * 60 * 1000;
  const rows = recent || [];
  const inMinute = rows.filter(r => Date.parse(r.caught_at) >= minute).length;
  const inDay = rows.filter(r => Date.parse(r.caught_at) >= day).length;
  if (inMinute >= LIMITS.perMinute) {
    return {ok: false, error: 'rate', message: 'Too many tries in a minute. Give it a moment and try again.', log: {...logBase, reason: 'rate'}};
  }
  if (inDay >= LIMITS.perDay) {
    return {ok: false, error: 'rate', message: 'That is 500 catches today, which is the daily cap.', log: {...logBase, reason: 'rate'}};
  }
  if (feedError) {
    const error = feedError === 'busy' ? 'busy' : 'offline';
    return {ok: false, error, message: feedMessage(error, typed), log: {...logBase, reason: error}};
  }
  const decision = assessFeed(feedBody, typed, ctx);
  if (!decision.ok) {
    return {...decision, log: {...logBase, reason: decision.error, icao24: ''}};
  }
  const windowStart = now - LIMITS.windowMs;
  const dupe = rows.some(r => r.accepted && normCs(r.callsign) === decision.card.callsign && String(r.icao24 || '').toLowerCase() === decision.card.icao24 && Date.parse(r.caught_at) >= windowStart);
  if (dupe) {
    return {
      ok: false,
      error: 'dupe',
      message: `You have already caught ${decision.card.callsign} on this flight. The same aircraft counts once every six hours.`,
      log: {callsign: decision.card.callsign, icao24: decision.card.icao24, caught_at: at, accepted: false, reason: 'dupe'},
    };
  }
  const card = {...decision.card, caught_at: at, source: 'live'};
  return {
    ok: true,
    card,
    log: {callsign: card.callsign, icao24: card.icao24, caught_at: at, accepted: true, reason: 'live'},
  };
}

function reject(entry, reason) {
  return {callsign: normCs(entry && (entry.cs || entry.callsign) || ''), type: String(entry && entry.type || '').toUpperCase(), reason};
}

export function reviewSave(obj, ctx, now = Date.now(), limits = {}) {
  const maxCards = limits.maxCards || LIMITS.maxCards;
  const maxPerHour = limits.maxPerHour || LIMITS.maxPerHour;
  const maxPerDay = limits.maxPerDay || LIMITS.maxPerDay;
  const rejected = [];
  const accepted = [];
  if (!obj || obj.v !== 1 || typeof obj.cards !== 'object' || obj.cards === null || Array.isArray(obj.cards) || !Array.isArray(obj.log)) {
    return {ok: false, error: 'format', message: 'That save is not a Callsign Catch collection I can read.', accepted, rejected};
  }
  if (obj.log.length > 5000 || Object.keys(obj.cards).length > 5000) {
    return {ok: false, error: 'format', message: 'That save is larger than I can check in one go.', accepted, rejected};
  }
  const ordered = obj.log.filter(e => e && typeof e === 'object').sort((a, b) => Date.parse(a.t) - Date.parse(b.t));
  for (const e of obj.log) {
    if (!e || typeof e !== 'object') rejected.push(reject(e, 'One line in the log was empty, so I skipped it.'));
  }
  const byHour = new Map(), byDay = new Map(), seenFlight = [];
  for (const e of ordered) {
    if (accepted.length >= maxCards) {
      rejected.push(reject(e, 'I can only bring across 2000 cards, so this one stayed behind.'));
      continue;
    }
    const t = Date.parse(e.t);
    if (!Number.isFinite(t)) { rejected.push(reject(e, 'That catch has no time I can read.')); continue; }
    if (t > now + LIMITS.futureSkewMs) { rejected.push(reject(e, 'That catch is dated in the future, so I left it out.')); continue; }
    if (t < LIMITS.earliest) { rejected.push(reject(e, 'That catch is dated too far back to be from this game.')); continue; }
    if (e.gift) { rejected.push(reject(e, 'Gift cards stay on this device. The code still works here.')); continue; }
    const type = String(e.type || '').toUpperCase();
    if (!/^[A-Z0-9]{2,8}$/.test(type) || (!ctx.idx.has(type) && !KNOWN_EXTRA.has(type))) {
      rejected.push(reject(e, `${type || 'This type'} is not in my list, so I left it out.`));
      continue;
    }
    const expect = expectedRarity(e, ctx);
    if (String(e.tier || '') !== expect.rarity) {
      rejected.push(reject(e, `${normCs(e.cs) || type} is listed as ${e.tier || 'an unknown rarity'}, but this type works out as ${expect.rarity}. I left it out.`));
      continue;
    }
    const cs = normCs(e.cs || e.callsign || '');
    const icao = String(e.hex || e.icao24 || '').replace('~', '').toLowerCase();
    if (!/^[A-Z0-9]{2,8}$/.test(cs)) { rejected.push(reject(e, 'That catch has no callsign I can keep.')); continue; }
    if (!/^[0-9a-f]{6}$/.test(icao)) { rejected.push(reject(e, `${cs} has no aircraft address, so I left it out.`)); continue; }
    const hour = new Date(t).toISOString().slice(0, 13);
    const day = new Date(t).toISOString().slice(0, 10);
    const hourN = (byHour.get(hour) || 0) + 1;
    const dayN = (byDay.get(day) || 0) + 1;
    byHour.set(hour, hourN); byDay.set(day, dayN);
    if (hourN > maxPerHour) { rejected.push(reject(e, 'Too many catches in that hour for one player, so I left the extras out.')); continue; }
    if (dayN > maxPerDay) { rejected.push(reject(e, 'Too many catches in that day, so I left the extras out.')); continue; }
    const repeat = seenFlight.some(s => s.cs === cs && s.icao === icao && Math.abs(s.t - t) <= LIMITS.windowMs);
    if (repeat) { rejected.push(reject(e, `${cs} was already in this save within six hours, so I kept the first one.`)); continue; }
    seenFlight.push({cs, icao, t});
    accepted.push({
      aircraft_type: expect.type,
      rarity: expect.rarity,
      callsign: cs,
      icao24: icao,
      caught_at: new Date(t).toISOString(),
      source: 'legacy',
      name: expect.info.name,
    });
  }
  for (const [code, card] of Object.entries(obj.cards)) {
    if (!card || typeof card !== 'object') continue;
    const claimed = card.count | 0;
    const logged = obj.log.filter(e => e && String(e.type || '').toUpperCase() === String(code).toUpperCase()).length;
    if (claimed > logged + 20 && claimed > logged * 2 && claimed > 10) {
      rejected.push({callsign: '', type: String(code).toUpperCase(), reason: `${code} says it was caught ${claimed} times, but the log only shows ${logged}. I did not invent the missing ones.`});
    }
  }
  const empty = ordered.length === 0 && Object.keys(obj.cards).length === 0;
  if (empty) return {ok: false, error: 'format', message: 'That save has no cards to bring across.', accepted, rejected};
  return {ok: true, accepted, rejected};
}

export function hangarFromCards(rows, ctx, gifts = []) {
  const s = C.emptyState();
  const ordered = [...(rows || [])].sort((a, b) => String(a.caught_at).localeCompare(String(b.caught_at)));
  for (const row of ordered) {
    const tier = C.TIERS.includes(row.rarity) ? row.rarity : 'uncommon';
    const entry = {
      t: row.caught_at, cs: row.callsign, hex: row.icao24, type: row.aircraft_type, tier,
      source: row.source, legacy: row.source === 'legacy', alt: row.alt ?? null, gs: row.gs ?? null,
      reg: row.reg || '', op: row.op || '', night: false, gain: 0,
    };
    const had = s.cards[entry.type];
    entry.gain = had ? (DUPLICATE_XP[tier] || 0) : (POINTS[tier] || 0);
    if (had) {
      had.count++; had.last = entry;
      if (C.TIERS.indexOf(tier) > C.TIERS.indexOf(had.tier)) had.tier = tier;
      s.xp += entry.gain;
    } else s.cards[entry.type] = {code: entry.type, tier, count: 1, first: entry, last: entry, variants: []};
    s.points += entry.gain;
    const day = C.dayKey(entry.t);
    s.days[day] = s.days[day] || [];
    s.days[day].push(entry.cs);
    s.log.unshift(entry);
  }
  for (const e of gifts || []) {
    if (!e || !e.gift) continue;
    s.log.unshift(e);
    const card = s.cards[e.type];
    if (!card) s.cards[e.type] = {code: e.type, tier: 'mythic', count: 1, first: e, last: e, variants: e.var ? [e.var] : []};
    else {
      card.count = (card.count | 0) + 1; card.tier = 'mythic'; card.last = e;
      if (e.var && Array.isArray(card.variants) && !card.variants.includes(e.var)) card.variants.push(e.var);
    }
  }
  return s;
}

export {POINTS, DUPLICATE_XP};
