// Today's Puzzle on dexmlabs.app. One puzzle per UK day from puzzle/puzzles.json (hashes only, never answers).
// Points, streak and history stay in this browser (localStorage). The solve counter and top 10 come from PUZZLE_API;
// if it is empty or fails, they stay hidden and the puzzle still works fully.
(function (root) {
  'use strict';
  var PUZZLE_API = 'https://dexm-puzzle.thearthurjones.workers.dev';
  var KEY = 'puzzle:stats', NICK = 'puzzle:nick';
  var A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  // ---- rotor machine: a port of reference.py (rotors I II III, reflector B, no plugboard, true double step) ----
  var ROTORS = {I: ['EKMFLGDQVZNTOWYHXUSPAIBRCJ', 'Q'], II: ['AJDKSIRUXBLHWTMCQGZNPYFVOE', 'E'], III: ['BDFHJLCPRTXVZNYEIWGAKMUSQO', 'V']};
  var REFLECTOR_B = 'YRUHQSLDPXNGOKMIEBFZCWVJAT';
  function idx(c) { return typeof c === 'number' ? c : A.indexOf(c.toUpperCase()); }
  function Machine(rings, start) {
    var order = ['I', 'II', 'III'];
    this.wire = order.map(function (r) { return ROTORS[r][0].split('').map(idx); });
    this.inv = this.wire.map(function (w) { var v = []; for (var k = 0; k < 26; k++) v.push(w.indexOf(k)); return v; });
    this.notch = order.map(function (r) { return idx(ROTORS[r][1]); });
    this.ring = (rings || 'AAA').split('').map(idx);
    this.pos = (start || 'AAA').split('').map(idx);
    this.refl = REFLECTOR_B.split('').map(idx);
  }
  Machine.prototype.window = function () { return this.pos.map(function (p) { return A[p]; }).join(''); };
  Machine.prototype.press = function () {
    var p2 = this.pos[2] === this.notch[2], p3 = this.pos[1] === this.notch[1], step = [false, false, true];
    if (p2) step[1] = true;
    if (p3) { step[1] = true; step[0] = true; }
    for (var i = 0; i < 3; i++) if (step[i]) this.pos[i] = (this.pos[i] + 1) % 26;
  };
  Machine.prototype.key = function (c) {
    this.press();
    var s = idx(c), i, off;
    for (i = 2; i >= 0; i--) { off = this.pos[i] - this.ring[i]; s = (((this.wire[i][(((s + off) % 26) + 26) % 26] - off) % 26) + 26) % 26; }
    s = this.refl[s];
    for (i = 0; i < 3; i++) { off = this.pos[i] - this.ring[i]; s = (((this.inv[i][(((s + off) % 26) + 26) % 26] - off) % 26) + 26) % 26; }
    return A[s];
  };
  Machine.prototype.run = function (t) { var self = this; return t.toUpperCase().split('').filter(function (c) { return A.indexOf(c) >= 0; }).map(function (c) { return self.key(c); }).join(''); };

  // ---- helpers ----
  function norm(s) { return String(s).trim().toLowerCase(); }
  function sha256(s) {
    return root.crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)).then(function (b) {
      return Array.prototype.map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
    });
  }
  function ukDate(now) {
    var p = new Intl.DateTimeFormat('en-GB', {timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit'}).formatToParts(now || new Date());
    var g = function (t) { return p.filter(function (x) { return x.type === t; })[0].value; };
    return g('year') + '-' + g('month') + '-' + g('day');
  }
  function prevDay(d) { var t = new Date(d + 'T12:00:00Z'); t.setUTCDate(t.getUTCDate() - 1); return t.toISOString().slice(0, 10); }
  function load() { try { var s = JSON.parse(localStorage.getItem(KEY)); if (s && typeof s === 'object') { s.history = s.history || {}; return s; } } catch (e) {} return {points: 0, streak: 0, best: 0, last: '', history: {}}; }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
  function pick(list, d) { for (var i = 0; i < list.length; i++) if (list[i].date === d) return list[i]; return null; }
  var ICON = {cipher: 'ROTOR CIPHER', morse: 'MORSE RIDDLE', aviation: 'AVIATION', physics: 'PHYSICS AND SPACE'};
  function score(tries) { return Math.max(10, 50 - 10 * (tries - 1)); }
  function shareText(p, h) {
    var squares = ''; for (var i = 1; i < h.tries; i++) squares += '\u2B1B'; squares += '\uD83D\uDFE9';
    var n = 'DEXM Puzzle ' + p.date.slice(8, 10) + '/' + p.date.slice(5, 7) + ' (' + p.title + ')';
    return n + '\n' + squares + ' ' + h.tries + (h.tries === 1 ? ' try' : ' tries') + (h.hint ? ', with a hint' : '') + '\n\uD83D\uDD25 streak ' + h.streak + '\nhttps://dexmlabs.app/puzzle/';
  }
  function api(path, opts) {
    if (!PUZZLE_API) return Promise.reject(new Error('offline'));
    var ctl = root.AbortController ? new AbortController() : null, t = setTimeout(function () { if (ctl) ctl.abort(); }, 6000);
    var o = opts || {}; if (ctl) o.signal = ctl.signal;
    return fetch(PUZZLE_API + path, o).then(function (r) { clearTimeout(t); return r.json().then(function (j) { if (!r.ok && !('ok' in j)) throw new Error('http ' + r.status); return j; }); });
  }
  var Puzzle = {Machine: Machine, sha256: sha256, norm: norm, ukDate: ukDate, shareText: shareText, api: function () { return PUZZLE_API; }};
  root.DexmPuzzle = Puzzle;
  if (typeof module !== 'undefined') module.exports = Puzzle;
  if (!root.document) return;

  function $(s, el) { return (el || document).querySelector(s); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }
  function getList(src) { return fetch(src, {cache: 'no-cache'}).then(function (r) { return r.json(); }); }
  function today() { var q = /[?&]d=(\d{4}-\d{2}-\d{2})/.exec(location.search); return q ? q[1] : ukDate(); }

  // ---- homepage card ----
  function card(el) {
    getList(el.getAttribute('data-src')).then(function (list) {
      var d = today(), p = pick(list, d), s = load();
      if (!p) { $('[data-pz-type]', el).textContent = 'STARTS 21 OCTOBER'; return; }
      $('[data-pz-type]', el).textContent = ICON[p.type] || p.type.toUpperCase();
      $('[data-pz-line]', el).textContent = p.type === 'cipher' ? 'A word typed on my three rotor machine. Decode it.' : p.type === 'morse' ? 'A riddle sent in Morse. Read it and answer.' : p.prompt;
      var h = s.history[d];
      if (h && h.ok) $('[data-pz-go]', el).textContent = 'Solved. See your result';
      if (s.streak && (s.last === d || s.last === prevDay(d))) $('[data-pz-streak]', el).textContent = 'Streak ' + s.streak;
    }).catch(function () {});
  }

  // ---- puzzle page ----
  function page(el) {
    var startT = Date.now();
    getList(el.getAttribute('data-src')).then(function (list) {
      var d = today(), p = pick(list, d), s = load();
      if (!p) { $('[data-pz-body]', el).innerHTML = '<p>My first puzzle goes up on 21 October. Come back then.</p>'; return; }
      var h = s.history[d] || {tries: 0, ok: false, hint: false};
      $('[data-pz-kind]', el).textContent = ICON[p.type] || '';
      $('[data-pz-date]', el).textContent = new Date(d + 'T12:00:00Z').toLocaleDateString('en-GB', {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'});
      var body = '<p class="pz-q">' + esc(p.prompt) + '</p>';
      if (p.type === 'cipher') body += '<p class="pz-code" aria-label="Cipher text">' + esc(p.cipher.replace(/(.{5})/g, '$1 ').trim()) + '</p>' +
        '<details class="pz-tool"><summary>Use my rotor machine</summary><p>Set to rotors I II III, rings ' + esc(p.rings) + ', start ' + esc(p.start) + '. Type letters and read the lamps.</p>' +
        '<label for="pz-m-in">Letters in</label><input id="pz-m-in" autocomplete="off" spellcheck="false" maxlength="40"><p class="pz-m-out" aria-live="polite">Lamps: <b data-pz-lamps></b> Window: <b data-pz-win>' + esc(p.start) + '</b></p></details>';
      if (p.type === 'morse') body += '<p class="pz-code pz-morse" aria-label="Morse code">' + esc(p.morse) + '</p>';
      $('[data-pz-body]', el).innerHTML = body;
      var mi = $('#pz-m-in', el);
      if (mi) mi.addEventListener('input', function () { var m = new Machine(p.rings, p.start); $('[data-pz-lamps]', el).textContent = m.run(mi.value); $('[data-pz-win]', el).textContent = m.window(); });
      var form = $('[data-pz-form]', el), input = $('#pz-answer', el), msg = $('[data-pz-msg]', el), hintB = $('[data-pz-hint]', el);
      hintB.addEventListener('click', function () { $('[data-pz-hinttext]', el).textContent = p.hint; $('[data-pz-hinttext]', el).hidden = false; hintB.hidden = true; if (!h.ok) { h.hint = true; s.history[d] = h; save(s); } });
      if (h.hint) { $('[data-pz-hinttext]', el).textContent = p.hint; $('[data-pz-hinttext]', el).hidden = false; hintB.hidden = true; }
      function done(fresh) {
        form.hidden = true; hintB.hidden = true;
        var res = $('[data-pz-result]', el); res.hidden = false;
        $('[data-pz-share]', el).textContent = shareText(p, h);
        $('[data-pz-stats]', el).textContent = 'Points ' + s.points + ' / Streak ' + s.streak + ' / Best streak ' + s.best + ' / Solved ' + Object.keys(s.history).filter(function (k) { return s.history[k].ok; }).length;
        if (p.type === 'cipher') { var up = $('[data-pz-upsell]', el); up.hidden = false; $('a', up).href = el.getAttribute('data-cipher-set'); }
        $('[data-pz-nickrow]', el).hidden = !PUZZLE_API || !fresh;
      }
      $('[data-pz-copy]', el).addEventListener('click', function () {
        var t = $('[data-pz-share]', el).textContent, b = this;
        (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { b.textContent = 'Copied'; }, function () { b.textContent = 'Select the text above to copy'; });
      });
      if (h.ok) done(false);
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var v = norm(input.value); if (!v) return;
        sha256(v).then(function (got) {
          h.tries++;
          if (got === p.hash) {
            h.ok = true; h.ms = Math.max(1000, Date.now() - startT); h.hash = got;
            s.streak = s.last === prevDay(d) ? s.streak + 1 : 1; s.best = Math.max(s.best || 0, s.streak); s.last = d;
            h.points = score(h.tries) - (h.hint ? 10 : 0); s.points += h.points; h.streak = s.streak;
            s.history[d] = h; save(s); msg.textContent = 'Correct. Plus ' + h.points + ' points.'; done(true);
          } else { s.history[d] = h; save(s); msg.textContent = 'Not that. Try ' + (h.tries + 1) + '.'; input.select(); }
        });
      });
      var nf = $('[data-pz-nickform]', el);
      try { $('#pz-nick', el).value = localStorage.getItem(NICK) || ''; } catch (e) {}
      nf.addEventListener('submit', function (e) {
        e.preventDefault(); var nick = $('#pz-nick', el).value.trim(); try { localStorage.setItem(NICK, nick); } catch (x) {}
        api('/api/solve', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({d: d, puzzleId: p.id, answerHash: h.hash, nick: nick, ms: h.ms})})
          .then(function (j) { nf.querySelector('[data-pz-sent]').textContent = j.ok ? 'You are on the board.' : j.error === 'already solved today' ? 'This connection already sent a time today.' : 'The board did not take it.'; if (j.ok) board(j); })
          .catch(function () { nf.querySelector('[data-pz-sent]').textContent = 'The board is out of reach right now.'; });
      });
      function board(j) {
        var box = $('[data-pz-board]', el);
        if (!j || typeof j.solved !== 'number') return;
        box.hidden = false;
        $('[data-pz-count]', el).textContent = j.solved === 1 ? '1 person has solved today\'s puzzle.' : j.solved + ' people have solved today\'s puzzle.';
        $('[data-pz-top]', el).innerHTML = (j.top || []).map(function (r) { return '<li><span>' + esc(r.nick) + '</span><span>' + (r.ms / 1000).toFixed(1) + ' s</span></li>'; }).join('') || '<li>No times yet. Be the first.</li>';
      }
      api('/api/today?d=' + d).then(board).catch(function () {});
    }).catch(function () { $('[data-pz-body]', el).innerHTML = '<p>The puzzle did not load. Try a refresh.</p>'; });
  }
  function boot() { var c = document.querySelector('[data-puzzle-card]'), pg = document.querySelector('[data-puzzle-page]'); if (c) card(c); if (pg) page(pg); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})(typeof window !== 'undefined' ? window : globalThis);
