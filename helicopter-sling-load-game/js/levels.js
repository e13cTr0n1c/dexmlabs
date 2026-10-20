// Seven jobs, from a crate already on the hook to a bridge span in a gusty wind.
// x and y in metres; solids are boxes {x0, x1, top, k}; water is {x0, x1, depth}; zone.half is the
// scoring half width of the target. wind: base and gust in m/s along x, turb a quicker flutter.
const trees = (xs, seed = 1) => xs.map((x, i) => ({x0: x - 3.5, x1: x + 3.5, top: 17 + ((i * 7 + seed * 3) % 7), k: 'tree'}));
export const LEVELS = [
  {id: 'first-lift', name: 'First lift', blurb: 'A crate already on the hook. Carry it to the pad and set it down.', mult: 1, rope: 15, par: 45, sky: 'morning', scene: 'yard',
    start: {x: 0, y: 28}, carry: 0, items: [{kind: 'crate', x: 0}], tasks: [{item: 0, zone: {x: 90, half: 6}}], wind: {base: 0, gust: 0, turb: 0}, bounds: [-80, 200]},
  {id: 'crate-yard', name: 'Crate yard', blurb: 'Hook the crate yourself, then move it across the yard.', mult: 1.2, rope: 15, par: 70, sky: 'morning', scene: 'yard',
    start: {x: 0, y: 24}, items: [{kind: 'crate', x: 50}], tasks: [{item: 0, zone: {x: 180, half: 5}}], wind: {base: 0, gust: 0.6, turb: 0}, solids: [{x0: 110, x1: 124, top: 6, k: 'container'}], bounds: [-80, 260]},
  {id: 'two-crates', name: 'Two crates', blurb: 'Two crates, two pads, a light breeze.', mult: 1.4, rope: 16, par: 120, sky: 'day', scene: 'yard',
    start: {x: 0, y: 24}, items: [{kind: 'crate', x: 40}, {kind: 'crate', x: 58}], tasks: [{item: 0, zone: {x: 200, half: 4.5}}, {item: 1, zone: {x: 240, half: 4.5}}], wind: {base: 2, gust: 1.5, turb: 0.3},
    solids: [{x0: 120, x1: 134, top: 6, k: 'container'}, {x0: 134, x1: 148, top: 6, k: 'container'}], bounds: [-80, 300]},
  {id: 'rooftop', name: 'Rooftop AC', blurb: 'Set an air conditioning unit on a roof, over a taller block.', mult: 1.7, rope: 18, par: 95, sky: 'day', scene: 'town',
    start: {x: 0, y: 28}, items: [{kind: 'ac', x: 30}], tasks: [{item: 0, zone: {x: 172, half: 3.2}}], wind: {base: 3, gust: 2, turb: 0.4},
    solids: [{x0: 100, x1: 128, top: 42, k: 'building'}, {x0: 152, x1: 192, top: 30, k: 'building', roof: 1}, {x0: 206, x1: 236, top: 24, k: 'building'}], bounds: [-80, 280]},
  {id: 'forest-log', name: 'Forest log', blurb: 'Lift a log out of a clearing on a long rope and take it to the yard.', mult: 2, rope: 30, par: 115, sky: 'golden', scene: 'forest',
    start: {x: 0, y: 44}, items: [{kind: 'log', x: 60}], tasks: [{item: 0, zone: {x: 300, half: 4}}], wind: {base: 4, gust: 3, turb: 0.5},
    solids: [...trees([18, 30, 42, 78, 90, 102, 114, 150, 162, 200, 212, 224, 250], 2)], bounds: [-60, 360]},
  {id: 'fire-bucket', name: 'Fire bucket', blurb: 'Fill the bucket at the lake and put out the fire. Mind the wind.', mult: 2.3, rope: 20, par: 150, sky: 'golden', scene: 'fire',
    start: {x: 0, y: 34}, carry: 0, items: [{kind: 'bucket', x: 0}], water: [{x0: 60, x1: 150, depth: 4}], fire: {x0: 330, x1: 362}, wind: {base: 5, gust: 3, turb: 0.6},
    solids: [...trees([292, 306, 380, 394, 210, 230], 3)], bounds: [-60, 440]},
  {id: 'bridge', name: 'Bridge span', blurb: 'A 20 m steel span onto two piers over a river, in gusts.', mult: 3, rope: 25, par: 150, sky: 'dusk', scene: 'river',
    start: {x: 0, y: 40}, items: [{kind: 'bridge', x: 50}], tasks: [{item: 0, zone: {x: 244, half: 2}}], water: [{x0: 214, x1: 274, depth: 6}], wind: {base: -5, gust: 4, turb: 0.8},
    solids: [{x0: 228, x1: 236, top: 12, k: 'pier'}, {x0: 252, x1: 260, top: 12, k: 'pier'}, {x0: 170, x1: 176, top: 16, k: 'tree'}, {x0: 290, x1: 296, top: 18, k: 'tree'}], bounds: [-60, 330]}
];
for (const L of LEVELS) L.fuel = Math.round(L.par * 1.6); // kg: about 3.5 times par before the tanks run dry
export const level = id => LEVELS.find(l => l.id === id) || LEVELS[0];
