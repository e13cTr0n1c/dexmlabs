/** The decode reward: score breakdown, count-up and the plan for what animates. No DOM needed for the maths. */
import {RULES} from './game.js';
export const REWARD = Object.freeze({countMs:1000, flyMs:1200, cardDelayMs:900, pulseMs:450});
export const easeOutCubic = t => { const x = Math.min(1, Math.max(0, t)); return 1 - (1 - x) ** 3; };
export const countValue = (from, to, t) => Math.round(from + (to - from) * easeOutCubic(t));
const fmt = n => Math.round(n).toLocaleString('en-GB');
/** Same sum as game.scoreFor, split into lines for the card. */
export function scoreBreakdown(state) {
  const wrong = state.attempts.filter(a => !a.ok).length, lines = [['Decoded', fmt(RULES.base)]];
  if (wrong) lines.push([`${wrong} wrong ${wrong > 1 ? 'tries' : 'try'}`, `\u2212${fmt(wrong * RULES.wrong)}`]);
  const checks = state.hints.filter(h => h.type === 'check').length, reveal = state.hints.some(h => h.type === 'reveal');
  if (checks) lines.push([`${checks} wheel check${checks > 1 ? 's' : ''}`, `\u2212${fmt(checks * RULES.hint.check)}`]);
  if (reveal) lines.push(['Read the smudge', `\u2212${fmt(RULES.hint.reveal)}`]);
  const raw = RULES.base - wrong * RULES.wrong - checks * RULES.hint.check - (reveal ? RULES.hint.reveal : 0);
  if (raw < RULES.floor) lines.push(['Never less than', fmt(RULES.floor)]);
  return {lines, total: Math.max(RULES.floor, raw)};
}
/** What runs on a successful decode. Reduced motion: the card and score appear at once, nothing flies. */
export function rewardPlan(ok, {reducedMotion = false} = {}) { return {card: ok, fly: ok && !reducedMotion, spin: ok && !reducedMotion, countUp: ok && !reducedMotion, delay: ok && !reducedMotion ? REWARD.cardDelayMs : 0}; }
export class ScoreCounter {
  constructor(el, {format = v => `${fmt(v)} pts`, now = () => performance.now(), raf = f => requestAnimationFrame(f), caf = id => cancelAnimationFrame(id), duration = REWARD.countMs} = {}) { Object.assign(this, {el, format, now, raf, caf, duration}); this.value = null; this.frame = null; }
  render(v) { this.value = v; if (this.el) this.el.textContent = this.format(v); }
  stop() { if (this.frame !== null) this.caf(this.frame); this.frame = null; }
  show(v) { this.stop(); this.render(v); }
  animateTo(v, {from = 0, reducedMotion = false, delay = 0} = {}) {
    this.stop();
    if (reducedMotion || from === v) { this.render(v); return; }
    this.render(from); const start = this.now() + delay;
    const step = () => { const t = Math.max(0, (this.now() - start) / this.duration); this.render(countValue(from, v, t)); if (t >= 1) { this.frame = null; this.pulse(); } else this.frame = this.raf(step); };
    this.frame = this.raf(step);
  }
  pulse() { if (!this.el?.classList) return; this.el.classList.remove('score-pulse'); void this.el.offsetWidth; this.el.classList.add('score-pulse'); setTimeout(() => this.el.classList.remove('score-pulse'), REWARD.pulseMs); }
}
