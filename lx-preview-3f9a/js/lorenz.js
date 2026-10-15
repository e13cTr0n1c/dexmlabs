/** Lorenz SZ40/42 cipher core. Pure functions, no DOM, so the tests run in plain Node.
 *
 * CONVENTIONS (all in one place; chi only mode and the printable model use the same ones)
 *  BIT_ORDER      Impulse 1 is the most significant bit of a 5 bit code. E (x....) is 16, T (....x) is 1.
 *  MARK / SPACE   A cross (x), a hole in the tape, a raised cam = 1. A dot (.), no hole, a lowered cam = 0.
 *  POSITION_BASE  Wheel positions are numbered from 1, as on the wheel rims (01 to 41 on chi 1 and so on).
 *                 Position p means character p of the cam pattern (written left to right) is the one being read.
 *  Pattern text   A cam pattern is written as a string of x and . (or 1 and 0), cam 1 first.
 *
 * MOTOR LOGIC, as described in the General Report on Tunny (Good, Michie and Timms, 1945), section on motors.
 * For every character:
 *  1. Read every wheel at its current position (nothing has moved yet).
 *  2. Key = chi (5 bits) XOR psi (5 bits). Cipher = plain XOR key, so the same settings decipher.
 *  3. Basic motor BM = the cam of mu37 at its current position.
 *     Limitation LIM: SZ40 has none (treated as a cross). SZ42A with chi 2 one back uses the cam of chi 2
 *     one position back, which is the chi 2 cam read for the previous character.
 *     Total motor TM is a dot (psi wheels stand still) only when BM is a dot and LIM is a cross.
 *     Otherwise TM is a cross. With no limitation that means TM = BM.
 *  4. Then everything steps together: the five chi wheels always move on one; the five psi wheels all
 *     move on one if TM is a cross; mu37 moves on one if mu61 read a cross in step 1; mu61 always moves on one.
 */
export const BIT_ORDER = 'impulse1-msb';
export const MARK = 1;
export const SPACE = 0;
export const POSITION_BASE = 1;

/** ITA2 by 5 bit value (impulse 1 = MSB), written in Bletchley Park's notation:
 *  / = all dots (blank), 9 = space, 3 = carriage return, 4 = line feed, 5 = figure shift, 8 = letter shift. */
export const BP = Object.freeze(['/', 'T', '3', 'O', '9', 'H', 'N', 'M', '4', 'L', 'R', 'G', 'I', 'P', 'C', 'V',
  'E', 'Z', 'D', 'B', 'S', 'Y', 'F', 'X', 'A', 'W', 'J', '5', 'U', 'Q', 'K', '8']);
/** What each code prints in figure shift: ITA2, with the UK national choices for F, G and H (%, @, £) as in the
 *  table in the General Report on Tunny. D and J print nothing in figure shift: they're FIGURE_CONTROLS. */
export const FIGURES = Object.freeze({T:'5',O:'9',H:'£',N:',',M:'.',L:')',R:'4',G:'@',I:'8',P:'0',C:':',V:'=',
  E:'3',Z:'+',D:'',B:'?',S:"'",Y:'6',F:'%',X:'/',A:'-',W:'2',J:'',U:'7',Q:'1',K:'('});
/** Figure shift D and J are machine functions, not characters: D asks the other end's answerback "Who are you?"
 *  (WRU) and J rings the bell. Neither prints anything. */
export const FIGURE_CONTROLS = Object.freeze({D:'Who are you? (WRU)', J:'Bell'});
export const SHIFT = Object.freeze({FIGS: 27, LTRS: 31, SPACE: 4, CR: 2, LF: 8, NULL: 0});
const CODE_OF = Object.freeze(Object.fromEntries(BP.map((c, i) => [c, i])));
const FIG_CODE = Object.freeze(Object.fromEntries(Object.entries(FIGURES).filter(([, f]) => f).map(([l, f]) => [f, CODE_OF[l]])));

export const codeOf = name => { const c = CODE_OF[String(name).toUpperCase()]; if (c === undefined) throw new RangeError(`Not a teleprinter character: ${name}`); return c; };
export const nameOf = code => BP[code & 31];
/** [impulse1..impulse5] for a code, using BIT_ORDER. */
export const bitsOf = code => [4, 3, 2, 1, 0].map(s => (code >> s) & 1);
export const codeFromBits = bits => bits.reduce((v, b) => (v << 1) | (b ? 1 : 0), 0);
export const dotsCrosses = code => bitsOf(code).map(b => b === MARK ? 'x' : '.').join('');

/** The twelve wheels in the order they stand on the machine, left to right as you face it:
 *  psi 1 to 5, the two motor wheels (mu37 then mu61), chi 1 to 5. Letters A to M are the German wheel names. */
export const WHEELS = Object.freeze([
  {id:'psi1',group:'psi',size:43,label:'ψ1',german:'A',impulse:1},{id:'psi2',group:'psi',size:47,label:'ψ2',german:'B',impulse:2},
  {id:'psi3',group:'psi',size:51,label:'ψ3',german:'C',impulse:3},{id:'psi4',group:'psi',size:53,label:'ψ4',german:'D',impulse:4},
  {id:'psi5',group:'psi',size:59,label:'ψ5',german:'E',impulse:5},
  {id:'mu37',group:'mu',size:37,label:'μ37',german:'F'},{id:'mu61',group:'mu',size:61,label:'μ61',german:'G'},
  {id:'chi1',group:'chi',size:41,label:'χ1',german:'H',impulse:1},{id:'chi2',group:'chi',size:31,label:'χ2',german:'I',impulse:2},
  {id:'chi3',group:'chi',size:29,label:'χ3',german:'K',impulse:3},{id:'chi4',group:'chi',size:26,label:'χ4',german:'L',impulse:4},
  {id:'chi5',group:'chi',size:23,label:'χ5',german:'M',impulse:5}]);
export const WHEEL = Object.freeze(Object.fromEntries(WHEELS.map(w => [w.id, w])));
export const CHI = ['chi1','chi2','chi3','chi4','chi5'];
export const PSI = ['psi1','psi2','psi3','psi4','psi5'];
export const MODELS = Object.freeze({SZ40:'SZ40', SZ42A:'SZ42A'});

/** Parse a cam pattern. Accepts x/. or 1/0 (also X, o, *, - for dot), spaces and | ignored. */
export function parsePattern(text, size) {
  const clean = String(text ?? '').replace(/[\s|,_]/g, '');
  const bits = [];
  for (const ch of clean) {
    if (ch === 'x' || ch === 'X' || ch === '1' || ch === '*') bits.push(MARK);
    else if (ch === '.' || ch === '0' || ch === 'o' || ch === 'O' || ch === '-') bits.push(SPACE);
    else return {ok:false, error:`"${ch}" isn't a cam. Use x or 1 for a raised cam and . or 0 for a lowered one.`};
  }
  if (size && bits.length !== size) return {ok:false, error:`This wheel has ${size} cams and you've given ${bits.length}.`, bits};
  return {ok:true, bits};
}
export const patternString = bits => bits.map(b => b ? 'x' : '.').join('');

export function checkPosition(value, size) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < POSITION_BASE || n > size - 1 + POSITION_BASE) return {ok:false, error:`Use a whole number from ${POSITION_BASE} to ${size - 1 + POSITION_BASE}.`};
  return {ok:true, value:n};
}

/** Total motor from basic motor and limitation (1 = cross = go). */
export const totalMotor = (bm, lim) => (bm === SPACE && lim === MARK) ? SPACE : MARK;

/** Build a running machine. patterns: {wheelId: bits[]}; start: {wheelId: position from POSITION_BASE}. */
export function createMachine({patterns, start, model = MODELS.SZ40}) {
  for (const w of WHEELS) {
    if (!patterns?.[w.id] || patterns[w.id].length !== w.size) throw new RangeError(`Pattern for ${w.id} must have ${w.size} cams`);
    if (!checkPosition(start?.[w.id], w.size).ok) throw new RangeError(`Start position for ${w.id} is out of range`);
  }
  if (!MODELS[model]) throw new RangeError(`Unknown model ${model}`);
  const pos = Object.fromEntries(WHEELS.map(w => [w.id, start[w.id] - POSITION_BASE]));
  let count = 0;
  const read = id => patterns[id][pos[id]];
  return {
    model,
    get count() { return count; },
    /** Current positions, numbered from POSITION_BASE. */
    positions() { return Object.fromEntries(WHEELS.map(w => [w.id, pos[w.id] + POSITION_BASE])); },
    /** Produce one key character and step the wheels. Returns everything the views need. */
    step() {
      const before = this.positions();
      const chi = codeFromBits(CHI.map(read)), psi = codeFromBits(PSI.map(read));
      const key = chi ^ psi;
      const bm = read('mu37'), m61 = read('mu61');
      const lim = model === MODELS.SZ42A ? patterns.chi2[(pos.chi2 - 1 + 31) % 31] : MARK;
      const tm = totalMotor(bm, lim);
      for (const id of CHI) pos[id] = (pos[id] + 1) % WHEEL[id].size;
      if (tm === MARK) for (const id of PSI) pos[id] = (pos[id] + 1) % WHEEL[id].size;
      if (m61 === MARK) pos.mu37 = (pos.mu37 + 1) % 37;
      pos.mu61 = (pos.mu61 + 1) % 61;
      count++;
      return {index: count - 1, chi, psi, key, bm, m61, lim, tm, psiMoved: tm === MARK, mu37Moved: m61 === MARK, before, after: this.positions()};
    }
  };
}

/** XOR every code with the machine's key. Encipher and decipher are the same operation. */
export function crypt(codes, opts) {
  const m = createMachine(opts);
  return codes.map(c => c ^ m.step().key);
}
export function keystream(length, opts) { const m = createMachine(opts); return Array.from({length}, () => m.step()); }

/** Chi only: the five chi wheels on their own, key = chi. Same conventions as above. */
export function createChiMachine({patterns, start}) {
  for (const id of CHI) {
    if (!patterns?.[id] || patterns[id].length !== WHEEL[id].size) throw new RangeError(`Pattern for ${id} must have ${WHEEL[id].size} cams`);
    if (!checkPosition(start?.[id], WHEEL[id].size).ok) throw new RangeError(`Start position for ${id} is out of range`);
  }
  const pos = Object.fromEntries(CHI.map(id => [id, start[id] - POSITION_BASE]));
  let count = 0;
  return {
    get count() { return count; },
    positions() { return Object.fromEntries(CHI.map(id => [id, pos[id] + POSITION_BASE])); },
    step() {
      const before = this.positions();
      const chi = codeFromBits(CHI.map(id => patterns[id][pos[id]]));
      for (const id of CHI) pos[id] = (pos[id] + 1) % WHEEL[id].size;
      count++;
      return {index: count - 1, chi, psi: 0, key: chi, bm: null, m61: null, lim: null, tm: null, psiMoved: false, mu37Moved: false, before, after: this.positions()};
    }
  };
}
export function chiCrypt(codes, opts) { const m = createChiMachine(opts); return codes.map(c => c ^ m.step().key); }

/** Plain text to teleprinter codes, starting in letter shift. Figures are wrapped in 5 ... 8 as operators did.
 *  Newlines become spaces (the receiving teleprinter printed on to a strip). Anything else unsupported is dropped. */
export function encodeText(text) {
  const out = []; const dropped = []; let figs = false;
  for (const raw of String(text).toUpperCase().replace(/[\r\n\t]+/g, ' ')) {
    if (raw === ' ') { out.push(SHIFT.SPACE); continue; }
    if (/[A-Z]/.test(raw)) { if (figs) { out.push(SHIFT.LTRS); figs = false; } out.push(CODE_OF[raw]); continue; }
    if (FIG_CODE[raw] !== undefined) { if (!figs) { out.push(SHIFT.FIGS); figs = true; } out.push(FIG_CODE[raw]); continue; }
    dropped.push(raw);
  }
  if (figs) out.push(SHIFT.LTRS);
  return Object.assign(out, {dropped});
}
/** A teleprinter that starts in letter shift. Feed it codes one at a time; it says what it printed. */
export function createPrinter() {
  let figs = false;
  return c => {
    const n = BP[c & 31];
    if (c === SHIFT.FIGS) { figs = true; return {code:c, bp:n, print:'', control:'FIGS'}; }
    if (c === SHIFT.LTRS) { figs = false; return {code:c, bp:n, print:'', control:'LTRS'}; }
    if (c === SHIFT.SPACE) return {code:c, bp:n, print:' ', control:null};
    if (c === SHIFT.CR || c === SHIFT.LF || c === SHIFT.NULL) return {code:c, bp:n, print:'', control:{2:'CR',8:'LF',0:'NULL'}[c]};
    if (figs && FIGURE_CONTROLS[n]) return {code:c, bp:n, print:'', control: n === 'D' ? 'WRU' : 'BELL'};
    return {code:c, bp:n, print: figs ? (FIGURES[n] || '') : n, control:null};
  };
}
/** Codes to printed text, character by character. */
export function printCodes(codes) { const p = createPrinter(); return codes.map(p); }
export const decodeText = codes => printCodes(codes).map(p => p.print).join('');
export const toBP = codes => codes.map(nameOf).join('');
/** Bletchley notation back to codes. Spaces and line breaks in the input are ignored (they're just layout). */
export function fromBP(text) {
  const out = [];
  for (const ch of String(text).toUpperCase()) {
    if (/\s/.test(ch)) continue;
    const c = CODE_OF[ch];
    if (c === undefined) return {ok:false, error:`"${ch}" isn't in the Bletchley alphabet. Use A to Z and / 3 4 5 8 9.`};
    out.push(c);
  }
  return {ok:true, codes:out};
}
/** Group tape text into fives for display, as intercept sheets often were. */
export const groups = (s, n = 5) => s.match(new RegExp(`.{1,${n}}`, 'g'))?.join(' ') ?? '';
