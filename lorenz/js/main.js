/** Lorenz: page controller. Wires the pure cipher and game modules to the DOM, the tape and the 3D view. */
import {WHEELS, WHEEL, CHI, PSI, MODELS, crypt, createMachine, createChiMachine, createPrinter, encodeText, toBP, fromBP, parsePattern, patternString, checkPosition, groups, POSITION_BASE} from './lorenz.js';
import {makeRound, newState, attempt, useHint, shareText, updateStats, statsFrom, msToNextDay, pad2, scoreFor, RULES, makePattern, answerLine, revealText} from './game.js';
import {bookHeadHTML, bookBodyHTML, smudgeNote, SMUDGE_NOTE} from './book.js';
import {makeHardRound, pageRound, pageDate, CHEAT_SHEET, HARD_RULES, restoreHard, hardScoreFor, hardBreakdown, guessQep, submitAnswer, useHardHint, revealedChars, messageChars, hardSmudgeText, updateHardStats, hardShareText, qepKnown} from './hard.js';
import {tapeHTML, holesHTML, holesText} from './punch.js';
import {utcDateKey, mulberry32} from './seed.js';
import {Tape} from './tape.js';
import {ScoreCounter, rewardPlan, scoreBreakdown} from './reward.js';
import {CHI_EXAMPLE} from './chi-example.js';
import {applyPrintLink, stlSlotHTML} from './print-link.js';

const $ = id => document.getElementById(id);
const PREFIX = 'lorenz:';
const read = (k, fallback) => { try { const v = localStorage.getItem(PREFIX + k); return v ? JSON.parse(v) : fallback; } catch { return fallback; } };
const write = (k, v) => { try { localStorage.setItem(PREFIX + k, JSON.stringify(v)); } catch { /* private mode: play on without saving */ } };
const escapeHTML = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = n => Math.round(n).toLocaleString('en-GB');
const niceDate = key => new Date(key + 'T12:00:00Z').toLocaleDateString('en-GB', {day:'numeric', month:'long', year:'numeric', timeZone:'UTC'});

const app = {difficulty:'normal', page:0, marked:new Set(), screen:'title', mode:null, tab:'random', state:null, daily:null, practice:null, wheels:{}, settings:{reducedMotion:false, flat:false}, stats:null, view:null, run:null, io:'plain', chiIo:'plain', labels:[], lastOut:''};
export const reducedMotion = () => Boolean(app.settings.reducedMotion || (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches));
let tape, counter;

/* ---------- 3D view, loaded after first paint so the page is usable straight away ---------- */
function webglOK() { try { const c = document.createElement('canvas'); return Boolean(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } }
async function loadView() {
  const stage = $('machine-stage'), opts = {reducedMotion, labels: app.labels};
  app.view?.dispose(); app.view = null;
  let note = '';
  if (!app.settings.flat && webglOK()) {
    try { const m = await import('./machine3d.js'); app.view = m.createMachine3D(stage, opts); note = 'Drag to look round. Raised cams glow.'; }
    catch (e) { note = 'The 3D view could not load, so this is the flat view.'; }
  } else note = app.settings.flat ? 'Flat view. You can switch the 3D view back on in settings.' : 'Your browser has no WebGL, so this is the flat view.';
  if (!app.view) { const f = await import('./fallback2d.js'); app.view = f.createMachine2D(stage, opts); }
  $('renderer-note').textContent = note;
  syncView(false);
}
function viewPatterns() {
  if (app.screen === 'game' && app.tab === 'chi') { const p = {...(app.daily?.round.patterns || {})}; for (const id of CHI) { const r = parsePattern($(`chi-pat-${id}`)?.value, WHEEL[id].size); if (r.ok) p[id] = r.bits; } return p; }
  return (app.state?.round || app.daily?.round)?.patterns;
}
function viewPositions() {
  if (app.screen === 'game' && app.tab === 'chi') { const p = {...app.wheels}; for (const id of CHI) { const v = checkPosition($(`chi-pos-${id}`)?.value, WHEEL[id].size); if (v.ok) p[id] = v.value; } return p; }
  return app.screen === 'title' ? (app.daily?.round.start) : app.wheels;
}
function syncView(animate = true) {
  const v = app.view; if (!v) return;
  v.setPatterns(viewPatterns()); v.setPositions(viewPositions(), {animate});
  v.setDim(app.screen === 'game' && app.tab === 'chi' ? [...PSI, 'mu37', 'mu61'] : []);
  v.setIdle(app.screen === 'title');
  showLabelPositions(viewPositions());
}
function showLabelPositions(pos, moved) {
  WHEELS.forEach((w, i) => { const el = app.labels[i]; if (!el || !pos || pos[w.id] === undefined) return; el.querySelector('b').textContent = pad2(pos[w.id]); el.classList.toggle('moved', Boolean(moved?.has(w.id))); el.classList.toggle('off', app.screen === 'game' && app.tab === 'chi' && w.group !== 'chi'); });
}

/* ---------- Wheel dials ---------- */
function buildDials() {
  const box = $('dials'); box.innerHTML = '';
  let prev = null;
  for (const w of WHEELS) {
    if (prev && prev !== w.group) { const gap = document.createElement('span'); gap.className = 'dial-gap'; gap.setAttribute('aria-hidden', 'true'); box.append(gap); }
    const d = document.createElement('div');
    d.className = `dial dial-${w.group}${w.group !== prev ? ` ${w.group}-start` : ''}`; d.dataset.wheel = w.id;
    const name = {psi:'Psi', mu:'Motor', chi:'Chi'}[w.group];
    d.innerHTML = `<span class="dial-name" aria-hidden="true">${w.label}<small>${w.size}</small></span><button type="button" class="dial-up" aria-label="${name} ${w.size} wheel up one">&#9650;</button><input type="number" inputmode="numeric" min="${POSITION_BASE}" max="${w.size - 1 + POSITION_BASE}" id="dial-${w.id}" aria-label="${w.group === 'mu' ? `Motor wheel ${w.size}` : `${name} ${w.impulse}`}, ${w.size} cams, start position"><button type="button" class="dial-down" aria-label="${name} ${w.size} wheel down one">&#9660;</button>`;
    box.append(d); prev = w.group;
    const input = d.querySelector('input');
    const set = v => { const n = ((Math.round(v) - POSITION_BASE) % w.size + w.size) % w.size + POSITION_BASE; app.wheels[w.id] = n; input.value = pad2(n); input.removeAttribute('aria-invalid'); wheelsChanged(); };
    d.querySelector('.dial-up').addEventListener('click', () => set(app.wheels[w.id] + 1));
    d.querySelector('.dial-down').addEventListener('click', () => set(app.wheels[w.id] - 1));
    input.addEventListener('change', () => { const c = checkPosition(input.value, w.size); if (c.ok) set(c.value); else { input.setAttribute('aria-invalid', 'true'); input.value = pad2(app.wheels[w.id]); } });
    input.addEventListener('keydown', e => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); set(app.wheels[w.id] + (e.key === 'ArrowUp' ? 1 : -1)); } });
    // Drag the number up or down: one position every 12 pixels.
    let drag = null;
    input.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse' && e.button !== 0) return; drag = {y: e.clientY, v: app.wheels[w.id], moved: false, id: e.pointerId}; });
    input.addEventListener('pointermove', e => { if (!drag) return; const dy = drag.y - e.clientY; if (!drag.moved && Math.abs(dy) > 6) { drag.moved = true; input.setPointerCapture(drag.id); d.classList.add('dragging'); } if (drag.moved) { e.preventDefault(); const v = drag.v + Math.trunc(dy / 12); if (v !== app.wheels[w.id]) set(v); } });
    const end = () => { if (drag?.moved) d.classList.remove('dragging'); drag = null; };
    input.addEventListener('pointerup', end); input.addEventListener('pointercancel', end);
    input.addEventListener('wheel', e => { if (document.activeElement !== input) return; e.preventDefault(); set(app.wheels[w.id] + (e.deltaY < 0 ? 1 : -1)); }, {passive: false});
  }
  const sel = $('check-select'); sel.innerHTML = WHEELS.map(w => `<option value="${w.id}">${w.label} (${w.size} cams)</option>`).join('');
  const labels = $('machine-labels'); labels.innerHTML = '';
  app.labels = WHEELS.map(w => { const el = document.createElement('span'); el.className = 'wheel-label'; el.innerHTML = `${w.label}<b>01</b>`; labels.append(el); return el; });
}
function showDials() { for (const w of WHEELS) { const i = $(`dial-${w.id}`); if (i) i.value = pad2(app.wheels[w.id]); } }
function wheelsChanged() {
  if (app.run) stopRun();
  syncView(true);
  if ((app.mode === 'daily' || app.mode === 'hard') && app.state && !app.state.solved) saveRound();
}

/* ---------- Screens ---------- */
function show(screen) {
  app.screen = screen; document.body.dataset.screen = screen;
  $('screen-title').hidden = screen !== 'title'; $('screen-game').hidden = screen !== 'game';
  const slot = $(screen === 'title' ? 'title-stage-slot' : 'game-stage-slot'), stage = $('machine-stage'); if (stage.parentElement !== slot) slot.append(stage);
  if (screen === 'title') { stopRun(); refreshTitle(); }
  syncView(false);
  window.scrollTo(0, 0);
}
function refreshTitle() {
  const s = app.stats, day = app.daily.round;
  $('header-day').textContent = `#${day.number}, ${new Date(day.key + 'T12:00:00Z').toLocaleDateString('en-GB', {day:'numeric', month:'short', timeZone:'UTC'})}`;
  const hard = app.difficulty === 'hard', saved = read(`${hard ? 'hard:' : ''}round:${day.key}`, null), st = hard ? app.hardStats : s;
  $('play-daily').firstChild.textContent = saved?.solved ? "See today's result " : "Play today's round ";
  document.querySelectorAll('[data-difficulty]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.difficulty === app.difficulty)));
  $('mode-note').textContent = hard ? 'Hard: the same intercept, but the QEP number is on the tape, the book has five dated pages, and the machine only punches tape. You read it yourself.' : 'Normal: the QEP number is given and the teleprinter prints the message.';
  $('title-stats').textContent = st?.rounds ? `Your ${hard ? 'hard mode ' : ''}streak: ${st.streak} day${st.streak === 1 ? '' : 's'}. Best score ${fmt(st.best)}. A new intercept every day at 00:00 UTC.` : 'Twelve wheels, 501 cams, a new intercept every day at 00:00 UTC.';
}
function startDaily() {
  app.mode = 'daily'; app.tab = 'random'; app.daily = {round: makeRound({mode:'daily'})};
  const r = app.daily.round, saved = read(`round:${r.key}`, null);
  app.state = restoreState(r, saved);
  app.wheels = sanitiseWheels(saved?.wheels);
  enterGame();
}
function startHard() {
  app.mode = 'hard'; app.tab = 'random'; const r = makeHardRound({});
  const saved = read(`hard:round:${r.key}`, null);
  app.state = restoreHard(r, saved); app.wheels = sanitiseWheels(saved?.wheels); app.page = r.openIndex; app.marked = new Set();
  enterGame();
}
function startPractice(tab = 'random') {
  app.mode = 'practice'; app.tab = tab;
  if (!app.practice) newPractice(MODELS.SZ40, false);
  app.state = app.practice; app.wheels = sanitiseWheels(app.practiceWheels);
  enterGame();
}
function newPractice(model, render = true) {
  const seed = (Math.random() * 2 ** 32) >>> 0;
  app.practice = newState(makeRound({mode:'practice', seed, model}));
  if (render) { app.state = app.practice; renderRound(); syncView(false); clearOutput(); }
}
/** Saved progress from localStorage, checked field by field so an old or damaged save can't break the round. */
function restoreState(round, saved) {
  const s = saved && typeof saved === 'object' ? saved : {};
  const attempts = Array.isArray(s.attempts) ? s.attempts.filter(a => a && typeof a === 'object' && typeof a.key === 'string').map(a => ({key: a.key, ok: Boolean(a.ok)})) : [];
  const hints = Array.isArray(s.hints) ? s.hints.filter(h => h && typeof h === 'object' && (h.type === 'reveal' || h.type === 'check')).map(h => h.type === 'check' ? {type: 'check', wheel: String(h.wheel)} : {type: 'reveal'}) : [];
  const score = Number.isFinite(s.score) ? s.score : 0;
  return {...newState(round), attempts, hints, solved: s.solved === true, score};
}
const sanitiseWheels = w => Object.fromEntries(WHEELS.map(x => [x.id, checkPosition(w?.[x.id], x.size).ok ? Number(w[x.id]) : POSITION_BASE]));
function enterGame() {
  show('game'); renderTabs(); renderRound(); showDials(); clearOutput();
  const st = app.state;
  if (app.mode === 'hard') { if (st.ran || st.solved) showHardTape(); if (st.solved) { $('hard-answer').value = st.round.text; showCard(false); } }
  else if (app.tab === 'random' && st.solved) { replaySolved(); showCard(false); }
  syncView(false);
  const h = {random:'game-heading', encipher:'encipher-heading', chi:'chi-heading'}[app.tab]; $(h)?.focus({preventScroll: true});
  location.hash = app.mode === 'daily' ? 'daily' : app.mode === 'hard' ? 'hard' : ({random:'practice', encipher:'encipher', chi:'chi'}[app.tab]);
}
function renderTabs() {
  const practice = app.mode === 'practice';
  $('practice-tabs').hidden = !practice;
  document.querySelectorAll('#practice-tabs [data-tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === app.tab)));
  $('panel-round').hidden = app.tab !== 'random'; $('panel-encipher').hidden = app.tab !== 'encipher'; $('panel-chi').hidden = app.tab !== 'chi';
  $('wheels-panel').hidden = app.tab === 'chi'; $('hint-row').hidden = app.tab !== 'random';
  $('score-display').hidden = app.tab !== 'random';
  $('run-button').firstChild.textContent = app.tab === 'random' && app.mode !== 'hard' ? 'Decode the tape ' : 'Run the tape ';
  $('decoded-card').hidden = true;
  setFeedback(app.tab === 'random' ? (app.state?.solved ? 'good' : '') : '', app.tab === 'random' ? (app.state?.solved ? 'Decoded. That message is done.' : app.mode === 'hard' ? "Read the preamble, find today's page in the book, set the wheels, then run the tape." : 'Set the wheels, then run the tape.') : app.tab === 'chi' ? 'Set the five chi wheels, then run the tape.' : 'Type a message, then run the tape.');
  if (app.tab === 'chi') { chiValidate(); }
}
function showModeParts() {
  const hard = app.mode === 'hard';
  for (const id of ['today-line', 'preamble-box', 'book-pager', 'hard-out']) $(id).hidden = !hard;
  $('printed-box').hidden = hard;
  document.querySelectorAll('[data-hint=qep],[data-hint=char]').forEach(b => { b.hidden = !hard; });
  $('tape-legend').textContent = hard ? 'Each row across the tape is one character: five holes, with the small sprocket hole between holes 2 and 3. In hard mode nothing is printed under it.' : 'Each row across the tape is one character: five holes, with the small sprocket hole between holes 2 and 3. The letter under each row is what the teleprinter printed.';
}
function renderRound() {
  showModeParts();
  if (app.mode === 'hard') return renderHard();
  const st = app.state, r = st.round, daily = r.mode === 'daily';
  $('round-label').textContent = daily ? `Lorenz #${r.number}, ${niceDate(r.key)}` : 'Practice, random settings';
  $('qep-number').textContent = pad2(r.qep);
  $('model-name').textContent = r.model === MODELS.SZ42A ? 'SZ42A, with the chi 2 one back limitation' : 'SZ40, basic motor';
  $('model-name').hidden = !daily; $('practice-model').hidden = daily; $('practice-new').hidden = daily;
  $('round-intro').textContent = 'The operator sent this QEP number in clear before the message. Find it in the book below and set the wheels to match.';
  document.querySelectorAll('#practice-model [data-model]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.model === r.model)));
  $('cipher-text').textContent = groups(r.cipher);
  $('cipher-count').textContent = `${r.cipher.length} characters`;
  $('book-page').textContent = String(1 + (r.seed % 37));
  const revealed = st.hints.some(h => h.type === 'reveal');
  $('qep-table').tHead.innerHTML = bookHeadHTML();
  $('qep-table').tBodies[0].innerHTML = bookBodyHTML(r, revealed);
  $('smudge-note').textContent = smudgeNote(r, revealed);
  updateHintButtons(); updateScore();
}
function updateHintButtons() {
  const st = app.state, solved = st?.solved;
  if (app.mode === 'hard') {
    const off = {reveal: st.hints.some(h => h.type === 'smudge') || !answerLine(st.round)?.smudge, qep: qepKnown(st), char: revealedChars(st).length >= messageChars(st.round).length, check: false};
    document.querySelectorAll('[data-hint]').forEach(b => { b.disabled = Boolean(solved) || off[b.dataset.hint]; });
    return;
  }
  document.querySelectorAll('[data-hint]').forEach(b => { b.disabled = Boolean(solved) || (b.dataset.hint === 'reveal' && (st.hints.some(h => h.type === 'reveal') || !answerLine(st.round)?.smudge)); });
}
function updateScore() { if (!app.state) return; counter.show(app.state.solved ? app.state.score : app.mode === 'hard' ? hardScoreFor(app.state) : scoreFor(app.state)); $('score-display').title = app.state.solved ? 'Your score' : 'What a correct decode is worth now'; }
function saveRound() {
  const st = app.state;
  if (app.mode === 'hard') {
    write(`hard:round:${st.round.key}`, {answers: st.answers, hints: st.hints, qepGuesses: st.qepGuesses, ran: st.ran, solved: st.solved, score: st.score, wheels: app.wheels});
    try { const keys = Object.keys(localStorage).filter(k => k.startsWith(PREFIX + 'hard:round:')).sort(); keys.slice(0, Math.max(0, keys.length - 7)).forEach(k => localStorage.removeItem(k)); } catch { /* ignore */ }
    return;
  }
  if (st.round.mode !== 'daily') { app.practiceWheels = {...app.wheels}; return; }
  write(`round:${st.round.key}`, {attempts: st.attempts, hints: st.hints, solved: st.solved, score: st.score, wheels: app.wheels});
  try { const keys = Object.keys(localStorage).filter(k => k.startsWith(PREFIX + 'round:')).sort(); keys.slice(0, Math.max(0, keys.length - 7)).forEach(k => localStorage.removeItem(k)); } catch { /* ignore */ }
}
function setFeedback(tone, text) { const f = $('feedback'); f.className = `feedback ${tone || ''}`; f.innerHTML = `<p>${escapeHTML(text)}</p>`; }

/* ---------- The teleprinter run ---------- */
function clearOutput() { stopRun(); tape.reset(); $('printed-text').textContent = ''; $('printed-copy').hidden = true; $('printed-label').textContent = 'Printed'; app.lastOut = ''; }
function stopRun() { if (app.run) { cancelAnimationFrame(app.run.frame); app.run = null; } $('skip-button').disabled = true; $('run-button').disabled = false; }
/** Feed `codes` through `machine` at the chosen speed. Each frame: tape row, printed character, wheel positions. */
function runTape({codes, machine, label, onDone, outputAs = 'print'}) {
  stopRun(); tape.reset(); const printed = $('printed-text'); printed.textContent = ''; $('printed-copy').hidden = true; $('printed-label').textContent = label || 'Printed';
  const printer = createPrinter(), out = [], text = [];
  const run = {i: 0, frame: null, start: performance.now(), done: false};
  app.run = run; $('run-button').disabled = true; $('skip-button').disabled = false;
  const one = () => {
    const c = codes[run.i++], s = machine.step(), o = c ^ s.key; out.push(o);
    const p = printer(o), shown = outputAs === 'bp' ? {print: toBP([o]), control: null} : p;
    if (outputAs === 'tape') { tape.push({code: o, print: '', control: null}); text.push(''); return s; }
    tape.push({code: c, print: shown.print, control: shown.control});
    text.push(outputAs === 'bp' ? toBP([o]) : p.print);
    return s;
  };
  const finish = () => {
    run.done = true; app.run = null; $('run-button').disabled = false; $('skip-button').disabled = true;
    printed.textContent = outputAs === 'bp' ? groups(text.join('')) : text.join('');
    app.lastOut = printed.textContent; $('printed-copy').hidden = !app.lastOut;
    app.view?.setPositions(machine.positions(), {animate: false}); showLabelPositions(machine.positions());
    onDone?.(out);
  };
  run.skip = () => { while (run.i < codes.length) one(); tape.setRows(tape.rows); cancelAnimationFrame(run.frame); finish(); };
  if (!codes.length) { finish(); return; }
  const cps = Number($('speed-select').value) || 20;
  const frame = now => {
    if (app.run !== run) return;
    const due = Math.min(codes.length, Math.floor((now - run.start) / 1000 * cps) + 1);
    let last = null; while (run.i < due) last = one();
    if (last) {
      app.view?.setPositions(last.after); const moved = new Set(['chi1','chi2','chi3','chi4','chi5','mu61', ...(last.psiMoved ? PSI : []), ...(last.mu37Moved ? ['mu37'] : [])]);
      showLabelPositions(last.after, moved);
      printed.innerHTML = `${escapeHTML(outputAs === 'bp' ? groups(text.join('')) : text.join(''))}<span class="caret" aria-hidden="true">&nbsp;</span>`; printed.scrollTop = printed.scrollHeight;
    }
    if (run.i >= codes.length) finish(); else run.frame = requestAnimationFrame(frame);
  };
  run.frame = requestAnimationFrame(frame);
}

/** On a stacked (phone) layout the teleprinter is below the button, so bring it into view. */
function revealTeleprinter() { if (window.matchMedia?.('(max-width: 1100px)').matches) document.querySelector('.teleprinter')?.scrollIntoView({block: 'start', behavior: reducedMotion() ? 'auto' : 'smooth'}); }
function onRun() {
  if (app.run || app.screen !== 'game') return;
  $('decoded-card').hidden = true;
  if (app.tab === 'random') return runDecode();
  if (app.tab === 'encipher') return runEncipher();
  if (app.tab === 'chi') return runChi();
}
function runDecode() {
  if (app.mode === 'hard') return runHard();
  const st = app.state, r = st.round, settings = {...app.wheels};
  if (st.solved) { replaySolved(true); return; }
  setFeedback('', 'Running the tape...'); revealTeleprinter();
  runTape({codes: r.cipherCodes, machine: createMachine({patterns: r.patterns, start: settings, model: r.model}), label: 'Printed', onDone: () => {
    const {state, result} = attempt(app.state, settings); app.state = state; if (r.mode === 'practice') app.practice = state;
    saveRound(); updateScore(); updateHintButtons();
    if (result.ok) return success();
    const wrong = state.attempts.filter(a => !a.ok).length;
    let msg = result.repeat ? "Same settings as before, so that one's free. Still garbage." : `Garbage. At least one wheel is off. That cost ${RULES.wrong} points.`;
    if (wrong >= 2 && !result.repeat) msg += ' If the first few letters read right and then it falls apart, look at the motor wheels.';
    setFeedback('bad', msg);
  }});
}
function replaySolved(animate = false) {
  const r = app.state.round;
  if (animate) { runTape({codes: r.cipherCodes, machine: createMachine({patterns: r.patterns, start: r.start, model: r.model}), onDone: () => showCard(false)}); return; }
  const m = createMachine({patterns: r.patterns, start: r.start, model: r.model}), printer = createPrinter(), rows = [], text = [];
  for (const c of r.cipherCodes) { const p = printer(c ^ m.step().key); rows.push({code: c, print: p.print, control: p.control}); text.push(p.print); }
  tape.setRows(rows); $('printed-text').textContent = text.join(''); app.lastOut = text.join(''); $('printed-copy').hidden = false;
  app.wheels = {...r.start}; showDials();
}
function success() {
  const st = app.state, plan = rewardPlan(true, {reducedMotion: reducedMotion()});
  if (st.round.mode === 'daily') { app.stats = updateStats(app.stats, st); write('stats', app.stats); }
  setFeedback('good', 'Message decoded!! The wheels were right.');
  if (plan.fly) { tape.fly(); $('screen-game').querySelector('.teleprinter').classList.add('tape-fly'); setTimeout(() => $('screen-game').querySelector('.teleprinter').classList.remove('tape-fly'), 1300); }
  if (plan.spin) app.view?.celebrate();
  counter.animateTo(st.score, {from: 0, reducedMotion: !plan.countUp, delay: plan.delay});
  if (plan.delay) setTimeout(() => showCard(true), plan.delay); else showCard(false);
}
function showCard(animate) {
  if (app.mode === 'hard') return showHardCard(animate);
  const st = app.state, r = st.round, b = scoreBreakdown(st), s = app.stats, card = $('decoded-card');
  const streak = r.mode === 'daily' && s ? `<p class="tiny">Streak: ${s.streak} day${s.streak === 1 ? '' : 's'}. Best: ${fmt(s.best)} pts.</p>` : '';
  const next = r.mode === 'daily' ? `<p class="countdown">Next intercept in ${countdown()}.</p>` : '';
  card.className = 'decoded-card';
  card.innerHTML = `<button type="button" class="card-close" aria-label="Close">&#215;</button><span class="eyebrow">&#10003; Message decoded</span><h2 id="decoded-heading" tabindex="-1">QEP ${pad2(r.qep)}</h2><blockquote>${escapeHTML(r.text)}</blockquote><dl>${b.lines.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl><p class="decoded-total"><span>Total</span><span id="card-total">${fmt(st.score)} pts</span></p>${streak}<div class="card-actions"><button type="button" class="primary" data-card="share">Share result</button><button type="button" data-card="copy">Copy</button><button type="button" data-card="practice">${r.mode === 'daily' ? 'Practice' : 'Next round'}</button></div>${next}<p class="tiny">These messages are made up for the game.</p>${stlSlotHTML('card')}`;
  applyPrintLink(card);
  card.hidden = false;
  card.querySelector('.card-close').addEventListener('click', () => { card.hidden = true; });
  card.querySelector('[data-card=share]').addEventListener('click', () => share(true));
  card.querySelector('[data-card=copy]').addEventListener('click', () => share(false));
  card.querySelector('[data-card=practice]').addEventListener('click', () => { if (r.mode === 'daily') startPractice('random'); else { newPractice(r.model); app.wheels = sanitiseWheels({}); showDials(); syncView(false); setFeedback('', 'New settings. Find the QEP number in the book.'); } });
  if (animate && !reducedMotion()) new ScoreCounter($('card-total')).animateTo(st.score, {from: 0});
  $('decoded-heading').focus({preventScroll: true});
}
function countdown() { const ms = msToNextDay(), h = Math.floor(ms / 3600000), m = Math.floor(ms % 3600000 / 60000); return `${h} h ${m} min`; }

/* ---------- Encipher ---------- */
function encipherCodes() {
  const v = $('encipher-input').value, err = $('encipher-error');
  if (app.io === 'plain') { const codes = encodeText(v); err.hidden = !codes.dropped.length; err.textContent = codes.dropped.length ? `Left out: ${[...new Set(codes.dropped)].join(' ')}` : ''; return [...codes]; }
  const r = fromBP(v); err.hidden = r.ok; err.textContent = r.ok ? '' : r.error; return r.ok ? r.codes : null;
}
function runEncipher() {
  const codes = encipherCodes(); if (!codes) { $('encipher-input').setAttribute('aria-invalid', 'true'); return; }
  $('encipher-input').removeAttribute('aria-invalid');
  if (!codes.length) { setFeedback('bad', 'Type something first.'); return; }
  const r = app.daily.round;
  setFeedback('', 'Running the tape...'); revealTeleprinter();
  runTape({codes, machine: createMachine({patterns: r.patterns, start: {...app.wheels}, model: MODELS.SZ40}), label: app.io === 'plain' ? 'Tape out, in Bletchley letters' : 'Printed', outputAs: app.io === 'plain' ? 'bp' : 'print',
    onDone: () => setFeedback('good', app.io === 'plain' ? 'Done. Copy the tape, switch to tape in, and run it again with the same settings to get your message back.' : 'Done. If that reads as garbage, the wheels aren\'t where they were when it was enciphered.')});
}

/* ---------- Chi only ---------- */
function buildChi() {
  const box = $('chi-patterns'); box.innerHTML = '';
  for (const id of CHI) {
    const w = WHEEL[id], row = document.createElement('div'); row.className = 'chi-row';
    row.innerHTML = `<label for="chi-pat-${id}">${w.label}</label><input type="text" id="chi-pat-${id}" autocomplete="off" autocapitalize="off" spellcheck="false" aria-describedby="chi-msg-${id}"><input type="number" id="chi-pos-${id}" min="1" max="${w.size}" inputmode="numeric" aria-label="${w.label} start position, 1 to ${w.size}"><p class="tiny" id="chi-msg-${id}"></p>`;
    box.append(row);
    row.querySelectorAll('input').forEach(i => i.addEventListener('input', () => { chiValidate(); syncView(false); }));
  }
  fillChi(CHI_EXAMPLE.patterns, CHI_EXAMPLE.start);
}
function fillChi(patterns, start) {
  for (const id of CHI) { $(`chi-pat-${id}`).value = typeof patterns[id] === 'string' ? patterns[id] : patternString(patterns[id]); $(`chi-pos-${id}`).value = start[id]; }
  chiValidate();
}
function chiValidate() {
  let ok = true; const patterns = {}, start = {};
  for (const id of CHI) {
    const w = WHEEL[id], pi = $(`chi-pat-${id}`), qi = $(`chi-pos-${id}`), msg = $(`chi-msg-${id}`);
    const p = parsePattern(pi.value, w.size), q = checkPosition(qi.value, w.size);
    pi.toggleAttribute('aria-invalid', !p.ok); if (!p.ok) pi.setAttribute('aria-invalid', 'true');
    qi.toggleAttribute('aria-invalid', !q.ok); if (!q.ok) qi.setAttribute('aria-invalid', 'true');
    msg.textContent = !p.ok ? p.error : !q.ok ? `Start position: ${q.error}` : `${w.size} cams, ${p.bits.filter(Boolean).length} raised. Starts at ${pad2(q.value)}.`;
    msg.classList.toggle('field-error', !p.ok || !q.ok);
    if (p.ok && q.ok) { patterns[id] = p.bits; start[id] = q.value; } else ok = false;
  }
  return ok ? {patterns, start} : null;
}
function runChi() {
  const cfg = chiValidate(); if (!cfg) { setFeedback('bad', 'Fix the wheel marked in red first.'); return; }
  const v = $('chi-input').value, err = $('chi-error'); let codes;
  // Same as the printable model: the message is in Bletchley letters and a typed space counts as 9
  if (app.chiIo === 'plain') { const c = fromBP(v.replace(/ /g, '9')); if (!c.ok) { err.hidden = false; err.textContent = c.error; return; } codes = c.codes; err.hidden = true; err.textContent = ''; }
  else { const r = fromBP(v); err.hidden = r.ok; err.textContent = r.ok ? '' : r.error; if (!r.ok) return; codes = r.codes; }
  if (!codes.length) { setFeedback('bad', 'Type something first.'); return; }
  setFeedback('', 'Running the tape through the chi wheels...'); revealTeleprinter();
  runTape({codes, machine: createChiMachine(cfg), label: app.chiIo === 'plain' ? 'Tape out, in Bletchley letters' : 'Printed', outputAs: app.chiIo === 'plain' ? 'bp' : 'print', onDone: out => {
    $('chi-output').textContent = toBP(out);
    setFeedback('good', 'Done. Set the same start positions and run the tape back through to get the message.');
  }});
}


/* ---------- Hard mode ---------- */
function renderHard() {
  const st = app.state, r = st.round;
  $('round-label').textContent = `Lorenz #${r.number}, hard, ${niceDate(r.key)}`;
  $('qep-number').textContent = qepKnown(st) || st.solved ? pad2(r.qep) : '??';
  $('round-intro').textContent = "The QEP number came on the tape, sent in clear before the message. Read it with the cheat sheet, find today's page in the book, set the wheels and run the tape. Then read what the machine punched.";
  $('model-name').textContent = r.model === MODELS.SZ42A ? 'SZ42A, with the chi 2 one back limitation' : 'SZ40, basic motor';
  $('model-name').hidden = false; $('practice-model').hidden = true; $('practice-new').hidden = true;
  $('today-date').textContent = pageDate(r.key);
  $('cipher-text').textContent = groups(r.cipher); $('cipher-count').textContent = `${r.cipher.length} characters`;
  const pre = $('preamble-tape'); pre.innerHTML = tapeHTML(r.preamble);
  pre.setAttribute('aria-label', `Preamble tape, ${r.preamble.length} rows, impulse 1 first: ${r.preamble.map(c => holesText(c)).join('; ')}`);
  $('qep-table').tHead.innerHTML = bookHeadHTML();
  renderBookPage(0);
  renderRevealed(); updateHintButtons(); updateScore();
}
function renderBookPage(dir) {
  const st = app.state, r = st.round, page = r.pages[app.page], smudgeRead = st.hints.some(h => h.type === 'smudge');
  $('book-page').textContent = `${app.page + 1} of ${r.pages.length}`;
  $('book-date').textContent = pageDate(page.key);
  $('qep-table').tBodies[0].innerHTML = bookBodyHTML(pageRound(r, page), smudgeRead && page.today, {highlight: false});
  $('smudge-note').textContent = smudgeRead ? `${SMUDGE_NOTE} ${hardSmudgeText(r)}` : SMUDGE_NOTE;
  $('page-prev').disabled = app.page === 0; $('page-next').disabled = app.page === r.pages.length - 1;
  const sheet = $('book-scroll'); sheet.classList.remove('turn-next', 'turn-prev');
  if (dir && !reducedMotion()) { void sheet.offsetWidth; sheet.classList.add(dir > 0 ? 'turn-next' : 'turn-prev'); }
}
function turnPage(dir) {
  if (app.mode !== 'hard' || !app.state) return;
  const n = Math.min(app.state.round.pages.length - 1, Math.max(0, app.page + dir)); if (n === app.page) return;
  app.page = n; renderBookPage(dir);
}
function hardOutput(settings) { const r = app.state.round; return crypt(r.cipherCodes, {patterns: r.patterns, start: settings, model: r.model}); }
function showHardTape() {
  const st = app.state, settings = sanitiseWheels(st.ran || st.round.start), codes = hardOutput(settings);
  tape.setRows(codes.map(code => ({code, print: '', control: null})));
  $('out-tape').innerHTML = tapeHTML(codes, {buttons: true, marked: app.marked});
}
function renderRevealed() {
  const st = app.state, chars = revealedChars(st), el = $('revealed-chars');
  el.hidden = !chars.length; el.textContent = chars.length ? `The message starts: ${chars.replace(/ /g, '\u2423')}` : '';
}
function runHard() {
  const st = app.state, r = st.round, settings = {...app.wheels};
  setFeedback('', 'Punching the tape...'); revealTeleprinter(); app.marked = new Set();
  runTape({codes: r.cipherCodes, machine: createMachine({patterns: r.patterns, start: settings, model: r.model}), outputAs: 'tape', onDone: () => {
    if (!app.state.solved) { app.state = {...app.state, ran: settings}; saveRound(); }
    showHardTape();
    setFeedback('', app.state.solved ? 'That is the tape you read.' : "The tape's punched. Read it with the cheat sheet and type what it says. If it reads as nonsense, a wheel is off.");
  }});
}
function checkReading() {
  if (app.mode !== 'hard' || app.run) return;
  const st = app.state; if (st.solved) { showCard(false); return; }
  const {state, result} = submitAnswer(st, $('hard-answer').value);
  if (result.empty) { setFeedback('bad', 'Type what the tape says first.'); return; }
  app.state = state; saveRound(); updateScore(); updateHintButtons();
  if (result.ok) return hardSuccess();
  setFeedback('bad', result.repeat ? "That's the same reading as before, so it's free. Still not right." : `Not right yet. ${result.right} of ${result.of} characters are right where they should be. That cost ${HARD_RULES.wrong} points.`);
}
function checkQep() {
  const st = app.state, {state, result} = guessQep(st, $('qep-guess').value);
  if (!result.valid) { $('qep-guess').setAttribute('aria-invalid', 'true'); setFeedback('bad', 'Type a number from 1 to 99.'); return; }
  $('qep-guess').removeAttribute('aria-invalid'); app.state = state; saveRound(); updateScore(); updateHintButtons();
  $('qep-number').textContent = qepKnown(app.state) || app.state.solved ? pad2(st.round.qep) : '??';
  setFeedback(result.ok ? 'good' : 'bad', result.ok ? `That's it, QEP ${pad2(st.round.qep)}. Now find today's page.` : "That's not what the preamble says. Have another look at the figure shift.");
}
function hardHint(type) {
  const kind = type === 'reveal' ? 'smudge' : type, st = app.state, {state, answer} = useHardHint(st, kind, {settings: app.wheels});
  if (!answer) { setFeedback('', kind === 'smudge' ? "Every figure on today's line is readable." : 'Nothing more to reveal.'); return; }
  app.state = state; saveRound(); updateScore(); updateHintButtons();
  if (kind === 'qep') { $('qep-number').textContent = pad2(answer.qep); setFeedback('', `The preamble reads QEP ${pad2(answer.qep)}. That cost ${HARD_RULES.hint.qep} points.`); }
  if (kind === 'char') { renderRevealed(); setFeedback('', `Character ${answer.index + 1} of the message is ${answer.char === ' ' ? 'a space' : answer.char}. That cost ${HARD_RULES.hint.char} points.`); }
  if (kind === 'smudge') { renderBookPage(0); setFeedback('', hardSmudgeText(st.round)); }
}
function hardSuccess() {
  const st = app.state, plan = rewardPlan(true, {reducedMotion: reducedMotion()});
  app.hardStats = updateHardStats(app.hardStats, st); write('hard:stats', app.hardStats);
  $('qep-number').textContent = pad2(st.round.qep);
  setFeedback('good', 'Message read!! Wheels, book and tape, all by hand.');
  if (plan.fly) {
    const tp = $('screen-game').querySelector('.teleprinter'); tape.fly(); tp.classList.add('tape-fly', 'hard-win'); setTimeout(() => tp.classList.remove('tape-fly', 'hard-win'), 1700);
    const burst = document.createElement('div'); burst.className = 'hard-burst'; burst.setAttribute('aria-hidden', 'true'); document.body.append(burst); setTimeout(() => burst.remove(), 1700);
  }
  if (plan.spin) app.view?.celebrate();
  counter.animateTo(st.score, {from: 0, reducedMotion: !plan.countUp, delay: plan.delay});
  if (plan.delay) setTimeout(() => showCard(true), plan.delay); else showCard(false);
}
function showHardCard(animate) {
  const st = app.state, r = st.round, b = hardBreakdown(st), s = app.hardStats, card = $('decoded-card');
  const streak = s ? `<p class="tiny">Hard mode streak: ${s.streak} day${s.streak === 1 ? '' : 's'}. Best: ${fmt(s.best)} pts.</p>` : '';
  card.className = 'decoded-card hard-card';
  card.innerHTML = `<button type="button" class="card-close" aria-label="Close">&#215;</button><span class="eyebrow">&#10003; Read by hand, hard mode</span><h2 id="decoded-heading" tabindex="-1">QEP ${pad2(r.qep)}</h2><blockquote>${escapeHTML(r.text)}</blockquote><dl>${b.lines.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl><p class="decoded-total"><span>Total</span><span id="card-total">${fmt(st.score)} pts</span></p>${streak}<div class="card-actions"><button type="button" class="primary" data-card="share">Share result</button><button type="button" data-card="copy">Copy</button><button type="button" data-card="normal">Normal mode</button></div><p class="countdown">Next intercept in ${countdown()}.</p><p class="tiny">These messages are made up for the game.</p>${stlSlotHTML('card')}`;
  applyPrintLink(card);
  card.hidden = false;
  card.querySelector('.card-close').addEventListener('click', () => { card.hidden = true; });
  card.querySelector('[data-card=share]').addEventListener('click', () => share(true));
  card.querySelector('[data-card=copy]').addEventListener('click', () => share(false));
  card.querySelector('[data-card=normal]').addEventListener('click', () => { app.difficulty = 'normal'; write('difficulty', 'normal'); startDaily(); });
  if (animate && !reducedMotion()) new ScoreCounter($('card-total')).animateTo(st.score, {from: 0});
  $('decoded-heading').focus({preventScroll: true});
}
function buildCheatSheet() {
  $('cheat-body').innerHTML = CHEAT_SHEET.map(c => `<tr><td><span class="frame mini" aria-hidden="true">${holesHTML(c.code)}</span><span class="sr-only">${holesText(c.code)}</span><code class="dc" aria-hidden="true">${c.holes}</code></td><td>${escapeHTML(c.letter)}</td><td>${escapeHTML(c.figure || 'none')}</td><td><code>${escapeHTML(c.bp)}</code></td></tr>`).join('');
}
/** Keep Tab inside an open dialog, and put focus back where it was when it closes. */
function trapFocus(dialog) {
  dialog.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const f = [...dialog.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')].filter(x => !x.disabled && !x.hidden);
    if (!f.length) return; const first = f[0], last = f.at(-1);
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
}
function openCheat(opener) {
  const d = $('cheat-dialog'); d.showModal(); d.querySelector('[data-close]').focus();
  d.addEventListener('close', () => opener?.focus?.(), {once: true});
}
function bindHard() {
  buildCheatSheet(); trapFocus($('cheat-dialog'));
  document.querySelectorAll('[data-cheat]').forEach(b => b.addEventListener('click', () => openCheat(b)));
  $('page-prev').addEventListener('click', () => turnPage(-1)); $('page-next').addEventListener('click', () => turnPage(1));
  $('qep-guess-go').addEventListener('click', checkQep);
  $('qep-guess').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); checkQep(); } });
  $('hard-answer-go').addEventListener('click', checkReading);
  $('out-tape').addEventListener('click', e => { const f = e.target.closest('[data-frame]'); if (!f) return; const i = Number(f.dataset.frame), on = !app.marked.has(i); if (on) app.marked.add(i); else app.marked.delete(i); f.classList.toggle('read', on); f.setAttribute('aria-pressed', String(on)); });
  // Swipe the book to turn the page, unless the swipe is scrolling a wide table sideways.
  let touch = null; const book = document.querySelector('.qep-book');
  book.addEventListener('touchstart', e => { if (app.mode !== 'hard' || e.touches.length !== 1) return; touch = {x: e.touches[0].clientX, y: e.touches[0].clientY, inTable: Boolean(e.target.closest('#book-scroll'))}; }, {passive: true});
  book.addEventListener('touchend', e => {
    if (!touch) return; const t = e.changedTouches[0], dx = t.clientX - touch.x, dy = t.clientY - touch.y, sc = $('book-scroll'), from = touch; touch = null;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    const dir = dx < 0 ? 1 : -1;
    if (from.inTable && sc.scrollWidth > sc.clientWidth + 1) { const atEnd = dir > 0 ? sc.scrollLeft + sc.clientWidth >= sc.scrollWidth - 2 : sc.scrollLeft <= 1; if (!atEnd) return; }
    turnPage(dir);
  }, {passive: true});
}

/* ---------- Hints, sharing, settings ---------- */
function hint(type) {
  const st = app.state; if (!st || st.solved) return;
  if (type === 'check') { $('check-dialog').showModal(); return; }
  if (app.mode === 'hard') return hardHint(type);
  const {state, answer} = useHint(st, 'reveal', app.wheels);
  if (!answer) { setFeedback('', `Every figure on QEP ${pad2(st.round.qep)} is readable.`); return; }
  app.state = state; if (st.round.mode === 'practice') app.practice = state;
  saveRound(); renderRound();
  setFeedback('', revealText(st.round));
}
function doCheck() {
  const wheel = $('check-select').value, {state, answer} = app.mode === 'hard' ? useHardHint(app.state, 'check', {settings: app.wheels, wheel}) : useHint(app.state, 'check', app.wheels, wheel);
  app.state = state; if (state.round.mode === 'practice') app.practice = state; saveRound(); updateScore();
  $('check-dialog').close();
  setFeedback(answer.right ? 'good' : 'bad', `${WHEEL[wheel].label} is ${answer.right ? 'set right' : 'not right yet'}. That check cost ${RULES.hint.check} points.`);
  const d = document.querySelector(`.dial[data-wheel="${wheel}"]`); d?.classList.remove('flash'); void d?.offsetWidth; d?.classList.add('flash');
}
async function copyText(text) { try { await navigator.clipboard.writeText(text); return true; } catch { return false; } }
async function share(native) {
  const url = new URL('./', location.href).href.replace(/#.*$/, ''), text = app.mode === 'hard' ? hardShareText(app.state, url) : shareText(app.state, url);
  if (native && navigator.share) { try { await navigator.share({title: 'Lorenz', text}); return; } catch (e) { if (e.name === 'AbortError') return; } }
  if (await copyText(text)) { toast('Result copied.'); return; }
  $('share-text').value = text; $('share-dialog').showModal(); $('share-text').select();
}
function toast(msg) { const t = $('toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.timer); toast.timer = setTimeout(() => { t.hidden = true; }, 2200); }
function applySettings() {
  document.body.classList.toggle('reduced-motion', reducedMotion());
  $('motion-setting').checked = Boolean(app.settings.reducedMotion); $('flat-setting').checked = Boolean(app.settings.flat);
  write('settings', app.settings);
}

function bind() {
  document.querySelectorAll('[data-action=title]').forEach(b => b.addEventListener('click', () => { history.replaceState(null, '', location.pathname); show('title'); }));
  $('play-daily').addEventListener('click', () => (app.difficulty === 'hard' ? startHard() : startDaily()));
  document.querySelectorAll('[data-difficulty]').forEach(b => b.addEventListener('click', () => { app.difficulty = b.dataset.difficulty; write('difficulty', app.difficulty); refreshTitle(); }));
  bindHard();
  $('play-practice').addEventListener('click', () => startPractice('random'));
  document.querySelectorAll('#practice-tabs [data-tab]').forEach(b => b.addEventListener('click', () => { if (app.tab === b.dataset.tab) return; stopRun(); app.tab = b.dataset.tab; if (app.tab === 'random') app.state = app.practice; renderTabs(); clearOutput(); syncView(false); location.hash = {random:'practice', encipher:'encipher', chi:'chi'}[app.tab]; }));
  $('practice-tabs').addEventListener('keydown', e => { if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return; const tabs = [...document.querySelectorAll('#practice-tabs [data-tab]')], i = tabs.findIndex(t => t.dataset.tab === app.tab), n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length]; n.click(); n.focus(); });
  document.querySelectorAll('#practice-model [data-model]').forEach(b => b.addEventListener('click', () => { newPractice(b.dataset.model); setFeedback('', `New random settings on the ${b.dataset.model}.`); }));
  $('practice-new').addEventListener('click', () => { newPractice(app.state.round.model); setFeedback('', 'New random settings. Find the QEP number in the book.'); });
  $('run-button').addEventListener('click', onRun);
  $('skip-button').addEventListener('click', () => app.run?.skip());
  $('wheels-reset').addEventListener('click', () => { WHEELS.forEach(w => { app.wheels[w.id] = POSITION_BASE; }); showDials(); wheelsChanged(); });
  document.querySelectorAll('[data-hint]').forEach(b => b.addEventListener('click', () => hint(b.dataset.hint)));
  $('check-go').addEventListener('click', doCheck);
  $('share-copy').addEventListener('click', async () => { $('share-text').select(); if (await copyText($('share-text').value)) toast('Copied.'); else { try { document.execCommand('copy'); toast('Copied.'); } catch { toast('Press Ctrl+C or Cmd+C to copy.'); } } });
  $('printed-copy').addEventListener('click', async () => { if (await copyText(app.lastOut)) toast('Copied.'); else { $('share-text').value = app.lastOut; $('share-dialog').showModal(); } });
  $('chi-copy').addEventListener('click', async () => { const t = $('chi-output').textContent; if (t && await copyText(t)) toast('Copied.'); });
  document.querySelectorAll('[data-io]').forEach(b => b.addEventListener('click', () => { app.io = b.dataset.io; document.querySelectorAll('[data-io]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); $('encipher-input-label').textContent = app.io === 'plain' ? 'Your message' : 'Tape, in Bletchley letters (A to Z and / 3 4 5 8 9)'; if (app.io === 'tape' && app.lastOut && /^[A-Z\/34589 ]+$/.test(app.lastOut)) $('encipher-input').value = app.lastOut; }));
  document.querySelectorAll('[data-chi-io]').forEach(b => b.addEventListener('click', () => { app.chiIo = b.dataset.chiIo; document.querySelectorAll('[data-chi-io]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); $('chi-input-label').textContent = app.chiIo === 'plain' ? 'Your message, in Bletchley letters (a space counts as 9)' : 'Tape, in Bletchley letters (A to Z and / 3 4 5 8 9)'; const out = $('chi-output').textContent; if (app.chiIo === 'tape' && out && /^[A-Z\/34589 ]+$/.test(out)) $('chi-input').value = out; }));
  $('chi-today').addEventListener('click', () => { const p = app.daily.round.patterns; fillChi(Object.fromEntries(CHI.map(id => [id, p[id]])), Object.fromEntries(CHI.map(id => [id, chiValidate()?.start?.[id] || 1]))); syncView(false); toast("Today's chi patterns loaded."); });
  $('chi-random').addEventListener('click', () => { const rng = mulberry32((Math.random() * 2 ** 32) >>> 0); fillChi(Object.fromEntries(CHI.map(id => [id, makePattern(rng, WHEEL[id].size, Math.floor(WHEEL[id].size / 2), 4)])), Object.fromEntries(CHI.map(id => [id, 1 + Math.floor(rng() * WHEEL[id].size)]))); syncView(false); });
  $('chi-example').addEventListener('click', () => { fillChi(CHI_EXAMPLE.patterns, CHI_EXAMPLE.start); $('chi-input').value = CHI_EXAMPLE.plain; document.querySelector('[data-chi-io=plain]').click(); syncView(false); toast(`Worked example from the printable model: ${CHI_EXAMPLE.plain} at 01 01 01 01 01 should come out as ${CHI_EXAMPLE.cipher}.`); });
  $('settings-open').addEventListener('click', () => $('settings-dialog').showModal());
  $('motion-setting').addEventListener('change', e => { app.settings = {...app.settings, reducedMotion: e.target.checked}; applySettings(); });
  $('flat-setting').addEventListener('change', e => { app.settings = {...app.settings, flat: e.target.checked}; applySettings(); loadView(); });
  document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => $(b.dataset.close).close()));
  document.addEventListener('keydown', e => {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || document.querySelector('dialog[open]')) return;
    if (e.target.closest?.('input,textarea,select,[contenteditable]')) return;
    if ((e.key === 'd' || e.key === 'D') && app.screen === 'game') { e.preventDefault(); onRun(); }
    if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && app.screen === 'game' && app.mode === 'hard') { e.preventDefault(); turnPage(e.key === 'ArrowRight' ? 1 : -1); }
  });
  window.addEventListener('hashchange', route);
}
function route() {
  const h = location.hash.slice(1);
  if (h === 'daily' && !(app.screen === 'game' && app.mode === 'daily')) startDaily();
  else if (h === 'hard' && !(app.screen === 'game' && app.mode === 'hard')) { app.difficulty = 'hard'; startHard(); }
  else if (['practice', 'encipher', 'chi'].includes(h)) { const tab = h === 'practice' ? 'random' : h; if (!(app.screen === 'game' && app.mode === 'practice' && app.tab === tab)) startPractice(tab); }
  else if (!h && app.screen !== 'title') show('title');
}
function boot() {
  tape = new Tape($('tape-canvas'), {reducedMotion}); counter = new ScoreCounter($('score-display'));
  app.settings = {...app.settings, ...read('settings', {})};
  app.stats = statsFrom(read('stats', null)?.history || {}, utcDateKey());
  const hs = read('hard:stats', null); app.hardStats = statsFrom(hs && typeof hs.history === 'object' && hs.history ? hs.history : {}, utcDateKey());
  app.difficulty = read('difficulty', 'normal') === 'hard' ? 'hard' : 'normal';
  app.daily = {round: makeRound({mode: 'daily'})};
  buildDials(); buildChi(); bind(); applySettings(); refreshTitle(); applyPrintLink(document);
  if (location.hash) route(); else show('title');
  const later = () => loadView();
  if ('requestIdleCallback' in window) requestIdleCallback(later, {timeout: 1200}); else setTimeout(later, 200);
}
if (typeof document !== 'undefined' && document.getElementById('screen-game')) boot();
