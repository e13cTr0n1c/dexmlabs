import {A, ROTORS, createMachine} from './enigma.js';
import {makePuzzle, newState, play, shareText, streak, londonKey, TRIES} from './daily.js';
const $ = id => document.getElementById(id);
const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const app = {st: null};
// machine controls: rotor, ring and start for each of the three slots
$('rotor-row').innerHTML = ['Left', 'Middle', 'Right'].map((n, i) => `<label>${n} rotor<select id="r${i}">${Object.keys(ROTORS).map(r => `<option${r === ['I', 'II', 'III'][i] ? ' selected' : ''}>${r}</option>`).join('')}</select></label><label>Ring<input class="ltr" id="g${i}" maxlength="1" value="A"></label><label>Start<input class="ltr" id="p${i}" maxlength="1" value="A"></label>`).join('');
$('lamps').innerHTML = [...'QWERTZUIOASDFGHJKPYXCVBNML'].map(c => `<span data-l="${c}">${c}</span>`).join('');
const L = id => (($(id).value || 'A').toUpperCase().replace(/[^A-Z]/g, '') || 'A')[0];
function run() {
  let m; try { m = createMachine({rotors: [0, 1, 2].map(i => $(`r${i}`).value), rings: [0, 1, 2].map(i => L(`g${i}`)).join(''), positions: [0, 1, 2].map(i => L(`p${i}`)).join(''), plugs: $('m-plugs').value}); }
  catch (e) { $('m-out').textContent = e.message; return; }
  const out = m.type($('m-in').value); $('m-out').textContent = out.replace(/(.{5})/g, '$1 ').trim();
  $('m-pos').textContent = `Rotor windows now: ${m.positions}`;
  document.querySelectorAll('.lamps span').forEach(s => s.classList.toggle('on', s.dataset.l === out.at(-1)));
}
document.querySelector('.machine').addEventListener('input', run); document.querySelector('.machine').addEventListener('change', run);
function start(p) {
  const saved = p.practice ? null : read(`enigma:round:${p.key}`, null); let st = newState(p);
  for (const t of saved?.tries || []) st = play(st, t);
  app.st = st; app.texts = saved?.tries || [];
  $('puzzle').hidden = $('answer').hidden = false;
  $('puzzle-h').textContent = p.practice ? 'Practice intercept' : `Intercept #${p.number}`;
  $('k-rotors').textContent = p.settings.rotors.join(' '); $('k-rings').textContent = p.settings.rings.split('').join(' '); $('k-start').textContent = p.settings.positions.split('').join(' ');
  $('k-plugs').innerHTML = p.sheetPlugs + ' <span class="smudge" title="Smudged">??</span>';
  $('cipher').textContent = p.cipher.replace(/(.{5})/g, '$1 ').trim();
  render(); $('puzzle-h').focus();
}
function render() {
  const st = app.st, left = TRIES - st.tries.length;
  $('tries').innerHTML = st.tries.map(w => `<div class="grid-row" aria-label="${w.filter(Boolean).length} of ${w.length} words right">${w.map(x => `<i class="${x ? 'ok' : ''}"></i>`).join('')}</div>`).join('');
  $('left').textContent = st.done ? '' : `${left} ${left === 1 ? 'try' : 'tries'} left. Each green square is a word in the right place.`;
  $('try-form').hidden = st.done; $('result').hidden = !st.done;
  if (st.done) { $('result-head').textContent = st.won ? `Read on try ${st.tries.length}.` : 'Out of tries.'; $('result-key').textContent = `The smudged cable was ${st.puzzle.smudged}. The message: ${st.puzzle.message}.`; }
}
$('try-form').addEventListener('submit', e => {
  e.preventDefault(); const v = $('try-input').value; if (!v.trim()) return;
  const before = app.st; app.st = play(before, v); if (app.st === before) return;
  const p = app.st.puzzle, last = app.st.tries.at(-1); app.texts.push(v); $('try-input').value = '';
  $('feedback').textContent = app.st.won ? 'That reads right.' : `${last.filter(Boolean).length} of ${last.length} words right.`;
  if (!p.practice) write(`enigma:round:${p.key}`, {tries: app.texts});
  if (app.st.done) {
    if (!p.practice) { const h = read('enigma:stats', {history: {}}); h.history[p.key] = app.st.won; write('enigma:stats', h); if (app.st.won) window.DexmPoints?.earn('enigma', 100, `enigma:${p.key}`); }
    else if (app.st.won) window.DexmPoints?.earnPractice('enigma', londonKey());
    stats();
  }
  render(); if (app.st.done) $('result-head').focus();
});
function stats() { const s = streak(read('enigma:stats', {history: {}}).history || {}); $('stats').innerHTML = [['Played', s.played], ['Won', s.won], ['Streak', s.streak], ['Best', s.best]].map(([k, v]) => `<div><b>${v}</b><span>${k}</span></div>`).join(''); }
$('share').addEventListener('click', () => { const t = shareText(app.st); navigator.clipboard?.writeText(t).then(() => { $('feedback').textContent = 'Result copied. No letters from the message in it.'; }, () => { $('share-text').hidden = false; $('share-text').value = t; }); });
$('play-daily').addEventListener('click', () => start(makePuzzle()));
$('play-practice').addEventListener('click', () => start(makePuzzle({seed: Math.floor(Math.random() * 2 ** 31)})));
$('again').addEventListener('click', () => start(makePuzzle({seed: Math.floor(Math.random() * 2 ** 31)})));
$('header-day').textContent = `#${makePuzzle().number}`; stats(); run();
