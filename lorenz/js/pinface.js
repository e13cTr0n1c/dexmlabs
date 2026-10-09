/** Setting pins face on: one wheel drawn flat, with the cam numbers round the edge and the reading point at the
 *  top. You turn it by dragging, with the Turn buttons or the arrow keys, and raise or lower the pin at the top.
 *  The drawing is redrawn at each step, so nothing animates and reduced motion needs nothing extra. */
import {WHEELS, WHEEL} from './lorenz.js';

export const wrap = (n, size) => ((n % size) + size) % size;
/** Steps turned by a drag of `deg` degrees (clockwise positive) on a wheel of `size` cams. */
export const dragSteps = (deg, size) => Math.round(deg / (360 / size));
/** Where cam i sits, in degrees clockwise from the top, when cam `pos` is at the reading point. */
export const camAngle = (i, pos, size) => wrap(i - pos, size) * 360 / size;
const ord = id => WHEELS.findIndex(w => w.id === id);
/** How many pins show either side of the middle in a strip `width` pixels wide, with 44 pixel pins: 4 when the
 *  width isn't known yet, never fewer than 2 or more than 5. */
export const stripReach = width => width > 0 ? Math.max(2, Math.min(5, Math.floor((width / 44 - 1) / 2))) : 4;
export const nextWheel = (id, dir) => WHEELS[wrap(ord(id) + dir, WHEELS.length)].id;

/** The SVG for one wheel: every cam (raised ones stand out), its number outside, the one at the top marked. */
export function faceSVG(bits, pos) {
  const size = bits.length, C = 160, R = 112, out = [];
  out.push(`<circle class="face-disc" cx="${C}" cy="${C}" r="${R - 10}"/><circle class="face-hub" cx="${C}" cy="${C}" r="16"/>`);
  for (let i = 0; i < size; i++) {
    const a = camAngle(i, pos, size) * Math.PI / 180, up = bits[i] === 1, sin = Math.sin(a), cos = Math.cos(a);
    const r1 = R - 12, r2 = up ? R + 10 : R - 2, nr = R + 26, cur = i === pos;
    out.push(`<line class="cam${up ? ' up' : ''}${cur ? ' cur' : ''}" data-cam="${i}" x1="${(C + sin * r1).toFixed(1)}" y1="${(C - cos * r1).toFixed(1)}" x2="${(C + sin * r2).toFixed(1)}" y2="${(C - cos * r2).toFixed(1)}"/>`);
    out.push(`<text class="cam-n${cur ? ' cur' : ''}" x="${(C + sin * nr).toFixed(1)}" y="${(C - cos * nr + 3).toFixed(1)}">${i + 1}</text>`);
  }
  out.push(`<path class="face-pointer" d="M${C - 7} 6 L${C + 7} 6 L${C} 18 Z"/>`);
  return `<svg class="face-svg" viewBox="0 0 320 320" aria-hidden="true" focusable="false">${out.join('')}</svg>`;
}

/** The face on view inside `root`. `get()` returns {grid, locked}; `toggle(id, i)` flips a pin; `back()` closes. */
export function createPinFace(root, {get, toggle, back, onWheel = () => {}, reducedMotion = () => false}) {
  let id = 'chi1', pos = 0, drag = null;
  root.innerHTML = `<div class="face-top"><p class="face-name" id="face-name" aria-live="polite"></p><div class="face-extra"></div><button type="button" class="secondary face-back" data-face="back">Back to the machine</button></div>
<p class="face-caption" id="strip-caption">Pattern sheet</p>
<div class="face-strip" role="group" aria-describedby="strip-caption" aria-label="The rim unrolled: the pin at the top in the middle, with its neighbours either side"><span class="strip-pointer" aria-hidden="true"></span><div class="strip-track"></div></div>
<p class="face-caption">Your pins</p>
<div class="face-wheel" tabindex="0" role="group" aria-roledescription="wheel" aria-describedby="face-help"></div>
<p class="sr-only" id="face-help">Left and right arrow keys turn the wheel, Space or Enter raises or lowers the pin at the top, Escape goes back to the machine.</p>
<div class="face-controls"><button type="button" class="secondary" data-face="prev-wheel">Previous wheel</button><button type="button" class="secondary" data-face="step-back">Step back</button><button type="button" class="primary face-pin" data-face="pin" aria-pressed="false"></button><button type="button" class="secondary" data-face="step-forward">Step forward</button><button type="button" class="secondary" data-face="next-wheel">Next wheel</button></div>`;
  const strip = root.querySelector('.face-strip'), track = root.querySelector('.strip-track'), wheel = root.querySelector('.face-wheel'), pinBtn = root.querySelector('[data-face=pin]');
  /** The rim unrolled into a straight window: the pin at the top sits in the middle under the pointer, with a few
   *  pins either side that wrap past the last pin back to pin 1. One extra pin each side, out of sight, lets it slide. */
  let shownPos = null, shownWheel = null;
  function drawStrip(bits, locked, sheet) {
    const size = bits.length, k = stripReach(root.clientWidth - 20), slots = [];
    for (let o = -k - 1; o <= k + 1; o++) slots.push(wrap(pos + o, size));
    strip.style.setProperty('--reach', String(k));
    track.innerHTML = slots.map((i, n) => {
      // the strip shows the sheet's pin; the button's pressed state is yours, and only the pin at the top says if they differ
      const edge = n === 0 || n === slots.length - 1, up = sheet[i] === 1, mine = bits[i] === 1, cur = n === k + 1, differs = cur && up !== mine;
      return `<button type="button" class="strip-pin${up ? ' up' : ''}${cur ? ' cur' : ''}${differs ? ' differs' : ''}" data-strip="${i}" aria-pressed="${mine}" aria-label="Pin ${i + 1}, sheet ${up ? 'raised' : 'lowered'}${differs ? ', yours differs' : ''}"${cur ? ' aria-current="true"' : ''}${edge ? ' tabindex="-1" aria-hidden="true"' : ''}${locked ? ' disabled' : ''}><span class="strip-n" aria-hidden="true">${i + 1}</span><span class="strip-line" aria-hidden="true"></span></button>`;
    }).join('');
    // slide from where it was: a step or a few, the short way round; instant under reduced motion
    let step = shownWheel === id && shownPos !== null ? wrap(pos - shownPos, size) : 0; if (step > size / 2) step -= size;
    shownPos = pos; shownWheel = id;
    track.style.transition = 'none'; track.style.transform = '';
    if (!step || Math.abs(step) > k || reducedMotion()) return;
    const w = track.firstElementChild?.offsetWidth || 0; if (!w) return;
    track.style.transform = `translateX(${step * w}px)`; void track.offsetWidth;
    track.style.transition = 'transform .18s ease-out'; track.style.transform = '';
  }
  function draw() {
    const {grid, locked, sheet} = get(), bits = grid[id], w = WHEEL[id], up = bits[pos] === 1;
    drawStrip(bits, locked, sheet?.[id] || bits);
    wheel.innerHTML = faceSVG(bits, pos); wheel.dataset.wheel = id; wheel.dataset.pos = String(pos);
    wheel.setAttribute('aria-label', `${w.label}, pin ${pos + 1} of ${w.size} at the top, ${up ? 'raised' : 'lowered'}`);
    root.querySelector('#face-name').textContent = `${w.label}: pin ${pos + 1} of ${w.size}, ${bits.filter(Boolean).length} raised`;
    pinBtn.textContent = `${up ? 'Lower' : 'Raise'} pin ${pos + 1}`; pinBtn.setAttribute('aria-pressed', String(up)); pinBtn.disabled = Boolean(locked);
  }
  const turn = n => { pos = wrap(pos + n, WHEEL[id].size); draw(); };
  const flip = () => { if (get().locked) return; toggle(id, pos); draw(); };
  const setWheel = w => { id = w; pos = 0; onWheel(id); draw(); };
  root.addEventListener('click', e => {
    const b = e.target.closest('[data-face]'); if (b) {
      const a = b.dataset.face;
      if (a === 'back') back(); else if (a === 'pin') flip(); else if (a === 'step-forward') turn(1); else if (a === 'step-back') turn(-1);
      else setWheel(nextWheel(id, a === 'next-wheel' ? 1 : -1));
      return;
    }
    const sp = e.target.closest('[data-strip]'); if (sp) { pos = Number(sp.dataset.strip); flip(); return; }
    const cam = e.target.closest('[data-cam]'); if (cam && !drag?.moved) { pos = Number(cam.dataset.cam); flip(); }
  });
  wheel.addEventListener('keydown', e => {
    const k = e.key;
    if (k === 'ArrowRight' || k === 'ArrowDown') { e.preventDefault(); turn(1); }
    else if (k === 'ArrowLeft' || k === 'ArrowUp') { e.preventDefault(); turn(-1); }
    else if (k === ' ' || k === 'Enter') { e.preventDefault(); flip(); }
    else if (k === 'Escape') { e.preventDefault(); back(); }
  });
  // Drag round the centre to turn it: dragging clockwise brings the earlier cams up to the top.
  const angleAt = e => { const r = wheel.getBoundingClientRect(); return Math.atan2(e.clientX - (r.left + r.width / 2), -(e.clientY - (r.top + r.height / 2))) * 180 / Math.PI; };
  wheel.addEventListener('pointerdown', e => { drag = {a: angleAt(e), pos, moved: false}; wheel.setPointerCapture?.(e.pointerId); });
  wheel.addEventListener('pointermove', e => {
    if (!drag || !e.buttons) return; let d = angleAt(e) - drag.a; if (d > 180) d -= 360; if (d < -180) d += 360;
    const n = -dragSteps(d, WHEEL[id].size); if (n) drag.moved = true;
    const p = wrap(drag.pos + n, WHEEL[id].size); if (p !== pos) { pos = p; draw(); }
  });
  wheel.addEventListener('pointerup', () => { setTimeout(() => { drag = null; }, 0); });
  return {
    open(w = id) { id = w; pos = 0; root.hidden = false; draw(); wheel.focus({preventScroll: true}); onWheel(id); },
    close() { root.hidden = true; },
    draw, turn, flip,
    get wheel() { return id; }, get pos() { return pos; }
  };
}
