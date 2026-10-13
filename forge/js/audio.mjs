let ctx = null;
let muted = false;
function setMuted(next) {
  muted = next;
}
function unlockAudio() {
  const AC = window.AudioContext ?? window.webkitAudioContext;
  if (!AC) return;
  if (!ctx) ctx = new AC();
  if (ctx.state === "suspended") void ctx.resume();
}
function tone(freq, when, dur, type, gain) {
  if (!ctx || muted || ctx.state !== "running") return;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, when);
  amp.gain.setValueAtTime(1e-4, when);
  amp.gain.exponentialRampToValueAtTime(Math.max(2e-4, gain), when + 0.012);
  amp.gain.exponentialRampToValueAtTime(1e-4, when + dur);
  osc.connect(amp);
  amp.connect(ctx.destination);
  osc.start(when);
  osc.stop(when + dur + 0.02);
}
const sfx = {
  place() {
    if (!ctx) return;
    tone(240, ctx.currentTime, 0.05, "square", 0.04);
  },
  run() {
    if (!ctx) return;
    tone(120, ctx.currentTime, 0.09, "sawtooth", 0.045);
    tone(240, ctx.currentTime + 0.06, 0.08, "square", 0.03);
  },
  hit(mag = 4) {
    if (!ctx) return;
    tone(80 + Math.min(40, mag * 6), ctx.currentTime, 0.07, "triangle", 0.06);
  },
  success() {
    if (!ctx) return;
    const t = ctx.currentTime;
    tone(523, t, 0.09, "square", 0.045);
    tone(659, t + 0.09, 0.09, "square", 0.045);
    tone(784, t + 0.18, 0.16, "square", 0.04);
  },
  fail() {
    if (!ctx) return;
    tone(140, ctx.currentTime, 0.2, "sawtooth", 0.05);
    tone(90, ctx.currentTime + 0.08, 0.18, "triangle", 0.04);
  }
};
export {
  setMuted,
  sfx,
  unlockAudio
};
