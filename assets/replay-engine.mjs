// Mission Replays: a shared timeline engine and scrub bar. Each replay hands it a mission
// (segments, phases, events) and a draw function; the engine owns the clock, the slider,
// play and pause, speed, the date read out and the phase read out.
// Time is in milliseconds since the Unix epoch, UTC. The slider runs 0..1000 and is mapped onto
// time through segments, so a 71 minute ascent and a five year cruise can share one bar.

export const SLIDER_MAX = 1000;

// segments: [{t0, t1, share}] in order. Shares are normalised.
export function makeScale(segments) {
  const total = segments.reduce((s, g) => s + g.share, 0);
  let acc = 0;
  const segs = segments.map(g => { const a = acc; acc += g.share / total; return { ...g, a, b: acc }; });
  segs[segs.length - 1].b = 1;
  return {
    segs,
    toTime(f) {
      f = Math.min(1, Math.max(0, f));
      const g = segs.find(s => f <= s.b) || segs[segs.length - 1];
      const u = g.b > g.a ? (f - g.a) / (g.b - g.a) : 0;
      return g.t0 + u * (g.t1 - g.t0);
    },
    toFrac(t) {
      if (t <= segs[0].t0) return 0;
      for (const g of segs) if (t <= g.t1) return g.a + (g.b - g.a) * (t - g.t0) / (g.t1 - g.t0 || 1);
      return 1;
    },
    // slider fraction per real second while playing, so each segment takes its share of playLength
    start: segs[0].t0, end: segs[segs.length - 1].t1,
  };
}

export function phaseAt(phases, t) {
  let p = phases[0];
  for (const q of phases) if (t >= q.t) p = q;
  return p;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function fmtDate(t, withTime) {
  const d = new Date(t);
  const s = `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  if (!withTime) return s;
  const p = n => String(n).padStart(2, '0');
  return `${s}, ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} UTC`;
}
export function fmtElapsed(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 86400) { const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, x = s % 60; return `T+${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}`; }
  return `Day ${Math.floor(s / 86400)}`;
}

// Fits a canvas to its box at device pixel ratio. Returns the CSS size.
export function fitCanvas(c) {
  const r = c.getBoundingClientRect(), k = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(1, Math.round(r.width * k)), h = Math.max(1, Math.round(r.height * k));
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  const g = c.getContext('2d'); g.setTransform(k, 0, 0, k, 0, 0);
  return { g, w: r.width, h: r.height };
}

// mission: {segments, phases:[{id,t,name,planned,note}], events:[{t,label,planned}], playLength (s)}
// ui: {slider, play, speed, date, elapsed, phase, status, note, phaseList, root}
// draw(t, phase): called every frame that something changed.
export function createReplay(mission, ui, draw) {
  const scale = makeScale(mission.segments);
  const state = { f: 0, playing: false, speed: 1, last: 0, dirty: true };
  ui.slider.max = SLIDER_MAX; ui.slider.step = 1; ui.slider.value = 0;
  if (ui.phaseList) {
    ui.phaseList.innerHTML = '';
    mission.phases.forEach(p => {
      const li = document.createElement('li'), b = document.createElement('button');
      b.type = 'button'; b.dataset.phase = p.id;
      b.innerHTML = `<span class="rp-ph-name">${p.name}</span><span class="rp-ph-date">${p.when}${p.planned ? ' <em class="rp-planned">planned</em>' : ''}</span>`;
      b.addEventListener('click', () => { api.seek(p.t + 1); api.pause(); });
      li.appendChild(b); ui.phaseList.appendChild(li);
    });
  }
  // event ticks on the bar
  if (ui.ticks) {
    ui.ticks.innerHTML = '';
    mission.phases.forEach(p => { const i = document.createElement('i'); i.style.left = (scale.toFrac(p.t) * 100).toFixed(2) + '%'; i.title = p.name; ui.ticks.appendChild(i); });
  }
  function render() {
    const t = scale.toTime(state.f), p = phaseAt(mission.phases, t);
    ui.slider.value = Math.round(state.f * SLIDER_MAX);
    ui.slider.setAttribute('aria-valuetext', `${fmtDate(t)}, ${p.name}`);
    ui.date.textContent = fmtDate(t, t - scale.start < 864e5);
    ui.elapsed.textContent = fmtElapsed(t - scale.start);
    ui.phase.textContent = p.name;
    ui.status.textContent = p.planned ? 'Planned' : 'Happened';
    ui.status.dataset.planned = p.planned ? '1' : '0';
    if (ui.note) ui.note.textContent = p.note;
    if (ui.root) { ui.root.dataset.phase = p.id; ui.root.dataset.playing = state.playing ? '1' : '0'; }
    if (ui.phaseList) ui.phaseList.querySelectorAll('button').forEach(b => b.setAttribute('aria-current', b.dataset.phase === p.id ? 'step' : 'false'));
    draw(t, p, scale);
  }
  function frame(now) {
    if (state.playing) {
      const dt = Math.min(0.1, (now - (state.last || now)) / 1000);
      state.f += dt * state.speed / mission.playLength;
      if (state.f >= 1) { state.f = 1; api.pause(); }
      state.dirty = true;
    }
    state.last = now;
    if (state.dirty) { state.dirty = false; render(); }
    requestAnimationFrame(frame);
  }
  const api = {
    scale, state,
    seek(t) { state.f = scale.toFrac(t); state.dirty = true; },
    seekFrac(f) { state.f = Math.min(1, Math.max(0, f)); state.dirty = true; },
    play() { if (state.f >= 1) state.f = 0; state.playing = true; ui.play.textContent = 'Pause'; ui.play.setAttribute('aria-pressed', 'true'); state.dirty = true; },
    pause() { state.playing = false; ui.play.textContent = 'Play'; ui.play.setAttribute('aria-pressed', 'false'); state.dirty = true; },
    toggle() { state.playing ? api.pause() : api.play(); },
    time() { return scale.toTime(state.f); },
    redraw() { state.dirty = true; },
  };
  ui.slider.addEventListener('input', () => { state.f = ui.slider.value / SLIDER_MAX; state.dirty = true; });
  ui.play.addEventListener('click', api.toggle);
  if (ui.speed) ui.speed.addEventListener('change', () => { state.speed = +ui.speed.value || 1; });
  document.addEventListener('keydown', e => {
    if (e.target.closest && e.target.closest('input:not([type=range]),select,textarea')) return;
    if (e.key === ' ' && e.target === document.body) { e.preventDefault(); api.toggle(); }
  });
  addEventListener('resize', api.redraw);
  requestAnimationFrame(frame);
  return api;
}
