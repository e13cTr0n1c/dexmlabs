import {
  EPOCH_MS, countdown, elapsedParts, distanceKm, distanceMiles, distanceAu,
  lightTimeSeconds, formatClock, morseEvents, loopGap, flashAllowed,
} from './model.mjs';

const $ = (id) => document.getElementById(id);
const kmFmt = new Intl.NumberFormat('en-GB');
const auFmt = new Intl.NumberFormat('en-GB', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
const pad = (n) => String(n).padStart(2, '0');

let consented = false;
let soundOnly = false;
let running = false;
let raf = 0;
let audioTimer = 0;
let audioCtx = null;

function reducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function fill(parts) {
  $('cd-d').textContent = pad(parts.days);
  $('cd-h').textContent = pad(parts.hours);
  $('cd-m').textContent = pad(parts.minutes);
  $('cd-s').textContent = pad(parts.seconds);
}

function render(now = Date.now()) {
  const left = countdown(now);
  const passed = left.passed;
  $('count-label').textContent = passed ? 'Time since the mark' : 'Time until one light day';
  fill(passed ? elapsedParts(now) : left);
  $('passed').hidden = !passed;
  $('km').textContent = kmFmt.format(Math.round(distanceKm(now))) + ' km';
  $('mi').textContent = kmFmt.format(Math.round(distanceMiles(now))) + ' miles';
  $('au').textContent = auFmt.format(distanceAu(now)) + ' AU';
  $('lt').textContent = formatClock(lightTimeSeconds(now));
}

function setLamp(on) {
  $('flash-layer').classList.toggle('on', on);
}

function endRun() {
  running = false;
  cancelAnimationFrame(raf);
  clearTimeout(audioTimer);
  setLamp(false);
  $('flash').setAttribute('aria-pressed', 'false');
  $('stop').hidden = true;
}

function stopFlash() {
  endRun();
  if (audioCtx) {
    audioCtx.close().catch(() => {});
    audioCtx = null;
  }
}

function beep(ctx, t, dur) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const attack = Math.min(0.008, dur / 4);
  const release = Math.min(0.012, dur / 4);
  osc.type = 'sine';
  osc.frequency.value = 680;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.07, t + attack);
  gain.gain.setValueAtTime(0.07, Math.max(t + attack, t + dur - release));
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function startFlash(allowFlash) {
  stopFlash();
  running = true;
  const word = morseEvents('VGR');
  const withGap = word.concat([loopGap()]);
  const wordMs = word.reduce((sum, ev) => sum + ev.ms, 0);
  const loopMs = withGap.reduce((sum, ev) => sum + ev.ms, 0);
  const lead = 50;
  const t0 = performance.now() + lead;

  function markAt(list, elapsed) {
    let acc = 0;
    for (const ev of list) {
      if (elapsed < acc + ev.ms) return ev.on;
      acc += ev.ms;
    }
    return false;
  }

  function frame(now) {
    if (!running) return;
    const looping = $('loop').checked;
    const elapsed = now - t0;
    if (elapsed < 0) {
      setLamp(false);
      raf = requestAnimationFrame(frame);
      return;
    }
    if (!looping && elapsed >= wordMs) {
      endRun();
      return;
    }
    const list = looping ? withGap : word;
    const span = looping ? loopMs : wordMs;
    const t = looping ? elapsed % span : elapsed;
    setLamp(allowFlash && markAt(list, t));
    raf = requestAnimationFrame(frame);
  }

  function schedule() {
    if (!running || !audioCtx) return;
    const list = $('loop').checked ? withGap : word;
    let at = audioCtx.currentTime + lead / 1000;
    const origin = at;
    for (const ev of list) {
      const dur = ev.ms / 1000;
      if (ev.on) beep(audioCtx, at, dur);
      at += dur;
    }
    audioTimer = setTimeout(() => {
      if (running && $('loop').checked) schedule();
    }, Math.max(0, (at - origin) * 1000 - 40));
  }

  raf = requestAnimationFrame(frame);
  try {
    audioCtx = new AudioContext();
    schedule();
  } catch (err) {
    audioCtx = null;
  }
  $('flash').setAttribute('aria-pressed', 'true');
  $('stop').hidden = false;
}

function begin() {
  const flash = flashAllowed(reducedMotion(), consented) && !soundOnly;
  $('ask').hidden = true;
  startFlash(flash);
}

$('flash').addEventListener('click', () => {
  if (running) return;
  if (reducedMotion() && !consented && !soundOnly) {
    $('ask').hidden = false;
    $('flash-yes').focus();
    return;
  }
  begin();
});

$('flash-yes').addEventListener('click', () => {
  consented = true;
  soundOnly = false;
  begin();
});

$('sound-only').addEventListener('click', () => {
  soundOnly = true;
  consented = false;
  $('flash').textContent = 'Play beeps';
  begin();
});

$('flash-no').addEventListener('click', () => {
  $('ask').hidden = true;
  $('flash').focus();
});

$('stop').addEventListener('click', stopFlash);

document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape' && running) stopFlash();
});

render();
setInterval(() => render(), 250);
