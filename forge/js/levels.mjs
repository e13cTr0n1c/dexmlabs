const slider = (id, label, min, max, step, fallback, format) => ({ id, label, min, max, step, default: fallback, format });
const kit = (kind, label, count, w, h, extra) => ({
  kind,
  label,
  count,
  w,
  h,
  r: extra?.r ?? 0,
  rotatable: extra?.rotatable ?? false,
  lockY: extra?.lockY ?? null
});
const LEVELS = [
  {
    id: "drop",
    index: 1,
    title: "The long way down",
    idea: "Gravity on a slope",
    formula: "a = g \xB7 sin \u03B8",
    brief: "Set the ramp and get the ball into the bay. Too steep and it flies the gap. Too flat and it walks off the end still high.",
    lesson: "Gravity still points straight down. The ramp only keeps the part along the slope, g\xB7sin \u03B8. Steeper is faster, and faster is how you miss a bay.",
    par: "Roll it in. Don't launch it.",
    controls: [slider("angle", "Ramp angle", 18, 62, 0.5, 34, (v) => `${v.toFixed(0)}\xB0`)],
    kit: [],
    limit: 12
  },
  {
    id: "grit",
    index: 2,
    title: "Stop on the bay",
    idea: "Friction",
    formula: "d \u2248 v\xB2 / (2 \u03BC g)",
    brief: "The crate is already moving on ice. Lay grit so it stops inside the bay. Past the bay is the pit.",
    lesson: "Kinetic friction spends speed at a rate set by \u03BC. Stopping distance grows with the square of speed \u2014 twice as fast needs four times the grit.",
    par: "One pad, and the stop inside the inner bay.",
    controls: [slider("mu", "Grit \u03BC", 0.25, 0.9, 0.01, 0.45, (v) => v.toFixed(2))],
    kit: [kit("pad", "Grit pad", 2, 2.4, 0.16, { lockY: 0.62 })],
    limit: 14
  },
  {
    id: "flight",
    index: 3,
    title: "It leaves the bench",
    idea: "Projectile motion",
    formula: "t = \u221A(2h / g) ,  x = v\u2093 t",
    brief: "The ball has just left the bench, moving sideways, with no vertical speed. Put the cup where it will land.",
    lesson: "Horizontal speed and the fall don't talk to each other. Time in the air is only about the drop. Distance is that time times the sideways speed.",
    par: "Cup under the landing, first try is just a guess. The trail is the correction.",
    controls: [],
    kit: [kit("cup", "Cup", 1, 1.7, 0.28, { lockY: 1.15 })],
    limit: 8
  },
  {
    id: "bank",
    index: 4,
    title: "Bank shot",
    idea: "Restitution",
    formula: "v out = e \xB7 v in",
    brief: "The ball is rolling. The cup is up on the wall. Place the bumper and set how much of the hit comes back.",
    lesson: "e is the share of the impact speed returned along the normal. e = 1 is a perfect bounce. e = 0 is a thud. Aim is the normal's direction, not a hope.",
    par: "Pot it without maxing the bounce.",
    controls: [slider("e", "Bounce e", 0.35, 1, 0.01, 0.7, (v) => v.toFixed(2))],
    kit: [kit("bumper", "Bumper", 1, 1.1, 1.1, { r: 0.55 })],
    limit: 10
  },
  {
    id: "lever",
    index: 5,
    title: "Where the pivot goes",
    idea: "Torque",
    formula: "\u03C4 = m g d",
    brief: "The heavy end has to lift the light end to the bell. Slide the fulcrum. Too close to the heavy mass and it loses. Too far and it runs out of drop.",
    lesson: "Torque is force times lever arm. The 8 kg side wins only when 8\xB7d\u2081 beats 2\xB7d\u2082. A short arm on the heavy side also means a short drop, so the bell stays out of reach.",
    par: "Ring the bell. Any fulcrum that does it is a real one.",
    controls: [slider("fulcrum", "Fulcrum along the bar", 0.12, 0.72, 5e-3, 0.4, (v) => `${Math.round(v * 100)}% from the heavy end`)],
    kit: [],
    limit: 8
  },
  {
    id: "swing",
    index: 6,
    title: "Same height",
    idea: "Pendulum energy",
    formula: "v = \u221A(2 g \u0394h)",
    brief: "Release the bob on the arc. It can only climb back to the height you gave it. Thread the gate. Miss the stop above it.",
    lesson: "A pendulum trades height for speed and buys the height back. Ignoring friction, the far side tops out where you let go. The gate sits in a band of that rule.",
    par: "Through the gate, not into the stop.",
    controls: [slider("release", "Release angle", 30, 78, 0.5, 48, (v) => `${v.toFixed(0)}\xB0 from the bottom`)],
    kit: [],
    limit: 8
  },
  {
    id: "spring",
    index: 7,
    title: "Spend the spring",
    idea: "Elastic energy",
    formula: "\xBD k x\xB2 = \xBD m v\xB2",
    brief: "The dotted arc is the shot, with no air in the way. Match it to the cup. Pull is stored energy. Angle splits it between forward and up.",
    lesson: "The spring stores \xBDkx\xB2 and hands it to the ball as \xBDmv\xB2. After that it's the same projectile rule as the bench: sideways speed stays, vertical speed is eaten by gravity.",
    par: "Pot it on a modest pull, not the stop.",
    controls: [
      slider("angle", "Launch angle", 20, 70, 0.5, 42, (v) => `${v.toFixed(0)}\xB0`),
      slider("pull", "Spring pull", 0.2, 0.85, 0.01, 0.45, (v) => `${v.toFixed(2)} m`)
    ],
    kit: [],
    limit: 8
  },
  {
    id: "span",
    index: 8,
    title: "Something to stand on",
    idea: "A path of support",
    formula: "every piece \u2192 a pier",
    brief: "The ball is already rolling. Span the pit. A beam stays put only if it overlaps a pier, or a beam that already does. Anything else falls.",
    lesson: "Load has to reach a support. Overlap is the joint. A beam with no path back to a pier is just a falling object, however carefully you aimed it.",
    par: "Three beams, one continuous path, ball in the far bay.",
    controls: [],
    kit: [kit("beam", "Beam", 3, 4.2, 0.28, { rotatable: true })],
    limit: 14
  },
  {
    id: "stack",
    index: 9,
    title: "Keep it inside",
    idea: "Centre of mass",
    formula: "tips past the support edge",
    brief: "Build a stack that is still standing after the shove. The cross is the centre of mass. If that mark walks off the plate, the stack goes with it.",
    lesson: "A body tips when its centre of mass passes the edge of whatever is holding it. Wider base, lower mass, smaller shove. Height without a base is just a lever for the push.",
    par: "Still tall, and every block still on the plate.",
    controls: [],
    kit: [kit("block", "Block", 6, 0.76, 0.76)],
    limit: 8
  },
  {
    id: "relay",
    index: 10,
    title: "Hand it on",
    idea: "Momentum",
    formula: "m\u2081u\u2081 + m\u2082u\u2082 = m\u2081v\u2081 + m\u2082v\u2082",
    brief: "The cue ball is light and already moving. Place the two heavier balls so the knock reaches the crate and drives it into the latch.",
    lesson: "A straight elastic hit swaps speed when the masses match, and mostly bounces back when they don't. Step the mass up and keep the gaps short, or friction eats the chain.",
    par: "Latch the crate before the line dies.",
    controls: [],
    kit: [
      kit("massA", "1.6 kg", 1, 0.76, 0.76, { r: 0.38, lockY: 2.15 }),
      kit("massB", "3.2 kg", 1, 0.92, 0.92, { r: 0.46, lockY: 2.15 })
    ],
    limit: 12
  },
  {
    id: "hoist",
    index: 11,
    title: "Pay in height",
    idea: "Potential energy",
    formula: "m\u1D65 g h\u1D65 \u2265 m\u209A g h\u209A",
    brief: "The payload has to sit on the high ledge. Pick a counterweight and a drop. The weight can only lift as far as it can fall, and only if it is the heavier one.",
    lesson: "Lifting stores m g h. The counterweight pays that bill by losing height of its own. A heavier weight still fails if it hits the floor before the payload arrives.",
    par: "The middle weight. The heavy one is a blunt instrument.",
    controls: [
      slider("mass", "Counterweight", 0, 2, 1, 1, (v) => ["1 kg", "4 kg", "8 kg"][Math.round(v)] ?? "4 kg"),
      slider("drop", "Weight start height", 2.2, 8.2, 0.05, 4, (v) => `${v.toFixed(1)} m`)
    ],
    kit: [],
    limit: 10
  },
  {
    id: "sail",
    index: 12,
    title: "Enough, not too much",
    idea: "Drag, then coast",
    formula: "F \u221D A    then    d = v\xB2 / (2 \u03BC g)",
    brief: "The fan only covers the marked run. After that, friction undoes the work. Set the sail so the barge coasts into the dock, not the pit.",
    lesson: "Inside the fan, a bigger sail buys more acceleration. Outside it, you are just a body sliding to a stop. The dock is a distance you have to buy, not a wish.",
    par: "Dock it. A huge sail skips the berth.",
    controls: [slider("area", "Sail area", 0.25, 1.5, 0.01, 0.6, (v) => `${v.toFixed(2)} m\xB2`)],
    kit: [],
    limit: 14
  }
];
const LEVEL_BY_ID = Object.fromEntries(LEVELS.map((level) => [level.id, level]));
function defaultTunes(level) {
  const tunes = {};
  for (const control of level.controls) tunes[control.id] = control.default;
  return tunes;
}
function freshPlacements(level) {
  if (level.id === "flight") {
    return [{ id: "cup-1", kind: "cup", x: 12.5, y: 1.15, angle: 0 }];
  }
  if (level.id === "bank") {
    return [{ id: "bumper-1", kind: "bumper", x: 7.2, y: 2.4, angle: 0 }];
  }
  if (level.id === "relay") {
    return [
      { id: "a-1", kind: "massA", x: 6.2, y: 2.15, angle: 0 },
      { id: "b-1", kind: "massB", x: 9.4, y: 2.15, angle: 0 }
    ];
  }
  return [];
}
const SOLUTIONS = {
  drop: { placements: [], tunes: { angle: 36 } },
  grit: {
    placements: [{ id: "pad-1", kind: "pad", x: 11.85, y: 0.62, angle: 0 }],
    tunes: { mu: 0.8 }
  },
  flight: {
    placements: [{ id: "cup-1", kind: "cup", x: 7.6, y: 1.15, angle: 0 }],
    tunes: {}
  },
  bank: {
    placements: [{ id: "bumper-1", kind: "bumper", x: 5.8, y: 1.75, angle: 0 }],
    tunes: { e: 0.95 }
  },
  lever: { placements: [], tunes: { fulcrum: 0.32 } },
  swing: { placements: [], tunes: { release: 58 } },
  spring: { placements: [], tunes: { angle: 42, pull: 0.53 } },
  span: {
    placements: [
      { id: "beam-1", kind: "beam", x: 5.6, y: 2.96, angle: 0 },
      { id: "beam-2", kind: "beam", x: 9.4, y: 2.96, angle: 0 },
      { id: "beam-3", kind: "beam", x: 13.2, y: 2.96, angle: 0 }
    ],
    tunes: {}
  },
  stack: {
    placements: [
      { id: "b1", kind: "block", x: 9.22, y: 1.37, angle: 0 },
      { id: "b2", kind: "block", x: 10, y: 1.37, angle: 0 },
      { id: "b3", kind: "block", x: 10.78, y: 1.37, angle: 0 },
      { id: "b4", kind: "block", x: 9.61, y: 2.15, angle: 0 },
      { id: "b5", kind: "block", x: 10.39, y: 2.15, angle: 0 },
      { id: "b6", kind: "block", x: 10, y: 2.93, angle: 0 }
    ],
    tunes: {}
  },
  relay: {
    placements: [
      { id: "a-1", kind: "massA", x: 5.4, y: 2.15, angle: 0 },
      { id: "b-1", kind: "massB", x: 8.2, y: 2.15, angle: 0 }
    ],
    tunes: {}
  },
  hoist: { placements: [], tunes: { mass: 1, drop: 6.6 } },
  sail: { placements: [], tunes: { area: 0.8 } }
};
function cap(clean) {
  if (clean === 3) return 2;
  return clean;
}
function grade(id, stats, hintUsed) {
  const clean = hintUsed ? 2 : 3;
  if (id === "drop") return stats.launched ? cap(clean) : clean;
  if (id === "grit") {
    if ((stats.pads ?? 2) > 1 || (stats.inner ?? 0) < 1) return hintUsed ? 1 : 2;
    return clean;
  }
  if (id === "spring") return (stats.pull ?? 1) <= 0.62 ? clean : cap(clean);
  if (id === "hoist") return (stats.massIndex ?? 2) === 1 ? clean : cap(clean);
  if (id === "sail") {
    const area = stats.area ?? 0;
    return area >= 0.62 && area <= 0.98 ? clean : cap(clean);
  }
  if (id === "flight") return (stats.precision ?? 1) < 0.45 ? clean : cap(clean);
  return clean;
}
function dailySpec(date = /* @__PURE__ */ new Date()) {
  const day = date.toISOString().slice(0, 10);
  let hash = 2166136261;
  for (let i = 0; i < day.length; i++) hash = Math.imul(hash ^ day.charCodeAt(i), 16777619);
  hash >>>= 0;
  const cupX = 9.2 + hash % 560 / 100;
  const cupY = 1.5 + (hash >>> 8) % 320 / 100;
  return { day, cupX, cupY };
}
function springSpeed(pull) {
  const k = 180;
  const mass = 0.5;
  return pull * Math.sqrt(k / mass);
}
function flightLandingX() {
  const y0 = 6.2;
  const restY = 1.29 + 0.24;
  const drop = y0 - restY;
  const t = Math.sqrt(2 * drop / 9.81);
  return 3.5 + 4.2 * t;
}
export {
  LEVELS,
  LEVEL_BY_ID,
  SOLUTIONS,
  dailySpec,
  defaultTunes,
  flightLandingX,
  freshPlacements,
  grade,
  springSpeed
};
