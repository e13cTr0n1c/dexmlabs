import {
  DISTRICT_LABEL,
  DISTRICTS,
  LIMITS,
  WATCH_LABEL,
  WATCHES,
  decodeSave,
  download,
  encodeSave,
  freshGame,
  loadGame,
  playGrid,
  preview,
  restart,
  segmentCap,
  setGridMuted,
  step,
  unlockGridAudio,
  writeGame,
} from "./engine.mjs";

const W = 1200;
const H = 760;
const SVG = "http://www.w3.org/2000/svg";

const LINES = [
  { id: "gale", color: "var(--g-gale)", points: [[170, 56], [170, 210], [560, 210], [560, 400]] },
  { id: "glass", color: "var(--g-glass)", points: [[980, 56], [980, 210], [560, 210]] },
  { id: "nucleus", color: "var(--g-nucleus)", points: [[90, 580], [380, 580], [560, 400]] },
  { id: "cinder", color: "var(--g-cinder)", points: [[1080, 580], [740, 580], [560, 400]] },
];

const SEGMENTS = [
  { id: "galeDrop", d: "M 170 56 L 170 210" },
  { id: "galeRun", d: "M 170 210 L 560 210" },
  { id: "galeGate", d: "M 560 210 L 560 400" },
  { id: "glassDrop", d: "M 980 56 L 980 210" },
  { id: "glassRun", d: "M 980 210 L 560 210" },
  { id: "roseRun", d: "M 90 580 L 380 580" },
  { id: "roseGate", d: "M 380 580 L 560 400" },
  { id: "cinderRun", d: "M 1080 580 L 740 580" },
  { id: "cinderGate", d: "M 740 580 L 560 400" },
];

const STATIONS = [
  { id: "gale", x: 170, y: 56, label: "Gale", panel: "gale", kind: "plant", color: "var(--g-gale)", anchor: "middle", lx: 170, ly: 28 },
  { id: "glass", x: 980, y: 56, label: "Glass", panel: "glass", kind: "plant", color: "var(--g-glass)", anchor: "middle", lx: 980, ly: 28 },
  { id: "quay", x: 330, y: 210, label: "Quay", panel: "streets", kind: "street", color: "var(--g-gale)", anchor: "middle", lx: 330, ly: 158 },
  { id: "harbour", x: 560, y: 210, label: "Harbour", panel: "streets", kind: "hub", color: "var(--g-casing)", anchor: "middle", lx: 560, ly: 158 },
  { id: "gardens", x: 820, y: 210, label: "Gardens", panel: "streets", kind: "street", color: "var(--g-glass)", anchor: "middle", lx: 820, ly: 158 },
  { id: "exchange", x: 560, y: 400, label: "Exchange", panel: "store", kind: "hub", color: "var(--g-casing)", anchor: "start", lx: 600, ly: 372 },
  { id: "nucleus", x: 90, y: 580, label: "Nucleus", panel: "nucleus", kind: "plant", color: "var(--g-nucleus)", anchor: "middle", lx: 90, ly: 614 },
  { id: "mill", x: 380, y: 580, label: "Mill", panel: "streets", kind: "street", color: "var(--g-nucleus)", anchor: "middle", lx: 300, ly: 614 },
  { id: "docks", x: 740, y: 580, label: "Docks", panel: "streets", kind: "street", color: "var(--g-cinder)", anchor: "middle", lx: 820, ly: 614 },
  { id: "cinder", x: 1080, y: 580, label: "Cinder", panel: "cinder", kind: "plant", color: "var(--g-cinder)", anchor: "middle", lx: 1080, ly: 614 },
];

const ICONS = {
  nucleus: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="12" r="3" fill="currentColor"/><ellipse cx="12" cy="12" rx="9" ry="4" fill="none" stroke="currentColor" stroke-width="1.6"/><ellipse cx="12" cy="12" rx="9" ry="4" fill="none" stroke="currentColor" stroke-width="1.6" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9" ry="4" fill="none" stroke="currentColor" stroke-width="1.6" transform="rotate(120 12 12)"/></svg>',
  cinder: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 3c2 4 6 5 6 10a6 6 0 0 1-12 0c0-3 2-4 3-7 1 2 2 2 3-3z" fill="currentColor"/></svg>',
  gale: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M3 8h11a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  glass: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="12" r="4" fill="currentColor"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  store: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="3" y="7" width="16" height="10" rx="1" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="19" y="10" width="2" height="4" fill="currentColor"/><rect x="5" y="9" width="8" height="6" fill="currentColor"/></svg>',
  streets: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 20V10l8-6 8 6v10H4z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M10 20v-6h4v6" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
  desk: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 7h10l2 2h4v10H4V7z" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
  on: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 10v4h4l5 4V6L8 10H4z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M16 9a4 4 0 0 1 0 6" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
  off: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 10v4h4l5 4V6L8 10H4z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M16 10l4 4M20 10l-4 4" stroke="currentColor" stroke-width="1.8"/></svg>',
};

const TOOLS = [
  ["nucleus", "Nucleus", "is-nucleus"],
  ["cinder", "Cinder", "is-cinder"],
  ["gale", "Gale", "is-gale"],
  ["glass", "Glass", "is-glass"],
  ["store", "Store", ""],
  ["streets", "Streets", ""],
  ["desk", "Desk", ""],
];

const COAL = [
  ["off", "Off", "No burn."],
  ["peak", "Peak", `${LIMITS.coalPeak} MW on the day and evening. Burns 1 bunker.`],
  ["hold", "Hold", `${LIMITS.coalHold} MW all four watches. Burns 2 bunkers.`],
];
const STORE = [
  ["save", "Save", "Fill it when there is spare. Spend it on the evening peak."],
  ["hold", "Hold", "Leave the store alone."],
  ["spend", "Spend", "Empty it into any watch that is short. It will not refill."],
];

const state = {
  game: null,
  seed: "low-holm",
  panel: null,
  watch: null,
  frame: 0,
  playing: false,
  reel: null,
  banner: "",
  sound: true,
  reduce: false,
  pass: "",
  importPass: "",
};
let timer = 0;

function el(name, attrs = {}, kids = []) {
  const node = document.createElementNS(SVG, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  for (const kid of kids) node.append(kid);
  return node;
}

function tube(points, radius = 26) {
  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const cur = points[i];
    const next = points[i + 1];
    const len1 = Math.hypot(cur[0] - prev[0], cur[1] - prev[1]) || 1;
    const len2 = Math.hypot(next[0] - cur[0], next[1] - cur[1]) || 1;
    const r = Math.min(radius, len1 / 2.2, len2 / 2.2);
    const inX = cur[0] - ((cur[0] - prev[0]) / len1) * r;
    const inY = cur[1] - ((cur[1] - prev[1]) / len1) * r;
    const outX = cur[0] + ((next[0] - cur[0]) / len2) * r;
    const outY = cur[1] + ((next[1] - cur[1]) / len2) * r;
    d += ` L ${inX} ${inY} Q ${cur[0]} ${cur[1]} ${outX} ${outY}`;
  }
  const last = points[points.length - 1];
  return `${d} L ${last[0]} ${last[1]}`;
}

function houses(x, y, lit, roof, industrial) {
  const specs = industrial
    ? [{ w: 58, h: 34 }, { w: 50, h: 40 }, { w: 64, h: 30 }, { w: 46, h: 36 }]
    : [{ w: 34, h: 52 }, { w: 28, h: 44 }, { w: 36, h: 58 }, { w: 30, h: 48 }, { w: 32, h: 40 }, { w: 26, h: 50 }];
  const cols = industrial ? 2 : 3;
  const pitch = industrial ? 72 : 44;
  const rowH = industrial ? 52 : 68;
  const tall = industrial ? 40 : 58;
  const group = el("g");
  const windows = [];
  specs.forEach((spec, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const bx = x + col * pitch;
    const by = y + row * rowH + (tall - spec.h);
    if (industrial) {
      group.append(el("polygon", { points: `${bx},${by + 10} ${bx + spec.w * 0.25},${by} ${bx + spec.w * 0.5},${by + 10} ${bx + spec.w * 0.75},${by} ${bx + spec.w},${by + 10}`, fill: roof }));
    } else {
      group.append(el("polygon", { points: `${bx},${by + 14} ${bx + spec.w / 2},${by} ${bx + spec.w},${by + 14}`, fill: roof }));
    }
    group.append(el("rect", { x: bx, y: by + (industrial ? 10 : 14), width: spec.w, height: spec.h - (industrial ? 10 : 14), fill: "var(--g-wall)" }));
    const top = by + (industrial ? 14 : 18);
    const colsW = spec.w > 40 ? 3 : 2;
    const rows = industrial ? 1 : 2;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < colsW; c++) windows.push({ x: bx + 6 + c * ((spec.w - 10) / colsW), y: top + r * 14 });
    }
  });
  const litCount = Math.round(lit * windows.length);
  windows.forEach((win, index) => {
    group.append(el("rect", { x: win.x, y: win.y, width: 6, height: 7, fill: index < litCount ? "var(--g-window)" : "var(--g-window-off)" }));
  });
  return group;
}

function glyph(id, x, y) {
  if (id === "gale") {
    return el("g", { stroke: "var(--g-gale)", fill: "none", "stroke-width": 3, "stroke-linecap": "round" }, [
      el("line", { x1: x - 36, y1: y + 8, x2: x - 36, y2: y - 22 }),
      el("line", { x1: x - 36, y1: y - 10, x2: x - 36, y2: y - 28 }),
      el("line", { x1: x - 36, y1: y - 10, x2: x - 52, y2: y }),
      el("line", { x1: x - 36, y1: y - 10, x2: x - 20, y2: y }),
    ]);
  }
  if (id === "glass") {
    const g = el("g", { fill: "var(--g-glass)" });
    for (let col = 0; col < 2; col++) for (let row = 0; row < 2; row++) g.append(el("rect", { x: x + 18 + col * 12, y: y - 24 + row * 12, width: 10, height: 10, transform: `rotate(-16 ${x + 32} ${y - 8})` }));
    return g;
  }
  if (id === "nucleus") {
    return el("g", { stroke: "var(--g-nucleus)", fill: "none", "stroke-width": 3 }, [
      el("circle", { cx: x, cy: y - 40, r: 12 }),
      el("circle", { cx: x, cy: y - 40, r: 3, fill: "var(--g-nucleus)", stroke: "none" }),
      el("line", { x1: x - 6, y1: y - 58, x2: x - 6, y2: y - 50 }),
      el("line", { x1: x, y1: y - 62, x2: x, y2: y - 52 }),
      el("line", { x1: x + 6, y1: y - 58, x2: x + 6, y2: y - 50 }),
    ]);
  }
  return el("g", { fill: "var(--g-cinder)" }, [
    el("rect", { x: x - 18, y: y - 52, width: 30, height: 16 }),
    el("rect", { x: x + 4, y: y - 68, width: 8, height: 18 }),
  ]);
}

function fraction(watch, id) {
  const row = watch.districts[id];
  return row.need ? Math.max(0, Math.min(1, row.got / row.need)) : 1;
}

function worstWatch(report) {
  let index = 0;
  report.watches.forEach((watch, i) => {
    const worst = report.watches[index];
    if (watch.served / Math.max(1, watch.demand) < worst.served / Math.max(1, worst.demand)) index = i;
  });
  return index;
}

function currentLook() {
  return state.reel || preview(state.game);
}

function shownWatch() {
  const look = currentLook();
  if (state.playing) return state.frame;
  if (state.watch === null) return worstWatch(look);
  return state.watch;
}

function persist(next) {
  state.game = next;
  writeGame(next);
  paint();
}

function setPanel(id) {
  state.panel = state.panel === id ? null : id;
  paint();
}

function onPolicy(patch) {
  if (!state.game || state.playing || state.game.over) return;
  state.banner = "";
  persist({ ...state.game, policy: { ...state.game.policy, ...patch } });
}

function award(report, next) {
  const points = window.DexmPoints;
  if (!points || report.lit < 0.97 || next.over) return;
  points.earnPractice("grid", new Date().toISOString().slice(0, 10));
}

function runDay() {
  const live = state.game;
  if (!live || state.playing) return;
  unlockGridAudio();
  if (live.over) {
    persist(restart(live));
    state.banner = "";
    state.watch = null;
    playGrid("click");
    return;
  }
  const report = preview(live);
  const next = step(live);
  award(report, next);
  playGrid("day");
  if (state.reduce) {
    state.watch = null;
    persist(next);
    playGrid(next.over ? "bad" : "ok");
    return;
  }
  state.playing = true;
  state.reel = report;
  state.frame = 0;
  paint();
  let i = 0;
  timer = window.setInterval(() => {
    i += 1;
    if (i > 3) {
      window.clearInterval(timer);
      state.playing = false;
      state.reel = null;
      state.watch = null;
      persist(next);
      playGrid(next.over ? "bad" : "ok");
    } else {
      state.frame = i;
      paint();
    }
  }, 480);
}

function openSeed() {
  const clean = state.seed.trim().slice(0, 40);
  if (!clean) {
    state.banner = "The map needs a seed.";
    paint();
    return;
  }
  const next = freshGame(clean);
  if (state.game) next.best = Math.max(state.game.best, state.game.streak);
  state.watch = null;
  state.banner = "";
  state.panel = null;
  persist(next);
  unlockGridAudio();
  playGrid("click");
}

function paintStatus() {
  const game = state.game;
  const look = currentLook();
  document.querySelector("#g-name").textContent = game.name;
  const streak = game.streak ? ` · streak ${game.streak}` : game.best ? ` · best ${game.best}` : "";
  document.querySelector("#g-sub").textContent = `Day ${game.day} · ${look.sky}${streak}`;
  const mute = document.querySelector("#g-mute");
  mute.innerHTML = state.sound ? ICONS.on : ICONS.off;
  mute.setAttribute("aria-label", state.sound ? "Mute" : "Sound on");
}

function paintTools() {
  document.querySelectorAll("[data-tool]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.tool === state.panel));
  });
}

function paintMap() {
  const look = currentLook();
  const frame = look.watches[shownWatch()] || look.watches[0];
  const host = document.querySelector("#g-map");
  host.replaceChildren();
  const plate = document.createElement("div");
  plate.className = "g-plate";
  const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "City feeders drawn as a tube map" });
  svg.append(houses(186, 250, fraction(frame, "quay"), "var(--g-gale)"));
  svg.append(houses(360, 250, fraction(frame, "harbour"), "var(--g-casing)"));
  svg.append(houses(640, 250, fraction(frame, "gardens"), "var(--g-glass)"));
  svg.append(houses(110, 640, fraction(frame, "mill"), "var(--g-nucleus)", true));
  svg.append(houses(630, 640, fraction(frame, "docks"), "var(--g-cinder)", true));
  const paths = LINES.map((line) => ({ ...line, d: tube(line.points) }));
  for (const line of paths) svg.append(el("path", { d: line.d, fill: "none", stroke: "var(--g-casing)", "stroke-width": 22, "stroke-linecap": "round", "stroke-linejoin": "round" }));
  for (const line of paths) svg.append(el("path", { d: line.d, fill: "none", stroke: line.color, "stroke-width": 13, "stroke-linecap": "round", "stroke-linejoin": "round" }));
  for (const segment of SEGMENTS) {
    const util = Math.max(0, Math.min(1, frame.flow[segment.id] / segmentCap(segment.id)));
    if (util < 0.08) continue;
    svg.append(el("path", {
      d: segment.d, fill: "none", stroke: "var(--g-casing)", "stroke-width": 3 + util * 4, "stroke-linecap": "round",
      pathLength: 100, "stroke-dasharray": "14 18", class: "cable-flow", style: `animation-duration:${util > 0.72 ? "0.7s" : "1.35s"}`,
    }));
  }
  for (const station of STATIONS) if (station.kind === "plant") svg.append(glyph(station.id, station.x, station.y));
  for (const station of STATIONS) {
    if (station.kind === "hub") {
      svg.append(el("g", {}, [
        el("circle", { cx: station.x, cy: station.y, r: 15, fill: "var(--g-board)", stroke: "var(--g-casing)", "stroke-width": 5 }),
        el("circle", { cx: station.x, cy: station.y, r: 5, fill: "var(--g-casing)" }),
      ]));
    } else if (station.kind === "plant") {
      svg.append(el("circle", { cx: station.x, cy: station.y, r: 11, fill: station.color, stroke: "var(--g-casing)", "stroke-width": 4 }));
    } else {
      svg.append(el("circle", { cx: station.x, cy: station.y, r: 8, fill: "var(--g-casing)" }));
    }
  }
  for (const station of STATIONS) {
    if (station.panel !== state.panel) continue;
    svg.append(el("circle", { cx: station.x, cy: station.y, r: 22, fill: "none", stroke: "var(--ink)", "stroke-width": 2 }));
  }
  plate.append(svg);
  for (const station of STATIONS) {
    const tag = document.createElement("span");
    tag.className = "g-tag";
    tag.textContent = station.label;
    tag.style.left = `${(station.lx / W) * 100}%`;
    tag.style.top = `${(station.ly / H) * 100}%`;
    tag.style.color = station.kind === "plant" ? station.color : "var(--ink)";
    tag.style.transform = station.anchor === "end" ? "translate(-100%, -110%)" : station.anchor === "start" ? "translate(0, -110%)" : "translate(-50%, -110%)";
    plate.append(tag);
  }
  for (const station of STATIONS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "g-hit";
    button.setAttribute("aria-label", station.label);
    button.style.left = `${(station.x / W) * 100}%`;
    button.style.top = `${(station.y / H) * 100}%`;
    button.addEventListener("click", () => setPanel(station.panel));
    plate.append(button);
  }
  host.append(plate);
}

function choice(name, value, options, pick) {
  const locked = state.playing || state.game.over;
  const current = options.find((option) => option[0] === value) || options[0];
  return `<div class="g-choices">${options.map(([id, label]) => `<button type="button" data-pick="${name}:${id}" aria-pressed="${id === value}" ${locked ? "disabled" : ""}>${label}</button>`).join("")}</div><p class="g-muted">${current[2]}</p>`;
}

function bars(rows, tone) {
  return `<div class="g-rows">${rows.map((row) => `<div><span>${row.label}</span><span>${row.note}</span></div><div class="g-bar"><span class="${tone}" style="width:${Math.max(0, Math.min(100, Math.round(row.value * 100)))}%"></span></div>`).join("")}</div>`;
}

function paintPanel() {
  const aside = document.querySelector("#g-panel");
  const typing = aside.contains(document.activeElement) && aside.dataset.id === (state.panel || "");
  if (!state.panel) {
    aside.hidden = true;
    aside.dataset.id = "";
    aside.replaceChildren();
    return;
  }
  if (typing && (document.activeElement.id === "seed" || document.activeElement.id === "pass" || document.activeElement.id === "import-pass" || document.activeElement.id === "core")) {
    if (document.activeElement.id === "core") {
      const label = document.querySelector("#core-label");
      if (label) label.textContent = `Target ${state.game.policy.nuclearTarget} MW`;
      const big = aside.querySelector(".g-big");
      if (big) big.textContent = `${currentLook().nuclear} MW`;
    }
    return;
  }
  const game = state.game;
  const look = currentLook();
  const frame = look.watches[shownWatch()] || look.watches[0];
  const locked = state.playing || game.over;
  let body = "";
  if (state.panel === "nucleus") {
    body = `<h2 class="h-nucleus">Nucleus</h2><p class="g-muted">Rose line. Baseload. It does not swing with the weather.</p><p class="g-big">${look.nuclear} MW</p><label class="g-field" id="core-label" for="core">Target ${game.policy.nuclearTarget} MW</label><input id="core" type="range" min="0" max="${LIMITS.nukeMax}" step="2" ${locked ? "disabled" : ""} value="${game.policy.nuclearTarget}"><p class="g-muted">The core moves at most ${LIMITS.ramp} MW when the day turns. Spare that Mill End and the Exchange cannot take is spilled.</p>`;
  } else if (state.panel === "cinder") {
    const tide = look.collierDue ? (look.collier ? " · a collier ties up today" : " · the collier misses today") : " · next collier in a day or two";
    body = `<h2 class="h-cinder">Cinder</h2><p class="g-muted">Copper line. You choose the burn. The boilers use a bunker whether the south needs it or not.</p><p class="g-muted">Bunkers <b>${game.bunkers}</b> / ${LIMITS.bunkerCap}${tide}</p><div class="g-bunkers">${Array.from({ length: LIMITS.bunkerCap }, (_, i) => `<i class="${i < game.bunkers ? "on" : ""}"></i>`).join("")}</div>${choice("coal", game.policy.coal, COAL)}`;
  } else if (state.panel === "gale") {
    body = `<h2 class="h-gale">Gale</h2><p class="g-muted">Cyan line. Wind, up to ${LIMITS.windPlate} MW. ${LIMITS.quayHarbour} MW can pass North Quay. ${LIMITS.northGate} MW can drop from Harbour to the Exchange.</p>${bars(look.watches.map((item) => ({ label: WATCH_LABEL[item.id], value: item.wind, note: `${item.made.wind} MW` })), "tone-gale")}`;
  } else if (state.panel === "glass") {
    body = `<h2 class="h-glass">Glass</h2><p class="g-muted">Gold line. Sun, up to ${LIMITS.sunPlate} MW, and nothing at night. East Gardens only reaches the Exchange through Harbour.</p>${bars(look.watches.map((item) => ({ label: WATCH_LABEL[item.id], value: item.sun, note: `${item.made.sun} MW` })), "tone-glass")}`;
  } else if (state.panel === "store") {
    body = `<h2>Store</h2><p class="g-muted">Sits on the Exchange. ${LIMITS.storeRate} MW a watch, ${LIMITS.storeMax} MW in the tank.</p><p class="g-big">${game.store}<span class="g-muted"> / ${LIMITS.storeMax}</span></p><div class="g-bar"><span class="tone-ink" style="width:${Math.round((game.store / LIMITS.storeMax) * 100)}%"></span></div>${choice("store", game.policy.store, STORE)}`;
  } else if (state.panel === "streets") {
    body = `<h2>Streets</h2><p class="g-muted">When a tube is full, a protected street is fed first. Otherwise the spare is shared.</p><button type="button" class="g-block" data-pick="protect:even" aria-pressed="${game.policy.protect === "even"}" ${locked ? "disabled" : ""}>Share what's left</button><ul>${DISTRICTS.map((id) => {
      const row = frame.districts[id];
      const on = game.policy.protect === id;
      return `<li class="g-street-row"><button type="button" class="g-street" data-pick="protect:${id}" aria-pressed="${on}" ${locked ? "disabled" : ""}>${on ? "Protected · " : "Protect "}${DISTRICT_LABEL[id]}</button><span class="g-num">${Math.round(row.got)}/${row.need}</span></li>`;
    }).join("")}</ul>`;
  } else {
    body = `<h2>Desk</h2><p class="g-muted">A new seed is a new city. This one stays in the browser.</p><label class="g-field" for="seed">Seed<input id="seed" type="text" maxlength="40" value="${escapeAttr(state.seed)}"></label><button type="button" class="g-block" id="open-map">Open map</button><label class="g-field" for="pass">Passphrase, optional<input id="pass" type="password" value="${escapeAttr(state.pass)}"></label><button type="button" class="g-block" id="save-file">Download save</button><label class="g-field" for="file">Load a save<input id="file" class="g-file" type="file" accept="application/json,.json"></label><label class="g-field" for="import-pass">Passphrase for a locked file<input id="import-pass" type="password" value="${escapeAttr(state.importPass)}" placeholder="Passphrase for a locked file"></label>`;
  }
  aside.hidden = false;
  aside.dataset.id = state.panel;
  aside.innerHTML = `${body}<button type="button" class="g-close" id="close-panel">Close</button>`;
  aside.querySelector("#core")?.addEventListener("input", (event) => onPolicy({ nuclearTarget: Number(event.target.value) }));
  aside.querySelectorAll("[data-pick]").forEach((button) => {
    button.addEventListener("click", () => {
      const [name, id] = button.dataset.pick.split(":");
      onPolicy({ [name]: id });
    });
  });
  aside.querySelector("#seed")?.addEventListener("input", (event) => { state.seed = event.target.value; });
  aside.querySelector("#pass")?.addEventListener("input", (event) => { state.pass = event.target.value; });
  aside.querySelector("#import-pass")?.addEventListener("input", (event) => { state.importPass = event.target.value; });
  aside.querySelector("#open-map")?.addEventListener("click", openSeed);
  aside.querySelector("#save-file")?.addEventListener("click", () => {
    void encodeSave(state.game, state.pass.trim()).then((text) => download(`grid-${state.game.seed}.json`, text));
  });
  aside.querySelector("#file")?.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    void file.text().then(async (text) => {
      try {
        const loaded = await decodeSave(text, state.importPass);
        state.seed = loaded.seed;
        state.watch = null;
        state.panel = null;
        state.banner = "";
        persist(loaded);
      } catch (error) {
        state.banner = error instanceof Error ? error.message : "Could not read that file.";
        paint();
      }
    });
  });
  aside.querySelector("#close-panel")?.addEventListener("click", () => setPanel(state.panel));
}

function paintFoot() {
  const game = state.game;
  const look = currentLook();
  const watch = shownWatch();
  const lit = Math.round(look.lit * 100);
  document.querySelector("#g-note").textContent = state.banner || look.note;
  document.querySelector("#g-metrics").innerHTML = `Lit <b>${lit}%</b> · Trust <b>${game.trust}</b> · Bunkers <b>${game.bunkers}</b> · Store <b>${game.store}</b>`;
  const run = document.querySelector("#g-run");
  run.disabled = state.playing;
  run.textContent = game.over ? "Open again" : state.playing ? "Running" : "Run day";
  document.querySelectorAll("[data-watch]").forEach((button, index) => {
    const item = look.watches[index];
    const ratio = item.demand ? item.served / item.demand : 1;
    button.setAttribute("aria-pressed", String(index === watch));
    button.innerHTML = `<small>${WATCH_LABEL[item.id]}</small><strong>${Math.round(item.served)}/${item.demand}</strong><span class="g-bar"><span class="${ratio > 0.97 ? "tone-ink" : "tone-hazard"}" style="width:${Math.round(ratio * 100)}%"></span></span>`;
  });
}

function paint() {
  paintStatus();
  paintTools();
  paintMap();
  paintPanel();
  paintFoot();
}

function escapeAttr(value) {
  const amp = String.fromCharCode(38);
  return String(value).split(amp).join(`${amp}amp;`).split('"').join(`${amp}quot;`).split("<").join(`${amp}lt;`);
}

function boot() {
  const saved = loadGame();
  state.game = saved || freshGame("low-holm");
  state.seed = state.game.seed;
  state.sound = localStorage.getItem("grid:sound") !== "0";
  setGridMuted(!state.sound);
  state.reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const tools = document.querySelector("#g-tools");
  tools.innerHTML = TOOLS.map(([id, label, tone]) => `<button type="button" class="g-icon ${tone}" data-tool="${id}" aria-label="${label}" title="${label}">${ICONS[id]}</button>`).join("");
  tools.addEventListener("click", (event) => {
    const button = event.target.closest("[data-tool]");
    if (button) setPanel(button.dataset.tool);
  });
  document.querySelector("#g-mute").addEventListener("click", () => {
    state.sound = !state.sound;
    localStorage.setItem("grid:sound", state.sound ? "1" : "0");
    setGridMuted(!state.sound);
    paintStatus();
  });
  document.querySelector("#g-run").addEventListener("click", runDay);
  document.querySelector("#g-watches").addEventListener("click", (event) => {
    const button = event.target.closest("[data-watch]");
    if (button) {
      state.watch = Number(button.dataset.watch);
      paint();
    }
  });
  window.addEventListener("keydown", (event) => {
    const tag = event.target?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    if (event.key === "Escape") {
      state.panel = null;
      paint();
    }
    if (event.code === "Space") {
      event.preventDefault();
      runDay();
    }
    if (event.key >= "1" && event.key <= "4") {
      state.watch = Number(event.key) - 1;
      paint();
    }
  });
  paint();
}

boot();
