/** Tolerance: page controller. */
import {makePuzzle, newState, play, shareText, statsFrom, fmtAnswer, londonKey, GUESSES} from './mech.js';
import {drawing, describe} from './draw.js';
const $ = id => document.getElementById(id);
const read = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const P = () => window.DexmPoints;
const app = {state: null};
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]);
const WORDS = {higher: 'Higher', lower: 'Lower', win: 'Within 5%'};

function show(screen) { document.body.dataset.screen = screen; $('screen-title').hidden = screen !== 'title'; $('screen-game').hidden = screen !== 'game'; if (screen === 'title') renderStats(); }
function startDaily() {
  const key = londonKey(), p = makePuzzle({key}); let st = newState(p);
  for (const g of read(`tolerance:round:${key}`, {guesses: []}).guesses || []) st = play(st, Number(g));
  app.state = st; enter();
}
function startPractice() { app.state = newState(makePuzzle({seed: Math.floor(Math.random() * 2 ** 31)})); enter(); }
function enter() {
  const p = app.state.puzzle; show('game');
  $('game-label').textContent = p.practice ? 'Practice' : `Tolerance #${p.number}`;
  $('game-heading').textContent = p.name; $('drawing').innerHTML = drawing(p);
  $('givens').textContent = describe(p).replace(/^./, c => c.toUpperCase()) + '.';
  $('question').textContent = `Find ${p.asks}${p.unit === 'ratio' ? ', as a number to 1' : `, in ${p.unit}`}.`;
  $('guess-unit').textContent = p.unit === 'ratio' ? ': 1' : p.unit;
  render(); $('game-heading').focus({preventScroll: true});
}
function render() {
  const st = app.state, left = GUESSES - st.guesses.length;
  $('guesses').innerHTML = st.guesses.map((g, i) => `<li class="g-${g.result}"><span>${i + 1}</span><b>${esc(g.value.toLocaleString('en-GB'))}</b><em>${WORDS[g.result]}</em></li>`).join('');
  $('left').textContent = st.done ? '' : `${left} ${left === 1 ? 'guess' : 'guesses'} left`;
  $('guess-form').hidden = st.done; $('result').hidden = !st.done;
  if (st.done) {
    const p = st.puzzle;
    $('result-head').textContent = st.won ? `Within tolerance on guess ${st.guesses.length}.` : 'Out of guesses.';
    $('result-answer').textContent = `The answer is ${fmtAnswer(p.answer, p.unit)}.`;
    $('working').innerHTML = p.steps.map(s => `<li>${esc(s)}</li>`).join('');
  }
}
function guess(e) {
  e.preventDefault();
  const raw = $('guess-input').value.replace(/[,\s]/g, ''), v = Number(raw);
  if (!raw || !Number.isFinite(v) || v <= 0) { $('feedback').textContent = 'Type a number above zero.'; $('guess-input').focus(); return; }
  const before = app.state; app.state = play(before, v); if (app.state === before) return;
  const last = app.state.guesses.at(-1); $('feedback').textContent = `${v.toLocaleString('en-GB')}: ${WORDS[last.result]}.`;
  $('guess-input').value = ''; save(); render();
  if (app.state.done) finish(); else $('guess-input').focus();
}
function save() { const p = app.state.puzzle; if (!p.practice) write(`tolerance:round:${p.key}`, {guesses: app.state.guesses.map(g => g.value)}); }
function finish() {
  const st = app.state, p = st.puzzle;
  if (!p.practice) {
    const h = read('tolerance:stats', {history: {}}); h.history = h.history || {}; h.history[p.key] = st.won ? st.guesses.length : 0; write('tolerance:stats', h);
    if (st.won && P()) P().earn('tolerance', P().EARN?.tolerance ?? 100, `tolerance:${p.key}`);
  } else if (st.won && P()) P().earnPractice('tolerance', londonKey());
  $('result-head').focus?.();
}
function renderStats() {
  const s = statsFrom(read('tolerance:stats', {history: {}}).history || {});
  $('stats').innerHTML = [['Played', s.played], ['Won', s.won], ['Streak', s.streak], ['Best', s.best]].map(([k, v]) => `<div><b>${v}</b><span>${k}</span></div>`).join('');
}
function share() {
  const text = shareText(app.state);
  const done = () => { $('feedback').textContent = 'Result copied. No numbers in it, so no spoilers.'; };
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done, () => { $('share-text').hidden = false; $('share-text').value = text; });
  else { $('share-text').hidden = false; $('share-text').value = text; }
}
$('play-daily').addEventListener('click', startDaily);
$('play-practice').addEventListener('click', startPractice);
$('again').addEventListener('click', startPractice);
$('back').addEventListener('click', () => show('title'));
$('guess-form').addEventListener('submit', guess);
$('share').addEventListener('click', share);
$('home').addEventListener('click', () => show('title'));
const today = londonKey(); $('header-day').textContent = `#${makePuzzle({key: today}).number}`;
show('title');
