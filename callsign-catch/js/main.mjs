import {POINTS, LEADERBOARD_API, SUBMIT_GAP_MS, SUBMITS_PER_HOUR} from './config.mjs';
import * as C from './core.mjs';
import {lookup} from './api.mjs';
import {cardArt, setArtManifest} from './art.mjs';

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
let table, specials, art;
try { [table, specials, art] = await Promise.all(['types', 'specials', 'art'].map(getJSON)); }
catch (e) { loadFailed = true; say("I couldn't load the aircraft list. Refresh the page to try again.", 'bad'); throw e; }
setArtManifest(art.codes);
const idx = C.indexTypes(table);
for (const sp of specials.cards) idx.set(sp.code, {code: sp.code, name: sp.name, maker: 'DEXM Labs', tier: 'legendary', cat: 'special', fact: sp.fact || 'A special card, out for one day only.', reward: sp.reward || {}});
const load = () => { try { return C.validateImport(JSON.parse(localStorage.getItem(C.STORE_KEY))) || C.emptyState(); } catch { return C.emptyState(); } };
let state = load(), filter = 'all', lastSubmit = 0, recent = [];
const save = () => { try { localStorage.setItem(C.STORE_KEY, JSON.stringify(state)); } catch {} };
const now = () => new Date(window.__ccNow || Date.now());
const wanted = () => C.wantedFor(now(), table, specials);
const Tier = t => t[0].toUpperCase() + t.slice(1);
const fmtTime = iso => new Date(iso).toLocaleString('en-GB', {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'});

function cardHTML(info, tier, entry, owned, extra = '', eager = false) {
  const log = entry ? `<dl class="log"><div><dt>Caught</dt><dd>${esc(fmtTime(entry.t))}</dd></div><div><dt>Callsign</dt><dd>${esc(entry.cs)}</dd></div>${entry.op ? `<div><dt>Operator</dt><dd>${esc(entry.op)}</dd></div>` : ''}<div><dt>Altitude</dt><dd>${entry.alt != null ? esc(entry.alt.toLocaleString('en-GB')) + ' ft' : 'n/a'}</dd></div><div><dt>Speed</dt><dd>${entry.gs != null ? esc(entry.gs) + ' kt' : 'n/a'}</dd></div></dl>` : '';
  return `<article class="cc-card tier-${tier}${owned ? '' : ' empty'}" data-code="${esc(info.code)}">
<div class="cc-top"><span class="cc-code">${esc(info.code)}</span><span class="cc-tier">${owned ? Tier(tier) : '???'}</span></div>
<div class="cc-art">${cardArt(info, tier, owned, eager)}</div>
<h3 class="cc-name">${owned ? esc(info.name) : 'Not caught yet'}</h3>
<p class="cc-pts">${owned ? `${POINTS[tier]} pts` : esc(info.code)}${extra}</p>${owned ? log + `<p class="cc-fact">${esc(info.fact)}${info.source ? ` <a class="src" href="${esc(info.source)}" target="_blank" rel="noopener">source</a>` : ''}</p>` : ''}</article>`;
}

function renderStats() {
  const t = C.totals(state);
  $('#stat-types').textContent = t.types; $('#stat-catches').textContent = t.catches; $('#stat-points').textContent = t.points.toLocaleString('en-GB'); $('#stat-xp').textContent = t.xp;
}
function renderWanted() {
  const w = wanted(), info = C.typeInfo(w.code, idx, table), got = state.wantedHits[C.dayKey(now())];
  $('#wanted').innerHTML = `<p class="eyebrow">Wanted today, double points</p><div class="wanted-row"><div class="wanted-art">${cardArt(info, info.tier, true)}</div><div><h2>${esc(w.name)}</h2><p class="muted">${esc(info.code)} · ${Tier(info.tier)} · ${POINTS[info.tier] * 2} pts on your first one today</p>${got ? '<p class="ok">Caught. Well spotted.</p>' : ''}</div></div>`;
}
function renderHangar() {
  const set = C.SETS.find(s => s.id === filter);
  let codes;
  if (set && set.codes) codes = set.codes;
  else if (set) codes = state.log.filter(e => set.rule === 'night' ? e.night : (C.isDisplay(e.cs) || e.type === 'HAWK')).map(e => e.type);
  else codes = [...new Set([...Object.keys(state.cards), ...C.SETS.flatMap(s => s.codes || [])])];
  codes = [...new Set(codes)].sort((a, b) => (!!state.cards[b] - !!state.cards[a]) || C.TIERS.indexOf(C.typeInfo(b, idx, table).tier) - C.TIERS.indexOf(C.typeInfo(a, idx, table).tier) || a.localeCompare(b));
  $('#hangar').innerHTML = codes.map(code => { const c = state.cards[code], info = C.typeInfo(code, idx, table);
    return cardHTML(info, c ? c.tier : info.tier, c && c.last, !!c, c && c.count > 1 ? ` <span class="cc-count">×${c.count}</span>` : ''); }).join('') || '<p class="muted">Nothing here yet.</p>';
  $('#sets').innerHTML = C.SETS.map(s => { const p = C.setProgress(state, s);
    return `<button type="button" class="set${filter === s.id ? ' on' : ''}${p.done ? ' done' : ''}" data-set="${s.id}" aria-pressed="${filter === s.id}"><span>${esc(s.name)}</span><span class="bar"><i style="width:${Math.round(100 * p.got / p.goal)}%"></i></span><small>${p.got}/${p.goal}${s.desc ? ' · ' + esc(s.desc) : ''}</small></button>`; }).join('');
  $('#set-all').setAttribute('aria-pressed', filter === 'all'); $('#set-all').classList.toggle('on', filter === 'all');
  $('#logbook').innerHTML = state.log.slice(0, 12).map(e => `<li><span class="lt tier-${e.tier}">${esc(e.type)}</span> ${esc(e.cs)} <span class="muted">${esc(fmtTime(e.t))} · ${esc(e.alt.toLocaleString('en-GB'))} ft · +${e.gain || 0}</span></li>`).join('') || '<li class="muted">Your catches will be logged here.</li>';
}
function render() { renderStats(); renderWanted(); renderHangar(); }

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
  say(`Listening for ${label}...`, 'wait');
  try {
    const r = await lookup(q);
    if (r.error) return say((MSG[r.error] || MSG.offline)(label), 'bad');
    const live = C.pickLive(r.data);
    if (!live.ok) return say((MSG[live.reason] || MSG.notfound)(label), 'bad');
    const res = C.applyCatch(state, live.ac, now(), idx, table, wanted());
    if (res.status === 'today') return say(MSG.today(live.ac.callsign), 'bad');
    state = res.state; save(); render();
    say(res.status === 'new' ? `Caught! A new card: ${res.info.name}.` : `Another ${res.info.name}. +${res.gain} XP.`, 'ok');
    reveal(res); postCatch(live.ac.callsign);
  } catch (e) {
    console.error(e); say('Something went wrong with that one. Try again in a moment.', 'bad');
  } finally { setTimeout(() => { btn.disabled = false; btn.textContent = 'Catch it'; btn.removeAttribute('aria-busy'); }, 400); }
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
render();
const deep = new URLSearchParams(location.search).get('cs');
if (deep && C.parseQuery(deep)) { $('#cs').value = deep.toUpperCase().slice(0, 10); say(`Spotted overhead: ${deep.toUpperCase().slice(0, 10)}. Press Catch it to check it's flying.`, 'wait'); }
// resetGap is for the browser test only: it clears the gap between lookups (or with -1 sets it to now).
ready = true;
window.CallsignCatch = {state: () => state, submit, ready: true, resetGap: n => { lastSubmit = n === -1 ? Date.now() - SUBMIT_GAP_MS - 1 : 0; recent = []; }};
