// MMX mission data. Every date here comes from JAXA or ESA; see the sources on the page.
// Where JAXA or ESA give only a month or a year, `at` is my own placement inside it so the
// replay can move, and the phase carries `planned: true` and a `when` that says what was published.
const U = s => Date.parse(s);
export const LAUNCH = U('2026-10-19T19:41:03Z'); // 04:41:03 JST on 20 October 2026
const S = 1000, MIN = 60 * S;
export const SEP = LAUNCH + 71 * MIN + 13 * S;   // separation confirmed about 71 min 13 s after liftoff
export const T = {
  launch: LAUNCH, sep: SEP,
  moi: U('2027-08-01T00:00:00Z'),      // ESA: enter Mars orbit in August 2027
  qso: U('2027-09-01T00:00:00Z'),      // ESA: orbit Phobos from September 2027
  idefix: U('2029-01-15T00:00:00Z'),   // ESA: release Idefix in early 2029
  land: U('2030-01-01T00:00:00Z'),     // ESA and JAXA: land and sample in 2030
  depart: U('2030-07-01T00:00:00Z'),   // JAXA: depart the Martian sphere in 2030
  ret: U('2031-07-01T00:00:00Z'),      // JAXA: capsule back at Earth in 2031
};
// Ascent events from JAXA's launch plan (the flight flew as planned; separation is the confirmed time).
export const ASCENT = [
  [0, 'Liftoff from Tanegashima'],
  [116, 'Solid rocket boosters separate'],
  [197, 'Fairing separates'],
  [292, 'First stage engine cut off'],
  [299, 'First stage separates'],
  [312, 'Second stage first burn'],
  [640, 'Second stage cut off'],
  [3837, 'Second stage second burn'],
  [4221, 'Second stage cut off'],
  [4273, 'MMX separates onto its path to Mars'],
].map(([s, label]) => ({ t: LAUNCH + s * S, label }));

export const PHASES = [
  { id: 'launch', t: T.launch, name: 'Launch', when: '20 Oct 2026, 04:41 JST', planned: false,
    note: 'An H3 rocket, flight 10, lifts MMX off from Tanegashima. The boosters, fairing and first stage fall away, then the second stage burns twice and lets MMX go about 71 minutes after liftoff.' },
  { id: 'cruise', t: T.sep, name: 'Earth to Mars transfer', when: '20 Oct 2026', planned: false,
    note: 'MMX is on its way. The trip takes about a year. Separation happened; the rest of the cruise is still ahead, so treat the path as planned.' },
  { id: 'moi', t: T.moi, name: 'Mars orbit insertion', when: 'Aug 2027', planned: true,
    note: 'MMX fires its engines to be captured by Mars. ESA gives August 2027; the day shown is mine, for the replay.' },
  { id: 'qso', t: T.qso, name: 'Phobos approach, quasi satellite orbit', when: 'Sep 2027', planned: true,
    note: 'Phobos is too small to orbit in the usual way, so MMX flies a quasi satellite orbit: it circles Mars with Phobos and loops round the moon as seen from it. It studies Phobos and Deimos from here and drops the Idefix rover in early 2029.' },
  { id: 'land', t: T.land, name: 'Landing and sampling', when: '2030', planned: true,
    note: 'MMX lands on Phobos, planned as two soft landings, and collects at least 10 g of regolith with a coring sampler on its arm and a gas powered sampler by a footpad, then packs it into the return capsule.' },
  { id: 'return', t: T.depart, name: 'Mars departure and Earth return', when: '2030 to 2031', planned: true,
    note: 'MMX leaves the Martian sphere in 2030, flies past Deimos on the way out, and takes about a year to get home. The capsule comes down in Australia in 2031.' },
];
export const EVENTS = [
  { t: T.idefix, label: 'Idefix rover released, early 2029', planned: true },
];
// The slider: the ascent gets room of its own, then each phase gets a share of the bar.
export const SEGMENTS = [
  { t0: T.launch, t1: T.sep, share: 14 },
  { t0: T.sep, t1: T.moi, share: 20 },
  { t0: T.moi, t1: T.qso, share: 8 },
  { t0: T.qso, t1: T.land, share: 26 },
  { t0: T.land, t1: T.depart, share: 12 },
  { t0: T.depart, t1: T.ret, share: 20 },
];
export const MISSION = { segments: SEGMENTS, phases: PHASES, events: EVENTS, playLength: 60 };

// Orbits. JPL's approximate planet elements (1800 to 2050) and the NSSDC Mars fact sheet.
const D2R = Math.PI / 180, J2000 = U('2000-01-01T12:00:00Z');
const EL = { // a (au), e, L (deg), long. perihelion (deg), with rates per Julian century
  earth: [1.00000261, 0.00000562, 0.01671123, -0.00004392, 100.46457166, 35999.37244981, 102.93768193, 0.32327364],
  mars: [1.52371034, 0.00001847, 0.09339410, 0.00007882, -4.55343205, 19140.30268499, -23.94362959, 0.44441088],
};
export function planet(name, t) {
  const [a0, da, e0, de, L0, dL, w0, dw] = EL[name], c = (t - J2000) / (36525 * 864e5);
  const a = a0 + da * c, e = e0 + de * c, L = L0 + dL * c, w = w0 + dw * c;
  let M = ((L - w) % 360) * D2R, E = M;
  for (let i = 0; i < 6; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  const x = a * (Math.cos(E) - e), y = a * Math.sqrt(1 - e * e) * Math.sin(E), wr = w * D2R;
  return { x: x * Math.cos(wr) - y * Math.sin(wr), y: x * Math.sin(wr) + y * Math.cos(wr) };
}
export const MOONS = { marsR: 3389.5, phobos: { a: 9378, p: 0.31891 }, deimos: { a: 23459, p: 1.26244 } };

// Where MMX is in the heliocentric view. The transfer arcs are drawn by me between the real planet
// positions at the published months; they show the shape of the trip, not the flown trajectory.
const ease = u => u * u * (3 - 2 * u);
function arc(p0, p1, u) {
  const r0 = Math.hypot(p0.x, p0.y), r1 = Math.hypot(p1.x, p1.y);
  const a0 = Math.atan2(p0.y, p0.x); let a1 = Math.atan2(p1.y, p1.x);
  while (a1 <= a0) a1 += 2 * Math.PI;
  const a = a0 + (a1 - a0) * u, r = r0 + (r1 - r0) * ease(u);
  return { x: r * Math.cos(a), y: r * Math.sin(a) };
}
export function craft(t) {
  if (t <= T.sep) return planet('earth', t);
  if (t < T.moi) return arc(planet('earth', T.sep), planet('mars', T.moi), (t - T.sep) / (T.moi - T.sep));
  if (t < T.depart) return planet('mars', t);
  if (t < T.ret) return arc(planet('mars', T.depart), planet('earth', T.ret), (t - T.depart) / (T.ret - T.depart));
  return planet('earth', t);
}
