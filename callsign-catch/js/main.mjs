import {POINTS, LEADERBOARD_API, SUBMIT_GAP_MS, SUBMITS_PER_HOUR, SPOT_API, NEW_TYPE_BONUS} from './config.mjs';
import * as C from './core.mjs';
import {lookup} from './api.mjs';
import {flapTo} from './flap.mjs';
import {countTo, sparks, buzz, holo, calm} from './fx.mjs';
import {clack, chime, thud, soundOn, setSound} from './sound.mjs';
import {cardArt, setArtManifest, setPhotos, photoCredit, safeSpot} from './art.mjs';

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
let table, specials, art, photos;
try { [table, specials, art, photos] = await Promise.all(['types', 'specials', 'art', 'photos'].map(getJSON)); }
catch (e) { loadFailed = true; say("I couldn't load the aircraft list. Refresh the page to try again.", 'bad'); throw e; }
setArtManifest(art.codes); setPhotos(photos.photos);
const idx = C.indexTypes(table);
for (const sp of specials.cards) idx.set(sp.code, {code: sp.code, name: sp.name, maker: 'DEXM Labs', tier: 'legendary', cat: 'special', fact: sp.fact || 'A special card, out for one day only.', reward: sp.reward || {}});
const load = () => { try { return C.validateImport(JSON.parse(localStorage.getItem(C.STORE_KEY))) || C.emptyState(); } catch { return C.emptyState(); } };
let state = load(), filter = 'all', lastSubmit = 0, recent = [];
// Keep the previous raw save as a backup before every write, so a bad write can never cost a hangar.
const save = () => { try { const prev = localStorage.getItem(C.STORE_KEY); if (prev) localStorage.setItem(C.STORE_KEY + ':backup', prev); localStorage.setItem(C.STORE_KEY, JSON.stringify(state)); } catch {} };
const now = () => new Date(window.__ccNow || Date.now());
const wanted = () => C.wantedFor(now(), table, specials);
const Tier = t => t[0].toUpperCase() + t.slice(1);
const fmtTime = iso => new Date(iso).toLocaleString('en-GB', {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'});

function cardHTML(info, tier, entry, owned, extra = '', eager = false) {
  const log = entry ? `<dl class="log"><div><dt>Caught</dt><dd>${esc(fmtTime(entry.t))}</dd></div><div><dt>Callsign</dt><dd>${esc(entry.cs)}</dd></div>${entry.op ? `<div><dt>Operator</dt><dd>${esc(entry.op)}</dd></div>` : ''}${entry.reg ? `<div><dt>Registration</dt><dd>${esc(entry.reg)}</dd></div>` : ''}${info.unknown && entry.hex ? `<div><dt>Hex</dt><dd>${esc(entry.hex.toUpperCase())}</dd></div>` : ''}<div><dt>Altitude</dt><dd>${entry.alt != null ? esc(entry.alt.toLocaleString('en-GB')) + ' ft' : 'n/a'}</dd></div><div><dt>Speed</dt><dd>${entry.gs != null ? esc(entry.gs) + ' kt' : 'n/a'}</dd></div></dl>` : '';
  const sq = entry && C.SQUAWKS[entry.sq] ? `<p class="cc-squawk"><b>Legendary squawk</b><span>${esc(C.SQUAWKS[entry.sq])}</span></p>` : '';
  return `<article class="cc-card tier-${tier}${owned ? '' : ' empty'}${sq ? ' sq' : ''}" data-code="${esc(info.code)}"><div class="cc-in">
<div class="cc-photo">${cardArt(info, tier, owned, eager, entry)}<div class="cc-top"><span class="cc-code">${esc(info.code)}</span><span class="cc-tier">${owned ? Tier(tier) : 'Locked'}</span></div>
<div class="cc-title"><h3 class="cc-name">${owned ? esc(info.name) : 'Not caught yet'}</h3><p class="cc-pts">${owned ? `${POINTS[tier]} pts` : esc(Tier(info.tier))}${extra}</p></div></div>
${photoCredit(info, entry, owned)}${sq}${owned ? `<div class="cc-body">${log}<p class="cc-fact">${esc(info.fact)}${info.source ? ` <a class="src" href="${esc(info.source)}" target="_blank" rel="noopener">source</a>` : ''}</p></div>` : ''}</div></article>`;
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
  else if (set) codes = state.log.filter(e => set.rule === 'night' ? e.night : (C.isDisplay(e.cs, e.type) || e.type === 'HAWK')).map(e => e.type);
  else codes = [...new Set([...Object.keys(state.cards), ...C.SETS.flatMap(s => s.codes || [])])];
  codes = [...new Set(codes)].sort((a, b) => (!!state.cards[b] - !!state.cards[a]) || C.TIERS.indexOf(C.typeInfo(b, idx, table).tier) - C.TIERS.indexOf(C.typeInfo(a, idx, table).tier) || a.localeCompare(b));
  $('#hangar').innerHTML = codes.map(code => { const c = state.cards[code], info = C.typeInfo(code, idx, table);
    return cardHTML(info, c ? c.tier : info.tier, c && c.last, !!c, c && c.count > 1 ? ` <span class="cc-count">×${c.count}</span>` : ''); }).join('') || '<p class="muted">Nothing here yet.</p>';
  $('#sets').innerHTML = C.SETS.map(s => { const p = C.setProgress(state, s);
    const pc = Math.round(100 * p.got / p.goal);
    return `<button type="button" class="set${filter === s.id ? ' on' : ''}${p.done ? ' done' : ''}" data-set="${s.id}" aria-pressed="${filter === s.id}" style="--p:${pc}"><span class="badge" aria-hidden="true"><b>${p.done ? '\u2713' : pc + '%'}</b></span><span>${esc(s.name)}</span><span class="bar"><i style="width:${Math.round(100 * p.got / p.goal)}%"></i></span><small>${p.got}/${p.goal}${s.desc ? ' · ' + esc(s.desc) : ''}</small></button>`; }).join('');
  $('#set-all').setAttribute('aria-pressed', filter === 'all'); $('#set-all').classList.toggle('on', filter === 'all');
  $('#logbook').innerHTML = state.log.slice(0, 12).map(e => `<li><span class="lt tier-${e.tier}">${esc(e.type)}</span> ${esc(e.cs)} <span class="muted">${esc(fmtTime(e.t))} · ${esc(e.alt.toLocaleString('en-GB'))} ft · +${e.gain || 0}</span></li>`).join('') || '<li class="muted">Your catches will be logged here.</li>';
}
function render() { renderStats(); renderWanted(); renderHangar(); }

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
  offline: () => "I couldn't reach the live tracker just now. Try again in a moment."};

async function submit(raw) {
  const q = C.parseQuery(raw);
  if (!q) return say('Type a callsign like BAW117, a registration like G-XLEA or a hex code like 4ca7b5.', 'bad');
  const t = Date.now(); recent = recent.filter(x => t - x < 3600e3);
  if (t - lastSubmit < SUBMIT_GAP_MS) return say(`Easy, spotter. One lookup every ${SUBMIT_GAP_MS / 1000} seconds.`, 'bad');
  if (recent.length >= SUBMITS_PER_HOUR) return say("That's a lot of lookups this hour. Have a cuppa and come back soon.", 'bad');
  const label = q.value.toUpperCase();
  if ((state.days[C.dayKey(now())] || []).includes(label)) return say(MSG.today(label), 'bad');
  lastSubmit = t; recent.push(t);
  const btn = $('#go'); btn.disabled = true; btn.textContent = 'Checking...'; btn.setAttribute('aria-busy', 'true');
  const WORD = {busy: 'BUSY', offline: 'NO SIGNAL', notfound: 'NOT FOUND', ground: 'NOT AIRBORNE', stale: 'GONE QUIET'};
  const miss = w => { board(w); thud(); pulse('miss'); };
  board(label);
  say(`Listening for ${label}...`, 'wait');
  try {
    const r = await lookup(q);
    if (r.error) { miss(WORD[r.error] || 'NO SIGNAL'); return say((MSG[r.error] || MSG.offline)(label), 'bad'); }
    const live = C.pickLive(r.data);
    if (!live.ok) { miss(WORD[live.reason] || 'NOT FOUND'); return say((MSG[live.reason] || MSG.notfound)(label), 'bad'); }
    if (!live.ac.type) await fillType(live.ac);
    const spot = spotPhoto(live.ac);
    const res = C.applyCatch(state, live.ac, now(), idx, table, wanted());
    if (res.status === 'today') { miss('SEEN TODAY'); return say(MSG.today(live.ac.callsign), 'bad'); }
    const photo = await spot; if (photo) res.entry.photo = photo;
    state = res.state; save(); render();
    say(res.newType ? `New type discovered! ${res.info.name}, with a +${NEW_TYPE_BONUS} bonus.` : res.status === 'new' ? `Caught! A new card: ${res.info.name}.` : `Another ${res.info.name}. +${res.gain} XP.`, 'ok');
    board(res.newType ? 'NEW TYPE' : 'CAUGHT'); buzz(res.entry.sq ? 'legendary' : res.tier); pulse('hit', res.entry.sq ? 'legendary' : res.tier);
    reveal(res); setTimeout(() => chime(res.entry.sq ? 'legendary' : res.tier), 650); postCatch(live.ac.callsign);
  } catch (e) {
    console.error(e); miss('TRY AGAIN'); say('Something went wrong with that one. Try again in a moment.', 'bad');
  } finally { setTimeout(() => { btn.disabled = false; btn.textContent = 'Catch it'; btn.removeAttribute('aria-busy'); }, 400); }
}

// The feed sometimes has no type. Ask hexdb.io, a free aircraft database, by the airframe's hex code before falling back.
async function fillType(ac) {
  if (!ac.hex) return;
  try {
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 3000);
    const r = await fetch(`https://hexdb.io/api/v1/aircraft/${encodeURIComponent(ac.hex)}`, {signal: ctl.signal}); clearTimeout(timer);
    if (!r.ok) return;
    const j = await r.json(), t = String(j.ICAOTypeCode || '').toUpperCase().trim();
    if (/^[A-Z0-9]{2,4}$/.test(t)) ac.type = t;
    if (!ac.reg && j.Registration) ac.reg = String(j.Registration).slice(0, 10);
    if (!ac.op && j.RegisteredOwners) ac.op = String(j.RegisteredOwners).slice(0, 40);
  } catch {}
}

// A photo of the exact airframe from Planespotters.net, if one exists. Never holds a catch up for long.
async function spotPhoto(ac) {
  if (!SPOT_API) return null;
  for (const path of [ac.hex && 'hex/' + encodeURIComponent(ac.hex), ac.reg && 'reg/' + encodeURIComponent(ac.reg)].filter(Boolean)) {
    try {
      const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 3500);
      const r = await fetch(`${SPOT_API}/${path}`, {signal: ctl.signal}); clearTimeout(timer);
      if (!r.ok) continue;
      const p = ((await r.json()).photos || [])[0];
      const ph = p && safeSpot({src: (p.thumbnail_large || p.thumbnail || {}).src, by: String(p.photographer || '').slice(0, 60), link: p.link});
      if (ph) return ph;
    } catch {}
  }
  return null;
}

function reveal(res) {
  const dlg = $('#reveal'), {info, tier, entry} = res, reward = C.rewardFor(info, tier);
  $('#reveal-card').innerHTML = `<div class="flip tier-${tier}"><div class="face back" aria-hidden="true"><span>DEXM</span></div><div class="face front">${cardHTML(info, tier, entry, true, res.status === 'dupe' ? ` <span class="cc-count">+${res.gain} XP</span>` : '', true)}</div></div>`;
  $('#reveal-h').textContent = res.status === 'new' ? `New card: ${Tier(tier)}` : `Duplicate: +${res.gain} XP`;
  $('#reveal-sub').textContent = res.wanted ? "That's today's wanted type. Double points!" : (res.status === 'new' ? `+${res.gain} points` : `You now have ${state.cards[info.code].count}`);
  const rw = $('#reward'); rw.hidden = !reward;
  if (reward) { rw.querySelector('a').href = reward.url; rw.querySelector('a').textContent = 'Card reward: print this model'; rw.querySelector('code').textContent = reward.code; rw.querySelector('.rl').textContent = reward.label; }
  dlg.dataset.share = C.shareText(entry, info, tier); dlg.className = 'reveal tier-' + tier;
  if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
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
  try { const s = C.validateImport(JSON.parse(await file.text())); if (!s) throw 0; state = s; save(); render(); say(`Imported ${Object.keys(s.cards).length} cards.`, 'ok'); }
  catch { say("That file doesn't look like a Callsign Catch collection.", 'bad'); }
}

const sb = $('#sound'), showSound = () => { const on = soundOn(); sb.textContent = on ? 'Sound on' : 'Sound off'; sb.setAttribute('aria-pressed', String(on)); };
sb.addEventListener('click', () => { setSound(!soundOn()); showSound(); if (soundOn()) chime('common'); }); showSound();
$('#set-all').addEventListener('click', () => { filter = 'all'; renderHangar(); });
$('#sets').addEventListener('click', e => { const b = e.target.closest('[data-set]'); if (b) { filter = filter === b.dataset.set ? 'all' : b.dataset.set; renderHangar(); } });
$('#close').addEventListener('click', () => { const d = $('#reveal'); d.classList.remove('go'); d.close ? d.close() : d.removeAttribute('open'); });
$('#share').addEventListener('click', () => share($('#reveal').dataset.share));
$('#export').addEventListener('click', exportFile);
$('#import').addEventListener('change', e => { const f = e.target.files[0]; if (f) importFile(f); e.target.value = ''; });
$('#board').hidden = !LEADERBOARD_API;
// Leaderboard: only when LEADERBOARD_API is set. The Worker checks every catch against the live feed itself.
const player = (() => { try { let p = localStorage.getItem('callsign:player'); if (!p) { p = [...crypto.getRandomValues(new Uint8Array(10))].map(b => b.toString(16).padStart(2, '0')).join(''); localStorage.setItem('callsign:player', p); } return p; } catch { return ''; } })();
const drawBoard = b => { $('#board-body').innerHTML = ['today', 'alltime'].map(k => `<div><h3>${k === 'today' ? 'Today' : 'All time'}</h3><ol>${(b[k] || []).map(e => `<li>${esc(e.nick)} <b>${esc(e.points)}</b></li>`).join('') || '<li class="muted">No catches yet.</li>'}</ol></div>`).join(''); };
async function postCatch(cs) { const nick = (localStorage.getItem('callsign:nick') || '').trim(); if (!LEADERBOARD_API || !nick) return;
  try { const r = await fetch(LEADERBOARD_API + '/catch', {method: 'POST', headers: {'Content-Type': 'text/plain'}, body: JSON.stringify({callsign: cs, nickname: nick, player})}); const j = await r.json(); if (j.today) drawBoard(j); } catch {} }
if (LEADERBOARD_API) { $('#nick').value = localStorage.getItem('callsign:nick') || ''; $('#nick').addEventListener('change', e => localStorage.setItem('callsign:nick', e.target.value.slice(0, 16))); fetch(LEADERBOARD_API + '/board').then(r => r.json()).then(drawBoard).catch(() => {}); }
const drop = C.dropFor(now(), specials);
if (drop) { $('#drop').hidden = false; $('#drop').textContent = `Free drop today: ${drop.name}`; }
render(); holo($('#hangar'));
const deep = new URLSearchParams(location.search).get('cs');
if (deep && C.parseQuery(deep)) { $('#cs').value = deep.toUpperCase().slice(0, 10); say(`Spotted overhead: ${deep.toUpperCase().slice(0, 10)}. Press Catch it to check it's flying.`, 'wait'); }
// resetGap is for the browser test only: it clears the gap between lookups (or with -1 sets it to now).
ready = true; board('READY', {instant: true});
window.CallsignCatch = {state: () => state, submit, ready: true, resetGap: n => { lastSubmit = n === -1 ? Date.now() - SUBMIT_GAP_MS - 1 : 0; recent = []; }};
