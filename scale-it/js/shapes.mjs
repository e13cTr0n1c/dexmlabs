// Original silhouettes. One consistent drawing language: filled profiles, no liveries, no badges.
// Coordinates are y-up. `w` is the measured axis for side and front views, `h` for a standing view.

const n = v => Math.round(v * 100) / 100;
const P = pts => pts.map((p, i) => `${i ? 'L' : 'M'}${n(p[0])} ${n(p[1])}`).join(' ') + ' Z';
const E = (cx, cy, rx, ry) => `M${n(cx - rx)} ${n(cy)} A ${n(rx)} ${n(ry)} 0 1 1 ${n(cx + rx)} ${n(cy)} A ${n(rx)} ${n(ry)} 0 1 1 ${n(cx - rx)} ${n(cy)} Z`;

function box(paths, w, h) { return {paths, w, h}; }

function fighter({fin = 18, nose = 14, wing = 46, thick = 7, scoop = 0, jet = false, engines = 0}) {
  const y = 8;
  const body = P([
    [2, y + 2], [14, y], [wing, y + 0.5], [78, y + 1], [96, y + 2.2], [100, y + 3],
    [96, y + thick * 0.7], [80, y + thick], [wing + 8, y + thick + 2.2], [wing - 4, y + thick + 3.4],
    [24, y + fin], [16, y + fin * 0.55], [10, y + thick * 0.8], [2, y + 4]
  ]);
  const wingPath = P([[wing - 16, y + 1], [wing + 20, y + 1.4], [wing + 10, y - 3.4 - scoop], [wing - 10, y - 2.2]]);
  const canopy = P([[wing + 2, y + thick], [wing + 16, y + thick + 0.4], [wing + 14, y + thick + 3.2], [wing + 4, y + thick + 2.8]]);
  const pods = [];
  for (let i = 0; i < engines; i++) pods.push(E(wing - 6 + i * 8, y - 2.6, 3.4, 1.7));
  const side = box([body, wingPath, canopy, ...pods], 100, fin + y + 4);
  const front = box([
    P([[0, 8], [18, 14], [42, 16], [50, 22], [58, 16], [82, 14], [100, 8], [82, 6], [58, 7], [50, 4], [42, 7], [18, 6]]),
    E(50, 16, 3.2, 5.5),
    P([[47, 21], [50, 28], [53, 21]])
  ], 100, 32);
  return {side, front, stand: front};
}

function jet({fin = 16, wing = 48, engines = 1, canard = false, delta = false}) {
  const y = 7;
  const body = delta
    ? P([[4, y + 2], [30, y + 1], [70, y + 2], [96, y + 3], [100, y + 3.3], [96, y + 5], [60, y + 6], [20, y + fin], [8, y + 4]])
    : P([[6, y], [20, y + 1], [70, y + 2], [96, y + 3.2], [100, y + 3.6], [94, y + 6], [70, y + 6.5], [40, y + 5], [18, y + fin], [8, y + fin * 0.4], [6, y + 2]]);
  const wingPath = delta
    ? P([[8, y + 2], [78, y + 3], [62, y - 1], [16, y - 0.5]])
    : P([[wing - 10, y + 1], [wing + 22, y + 2], [wing + 8, y - 2], [wing - 4, y - 1]]);
  const extra = [];
  if (canard) extra.push(P([[78, y + 4], [88, y + 5], [80, y + 6.5]]));
  for (let i = 0; i < engines; i++) extra.push(E(wing - 4 + i * 8, y - 1.5, 4, 1.6));
  const side = box([body, wingPath, ...extra], 100, fin + y + 4);
  const span = delta
    ? P([[0, 6], [50, 18], [100, 6], [50, 10]])
    : P([[0, 10], [8, 16], [40, 15], [50, 24], [60, 15], [92, 16], [100, 10], [60, 8], [40, 8]]);
  const front = box([span, E(50, 16, 3, 6), P([[47.5, 22], [50, 30], [52.5, 22]])], 100, 34);
  return {side, front, stand: front};
}

function liner({hump = 0, deck = 0, engines = 2, nose = 8, tail = 16}) {
  const y = 7;
  const belly = y;
  const back = y + 7 + deck * 3;
  const body = P([
    [3, belly + 3], [16, belly], [40, belly + 0.4], [78, belly + 0.6], [94, belly + 2.4], [100, belly + 3.6],
    [95, back * 0.72], [86, back], [70, back],
    [hump ? 78 : 70, back + hump * 4.5], [hump ? 58 : 64, back + hump * 4.2], [hump ? 46 : 60, back],
    [18, back + 0.4], [10, y + tail], [4, y + tail * 0.45]
  ]);
  const wing = P([[36, belly + 1], [64, belly + 1.6], [56, belly - 4], [32, belly - 2.6]]);
  const pods = [];
  for (let i = 0; i < Math.min(engines, 2); i++) pods.push(E(42 + i * 12, belly - 3.2, 5, 2.1));
  const side = box([body, wing, ...pods], 100, Math.max(tail + y, back + hump * 5) + 2);
  const dihedral = P([[0, 8], [22, 14], [46, 13], [50, 20 + deck * 3], [54, 13], [78, 14], [100, 8], [78, 6], [54, 6], [46, 6], [22, 6]]);
  const front = box([dihedral, E(50, 16 + deck, 6, 7 + deck * 2), ...[0, 1].slice(0, engines > 2 ? 2 : 1).map((_, i) => E(28 + i * 44, 10, 4, 3))], 100, 36);
  return {side, front, stand: front};
}

function cargo({bulge = 0, tail = 18, engines = 2}) {
  const y = 5;
  const body = P([
    [2, y + 4], [10, y + 1], [24, y], [70, y + 1], [86, y + 6 + bulge], [96, y + 8], [100, y + 7],
    [94, y + 12], [80, y + 14], [24, y + 14], [12, y + tail], [4, y + 10]
  ]);
  const wing = P([[30, y + 12], [58, y + 13], [50, y + 18], [26, y + 16]]);
  const pods = [];
  for (let i = 0; i < engines; i++) pods.push(E(34 + i * 8, y + 17, 3.4, 1.8));
  const side = box([body, wing, ...pods], 100, tail + y + 8);
  const front = box([
    P([[0, 18], [20, 24], [40, 23], [50, 16], [60, 23], [80, 24], [100, 18], [80, 16], [20, 16]]),
    P([[42, 6], [58, 6], [58, 20], [42, 20]]),
    E(24, 22, 3, 2), E(76, 22, 3, 2)
  ], 100, 32);
  return {side, front, stand: front};
}

function deltaPlane({canard = false, nose = 6}) {
  const y = 8;
  const body = P([[0, y + 3], [20, y + 2], [70, y + 2.5], [94, y + nose * 0.2 + 3], [100, y + 4], [92, y + 6], [40, y + 5.5], [8, y + 8], [0, y + 5]]);
  const wing = P([[6, y + 3], [84, y + 4], [46, y - 2], [10, y]]);
  const extra = canard ? [P([[76, y + 5], [86, y + 7.2], [74, y + 6.4]])] : [];
  const side = box([body, wing, ...extra], 100, 20);
  const front = box([P([[0, 4], [50, 16], [100, 4], [50, 8]]), E(50, 14, 2.4, 5)], 100, 24);
  return {side, front, stand: front};
}

function helicopter({tandem = false}) {
  const y = 6;
  const body = tandem
    ? P([[8, y], [18, y + 8], [78, y + 8], [92, y + 2], [84, y], [18, y]])
    : P([[16, y], [28, y + 10], [62, y + 9], [78, y + 4], [70, y], [30, y]]);
  const rotor = tandem
    ? [P([[6, y + 12], [40, y + 13.2], [40, y + 14.4], [6, y + 13.2]]), P([[52, y + 12], [94, y + 13.2], [94, y + 14.4], [52, y + 13.2]])]
    : [P([[10, y + 14], [78, y + 15.4], [78, y + 16.8], [10, y + 15.4]]), P([[74, y + 6], [98, y + 8], [96, y + 2]])];
  const side = box([body, ...rotor], 100, 24);
  const front = box([P([[6, 14], [94, 15.2], [94, 17], [6, 15.8]]), P([[44, 0], [56, 0], [56, 14], [44, 14]]), E(50, 8, 8, 6)], 100, 20);
  return {side, front, stand: front};
}

function rocket({stages = 3, boosters = 0, bells = 5, fin = true}) {
  const w = 28 + boosters * 10;
  const parts = [];
  const left = (100 - w) / 2;
  let y = 0;
  const heights = stages === 3 ? [34, 26, 18] : stages === 2 ? [46, 28] : [70];
  heights.forEach((h, i) => {
    const inset = i * 1.5;
    parts.push(P([[left + inset, y], [left + w - inset, y], [left + w - inset, y + h], [left + inset, y + h]]));
    y += h;
  });
  parts.push(P([[left + w * 0.28, y], [left + w * 0.72, y], [left + w * 0.5, y + 16]]));
  if (fin) {
    parts.push(P([[left, 8], [left - 8, 0], [left, 22]]));
    parts.push(P([[left + w, 8], [left + w + 8, 0], [left + w, 22]]));
  }
  for (let i = 0; i < boosters; i++) {
    const x = i === 0 ? left - 10 : left + w;
    parts.push(P([[x, 0], [x + 8, 0], [x + 8, 62], [x, 62]]));
  }
  const bellW = w / (bells + 1);
  for (let i = 0; i < Math.min(bells, 5); i++) {
    const x = left + bellW * (i + 0.5);
    parts.push(P([[x - 1.2, 0], [x + 1.2, 0], [x + 2.4, -4], [x - 2.4, -4]]));
  }
  const stand = box(parts, 100, y + 16);
  const side = stand;
  return {side, front: stand, stand};
}

function light({high = false, biplane = false}) {
  const y = 7;
  const body = P([[12, y], [28, y + 1], [70, y + 2], [92, y + 4], [100, y + 4.4], [90, y + 7], [40, y + 6], [18, y + 14], [10, y + 6], [12, y + 2]]);
  const wing = high
    ? P([[30, y + 6], [62, y + 7], [58, y + 10], [28, y + 9]])
    : P([[32, y + 1], [64, y + 2], [56, y - 2], [30, y - 1]]);
  const strut = high ? [P([[40, y + 1], [42, y + 1], [48, y + 6], [46, y + 6]])] : [];
  const extra = biplane ? [P([[24, y + 8], [70, y + 9], [66, y + 12], [22, y + 11]]), P([[18, y + 4], [28, y + 10]])] : [];
  const side = box([body, wing, ...strut, ...extra], 100, 24);
  const front = box([
    P([[0, high ? 16 : 8], [100, high ? 16 : 8], [100, high ? 19 : 11], [0, high ? 19 : 11]]),
    biplane ? P([[6, 20], [94, 20], [94, 23], [6, 23]]) : '',
    P([[46, 0], [54, 0], [54, 16], [46, 16]])
  ].filter(Boolean), 100, 26);
  return {side, front, stand: front};
}

const SHAPES = {
  cessna: light({high: true}),
  cherokee: light({high: false}),
  wright: light({biplane: true}),
  spitfire: fighter({fin: 20, wing: 42, thick: 6.5}),
  hurricane: fighter({fin: 16, wing: 40, thick: 8}),
  mustang: fighter({fin: 17, wing: 48, thick: 6, scoop: 2}),
  bf109: fighter({fin: 15, wing: 44, thick: 6.2, nose: 18}),
  zero: fighter({fin: 14, wing: 38, thick: 6, nose: 10}),
  meteor: fighter({fin: 14, wing: 36, engines: 2, thick: 7}),
  mosquito: fighter({fin: 16, wing: 40, engines: 2, thick: 6.4}),
  lancaster: cargo({bulge: 0, tail: 16, engines: 2}),
  halifax: cargo({bulge: 1, tail: 14, engines: 2}),
  b17: cargo({bulge: 0, tail: 15, engines: 2}),
  vulcan: deltaPlane({}),
  b52: cargo({bulge: 0, tail: 12, engines: 2}),
  concorde: deltaPlane({nose: 2}),
  tu144: deltaPlane({canard: true}),
  liner: liner({engines: 2}),
  jumbo: liner({hump: 1, engines: 2, tail: 18}),
  jumbo8: liner({hump: 1.15, engines: 2, tail: 18}),
  a380: liner({deck: 1, engines: 2, tail: 17}),
  triple: liner({engines: 2, nose: 10}),
  dream: liner({engines: 2, nose: 12}),
  a350: liner({engines: 2, nose: 11}),
  an225: cargo({bulge: 3, tail: 16, engines: 3}),
  an124: cargo({bulge: 2, tail: 16, engines: 2}),
  an22: cargo({bulge: 1, tail: 14, engines: 2}),
  c5: cargo({bulge: 2, tail: 17, engines: 2}),
  c17: cargo({bulge: 1, tail: 18, engines: 2}),
  c130: cargo({bulge: 0, tail: 20, engines: 2}),
  a400: cargo({bulge: 0, tail: 18, engines: 2}),
  spruce: {
    side: box([
      P([[6, 4], [20, 2], [70, 3], [92, 8], [100, 9], [90, 14], [40, 12], [16, 16], [8, 10]]),
      P([[24, 10], [68, 12], [60, 4], [28, 4]])
    ], 100, 22),
    front: box([P([[0, 8], [50, 14], [100, 8], [50, 6]]), P([[46, 2], [54, 2], [56, 12], [44, 12]])], 100, 18),
    stand: box([P([[0, 8], [50, 14], [100, 8], [50, 6]])], 100, 18)
  },
  roc: {
    side: box([
      P([[8, 6], [20, 4], [40, 5], [60, 5], [78, 8], [70, 14], [18, 18], [10, 12]]),
      P([[4, 16], [96, 18], [90, 22], [8, 20]])
    ], 100, 26),
    front: box([
      P([[0, 16], [100, 16], [100, 20], [0, 20]]),
      P([[16, 4], [28, 4], [28, 16], [16, 16]]),
      P([[72, 4], [84, 4], [84, 16], [72, 16]])
    ], 100, 24),
    stand: box([P([[0, 16], [100, 16], [100, 20], [0, 20]])], 100, 24)
  },
  sr71: jet({fin: 12, wing: 42, engines: 2, delta: true}),
  u2: {
    side: box([P([[10, 8], [30, 7], [80, 8], [100, 10], [92, 13], [24, 18], [12, 12]]), P([[20, 12], [70, 14], [40, 20]])], 100, 24),
    front: box([P([[0, 14], [50, 16], [100, 14], [50, 12]]), E(50, 10, 2, 6)], 100, 20),
    stand: box([E(50, 10, 2, 6)], 100, 20)
  },
  voyager: {
    side: box([P([[6, 8], [30, 7], [80, 8], [96, 10], [70, 12], [20, 14], [8, 11]]), P([[4, 13], [96, 15], [90, 17], [8, 15]])], 100, 20),
    front: box([P([[0, 10], [100, 11], [100, 13], [0, 12]]), E(18, 6, 3, 5), E(82, 6, 3, 5)], 100, 16),
    stand: box([P([[0, 10], [100, 11], [100, 13], [0, 12]])], 100, 16)
  },
  f16: jet({fin: 18, wing: 46, engines: 1}),
  f15: jet({fin: 17, wing: 44, engines: 2}),
  f35: jet({fin: 14, wing: 42, engines: 1}),
  typhoon: jet({fin: 16, wing: 40, engines: 2, canard: true}),
  tornado: jet({fin: 16, wing: 38, engines: 2}),
  lightning: jet({fin: 18, wing: 50, engines: 2}),
  a10: jet({fin: 14, wing: 36, engines: 2}),
  chinook: helicopter({tandem: true}),
  mi26: helicopter({tandem: false}),
  airship: {
    side: box([P([[2, 10], [20, 4], [80, 4], [98, 10], [80, 16], [20, 16]]), P([[88, 8], [100, 6], [100, 14], [88, 12]])], 100, 20),
    front: box([E(50, 12, 16, 12), P([[34, 0], [66, 0], [60, 6], [40, 6]])], 100, 24),
    stand: box([E(50, 40, 18, 28)], 100, 80)
  },
  orbiter: {
    side: box([
      P([[8, 6], [20, 4], [55, 5], [78, 10], [92, 12], [100, 11], [84, 16], [40, 14], [16, 18], [8, 12]]),
      P([[22, 8], [48, 10], [40, 2]])
    ], 100, 24),
    front: box([P([[8, 10], [30, 16], [50, 14], [70, 16], [92, 10], [70, 8], [30, 8]]), P([[44, 14], [56, 14], [53, 28], [47, 28]])], 100, 32),
    stand: box([P([[8, 10], [30, 16], [50, 14], [70, 16], [92, 10], [70, 8], [30, 8]])], 100, 32)
  },
  stack: rocket({stages: 1, boosters: 2, bells: 3, fin: false}),
  saturn: rocket({stages: 3, boosters: 0, bells: 5, fin: true}),
  sls: rocket({stages: 2, boosters: 2, bells: 4, fin: false}),
  heavy: rocket({stages: 2, boosters: 2, bells: 3, fin: false}),
  v2: rocket({stages: 1, boosters: 0, bells: 1, fin: true}),
  shard: {
    stand: box([P([[18, 0], [82, 0], [52, 100], [48, 100]]), P([[46, 92], [54, 92], [52, 100], [48, 100]])], 100, 100),
    side: box([P([[18, 0], [82, 0], [50, 100]])], 100, 100),
    front: box([P([[18, 0], [82, 0], [50, 100]])], 100, 100)
  },
  burj: {
    stand: box([
      P([[30, 0], [70, 0], [66, 28], [62, 28], [60, 48], [56, 48], [54, 68], [52, 68], [51, 100], [49, 100], [48, 68], [46, 68], [44, 48], [40, 48], [38, 28], [34, 28]])
    ], 100, 100),
    side: box([P([[30, 0], [70, 0], [51, 100], [49, 100]])], 100, 100),
    front: box([P([[30, 0], [70, 0], [51, 100], [49, 100]])], 100, 100)
  },
  eiffel: {
    stand: box([
      P([[8, 0], [30, 0], [44, 48], [36, 52], [24, 10]]),
      P([[70, 0], [92, 0], [76, 10], [64, 52], [56, 48]]),
      P([[40, 46], [60, 46], [54, 78], [50, 100], [46, 78]]),
      P([[34, 30], [66, 30], [64, 35], [36, 35]]),
      P([[43, 70], [57, 70], [56, 75], [44, 75]])
    ], 100, 100),
    side: box([P([[8, 0], [92, 0], [50, 100]])], 100, 100),
    front: box([P([[8, 0], [92, 0], [50, 100]])], 100, 100)
  },
  empire: {
    stand: box([
      P([[22, 0], [78, 0], [78, 62], [70, 62], [70, 74], [62, 74], [62, 84], [56, 84], [54, 92], [52, 100], [48, 100], [46, 92], [44, 84], [38, 84], [38, 74], [30, 74], [30, 62], [22, 62]])
    ], 100, 100),
    side: box([P([[22, 0], [78, 0], [52, 100], [48, 100]])], 100, 100),
    front: box([P([[22, 0], [78, 0], [52, 100], [48, 100]])], 100, 100)
  },
  liberty: {
    stand: box([
      P([[38, 0], [62, 0], [60, 18], [66, 28], [58, 46], [64, 70], [54, 78], [50, 96], [46, 78], [36, 70], [42, 46], [34, 28], [40, 18]]),
      P([[58, 62], [86, 84], [82, 90], [54, 70]]),
      P([[44, 92], [48, 100], [52, 100], [56, 92]]),
      P([[42, 96], [46, 108], [48, 96]]), P([[50, 98], [54, 110], [56, 98]]), P([[46, 100], [50, 112], [52, 100]])
    ], 100, 112),
    side: box([P([[40, 0], [60, 0], [50, 100]])], 100, 112),
    front: box([P([[40, 0], [60, 0], [50, 100]])], 100, 112)
  },
  angel: {
    stand: box([
      P([[46, 0], [54, 0], [53, 28], [58, 48], [52, 70], [50, 92], [48, 70], [42, 48], [47, 28]]),
      P([[18, 52], [82, 60], [80, 66], [16, 58]])
    ], 100, 96),
    front: box([
      P([[0, 48], [42, 54], [46, 70], [50, 96], [54, 70], [58, 54], [100, 48], [58, 42], [42, 42]]),
      P([[46, 0], [54, 0], [53, 48], [47, 48]])
    ], 100, 100),
    side: box([P([[20, 40], [80, 48], [78, 56], [18, 48]]), P([[46, 0], [54, 0], [52, 90], [48, 90]])], 100, 96)
  },
  eye: {
    stand: box([
      E(50, 58, 34, 34),
      P([[18, 0], [32, 0], [46, 30], [40, 30]]),
      P([[68, 0], [82, 0], [60, 30], [54, 30]]),
      P([[48, 90], [52, 90], [52, 100], [48, 100]])
    ], 100, 100),
    front: box([E(50, 50, 40, 40), P([[46, 0], [54, 0], [52, 16], [48, 16]])], 100, 100),
    side: box([E(50, 50, 40, 40)], 100, 100)
  },
  onewtc: {
    stand: box([P([[32, 0], [68, 0], [64, 72], [58, 78], [54, 86], [52, 100], [48, 100], [46, 86], [42, 78], [36, 72]])], 100, 100),
    side: box([P([[32, 0], [68, 0], [52, 100], [48, 100]])], 100, 100),
    front: box([P([[32, 0], [68, 0], [52, 100], [48, 100]])], 100, 100)
  },
  cntower: {
    stand: box([
      P([[42, 0], [58, 0], [54, 40], [60, 48], [60, 62], [54, 68], [52, 100], [48, 100], [46, 68], [40, 62], [40, 48], [46, 40]])
    ], 100, 100),
    side: box([P([[46, 0], [54, 0], [52, 100], [48, 100]])], 100, 100),
    front: box([P([[46, 0], [54, 0], [52, 100], [48, 100]])], 100, 100)
  },
  pyramid: {
    stand: box([P([[8, 0], [92, 0], [52, 94], [48, 94]]), P([[46, 90], [54, 90], [52, 100], [48, 100]])], 100, 100),
    side: box([P([[8, 0], [92, 0], [50, 100]])], 100, 100),
    front: box([P([[8, 0], [92, 0], [50, 100]])], 100, 100)
  },
  christ: {
    stand: box([
      P([[46, 0], [54, 0], [54, 16], [62, 16], [62, 22], [54, 22], [56, 48], [50, 86], [44, 48], [46, 22], [38, 22], [38, 16], [46, 16]]),
      P([[16, 40], [84, 40], [84, 48], [16, 48]])
    ], 100, 90),
    side: box([P([[46, 0], [54, 0], [50, 86]]), P([[30, 40], [70, 48]])], 100, 90),
    front: box([P([[16, 40], [84, 48], [50, 86], [16, 40]]), P([[46, 0], [54, 0], [52, 40], [48, 40]])], 100, 90)
  },
  blackpool: {
    stand: box([P([[30, 0], [70, 0], [58, 40], [54, 70], [52, 100], [48, 100], [46, 70], [42, 40]]), P([[40, 18], [60, 18], [58, 24], [42, 24]])], 100, 100),
    side: box([P([[30, 0], [70, 0], [50, 100]])], 100, 100),
    front: box([P([[30, 0], [70, 0], [50, 100]])], 100, 100)
  },
  canary: {
    stand: box([P([[34, 0], [66, 0], [60, 78], [50, 100], [40, 78]])], 100, 100),
    side: box([P([[34, 0], [66, 0], [50, 100]])], 100, 100),
    front: box([P([[34, 0], [66, 0], [50, 100]])], 100, 100)
  },
  bttower: {
    stand: box([
      P([[44, 0], [56, 0], [56, 70], [64, 70], [64, 84], [56, 84], [54, 100], [46, 100], [44, 84], [36, 84], [36, 70], [44, 70]])
    ], 100, 100),
    side: box([P([[44, 0], [56, 0], [50, 100]])], 100, 100),
    front: box([P([[44, 0], [56, 0], [50, 100]])], 100, 100)
  },
  elizabeth: {
    stand: box([
      P([[34, 0], [66, 0], [66, 62], [58, 62], [54, 78], [50, 100], [46, 78], [42, 62], [34, 62]]),
      E(50, 40, 8, 8)
    ], 100, 100),
    side: box([P([[34, 0], [66, 0], [50, 100]])], 100, 100),
    front: box([P([[34, 0], [66, 0], [50, 100]])], 100, 100)
  },
  towerbridge: {
    side: box([
      P([[8, 0], [22, 0], [22, 70], [18, 86], [12, 86], [8, 70]]),
      P([[78, 0], [92, 0], [92, 70], [88, 86], [82, 86], [78, 70]]),
      P([[8, 18], [92, 18], [92, 28], [8, 28]]),
      P([[22, 64], [78, 64], [78, 70], [22, 70]])
    ], 100, 90),
    stand: box([P([[30, 0], [48, 0], [48, 78], [40, 100], [32, 78], [30, 78]])], 100, 100),
    front: box([P([[30, 0], [48, 0], [40, 100]])], 100, 100)
  },
  forth: {
    side: box([
      P([[0, 22], [100, 22], [100, 30], [0, 30]]),
      P([[18, 0], [28, 0], [30, 46], [22, 70], [16, 46]]),
      P([[72, 0], [82, 0], [84, 46], [76, 70], [70, 46]]),
      P([[28, 40], [46, 28], [50, 34], [30, 48]]),
      P([[54, 28], [72, 40], [70, 48], [50, 34]])
    ], 100, 74),
    stand: box([P([[36, 0], [64, 0], [60, 80], [50, 100], [40, 80]])], 100, 100),
    front: box([P([[36, 0], [64, 0], [50, 100]])], 100, 100)
  },
  humber: {
    side: box([
      P([[0, 18], [100, 10], [100, 16], [0, 24]]),
      P([[16, 0], [24, 0], [24, 70], [16, 70]]),
      P([[76, 0], [84, 0], [84, 62], [76, 62]]),
      P([[24, 64], [76, 56], [76, 60], [24, 68]])
    ], 100, 74),
    stand: box([P([[40, 0], [60, 0], [58, 100], [42, 100]]), P([[36, 78], [64, 78], [64, 86], [36, 86]])], 100, 100),
    front: box([P([[40, 0], [60, 0], [55, 100], [45, 100]])], 100, 100)
  },
  gateway: {
    stand: box([P([[8, 0], [24, 0], [24, 20], [40, 70], [50, 100], [60, 70], [76, 20], [76, 0], [92, 0], [92, 24], [70, 78], [50, 92], [30, 78], [8, 24]])], 100, 100),
    side: box([P([[8, 0], [92, 0], [50, 100], [30, 70], [8, 10]])], 100, 100),
    front: box([P([[8, 0], [24, 0], [50, 100], [76, 0], [92, 0], [50, 88], [24, 16]])], 100, 100)
  },
  obelisk: {
    stand: box([P([[40, 0], [60, 0], [56, 8], [54, 78], [50, 100], [46, 78], [44, 8]]), P([[34, 0], [66, 0], [64, 6], [36, 6]])], 100, 100),
    side: box([P([[44, 0], [56, 0], [50, 100]])], 100, 100),
    front: box([P([[44, 0], [56, 0], [50, 100]])], 100, 100)
  }
};

export function glyph(art, view) {
  const shape = SHAPES[art] || SHAPES.liner;
  return shape[view] || shape.side || shape.stand;
}

export function human() {
  return box([
    E(50, 88, 7, 7),
    P([[44, 78], [56, 78], [58, 52], [62, 40], [54, 36], [50, 48], [46, 36], [38, 40], [42, 52]]),
    P([[46, 36], [42, 6], [47, 0], [50, 8], [53, 0], [58, 6], [54, 36]])
  ], 100, 100);
}

export const ART = Object.keys(SHAPES);
