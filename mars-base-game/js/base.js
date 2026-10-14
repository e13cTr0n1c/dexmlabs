// Per sol, crew of four. Sources in the page text.
export const CREW = {o2: 3.36, water: 12, food: 6};
export const UNIT = {
  solar: {name: 'Solar array', kwh: 40},
  o2: {name: 'Oxygen plant', use: 20, make: 2.2},
  drill: {name: 'Ice drill', use: 15, make: 20},
  green: {name: 'Greenhouse', use: 25, make: 3.5, water: 4, grow: 4},
  battery: {name: 'Battery', store: 60},
};
export const HAB = 20, COST = 2, SOLS = 30;
export const solarFactor = tau => Math.exp(-tau) / Math.exp(-0.5);
export function newBase() {
  return {sol: 1, o2: 40, water: 150, food: 120, charge: 60, parts: 16, science: 0, solar: 2, o2u: 1, drill: 1, battery: 1, green: [], done: false, lost: null, log: []};
}
export function canBuild(b) { return b.parts >= COST; }
export function act(b0, action, tau) {
  const b = structuredClone(b0); if (b.done) return b;
  if (action !== 'research') { if (!canBuild(b)) action = 'research'; else { b.parts -= COST; if (action === 'green') b.green.push(b.sol); else b[action === 'o2' ? 'o2u' : action] += 1; } }
  const solar = b.solar * UNIT.solar.kwh * solarFactor(tau);
  let e = solar + b.charge; const run = (n, use) => { let k = 0; while (k < n && e >= use) { e -= use; k++; } return k; };
  const hab = e >= HAB; if (hab) e -= HAB;
  const o2 = run(b.o2u, UNIT.o2.use), drill = run(b.drill, UNIT.drill.use), ripe = b.green.filter(s => b.sol - s >= UNIT.green.grow).length, green = run(b.green.length, UNIT.green.use);
  const greenRipe = Math.min(green, ripe);
  b.charge = Math.min(b.battery * UNIT.battery.store, e);
  b.o2 += o2 * UNIT.o2.make - CREW.o2; b.water += drill * UNIT.drill.make - CREW.water - green * UNIT.green.water; b.food += greenRipe * UNIT.green.make - CREW.food;
  const full = hab && o2 === b.o2u && drill === b.drill && green === b.green.length;
  if (action === 'research') b.science += full ? 10 : 4;
  b.log.push({sol: b.sol, tau, solar: Math.round(solar), full, low: b.o2 < 12 || b.water < 36 || b.food < 18});
  if (!hab) b.lost = 'The habitat lost heat and power.'; else if (b.o2 < 0) b.lost = 'The oxygen ran out.'; else if (b.water < 0) b.lost = 'The water ran out.'; else if (b.food < 0) b.lost = 'The food ran out.';
  if (b.lost || b.sol === SOLS) b.done = true; else b.sol++;
  return b;
}
