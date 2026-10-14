/* The blue "support me" button, the same on every page: once above the footer, and on each game's finish screen.
 * One source for the markup and the finish screen list; the look lives in dexm-ui.css (.dexm-support). */
(function () {
  'use strict';
  var URL = 'https://buymeacoffee.com/arthurdeusexmachina';
  // finish screens, by game folder
  var END = {'rocket-launch-game': '#result', 'apollo-lunar-landing-game': '#result', 'chernobyl-reactor-simulator': '#result', 'enigma-machine': '#result', skywave: '.results-card', lorenz: '#decoded-card', tolerance: '#result', orbit: '#result-overlay .overlay-card', vector: '#result-overlay .overlay-card', forge: '#result'}, AFTER = {forge: 1};
  // full screen games keep the page button on the title screen, where it can be seen
  var TITLE = {lorenz: '#screen-title .title-links', skywave: '#screen-title .hero-facts'}; // forge rewrites #result, so its button sits just after it
  function slot(kind) {
    var d = document.createElement('div'); d.className = 'dexm-support-slot dexm-support-' + kind;
    d.innerHTML = '<a class="dexm-support" href="' + URL + '" target="_blank" rel="noopener"><span class="dexm-support-label">Support me: buy me a coffee</span><span class="dexm-support-sub">It keeps the games free.</span></a>';
    return d;
  }
  function start() {
    var game = (location.pathname.match(/^\/([a-z-]+)\//) || [])[1], f = document.querySelector('footer'), m = document.querySelector('main'), t = TITLE[game] && document.querySelector(TITLE[game]);
    if (!document.querySelector('.dexm-support-site')) { if (t) t.parentNode.insertBefore(slot('site'), t); else if (f) f.parentNode.insertBefore(slot('site'), f); else if (m) m.appendChild(slot('site')); }
    var sel = END[game];
    if (!sel) return;
    var fill = function () { var els = document.querySelectorAll(sel); for (var i = 0; i < els.length; i++) { var e = els[i]; if (AFTER[game]) { var n = e.nextElementSibling; if (!n || !n.classList.contains('dexm-support-end')) e.insertAdjacentElement('afterend', slot('end')); } else if (!e.querySelector('.dexm-support-end')) e.appendChild(slot('end')); } };
    fill(); new MutationObserver(fill).observe(document.body, {childList: true, subtree: true});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
