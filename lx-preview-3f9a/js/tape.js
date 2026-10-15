/** Paper tape on a canvas. Each frame across the tape is one character: five holes, impulse 1 at the top,
 *  with the small sprocket hole between holes 2 and 3 (two holes on one side, three on the other).
 *  Under each frame: what the teleprinter printed for it. */
import {bitsOf} from './lorenz.js';
const COL = 20, TRACK = 13, TOP = 12, TAPE_H = TRACK * 6 + 8;
const TRACKS = [0, 1, 3, 4, 5]; // track index per impulse; track 2 is the sprocket
export class Tape {
  constructor(canvas, {reducedMotion = () => false} = {}) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.reducedMotion = reducedMotion;
    this.rows = []; this.offset = 0; this.target = 0; this.frame = null; this.flying = false;
    this.resize = this.resize.bind(this); this.resize();
    if (typeof ResizeObserver === 'function') { this.ro = new ResizeObserver(this.resize); this.ro.observe(canvas); }
    if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('dexm:theme', () => this.draw());
  }
  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1), w = this.canvas.clientWidth || 600, h = this.canvas.clientHeight || 128;
    this.w = w; this.h = h; this.canvas.width = Math.round(w * dpr); this.canvas.height = Math.round(h * dpr);
    this.ctx?.setTransform(dpr, 0, 0, dpr, 0, 0); this.retarget(true); this.draw();
  }
  reset() { this.rows = []; this.offset = this.target = 0; this.flying = false; this.draw(); }
  push(row) { this.rows.push(row); this.retarget(this.reducedMotion()); this.kick(); }
  setRows(rows) { this.rows = rows.slice(); this.retarget(true); this.draw(); }
  retarget(snap) {
    const lead = Math.max(0, this.rows.length * COL - this.w * .78 + 30);
    this.target = lead; if (snap) this.offset = lead;
  }
  kick() { if (this.frame === null) this.frame = requestAnimationFrame(() => this.tick()); }
  tick() {
    this.frame = null; const d = this.target - this.offset;
    this.offset += Math.abs(d) < .5 ? d : d * .22;
    this.draw(); if (Math.abs(this.target - this.offset) > .5) this.kick();
  }
  /** The success flourish: the whole tape runs off to the left at speed, then settles back. */
  fly(ms = 1200) {
    if (this.reducedMotion()) return;
    const start = performance.now(), from = this.offset, extra = this.w * 1.2; this.flying = true;
    const step = now => {
      const t = Math.min(1, (now - start) / ms), k = t < .6 ? (t / .6) ** 2 : 1 - ((t - .6) / .4) ** 2;
      this.offset = from + extra * Math.max(0, k); this.draw();
      if (t < 1) requestAnimationFrame(step); else { this.flying = false; this.offset = from; this.draw(); }
    };
    requestAnimationFrame(step);
  }
  draw() {
    const {ctx, w, h} = this; if (!ctx) return; const c = ink();
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#ebe5cc'; ctx.fillRect(0, TOP, w, TAPE_H);
    ctx.fillStyle = '#d3cba9'; ctx.fillRect(0, TOP, w, 2); ctx.fillRect(0, TOP + TAPE_H - 2, w, 2);
    const first = Math.max(0, Math.floor((this.offset - 10) / COL)), last = Math.min(this.rows.length, Math.ceil((this.offset + w) / COL) + 1);
    ctx.font = '600 12px ui-monospace,Menlo,Consolas,monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    // sprockets run the full length, punched or not
    ctx.fillStyle = '#050705';
    const sx0 = -((this.offset % COL) + COL) + COL / 2;
    for (let x = sx0; x < w + COL; x += COL) { ctx.beginPath(); ctx.arc(x, TOP + 4 + TRACK * 2 + TRACK / 2, 2.4, 0, Math.PI * 2); ctx.fill(); }
    for (let i = first; i < last; i++) {
      const r = this.rows[i], x = i * COL - this.offset + COL / 2, bits = bitsOf(r.code), newest = i === this.rows.length - 1 && !this.flying;
      if (newest) { ctx.fillStyle = c.newest; ctx.fillRect(x - COL / 2, TOP, COL, TAPE_H); }
      ctx.fillStyle = '#050705';
      bits.forEach((b, k) => { if (b) { ctx.beginPath(); ctx.arc(x, TOP + 4 + TRACK * TRACKS[k] + TRACK / 2, 4.6, 0, Math.PI * 2); ctx.fill(); } });
      const label = r.control ? ({FIGS:'\u2191', LTRS:'\u2193', CR:'\u21b5', LF:'\u2261', NULL:'\u00b7'}[r.control] || '') : (r.print === ' ' ? '\u2423' : r.print);
      ctx.fillStyle = r.control ? c.control : (r.tone === 'bad' ? c.bad : c.letter);
      ctx.fillText(label, x, TOP + TAPE_H + 14);
    }
    // impulse numbers at the left edge
    ctx.fillStyle = c.gutter; ctx.fillRect(0, TOP, 16, TAPE_H);
    ctx.fillStyle = c.gutterInk; ctx.font = '10px ui-monospace,Menlo,Consolas,monospace';
    [1, 2, 3, 4, 5].forEach((n, k) => ctx.fillText(String(n), 8, TOP + 4 + TRACK * TRACKS[k] + TRACK / 2));
  }
  dispose() { this.ro?.disconnect(); if (this.frame !== null) cancelAnimationFrame(this.frame); }
}
/** Colours off the paper follow the page theme; the tape itself is always paper with black holes. */
const INK = {dark: {letter: '#d6ff00', bad: '#ffb4a6', control: '#a0aa9b', gutter: '#080a08cc', gutterInk: '#a0aa9b', newest: '#d6ff0055'},
  light: {letter: '#4b5e00', bad: '#a3261c', control: '#4f5747', gutter: '#fbfaf6e6', gutterInk: '#4f5747', newest: '#d6ff0099'}};
const ink = () => INK[typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'];
export const TAPE_GEOMETRY = Object.freeze({COL, TRACK, TRACKS, sprocketTrack: 2});
