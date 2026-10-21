import {PUZZLES} from './puzzles.mjs';
import {ART} from './art.mjs';
import {ukDate, pick, isRight, record, liveStreak, newStats, shareText, MAX_TRIES, HINT_AFTER} from './core.mjs';
const KEY = 'sayitslowly:stats', RKEY = 'sayitslowly:round';
const $ = s => document.querySelector(s);
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const today = ukDate(), {number, puzzle} = pick(PUZZLES, today);
let stats = load(KEY, newStats());
let round = load(RKEY, null);
if (!round || round.date !== today) round = {date: today, guesses: [], done: false, won: false};
$('#sis-day').textContent = `#${number}`;
const row = $('#sis-pics');
puzzle.pics.forEach((p, i) => {
  if (i) { const plus = document.createElement('span'); plus.className = 'sis-plus'; plus.setAttribute('aria-hidden', 'true'); plus.textContent = '+'; row.append(plus); }
  const c = document.createElement('span'); c.className = 'sis-pic';
  if (p.svg) c.innerHTML = ART[p.svg]; else { c.textContent = p.e; c.setAttribute('role', 'img'); c.setAttribute('aria-label', p.say); }
  row.append(c);
});
const form = $('#sis-form'), input = $('#sis-guess'), msg = $('#sis-msg');
function misses() { return round.guesses.length - (round.won ? 1 : 0); }
function render() {
  $('#sis-tries').textContent = round.done ? '' : `Try ${round.guesses.length + 1} of ${MAX_TRIES}`;
  $('#sis-past').textContent = round.guesses.filter((g, i) => !(round.won && i === round.guesses.length - 1)).map(g => `✗ ${g}`).join('   ');
  const showHint = misses() >= HINT_AFTER || round.done;
  $('#sis-hint').hidden = !showHint; $('#sis-hint').textContent = `Hint: ${puzzle.hint}`;
  form.hidden = round.done;
  if (round.done) end();
}
function end() {
  const say = puzzle.pics.map(p => p.say).join(' + ');
  $('#sis-end').hidden = false;
  $('#sis-verdict').textContent = round.won ? (round.guesses.length === 1 ? 'First go. Lovely.' : `Got it in ${round.guesses.length}.`) : 'Not this time.';
  $('#sis-answer').textContent = `${puzzle.answers[0]}: ${say}`;
  const hinted = misses() >= HINT_AFTER;
  $('#sis-share').textContent = shareText(number, round.guesses, round.won, hinted);
  const st = liveStreak(stats, today), pct = stats.played ? Math.round(100 * stats.won / stats.played) : 0;
  $('#sis-stats').innerHTML = [['Played', stats.played], ['Solved', pct + '%'], ['Streak', st], ['Best', stats.best]].map(([k, v]) => `<div><b>${v}</b><span>${k}</span></div>`).join('');
  const max = Math.max(1, ...stats.dist);
  $('#sis-dist').innerHTML = stats.dist.map((n, i) => `<li><span>${i + 1}</span><i style="width:${8 + 92 * n / max}%">${n}</i></li>`).join('');
  if (!navigator.share) $('#sis-webshare').hidden = true;
}
form.addEventListener('submit', e => {
  e.preventDefault();
  const g = input.value.trim(); if (!g || round.done) return;
  if (round.guesses.some(x => x.toLowerCase() === g.toLowerCase())) { msg.textContent = 'You tried that one already.'; return; }
  round.guesses.push(g); input.value = '';
  if (isRight(puzzle, g)) { round.won = round.done = true; msg.textContent = 'Yes!'; }
  else if (round.guesses.length >= MAX_TRIES) { round.done = true; msg.textContent = ''; }
  else msg.textContent = misses() === HINT_AFTER ? 'Not quite. Here is a hint.' : 'Not quite. Say the pictures again, slowly.';
  if (round.done) { stats = record(stats, today, round.won, round.guesses.length, misses() >= HINT_AFTER); save(KEY, stats); }
  save(RKEY, round); render();
  if (round.done) $('#sis-end').scrollIntoView({behavior: 'smooth', block: 'start'});
});
$('#sis-copy').addEventListener('click', async () => {
  const t = $('#sis-share').textContent;
  try { await navigator.clipboard.writeText(t); $('#sis-copied').textContent = 'Copied.'; }
  catch (e) { const r = document.createRange(); r.selectNodeContents($('#sis-share')); getSelection().removeAllRanges(); getSelection().addRange(r); $('#sis-copied').textContent = 'Selected. Copy it from here.'; }
});
$('#sis-webshare').addEventListener('click', () => { navigator.share({text: $('#sis-share').textContent}).catch(() => {}); });
render();
