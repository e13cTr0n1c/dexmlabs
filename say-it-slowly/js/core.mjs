/* Say It Slowly logic with no page access, so the tests can run it in Node. */
export const START = '2026-10-21';   // puzzle #1
export const MAX_TRIES = 5, HINT_AFTER = 2;
const DAY = 86400000;
/* The UK calendar date (Europe/London) for a moment, as YYYY-MM-DD. */
export function ukDate(d = new Date()) {
  const p = new Intl.DateTimeFormat('en-GB', {timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit'}).formatToParts(d);
  const g = t => p.find(x => x.type === t).value;
  return `${g('year')}-${g('month')}-${g('day')}`;
}
export function dayNumber(date) { return Math.round((Date.parse(date + 'T00:00:00Z') - Date.parse(START + 'T00:00:00Z')) / DAY); }
export function addDays(date, n) { return new Date(Date.parse(date + 'T00:00:00Z') + n * DAY).toISOString().slice(0, 10); }
/* A fixed shuffle so neighbouring days don't share pictures; same list in, same order out. */
export function order(n, seed = 7) {
  const a = [...Array(n).keys()]; let s = seed >>> 0;
  const r = () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
export function pick(list, date) {
  const n = dayNumber(date), ord = order(list.length), k = ((n % list.length) + list.length) % list.length;
  return {number: n + 1, puzzle: list[ord[k]]};
}
/* Forgiving match: case, spaces, punctuation and accents don't count. */
export function norm(s) { return String(s).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
export function isRight(p, guess) { const g = norm(guess); return !!g && p.answers.some(a => norm(a) === g); }
export function newStats() { return {played: 0, won: 0, streak: 0, best: 0, last: null, lastWin: null, dist: [0, 0, 0, 0, 0], days: {}}; }
/* Record one finished day. A win the day after the last win grows the streak; a loss or a gap starts again. */
export function record(stats, date, won, tries, hinted) {
  const s = JSON.parse(JSON.stringify(stats || newStats()));
  if (s.days[date]) return s;
  s.days[date] = {won, tries, hinted: !!hinted};
  s.played++; s.last = date;
  if (won) {
    s.won++; s.dist[tries - 1]++;
    s.streak = s.lastWin && addDays(s.lastWin, 1) === date ? s.streak + 1 : 1;
    s.lastWin = date; s.best = Math.max(s.best, s.streak);
  } else s.streak = 0;
  return s;
}
/* The streak shown today: it is still alive if the last win was today or yesterday. */
export function liveStreak(s, today) { return s && s.lastWin && (s.lastWin === today || addDays(s.lastWin, 1) === today) ? s.streak : 0; }
/* Share line: a red square per miss, green for the solve, white for tries not needed. No answer in it. */
export function shareText(number, guesses, won, hinted) {
  const sq = guesses.map((_, i) => (won && i === guesses.length - 1 ? '🟩' : '🟥'));
  while (sq.length < MAX_TRIES) sq.push('⬜');
  return `Say It Slowly #${number} ${won ? guesses.length : 'X'}/${MAX_TRIES}${hinted ? ' 💡' : ''}\n${sq.join('')}\nhttps://dexmlabs.app/say-it-slowly/`;
}
