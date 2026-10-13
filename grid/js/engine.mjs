// src/grid/rng.ts
function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = a + 1831565813 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

// src/grid/sim.ts
var WATCHES = ["night", "morning", "day", "evening"];
var WATCH_LABEL = {
  night: "Night",
  morning: "Morning",
  day: "Day",
  evening: "Evening"
};
var DISTRICTS = ["quay", "harbour", "gardens", "mill", "docks"];
var DISTRICT_LABEL = {
  quay: "North Quay",
  harbour: "Harbour Row",
  gardens: "East Gardens",
  mill: "Mill End",
  docks: "South Docks"
};
var LIMITS = {
  windPlate: 26,
  sunPlate: 30,
  nukeMax: 34,
  ramp: 8,
  coalPeak: 22,
  coalHold: 16,
  field: 26,
  quayHarbour: 18,
  northGate: 42,
  glassField: 30,
  gardensHarbour: 16,
  rose: 36,
  roseGate: 22,
  cinder: 28,
  cinGate: 18,
  storeMax: 18,
  storeRate: 8,
  bunkerCap: 10,
  collierLoad: 4
};
var SEGMENT_CAP = {
  galeDrop: LIMITS.field,
  galeRun: LIMITS.quayHarbour,
  galeGate: LIMITS.northGate,
  glassDrop: LIMITS.glassField,
  glassRun: LIMITS.gardensHarbour,
  roseRun: LIMITS.rose,
  roseGate: LIMITS.roseGate,
  cinderRun: LIMITS.cinder,
  cinderGate: LIMITS.cinGate
};
function segmentCap(id) {
  return SEGMENT_CAP[id];
}
var SHAPE = {
  quay: [6, 8, 7, 14],
  harbour: [8, 12, 13, 16],
  gardens: [5, 7, 12, 13],
  mill: [4, 16, 22, 8],
  docks: [7, 10, 12, 11]
};
var LEFT = ["Low", "Red", "Kiln", "Ash", "Grey", "Salt", "Iron", "Pale", "High", "Old"];
var RIGHT = ["Holm", "Wharf", "Reach", "Yard", "Beck", "Fold", "End", "Quay", "Mill", "Cut"];
var ZERO_FLOW = () => ({
  galeDrop: 0,
  galeRun: 0,
  galeGate: 0,
  glassDrop: 0,
  glassRun: 0,
  roseRun: 0,
  roseGate: 0,
  cinderRun: 0,
  cinderGate: 0
});
function placeName(seed) {
  if (/^[a-z]+(?:[- ][a-z]+){1,2}$/i.test(seed)) {
    return seed.split(/[- ]/).map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(" ");
  }
  const n = hashString(seed);
  return `${LEFT[n % LEFT.length]} ${RIGHT[Math.floor(n / LEFT.length) % RIGHT.length]}`;
}
function unit(seed, salt) {
  return mulberry32(hashString(`${seed}:${salt}`))();
}
function ramped(actual, target) {
  const goal = clamp(Math.round(target), 0, LIMITS.nukeMax);
  return clamp(actual + clamp(goal - actual, -LIMITS.ramp, LIMITS.ramp), 0, LIMITS.nukeMax);
}
function coalMw(mode, watch, bunkers, burn) {
  if (mode === "off" || bunkers <= 0 || burn <= 0) return 0;
  const scale = Math.min(1, bunkers / burn);
  if (mode === "peak") return watch === "day" || watch === "evening" ? Math.round(LIMITS.coalPeak * scale) : 0;
  return Math.round(LIMITS.coalHold * scale);
}
function coalBurn(mode) {
  if (mode === "peak") return 1;
  if (mode === "hold") return 2;
  return 0;
}
function collierDue(day) {
  return day > 1 && day % 3 === 1;
}
function collierArrives(seed, day) {
  if (!collierDue(day)) return false;
  return unit(seed, `collier:${day}`) > 0.18;
}
function pathRoom(id, caps) {
  if (id === "harbour") return caps.north;
  if (id === "quay") return Math.min(caps.north, caps.quay);
  if (id === "gardens") return Math.min(caps.north, caps.gardens);
  if (id === "mill") return caps.rose;
  return caps.copper;
}
function spend(id, amount, caps) {
  if (id === "harbour" || id === "quay" || id === "gardens") caps.north -= amount;
  if (id === "quay") caps.quay -= amount;
  if (id === "gardens") caps.gardens -= amount;
  if (id === "mill") caps.rose -= amount;
  if (id === "docks") caps.copper -= amount;
}
function rotate(n) {
  const k = n % DISTRICTS.length;
  return [...DISTRICTS.slice(k), ...DISTRICTS.slice(0, k)];
}
function runWatch(id, index, need, made, storeIn, mode, protect2) {
  const got = { quay: 0, harbour: 0, gardens: 0, mill: 0, docks: 0 };
  const flow = ZERO_FLOW();
  const windIn = Math.min(made.wind, LIMITS.field);
  flow.galeDrop = windIn;
  const quayTake = Math.min(need.quay, windIn);
  got.quay += quayTake;
  const windPastQuay = Math.min(windIn - quayTake, LIMITS.quayHarbour);
  const windSpillLocal = windIn - quayTake - windPastQuay;
  flow.galeRun = windPastQuay;
  const sunIn = Math.min(made.sun, LIMITS.glassField);
  flow.glassDrop = sunIn;
  const gardensTake = Math.min(need.gardens, sunIn);
  got.gardens += gardensTake;
  const sunPast = Math.min(sunIn - gardensTake, LIMITS.gardensHarbour);
  const sunSpillLocal = sunIn - gardensTake - sunPast;
  flow.glassRun = sunPast;
  const harbourFromWind = Math.min(need.harbour, windPastQuay);
  const windLeft = windPastQuay - harbourFromWind;
  const harbourFromSun = Math.min(need.harbour - harbourFromWind, sunPast);
  const sunLeft = sunPast - harbourFromSun;
  got.harbour += harbourFromWind + harbourFromSun;
  const atHarbour = windLeft + sunLeft;
  const gateExport = Math.min(atHarbour, LIMITS.northGate);
  const northSpill = atHarbour - gateExport;
  const nukeIn = Math.min(made.nuclear, LIMITS.rose);
  flow.roseRun = nukeIn;
  const millTake = Math.min(need.mill, nukeIn);
  got.mill += millTake;
  const roseExport = Math.min(nukeIn - millTake, LIMITS.roseGate);
  const nukeSpill = nukeIn - millTake - roseExport;
  const coalIn = Math.min(made.coal, LIMITS.cinder);
  flow.cinderRun = coalIn;
  const docksTake = Math.min(need.docks, coalIn);
  got.docks += docksTake;
  const cinExport = Math.min(coalIn - docksTake, LIMITS.cinGate);
  const coalSpill = coalIn - docksTake - cinExport;
  let pool = gateExport + roseExport + cinExport;
  let store2 = storeIn;
  let rate = LIMITS.storeRate;
  const allowDrain = mode === "spend" || mode === "save" && id === "evening";
  const allowCharge = mode === "save" && id !== "evening";
  const caps = {
    north: LIMITS.northGate - gateExport,
    quay: LIMITS.quayHarbour - windPastQuay,
    gardens: LIMITS.gardensHarbour - sunPast,
    rose: LIMITS.roseGate - roseExport,
    copper: LIMITS.cinGate - cinExport
  };
  const order = protect2 === "even" ? rotate(index) : [protect2, ...rotate(index).filter((item) => item !== protect2)];
  const pull = (id2, chunk) => {
    const room = need[id2] - got[id2];
    const gate = pathRoom(id2, caps);
    if (room <= 0 || gate <= 0 || chunk <= 0) return;
    let take = Math.min(chunk, room, gate, pool);
    pool -= take;
    if (allowDrain) {
      const extra = Math.min(chunk - take, room - take, gate - take, store2, rate);
      if (extra > 0) {
        store2 -= extra;
        rate -= extra;
        take += extra;
      }
    }
    if (take <= 0) return;
    got[id2] += take;
    spend(id2, take, caps);
  };
  if (protect2 !== "even") {
    for (let n = 0; n < 40 && need[protect2] - got[protect2] > 0; n++) pull(protect2, need[protect2] - got[protect2]);
  }
  for (let n = 0; n < 48; n++) {
    let moved = false;
    for (const id2 of order) {
      const before = got[id2];
      pull(id2, 2);
      if (got[id2] > before) moved = true;
    }
    if (!moved) break;
  }
  if (allowCharge && pool > 0 && rate > 0) {
    const take = Math.min(pool, rate, LIMITS.storeMax - store2);
    pool -= take;
    store2 += take;
  }
  const northImport = DISTRICTS.filter((item) => item === "quay" || item === "harbour" || item === "gardens").reduce(
    (sum, item) => sum + Math.max(0, got[item] - (item === "quay" ? quayTake : item === "gardens" ? gardensTake : harbourFromWind + harbourFromSun)),
    0
  );
  flow.galeGate = gateExport + northImport;
  flow.galeRun = windPastQuay + Math.max(0, got.quay - quayTake);
  flow.glassRun = sunPast + Math.max(0, got.gardens - gardensTake);
  flow.roseGate = roseExport + Math.max(0, got.mill - millTake);
  flow.cinderGate = cinExport + Math.max(0, got.docks - docksTake);
  let demand = 0;
  let served = 0;
  for (const item of DISTRICTS) {
    demand += need[item];
    served += got[item];
  }
  const spill = windSpillLocal + sunSpillLocal + northSpill + nukeSpill + coalSpill + pool;
  return {
    store: store2,
    watch: {
      id,
      wind: made.wind / LIMITS.windPlate,
      sun: made.sun / LIMITS.sunPlate,
      demand,
      served,
      made,
      spill,
      districts: {
        quay: { need: need.quay, got: got.quay },
        harbour: { need: need.harbour, got: got.harbour },
        gardens: { need: need.gardens, got: got.gardens },
        mill: { need: need.mill, got: got.mill },
        docks: { need: need.docks, got: got.docks }
      },
      flow
    }
  };
}
function skyLine(wind, sun, warm) {
  const windWord = wind < 0.28 ? "Light wind" : wind < 0.55 ? "Fresh wind" : wind < 0.8 ? "Strong wind" : "Gale";
  const sunWord = sun < 0.4 ? "thick cloud" : sun < 0.72 ? "haze" : "clear sun";
  return `${warm ? "Warm. " : ""}${windWord}, ${sunWord}`;
}
function buildNote(game, watches, spilled, collier, due) {
  let worst = watches[0];
  for (const watch of watches) {
    if (watch.served / watch.demand < worst.served / worst.demand) worst = watch;
  }
  const ratio = worst.demand ? worst.served / worst.demand : 1;
  const label = WATCH_LABEL[worst.id];
  const tide = due ? collier ? " A collier tied up." : " The collier missed the tide." : "";
  if (ratio > 0.985) {
    if (spilled > 10) return `${label} stayed lit. ${Math.round(spilled)} MW spilled with nowhere to go.${tide}`;
    return `${label} held. The city stayed lit.${tide}`;
  }
  let who = "quay";
  let gap = 0;
  for (const id of DISTRICTS) {
    const missing = worst.districts[id].need - worst.districts[id].got;
    if (missing > gap) {
      gap = missing;
      who = id;
    }
  }
  const gateFull = worst.flow.galeGate >= LIMITS.northGate - 0.4 && (who === "quay" || who === "harbour" || who === "gardens");
  const roseFull = worst.flow.roseGate >= LIMITS.roseGate - 0.4 && who === "mill";
  const copperFull = worst.flow.cinderGate >= LIMITS.cinGate - 0.4 && who === "docks";
  const why = gateFull ? "Harbour's drop was full." : roseFull ? "The rose gate into the Exchange was full." : copperFull ? "The copper gate was full." : game.policy.coal === "off" && (worst.id === "evening" || worst.id === "day") ? "Cinder was off." : "The Exchange ran out of spare.";
  return `${label}: ${DISTRICT_LABEL[who]} short ${Math.round(gap)} MW. ${why}${tide}`;
}
function preview(game) {
  const nuclear = ramped(game.nuclear, game.policy.nuclearTarget);
  const burn = coalBurn(game.policy.coal);
  const climate = 0.94 + unit(game.seed, "climate") * 0.12;
  const warm = unit(game.seed, `warm:${game.day}`) > 0.82;
  const windShape = Math.floor(unit(game.seed, `wshape:${game.day}`) * 4);
  const sunShape = Math.floor(unit(game.seed, `sshape:${game.day}`) * 3);
  const windBase = [
    [0.58, 0.5, 0.46, 0.42],
    [0.18, 0.22, 0.26, 0.2],
    [0.9, 0.72, 0.4, 0.22],
    [0.16, 0.34, 0.7, 0.95]
  ][windShape];
  const sunBase = [
    [0, 0.48, 1, 0.22],
    [0, 0.32, 0.64, 0.12],
    [0, 0.14, 0.32, 0.05]
  ][sunShape];
  let store2 = game.store;
  const watches = [];
  for (let i = 0; i < WATCHES.length; i++) {
    const id = WATCHES[i];
    const jitter = 0.94 + unit(game.seed, `j:${game.day}:${id}`) * 0.1;
    const warmK = warm ? 1.14 : 1;
    const need = {};
    for (const district of DISTRICTS) {
      const slant = 0.92 + unit(game.seed, `slant:${district}`) * 0.16;
      need[district] = Math.max(1, Math.round(SHAPE[district][i] * climate * slant * jitter * warmK));
    }
    const windFactor = clamp(windBase[i] * (0.82 + unit(game.seed, `wind:${game.day}:${id}`) * 0.36), 0, 1.12);
    const sunFactor = clamp(sunBase[i] * (0.86 + unit(game.seed, `sun:${game.day}:${id}`) * 0.28), 0, 1);
    const made = {
      wind: Math.round(Math.min(LIMITS.windPlate, LIMITS.windPlate * windFactor)),
      sun: Math.round(Math.min(LIMITS.sunPlate, LIMITS.sunPlate * sunFactor)),
      nuclear,
      coal: coalMw(game.policy.coal, id, game.bunkers, burn)
    };
    const step2 = runWatch(id, i, need, made, store2, game.policy.store, game.policy.protect);
    store2 = step2.store;
    watches.push(step2.watch);
  }
  let demand = 0;
  let served = 0;
  let spilled = 0;
  for (const watch of watches) {
    demand += watch.demand;
    served += watch.served;
    spilled += watch.spill;
  }
  const lit = demand ? served / demand : 1;
  const due = collierDue(game.day);
  const collier = collierArrives(game.seed, game.day);
  const bunkersAfter = clamp(game.bunkers - Math.min(burn, game.bunkers) + (collier ? LIMITS.collierLoad : 0), 0, LIMITS.bunkerCap);
  const windAvg = watches.reduce((sum, watch) => sum + watch.wind, 0) / watches.length;
  const sunDay = watches[2]?.sun ?? 0;
  return {
    nuclear,
    watches,
    lit,
    burned: Math.min(burn, game.bunkers),
    spilled,
    dark: demand - served,
    store: store2,
    bunkersAfter,
    collier,
    collierDue: due,
    warm,
    sky: skyLine(windAvg, sunDay, warm),
    note: buildNote(game, watches, spilled, collier, due)
  };
}
function nextTrust(trust, lit) {
  const loss = (1 - lit) * 48;
  const gain = lit >= 0.99 ? 8 : lit >= 0.93 ? 3 : 0;
  return clamp(Math.round(trust - loss + gain), 0, 100);
}
function freshGame(seed) {
  const clean = seed.trim().slice(0, 40) || "low-holm";
  return {
    v: 2,
    seed: clean,
    name: placeName(clean),
    day: 1,
    nuclear: 22,
    bunkers: 8,
    store: 8,
    trust: 76,
    streak: 0,
    best: 0,
    policy: { nuclearTarget: 22, coal: "off", store: "save", protect: "even" },
    log: [{ day: 0, text: "Four feeders, five streets. The core climbs slowly. Wind and sun do not wait, and coal is a bunker you can spend." }],
    over: false
  };
}
function restart(game) {
  const next = freshGame(game.seed);
  next.best = Math.max(game.best, game.streak);
  return next;
}
function step(game) {
  if (game.over) return game;
  const report = preview(game);
  const trust = nextTrust(game.trust, report.lit);
  const over = trust <= 0;
  const streak = report.lit >= 0.97 && !over ? game.streak + 1 : 0;
  const text = over ? `${report.note} Trust ran out.` : report.note;
  return {
    ...game,
    day: game.day + 1,
    nuclear: report.nuclear,
    bunkers: report.bunkersAfter,
    store: report.store,
    trust,
    streak,
    best: Math.max(game.best, streak),
    log: [{ day: game.day, text }, ...game.log].slice(0, 8),
    over
  };
}

// src/grid/save.ts
var KEY = "grid:power:v2";
function finite(n) {
  return typeof n === "number" && Number.isFinite(n);
}
function coal(value) {
  return value === "peak" || value === "hold" ? value : "off";
}
function store(value) {
  return value === "hold" || value === "spend" ? value : "save";
}
function protect(value) {
  if (value === "quay" || value === "harbour" || value === "gardens" || value === "mill" || value === "docks") return value;
  return "even";
}
function normalize(value) {
  if (!value || typeof value !== "object") return null;
  const g = value;
  if (g.v !== 2 || typeof g.seed !== "string" || !g.seed) return null;
  if (!finite(g.day) || !finite(g.nuclear) || !g.policy) return null;
  const fresh = freshGame(g.seed);
  return {
    ...fresh,
    ...g,
    name: typeof g.name === "string" && g.name ? g.name : fresh.name,
    day: Math.max(1, Math.round(g.day)),
    nuclear: finite(g.nuclear) ? g.nuclear : fresh.nuclear,
    bunkers: finite(g.bunkers) ? g.bunkers : fresh.bunkers,
    store: finite(g.store) ? g.store : fresh.store,
    trust: finite(g.trust) ? g.trust : fresh.trust,
    streak: finite(g.streak) ? g.streak : 0,
    best: finite(g.best) ? g.best : 0,
    policy: {
      nuclearTarget: finite(g.policy.nuclearTarget) ? g.policy.nuclearTarget : fresh.policy.nuclearTarget,
      coal: coal(g.policy.coal),
      store: store(g.policy.store),
      protect: protect(g.policy.protect)
    },
    log: Array.isArray(g.log) ? g.log.filter((line) => line && typeof line.text === "string").slice(0, 8) : fresh.log,
    over: Boolean(g.over)
  };
}
function loadGame() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return normalize(JSON.parse(raw));
  } catch {
    return null;
  }
}
function writeGame(game) {
  localStorage.setItem(KEY, JSON.stringify(game));
}
function fnv(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return `0000000${h.toString(16)}`.slice(-8);
}
function packSave(game) {
  const body = JSON.stringify(game);
  const file = { v: 2, kind: "grid", check: fnv(body), game };
  return JSON.stringify(file, null, 2);
}
function unpackSave(text) {
  const parsed = JSON.parse(text);
  if (!parsed || parsed.kind !== "grid" || parsed.v !== 2) throw new Error("That file is not a GRID save.");
  if ("enc" in parsed && parsed.enc) throw new Error("This save is locked. Add the passphrase.");
  const plain = parsed;
  if (!plain.game || plain.check !== fnv(JSON.stringify(plain.game))) {
    throw new Error("The checksum does not match. The file was edited or it did not finish saving.");
  }
  const game = normalize(plain.game);
  if (!game) throw new Error("This save is from a different GRID.");
  return game;
}
function bytesToB64(bytes) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}
function b64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function view(bytes) {
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  return copy;
}
async function keyFrom(passphrase, salt) {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: view(salt), iterations: 12e4, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}
async function encodeSave(game, passphrase) {
  const plain = packSave(game);
  if (!passphrase) return plain;
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await keyFrom(passphrase, salt);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: view(iv) }, key, new TextEncoder().encode(plain)));
  const file = { v: 2, kind: "grid", enc: true, salt: bytesToB64(salt), iv: bytesToB64(iv), ct: bytesToB64(ct) };
  return JSON.stringify(file);
}
async function decodeSave(text, passphrase) {
  const parsed = JSON.parse(text);
  if (parsed && "enc" in parsed && parsed.enc) {
    if (!passphrase) throw new Error("This save is locked. Add the passphrase.");
    try {
      const salt = b64ToBytes(parsed.salt);
      const iv = b64ToBytes(parsed.iv);
      const key = await keyFrom(passphrase, salt);
      const clear = await crypto.subtle.decrypt({ name: "AES-GCM", iv: view(iv) }, key, view(b64ToBytes(parsed.ct)));
      return unpackSave(new TextDecoder().decode(clear));
    } catch {
      throw new Error("Wrong passphrase, or the file is damaged.");
    }
  }
  return unpackSave(text);
}
function download(filename, text) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// src/grid/audio.ts
var ctx = null;
var muted = false;
function setGridMuted(next) {
  muted = next;
}
function unlockGridAudio() {
  if (muted) return;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  if (!ctx) ctx = new Ctx();
  if (ctx.state === "suspended") void ctx.resume();
}
function tone(freq, dur, type, gain, delay = 0) {
  if (muted || !ctx) return;
  const t = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  amp.gain.setValueAtTime(1e-4, t);
  amp.gain.exponentialRampToValueAtTime(gain, t + 0.02);
  amp.gain.exponentialRampToValueAtTime(1e-4, t + dur);
  osc.connect(amp);
  amp.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}
function playGrid(kind) {
  unlockGridAudio();
  if (kind === "click") tone(520, 0.06, "square", 0.03);
  if (kind === "day") tone(180, 0.18, "sine", 0.04);
  if (kind === "ok") {
    tone(330, 0.12, "sine", 0.04);
    tone(440, 0.16, "sine", 0.03, 0.09);
  }
  if (kind === "bad") tone(90, 0.28, "triangle", 0.05);
}
export {
  DISTRICTS,
  DISTRICT_LABEL,
  LIMITS,
  WATCHES,
  WATCH_LABEL,
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
  writeGame
};
