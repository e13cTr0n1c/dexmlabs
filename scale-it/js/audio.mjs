// Small WebAudio voices. Nothing loads from the network. Playback waits for a user gesture.
export function createAudio() {
  let ctx = null;
  let muted = false;
  const ac = () => {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  };
  function envGain(t, dur, peak) {
    const g = ac().createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    return g;
  }
  function tone(freq, dur, type, peak, when = 0) {
    if (muted) return;
    const a = ac();
    const t = a.currentTime + when;
    const o = a.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    const g = envGain(t, dur, peak);
    o.connect(g); g.connect(a.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }
  return {
    setMuted(v) { muted = v; },
    get muted() { return muted; },
    unlock() { try { ac(); } catch (e) {} },
    click() { tone(740, 0.05, 'square', 0.03); },
    whoosh() {
      if (muted) return;
      const a = ac();
      const t = a.currentTime;
      const frames = Math.floor(a.sampleRate * 0.35);
      const buf = a.createBuffer(1, frames, a.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
      const src = a.createBufferSource();
      src.buffer = buf;
      const filter = a.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(240, t);
      filter.frequency.exponentialRampToValueAtTime(900, t + 0.28);
      filter.Q.value = 0.7;
      const g = a.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.08, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
      src.connect(filter); filter.connect(g); g.connect(a.destination);
      src.start(t);
    },
    tick(p) { tone(380 + p * 640, 0.045, 'sine', 0.035); },
    resolve(strong) {
      const chord = strong ? [523.25, 659.25, 783.99, 1046.5] : [392, 493.88, 587.33];
      chord.forEach((f, i) => tone(f, strong ? 0.55 : 0.4, 'sine', strong ? 0.05 : 0.035, i * 0.035));
    }
  };
}
