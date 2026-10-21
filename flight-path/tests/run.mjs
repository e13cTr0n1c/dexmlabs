// Generator tests for Flight Path. Run: node flight-path/tests/run.mjs
// Every daily puzzle for the next 365 days: generates fast, its own solution is valid, a full backtracking
// search finds exactly one solution, the same date always gives the same puzzle, 6 to 12 beacons, and the
// week gets harder. Practice puzzles are unique too.
import {daily, practice, solve, checkPath, settingsFor, dayNumber, hamiltonianPath, rng, adjacency} from '../js/gen.mjs';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL ' + m); } };
const day = (i, from = new Date().toISOString().slice(0, 10)) => new Date(Date.parse(from + 'T00:00:00Z') + i * 864e5).toISOString().slice(0, 10);

// backbite paths are Hamiltonian
for (const n of [5, 6, 7]) for (let s = 1; s <= 30; s++) {
  const p = hamiltonianPath(n, rng(s)), adj = adjacency(n, []);
  ok(new Set(p).size === n * n && p.every((c, i) => !i || adj[p[i - 1]].includes(c)), `hamiltonian ${n}x${n} seed ${s}`);
}
// the solver finds the obvious answer on a tiny puzzle and counts several when there are several
{
  const snake = {n: 3, walls: [], waypoints: [{cell: 0, num: 1}, {cell: 6, num: 2}]};
  const r = solve(snake, 10);
  ok(r.count > 1 && r.solutions.every(s => checkPath(snake, s)), `solver counts more than one route on an open 3x3 (${r.count})`);
  const pinned = {n: 3, walls: [], waypoints: [{cell: 0, num: 1}, {cell: 2, num: 2}, {cell: 5, num: 3}, {cell: 3, num: 4}, {cell: 6, num: 5}, {cell: 8, num: 6}]};
  ok(solve(pinned, 10).count === 1, 'solver finds a single snake');
}
const t0 = Date.now(); let worst = 0, worstDate = '';
const levels = {};
for (let i = 0; i < 365; i++) {
  const d = day(i), s = Date.now(), p = daily(d), ms = Date.now() - s;
  if (ms > worst) { worst = ms; worstDate = d; }
  const set = settingsFor(d);
  ok(p.n === set.size && p.solution.length === p.n * p.n, `${d}: size ${p.n}`);
  ok(checkPath(p, p.solution), `${d}: its own solution is valid`);
  ok(p.waypoints.length >= 6 && p.waypoints.length <= 12, `${d}: 6 to 12 beacons (${p.waypoints.length})`);
  ok(p.waypoints[0].cell === p.solution[0] && p.waypoints[p.waypoints.length - 1].cell === p.solution[p.solution.length - 1], `${d}: starts on 1 and ends on the last beacon`);
  const r = solve(p, 2, 5e6);
  ok(!r.aborted && r.count === 1 && r.solutions[0].every((c, k) => c === p.solution[k]), `${d}: unique (${r.count}${r.aborted ? ', aborted' : ''})`);
  ok(p.unique === true, `${d}: marked unique`);
  ok(p.walls.every(([a, b]) => Math.abs(p.solution.indexOf(a) - p.solution.indexOf(b)) !== 1), `${d}: no wall crosses the solution`);
  ok(ms < 1000, `${d}: generated in ${ms} ms`);
  (levels[p.n] = levels[p.n] || []).push(p.waypoints.length);
  if (i < 20) { const q = daily(d); ok(JSON.stringify(q) === JSON.stringify(p), `${d}: deterministic`); }
}
const total = Date.now() - t0;
ok(daily('2026-10-26').n === 5 && daily('2026-10-29').walls.length > 0 && daily('2026-11-01').n === 7, 'Monday is 5x5, Thursday has walls, Sunday is 7x7');
ok(dayNumber('2026-10-21') === 1 && dayNumber('2026-11-01') === 12, 'puzzle numbers count from 21 October 2026');
ok(daily('2026-10-22').waypoints.map(w => w.cell).join() !== daily('2026-10-23').waypoints.map(w => w.cell).join(), 'different dates give different puzzles');
for (const n of [5, 6, 7]) for (let s = 0; s < 15; s++) { const p = practice(1000 + s * 7919, n), r = solve(p, 2, 5e6); ok(p.n === n && r.count === 1 && checkPath(p, p.solution), `practice ${n}x${n} seed ${s}: unique`); }
console.log(`365 daily puzzles in ${total} ms, slowest ${worst} ms (${worstDate}); average beacons ${Object.entries(levels).map(([n, a]) => n + 'x' + n + ' ' + (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1)).join(', ')}`);
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
