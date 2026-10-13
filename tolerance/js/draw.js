/** Tolerance: one SVG drawing per mechanism, with its given values on it. The unknown is marked with a "?". */
const W = 400, H = 240;
const t = (x, y, s, cls = '') => `<text x="${x}" y="${y}" class="${cls}" text-anchor="middle">${s}</text>`;
const gear = (x, y, r, teeth) => { let d = ''; const k = Math.min(teeth, 40); for (let i = 0; i < k; i++) { const a = i / k * Math.PI * 2; d += `M${(x + r * Math.cos(a)).toFixed(1)} ${(y + r * Math.sin(a)).toFixed(1)}L${(x + (r + 6) * Math.cos(a)).toFixed(1)} ${(y + (r + 6) * Math.sin(a)).toFixed(1)}`; } return `<circle cx="${x}" cy="${y}" r="${r}" class="part"/><path d="${d}" class="teeth"/><circle cx="${x}" cy="${y}" r="4" class="hub"/>`; };
const arrow = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="arrow" marker-end="url(#tip)"/>`;
const ask = (x, y) => t(x, y, '?', 'ask');
const DRAW = {
  gears: v => gear(70, 150, 22, v.a) + `<g class="behind">${gear(70 + 22 + 6 + 52, 150, 52, v.b)}</g>` + gear(150, 150, 20, v.c) + gear(150 + 20 + 6 + 50, 150, 50, v.d) + '<line x1="150" y1="60" x2="150" y2="215" class="shaft"/>' +
    t(70, 115, `${v.a}T`) + t(150, 52, 'shared shaft', 'small') + t(130, 228, `${v.b}T`) + t(150, 190, `${v.c}T`, 'small') + t(226, 228, `${v.d}T`) + t(70, 205, `${v.rpm} rpm in`) + ask(226, 150) + t(320, 150, 'rpm out?'),
  lever: v => { const f = 80 + 240 * v.a / (v.a + v.b); return `<line x1="80" y1="140" x2="320" y2="140" class="part beam"/><path d="M${f} 142 l-16 34 h32z" class="part"/>` + arrow(80, 70, 80, 132) + t(80, 62, `${v.effort} N`) + t((80 + f) / 2, 128, `${v.a} m`) + t((f + 300) / 2, 128, `${v.b} m`) + '<rect x="300" y="100" width="40" height="38" class="part"/>' + ask(320, 125) + t(320, 90, 'load?'); },
  pulley: v => { let s = '<line x1="60" y1="30" x2="340" y2="30" class="part beam"/><rect x="150" y="50" width="100" height="26" class="part"/><rect x="150" y="140" width="100" height="26" class="part"/>'; for (let i = 0; i < v.ropes; i++) { const x = 160 + i * 80 / Math.max(1, v.ropes - 1); s += `<line x1="${x}" y1="76" x2="${x}" y2="140" class="rope"/>`; } return s + '<line x1="250" y1="63" x2="300" y2="200" class="rope"/>' + arrow(300, 180, 306, 216) + t(320, 232, 'pull?') + `<rect x="170" y="182" width="60" height="40" class="part"/>` + t(200, 207, `${v.kg} kg`) + t(110, 112, `${v.ropes} ropes`) ; },
  belt: v => { const r1 = 20 + v.d1 / 10, r2 = 20 + v.d2 / 10; return `<circle cx="110" cy="130" r="${r1}" class="part"/><circle cx="290" cy="130" r="${r2}" class="part"/><line x1="110" y1="${130 - r1}" x2="290" y2="${130 - r2}" class="rope"/><line x1="110" y1="${130 + r1}" x2="290" y2="${130 + r2}" class="rope"/>` + t(110, 134, `⌀${v.d1}`) + t(290, 134, `⌀${v.d2}`) + t(110, 215, `${v.rpm} rpm`) + t(290, 225, 'rpm?') + ask(290, 105); },
  jack: v => '<path d="M150 210 h100 l-20 -30 h-60z" class="part"/><rect x="185" y="70" width="30" height="110" class="part"/><path d="M185 90 l30 8 M185 110 l30 8 M185 130 l30 8 M185 150 l30 8" class="teeth"/><line x1="200" y1="78" x2="340" y2="78" class="part beam"/><rect x="170" y="44" width="60" height="22" class="part"/>' + arrow(340, 110, 340, 84) + t(340, 128, `${v.effort} N`) + t(270, 70, `r ${v.r} mm`) + t(110, 140, `pitch ${v.pitch} mm`) + ask(200, 38) + t(200, 22, 'load?'),
  axle: v => `<circle cx="180" cy="110" r="80" class="part"/><circle cx="180" cy="110" r="22" class="part"/><line x1="260" y1="110" x2="260" y2="210" class="rope"/><line x1="158" y1="110" x2="158" y2="190" class="rope"/>` + arrow(260, 190, 260, 222) + t(300, 225, `${v.effort} N`) + t(225, 100, `R ${v.R} mm`) + t(180, 145, `r ${v.r}`, 'small') + `<rect x="133" y="190" width="50" height="34" class="part"/>` + ask(158, 213) + t(100, 210, 'load?'),
  rack: v => { let s = `<rect x="40" y="170" width="320" height="22" class="part"/>`; for (let x = 44; x < 360; x += 12) s += `<path d="M${x} 170 l4 -7 l4 7" class="teeth"/>`; return s + gear(200, 110, 46, v.teeth) + t(200, 60, `${v.teeth}T, module ${v.module}`) + t(200, 114, `${v.turns} turns`) + arrow(240, 210, 320, 210) + t(280, 232, 'distance?') + ask(340, 160); },
  slope: v => `<path d="M60 200 L340 200 L340 ${200 - 80 * v.h} Z" class="part"/>` + t(200, 225, `slope ${v.L} m`) + t(362, 200 - 40 * v.h, `${v.h} m`) + `<rect x="190" y="${168 - 40 * v.h}" width="40" height="28" class="part" transform="rotate(${-Math.atan(80 * v.h / 280) * 180 / Math.PI} 210 ${200 - 40 * v.h})"/>` + t(210, 150 - 40 * v.h, `${v.kg} kg`) + t(120, 140, 'push?') + ask(150, 170),
  worm: v => { let s = '<rect x="60" y="40" width="200" height="30" class="part"/>'; for (let x = 66; x < 260; x += 14) s += `<line x1="${x}" y1="40" x2="${x + 8}" y2="70" class="teeth"/>`; return s + gear(160, 150, 60, v.teeth) + t(160, 28, `${v.starts} start worm, ${v.rpm} rpm`) + t(160, 154, `${v.teeth}T`) + t(320, 150, 'rpm?') + ask(270, 150); },
  hydraulic: v => { const w1 = 10 + v.d1, w2 = 40 + v.d2; return `<path d="M60 90 v100 h280 v-100" class="part"/><rect x="${90 - w1 / 2}" y="100" width="${w1}" height="14" class="part"/><rect x="${260 - w2 / 2}" y="100" width="${w2}" height="14" class="part"/>` + arrow(90, 50, 90, 96) + t(90, 42, `${v.effort} N`) + t(90, 140, `⌀${v.d1} mm`) + t(260, 140, `⌀${v.d2} mm`) + arrow(260, 96, 260, 52) + t(260, 40, 'force?') + ask(200, 175); },
  chain: v => `<circle cx="110" cy="130" r="${12 + v.a}" class="part"/><circle cx="290" cy="130" r="${12 + v.b}" class="part"/><line x1="110" y1="${118 - v.a}" x2="290" y2="${118 - v.b}" class="rope dash"/><line x1="110" y1="${142 + v.a}" x2="290" y2="${142 + v.b}" class="rope dash"/>` + t(110, 134, `${v.a}T`) + t(290, 134, `${v.b}T`) + t(110, 222, 'input') + t(290, 222, 'output') + t(200, 40, 'speed ratio?') + ask(200, 134),
};
export function drawing(p) {
  return `<svg viewBox="0 0 ${W} ${H}" class="mech" role="img" aria-label="${p.name}: ${describe(p)}"><defs><marker id="tip" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" class="tip"/></marker></defs>${DRAW[p.type](p.v)}</svg>`;
}
/** The givens in words, for screen readers and for the card under the drawing. */
export function describe(p) {
  const v = p.v;
  return {
    gears: `input ${v.rpm} rpm. A ${v.a} tooth gear drives a ${v.b} tooth gear. On that shaft a ${v.c} tooth gear drives a ${v.d} tooth gear on the output`,
    lever: `effort ${v.effort} N at ${v.a} m from the fulcrum, load at ${v.b} m on the other side`,
    pulley: `a ${v.kg} kg load held by ${v.ropes} rope sections`,
    belt: `driver pulley ${v.d1} mm at ${v.rpm} rpm, driven pulley ${v.d2} mm`,
    jack: `effort ${v.effort} N on a handle of radius ${v.r} mm, screw pitch ${v.pitch} mm`,
    axle: `effort ${v.effort} N on a wheel of radius ${v.R} mm, load on an axle of radius ${v.r} mm`,
    rack: `a ${v.teeth} tooth pinion of module ${v.module} turns ${v.turns} times`,
    slope: `a ${v.kg} kg load on a smooth slope ${v.L} m long rising ${v.h} m`,
    worm: `a ${v.starts} start worm at ${v.rpm} rpm drives a ${v.teeth} tooth wheel`,
    hydraulic: `${v.effort} N on a ${v.d1} mm piston, output piston ${v.d2} mm`,
    chain: `a ${v.a} tooth sprocket on the input drives a ${v.b} tooth sprocket on the output`,
  }[p.type];
}
