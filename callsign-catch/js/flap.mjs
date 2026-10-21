// Split flap lettering, like a departures board. Each cell flips through the drum until it lands on its letter.
const DRUM = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.!?';
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const tokens = new WeakMap();
// Flip el to show text. onTick fires on each flip so a sound can follow it. Resolves when every cell has landed.
export function flapTo(el, text, {min = 0, onTick, step, instant} = {}) {
  if (!el) return Promise.resolve();
  const t = String(text || '').toUpperCase().replace(/[^A-Z0-9 .!?]/g, ' '), len = Math.max(min, t.length);
  const target = t.padEnd(len, ' ');
  let cells = [...el.querySelectorAll('.flap')];
  if (cells.length !== len) { el.innerHTML = Array.from({length: len}, () => '<span class="flap"><span> </span></span>').join(''); cells = [...el.querySelectorAll('.flap')]; }
  const my = {}; tokens.set(el, my);
  if (instant || reduced() || window.__ccFast) { cells.forEach((c, i) => { c.firstChild.textContent = target[i]; }); return Promise.resolve(); }
  const ms = step || 46;
  return Promise.all(cells.map((c, i) => new Promise(done => {
    const from = DRUM.indexOf(c.firstChild.textContent), to = DRUM.indexOf(target[i]);
    let n = target[i] === c.firstChild.textContent ? 0 : 3 + ((i * 7 + to) % 6), k = from < 0 ? 0 : from;
    const tick = () => {
      if (tokens.get(el) !== my) return done();
      if (n-- <= 0) { c.firstChild.textContent = target[i]; c.classList.remove('flip'); return done(); }
      k = (k + 1) % DRUM.length; c.firstChild.textContent = n === 0 ? target[i] : DRUM[k];
      c.classList.remove('flip'); void c.offsetWidth; c.classList.add('flip'); if (onTick && i % 2 === 0) onTick();
      setTimeout(tick, ms + (i % 3) * 6);
    };
    setTimeout(tick, i * 22);
  })));
}
