// Seven levels in two missions. start: where the booster comes in. sea: heave in metres, pitch in radians,
// period in seconds. wind: base and gust in m/s along x, turb in degrees a second of buffeting.
// Fuel is for the slim booster; the giant stainless one carries nine times as much.
const D = Math.PI / 180, flat = {heave: 0, pitch: 0, period: 9};
export const LEVELS = [
  {id: 'calm', mission: 'ship', kind: 'ship', vehicle: 'f9', name: 'Calm', blurb: 'Flat sea, light air. Learn the burn.', mult: 1, fuel: 4600, rcs: 100,
    start: {x: -160, y: 2200, vx: 4, vy: -115, jitter: 60}, sea: {heave: 0.35, pitch: 0.8 * D, period: 9}, wind: {base: 0, gust: 1.2, turb: 0}, sky: 'day'},
  {id: 'windy', mission: 'ship', kind: 'ship', vehicle: 'f9', name: 'Windy', blurb: 'Gusts push you off the deck. The swell picks up.', mult: 1.5, fuel: 4850, rcs: 100,
    start: {x: -520, y: 3800, vx: 8, vy: -150, jitter: 120}, sea: {heave: 1.1, pitch: 2.4 * D, period: 8}, wind: {base: 9, gust: 8, turb: 0.7}, sky: 'dusk'},
  {id: 'night', mission: 'ship', kind: 'ship', vehicle: 'f9', name: 'Night', blurb: 'Supersonic from 7 km in the dark. Find the deck lights.', mult: 2, fuel: 5900, rcs: 100,
    start: {x: -750, y: 7000, vx: 22, vy: -360, jitter: 150}, sea: {heave: 1.5, pitch: 3.2 * D, period: 8}, wind: {base: -6, gust: 6, turb: 0.6}, sky: 'night'},
  {id: 'storm', mission: 'ship', kind: 'ship', vehicle: 'f9', name: 'Storm', blurb: 'Entry burn, then a heaving deck in a gale.', mult: 3, fuel: 6900, rcs: 120,
    start: {x: -950, y: 11000, vx: 40, vy: -430, jitter: 200}, sea: {heave: 2.5, pitch: 4.7 * D, period: 7}, wind: {base: -12, gust: 11, turb: 1.2}, sky: 'storm'},
  {id: 'catch-calm', mission: 'tower', kind: 'tower', vehicle: 'sh', name: 'Catch: calm', blurb: 'Bring it in between the arms and hold it there.', mult: 1.5, fuel: 4800, rcs: 120,
    start: {x: 260, y: 2600, vx: -3, vy: -120, jitter: 60}, sea: flat, wind: {base: 0, gust: 1.2, turb: 0}, sky: 'day'},
  {id: 'catch-cross', mission: 'tower', kind: 'tower', vehicle: 'sh', name: 'Catch: crosswind', blurb: 'A wind blowing you onto the tower.', mult: 2.5, fuel: 5000, rcs: 120,
    start: {x: 420, y: 3400, vx: -6, vy: -140, jitter: 100}, sea: flat, wind: {base: -7, gust: 6, turb: 0.5}, sky: 'dusk'},
  {id: 'catch-night', mission: 'tower', kind: 'tower', vehicle: 'sh', name: 'Catch: night', blurb: 'Floodlights, gusts and a tower you can hardly see.', mult: 3.5, fuel: 5300, rcs: 120,
    start: {x: 520, y: 4200, vx: -8, vy: -170, jitter: 140}, sea: flat, wind: {base: 4, gust: 6, turb: 0.6}, sky: 'night'}
];
export const MISSIONS = [
  {id: 'ship', name: 'Drone ship landing', vehicle: 'f9', blurb: 'Slim DEXM Labs booster. White body, nine engines, four legs. Land on a ship that heaves and pitches with the swell.'},
  {id: 'tower', name: 'Tower catch', vehicle: 'sh', blurb: 'Giant DEXM Labs booster. Stainless steel, thirty three engines, no legs. Hover it between the chopstick arms and let them close.'}
];
export const level = id => LEVELS.find(l => l.id === id) || LEVELS[0];
