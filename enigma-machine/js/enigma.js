/** Enigma I, as used by the German Army and Air Force: rotors I to V with their real wirings and turnover
 *  notches, reflector B, ring settings (Ringstellung), plugboard (Steckerbrett) and the double step. Pure code. */
export const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const ROTORS = {
  I: {wiring: 'EKMFLGDQVZNTOWYHXUSPAIBRCJ', notch: 'Q'},
  II: {wiring: 'AJDKSIRUXBLHWTMCQGZNPYFVOE', notch: 'E'},
  III: {wiring: 'BDFHJLCPRTXVZNYEIWGAKMUSQO', notch: 'V'},
  IV: {wiring: 'ESOVPZJAYQUIRHXLNFTGKDCMWB', notch: 'J'},
  V: {wiring: 'VZBRGITYUPSDNHLXAWMJQOFECK', notch: 'Z'},
};
export const REFLECTOR_B = 'YRUHQSLDPXNGOKMIEBFZCWVJAT';
const idx = c => c.charCodeAt(0) - 65, mod = n => ((n % 26) + 26) % 26;

/** Plugboard pairs from text like "AB CD EF". Throws on a letter used twice. */
export function parsePlugs(text = '') {
  const map = [...A].map((_, i) => i), used = new Set();
  for (const pair of String(text).toUpperCase().match(/[A-Z]{2}/g) || []) {
    const [a, b] = [idx(pair[0]), idx(pair[1])];
    if (a === b || used.has(a) || used.has(b)) throw new Error(`The plug ${pair} clashes with another cable.`);
    used.add(a); used.add(b); map[a] = b; map[b] = a;
  }
  return map;
}

/** A machine. `rotors` left to right, e.g. ['I','II','III']; `rings` and `positions` as letters, left to right. */
export function createMachine({rotors = ['I', 'II', 'III'], rings = 'AAA', positions = 'AAA', plugs = ''} = {}) {
  const r = rotors.map(n => { const w = [...ROTORS[n].wiring].map(idx), inv = []; w.forEach((o, i) => { inv[o] = i; }); return {w, inv, notch: idx(ROTORS[n].notch)}; });
  const ring = [...rings.toUpperCase()].map(idx), pos = [...positions.toUpperCase()].map(idx), plug = parsePlugs(plugs), refl = [...REFLECTOR_B].map(idx);
  const through = (k, c, back) => { const s = pos[k] - ring[k], t = (back ? r[k].inv : r[k].w)[mod(c + s)]; return mod(t - s); };
  function step() {
    // the middle rotor steps when the right one is at its notch, and also steps itself (the double step) when it is at its own notch
    const midAtNotch = pos[1] === r[1].notch, rightAtNotch = pos[2] === r[2].notch;
    if (midAtNotch) { pos[0] = mod(pos[0] + 1); pos[1] = mod(pos[1] + 1); }
    else if (rightAtNotch) pos[1] = mod(pos[1] + 1);
    pos[2] = mod(pos[2] + 1);
  }
  function press(ch) {
    step(); let c = plug[idx(ch)];
    for (let k = 2; k >= 0; k--) c = through(k, c, false);
    c = refl[c];
    for (let k = 0; k < 3; k++) c = through(k, c, true);
    return A[plug[c]];
  }
  return {press, step, get positions() { return pos.map(p => A[p]).join(''); }, type: text => [...String(text).toUpperCase()].filter(c => c >= 'A' && c <= 'Z').map(press).join('')};
}
export const crypt = (settings, text) => createMachine(settings).type(text);
