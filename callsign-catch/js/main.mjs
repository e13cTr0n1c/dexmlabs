import {POINTS, PENDING_EVERY_MS, BOARD_ACCEPTS_HEX, LEADERBOARD_API, SUBMIT_GAP_MS, SUBMITS_PER_HOUR, SPOT_API, NEW_TYPE_BONUS, NEW_VARIANT_BONUS} from './config.mjs';
import * as C from './core.mjs';
import {lookup} from './api.mjs';
import {flapTo} from './flap.mjs';
import {countTo, sparks, buzz, holo, calm} from './fx.mjs';
import {clack, chime, thud, soundOn, setSound} from './sound.mjs';
import {cardArt, setArtManifest, setPhotos, photoCredit, safeSpot, nextArt, upgradeArt, SPOT_TTL} from './art.mjs';

const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
// The form listener goes on before anything is awaited. The page's CSP blocks a plain form post, so a press that
// came before the listener existed used to do nothing at all. Now every press gets an answer.
let ready = false, loadFailed = false;
$('#catch-form').addEventListener('submit', e => {
  e.preventDefault();
  if (loadFailed) return say("I couldn't load the aircraft list. Refresh the page to try again.", 'bad');
  if (!ready) return say('Still loading the aircraft list. Give it a second and press Catch it again.', 'wait');
  submit($('#cs').value);
});
const getJSON = n => fetch(`./data/${n}.json`).then(r => { if (!r.ok) throw new Error(n + ' ' + r.status); return r.json(); });
let table, specials, art, photos, teams, hexTypes, ranges, liveries, csTypes, oneOffs;
try { [table, specials, art, photos, teams, hexTypes, ranges, liveries, csTypes, oneOffs] = await Promise.all(['types', 'specials', 'art', 'photos', 'display-teams', 'hex-types', 'icao-ranges', 'liveries', 'callsign-types', 'one-offs'].map(getJSON)); }
catch (e) { loadFailed = true; say("I couldn't load the aircraft list. Refresh the page to try again.", 'bad'); throw e; }
C.setTeams(teams); C.setHexTypes(hexTypes); C.setLiveries(liveries); C.setCallsignTypes(csTypes); C.setOneOffs(oneOffs); C.setRanges(ranges); setArtManifest(art.codes); setPhotos(photos.photos);
const idx = C.indexTypes(table);
for (const sp of specials.cards) idx.set(sp.code, {code: sp.code, name: sp.name, maker: 'DEXM Labs', tier: 'legendary', cat: 'special', fact: sp.fact || 'A special card, out for one day only.', reward: sp.reward || {}});
// Planespotters: an answer older than 24 hours is never shown (safeSpot checks its date) and is asked for again.
// The photo page link and the photographer stay on the record as provenance; the expired image address is marked stale.
const dropStaleSpots = s => { const mark = p => { if (p && typeof p === 'object' && p.src && !safeSpot(p)) p.stale = 1; };
  for (const e of s.log || []) mark(e && e.photo); for (const c of Object.values(s.cards || {})) for (const k of ['first', 'last']) mark(c[k] && c[k].photo); return s; };
const load = () => { try { const s = C.validateImport(JSON.parse(localStorage.getItem(C.STORE_KEY))); if (s) dropStaleSpots(s); return s ? C.regrade(s, idx, table) : C.emptyState(); } catch { return C.emptyState(); } };
const infoOf = code => C.typeInfo(code, idx, table);
let deck = 'all';
let state = load(), filter = 'all', lastSubmit = 0, recent = [];
// Keep the previous raw save as a backup before every write, so a bad write can never cost a hangar.
// Keep the previous raw save as a backup before every write, so a bad write can never cost a hangar.
// If the browser runs out of room, the backup goes first, then the raw feed copies on the oldest catches (newest 300 kept).
const save = () => {
  const write = () => localStorage.setItem(C.STORE_KEY, JSON.stringify(state));
  try { const prev = localStorage.getItem(C.STORE_KEY); if (prev) localStorage.setItem(C.STORE_KEY + ':backup', prev); write(); return; } catch {}
  try { localStorage.removeItem(C.STORE_KEY + ':backup'); write(); return; } catch {}
  try { state.log.slice(300).forEach(e => { if (e && e.raw) { delete e.raw; e.rawTrimmed = 1; } }); write(); } catch {}
};
const now = () => new Date(window.__ccNow || Date.now());
const wanted = () => C.wantedFor(now(), table, specials);
const Tier = t => t[0].toUpperCase() + t.slice(1);
const fmtTime = iso => new Date(iso).toLocaleString('en-GB', {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'});

// The variants caught of a type, as ticked chips, e.g. UH-60 Black Hawk and S-70 Firehawk on the H60 card.
function variantChips(code) {
  const v = (state.cards[code] && state.cards[code].variants) || [];
  return v.length ? `<ul class="cc-vars" aria-label="Variants caught">${v.map(x => `<li><span aria-hidden="true">\u2713</span> ${esc(x)}</li>`).join('')}</ul>` : '';
}
function cardHTML(info, tier, entry, owned, extra = '', eager = false) {
  const log = entry ? `<dl class="log"><div><dt>Caught</dt><dd>${esc(fmtTime(entry.t))}</dd></div><div><dt>Callsign</dt><dd>${esc(entry.cs)}</dd></div>${entry.op ? `<div><dt>Operator</dt><dd>${esc(entry.op)}</dd></div>` : ''}${entry.reg ? `<div><dt>Registration</dt><dd>${esc(entry.reg)}</dd></div>` : ''}${info.unknown && entry.hex ? `<div><dt>Hex</dt><dd>${esc(entry.hex.toUpperCase())}</dd></div>` : ''}<div><dt>Altitude</dt><dd>${entry.alt != null ? esc(entry.alt.toLocaleString('en-GB')) + ' ft' : 'n/a'}</dd></div><div><dt>Speed</dt><dd>${entry.gs != null ? esc(entry.gs) + ' kt' : 'n/a'}</dd></div></dl>` : '';
  const sq = entry && C.SQUAWKS[entry.sq] ? `<span class="sq-badge" aria-hidden="true">${esc(entry.sq)}</span><p class="cc-squawk"><b>${tier === 'mythic' ? 'Mythic squawk' : 'Legendary squawk'}</b><span>${esc(C.SQUAWKS[entry.sq])}</span></p>` : '';
  const card = owned && state.cards[info.code], open = !!(card && !extra.includes('XP')), multi = open && card.count > 1;
  const more = multi ? `<span class="cc-more">See all ${card.count} catches</span>` : '';
  return `<article class="cc-card tier-${tier}${owned ? '' : ' empty'}${sq ? ' sq' : ''}${open ? ' opens' : ''}${multi ? ' multi' : ''}" data-code="${esc(info.code)}"${open ? ` tabindex="0" role="button" aria-haspopup="dialog" aria-label="${esc(info.name)}, ${multi ? `see all ${card.count} catches` : 'see the details'}"` : ''}><div class="cc-in">
<div class="cc-photo">${cardArt(info, tier, owned, eager, entry)}<div class="cc-top"><span class="cc-code">${esc(info.code)}</span><span class="cc-tier">${owned ? Tier(tier) : 'Locked'}</span></div>
<div class="cc-title">${owned && info.unknown && entry && entry.origin ? `<span class="cc-origin">${esc(entry.origin)}</span>` : ''}${owned && entry && entry.team ? `<span class="cc-team">${esc(entry.team)}</span>` : ''}<h3 class="cc-name">${owned ? esc(info.name) : 'Not caught yet'}</h3><p class="cc-pts">${owned ? `${POINTS[tier]} pts` : esc(Tier(info.tier))}${extra}</p>${more}</div></div>
${photoCredit(info, entry, owned)}${sq}${owned ? `<div class="cc-body">${variantChips(info.code)}${log}<p class="cc-fact">${esc(info.fact)}${info.source ? ` <a class="src" href="${esc(info.source)}" target="_blank" rel="noopener">source</a>` : ''}</p></div>` : ''}</div></article>`;
}

function renderStats() {
  const t = C.totals(state);
  for (const [id, v] of [['types', t.types], ['catches', t.catches], ['points', t.points], ['xp', t.xp], ['moments', t.moments]]) countTo($('#stat-' + id), v);
}
let wantedShown = false;
function renderWanted() {
  const w = wanted(), info = C.typeInfo(w.code, idx, table), got = state.wantedHits[C.dayKey(now())];
  $('#wanted').innerHTML = `<p class="eyebrow">Wanted today, double points</p><div class="wanted-row"><div class="wanted-art">${cardArt(info, info.tier, true, true)}</div><div><h2 class="vh">${esc(w.name)}</h2><span class="flapboard small" id="wanted-flap" aria-hidden="true"></span><p class="muted">${esc(info.code)} · ${Tier(info.tier)} · ${POINTS[info.tier] * 2} pts on your first one today</p>${got ? '<p class="ok">Caught. Well spotted.</p>' : ''}</div></div>`;
  flapTo($('#wanted-flap'), w.name.replace(/[^A-Za-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim(), {instant: wantedShown, onTick: wantedShown ? null : clack}); wantedShown = true;
}
function renderHangar() {
  const set = C.SETS.find(s => s.id === filter);
  let codes;
  if (set && set.codes) codes = set.codes;
  else if (set) codes = state.log.filter(e => set.rule === 'night' ? e.night : set.rule === 'mythic' ? e.tier === 'mythic' : !!e.team).map(e => e.type);
  else codes = [...new Set([...Object.keys(state.cards), ...C.SETS.flatMap(s => s.codes || [])])];
  if (deck !== 'all') { const keep = new Set(C.deckCodes(state, deck, infoOf)); codes = codes.filter(c => keep.has(c)); }
  codes = [...new Set(codes)].sort((a, b) => (!!state.cards[b] - !!state.cards[a]) || C.TIERS.indexOf(C.typeInfo(b, idx, table).tier) - C.TIERS.indexOf(C.typeInfo(a, idx, table).tier) || a.localeCompare(b));
  $('#hangar').innerHTML = codes.map(code => { const c = state.cards[code], info = C.typeInfo(code, idx, table);
    return cardHTML(info, c ? c.tier : info.tier, c && c.last, !!c, c && c.count > 1 ? ` <span class="cc-count">×${c.count}</span>` : ''); }).join('') || `<p class="muted">${deck !== 'all' ? 'No cards match that filter yet.' : 'Nothing here yet.'}</p>`;
  const sp = set && set.codes ? C.setProgress(state, set) : null;
  $('#set-missing').hidden = !sp;
  if (sp) $('#set-missing').innerHTML = sp.done ? `<b>${esc(set.name)}: complete, ${sp.got}/${sp.goal}.</b>` : `<b>${esc(set.name)}: ${sp.got}/${sp.goal}.</b> Still to catch: ${sp.missing.map(c => esc(infoOf(c).name)).join(', ')}.`;
  $('#deck').innerHTML = [{id: 'all', name: 'All cards'}, ...C.DECK].map(d => `<button type="button" class="chip${deck === d.id ? ' on' : ''}" data-deck="${d.id}" aria-pressed="${deck === d.id}">${esc(d.name)}</button>`).join('');
  const mk = C.makersOwned(state, infoOf), ms = $('#deck-maker');
  ms.innerHTML = `<option value="">By maker</option>` + mk.map(m => `<option value="${esc(m)}"${deck === 'maker:' + m ? ' selected' : ''}>${esc(m)}</option>`).join('');
  $('#sets').innerHTML = C.SETS.map(s => { const p = C.setProgress(state, s);
    const pc = Math.round(100 * p.got / p.goal);
    return `<button type="button" class="set${filter === s.id ? ' on' : ''}${p.done ? ' done' : ''}" data-set="${s.id}" aria-pressed="${filter === s.id}" style="--p:${pc}"><span class="badge" aria-hidden="true"><b>${p.done ? '\u2713' : pc + '%'}</b></span><span>${esc(s.name)}</span><span class="bar"><i style="width:${Math.round(100 * p.got / p.goal)}%"></i></span><small>${p.got}/${p.goal}${s.desc ? ' · ' + esc(s.desc) : ''}</small></button>`; }).join('');
  $('#set-all').setAttribute('aria-pressed', filter === 'all'); $('#set-all').classList.toggle('on', filter === 'all');
  $('#logbook').innerHTML = state.log.slice(0, 12).map(e => `<li><span class="lt tier-${e.tier}">${esc(e.type)}</span> ${esc(e.cs)} <span class="muted">${esc(fmtTime(e.t))} · ${esc(e.alt != null ? e.alt.toLocaleString('en-GB') : '')} ft · +${e.gain || 0}</span></li>`).join('') || '<li class="muted">Your catches will be logged here.</li>';
}
// Commons photos are looked up after the cards are drawn, so a slow or failed lookup never holds a card up.
const wikiStore = (() => { try { return localStorage; } catch { return null; } })();
const upgrade = el => upgradeArt(el, fetch, wikiStore).catch(() => {});
function render() { renderStats(); renderWanted(); renderHangar(); upgrade($('#hangar')); upgrade($('#wanted')); refreshSpots(); }
// Every caught airframe whose Planespotters answer is missing or older than 24 hours is looked up again, one at a
// time with a short gap, each one at most once per visit (and answers, empty ones too, are kept for 24 hours, so a reload asks nothing).
// Saves from before batch 3 carry photos with no date, so they all count as expired and all come back here.
let refreshing = false;
const spotKey = e => e && (e.hex || e.reg) ? String(e.hex || e.reg).toLowerCase() : '';
function applySpot(e, ph) {
  const merged = p => C.refreshPhoto(p, ph), k = spotKey(e);
  for (const x of [...state.log, ...Object.values(state.cards).flatMap(c => [c.first, c.last])]) if (x && spotKey(x) === k && !safeSpot(x.photo)) x.photo = merged(x.photo);
}
async function refreshSpots() {
  if (refreshing) return; refreshing = true;
  try {
    const seen = new Set(), todo = [];
    for (const e of [...Object.values(state.cards).map(c => c.last), ...state.log]) { const k = spotKey(e); if (!k || seen.has(k) || asked.has(k) || e.gift || safeSpot(e.photo)) continue; seen.add(k); todo.push(e); }
    let got = 0, last = Date.now();
    const draw = () => { if (!got) return; save(); renderHangar(); upgrade($('#hangar')); got = 0; last = Date.now(); };
    // One at a time with a short gap, so Planespotters is never hammered. If it says busy, wait and carry on later.
    for (let e; (e = todo.shift());) {
      if (Date.now() < spotBusyUntil) { draw(); refreshing = false; setTimeout(refreshSpots, spotBusyUntil - Date.now() + 500); return; }
      const ph = await spotPhoto({hex: e.hex, reg: e.reg});
      if (Date.now() < spotBusyUntil) { todo.unshift(e); continue; }
      asked.add(spotKey(e)); if (ph) { applySpot(e, ph); got++; }
      if (Date.now() - last > 1500) draw();
      await new Promise(r => setTimeout(r, window.__ccFast ? 0 : SPOT_GAP_MS));
    }
    draw();
  } finally { refreshing = false; }
}
// A picture that fails to load (offline, Planespotters down) steps down the chain instead of leaving a gap.
document.addEventListener('error', e => { const t = e.target; if (t && t.tagName === 'IMG' && t.closest('.art-slot')) nextArt(t, code => C.typeInfo(code, idx, table), upgrade); }, true);

// Every catch of one type, each with its own photo and every detail stored on it.
function catchesOf(code) { return state.log.filter(e => e && e.type === code); }
const row = (k, v) => v === '' || v == null || v === false ? '' : `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`;
const num = (v, unit) => typeof v === 'number' ? v.toLocaleString('en-GB') + unit : '';
function catchRows(e) {
  const sq = e.squawk || e.sq;
  return row('Callsign', e.cs) + row('Registration', e.reg) + row('Hex', e.hex && e.hex.toUpperCase()) + row('Operator', e.op) + row('Tier', e.tier && Tier(e.tier))
    + row('Points', e.gift ? 'Gift' : e.gain != null ? '+' + e.gain : '') + row('Caught', e.t && fmtTime(e.t)) + row('Gifted', e.giftedAt && fmtTime(e.giftedAt))
    + row('Squawk', sq ? sq + (C.SQUAWKS[sq] ? ', ' + C.SQUAWKS[sq] : '') : '') + row('Livery', e.liv) + row('Variant', e.var) + row('Display team', e.team) + row('Origin', e.origin)
    + row('Altitude', num(e.alt, ' ft')) + row('GPS altitude', num(e.altGeom, ' ft')) + row('Speed', num(e.gs, ' kt')) + row('Track', num(e.track, '\u00b0'))
    + row('Position', typeof e.lat === 'number' && typeof e.lon === 'number' ? e.lat.toFixed(3) + ', ' + e.lon.toFixed(3) : '')
    + row('Night owl', e.night ? 'Yes' : '') + row('Military', e.mil ? 'Yes' : '') + row('Why this tier', e.why) + row('Mythic', e.mythic)
    + row('Flight', e.flight && e.flight.trim()) + row('Description', e.desc) + row('Category', e.category) + row('Feed', e.feedType) + row('Type from', e.typeFrom) + row('Source', e.src)
    + (e.note ? row('Note', e.note) : '');
}
function catchItem(info, e, i) {
  return `<li class="catch-item tier-${esc(e.tier || info.tier)}" data-i="${i}"><div class="cc-in"><div class="cc-photo">${cardArt(info, e.tier || info.tier, true, false, e)}</div>${photoCredit(info, e, true)}<dl class="log">${catchRows(e)}</dl></div></li>`;
}
const asked = new Set(); // airframes already looked up this visit
function openDetail(code) {
  const card = state.cards[code]; if (!card) return;
  const info = C.typeInfo(code, idx, table), list = catchesOf(code), dlg = $('#detail');
  if (!list.length && card.last) list.push(card.last);
  $('#detail-h').textContent = card.count > 1 ? `${info.name}: ${card.count} catches` : info.name;
  const missing = card.count - list.length;
  $('#detail-sum').innerHTML = `<dl class="log">${row('Type', info.code + (info.name ? ', ' + info.name : ''))}${row('Maker', info.maker)}${row('Tier', Tier(card.tier))}${row('Points', POINTS[card.tier] + ' pts')}${row('Catches', card.count)}${row('First caught', card.first && card.first.t && fmtTime(card.first.t))}${row('Last caught', card.last && card.last.t && fmtTime(card.last.t))}${row('Variants', (card.variants || []).join(', '))}</dl>${info.fact ? `<p class="cc-fact">${esc(info.fact)}</p>` : ''}`;
  $('#detail-list').innerHTML = list.map((e, i) => catchItem(info, e, i)).join('');
  $('#detail-note').textContent = missing > 0 ? `${missing} earlier ${missing === 1 ? 'catch was' : 'catches were'} made before I kept the details of each one, so ${missing === 1 ? 'it is' : 'they are'} counted on the card but not listed here.` : '';
  dlg.dataset.code = code;
  if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
  upgrade($('#detail-list'));
  // Each airframe is looked up by its own hex or registration when it has no photo under 24 hours old.
  list.forEach(async (e, i) => {
    if (e.gift || safeSpot(e.photo) || !spotKey(e)) return;
    const ph = await spotPhoto({hex: e.hex, reg: e.reg}); if (!ph) return;
    applySpot(e, ph); save();
    const li = $(`#detail-list [data-i="${i}"]`); if (li && dlg.dataset.code === code) { li.outerHTML = catchItem(info, e, i); upgrade($('#detail-list')); }
  });
}
const closeDetail = () => { const d = $('#detail'); d.close ? d.close() : d.removeAttribute('open'); };

// The departures board above the status line: the callsign while I check it, then the result in one or two words.
const board = (word, opts = {}) => flapTo($('#flapboard'), word, {min: 12, onTick: clack, ...opts});
// A chunky hit or miss on the catch box, cleared again so the next one can play.
let pulseTimer;
function pulse(kind, tier) { const cb = $('.catch'); clearTimeout(pulseTimer); cb.className = 'catch'; void cb.offsetWidth; cb.classList.add(kind); if (tier) cb.classList.add('tier-' + tier); pulseTimer = setTimeout(() => { cb.className = 'catch'; }, 1600); }
function say(msg, kind = '') { const el = $('#status'); el.textContent = msg; el.className = 'status ' + kind; }
const MSG = {notfound: q => `I can't hear ${q} right now. Check the spelling, or it may be out of range of the receivers.`,
  ground: q => `${q} is on the ground. It has to be flying to count, so try again once it's airborne.`,
  stale: q => `${q} has gone quiet for over a minute. Try again when it shows up live.`,
  today: q => `You've already caught ${q} today. Find another one, or try it again tomorrow.`,
  busy: () => 'The tracker is busy. Give it a minute and try again.',
  offline: () => "I couldn't reach the live tracker just now. Try again in a moment.",
  ambiguous: q => `More than one aircraft is answering to ${q} right now. Type the hex code or registration of the one you saw.`};

// Ask the feeds, keep only exact matches, and say which live aircraft it is, or why not.
async function check(q) {
  const r = await lookup(q);
  if (r.error) return {reason: r.error};
  const m = C.resolveMatches(q, r.data.ac);
  if (m.ambiguous) return {reason: 'ambiguous', matches: m.matches};
  const live = C.pickLive(m.resp);
  if (live.ok) live.source = r.source;
  return live.ok ? {live, source: r.source} : {reason: live.reason};
}
// Fill in the type, variant and photo, then bank it. Shared by a normal catch and a confirmed pending one.
async function bank(live) {
  const hexdbType = await fillType(live.ac);
  if (live.ac.type) live.ac.typeFrom = live.ac.typeFrom || 'feed or hexdb';
  else { live.ac.type = C.resolveType(live.ac); if (live.ac.type) live.ac.typeFrom = C.hexType(live.ac.hex) ? 'hex table' : 'callsign prefix'; }
  const photo = await spotPhoto(live.ac);
  live.ac.variant = C.pickVariant({hexdb: hexdbType, photoLink: photo && photo.link, desc: live.ac.desc});
  live.ac.source = live.source || '';
  const res = C.applyCatch(state, live.ac, now(), idx, table, wanted());
  if (res.status !== 'today') { if (photo) res.entry.photo = photo; state = res.state; save(); }
  return res;
}
function celebrate(res, lead = '') {
  render();
  say(lead + (res.newType ? `New type discovered! ${res.info.name}, with a +${NEW_TYPE_BONUS} bonus.` : res.newVariant ? `New variant: ${C.variantShort(res.variant)}. +${res.gain} XP, including a +${NEW_VARIANT_BONUS} bonus.` : res.status === 'new' ? `Caught! A new card: ${res.info.name}.` : `Another ${res.info.name}. +${res.gain} XP.`), 'ok');
  board(res.newType ? 'NEW TYPE' : res.newVariant ? 'NEW VARIANT' : 'CAUGHT'); buzz(res.tier === 'mythic' ? 'legendary' : res.entry.sq ? 'legendary' : res.tier); pulse('hit', res.entry.sq && res.tier !== 'mythic' ? 'legendary' : res.tier);
  reveal(res); setTimeout(() => chime(res.entry.sq || res.tier === 'mythic' ? 'legendary' : res.tier), 650); postCatch(res.entry);
}

// Pending sightings: no points until a feed hears the aircraft flying. Rechecked on open and every minute.
let lastMiss = null;
function offerPending(q) { lastMiss = q; const b = $('#pend-save'); b.hidden = false; b.textContent = `Save ${q.value.toUpperCase()} as pending`; }
function hidePendingOffer() { lastMiss = null; $('#pend-save').hidden = true; }
function renderPending() {
  const list = state.pending || [], box = $('#pending');
  box.hidden = !list.length;
  $('#pending-list').innerHTML = list.map(p => `<li class="pend"><span class="lt pend-tag">Pending</span> <b>${esc(p.value)}</b> <span class="muted">Unconfirmed, no points yet. Checking every minute until ${esc(fmtTime(p.until))}.</span> <button type="button" class="pend-x" data-v="${esc(p.value)}" aria-label="Remove pending ${esc(p.value)}">Remove</button></li>`).join('');
}
let checking = false;
async function recheckPending() {
  if (checking || !state.pending) return; checking = true;
  try {
    const gone = C.expirePending(state, now());
    if (gone.length) { save(); say(`${gone.map(p => p.value).join(', ')} never showed up in the feed, so ${gone.length === 1 ? 'that pending sighting has' : 'those pending sightings have'} expired. No points lost.`, 'wait'); }
    for (const p of [...state.pending]) {
      let res = null;
      try { const c = await check(C.pendingQuery(p)); p.tries = (p.tries | 0) + 1; if (c.live) res = await bank(c.live); } catch {}
      if (!res) continue;
      C.removePending(state, p.value); save();
      if (res.status === 'today') { render(); say(`${p.value} showed up, but you've already caught it today.`, 'wait'); continue; }
      celebrate(res, `Pending ${p.value} confirmed. `);
    }
    save(); renderPending();
  } finally { checking = false; }
}

async function submit(raw) {
  // A gift code typed here is redeemed as a gift, never looked up or offered as a pending sighting.
  if (await C.isGiftCode(raw, await getGifts())) { hidePendingOffer(); $('#cs').value = ''; return redeem(raw); }
  const q = C.parseQuery(raw);
  if (!q) return say('Type a callsign like BAW117 or X, a registration like G-XLEA or ZZ171, or a hex code like 4ca7b5. Letters and numbers only, up to 8.', 'bad');
  const t = Date.now(); recent = recent.filter(x => t - x < 3600e3);
  if (t - lastSubmit < SUBMIT_GAP_MS) return say(`Easy, spotter. One lookup every ${SUBMIT_GAP_MS / 1000} seconds.`, 'bad');
  if (recent.length >= SUBMITS_PER_HOUR) return say("That's a lot of lookups this hour. Have a cuppa and come back soon.", 'bad');
  const label = q.value.toUpperCase();
  if ((state.days[C.dayKey(now())] || []).includes(label)) return say(MSG.today(label), 'bad');
  lastSubmit = t; recent.push(t);
  const btn = $('#go'); btn.disabled = true; btn.textContent = 'Checking...'; btn.setAttribute('aria-busy', 'true');
  const WORD = {ambiguous: 'TOO MANY', busy: 'BUSY', offline: 'NO SIGNAL', notfound: 'NOT FOUND', ground: 'NOT AIRBORNE', stale: 'GONE QUIET'};
  const miss = w => { board(w); thud(); pulse('miss'); };
  board(label);
  say(`Listening for ${label}...`, 'wait');
  hidePendingOffer();
  try {
    const c = await check(q);
    if (!c.live) {
      miss(WORD[c.reason] || 'NOT FOUND'); say((MSG[c.reason] || MSG.notfound)(label), 'bad');
      if (c.reason === 'notfound' || c.reason === 'stale') offerPending(q);
      return;
    }
    const res = await bank(c.live);
    if (res.status === 'today') { miss('SEEN TODAY'); return say(MSG.today(c.live.ac.callsign), 'bad'); }
    C.removePending(state, q.value); save(); renderPending();
    celebrate(res);
  } catch (e) {
    console.error(e); miss('TRY AGAIN'); say('Something went wrong with that one. Try again in a moment.', 'bad');
  } finally { setTimeout(() => { btn.disabled = false; btn.textContent = 'Catch it'; btn.removeAttribute('aria-busy'); }, 400); }
}

// Ask hexdb.io, a free aircraft database, by the airframe's hex code. Its 'Type' text names the variant
// (UH-60L Blackhawk, S-70 I) and, when the feed has no type, it fills the type, registration and owner too.
async function fillType(ac) {
  if (!ac.hex) return '';
  try {
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 3000);
    const r = await fetch(`https://hexdb.io/api/v1/aircraft/${encodeURIComponent(ac.hex)}`, {signal: ctl.signal}); clearTimeout(timer);
    if (!r.ok) return '';
    const j = await r.json(), t = String(j.ICAOTypeCode || '').toUpperCase().trim();
    if (ac.type && t && t !== ac.type) return ''; // a different type, so its variant text is not for this card
    if (!ac.type) {
      if (/^[A-Z0-9]{2,4}$/.test(t)) ac.type = t;
      if (!ac.reg && j.Registration) ac.reg = String(j.Registration).slice(0, 10);
      if (!ac.op && j.RegisteredOwners) ac.op = String(j.RegisteredOwners).slice(0, 40);
    }
    return String(j.Type || '').slice(0, 60);
  } catch { return ''; }
}

// A photo of the exact airframe from Planespotters.net, if one exists. Never holds a catch up for long.
// Answers are kept per airframe for 24 hours at most (Planespotters' limit), including an answer of no photo.
const SPOT_CACHE = 'callsign:spot:', SPOT_GAP_MS = 700;
let spotBusyUntil = 0; // set when Planespotters answers 429, so nothing more is asked until it has had a rest
const spotCache = {
  get(k) { try { const c = JSON.parse(localStorage.getItem(SPOT_CACHE + k)); if (c && Date.now() - c.at < SPOT_TTL && Date.now() >= c.at - 60e3) return c; } catch {} return null; },
  set(k, p) { try { localStorage.setItem(SPOT_CACHE + k, JSON.stringify({at: Date.now(), p})); } catch {} },
  prune() { try { for (const k of Object.keys(localStorage)) if (k.startsWith(SPOT_CACHE) && !this.get(k.slice(SPOT_CACHE.length))) localStorage.removeItem(k); } catch {} }};
spotCache.prune();
async function spotPhoto(ac) {
  if (!SPOT_API) return null;
  const ck = String(ac.hex || ac.reg || '').toLowerCase(), hit = ck && spotCache.get(ck);
  if (hit) return safeSpot(hit.p);
  if (Date.now() < spotBusyUntil) return null;
  let answered = false;
  for (const path of [ac.hex && 'hex/' + encodeURIComponent(ac.hex), ac.reg && 'reg/' + encodeURIComponent(ac.reg)].filter(Boolean)) {
    try {
      const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 3500);
      const r = await fetch(`${SPOT_API}/${path}`, {signal: ctl.signal}); clearTimeout(timer);
      if (r.status === 429) { spotBusyUntil = Date.now() + 1000 * Math.min(300, Math.max(30, +r.headers.get('retry-after') || 60)); return null; }
      if (!r.ok) continue;
      answered = true;
      const p = ((await r.json()).photos || [])[0];
      const ph = p && safeSpot({src: (p.thumbnail_large || p.thumbnail || {}).src, by: String(p.photographer || '').slice(0, 60), link: p.link, at: Date.now()});
      if (ph) { if (ck) spotCache.set(ck, ph); return ph; }
    } catch {}
  }
  if (answered && ck) spotCache.set(ck, null); // a failed or busy request is not remembered, so it is asked again later
  return null;
}

function reveal(res) {
  const dlg = $('#reveal'), {info, tier, entry} = res, reward = C.rewardFor(info, tier);
  $('#reveal-card').innerHTML = `<div class="flip tier-${tier}"><div class="face back" aria-hidden="true"><span>DEXM</span></div><div class="face front">${cardHTML(info, tier, entry, true, res.status === 'dupe' ? ` <span class="cc-count">+${res.gain} XP</span>` : '', true)}</div></div>`;
  $('#reveal-h').textContent = res.status === 'new' ? `New card: ${Tier(tier)}` : `Duplicate: +${res.gain} XP`;
  $('#reveal-sub').textContent = res.wanted ? "That's today's wanted type. Double points!" : res.newVariant ? `New variant: ${C.variantShort(res.variant)}. +${NEW_VARIANT_BONUS} bonus` : (res.status === 'new' ? `+${res.gain} points` : `You now have ${state.cards[info.code].count}`);
  const rw = $('#reward'); rw.hidden = !reward;
  if (reward) { rw.querySelector('a').href = reward.url; rw.querySelector('a').textContent = 'Card reward: print this model'; rw.querySelector('code').textContent = reward.code; rw.querySelector('.rl').textContent = reward.label; }
  dlg.dataset.share = C.shareText(entry, info, tier); dlg.className = 'reveal tier-' + tier;
  if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
  upgrade($('#reveal-card'));
  requestAnimationFrame(() => requestAnimationFrame(() => dlg.classList.add('go')));
  // The pack shakes, flips at about 0.5s and the sparks fly as the face lands.
  clearTimeout(reveal.t); reveal.t = setTimeout(() => sparks($('#sparks'), getComputedStyle(dlg).getPropertyValue('--c').trim() || '#d6ff00', entry.sq ? 'legendary' : tier), calm() ? 0 : 900);
}

async function share(text) {
  try { if (navigator.share && matchMedia('(pointer:coarse)').matches) { await navigator.share({text}); return; } } catch {}
  try { await navigator.clipboard.writeText(text); $('#share').textContent = 'Copied'; } catch { $('#share').textContent = 'Copy failed'; }
  setTimeout(() => { $('#share').textContent = 'Share this card'; }, 1600);
}

function exportFile() {
  const blob = new Blob([JSON.stringify(state, null, 1)], {type: 'application/json'}), a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `callsign-catch-${C.dayKey(now())}.json`; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
async function importFile(file) {
  try { const s = C.validateImport(JSON.parse(await file.text())); if (!s) throw 0; C.regrade(s, idx, table); state = s; save(); render(); say(`Imported ${Object.keys(s.cards).length} cards.`, 'ok'); }
  catch { say("That file doesn't look like a Callsign Catch collection.", 'bad'); }
}

const sb = $('#sound'), showSound = () => { const on = soundOn(); sb.textContent = on ? 'Sound on' : 'Sound off'; sb.setAttribute('aria-pressed', String(on)); };
sb.addEventListener('click', () => { setSound(!soundOn()); showSound(); if (soundOn()) chime('common'); }); showSound();
$('#set-all').addEventListener('click', () => { filter = 'all'; renderHangar(); });
$('#deck').addEventListener('click', e => { const b = e.target.closest('[data-deck]'); if (b) { deck = deck === b.dataset.deck ? 'all' : b.dataset.deck; renderHangar(); upgrade($('#hangar')); } });
$('#deck-maker').addEventListener('change', e => { deck = e.target.value ? 'maker:' + e.target.value : 'all'; renderHangar(); upgrade($('#hangar')); });
$('#sets').addEventListener('click', e => { const b = e.target.closest('[data-set]'); if (b) { filter = filter === b.dataset.set ? 'all' : b.dataset.set; renderHangar(); } });
$('#close').addEventListener('click', () => { const d = $('#reveal'); d.classList.remove('go'); d.close ? d.close() : d.removeAttribute('open'); });
$('#hangar').addEventListener('click', e => { if (e.target.closest('a')) return; const c = e.target.closest('.cc-card.opens'); if (c) openDetail(c.dataset.code); });
$('#hangar').addEventListener('keydown', e => { const c = e.target.closest && e.target.closest('.cc-card.opens'); if (c && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openDetail(c.dataset.code); } });
$('#detail-close').addEventListener('click', closeDetail);
$('#detail').addEventListener('click', e => { if (e.target === $('#detail')) closeDetail(); });
$('#share').addEventListener('click', () => share($('#reveal').dataset.share));
$('#export').addEventListener('click', exportFile);
$('#import').addEventListener('change', e => { const f = e.target.files[0]; if (f) importFile(f); e.target.value = ''; });
// Redeem a gift code. Only a salted hash and a sealed payload are in the source; the greeting and cards appear after.
// Read fresh each time (the browser's own cache keeps it cheap), since the callsign box checks every entry against it.
const getGifts = () => fetch('./data/gifts.json').then(r => r.json()).catch(() => []);
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
function giftShow(greeting) { return new Promise(done => {
  const o = $('#gift-fx'), still = reduceMotion(); o.querySelector('.gift-text').textContent = greeting; o.classList.toggle('still', still);
  const sky = o.querySelector('.gift-sky'); sky.innerHTML = still ? '' : Array.from({length: 22}, (_, i) => `<i style="left:${(i * 37) % 100}%;animation-delay:${(i % 8) * 0.25}s;--s:${0.6 + (i % 5) * 0.2}">&#10084;</i>`).join('');
  o.hidden = false; let t;
  const end = () => { clearTimeout(t); o.hidden = true; sky.innerHTML = ''; removeEventListener('keydown', end); o.removeEventListener('click', end); done(); };
  t = setTimeout(end, still ? 2500 : 3600); addEventListener('keydown', end); o.addEventListener('click', end); }); }
async function redeem(typed) {
  const box = $('#redeem-code'), code = typed == null ? box.value : typed; if (!code.trim()) return;
  const r = await C.redeemGift(state, code, await getGifts(), now());
  if (r.status === 'wrong') { say('That code did not work.'); return; }
  if (r.status === 'already') { say('That code has already been used on this save.'); return; }
  box.value = ''; save(); await giftShow(r.greeting); render();
  say(r.entries.length + ' gift cards added to your hangar.'); const c = $('#hangar .cc-card[data-code="' + r.entries[0].type + '"]'); if (c) c.scrollIntoView({block: 'center'});
}
$('#redeem').addEventListener('submit', e => { e.preventDefault(); redeem(); });
// A gift code saved as pending by an older version is taken off the list, and is never offered as one.
(async () => { const g = await getGifts(), bad = []; for (const p of state.pending || []) if (await C.isGiftCode(p.value, g)) bad.push(p.value);
  if (bad.length) { for (const v of bad) C.removePending(state, v); save(); renderPending(); } })();
$('#board').hidden = !LEADERBOARD_API;
// Leaderboard: only when LEADERBOARD_API is set. The Worker checks every catch against the live feed itself.
const player = (() => { try { let p = localStorage.getItem('callsign:player'); if (!p) { p = [...crypto.getRandomValues(new Uint8Array(10))].map(b => b.toString(16).padStart(2, '0')).join(''); localStorage.setItem('callsign:player', p); } return p; } catch { return ''; } })();
const drawBoard = b => { $('#board-body').innerHTML = ['today', 'alltime'].map(k => `<div><h3>${k === 'today' ? 'Today' : 'All time'}</h3><ol>${(b[k] || []).map(e => `<li>${esc(e.nick)} <b>${esc(e.points)}</b></li>`).join('') || '<li class="muted">No catches yet.</li>'}</ol></div>`).join(''); };
// The board Worker checks a catch live. A normal callsign always goes, with its hex and registration (an older Worker
// ignores them). A hex keyed catch such as X goes only once BOARD_ACCEPTS_HEX says the Worker can check it by hex.
async function postCatch(entry) { const nick = (localStorage.getItem('callsign:nick') || '').trim(); if (!LEADERBOARD_API || !nick) return;
  const pl = C.boardPayload(entry, BOARD_ACCEPTS_HEX); if (!pl) return;
  try { const r = await fetch(LEADERBOARD_API + '/catch', {method: 'POST', headers: {'Content-Type': 'text/plain'}, body: JSON.stringify({...pl, nickname: nick, player})}); const j = await r.json(); if (j.today) drawBoard(j); } catch {} }
if (LEADERBOARD_API) { $('#nick').value = localStorage.getItem('callsign:nick') || ''; $('#nick').addEventListener('change', e => localStorage.setItem('callsign:nick', e.target.value.slice(0, 16))); fetch(LEADERBOARD_API + '/board').then(r => r.json()).then(drawBoard).catch(() => {}); }
const drop = C.dropFor(now(), specials);
const remembrance = C.remembranceFor(C.themeDay(now(), location.search));
if (remembrance) {
  const info = C.typeInfo(remembrance.code, idx, table), sec = document.createElement('section');
  sec.className = 'remember'; sec.setAttribute('aria-label', remembrance.title);
  sec.innerHTML = `<svg class="remember-flower" viewBox="0 0 40 40" width="28" height="28" aria-hidden="true"><g fill="#b3261e"><circle cx="20" cy="12" r="8"/><circle cx="28" cy="20" r="8"/><circle cx="20" cy="28" r="8"/><circle cx="12" cy="20" r="8"/></g><circle cx="20" cy="20" r="4" fill="#1a1a1a"/></svg><div class="remember-row"><div class="wanted-art">${cardArt(info, info.tier, true, true)}</div><div><p class="eyebrow">${esc(remembrance.title)}</p><h2>${esc(info.name)}</h2><p>${esc(remembrance.note)}</p><p class="muted">We will remember them.</p></div></div>`;
  $('#wanted').before(sec); upgrade(sec);
}
if (drop) { $('#drop').hidden = false; $('#drop').textContent = `Free drop today: ${drop.name}`; }
render(); holo($('#hangar'));
// Gift codes never get here: submit() redeems them before any lookup, so no offer to save one is ever made.
$('#pend-save').addEventListener('click', () => { const q = lastMiss; if (!q) return; const r = C.addPending(state, q, now()); state = r.state; save(); renderPending(); hidePendingOffer();
  say(r.status === 'added' ? `Saved ${q.value.toUpperCase()} as pending. I'll keep checking for two hours and turn it into a card if a feed hears it flying. No points until then.` : r.status === 'full' ? 'You already have ten pending sightings. Remove one first.' : 'That one is already pending.', r.status === 'added' ? 'wait' : 'bad'); });
$('#pending-list').addEventListener('click', e => { const b = e.target.closest('.pend-x'); if (b) { C.removePending(state, b.dataset.v); save(); renderPending(); } });
renderPending(); recheckPending(); setInterval(recheckPending, PENDING_EVERY_MS);
const deep = new URLSearchParams(location.search).get('cs');
if (deep && C.parseQuery(deep)) { $('#cs').value = deep.toUpperCase().slice(0, 10); say(`Spotted overhead: ${deep.toUpperCase().slice(0, 10)}. Press Catch it to check it's flying.`, 'wait'); }
// resetGap is for the browser test only: it clears the gap between lookups (or with -1 sets it to now).
ready = true; board('READY', {instant: true});
window.CallsignCatch = {state: () => state, submit, recheckPending, openDetail, ready: true, resetGap: n => { lastSubmit = n === -1 ? Date.now() - SUBMIT_GAP_MS - 1 : 0; recent = []; }};
