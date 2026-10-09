/** The "Visual demonstration" speed: one character at a time, through the chi wheels, the psi wheels and onto the tape.
 *  The first few characters go slowly, stage by stage, then the rest of the message speeds up, so the whole run
 *  takes about 13 seconds. All the bit maths here comes straight from the machine's own step in lorenz.js. */
import {bitsOf, nameOf} from './lorenz.js';

export const DEMO = Object.freeze({totalMs: 13000, slowChars: 3, slowShare: 0.7, stages: 5});

/** Timing for a message of n characters: k slow characters of `perMs` each (split into `stageMs` stages),
 *  then the rest at `fastMs` each. The two parts add up to DEMO.totalMs. */
export function demoSchedule(n, {totalMs = DEMO.totalMs, slowChars = DEMO.slowChars, slowShare = DEMO.slowShare, stages = DEMO.stages} = {}) {
  const k = Math.max(0, Math.min(slowChars, n)), fast = n - k;
  const slowMs = fast > 0 ? totalMs * slowShare : totalMs;
  const perMs = k ? slowMs / k : 0, fastMs = fast ? (totalMs - slowMs) / fast : 0;
  return {n, k, perMs, stageMs: perMs / stages, slowMs: k ? slowMs : 0, fastMs, totalMs: k * perMs + fast * fastMs};
}

/** Where we are at time t (ms since the start): {index, stage} for the slow part, or {index, stage: 5, fast: true}. */
export function demoAt(plan, t) {
  if (t < plan.slowMs) { const index = Math.min(plan.k - 1, Math.floor(t / plan.perMs)); return {index, stage: Math.min(DEMO.stages, Math.floor((t - index * plan.perMs) / plan.stageMs) + 1), fast: false}; }
  return {index: Math.min(plan.n - 1, plan.k + Math.floor((t - plan.slowMs) / (plan.fastMs || 1))), stage: DEMO.stages, fast: true};
}

/** Everything the panel shows for one character `code` and the machine's step `s`. */
export function demoModel(code, s, {hideOut = false, chiOnly = false} = {}) {
  const afterChi = code ^ s.chi, out = afterChi ^ s.psi;
  return {
    in: {code, name: nameOf(code), bits: bitsOf(code)},
    chi: {code: s.chi, bits: bitsOf(s.chi)},
    afterChi: {code: afterChi, bits: bitsOf(afterChi)},
    psi: {code: s.psi, bits: bitsOf(s.psi)},
    afterPsi: {code: out, bits: bitsOf(out)},
    out: {code: out, name: hideOut ? '?' : nameOf(out), bits: bitsOf(out)},
    hideOut, chiOnly, psiMoved: Boolean(s.psiMoved),
    motor: chiOnly ? 'No psi wheels in chi only mode, so this adds nothing.' : s.psiMoved ? 'The motor lets psi step on after this one.' : 'The motor holds psi still for the next one.'
  };
}

const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const bits = (b, cls = '') => `<span class="demo-bits ${cls}">${b.map(x => `<i class="${x ? 'x' : 'd'}">${x ? 'x' : '.'}</i>`).join('')}</span>`;
const LABELS = ['In', 'Add chi', 'Add psi', 'Out', 'Wheels turn'];

/** The demonstration drawn on the machine itself: one flag above each wheel set, laid out left to right as the
 *  wheels are (psi, motor, chi). The character comes in at the chi wheels, crosses to the psi wheels and goes out
 *  onto the tape; the motor flag says whether psi steps. Rows past the stage are there but hidden, so nothing jumps. */
export function demoHTML(m, stage, {index = 0, total = 0, fast = false} = {}) {
  const now = n => stage === n && !fast;
  const row = (n, label, body) => `<div class="demo-row${stage >= n ? ' on' : ''}${now(n) ? ' now' : ''}" data-stage="${n}"><span class="demo-label">${label}</span>${body}</div>`;
  const flag = (set, name, stages, body) => `<div class="demo-flag${stages.some(now) ? ' now' : ''}${stage >= stages[0] ? ' on' : ''}" data-set="${set}"><p class="demo-set">${name}</p>${body}</div>`;
  const motor = m.chiOnly ? 'No psi wheels' : m.psiMoved ? 'Psi steps on' : 'Psi holds still';
  return `<p class="demo-head"><span>Character ${index + 1} of ${total}</span><span>${fast ? 'Speeding up' : `Step ${Math.min(stage, 5)} of 5: ${LABELS[Math.min(stage, 5) - 1]}`}</span></p><div class="demo-flags">` +
    flag('psi', 'Psi wheels', [3, 4],
      row(3, '+ psi', `${bits(m.psi.bits, 'psi')}<span class="demo-eq">=</span>${bits(m.afterPsi.bits, 'after-psi')}`) +
      row(4, `Out <b class="demo-char" data-part="out">${esc(m.out.name)}</b>`, `${bits(m.out.bits, 'out')}<small>${m.hideOut ? 'punched on the tape' : 'to the printer'}</small>`)) +
    flag('mu', 'Motor', [3, 5], `<p class="demo-motor${stage >= 3 ? ' on' : ''}" title="${esc(m.motor)}">${motor}</p>` +
      row(5, 'Turn', `<small>${m.chiOnly ? 'Chi steps' : m.psiMoved ? 'Chi and psi step' : 'Chi steps'}</small>`)) +
    flag('chi', 'Chi wheels', [1, 2],
      row(1, `In <b class="demo-char" data-part="in">${esc(m.in.name)}</b>`, bits(m.in.bits, 'in')) +
      row(2, '+ chi', `${bits(m.chi.bits, 'chi')}<span class="demo-eq">=</span>${bits(m.afterChi.bits, 'after-chi')}`)) +
    `</div>`;
}

/** Read the bits back out of the panel, for the tests. */
export function readPanel(root) {
  const get = cls => [...root.querySelectorAll(`.demo-bits.${cls} i`)].map(i => i.textContent === 'x' ? 1 : 0);
  return {in: get('in'), chi: get('chi'), afterChi: get('after-chi'), psi: get('psi'), afterPsi: get('after-psi'), out: get('out'), outName: root.querySelector('[data-part=out]')?.textContent};
}
