// Flight Path puzzle generator and solver. Pure functions, no DOM, so the tests run them in Node.
// A puzzle: an n by n grid, a solution path that visits every cell once, numbered waypoints along that path,
// and optional walls between neighbouring cells that the path never crosses. The generator keeps adding
// waypoints (and walls on wall days) until a backtracking solver finds exactly one solution.
export const EPOCH = '2026-10-21'; // puzzle #1

export function hashStr(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; }
export function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const ri = (r, n) => Math.floor(r() * n);

export function dayNumber(date) { return Math.round((Date.parse(date + 'T00:00:00Z') - Date.parse(EPOCH + 'T00:00:00Z')) / 864e5) + 1; }
export function utcDate(d = new Date()) { return d.toISOString().slice(0, 10); }

// Difficulty through the week (UTC): Monday is gentle, the weekend is big and walled.
// [size, first waypoint count, walls?, label]
const WEEK = {1: [5, 6, 0, 'Easy'], 2: [5, 6, 0, 'Easy'], 3: [6, 7, 0, 'Medium'], 4: [6, 6, 1, 'Medium'], 5: [7, 9, 1, 'Hard'], 6: [7, 7, 1, 'Very hard'], 0: [7, 6, 1, 'Expert']};
export function settingsFor(date) { const w = new Date(date + 'T12:00:00Z').getUTCDay(); const [size, wp, walls, label] = WEEK[w]; return {size, wp, walls: !!walls, label}; }

export const wallKey = (a, b) => a < b ? a + '-' + b : b + '-' + a;
function neighbours(n, c) { const x = c % n, y = (c / n) | 0, o = []; if (x > 0) o.push(c - 1); if (x < n - 1) o.push(c + 1); if (y > 0) o.push(c - n); if (y < n - 1) o.push(c + n); return o; }
export function adjacency(n, walls) {
  const ws = new Set(walls.map(([a, b]) => wallKey(a, b)));
  return Array.from({length: n * n}, (_, c) => neighbours(n, c).filter(d => !ws.has(wallKey(c, d))));
}

// A random Hamiltonian path: start from a snake and apply many 'backbite' moves, which keep it a
// Hamiltonian path while shuffling its shape (and its ends) at random.
export function hamiltonianPath(n, r) {
  let p = [];
  for (let y = 0; y < n; y++) for (let i = 0; i < n; i++) p.push(y * n + (y % 2 ? n - 1 - i : i));
  if (r() < .5) p = p.map(c => (c % n) * n + ((c / n) | 0)); // transpose
  const pos = new Int32Array(n * n);
  const index = () => p.forEach((c, i) => { pos[c] = i; });
  index();
  const steps = n * n * 60;
  for (let s = 0; s < steps; s++) {
    if (r() < .5) p.reverse(), index();
    const end = p[p.length - 1], nb = neighbours(n, end), q = nb[ri(r, nb.length)], j = pos[q];
    if (j === p.length - 2) continue;
    // join end to q, then reverse the tail after q
    const tail = p.slice(j + 1).reverse(); p = p.slice(0, j + 1).concat(tail);
    for (let k = j + 1; k < p.length; k++) pos[p[k]] = k;
  }
  return p;
}

// Counts solutions up to `limit`. Returns {count, solutions, nodes, aborted}.
export function solve(puz, limit = 2, budget = 400000) {
  const {n} = puz, N = n * n, adj = adjacency(n, puz.walls || []);
  const num = new Int8Array(N); for (const w of puz.waypoints) num[w.cell] = w.num;
  const last = puz.waypoints.reduce((m, w) => Math.max(m, w.num), 0);
  const lastCell = puz.waypoints.find(w => w.num === last).cell;
  const start = puz.waypoints.find(w => w.num === 1).cell;
  const seen = new Uint8Array(N), path = [start], sols = []; seen[start] = 1;
  let nodes = 0, aborted = false;
  const stack = new Int32Array(N), mark = new Int32Array(N); let stamp = 0;
  function ok(head, count) {
    // every free cell (and the head) must form one connected region, and only the final waypoint may be a dead end
    stamp++; let sp = 0, reached = 0; stack[sp++] = head; mark[head] = stamp;
    while (sp) { const c = stack[--sp]; for (const d of adj[c]) if (!seen[d] && mark[d] !== stamp) { mark[d] = stamp; reached++; stack[sp++] = d; } }
    if (reached !== N - count) return false;
    let deadEnds = 0;
    for (let c = 0; c < N; c++) {
      if (seen[c]) continue;
      let deg = 0; for (const d of adj[c]) if (!seen[d] || d === head) deg++;
      if (deg === 0) return false;
      if (deg === 1) { if (c !== lastCell) return false; deadEnds++; }
    }
    return deadEnds <= 1;
  }
  function go(head, next) {
    if (++nodes > budget) { aborted = true; return; }
    if (path.length === N) { if (head === lastCell) sols.push(path.slice()); return; }
    if (head === lastCell) return;
    for (const d of adj[head]) {
      if (seen[d]) continue;
      if (num[d] && num[d] !== next) continue;
      seen[d] = 1; path.push(d);
      if (ok(d, path.length)) go(d, num[d] ? next + 1 : next);
      seen[d] = 0; path.pop();
      if (sols.length >= limit || aborted) return;
    }
  }
  if (N === 1) sols.push([start]); else go(start, 2);
  return {count: sols.length, solutions: sols, nodes, aborted};
}

function placeWaypoints(path, k, r) {
  const L = path.length, idx = new Set([0, L - 1]);
  for (let i = 1; i < k - 1; i++) {
    const base = Math.round(i * (L - 1) / (k - 1)), jit = Math.max(1, Math.floor((L - 1) / (k - 1) / 3));
    let j = Math.min(L - 2, Math.max(1, base + ri(r, 2 * jit + 1) - jit));
    while (idx.has(j) && j < L - 2) j++;
    idx.add(j);
  }
  return [...idx].sort((a, b) => a - b);
}
const build = (n, path, idxs, walls) => ({n, walls: walls.slice(), waypoints: idxs.map((i, k) => ({cell: path[i], num: k + 1}))});

// Makes one puzzle from a seed. opts: {size, wp, walls}
export function generate(seed, opts) {
  const r = rng(seed), n = opts.size, maxWp = 12;
  for (let attempt = 0; attempt < 40; attempt++) {
    const path = hamiltonianPath(n, r), at = new Int32Array(n * n); path.forEach((c, i) => { at[c] = i; });
    const idxs = new Set(placeWaypoints(path, opts.wp, r)), walls = [];
    // non-path edges are wall candidates
    const free = []; for (let c = 0; c < n * n; c++) for (const d of neighbours(n, c)) if (c < d && Math.abs(at[c] - at[d]) !== 1) free.push([c, d]);
    if (opts.walls) for (let w = 0; w < Math.max(2, n - 3); w++) { const e = free.splice(ri(r, free.length), 1)[0]; walls.push(e); }
    let useWall = !!opts.walls;
    for (let guard = 0; guard < 60; guard++) {
      const puz = build(n, path, [...idxs].sort((a, b) => a - b), walls);
      const res = solve(puz, 2);
      if (!res.aborted && res.count === 1) return {...puz, solution: path, unique: true, seed, attempt};
      if (res.aborted && idxs.size >= maxWp) break;
      // where does another solution part from mine? pin my path there
      const other = res.solutions.find(s => s.some((c, i) => c !== path[i]));
      let i = other ? other.findIndex((c, k) => c !== path[k]) : 1 + ri(r, path.length - 2);
      if (useWall && other && free.length) {
        // block the other route's wrong step with a wall when that edge is not on my path
        const a = other[i - 1], b = other[i], e = free.findIndex(([x, y]) => wallKey(x, y) === wallKey(a, b));
        if (e >= 0) { walls.push(free.splice(e, 1)[0]); useWall = false; continue; }
      }
      useWall = !!opts.walls;
      if (idxs.size >= maxWp) { if ((opts.walls || attempt >= 12) && other && free.length && walls.length < 2 * n) { useWall = true; continue; } break; }
      // pin my cell at the step where the other route parts from mine: the other route visits its own cell
      // there first, so it now reaches the new waypoint out of order and is ruled out
      let j = Math.min(path.length - 2, Math.max(1, i));
      if (idxs.has(j)) { j = 1 + ri(r, path.length - 2); while (idxs.has(j)) j = 1 + ri(r, path.length - 2); }
      idxs.add(j);
    }
  }
  throw new Error('no unique puzzle for seed ' + seed);
}

export function daily(date) {
  const s = settingsFor(date);
  const p = generate(hashStr('flight-path:' + date), s);
  return {...p, date, number: dayNumber(date), label: s.label};
}
export function practice(seed, size) { return {...generate(seed >>> 0, {size, wp: size === 5 ? 8 : size === 6 ? 8 : 9, walls: size === 7}), label: 'Practice'}; }

// Checks a finished path against a puzzle: every cell once, orthogonal steps, no walls, waypoints in order.
export function checkPath(puz, path) {
  const n = puz.n, N = n * n, adj = adjacency(n, puz.walls || []);
  if (path.length !== N || new Set(path).size !== N) return false;
  for (let i = 1; i < N; i++) if (!adj[path[i - 1]].includes(path[i])) return false;
  const order = path.map(c => (puz.waypoints.find(w => w.cell === c) || {}).num).filter(Boolean);
  return order.every((v, i) => v === i + 1) && order.length === puz.waypoints.length && path[N - 1] === puz.waypoints[puz.waypoints.length - 1].cell;
}
