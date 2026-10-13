import { drawFrame } from "./draw.mjs";
import { pointInCircle, pointInObb } from "./geom.mjs";
import { LEVELS, SOLUTIONS, dailySpec, defaultTunes, freshPlacements, grade } from "./levels.mjs";
import { emptySave, loadSave, writeSave } from "./save.mjs";
import { issue, previewLevel, startLevel, stepLevel } from "./sim.mjs";
import { sfx, setMuted, unlockAudio } from "./audio.mjs";
import { EMPTY_READOUT, STEP_S, WORLD_H, WORLD_W } from "./types.mjs";

const BENCH_KIT = [
  { kind: "beam", label: "Ramp", count: 2, w: 3.4, h: 0.22, r: 0, rotatable: true, lockY: null },
  { kind: "bumper", label: "Bumper", count: 1, w: 1, h: 1, r: 0.5, rotatable: false, lockY: null },
  { kind: "block", label: "Block", count: 4, w: 0.76, h: 0.76, r: 0, rotatable: false, lockY: null },
];

const daily = dailySpec();
const root = document.querySelector("#shift");
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

const ui = {
  save: emptySave(),
  mode: null,
  phase: "build",
  placements: [],
  tunes: {},
  selected: null,
  armed: null,
  sketch: false,
  banner: "",
  note: "",
  hud: { ...EMPTY_READOUT },
  ghostTrail: [],
  session: null,
  sparks: [],
  trauma: 0,
  drag: null,
  settled: false,
  raf: 0,
};

function kitOf(id) {
  if (id === "bench") return BENCH_KIT;
  if (id === "daily") return [];
  return LEVELS.find((level) => level.id === id)?.kit ?? [];
}

function copyOf(id) {
  if (id === "daily") {
    return {
      index: "D",
      title: "Today's shot",
      idea: "Same spring, new cup",
      formula: "½ k x² = ½ m v²",
      brief: `The cup moved overnight (${daily.day}). The arc is the promise. Match it.`,
      lesson: "Pull is energy. Angle splits it. The cup does not care how confident you were.",
      par: "Pot it. A modest pull is the elegant one.",
      controls: LEVELS.find((level) => level.id === "spring")?.controls ?? [],
    };
  }
  if (id === "bench") {
    return {
      index: "B",
      title: "Proving ground",
      idea: "No contract. Just the instruments.",
      formula: "apex · trap · fan",
      brief: "The ball leaves the ledge. The fan pushes anything that drifts through it. Ten seconds, then the run is filed.",
      lesson: "This is the bench the contracts were cut from. Nothing here is marked pass or fail.",
      par: "Beat your own apex, trap speed, or time in the fan.",
      controls: [],
    };
  }
  const level = LEVELS.find((entry) => entry.id === id);
  return {
    index: String(level?.index ?? 0).padStart(2, "0"),
    title: level?.title ?? "",
    idea: level?.idea ?? "",
    formula: level?.formula ?? "",
    brief: level?.brief ?? "",
    lesson: level?.lesson ?? "",
    par: level?.par ?? "",
    controls: level?.controls ?? [],
  };
}

function starsOf(id) {
  if (id === "bench") return 0;
  if (id === "daily") return ui.save.dailyDay === daily.day ? ui.save.dailyStars : 0;
  return ui.save.stars[id] ?? 0;
}

function starHtml(n) {
  return `<span class="stars" aria-label="${n} of 3 stars">${[1, 2, 3].map((i) => `<i class="${i <= n ? "on" : ""}">★</i>`).join("")}</span>`;
}

function totalStars() {
  return LEVELS.reduce((sum, level) => sum + (ui.save.stars[level.id] ?? 0), 0);
}

function unlocked(index) {
  return index === 0 || (ui.save.stars[LEVELS[index - 1]?.id ?? "drop"] ?? 0) >= 1;
}

function persist() {
  writeSave(ui.save);
}

function currentKit() {
  return ui.mode ? kitOf(ui.mode) : [];
}

function worldPoint(canvas, clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * WORLD_W,
    y: (1 - (clientY - rect.top) / rect.height) * WORLD_H,
  };
}

function hitTest(x, y) {
  const kit = currentKit();
  for (let i = ui.placements.length - 1; i >= 0; i--) {
    const part = ui.placements[i];
    const spec = kit.find((item) => item.kind === part.kind);
    if (!spec) continue;
    if (spec.r > 0) {
      if (pointInCircle(x, y, part.x, part.y, spec.r)) return part.id;
    } else if (pointInObb(x, y, { x: part.x, y: part.y, w: spec.w, h: spec.h, angle: part.angle })) {
      return part.id;
    }
  }
  return null;
}

function renderRoster() {
  cancelAnimationFrame(ui.raf);
  const cards = LEVELS.map((level, index) => {
    const open = unlocked(index);
    return `<li><button type="button" class="plate" data-open="${level.id}" ${open ? "" : "disabled"}>
      <span class="row"><span class="label">${String(level.index).padStart(2, "0")}</span>${open ? starHtml(ui.save.stars[level.id] ?? 0) : `<span class="label">LOCKED</span>`}</span>
      <h2>${level.title}</h2>
      <p>${level.idea}</p>
      <p class="formula">${level.formula}</p>
    </button></li>`;
  }).join("");
  const bench = ui.save.bench
    ? `Best apex ${ui.save.bench.apex.toFixed(2)} m · trap ${ui.save.bench.trap.toFixed(2)} m/s`
    : "No filing yet. Drop the ball and see what the instruments say.";
  root.innerHTML = `<div class="board-head">
      <div><p class="label acid">NIGHT SHIFT</p><h1>FORGE</h1></div>
      <p class="score"><b>${totalStars()}</b><span> / 36</span></p>
      <button type="button" class="icon" id="sound">${ui.save.sound ? "Sound on" : "Muted"}</button>
    </div>
    <p class="lead">Twelve contracts. Each one asks for a result and tells you the rule that produces it. Stars for meeting it, and for meeting it clean.</p>
    <div class="specials">
      <button type="button" class="plate acid-edge" data-open="daily">
        <span class="row"><span class="label acid">DAILY</span>${starHtml(starsOf("daily"))}</span>
        <h2>Today's shot</h2>
        <p>The spring is the same. The cup is not. ${daily.day}.</p>
      </button>
      <button type="button" class="plate" data-open="bench">
        <span class="label">BENCH</span>
        <h2>Proving ground</h2>
        <p>${bench}</p>
      </button>
    </div>
    <ol class="roster">${cards}</ol>
    <p class="fine">Stars stay in this browser. They are not site points.</p>`;
  root.querySelector("#sound").addEventListener("click", toggleSound);
  root.querySelectorAll("[data-open]").forEach((button) => {
    button.addEventListener("click", () => open(button.dataset.open));
  });
}

function renderPlay() {
  cancelAnimationFrame(ui.raf);
  const copy = copyOf(ui.mode);
  root.innerHTML = `<div class="board-head">
      <button type="button" class="text-btn" id="back">Board</button>
      <p class="label">${copy.index}</p>
      <h1>${copy.title}</h1>
      ${ui.mode === "bench" ? "" : starHtml(starsOf(ui.mode))}
      <p class="score"><b>${totalStars()}</b><span> / 36</span></p>
      <button type="button" class="icon" id="sound">${ui.save.sound ? "Sound on" : "Muted"}</button>
    </div>
    <div class="play">
      <section>
        <div class="stage"><canvas id="board"></canvas></div>
        <p id="status" aria-live="polite"></p>
        <p class="fine">Space runs it. R resets. [ and ] turn a selected part.</p>
      </section>
      <aside>
        <p class="label" id="idea"></p>
        <p class="formula" id="formula"></p>
        <p id="par"></p>
        <div id="controls"></div>
        <div id="kit" class="kit"></div>
        <div id="tools" class="kit"></div>
        <p id="banner" class="warn" hidden></p>
        <div id="result" class="result" hidden></div>
        <p id="sketch-note" class="fine" hidden></p>
        <div class="actions">
          <button type="button" id="sketch" class="text-btn">Sketch the answer</button>
          <button type="button" id="run" class="run">Run</button>
          <button type="button" id="reset" class="icon" aria-label="Reset the build">↺</button>
        </div>
      </aside>
    </div>`;
  const copyNodes = () => {
    root.querySelector("#idea").textContent = copy.idea;
    root.querySelector("#formula").textContent = copy.formula;
    root.querySelector("#par").textContent = copy.par;
  };
  copyNodes();
  root.querySelector("#controls").innerHTML = copy.controls.map((control) => `<label class="slider">
      <span><span>${control.label}</span><output>${control.format(ui.tunes[control.id] ?? control.default)}</output></span>
      <input type="range" data-tune="${control.id}" min="${control.min}" max="${control.max}" step="${control.step}" value="${ui.tunes[control.id] ?? control.default}">
    </label>`).join("");
  root.querySelector("#back").addEventListener("click", () => {
    ui.mode = null;
    ui.session = null;
    renderRoster();
  });
  root.querySelector("#sound").addEventListener("click", toggleSound);
  root.querySelector("#run").addEventListener("click", run);
  root.querySelector("#reset").addEventListener("click", resetBuild);
  root.querySelector("#sketch").addEventListener("click", revealSketch);
  root.querySelector("#controls").addEventListener("input", (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    const id = input.dataset.tune;
    if (!id) return;
    ui.tunes[id] = Number(input.value);
    const control = copy.controls.find((item) => item.id === id);
    const output = input.parentElement?.querySelector("output");
    if (control && output) output.textContent = control.format(ui.tunes[id]);
  });
  root.querySelector("#kit").addEventListener("click", (event) => {
    const button = event.target.closest("[data-arm]");
    if (!button || ui.phase !== "build") return;
    unlockAudio();
    const kind = button.dataset.arm;
    ui.armed = ui.armed === kind ? null : kind;
    paintChrome();
  });
  root.querySelector("#tools").addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button || !ui.selected) return;
    if (button.dataset.turn) nudge(Number(button.dataset.turn));
    if (button.dataset.remove) {
      ui.placements = ui.placements.filter((part) => part.id !== ui.selected);
      ui.selected = null;
      paintChrome();
    }
  });
  const canvas = root.querySelector("#board");
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  fitCanvas();
  paintChrome();
  loop(performance.now());
}

function paintChrome() {
  if (!ui.mode) return;
  const copy = copyOf(ui.mode);
  const status = root.querySelector("#status");
  if (status) {
    status.textContent = ui.phase === "build" ? copy.brief : ui.phase === "result" && ui.note ? ui.note : ui.hud.caption;
  }
  const banner = root.querySelector("#banner");
  if (banner) {
    banner.hidden = !ui.banner;
    banner.textContent = ui.banner;
  }
  const result = root.querySelector("#result");
  if (result) {
    const won = ui.phase === "result" && ui.session?.phase === "success" && ui.mode !== "bench";
    result.hidden = ui.phase !== "result";
    result.innerHTML = ui.phase === "result" ? `<p>${ui.note}</p>${won ? `<p class="fine">${copy.lesson}</p>` : ""}` : "";
  }
  const run = root.querySelector("#run");
  if (run) run.textContent = ui.phase === "run" ? "Running" : ui.phase === "result" ? "Retry" : "Run";
  const sketch = root.querySelector("#sketch");
  if (sketch) {
    const hide = ui.mode === "daily" || ui.mode === "bench";
    sketch.hidden = hide;
    sketch.disabled = ui.phase !== "build";
    sketch.textContent = ui.sketch ? "Sketch is on the board" : "Sketch the answer";
  }
  const note = root.querySelector("#sketch-note");
  if (note && ui.mode !== "daily" && ui.mode !== "bench") {
    const tunes = SOLUTIONS[ui.mode]?.tunes ?? {};
    const bits = Object.entries(tunes).map(([key, value]) => {
      const control = copy.controls.find((item) => item.id === key);
      return control ? control.format(value) : `${key} ${value}`;
    });
    note.hidden = !ui.sketch;
    note.textContent = ui.sketch ? `Sketch caps the stars at two.${bits.length ? ` ${bits.join(" · ")}` : ""}` : "";
  }
  root.querySelectorAll("[data-tune]").forEach((input) => {
    input.disabled = ui.phase !== "build";
  });
  const kit = currentKit();
  const kitBox = root.querySelector("#kit");
  if (kitBox) {
    kitBox.innerHTML = kit.map((item) => {
      const used = ui.placements.filter((part) => part.kind === item.kind).length;
      const left = item.count - used;
      const on = ui.armed === item.kind ? " armed" : "";
      return `<button type="button" class="chip${on}" data-arm="${item.kind}" ${ui.phase !== "build" || left <= 0 ? "disabled" : ""}>${item.label} ${left}</button>`;
    }).join("");
  }
  const tools = root.querySelector("#tools");
  if (tools) {
    const spec = kit.find((item) => item.kind === ui.placements.find((part) => part.id === ui.selected)?.kind);
    if (ui.selected && ui.phase === "build") {
      tools.innerHTML = `${spec?.rotatable ? `<button type="button" class="chip" data-turn="-1">Turn −</button><button type="button" class="chip" data-turn="1">Turn +</button>` : ""}<button type="button" class="chip" data-remove="1">Remove</button>`;
    } else tools.innerHTML = "";
  }
  const sound = root.querySelector("#sound");
  if (sound) sound.textContent = ui.save.sound ? "Sound on" : "Muted";
  const score = root.querySelector(".score b");
  if (score) score.textContent = String(totalStars());
}

function toggleSound() {
  unlockAudio();
  ui.save = { ...ui.save, sound: !ui.save.sound };
  setMuted(!ui.save.sound);
  persist();
  paintChrome();
  if (!ui.mode) renderRoster();
}

function open(id) {
  ui.mode = id;
  ui.phase = "build";
  ui.sketch = false;
  ui.banner = "";
  ui.note = "";
  ui.selected = null;
  ui.armed = null;
  ui.ghostTrail = [];
  ui.session = null;
  ui.settled = false;
  ui.sparks = [];
  ui.hud = { ...EMPTY_READOUT };
  if (id === "daily") {
    const spring = LEVELS.find((level) => level.id === "spring");
    ui.tunes = spring ? defaultTunes(spring) : { angle: 42, pull: 0.45 };
    ui.placements = [];
  } else if (id === "bench") {
    ui.tunes = {};
    ui.placements = [];
  } else {
    const level = LEVELS.find((entry) => entry.id === id);
    if (!level) return;
    ui.tunes = defaultTunes(level);
    ui.placements = freshPlacements(level);
  }
  renderPlay();
}

function placeArmed(x, y) {
  if (!ui.armed) return;
  const spec = currentKit().find((item) => item.kind === ui.armed);
  if (!spec) return;
  const used = ui.placements.filter((part) => part.kind === ui.armed).length;
  if (used >= spec.count) return;
  const part = {
    id: `${ui.armed}-${used + 1}-${Math.floor(Math.random() * 999)}`,
    kind: ui.armed,
    x: Math.min(19.2, Math.max(0.6, x)),
    y: spec.lockY ?? Math.min(10.2, Math.max(0.4, y)),
    angle: 0,
  };
  ui.placements = [...ui.placements, part];
  ui.selected = part.id;
  ui.armed = null;
  sfx.place();
  paintChrome();
}

function onPointerDown(event) {
  if (ui.phase !== "build") return;
  unlockAudio();
  const canvas = event.currentTarget;
  const point = worldPoint(canvas, event.clientX, event.clientY);
  const id = hitTest(point.x, point.y);
  if (id) {
    const part = ui.placements.find((entry) => entry.id === id);
    if (!part) return;
    ui.selected = id;
    ui.drag = { id, dx: point.x - part.x, dy: point.y - part.y };
    canvas.setPointerCapture(event.pointerId);
    paintChrome();
    return;
  }
  ui.selected = null;
  if (ui.armed) placeArmed(point.x, point.y);
  else paintChrome();
}

function onPointerMove(event) {
  if (!ui.drag || ui.phase !== "build") return;
  const point = worldPoint(event.currentTarget, event.clientX, event.clientY);
  ui.placements = ui.placements.map((part) => {
    if (part.id !== ui.drag.id) return part;
    const spec = currentKit().find((item) => item.kind === part.kind);
    return {
      ...part,
      x: Math.min(19.2, Math.max(0.6, point.x - ui.drag.dx)),
      y: spec?.lockY ?? Math.min(10.2, Math.max(0.4, point.y - ui.drag.dy)),
    };
  });
}

function onPointerUp() {
  if (ui.drag) sfx.place();
  ui.drag = null;
}

function run() {
  if (!ui.mode || ui.phase === "run") return;
  unlockAudio();
  if (ui.phase === "result" && ui.session) ui.ghostTrail = ui.session.trail;
  const problem = issue(ui.mode, ui.placements);
  if (problem) {
    ui.banner = problem;
    paintChrome();
    return;
  }
  ui.banner = "";
  ui.session = startLevel(ui.mode, ui.placements, ui.tunes, {
    daily: ui.mode === "daily" ? daily : undefined,
  });
  ui.settled = false;
  ui.sparks = [];
  ui.phase = "run";
  sfx.run();
  paintChrome();
}

function resetBuild() {
  if (!ui.mode || ui.phase === "run") return;
  if (ui.mode === "daily" || ui.mode === "bench") {
    ui.placements = [];
    if (ui.mode === "daily") {
      const spring = LEVELS.find((level) => level.id === "spring");
      if (spring) ui.tunes = defaultTunes(spring);
    }
  } else {
    const level = LEVELS.find((entry) => entry.id === ui.mode);
    if (!level) return;
    ui.placements = freshPlacements(level);
    ui.tunes = defaultTunes(level);
  }
  ui.sketch = false;
  ui.selected = null;
  ui.armed = null;
  ui.ghostTrail = [];
  ui.note = "";
  ui.banner = "";
  ui.phase = "build";
  ui.session = null;
  renderPlay();
}

function revealSketch() {
  if (!ui.mode || ui.mode === "daily" || ui.mode === "bench" || ui.phase !== "build") return;
  unlockAudio();
  ui.sketch = true;
  ui.save = { ...ui.save, hints: { ...ui.save.hints, [ui.mode]: true } };
  persist();
  paintChrome();
}

function nudge(dir) {
  if (!ui.selected) return;
  ui.placements = ui.placements.map((part) => {
    if (part.id !== ui.selected) return part;
    const spec = currentKit().find((item) => item.kind === part.kind);
    if (!spec?.rotatable) return part;
    return { ...part, angle: part.angle + dir * (Math.PI / 36) };
  });
}

function fitCanvas() {
  const canvas = root.querySelector("#board");
  const parent = canvas?.parentElement;
  if (!canvas || !parent) return;
  const width = parent.clientWidth;
  const height = Math.max(200, width * (WORLD_H / WORLD_W));
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.height = `${height}px`;
}

let lastFit = 0;
function loop(now) {
  if (!ui.mode) return;
  const dt = Math.min(0.05, (now - (loop.prev ?? now)) / 1000);
  loop.prev = now;
  loop.acc = (loop.acc ?? 0) + dt;
  let hitstop = loop.hitstop ?? 0;
  let steps = 0;
  const session = ui.session;
  while (loop.acc >= STEP_S && steps < 5 && ui.phase === "run" && session?.phase === "run") {
    if (hitstop > 0) {
      hitstop -= STEP_S;
      loop.acc -= STEP_S;
      break;
    }
    stepLevel(session);
    if (session.impacts.length) {
      ui.trauma = Math.min(1, ui.trauma + 0.34);
      hitstop = reduceMotion ? 0 : 0.028;
      const mag = session.impacts.reduce((max, hit) => Math.max(max, hit.mag), 0);
      sfx.hit(mag);
      for (const hit of session.impacts) {
        for (let n = 0; n < 5; n++) {
          ui.sparks.push({
            x: hit.x,
            y: hit.y,
            vx: (Math.random() - 0.5) * 5,
            vy: 1 + Math.random() * 4,
            life: 1,
          });
        }
      }
    }
    loop.acc -= STEP_S;
    steps += 1;
  }
  loop.hitstop = hitstop;
  if (ui.phase !== "run") loop.acc = 0;
  ui.trauma = Math.max(0, ui.trauma - dt * 1.7);
  for (const spark of ui.sparks) {
    spark.x += spark.vx * dt;
    spark.y += spark.vy * dt;
    spark.vy -= 8 * dt;
    spark.life -= dt * 1.6;
  }
  ui.sparks = ui.sparks.filter((spark) => spark.life > 0);

  if (session && session.phase !== "run" && ui.phase === "run" && !ui.settled) {
    ui.settled = true;
    ui.ghostTrail = session.trail;
    ui.phase = "result";
    const id = ui.mode;
    if (session.phase === "success" && id && id !== "bench") {
      sfx.success();
      const hinted = id !== "daily" && !!ui.save.hints[id];
      const earned = id === "daily" ? grade("spring", session.stats, false) : grade(id, session.stats, hinted);
      ui.note = session.note;
      const next = { ...ui.save, stars: { ...ui.save.stars }, hints: { ...ui.save.hints } };
      if (id === "daily") {
        if (ui.save.dailyDay !== daily.day || earned > ui.save.dailyStars) {
          next.dailyDay = daily.day;
          next.dailyStars = Math.max(ui.save.dailyDay === daily.day ? ui.save.dailyStars : 0, earned);
        }
      } else if (earned > (ui.save.stars[id] ?? 0)) {
        next.stars[id] = earned;
      }
      ui.save = next;
      persist();
    } else if (session.phase === "fail") {
      sfx.fail();
      ui.note = session.reason;
    } else {
      ui.note = session.note || session.reason;
      if (id === "bench") {
        ui.save = {
          ...ui.save,
          bench: {
            apex: Math.max(ui.save.bench?.apex ?? 0, session.stats.apex ?? 0),
            trap: Math.max(ui.save.bench?.trap ?? 0, session.stats.trap ?? 0),
            fan: Math.max(ui.save.bench?.fan ?? 0, session.stats.fan ?? 0),
          },
        };
        persist();
      }
    }
    paintChrome();
  }

  if (ui.phase === "run" && session && now - (loop.hudAt ?? 0) > 100) {
    loop.hudAt = now;
    ui.hud = session.readout;
    const status = root.querySelector("#status");
    if (status) status.textContent = session.readout.caption;
  }

  const canvas = root.querySelector("#board");
  if (now - lastFit > 400) {
    lastFit = now;
    fitCanvas();
  }
  const ctx = canvas?.getContext("2d");
  if (ctx && canvas && ui.mode) {
    const preview = previewLevel(ui.mode, ui.placements, ui.tunes, {
      daily: ui.mode === "daily" ? daily : undefined,
      showArc: ui.mode === "spring" || ui.mode === "daily" || ui.sketch,
    });
    const live = ui.phase === "build" ? null : ui.session;
    let ghostBodies = [];
    let arc = preview.arc;
    if (ui.sketch && ui.mode !== "daily" && ui.mode !== "bench") {
      const solution = SOLUTIONS[ui.mode];
      const sketched = previewLevel(ui.mode, solution.placements, solution.tunes, { showArc: true });
      ghostBodies = sketched.bodies.filter((body) => solution.placements.some((part) => part.id === body.id));
      arc = sketched.arc ?? arc;
    }
    const shake = reduceMotion ? 0 : ui.trauma ** 2 * 10 * (canvas.width / 800);
    drawFrame(ctx, canvas.width, canvas.height, {
      bodies: live && live.bodies.length ? live.bodies : preview.bodies,
      labels: live && live.labels.length ? live.labels : preview.labels,
      arc: ui.phase === "build" ? arc : null,
      trail: live?.trail ?? [],
      ghostTrail: ui.phase === "build" ? ui.ghostTrail : [],
      ghost: ui.phase === "build" ? ghostBodies : [],
      sparks: ui.sparks,
      shakeX: Math.sin(now * 0.04) * shake,
      shakeY: Math.cos(now * 0.033) * shake,
      highlight: ui.selected,
    });
  }
  ui.raf = requestAnimationFrame(loop);
}

window.addEventListener("keydown", (event) => {
  const tag = event.target?.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA") return;
  if (!ui.mode) return;
  if (event.code === "Space") {
    event.preventDefault();
    run();
  } else if (event.key === "r" || event.key === "R") {
    resetBuild();
  } else if ((event.key === "[" || event.key === "]") && ui.selected && ui.phase === "build") {
    nudge(event.key === "]" ? 1 : -1);
  }
});

window.addEventListener("resize", fitCanvas);

ui.save = loadSave();
setMuted(!ui.save.sound);
renderRoster();
