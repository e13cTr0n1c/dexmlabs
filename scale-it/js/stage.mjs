// The reveal. Silhouettes slide in and park at true scale, then the real figures count up.
import { glyph, human } from './shapes.mjs';
import { item, metricOf, viewFor, bodyMetres, truthOf, formatMeasure } from './logic.mjs';
import { HUMAN_M } from './bank.mjs';

const SIZE = new Set(['length', 'span', 'height', 'now', 'pedestal', 'aerial']);
const easeOut = t => 1 - Math.pow(1 - t, 3);
const easeBack = t => {
  const c = 1.4;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
};

function dims(art, view, metres) {
  const g = art === 'human' ? human() : glyph(art, view);
  const axis = view === 'stand' || art === 'human' ? g.h : g.w;
  const k = metres / axis;
  return {g, k, w: g.w * k, h: g.h * k};
}

export function planReveal(round) {
  const truth = truthOf(round);
  const ids = round.type === 'bigger' ? [round.a, round.b]
    : round.type === 'order' ? truth.order
    : round.type === 'slider' ? [round.item]
    : [round.unit, round.subject];
  const actors = ids.map(id => {
    const view = viewFor(id, round.metric);
    const metres = bodyMetres(id, round.metric);
    const d = dims(item(id).art, view, metres);
    const spec = metricOf(id, round.metric);
    const measure = round.type === 'stack'
      ? (id === round.subject ? truth.subject : truth.unit)
      : (truth.values ? truth.values[id] : truth.value);
    return {id, name: item(id).name, ...d, art: item(id).art, view, measure, unit: spec.unit, published: spec.published, source: spec.source, alt: spec.alt || null};
  });
  actors.sort((a, b) => a.h - b.h || a.w - b.w);
  const person = {...dims('human', 'stand', HUMAN_M), art: 'human', name: 'Person', id: 'human'};
  const maxH = Math.max(person.h, ...actors.map(a => a.h));
  const gap = Math.max(0.45, maxH * 0.055);
  let x = 0;
  person.x = 0;
  x = person.w + gap;
  for (const a of actors) { a.x = x; x += a.w + gap; }
  const ghosts = [];
  if (round.type === 'stack') {
    const unit = actors.find(a => a.id === round.unit);
    const n = truth.value;
    for (let i = 0; i < Math.min(12, Math.ceil(n)); i++) {
      ghosts.push({...unit, x, y: i * unit.h, frac: Math.min(1, n - i)});
    }
    x += unit.w + gap;
  }
  return {
    actors, person, ghosts, width: x, height: maxH, gap,
    sized: round.type === 'stack' || SIZE.has(round.metric),
    metric: round.metric, truth
  };
}

const svgEl = (name, attrs = {}) => {
  const el = document.createElementNS('http://www.w3.org/2000/svg', name);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
};

export function createStage(svg, hooks) {
  let frame = 0;
  let alive = false;
  function clear() {
    alive = false;
    cancelAnimationFrame(frame);
    svg.replaceChildren();
  }
  function paintShape(parent, a) {
    const wrap = svgEl('g', {transform: `scale(${a.k} ${-a.k})`});
    for (const d of a.g.paths) if (d) wrap.append(svgEl('path', {d, class: 'sil'}));
    parent.append(wrap);
  }
  function play(round, reduced) {
    clear();
    const plan = planReveal(round);
    const padX = plan.width * 0.05;
    const padTop = plan.height * 0.1;
    const below = Math.max(plan.height * 0.22, 1.6);
    const ground = plan.height + padTop;
    const worldW = plan.width + padX * 2;
    const worldH = ground + below;
    svg.setAttribute('viewBox', `${-padX} 0 ${worldW} ${worldH}`);
    const scene = svgEl('g');
    svg.append(scene);
    if (plan.person.h < plan.height * 0.12) {
      const loupe = svgEl('g', {class: 'loupe'});
      const r = worldH * 0.07;
      const cx = worldW - r - padX * 0.4;
      const cy = r + worldH * 0.015;
      loupe.append(svgEl('circle', {cx, cy, r, class: 'loupe-ring'}));
      const pg = svgEl('g', {transform: `translate(${cx - plan.person.w * (r * 1.3 / plan.person.h) / 2} ${cy + r * 0.55}) scale(${r * 1.3 / plan.person.h})`});
      const wrap = svgEl('g', {transform: `scale(${plan.person.k} ${-plan.person.k})`});
      for (const d of plan.person.g.paths) if (d) wrap.append(svgEl('path', {d, class: 'sil loupe-person'}));
      pg.append(wrap);
      loupe.append(pg);
      const cap = svgEl('text', {class: 'human-label', x: cx - r - worldW * 0.012, y: cy, 'text-anchor': 'end', 'font-size': worldH * 0.032});
      cap.textContent = 'Person, 1.75 m';
      loupe.append(cap);
      svg.append(loupe);
    }
    scene.append(svgEl('rect', {class: 'sky', x: -worldW, y: -worldH, width: worldW * 3, height: worldH * 4}));
    scene.append(svgEl('line', {class: 'ground', x1: -padX, y1: ground, x2: plan.width, y2: ground}));
    const movers = [];
    const add = (a, ghost) => {
      const g = svgEl('g', {class: ghost ? 'ghost' : 'actor'});
      const body = svgEl('g');
      if (ghost) body.setAttribute('transform', `translate(0 ${-a.y})`);
      paintShape(body, a);
      if (ghost && a.frac < 0.999) {
        const id = 'g' + movers.length;
        const clip = svgEl('clipPath', {id});
        clip.append(svgEl('rect', {x: -2, y: -(a.y + a.h * a.frac), width: a.w + 4, height: a.h * a.frac + 0.5}));
        svg.append(clip);
        body.setAttribute('clip-path', `url(#${id})`);
      }
      g.append(body);
      scene.append(g);
      movers.push({g, a, ghost});
    };
    add(plan.person, false);
    plan.actors.forEach(a => add(a, false));
    plan.ghosts.forEach(a => add(a, true));
    const labels = [];
    for (const a of [plan.person, ...plan.actors]) {
      const text = svgEl('text', {class: a.art === 'human' ? 'human-label' : 'fig', 'text-anchor': 'middle'});
      text.textContent = a.art === 'human' ? '1.75 m' : '0';
      scene.append(text);
      labels.push({text, a});
    }
    const dims = svgEl('g', {class: 'dims'});
    scene.append(dims);
    const dimLines = [];
    for (const a of plan.actors) {
      if (plan.sized && a.view === 'stand') {
        const x = a.x + a.w + Math.max(0.15, plan.height * 0.012);
        const line = svgEl('line', {class: 'dim', x1: x, y1: ground, x2: x, y2: ground - a.h});
        dims.append(line);
        dimLines.push(line);
      } else if (plan.sized) {
        const y = ground + below * 0.42;
        const line = svgEl('line', {class: 'dim', x1: a.x, y1: y, x2: a.x + a.w, y2: y});
        dims.append(line);
        dimLines.push(line);
      } else {
        const maxM = Math.max(...plan.actors.map(x => x.measure));
        const bw = (a.measure / maxM) * Math.max(...plan.actors.map(x => x.w));
        const y = ground + below * 0.45;
        const line = svgEl('line', {class: 'bar', x1: a.x, y1: y, x2: a.x + bw, y2: y});
        dims.append(line);
        dimLines.push(line);
      }
    }
    const font = Math.max(worldH * 0.038, worldW * 0.018);
    const render = (t, final) => {
      const zoom = final ? 1 : 1.16 - 0.16 * easeOut(Math.min(1, t / 0.85));
      const cx = plan.width / 2;
      const cy = ground - plan.height * 0.35;
      scene.setAttribute('transform', `translate(${cx} ${cy}) scale(${zoom}) translate(${-cx} ${-cy})`);
      movers.forEach((node, i) => {
        const delay = (node.ghost ? 0.28 : 0.04) + i * 0.07;
        const u = final ? 1 : easeBack(Math.max(0, Math.min(1, (t - delay) / 0.62)));
        const drift = (1 - u) * (i % 2 ? 1 : -1) * plan.width * 0.28;
        const lift = (1 - u) * plan.height * 0.12;
        node.g.setAttribute('transform', `translate(${node.a.x + drift} ${ground - lift})`);
        node.g.style.opacity = String(node.ghost ? 0.33 * u : Math.max(0, u));
      });
      const shown = final ? 1 : easeOut(Math.max(0, Math.min(1, (t - 0.42) / 0.7)));
      labels.forEach(l => {
        const ax = l.a.x + l.a.w / 2;
        const top = l.a.art === 'human' ? ground - l.a.h - font * 0.8 : (plan.sized && l.a.view !== 'stand' ? ground + below * 0.72 : ground - l.a.h - font * 1.1);
        l.text.setAttribute('x', ax);
        l.text.setAttribute('y', top);
        l.text.setAttribute('font-size', font);
        if (l.a.art === 'human') l.text.textContent = '1.75 m';
        else {
          const v = l.a.measure * shown;
          const unit = l.a.unit === 'km/h' ? 'km/h' : l.a.unit;
          l.text.textContent = formatMeasure(final ? l.a.measure : v, unit) + ' ' + unit;
        }
      });
      dimLines.forEach(line => line.style.opacity = String(shown));
    };
    if (reduced) { render(1, true); hooks.done && hooks.done(); return plan; }
    hooks.whoosh && hooks.whoosh();
    const t0 = performance.now();
    let last = 0;
    alive = true;
    const step = now => {
      if (!alive) return;
      const t = Math.min(1, (now - t0) / 2200);
      render(t, false);
      if (t > 0.42 && now - last > 80) { last = now; hooks.tick && hooks.tick(t); }
      if (t < 1) frame = requestAnimationFrame(step);
      else { render(1, true); hooks.resolve && hooks.resolve(round); hooks.done && hooks.done(); }
    };
    frame = requestAnimationFrame(step);
    return plan;
  }
  return {play, clear, planReveal};
}
