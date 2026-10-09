/* Light and dark theme. The inline script at the top of each page sets data-theme before anything paints;
 * this one wires up the header toggle, remembers a choice in 'dexm:theme', and follows the system setting
 * until you pick one. Other scripts can listen for the 'dexm:theme' event on window. */
(function () {
  'use strict';
  var KEY = 'dexm:theme', root = document.documentElement, mq = window.matchMedia ? matchMedia('(prefers-color-scheme: light)') : null;
  var COLOURS = {dark: '#080a08', light: '#f3f2ec'};
  function stored() { try { var t = localStorage.getItem(KEY); return t === 'light' || t === 'dark' ? t : null; } catch (e) { return null; } }
  function system() { return mq && mq.matches ? 'light' : 'dark'; }
  function apply(t) {
    root.setAttribute('data-theme', t);
    var m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute('content', COLOURS[t]);
    document.querySelectorAll('[data-theme-toggle]').forEach(function (b) {
      var next = t === 'light' ? 'dark' : 'light';
      b.setAttribute('aria-label', 'Switch to ' + next + ' mode'); b.setAttribute('title', 'Switch to ' + next + ' mode');
    });
    try { window.dispatchEvent(new CustomEvent('dexm:theme', {detail: {theme: t}})); } catch (e) {}
  }
  window.DexmTheme = {get: function () { return root.getAttribute('data-theme') === 'light' ? 'light' : 'dark'; }, set: function (t) { try { localStorage.setItem(KEY, t); } catch (e) {} apply(t); }};
  var ready = false;
  function setup() {
    if (ready) return; ready = true;
    apply(stored() || system());
    document.querySelectorAll('[data-theme-toggle]').forEach(function (b) { b.addEventListener('click', function () { window.DexmTheme.set(window.DexmTheme.get() === 'light' ? 'dark' : 'light'); }); });
    if (mq) { var f = function () { if (!stored()) apply(system()); }; mq.addEventListener ? mq.addEventListener('change', f) : mq.addListener(f); }
    window.addEventListener('storage', function (e) { if (e.key === KEY) apply(stored() || system()); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup); else setup();
})();
