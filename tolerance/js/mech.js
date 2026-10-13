/** Tolerance: the puzzle maker. Pure functions, no DOM, so the tests can check every formula.
 *  Every mechanism is ideal (no friction, no slip, massless parts) and uses g = 9.81 m/s². */
export const GUESSES = 6, TOLERANCE = 0.05, LAUNCH = '2026-10-13', G = 9.81;

/** Today's date in London, as YYYY-MM-DD. The day rolls over at London midnight, summer time included. */
export function londonKey(date = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit'}).formatToParts(date).map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}
export const dayNumber = key => Math.round((Date.parse(key + 'T12:00:00Z') - Date.parse(LAUNCH + 'T12:00:00Z')) / 864e5) + 1;
export function hashString(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
export function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const int = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
const pick = (rng, xs) => xs[Math.floor(rng() * xs.length)];
const n = (x, dp = 0) => Number(x).toLocaleString('en-GB', {maximumFractionDigits: dp});

/* Each type: make(rng) gives the values, solve(v) the exact answer, steps(v) the working in plain English. */
export const TYPES = {
  gears: {name: 'Two stage gear train', unit: 'rpm', asks: 'the output shaft speed',
    make: rng => { const a = pick(rng, [12, 15, 18, 20, 24]), b = pick(rng, [36, 40, 45, 48, 60]), c = pick(rng, [12, 15, 16, 20]), d = pick(rng, [30, 32, 40, 48]); return {rpm: pick(rng, [600, 900, 1200, 1450, 1800, 2400]), a, b, c, d}; },
    solve: v => v.rpm * (v.a / v.b) * (v.c / v.d),
    steps: v => [`The first pair: a ${v.a} tooth gear drives a ${v.b} tooth gear, so the middle shaft turns at ${v.a}/${v.b} of the input speed.`,
      `${n(v.rpm)} × ${v.a} ÷ ${v.b} = ${n(v.rpm * v.a / v.b, 1)} rpm on the middle shaft.`,
      `The second pair: ${v.c} teeth drive ${v.d}, so the output turns at ${v.c}/${v.d} of that.`,
      `${n(v.rpm * v.a / v.b, 1)} × ${v.c} ÷ ${v.d} = ${n(TYPES.gears.solve(v), 1)} rpm.`]},
  lever: {name: 'First class lever', unit: 'N', asks: 'the load it can just hold',
    make: rng => ({effort: pick(rng, [50, 80, 100, 120, 150, 200]), a: pick(rng, [0.8, 1, 1.2, 1.5, 2]), b: pick(rng, [0.2, 0.25, 0.3, 0.4, 0.5])}),
    solve: v => v.effort * v.a / v.b,
    steps: v => ['At balance the turning moments about the fulcrum are equal: effort × its distance = load × its distance.',
      `Effort moment: ${n(v.effort)} N × ${v.a} m = ${n(v.effort * v.a, 1)} N m.`,
      `Load = ${n(v.effort * v.a, 1)} N m ÷ ${v.b} m = ${n(TYPES.lever.solve(v), 1)} N.`]},
  pulley: {name: 'Pulley block', unit: 'N', asks: 'the pull needed on the rope',
    make: rng => ({kg: pick(rng, [40, 60, 75, 90, 120, 150, 200]), ropes: int(rng, 2, 6)}),
    solve: v => v.kg * G / v.ropes,
    steps: v => [`The load's weight is mass × g: ${v.kg} kg × 9.81 = ${n(v.kg * G, 1)} N.`,
      `${v.ropes} rope sections hold the moving block, and in an ideal block they share the weight equally.`,
      `Pull = ${n(v.kg * G, 1)} N ÷ ${v.ropes} = ${n(TYPES.pulley.solve(v), 1)} N.`]},
  belt: {name: 'Belt drive', unit: 'rpm', asks: 'the driven pulley speed',
    make: rng => { const d1 = pick(rng, [80, 100, 120, 150, 200]); let d2 = pick(rng, [160, 200, 250, 300, 400]); if (d2 === d1) d2 += 50; return {rpm: pick(rng, [720, 960, 1440, 2880]), d1, d2}; },
    solve: v => v.rpm * v.d1 / v.d2,
    steps: v => ['With no slip, the belt moves at the same speed over both pulleys, so speed × diameter is the same for each.',
      `${n(v.rpm)} rpm × ${v.d1} mm = driven speed × ${v.d2} mm.`,
      `Driven speed = ${n(v.rpm)} × ${v.d1} ÷ ${v.d2} = ${n(TYPES.belt.solve(v), 1)} rpm.`]},
  jack: {name: 'Screw jack', unit: 'N', asks: 'the load it can lift',
    make: rng => ({effort: pick(rng, [20, 30, 40, 50]), r: pick(rng, [150, 200, 250, 300]), pitch: pick(rng, [4, 5, 6, 8, 10])}),
    solve: v => v.effort * 2 * Math.PI * v.r / v.pitch,
    steps: v => ['In one turn of the handle the effort moves round a full circle, and the load rises by one pitch.',
      `Effort distance: 2 × π × ${v.r} mm = ${n(2 * Math.PI * v.r, 1)} mm. Load distance: ${v.pitch} mm.`,
      `Work in equals work out, so load = ${v.effort} N × ${n(2 * Math.PI * v.r, 1)} ÷ ${v.pitch} = ${n(TYPES.jack.solve(v))} N.`]},
  axle: {name: 'Wheel and axle', unit: 'N', asks: 'the load it can just hold',
    make: rng => ({effort: pick(rng, [40, 60, 80, 100]), R: pick(rng, [300, 400, 450, 500, 600]), r: pick(rng, [50, 60, 75, 100])}),
    solve: v => v.effort * v.R / v.r,
    steps: v => ['The wheel and the axle turn together, so the moments balance: effort × wheel radius = load × axle radius.',
      `${v.effort} N × ${v.R} mm = ${n(v.effort * v.R)} N mm.`,
      `Load = ${n(v.effort * v.R)} ÷ ${v.r} mm = ${n(TYPES.axle.solve(v), 1)} N.`]},
  rack: {name: 'Rack and pinion', unit: 'mm', asks: 'how far the rack moves',
    make: rng => ({teeth: pick(rng, [12, 16, 18, 20, 24]), module: pick(rng, [1, 1.5, 2, 2.5, 3]), turns: pick(rng, [0.5, 1, 1.5, 2, 3])}),
    solve: v => v.turns * Math.PI * v.module * v.teeth,
    steps: v => [`The pinion's pitch diameter is module × teeth: ${v.module} × ${v.teeth} = ${n(v.module * v.teeth, 1)} mm.`,
      `One turn rolls the rack along by the pitch circumference: π × ${n(v.module * v.teeth, 1)} = ${n(Math.PI * v.module * v.teeth, 1)} mm.`,
      `${v.turns} turns × ${n(Math.PI * v.module * v.teeth, 1)} mm = ${n(TYPES.rack.solve(v), 1)} mm.`]},
  slope: {name: 'Inclined plane', unit: 'N', asks: 'the push along the slope to hold the load',
    make: rng => ({kg: pick(rng, [50, 80, 100, 150, 200]), L: pick(rng, [3, 4, 5, 6, 8]), h: pick(rng, [0.5, 0.75, 1, 1.2, 1.5])}),
    solve: v => v.kg * G * v.h / v.L,
    steps: v => [`Weight: ${v.kg} kg × 9.81 = ${n(v.kg * G, 1)} N.`,
      `With no friction, the push along the slope × its length equals the weight × the height it rises.`,
      `Push = ${n(v.kg * G, 1)} N × ${v.h} m ÷ ${v.L} m = ${n(TYPES.slope.solve(v), 1)} N.`]},
  worm: {name: 'Worm and wheel', unit: 'rpm', asks: 'the wheel speed',
    make: rng => ({rpm: pick(rng, [960, 1440, 1800, 2880]), starts: pick(rng, [1, 2, 3]), teeth: pick(rng, [30, 40, 45, 50, 60])}),
    solve: v => v.rpm * v.starts / v.teeth,
    steps: v => [`Each turn of a ${v.starts} start worm moves the wheel on by ${v.starts} ${v.starts > 1 ? 'teeth' : 'tooth'}.`,
      `So the wheel turns ${v.starts}/${v.teeth} of a turn for every turn of the worm.`,
      `${n(v.rpm)} × ${v.starts} ÷ ${v.teeth} = ${n(TYPES.worm.solve(v), 1)} rpm.`]},
  hydraulic: {name: 'Hydraulic press', unit: 'N', asks: 'the force on the big piston',
    make: rng => ({effort: pick(rng, [100, 150, 200, 250]), d1: pick(rng, [10, 12, 15, 20]), d2: pick(rng, [50, 60, 75, 80, 100])}),
    solve: v => v.effort * (v.d2 / v.d1) ** 2,
    steps: v => ['The pressure is the same everywhere in the fluid, so force goes up with piston area.',
      `Area goes with diameter squared, so the ratio is (${v.d2} ÷ ${v.d1})² = ${n((v.d2 / v.d1) ** 2, 2)}.`,
      `Force = ${v.effort} N × ${n((v.d2 / v.d1) ** 2, 2)} = ${n(TYPES.hydraulic.solve(v))} N.`]},
  chain: {name: 'Chain drive', unit: 'ratio', asks: 'the speed ratio, input to output',
    make: rng => { const a = pick(rng, [11, 13, 15, 17, 19]); return {a, b: pick(rng, [34, 38, 42, 46, 52])}; },
    solve: v => v.b / v.a,
    steps: v => ['The chain passes the same number of teeth over each sprocket, so speed × teeth is the same for both.',
      `The ${v.a} tooth sprocket has to turn ${v.b} ÷ ${v.a} times for each turn of the ${v.b} tooth one.`,
      `Speed ratio = ${v.b} ÷ ${v.a} = ${n(TYPES.chain.solve(v), 2)} : 1.`]},
};
export const TYPE_IDS = Object.keys(TYPES);

/** A puzzle. Daily ones come from the London date; practice ones from any seed. */
export function makePuzzle({key = londonKey(), seed = null} = {}) {
  const rng = mulberry32(hashString(seed === null ? `tolerance:v1:${key}` : `tolerance:practice:${seed}`));
  // the daily type goes through every type in turn, so no two days running are the same kind
  const type = seed === null ? TYPE_IDS[(dayNumber(key) - 1 + TYPE_IDS.length * 100) % TYPE_IDS.length] : pick(rng, TYPE_IDS);
  const T = TYPES[type], v = T.make(rng);
  return {key, seed, practice: seed !== null, number: dayNumber(key), type, name: T.name, unit: T.unit, asks: T.asks, v, answer: T.solve(v), steps: T.steps(v)};
}

/** 'higher', 'lower' or 'win'. Within 5 % of the true answer either way wins. */
export function judge(answer, guess) {
  if (!Number.isFinite(guess) || guess <= 0) return null;
  if (Math.abs(guess - answer) <= TOLERANCE * answer) return 'win';
  return guess < answer ? 'higher' : 'lower';
}
export function play(state, guess) {
  if (state.done) return state;
  const r = judge(state.puzzle.answer, guess); if (!r) return state;
  const guesses = [...state.guesses, {value: guess, result: r}], won = r === 'win';
  return {...state, guesses, won, done: won || guesses.length >= GUESSES};
}
export const newState = puzzle => ({puzzle, guesses: [], won: false, done: false});
export const fmtAnswer = (x, unit) => unit === 'ratio' ? `${n(x, 2)} : 1` : `${n(x, x < 100 ? 1 : 0)} ${unit}`;

/** The share grid: arrows for higher and lower, a green square for the win. No values, no mechanism. */
export function shareText(state) {
  const p = state.puzzle, row = state.guesses.map(g => g.result === 'win' ? '🟩' : g.result === 'higher' ? '⬆️' : '⬇️').join('');
  return `Tolerance ${p.practice ? 'practice' : '#' + p.number} ${state.won ? state.guesses.length : 'X'}/${GUESSES}\n${row}\nhttps://dexmlabs.app/tolerance/`;
}

/** Stats from the history of daily results: {key: guesses used, or 0 for a loss}. */
export function statsFrom(history) {
  const keys = Object.keys(history).sort(), won = keys.filter(k => history[k] > 0), dist = Array(GUESSES).fill(0);
  won.forEach(k => dist[history[k] - 1]++);
  let best = 0, run = 0, prev = null;
  for (const k of keys) { const next = prev && Date.parse(k) - Date.parse(prev) === 864e5; run = history[k] > 0 ? (next ? run + 1 : 1) : 0; best = Math.max(best, run); prev = k; }
  const last = keys.at(-1), today = londonKey(), yday = londonKey(new Date(Date.now() - 864e5));
  return {played: keys.length, won: won.length, streak: last === today || last === yday ? run : 0, best, dist};
}
