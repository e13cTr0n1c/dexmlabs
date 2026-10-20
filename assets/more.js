// Opens a closed section when a link points at something inside it.
const openFor = h => { if (!h || h.length < 2) return; let el = null; try { el = document.getElementById(decodeURIComponent(h.slice(1))); } catch (e) { return; } const d = el && el.closest('details'); if (d && !d.open) { d.open = true; el.scrollIntoView(); } };
addEventListener('hashchange', () => openFor(location.hash));
document.addEventListener('click', e => { const a = e.target.closest && e.target.closest('a[href^="#"]'); if (a) openFor(a.getAttribute('href')); });
openFor(location.hash);
