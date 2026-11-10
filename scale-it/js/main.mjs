import { glyph } from './shapes.mjs';
import { createAudio } from './audio.mjs';
import { createStage } from './stage.mjs';
import { ukDate, puzzleFor, scoreRound, shareText, summarise, countdown, addDays, square, LAUNCH, metricOf, viewFor, item } from './logic.mjs';

const $ = s => document.querySelector(s);
const KEY = 'scaleit:stats';
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const audio = createAudio();
const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
const write = s => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} };
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

let store = read();
store.played = store.played || {};
if (store.sound == null) store.sound = true;
let date = ukDate();
let puzzle = null;
let index = 0;
let scores = [];
let phase = 'idle';
let watch = false;

const stage = createStage($('#stage'), {
  whoosh: () => audio.whoosh(),
  tick: t => audio.tick(t),
  resolve: () => audio.resolve((scores[index] || 0) >= 800),
  done: () => { if (!watch) $('#after').hidden = false; }
});

function icon(id, metric) {
  const it = item(id);
  const view = viewFor(id, metric);
  const g = glyph(it.art, view);
  const paths = g.paths.filter(Boolean).map(d => `<path d="${d}"/>`).join('');
  return `<span class="ico" aria-hidden="true"><svg viewBox="0 ${-g.h} ${g.w} ${g.h}"><g transform="scale(1,-1)">${paths}</g></svg></span>`;
}

function paintStats() {
  const s = summarise(store.played, ukDate());
  $('#st-streak').textContent = s.streak;
  $('#st-played').textContent = s.played;
  $('#st-avg').textContent = s.avg.toLocaleString('en-GB');
  $('#st-best').textContent = s.best.toLocaleString('en-GB');
  $('#when').textContent = `Next puzzle in ${countdown()}. Today is ${ukDate()}.`;
}
function paintMute() {
  const on = store.sound !== false;
  audio.setMuted(!on);
  const b = $('#mute');
  b.textContent = on ? 'Sound on' : 'Sound off';
  b.setAttribute('aria-pressed', String(on));
}
function paintArchive() {
  const today = ukDate();
  const chips = [];
  for (let d = addDays(today, -1), n = 0; d >= LAUNCH && n < 60; d = addDays(d, -1), n++) {
    const rec = store.played[d];
    const mark = rec ? square(Math.round(rec.score / 5)) : '·';
    chips.push(`<a href="?date=${d}" class="${d === date ? 'on' : ''}">${d.slice(5)}<small>${rec ? rec.score.toLocaleString('en-GB') + ' ' + mark : 'open'}</small></a>`);
  }
  $('#archive').innerHTML = chips.join('') || '<p class="fine">No past days yet.</p>';
}
function pips() {
  $('#pips').innerHTML = scores.map(s => `<i class="pip ${s >= 800 ? 'good' : s >= 500 ? 'mid' : 'low'}"></i>`).join('') + Array.from({length: 5 - scores.length}, () => '<i class="pip"></i>').join('');
}

function showDone(saved) {
  phase = 'done';
  $('#round').hidden = true;
  $('#done').hidden = false;
  $('#start-row').hidden = true;
  $('#locked').hidden = true;
  const total = saved.score;
  $('#done-title').textContent = date === ukDate() ? 'That is today done' : `Scale It for ${date}`;
  $('#total').innerHTML = `<em>${total.toLocaleString('en-GB')}</em> / 5,000`;
  const text = shareText({number: puzzle.number, scores: saved.rounds});
  $('#share').textContent = text;
  $('#next-in').textContent = date === ukDate() ? `Next puzzle in ${countdown()}.` : 'This day is already in your record.';
  scores = saved.rounds.slice();
}

function ask() {
  phase = 'ask';
  const round = puzzle.rounds[index];
  $('#round').hidden = false;
  $('#done').hidden = true;
  $('#locked').hidden = true;
  $('#start-row').hidden = true;
  $('#after').hidden = true;
  $('#verdict').textContent = '';
  $('#round-label').textContent = `Round ${index + 1} of 5 · #${puzzle.number}`;
  $('#prompt').textContent = round.prompt;
  pips();
  const box = $('#controls');
  box.replaceChildren();
  if (round.type === 'bigger') {
    $('#hint').textContent = 'Pick one. The true scale comes after you answer.';
    const row = document.createElement('div');
    row.className = 'choices';
    for (const id of [round.a, round.b]) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'choice';
      b.dataset.id = id;
      b.innerHTML = `${icon(id, round.metric)}<strong>${esc(item(id).name)}</strong>`;
      b.addEventListener('click', () => submit(id));
      row.append(b);
    }
    box.append(row);
  } else if (round.type === 'order') {
    $('#hint').textContent = 'Tap from smallest to largest. Tap a chosen one to take it back.';
    const order = [];
    const row = document.createElement('div');
    row.className = 'order-list';
    const paint = () => {
      row.querySelectorAll('button').forEach(b => {
        const at = order.indexOf(b.dataset.id);
        b.setAttribute('aria-pressed', String(at >= 0));
        b.querySelector('.slot').textContent = at >= 0 ? String(at + 1) : '';
      });
      go.disabled = order.length !== 3;
    };
    for (const id of round.items) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'order-card';
      b.dataset.id = id;
      b.innerHTML = `<span class="slot"></span>${icon(id, round.metric)}<strong>${esc(item(id).name)}</strong>`;
      b.addEventListener('click', () => {
        const at = order.indexOf(id);
        if (at >= 0) order.splice(at, 1); else order.push(id);
        audio.click();
        paint();
      });
      row.append(b);
    }
    const go = document.createElement('button');
    go.className = 'primary';
    go.type = 'button';
    go.textContent = 'Lock the order';
    go.disabled = true;
    go.addEventListener('click', () => submit(order.slice()));
    box.append(row, go);
    paint();
  } else {
    $('#hint').textContent = round.type === 'stack' ? 'The slider is a count. How many of the smaller one fit in the larger one?' : 'Drag to your guess, then lock it in.';
    const wrap = document.createElement('div');
    wrap.className = 'slider-wrap';
    const read = document.createElement('p');
    read.className = 'slider-read';
    const range = document.createElement('input');
    range.type = 'range';
    range.min = String(round.min);
    range.max = String(round.max);
    range.step = String(round.step);
    const mid = (round.min + round.max) / 2;
    range.value = String(Math.round(mid / round.step) * round.step);
    const unit = round.type === 'stack' ? '' : metricOf(round.item, round.metric).unit;
    const show = () => { read.textContent = unit ? `${Number(range.value).toLocaleString('en-GB')} ${unit}` : Number(range.value).toLocaleString('en-GB'); };
    range.addEventListener('input', show);
    const ends = document.createElement('div');
    ends.className = 'ends';
    ends.innerHTML = `<span>${Number(round.min).toLocaleString('en-GB')}</span><span>${Number(round.max).toLocaleString('en-GB')}</span>`;
    const go = document.createElement('button');
    go.className = 'primary';
    go.type = 'button';
    go.textContent = 'Lock it in';
    go.addEventListener('click', () => submit(Number(range.value)));
    wrap.append(read, range, ends, go);
    box.append(wrap);
    show();
  }
  $('#prompt').focus();
}

function verdict(round, result) {
  if (round.type === 'bigger') return result.correct ? 'That is the one.' : 'It was the other one.';
  if (round.type === 'order') return result.score === 1000 ? 'In the right order.' : result.score === 600 ? 'One pair was swapped.' : 'The order was off.';
  if (result.score >= 1000) return 'Bang on.';
  if (result.score >= 700) return 'Very close.';
  if (result.score >= 400) return 'In the area.';
  if (result.score > 0) return 'A long way out, but the picture will help.';
  return 'Miles out. Have a look.';
}

function sources(round) {
  const ids = round.type === 'bigger' ? [round.a, round.b] : round.type === 'order' ? round.items : round.type === 'slider' ? [round.item] : [round.subject, round.unit];
  const seen = new Set();
  const lines = [];
  for (const id of ids) {
    const m = metricOf(id, round.metric);
    const key = id + m.source;
    if (seen.has(key)) continue;
    seen.add(key);
    lines.push(`<a href="${esc(m.source)}" target="_blank" rel="noopener">${esc(item(id).name)}: ${esc(m.published)}</a>`);
    if (m.alt) lines.push(`<a href="${esc(m.alt.source)}" target="_blank" rel="noopener">${esc(item(id).name)}, another published figure: ${esc(m.alt.published)}</a>`);
  }
  $('#sources').innerHTML = lines.join('');
}

function submit(answer) {
  if (phase !== 'ask') return;
  audio.unlock();
  const round = puzzle.rounds[index];
  const result = scoreRound(round, answer);
  scores.push(result.score);
  phase = 'reveal';
  $('#controls').querySelectorAll('button,input').forEach(el => { el.disabled = true; });
  $('#verdict').textContent = `${verdict(round, result)} ${result.score.toLocaleString('en-GB')} points.`;
  $('#verdict').className = 'verdict ' + (result.score >= 800 ? 'good' : result.score === 0 ? 'bad' : '');
  $('#scorepop').innerHTML = `<em>+${result.score.toLocaleString('en-GB')}</em>`;
  $('#next').textContent = index === 4 ? 'See the day' : 'Next round';
  sources(round);
  pips();
  stage.play(round, reduce.matches);
  store.progress = {date, index, scores};
  write(store);
}

function finish() {
  const saved = {score: scores.reduce((a, b) => a + b, 0), rounds: scores.slice()};
  if (!store.played[date]) {
    store.played[date] = saved;
    store.progress = null;
    write(store);
  }
  paintStats();
  paintArchive();
  showDone(store.played[date]);
}

function boot() {
  const q = new URLSearchParams(location.search).get('date');
  date = /^\d{4}-\d{2}-\d{2}$/.test(q || '') ? q : ukDate();
  puzzle = puzzleFor(date);
  const today = ukDate();
  paintStats();
  paintArchive();
  paintMute();
  $('#round').hidden = true;
  $('#done').hidden = true;
  $('#locked').hidden = true;
  $('#start-row').hidden = false;
  if (puzzle.status === 'before') {
    $('#start-row').hidden = true;
    $('#locked').hidden = false;
    $('#locked-title').textContent = 'Before I started';
    $('#locked-copy').textContent = 'Scale It begins on 1 October 2026. Pick a later day from the archive once there is one.';
    return;
  }
  if (puzzle.status === 'unwritten') {
    $('#start-row').hidden = true;
    $('#locked').hidden = false;
    $('#locked-title').textContent = 'I have not written that day';
    $('#locked-copy').textContent = 'The set I have published runs out before that date. Come back when I add more, or play one from the archive.';
    return;
  }
  if (date > today) {
    $('#start-row').hidden = true;
    $('#locked').hidden = false;
    $('#locked-title').textContent = 'Not out yet';
    $('#locked-copy').textContent = `That puzzle opens at midnight in the UK. Next puzzle in ${countdown()}.`;
    return;
  }
  $('#play').textContent = date === today ? (store.played[date] ? 'See today' : 'Play today\'s puzzle') : (store.played[date] ? 'See this day' : 'Play this day');
  $('#kicker').textContent = date === today ? `Daily size puzzle · #${puzzle.number}` : `Archive · ${date} · #${puzzle.number}`;
  if (store.played[date]) showDone(store.played[date]);
}

$('#play').addEventListener('click', () => {
  audio.unlock();
  if (store.played[date]) { showDone(store.played[date]); return; }
  const prog = store.progress;
  if (prog && prog.date === date && Array.isArray(prog.scores)) {
    scores = prog.scores.slice();
    index = scores.length;
  } else { scores = []; index = 0; }
  if (index >= 5) finish();
  else ask();
});
$('#next').addEventListener('click', () => {
  audio.click();
  index += 1;
  if (index >= 5) finish();
  else ask();
});
$('#copy').addEventListener('click', async () => {
  const text = $('#share').textContent;
  try { await navigator.clipboard.writeText(text); $('#copy').textContent = 'Copied'; }
  catch (e) {
    const ta = document.createElement('textarea');
    ta.value = text; document.body.append(ta); ta.select();
    try { document.execCommand('copy'); $('#copy').textContent = 'Copied'; } catch (err) { $('#copy').textContent = 'Select the card and copy it'; }
    ta.remove();
  }
  setTimeout(() => { $('#copy').textContent = 'Copy share card'; }, 1600);
});
$('#watch').addEventListener('click', () => {
  watch = true;
  let i = 0;
  const saved = store.played[date];
  const run = () => {
    if (!saved || i >= 5) { watch = false; return; }
    $('#round').hidden = false;
    $('#done').hidden = true;
    $('#after').hidden = true;
    $('#controls').replaceChildren();
    $('#prompt').textContent = puzzle.rounds[i].prompt;
    $('#verdict').textContent = `${saved.rounds[i].toLocaleString('en-GB')} points`;
    stage.play(puzzle.rounds[i], reduce.matches);
    i += 1;
    setTimeout(() => { if (i < 5) run(); else { watch = false; showDone(saved); } }, reduce.matches ? 700 : 2600);
  };
  run();
});
$('#mute').addEventListener('click', () => {
  store.sound = store.sound === false;
  write(store);
  paintMute();
  audio.unlock();
  audio.click();
});
document.addEventListener('keydown', e => {
  if (phase !== 'ask' || e.metaKey || e.ctrlKey || e.altKey) return;
  const round = puzzle && puzzle.rounds[index];
  if (!round) return;
  if (round.type === 'bigger' && (e.key === '1' || e.key === '2')) submit(e.key === '1' ? round.a : round.b);
  if (round.type === 'order' && '123'.includes(e.key)) {
    const btn = document.querySelectorAll('#controls .order-card')[+e.key - 1];
    if (btn) btn.click();
  }
});
setInterval(paintStats, 1000);
boot();

window.ScaleIt = {
  ukDate, puzzleFor, scoreRound, shareText,
  get date() { return date; },
  get puzzle() { return puzzle; },
  get scores() { return scores.slice(); },
  get phase() { return phase; },
  answer: submit
};
