// Optional sound, off by default: a flap clatter and a chime that grows with rarity. Made with Web Audio, no files.
const KEY = 'callsign:sound';
let ctx = null, last = 0;
export const soundOn = () => { try { return localStorage.getItem(KEY) === 'on'; } catch { return false; } };
export function setSound(on) { try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch {} if (on) audio(); }
function audio() { if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { ctx = null; } } if (ctx && ctx.state === 'suspended') ctx.resume(); return ctx; }
export function clack() {
  if (!soundOn()) return; const a = audio(); if (!a) return; const now = a.currentTime; if (now - last < 0.028) return; last = now;
  const len = Math.floor(a.sampleRate * 0.018), buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  src.buffer = buf; f.type = 'bandpass'; f.frequency.value = 1800 + Math.random() * 900; f.Q.value = 1.2; g.gain.value = 0.22;
  src.connect(f).connect(g).connect(a.destination); src.start(now);
}
const NOTES = {common: [660, 880], uncommon: [587, 740, 880], rare: [523, 659, 784, 1047], legendary: [523, 659, 784, 1047, 1319, 1568]};
export function chime(tier) {
  if (!soundOn()) return; const a = audio(); if (!a) return; const now = a.currentTime + 0.02;
  (NOTES[tier] || NOTES.common).forEach((hz, i) => {
    const o = a.createOscillator(), g = a.createGain(), t = now + i * 0.09;
    o.type = tier === 'legendary' ? 'triangle' : 'sine'; o.frequency.value = hz;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.16, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0008, t + 0.6);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + 0.65);
  });
}
export function thud() {
  if (!soundOn()) return; const a = audio(); if (!a) return; const now = a.currentTime, o = a.createOscillator(), g = a.createGain();
  o.type = 'square'; o.frequency.setValueAtTime(220, now); o.frequency.exponentialRampToValueAtTime(110, now + 0.18);
  g.gain.setValueAtTime(0.08, now); g.gain.exponentialRampToValueAtTime(0.0008, now + 0.2); o.connect(g).connect(a.destination); o.start(now); o.stop(now + 0.22);
}
