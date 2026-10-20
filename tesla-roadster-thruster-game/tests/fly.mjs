import {step} from '../js/physics.js'; import {decide} from './pilot.mjs';
export function fly(w, opts = {}) { let s = {...w.start}, k = {}; for (let i = 0; !s.done && i < 60 * 400; i++) { if (i % (opts.every || 3) === 0) k = decide(w, s); s = step(w, s, k); } return s; }
