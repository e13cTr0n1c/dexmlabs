// The five runs. Starts are given relative to the station's docking port, in port axes:
// ax = distance out along the port axis, y = up (radial), z = along the port's +Z, all in metres.
// att = capsule attitude error (deg, roll/yaw/pitch about its own axes), rates = relative rates (deg/s).
export const LEVELS = [
  {id: 'tutorial', name: 'First docking', short: '10 m', fuel: 8, par: 240, sun: 50, beta: 25, early: true, tutorial: true,
    blurb: 'Ten metres out, already lined up and still. Tap forward to drift in slowly and let the latches catch you.',
    start: {ax: 10, y: 0, z: 0, v: [0, 0, 0], att: [0, 0, 0], rates: [0, 0, 0]}},
  {id: 'final', name: 'Final approach', short: '30 m', fuel: 12, par: 420, sun: 55, beta: 25, early: true,
    blurb: 'Thirty metres out on the V-bar, a little off the centreline and slightly crooked. Line up and close at a walking pace for a cat.',
    start: {ax: 30, y: 0.8, z: -0.6, v: [0, 0, 0], att: [3, -2.5, 2], rates: [0.05, -0.04, 0.06]}},
  {id: 'approach', name: '200 m approach', short: '200 m', fuel: 30, par: 900, sun: 80, beta: 15, early: true,
    blurb: 'Two hundred metres out, well off the axis and drifting. Orbital mechanics starts to show: closing along the V-bar bends you down.',
    start: {ax: 200, y: 6, z: 4.5, v: [-0.15, 0.01, -0.02], att: [-6, 8, -5], rates: [0.1, 0.12, -0.08]}},
  {id: 'tumble', name: 'Spinning station', short: '40 m', fuel: 30, par: 600, sun: 65, beta: 30,
    blurb: 'The station has lost attitude control and spins at 1°/s about its long axis with a slow wobble. Match its roll, then keep the port in your sights.',
    station: {spin: [1.0, 0.035, -0.025]},
    start: {ax: 40, y: -1.2, z: 1.0, v: [0, 0, 0], att: [0, 3, -3], rates: [-1.0, -0.035, 0.025]}},
  {id: 'rendezvous', name: 'Far rendezvous', short: '2 km', fuel: 110, par: 2400, sun: 10, beta: 20, lost: 6000,
    blurb: 'Two kilometres ahead and 120 m above the station, drifting back toward it on a slightly higher, slower orbit. Use time warp, mind the R-bar, and come in on the axis.',
    start: {ax: 2000, y: 120, z: 30, natural: true, att: [0, 4, -6], rates: [0, 0, 0]}},
  {id: 'night', name: 'Night pass', short: '60 m', fuel: 15, par: 700, sun: -90, beta: 0, night: true,
    blurb: 'Orbital night. No sun, no earthshine, only the station\'s lights, your floodlight and the docking target. Trust the numbers.',
    start: {ax: 60, y: -1.5, z: 1.2, v: [-0.05, 0, 0], att: [4, -3, 4], rates: [0.03, 0.05, -0.04]}}
];
export const byId = id => LEVELS.find(l => l.id === id) || LEVELS[0];
