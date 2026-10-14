// A sensible operator, to prove each scenario can be played well.
import * as G from '../js/game.js';
export function play(id, seed = 1, opts = {}) {
  let g = G.newGame(id, seed);
  while (!g.done) {
    const d = g.demand(g.t) ?? 0.5, P = g.u.c.P, sc = G.byId(id);
    if (id === 'night' && opts.refuse && g.t > 5 && !g.u.c.az5) g = G.pressAz5(g);
    if (id === 'night' && opts.greedy && g.u.testAt !== undefined && g.t > g.u.testAt + 36 && !g.u.c.az5) g = G.pressAz5(g);
    if (id === 'night' && !opts.refuse && !opts.greedy && (g.t > 165 || (g.u.testAt !== undefined && P > 0.33)) && !g.u.c.az5) g = G.pressAz5(g);
    if (!g.u.c.az5) { const floor = opts.greedy ? 0 : G.ORM_LIMIT + 1, dd = opts.greedy ? 0.22 : d; const dP = (P - (g.prevP ?? P)) / 0.25, want = Math.max(-0.5, Math.min(0.5, 3 * (P - dd) / Math.max(dd, 0.1) + 40 * dP / Math.max(P, 0.05))), target = g.u.c.rods + want; g = G.setRods(g, Math.max(floor, target)); }
    if (g.u.testAt === undefined) g = G.setLoad(g, Math.min(1.05, P + (g.u.p - 1) * 2));
    if (!g.u.autoFeed) g = G.setFeed(g, P - 0.8 * g.u.lvl);
    g = {...G.tick(g), prevP: P};
  }
  return g;
}
