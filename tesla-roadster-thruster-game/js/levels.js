// Nine levels in three modes. Platforms are solid blocks: {x0, x1, y} is the top surface, in metres.
export const MISSIONS = [
  {id: 'sprint', name: 'Thruster Sprint', blurb: 'Drag launches with the rear thruster. Hold D to go, Space to boost, and lift over the gaps with W.'},
  {id: 'hover', name: 'Hover Hops', blurb: 'Booster style. W and S set the lift thrusters, Q and E lean. Hop between platforms and land flat on the pad.'},
  {id: 'space', name: 'Space Drive', blurb: 'The Roadster and its mannequin driver, drifting past Earth and Mars. Fire the RCS thrusters, collect every star, then park on the beacon.'}];
const strip = (...p) => p.map(([x0, x1, y]) => ({x0, x1, y}));
export const LEVELS = [
  {id: 'quarter', mode: 'sprint', name: 'Quarter mile', mult: 1, blurb: 'A straight 402 m. Launch hard.', plats: strip([-40, 900, 0]), finish: 402, par: 5.0, gas: 100, tmax: 30},
  {id: 'gap', mode: 'sprint', name: 'Gap jump', mult: 1.5, blurb: 'A 24 m gap in the strip. Lift over it.', plats: strip([-40, 230, 0], [254, 900, 0]), finish: 402, par: 5.2, gas: 100, tmax: 30},
  {id: 'canyon', mode: 'sprint', name: 'Canyon run', mult: 2, blurb: 'Two gaps and a drop to a lower road, half a mile.', plats: strip([-40, 210, 0], [240, 380, -2], [418, 1100, -2]), finish: 805, par: 7.6, gas: 100, tmax: 40},
  {id: 'hop', mode: 'hover', name: 'First hop', mult: 1, blurb: 'One gap, one pad. Lift, drift, land flat.', plats: strip([-20, 25, 0], [45, 90, 0]), pad: {plat: 1, x: 68, half: 8}, par: 14, gas: 100, tmax: 90},
  {id: 'steps', mode: 'hover', name: 'Steps', mult: 1.5, blurb: 'Two platforms, each higher than the last.', plats: strip([-20, 22, 0], [40, 60, 5], [76, 104, 11]), pad: {plat: 2, x: 90, half: 6}, par: 20, gas: 100, tmax: 90},
  {id: 'rooftops', mode: 'hover', name: 'Rooftops', mult: 2.5, blurb: 'Narrow tops, a crosswind and a small pad.', plats: strip([-20, 20, 0], [36, 48, 6], [64, 74, 12], [92, 106, 18]), pad: {plat: 3, x: 99, half: 4.5}, par: 26, gas: 100, wind: -0.35, tmax: 100},
  {id: 'drift', mode: 'space', name: 'First drift', mult: 1, blurb: 'Three stars and a beacon near Earth.', items: [[40, 10], [90, -15], [140, 20]], target: {x: 190, y: 0, r: 4}, par: 60, gas: 100, tmax: 180, sky: 'earth'},
  {id: 'flyby', mode: 'space', name: 'Earth flyby', mult: 1.5, blurb: 'You start drifting. Five stars, then stop on the beacon.', start: {vx: 3, vy: -1}, items: [[50, 30], [100, 60], [160, 30], [120, -30], [60, -50]], target: {x: 0, y: -80, r: 4}, par: 85, gas: 100, tmax: 220, sky: 'earth'},
  {id: 'mars', mode: 'space', name: 'Mars approach', mult: 2.5, blurb: 'Mars pulls on you. Six stars around it, then the beacon.', start: {x: -220, y: 0, vx: 1.5}, bodies: [{x: 0, y: 0, r: 60, gm: 2600}], items: [[-140, 90], [0, 130], [140, 90], [160, -40], [60, -120], [-80, -110]], target: {x: -170, y: -60, r: 4}, par: 120, gas: 120, tmax: 280, sky: 'mars', bound: 900}];
export const level = id => LEVELS.find(l => l.id === id) || LEVELS[0];
