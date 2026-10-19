// Four levels. start: where the booster comes in. sea: heave in metres, pitch in radians, period in seconds.
// wind: base and gust in m/s along x, turb in degrees a second of buffeting.
const D = Math.PI / 180;
export const LEVELS = [
  {id: 'calm', name: 'Calm', blurb: 'Flat sea, light air. Learn the burn.', mult: 1, fuel: 3600, rcs: 100,
    start: {x: -160, y: 2200, vx: 4, vy: -115, jitter: 60}, sea: {heave: 0.35, pitch: 0.8 * D, period: 9}, wind: {base: 0, gust: 1.2, turb: 0}, sky: 'day'},
  {id: 'windy', name: 'Windy', blurb: 'Gusts push you off the deck. The swell picks up.', mult: 1.5, fuel: 3800, rcs: 100,
    start: {x: -480, y: 3800, vx: 8, vy: -150, jitter: 120}, sea: {heave: 1.0, pitch: 2.2 * D, period: 8}, wind: {base: 8, gust: 7, turb: 0.6}, sky: 'dusk'},
  {id: 'night', name: 'Night', blurb: 'Supersonic from 7 km in the dark. Find the deck lights.', mult: 2, fuel: 4600, rcs: 100,
    start: {x: -700, y: 7000, vx: 22, vy: -360, jitter: 150}, sea: {heave: 1.4, pitch: 3 * D, period: 8}, wind: {base: -5, gust: 5, turb: 0.5}, sky: 'night'},
  {id: 'storm', name: 'Storm', blurb: 'Entry burn, then a heaving deck in a gale.', mult: 3, fuel: 5400, rcs: 120,
    start: {x: -900, y: 11000, vx: 40, vy: -430, jitter: 200}, sea: {heave: 2.4, pitch: 4.5 * D, period: 7}, wind: {base: -11, gust: 10, turb: 1.1}, sky: 'storm'}
];
export const level = id => LEVELS.find(l => l.id === id) || LEVELS[0];
