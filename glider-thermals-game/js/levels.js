// Seven flights, from a glide down to the airfield to a sunset cross country with ridge lift.
// Metres. start: x, height above ground, heading. thermals: core x, z, radius r, core lift w m/s, cloud base.
// hills: bumps {x, h, up, down}. ridges: lift on the face (face -1: windward side is the left). waves: lift
// bands {x, lambda, amp, hmin, hmax, n}. surface: what's on the ground, everything else is open fields.
// tps: turnpoints with a 500 m zone. finish: the airfield you land at, with the landing spot.
const af = (x, len = 1000) => ({kind: 'airfield', x0: x - len / 2, x1: x + len / 2});
export const LEVELS = [
  {id: 'evening-glide', name: 'Evening glide', blurb: 'Glide down to the airfield and land on the spot. You have height to spare.', mult: 1, par: 200, sky: 'gold',
    start: {x: -3200, agl: 320}, finish: {x0: 600, x1: 1600, spot: 1000}, surface: [af(1100), {kind: 'forest', x0: -1400, x1: -800}], wind: {base: 0}, sink: 0.2, thermals: [], bounds: [-8000, 9000]},
  {id: 'first-thermal', name: 'First thermal', blurb: 'Circle in the thermal under the cloud, climb, then glide to the next airfield.', mult: 1.3, par: 900, sky: 'gold',
    start: {x: 0, agl: 380}, thermals: [{x: 1600, r: 240, w: 3.2, base: 1400}], finish: {x0: 14500, x1: 15500, spot: 14800}, surface: [af(0), af(15000), {kind: 'forest', x0: 6000, x1: 7400}, {kind: 'water', x0: 10000, x1: 10900}], wind: {base: 0}, sink: 0.3, bounds: [-6000, 24000]},
  {id: 'cloud-street', name: 'Cloud street', blurb: 'Out to a turnpoint 12 km away and back, under a line of cumulus.', mult: 1.6, par: 1500, sky: 'gold',
    start: {x: 0, agl: 450}, thermals: [{x: 2200, r: 230, w: 3, base: 1500}, {x: 6400, r: 220, w: 2.8, base: 1600}, {x: 10200, r: 230, w: 3, base: 1600}, {x: 4300, z: 300, r: 210, w: 2.6, base: 1500, birds: 0}],
    tps: [{x: 12000, name: 'Mill'}], finish: {x0: -500, x1: 500, spot: -100}, surface: [af(0), {kind: 'town', x0: 7600, x1: 8600}, {kind: 'forest', x0: 3000, x1: 3800}], hills: [{x: 9000, h: 120, up: 900, down: 900}], wind: {base: 2}, sink: 0.4, bounds: [-6000, 20000]},
  {id: 'ridge', name: 'Ridge run', blurb: 'A strong wind on a long ridge. Soar along the face, then run downwind to the airfield.', mult: 1.9, par: 1200, sky: 'gold',
    start: {x: 3600, agl: 420, psi: 0}, hills: [{x: 6200, h: 380, up: 700, down: 1400}], ridges: [{x: 6200, face: 1}], thermals: [], finish: {x0: 17500, x1: 18500, spot: 17800},
    surface: [af(18000), {kind: 'forest', x0: 5300, x1: 7600}, {kind: 'town', x0: 14000, x1: 15200}], wind: {base: 9}, sink: 0.35, bounds: [-4000, 34000]},
  {id: 'wave', name: 'Mountain wave', blurb: 'Climb in the smooth wave behind the mountain, fly upwind to the turnpoint, then home.', mult: 2.3, par: 1800, sky: 'dusk',
    start: {x: 4500, agl: 900}, hills: [{x: 7000, h: 900, up: 1500, down: 1800}], ridges: [{x: 7000, face: 1}], waves: [{x: 8200, lambda: 5200, amp: 3.2, hmin: 950, hmax: 2900, n: 2}],
    thermals: [], tps: [{x: -5000, name: 'Lake hut'}], finish: {x0: 21500, x1: 22500, spot: 21800}, surface: [af(22000), {kind: 'forest', x0: 5000, x1: 9000}, {kind: 'water', x0: -6500, x1: -3500}], wind: {base: 13}, sink: 0.4, bounds: [-12000, 30000]},
  {id: 'land-out', name: 'Land out', blurb: 'The day is dying and the finish is too far. Go as far as you can, then pick a field.', mult: 2.2, par: 9999, sky: 'dusk', target: 22000,
    start: {x: 0, agl: 700}, thermals: [{x: 4500, r: 220, w: 2.2, base: 1200}, {x: 12000, r: 210, w: 1.9, base: 1000, birds: 2}], tps: [{x: 60000, name: 'Far away'}],
    surface: [af(0), {kind: 'forest', x0: 15000, x1: 18500}, {kind: 'town', x0: 19500, x1: 21000}, {kind: 'water', x0: 23500, x1: 25500}, {kind: 'forest', x0: 26500, x1: 30000}, {kind: 'forest', x0: 7000, x1: 8200}], hills: [{x: 24000, h: 0, up: 1, down: 1}], wind: {base: 1}, sink: 0.55, bounds: [-6000, 70000]},
  {id: 'sunset-xc', name: 'Sunset cross country', blurb: 'A 30 km triangle with a turnpoint off to one side, a ridge and the last thermals of the day.', mult: 3, par: 2200, sky: 'sunset',
    start: {x: 0, agl: 500}, thermals: [{x: 2500, r: 230, w: 2.8, base: 1700}, {x: 8000, r: 220, w: 3, base: 1800}, {x: 13800, z: 200, r: 230, w: 3.2, base: 1800}, {x: 12500, z: 2600, r: 220, w: 2.6, base: 1700}, {x: 6000, z: 2400, r: 220, w: 2.6, base: 1600}],
    hills: [{x: 10500, h: 260, up: 600, down: 1000}], ridges: [{x: 10500, face: 1}], tps: [{x: 15000, name: 'Church'}, {x: 9000, z: 3500, name: 'Reservoir'}], finish: {x0: -500, x1: 500, spot: -100},
    surface: [af(0), {kind: 'forest', x0: 9600, x1: 11200}, {kind: 'town', x0: 4000, x1: 5000}, {kind: 'water', x0: 16500, x1: 17500}], wind: {base: 3}, sink: 0.45, bounds: [-8000, 24000]}
];
export const level = id => LEVELS.find(l => l.id === id) || LEVELS[0];
