// Pure rules for Scale It: the UK date, the day's five rounds, scoring, the streak and the share card.
// No DOM, so the tests run in Node.
import { LAUNCH, DAYS, ITEMS } from './bank.mjs';

export const TZ = 'Europe/London';
export const MAX_ROUND = 1000;
export const ROUNDS = 5;

const fmt = new Intl.DateTimeFormat('en-CA', {timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit'});
const parts = d => Object.fromEntries(fmt.formatToParts(d).filter(p => p.type !== 'literal').map(p => [p.type, +p.value]));

export function ukDate(now = new Date()) {
  const p = parts(now);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}
const dayIndex = s => {
  const [y, m, d] = s.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 864e5);
};
export const addDays = (s, n) => new Date((dayIndex(s) + n) * 864e5).toISOString().slice(0, 10);
export const puzzleNumber = iso => dayIndex(iso) - dayIndex(LAUNCH) + 1;

function offsetAt(ms) {
  const p = new Intl.DateTimeFormat('en-GB', {timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric'}).formatToParts(new Date(ms)).reduce((o, x) => (o[x.type] = +x.value, o), {});
  return Math.round((Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ms / 1000) * 1000) / 6e4);
}
export function nextMidnight(now = new Date()) {
  const [y, m, d] = addDays(ukDate(now), 1).split('-').map(Number);
  const guess = Date.UTC(y, m - 1, d);
  let t = guess - offsetAt(guess) * 6e4;
  t = guess - offsetAt(t) * 6e4;
  return t;
}
export function countdown(now = new Date()) {
  const s = Math.max(0, Math.ceil((nextMidnight(now) - now.getTime()) / 1000));
  return `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function item(id) {
  const found = ITEMS[id];
  if (!found) throw new Error('unknown item ' + id);
  return found;
}
export function metricOf(id, key) {
  const m = item(id).metrics[key];
  if (!m || !(m.value > 0) || typeof m.source !== 'string') throw new Error('bad metric ' + id + ' ' + key);
  return m;
}

const SIZE_KEYS = new Set(['length', 'span', 'height', 'now', 'pedestal', 'aerial']);

export function viewFor(id, metric) {
  if (metric === 'span') return 'front';
  if (metric === 'length') return 'side';
  if (SIZE_KEYS.has(metric)) return 'stand';
  return item(id).body === 'height' ? 'stand' : 'side';
}
export function bodyMetres(id, metric) {
  if (SIZE_KEYS.has(metric)) return metricOf(id, metric).value;
  const body = item(id).body;
  return metricOf(id, body).value;
}

export function truthOf(round) {
  if (round.type === 'bigger') {
    const va = metricOf(round.a, round.metric).value;
    const vb = metricOf(round.b, round.metric).value;
    return {winner: va > vb ? round.a : round.b, values: {[round.a]: va, [round.b]: vb}};
  }
  if (round.type === 'order') {
    const values = Object.fromEntries(round.items.map(id => [id, metricOf(id, round.metric).value]));
    const order = [...round.items].sort((a, b) => values[a] - values[b] || a.localeCompare(b));
    return {order, values};
  }
  if (round.type === 'slider') {
    return {value: metricOf(round.item, round.metric).value};
  }
  const subject = metricOf(round.subject, round.metric).value;
  const unit = metricOf(round.unit, round.metric).value;
  return {value: subject / unit, subject, unit};
}

export function scoreSlider(guess, truth) {
  if (!(guess > 0) || !(truth > 0) || !Number.isFinite(guess)) return 0;
  const pct = Math.abs(guess - truth) / truth;
  if (pct <= 0.02) return 1000;
  if (pct >= 0.5) return 0;
  return Math.round(1000 * (1 - (pct - 0.02) / 0.48));
}

export function scoreRound(round, answer) {
  const truth = truthOf(round);
  if (round.type === 'bigger') {
    const correct = answer === truth.winner;
    return {score: correct ? 1000 : 0, truth, correct};
  }
  if (round.type === 'order') {
    const guess = answer || [];
    let placed = 0;
    for (let i = 0; i < truth.order.length; i++) if (guess[i] === truth.order[i]) placed++;
    const score = placed === 3 ? 1000 : placed === 1 ? 600 : 200;
    return {score, truth, placed, correct: placed === 3};
  }
  const score = scoreSlider(+answer, truth.value);
  return {score, truth, correct: score === 1000};
}

export function square(score) {
  const f = score / MAX_ROUND;
  return f >= 0.8 ? '🟩' : f >= 0.5 ? '🟨' : f > 0 ? '🟧' : '🟥';
}
export function shareText({number, scores}) {
  const total = scores.reduce((a, b) => a + b, 0);
  return `Scale It #${number}\n${scores.map(square).join('')}\n${total.toLocaleString('en-GB')}\ndexmlabs.app/scale-it/`;
}

export function puzzleFor(iso) {
  const number = puzzleNumber(iso);
  if (number < 1) return {status: 'before', number, date: iso, rounds: []};
  if (number > DAYS.length) return {status: 'unwritten', number, date: iso, rounds: []};
  return {status: 'ok', number, date: iso, rounds: DAYS[number - 1]};
}

export function streak(played, today) {
  const start = played[today] ? today : addDays(today, -1);
  if (!played[start]) return 0;
  let n = 0;
  for (let d = start; played[d]; d = addDays(d, -1)) n++;
  return n;
}
export function summarise(played, today) {
  const scores = Object.values(played).map(r => r.score).filter(s => Number.isFinite(s));
  const playedN = scores.length;
  const avg = playedN ? Math.round(scores.reduce((a, b) => a + b, 0) / playedN) : 0;
  const best = playedN ? Math.max(...scores) : 0;
  return {played: playedN, avg, best, streak: streak(played, today)};
}

export function formatMeasure(value, unit) {
  if (!Number.isFinite(value)) return '';
  const abs = Math.abs(value);
  const dp = unit === 'count' ? 2 : abs >= 1000 ? 0 : abs >= 100 ? 1 : 2;
  const min = Number.isInteger(value) || Math.abs(value - Math.round(value)) < 1e-6 ? 0 : Math.min(dp, 2);
  return value.toLocaleString('en-GB', {maximumFractionDigits: dp, minimumFractionDigits: min});
}

export { LAUNCH, DAYS, ITEMS };
