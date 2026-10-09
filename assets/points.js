/* Points, shared by every game on dexmlabs.app. One ledger in localStorage ('dexm:points'), no account.
 * Each entry is chained to the one before by a small hash, so a hand edited ledger is noticed: the entries that
 * still check out are kept and the rest are dropped, with a friendly note. It's a game, so this only stops
 * casual edits, and that's fine.
 *   DexmPoints.balance()                      current balance
 *   DexmPoints.earn(source, amount, ref)      adds points once per ref, returns {ok, reason}
 *   DexmPoints.spend(source, amount, ref)     takes points if there are enough, returns {ok, reason}
 *   DexmPoints.earnPractice(source, date)     practice award, up to PRACTICE_PER_DAY a day per game
 *   DexmPoints.on('change', fn)               called with the balance after any change, here or in another tab
 */
(function (root) {
  'use strict';
  var KEY = 'dexm:points', SALT = 'dexm-points:v1:', CAP = 200, MAX_AMOUNT = 10000;
  var EARN = {skywave: 100, lorenz: 100, lorenzHard: 250, lorenzReply: 100, practice: 20};
  var COSTS = {
    skywave: {muf: 10, absorption: 10, scope: 20},
    lorenz: {check: 20, reveal: 50, smudge: 50, qep: 40, char: 10}
  };
  var WELCOME = 150, PRACTICE_PER_DAY = 3;
  var listeners = [], memory = null, state = null, note = null;

  function fnv(str) { var h = 0x811c9dc5; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return ('0000000' + h.toString(16)).slice(-8); }
  function seed(s) { return fnv(SALT + s.carried + '|' + s.rolled.join(',')); }
  function link(prev, e) { return fnv(prev + '|' + e.t + '|' + e.kind + '|' + e.amount + '|' + e.source + '|' + e.ref); }
  function signed(e) { return e.kind === 'earn' ? e.amount : -e.amount; }
  function goodEntry(e) {
    return e && typeof e === 'object' && (e.kind === 'earn' || e.kind === 'spend') && Number.isInteger(e.amount) && e.amount > 0 && e.amount <= MAX_AMOUNT &&
      typeof e.source === 'string' && e.source.length <= 40 && typeof e.ref === 'string' && e.ref.length <= 80 && Number.isFinite(e.t);
  }
  function rehash(s) { var h = s.hc = seed(s); s.entries.forEach(function (e) { h = e.h = link(h, e); }); s.balance = total(s); return s; }
  function total(s) { return s.entries.reduce(function (b, e) { return b + signed(e); }, s.carried); }
  function fresh(reason) {
    var s = {v: 1, carried: 0, rolled: [], entries: [], balance: 0};
    s.entries.push({t: Date.now(), kind: 'earn', amount: WELCOME, source: 'welcome', ref: reason === 'reset' ? 'welcome:reset:' + Date.now() : 'welcome'});
    return rehash(s);
  }
  function readRaw() { try { return localStorage.getItem(KEY); } catch (e) { return memory; } }
  function writeRaw(s) { var str = JSON.stringify(s); memory = str; try { localStorage.setItem(KEY, str); } catch (e) {} }

  /** Checks a stored ledger. Returns {state, note}: note is null when everything checked out. */
  function verify(raw) {
    if (raw == null) return {state: fresh('new'), note: null, created: true};
    var s; try { s = JSON.parse(raw); } catch (e) { s = null; }
    if (!s || typeof s !== 'object' || !Number.isInteger(s.carried) || s.carried < 0 || !Array.isArray(s.entries) || !Array.isArray(s.rolled) || !s.rolled.every(function (r) { return typeof r === 'string'; }))
      return {state: fresh('reset'), note: "Your points didn't add up, so I've started you again with " + WELCOME + '.'};
    if (s.hc !== seed(s)) return {state: fresh('reset'), note: "Your points didn't add up, so I've started you again with " + WELCOME + '.'};
    var h = s.hc, kept = [], bal = s.carried;
    for (var i = 0; i < s.entries.length; i++) {
      var e = s.entries[i];
      if (!goodEntry(e) || e.h !== link(h, e) || bal + signed(e) < 0) break;
      h = e.h; bal += signed(e); kept.push({t: e.t, kind: e.kind, amount: e.amount, source: e.source, ref: e.ref, h: e.h});
    }
    var clean = {v: 1, carried: s.carried, rolled: s.rolled, hc: s.hc, entries: kept, balance: bal};
    if (kept.length === s.entries.length) return {state: clean, note: null, fixed: s.balance !== bal};
    return {state: clean, note: "Your points didn't add up, so I've kept the ones I could check."};
  }
  function load() {
    var v = verify(readRaw()); state = v.state;
    if (v.note) note = v.note;
    if (v.created || v.note || v.fixed) writeRaw(state);
    return state;
  }
  function current() { return state || load(); }
  function emit() { var b = current().balance; listeners.slice().forEach(function (fn) { try { fn(b); } catch (e) {} }); try { root.dispatchEvent(new root.CustomEvent('dexm:points', {detail: {balance: b}})); } catch (e) {} }
  function add(kind, source, amount, ref) {
    var s = current(), e = {t: Date.now(), kind: kind, amount: amount, source: String(source).slice(0, 40), ref: String(ref).slice(0, 80)};
    s.entries.push(e);
    if (s.entries.length > CAP) {
      var old = s.entries.splice(0, s.entries.length - CAP), cutoff = Date.now() - 3 * 864e5;
      old.forEach(function (o) { s.carried += signed(o); if (o.kind === 'earn' && o.t > cutoff) s.rolled.push(o.ref); });
      s.rolled = s.rolled.slice(-50);
    }
    rehash(s); writeRaw(s); emit();
    return e;
  }
  function has(ref) { var s = current(); ref = String(ref); return s.rolled.indexOf(ref) >= 0 || s.entries.some(function (e) { return e.ref === ref; }); }
  function amountOk(n) { return Number.isInteger(n) && n > 0 && n <= MAX_AMOUNT; }

  var Points = {
    KEY: KEY, CAP: CAP, EARN: EARN, COSTS: COSTS, WELCOME: WELCOME, PRACTICE_PER_DAY: PRACTICE_PER_DAY,
    balance: function () { return current().balance; },
    canAfford: function (n) { return current().balance >= n; },
    has: has,
    entries: function () { return current().entries.map(function (e) { return {t: e.t, kind: e.kind, amount: e.amount, source: e.source, ref: e.ref}; }); },
    carried: function () { return current().carried; },
    earn: function (source, amount, ref) {
      if (!amountOk(amount) || !ref) return {ok: false, reason: 'invalid', balance: Points.balance()};
      if (has(ref)) return {ok: false, reason: 'duplicate', balance: Points.balance()};
      add('earn', source, amount, ref); return {ok: true, balance: Points.balance()};
    },
    spend: function (source, amount, ref) {
      if (!amountOk(amount)) return {ok: false, reason: 'invalid', balance: Points.balance()};
      if (ref && has(ref)) return {ok: true, already: true, balance: Points.balance()};
      if (current().balance < amount) return {ok: false, reason: 'insufficient', balance: Points.balance()};
      add('spend', source, amount, ref || source + ':' + Date.now() + ':' + current().entries.length); return {ok: true, balance: Points.balance()};
    },
    /** A practice round: worth EARN.practice, PRACTICE_PER_DAY times a day for each game. */
    earnPractice: function (source, date) {
      for (var i = 1; i <= PRACTICE_PER_DAY; i++) { var ref = source + ':practice:' + date + ':' + i; if (!has(ref)) return Points.earn(source, EARN.practice, ref); }
      return {ok: false, reason: 'limit', balance: Points.balance()};
    },
    on: function (type, fn) { if (type !== 'change' || typeof fn !== 'function') return function () {}; listeners.push(fn); return function () { listeners = listeners.filter(function (f) { return f !== fn; }); }; },
    notice: function () { current(); return note; },
    clearNotice: function () { note = null; },
    /** Read the ledger again (another tab changed it, or a test did). */
    reload: function () { state = null; load(); emit(); return Points.balance(); },
    _verify: verify, _fnv: fnv
  };
  root.DexmPoints = Points;
  root.addEventListener && root.addEventListener('storage', function (e) { if (e.key === KEY) { state = null; load(); emit(); } });

  /* ---------- the header chip and its popover ---------- */
  var fmt = function (n) { return Number(n).toLocaleString('en-GB'); };
  function chipText() { document.querySelectorAll('[data-points-balance]').forEach(function (el) { el.textContent = fmt(Points.balance()); }); document.querySelectorAll('[data-points-chip]').forEach(function (b) { b.setAttribute('aria-label', 'Points: ' + fmt(Points.balance()) + '. How points work'); }); }
  function popHTML(page) {
    var c = COSTS;
    return '<div class="dexm-pop-head"><h2 id="dexm-pop-title">How points work</h2><button type="button" class="dexm-pop-close" aria-label="Close">&#215;</button></div>' +
      '<p class="dexm-pop-bal">You have <b data-points-balance>' + fmt(Points.balance()) + '</b> points.</p>' +
      (note ? '<p class="dexm-pop-note">' + note + '</p>' : '') +
      '<ul><li>Finish today\'s Skywave: <b>' + EARN.skywave + '</b></li><li>Decode today\'s Lorenz: <b>' + EARN.lorenz + '</b>, or <b>' + EARN.lorenzHard + '</b> in hard mode, plus <b>' + EARN.lorenzReply + '</b> for the reply</li><li>Practice rounds: <b>' + EARN.practice + '</b>, up to ' + PRACTICE_PER_DAY + ' a day in each game</li></ul>' +
      '<p>Hints in both games are paid for with points, and each button shows its price. Your game score is just how you played.</p>' +
      '<p class="dexm-pop-small">Points live in this browser. There\'s no account and nothing to buy. <a href="' + page + '">More about points</a></p>';
  }
  var uiReady = false;
  function setupUI() {
    if (uiReady) return; uiReady = true;
    var chips = document.querySelectorAll('[data-points-chip]'); if (!chips.length) return;
    chipText(); Points.on('change', chipText);
    var pop = document.createElement('div'); pop.id = 'dexm-points-pop'; pop.className = 'dexm-pop'; pop.hidden = true;
    pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-labelledby', 'dexm-pop-title');
    document.body.appendChild(pop);
    var opener = null;
    function close(back) { if (pop.hidden) return; pop.hidden = true; chips.forEach(function (b) { b.setAttribute('aria-expanded', 'false'); }); if (back && opener) opener.focus(); }
    function open(btn) {
      opener = btn; pop.innerHTML = popHTML(btn.getAttribute('data-points-page') || '/points/');
      var r = btn.getBoundingClientRect(); pop.style.top = Math.round(r.bottom + 8) + 'px';
      pop.hidden = false; btn.setAttribute('aria-expanded', 'true');
      if (note) Points.clearNotice();
      pop.querySelector('.dexm-pop-close').addEventListener('click', function () { close(true); });
      pop.querySelector('.dexm-pop-close').focus();
    }
    chips.forEach(function (b) { b.setAttribute('aria-expanded', 'false'); b.setAttribute('aria-controls', 'dexm-points-pop'); b.addEventListener('click', function () { if (pop.hidden) open(b); else close(true); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !pop.hidden) { e.stopPropagation(); close(true); } }, true);
    document.addEventListener('click', function (e) { if (!pop.hidden && !pop.contains(e.target) && !e.target.closest('[data-points-chip]')) close(false); });
    window.addEventListener('resize', function () { close(false); });
    if (note) chips.forEach(function (b) { b.classList.add('dexm-chip-note'); });
    var ledger = document.querySelector('[data-points-ledger]');
    if (ledger) { var draw = function () { var list = Points.entries().slice(-12).reverse(); ledger.innerHTML = '<p>You have <b>' + fmt(Points.balance()) + '</b> points.</p>' + (list.length ? '<table><thead><tr><th>When</th><th>What</th><th>Points</th></tr></thead><tbody>' + list.map(function (e) { return '<tr><td>' + new Date(e.t).toLocaleString('en-GB', {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'}) + '</td><td>' + label(e) + '</td><td>' + (e.kind === 'earn' ? '+' : '&minus;') + fmt(e.amount) + '</td></tr>'; }).join('') + '</tbody></table>' : ''); }; draw(); Points.on('change', draw); }
  }
  function label(e) {
    var r = e.ref;
    if (e.source === 'welcome') return 'Welcome';
    if (/^lorenz:hard:\d/.test(r)) return 'Lorenz hard mode, ' + r.slice(12);
    if (/^lorenz:daily:/.test(r)) return 'Lorenz, ' + r.slice(13);
    if (/^skywave:daily:/.test(r)) return 'Skywave, ' + r.slice(14);
    if (/:practice:/.test(r)) return (e.source === 'skywave' ? 'Skywave' : 'Lorenz') + ' practice';
    if (e.kind === 'spend') return (e.source.indexOf('skywave') === 0 ? 'Skywave' : 'Lorenz') + ' hint';
    return e.source;
  }
  if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setupUI); else setupUI(); }
})(typeof window !== 'undefined' ? window : globalThis);
