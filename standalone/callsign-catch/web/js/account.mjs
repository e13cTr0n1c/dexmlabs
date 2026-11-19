// Guest play stays in localStorage. Signing in uses the server, or a practice account when no project is configured.
import {consumeFragment} from './fragment.mjs';
import {DEMO_FEED} from '../../shared/demo-feed.mjs';
import {createPreview} from '../../shared/preview.mjs';
import {hangarFromCards} from '../../shared/engine.mjs';
import {memoryRepo} from '../../shared/repo.mjs';
import * as C from './core.mjs';

const GIFT_KEY = 'callsign:gifts';
const SESS_KEY = 'callsign:practice-session';
const DB_KEY = 'callsign:practice-db';

const cfg = () => ((globalThis.window || globalThis).CALLSIGN_CONFIG) || {};

export function shouldMock(search = '') {
  const q = new URLSearchParams(String(search || '').replace(/^\?/, ''));
  if (q.get('mock') === '1') return true;
  if (q.get('mock') === '0') return false;
  const c = cfg();
  return !String(c.supabaseUrl || '').trim() || !String(c.supabaseAnonKey || '').trim();
}

let fragmentNote = null;
if (globalThis.window && globalThis.localStorage && globalThis.location && String(globalThis.location.hash || '').startsWith('#import=')) {
  try { fragmentNote = consumeFragment(globalThis.localStorage, globalThis.location, globalThis.history); } catch { fragmentNote = null; }
}

let mockMode = true;
let session = null;
let preview = null;
let clientPromise = null;
let ctx = null;
let rows = [];
let hooks = null;

export const isSignedIn = () => !!session;
export const mocking = () => mockMode;
export const demoFeed = () => DEMO_FEED.map(a => ({...a}));

const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));

function loadDb() {
  try { return JSON.parse(localStorage.getItem(DB_KEY)) || {}; } catch { return {}; }
}
function saveDb() {
  if (preview) localStorage.setItem(DB_KEY, JSON.stringify(preview.repo.state));
}

function giftBag() {
  const gifts = [];
  const redeemed = new Set();
  const take = raw => {
    if (!raw) return;
    for (const id of raw.redeemed || []) redeemed.add(id);
    for (const e of raw.log || []) if (e && e.gift) gifts.push(e);
  };
  try { take(JSON.parse(localStorage.getItem(GIFT_KEY))); } catch { /* keep going */ }
  try { take(JSON.parse(localStorage.getItem(C.STORE_KEY))); } catch { /* guest save may be absent */ }
  const seen = new Set();
  return {
    redeemed: [...redeemed],
    gifts: gifts.filter(e => {
      const k = (e.type || '') + '|' + (e.t || '') + '|' + (e.note || '');
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    }),
  };
}

export function persistGifts(state) {
  const gifts = (state && state.log || []).filter(e => e && e.gift);
  const redeemed = Array.isArray(state && state.redeemed) ? state.redeemed : giftBag().redeemed;
  localStorage.setItem(GIFT_KEY, JSON.stringify({v: 1, redeemed, log: gifts}));
}

function applyRows() {
  const bag = giftBag();
  const s = hangarFromCards(rows, ctx, bag.gifts);
  s.redeemed = bag.redeemed;
  hooks.setState(s);
  hooks.render();
}

function setLine() {
  const line = $('#account-line');
  const out = $('#auth-out');
  const actions = $('#account-actions');
  if (!line) return;
  if (session) {
    const who = session.email ? ` as ${session.email}` : '';
    line.textContent = mockMode ? `Signed in with a practice account${who}. Cards stay in this browser until a real project is connected.` : `Signed in${who}. Catches are checked on the server.`;
    if (out) out.hidden = false;
    if (actions) actions.hidden = true;
  } else {
    line.textContent = mockMode
      ? 'Playing as a guest. Your hangar stays in this browser. The sign in buttons run a practice account, because no project is configured.'
      : 'Playing as a guest. Your hangar stays in this browser until you sign in.';
    if (out) out.hidden = true;
    if (actions) actions.hidden = false;
  }
}

function showMigrate(result) {
  const el = $('#migrate-result');
  if (!el || !result) return;
  const imported = result.imported || [];
  const bad = result.rejected || [];
  const n = imported.length;
  let lead;
  if (!result.ok) lead = result.message || 'I could not bring that hangar across.';
  else if (n && bad.length) lead = `I brought ${n} ${n === 1 ? 'card' : 'cards'} across. ${bad.length} ${bad.length === 1 ? 'was' : 'were'} left out.`;
  else if (n) lead = `I brought ${n} ${n === 1 ? 'card' : 'cards'} across. They wear a Legacy badge.`;
  else lead = 'I checked the save, and none of the cards could come across.';
  const items = bad.slice(0, 8).map(r => `<li>${esc(r.callsign || r.type || 'A card')}: ${esc(r.reason)}</li>`).join('');
  const more = bad.length > 8 ? `<p>${bad.length - 8} more were left out.</p>` : '';
  el.hidden = false;
  el.innerHTML = `<p>${esc(lead)}</p>${items ? `<ul>${items}</ul>` : ''}${more}`;
}

function guestSave() {
  try { return JSON.parse(localStorage.getItem(C.STORE_KEY)); } catch { return null; }
}

async function maybeMigrate() {
  const raw = guestSave();
  const has = raw && ((Array.isArray(raw.log) && raw.log.length) || (raw.cards && Object.keys(raw.cards).length));
  if (!session || !has) return;
  const flag = 'callsign:migrated:' + session.id;
  if (localStorage.getItem(flag) === '1') return;
  let result;
  if (mockMode) result = await preview.migrate(session.id, raw);
  else result = await callFunction('migrate', {save: raw});
  if (result && (result.ok || result.error === 'already' || result.error === 'format')) localStorage.setItem(flag, '1');
  if (mockMode) saveDb();
  if (!mockMode && result && result.ok) rows = await loadRemoteCards();
  else if (mockMode) rows = await preview.cards(session.id);
  showMigrate(result);
}

function redirectTo() {
  const base = String(cfg().baseUrl || '').trim();
  if (base) return new URL(base, location.href).href;
  return new URL('./', location.href).href;
}

function supabase() {
  if (!clientPromise) {
    clientPromise = import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm').then(({createClient}) => createClient(cfg().supabaseUrl, cfg().supabaseAnonKey, {
      auth: {flowType: 'pkce', detectSessionInUrl: true, persistSession: true},
    }));
  }
  return clientPromise;
}

async function callFunction(name, body) {
  const client = await supabase();
  const {data} = await client.auth.getSession();
  const token = data.session && data.session.access_token;
  const url = String(cfg().supabaseUrl).replace(/\/$/, '') + '/functions/v1/' + name;
  const res = await fetch(url, {
    method: 'POST',
    headers: {authorization: 'Bearer ' + token, apikey: cfg().supabaseAnonKey, 'content-type': 'application/json'},
    body: JSON.stringify(body),
  });
  const parsed = await res.json().catch(() => ({ok: false, error: 'offline', message: 'The server did not answer.'}));
  if (!parsed.message && !res.ok) parsed.message = 'The server did not accept that.';
  return parsed;
}

async function loadRemoteCards() {
  const client = await supabase();
  const {data, error} = await client.from('cards').select('id,aircraft_type,rarity,callsign,icao24,caught_at,source').order('caught_at');
  if (error) return rows;
  return data || [];
}

async function enter(next) {
  session = next;
  if (mockMode) localStorage.setItem(SESS_KEY, JSON.stringify(session));
  rows = mockMode ? await preview.cards(session.id) : await loadRemoteCards();
  await maybeMigrate();
  if (mockMode) rows = await preview.cards(session.id);
  applyRows();
  setLine();
  const box = $('#mock-link');
  if (box) box.hidden = true;
}

async function signOut() {
  session = null;
  rows = [];
  if (mockMode) localStorage.removeItem(SESS_KEY);
  else {
    try { const client = await supabase(); await client.auth.signOut(); } catch { /* still leave the account locally */ }
  }
  hooks.setState(hooks.guestLoad());
  hooks.render();
  setLine();
}

function bind() {
  const google = $('#auth-google');
  const github = $('#auth-github');
  const form = $('#auth-email');
  const out = $('#auth-out');
  if (google) google.addEventListener('click', () => startProvider('google'));
  if (github) github.addEventListener('click', () => startProvider('github'));
  if (form) form.addEventListener('submit', e => { e.preventDefault(); startEmail(); });
  if (out) out.addEventListener('click', () => signOut());
}

async function startProvider(provider) {
  if (mockMode) return enter({id: 'practice-' + provider, email: '', provider});
  const client = await supabase();
  const {error} = await client.auth.signInWithOAuth({provider, options: {redirectTo: redirectTo()}});
  if (error) hooks.say(error.message || 'The sign in service did not start.', 'bad');
}

function startEmail() {
  const input = $('#auth-email-input');
  const email = input ? input.value.trim() : '';
  if (!email || !email.includes('@') || email.startsWith('@') || email.endsWith('@')) {
    hooks.say('Type the email address you want the link sent to.', 'bad');
    return;
  }
  if (mockMode) {
    const box = $('#mock-link');
    box.hidden = false;
    box.innerHTML = `<p>Preview mode has no inbox. Finish signing in as ${esc(email)}.</p><button type="button" id="mock-finish">Finish signing in</button>`;
    $('#mock-finish').addEventListener('click', () => enter({id: 'practice-email-' + email.toLowerCase(), email, provider: 'email'}));
    return;
  }
  supabase().then(client => client.auth.signInWithOtp({email, options: {emailRedirectTo: redirectTo()}})).then(({error}) => {
    hooks.say(error ? (error.message || 'I could not send the link.') : 'Check your inbox for the sign in link.', error ? 'bad' : 'ok');
  });
}

export async function mount(next) {
  hooks = next;
  ctx = next.ctx;
  mockMode = shouldMock(location.search);
  if (fragmentNote && fragmentNote.error) hooks.say(fragmentNote.error, 'wait');
  bind();
  if (mockMode) {
    preview = createPreview({ctx, feed: DEMO_FEED, repo: memoryRepo(loadDb())});
    try { session = JSON.parse(localStorage.getItem(SESS_KEY)); } catch { session = null; }
    if (session && session.id) {
      rows = await preview.cards(session.id);
      await maybeMigrate();
      rows = await preview.cards(session.id);
      applyRows();
    }
    setLine();
    return;
  }
  const client = await supabase();
  const {data} = await client.auth.getSession();
  if (data.session) await enter({id: data.session.user.id, email: data.session.user.email || '', provider: 'account'});
  client.auth.onAuthStateChange((event, sess) => {
    if (event === 'SIGNED_OUT') { session = null; setLine(); return; }
    if (sess && (!session || session.id !== sess.user.id)) enter({id: sess.user.id, email: sess.user.email || '', provider: 'account'});
  });
  setLine();
}

export async function catchCallsign(callsign) {
  if (!session) return {ok: false, error: 'auth', message: 'Sign in again to catch a plane.'};
  if (mockMode) {
    const result = await preview.catch(session.id, callsign);
    saveDb();
    return result;
  }
  return callFunction('catch', {callsign});
}

export function remember(card) {
  rows = rows.filter(r => !(r.callsign === card.callsign && r.icao24 === card.icao24 && r.caught_at === card.caught_at));
  rows.push(card);
  applyRows();
}
