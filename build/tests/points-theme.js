// Points ledger, header chip, theme toggle and colour contrast checks. Loaded by run.js.
var assert = require("assert"), path = require("path"), fs = require("fs"), jsdom = require("jsdom"), crypto = require("crypto");
module.exports = function (t, ctx) {
  var ROOT = ctx.ROOT, read = ctx.read;
  var POINTS = read("assets/points.js"), THEME = read("assets/theme.js");
  var GAME = ["skywave/index.html", "skywave/help.html", "skywave/about.html", "skywave/log.html", "lorenz/index.html", "lorenz/help.html", "lorenz/about.html", "lorenz/log.html"];
  var ALL = ctx.GENERATED.concat(GAME);

  /* A window with the points script loaded. storage: initial localStorage. */
  function win(storage, html, opts) {
    var w = new jsdom.JSDOM(html || "<!doctype html><body></body>", Object.assign({url: "https://dexmlabs.app/", runScripts: "outside-only", pretendToBeVisual: true}, opts || {})).window;
    Object.keys(storage || {}).forEach(function (k) { w.localStorage.setItem(k, storage[k]); });
    w.eval(POINTS); return w;
  }
  function stored(w) { return JSON.parse(w.localStorage.getItem("dexm:points")); }
  var KEY_DAY = "2026-10-09";

  /* ---------- ledger ---------- */
  t("points: a new player starts with 150, and the balance is worked out from the ledger", function () {
    var w = win(), P = w.DexmPoints;
    assert.strictEqual(P.balance(), 150); assert.strictEqual(P.WELCOME, 150);
    var s = stored(w); assert.strictEqual(s.entries.length, 1); assert.strictEqual(s.entries[0].source, "welcome"); assert.strictEqual(s.balance, 150);
    assert.ok(/^[0-9a-f]{8}$/.test(s.entries[0].h), "each entry is chained by a hash");
  });
  t("points: earn adds once per ref, spend takes points, and refs make a spend idempotent", function () {
    var P = win().DexmPoints;
    assert.strictEqual(JSON.stringify(P.earn("lorenz", 100, "lorenz:daily:" + KEY_DAY)), JSON.stringify({ok: true, balance: 250}));
    assert.strictEqual(P.earn("lorenz", 100, "lorenz:daily:" + KEY_DAY).reason, "duplicate"); assert.strictEqual(P.balance(), 250);
    assert.strictEqual(P.spend("lorenz", 50, "lorenz:reveal:x").ok, true); assert.strictEqual(P.balance(), 200);
    var again = P.spend("lorenz", 50, "lorenz:reveal:x"); assert.ok(again.ok && again.already); assert.strictEqual(P.balance(), 200, "charged once");
    assert.strictEqual(P.spend("skywave", 20).ok, true); assert.strictEqual(P.spend("skywave", 20).ok, true); assert.strictEqual(P.balance(), 160, "no ref, charged every time");
  });
  t("points: insufficient funds are refused and nothing changes; bad amounts are refused", function () {
    var w = win(), P = w.DexmPoints; P.balance(); var before = w.localStorage.getItem("dexm:points");
    var r = P.spend("lorenz", 151, "big"); assert.strictEqual(r.ok, false); assert.strictEqual(r.reason, "insufficient"); assert.strictEqual(P.balance(), 150);
    assert.strictEqual(w.localStorage.getItem("dexm:points"), before);
    assert.strictEqual(P.canAfford(150), true); assert.strictEqual(P.canAfford(151), false);
    [0, -5, 1.5, 1e9, NaN, "10"].forEach(function (n) { assert.strictEqual(P.earn("x", n, "r" + n).ok, false, "earn " + n); assert.strictEqual(P.spend("x", n).ok, false, "spend " + n); });
    assert.strictEqual(P.earn("x", 10, "").ok, false, "earn needs a ref");
    assert.ok(P.spend("x", 150).ok); assert.strictEqual(P.balance(), 0); assert.strictEqual(P.spend("x", 1).ok, false, "never below zero");
  });
  t("points: daily refs pay once a day, practice pays up to 3 a day per game", function () {
    var P = win().DexmPoints;
    ["skywave:daily:2026-10-09", "lorenz:daily:2026-10-09", "lorenz:hard:2026-10-09", "lorenz:daily:2026-10-10"].forEach(function (ref) { assert.ok(P.earn("x", 100, ref).ok, ref); assert.ok(!P.earn("x", 100, ref).ok, ref + " twice"); });
    for (var i = 0; i < 3; i++) assert.ok(P.earnPractice("lorenz", KEY_DAY).ok);
    assert.strictEqual(P.earnPractice("lorenz", KEY_DAY).reason, "limit");
    assert.ok(P.earnPractice("skywave", KEY_DAY).ok, "the other game has its own limit"); assert.ok(P.earnPractice("lorenz", "2026-10-10").ok, "a new day");
    assert.strictEqual(P.balance(), 150 + 400 + 5 * 20);
  });
  t("points: a hand edited entry keeps the entries before it, drops the rest, and says so once", function () {
    var w = win(), P = w.DexmPoints; P.earn("lorenz", 100, "a"); P.earn("lorenz", 100, "b"); P.spend("lorenz", 50, "c"); assert.strictEqual(P.balance(), 300);
    var s = stored(w); s.entries[2].amount = 5000; w.localStorage.setItem("dexm:points", JSON.stringify(s));
    P.reload(); assert.strictEqual(P.balance(), 250, "welcome and a kept, b dropped from the edit on"); assert.strictEqual(P.entries().length, 2);
    assert.ok(/kept the ones I could check/.test(P.notice()));
    var again = stored(w); assert.strictEqual(again.entries.length, 2, "the repaired ledger is saved"); assert.strictEqual(again.balance, 250);
    P.clearNotice(); P.reload(); assert.strictEqual(P.notice(), null, "a clean ledger has no note");
  });
  t("points: a removed or reordered entry breaks the chain from there; a wrong balance field is just recomputed", function () {
    var w = win(), P = w.DexmPoints; P.spend("x", 100, "s1"); P.earn("x", 10, "e1"); P.earn("x", 10, "e2");
    var s = stored(w); s.entries.splice(1, 1); w.localStorage.setItem("dexm:points", JSON.stringify(s));
    P.reload(); assert.strictEqual(P.balance(), 150, "only the welcome survives"); assert.ok(P.notice());
    var w2 = win(), P2 = w2.DexmPoints; P2.earn("x", 10, "e1"); var s2 = stored(w2); s2.balance = 99999; w2.localStorage.setItem("dexm:points", JSON.stringify(s2));
    P2.reload(); assert.strictEqual(P2.balance(), 160); assert.strictEqual(P2.notice(), null, "a stale balance isn't tampering worth mentioning");
  });
  t("points: an edited carried total, missing fields or junk resets to 150 with a friendly note", function () {
    ["{nope", "42", "null", JSON.stringify({entries: "x"}), JSON.stringify({v: 1, carried: -5, rolled: [], entries: []})].forEach(function (junk) {
      var w = win({"dexm:points": junk}); assert.strictEqual(w.DexmPoints.balance(), 150, junk); assert.ok(/started you again with 150/.test(w.DexmPoints.notice()), junk);
    });
    var w = win(), P = w.DexmPoints; for (var i = 0; i < 210; i++) P.earn("x", 1, "r" + i);
    var s = stored(w); s.carried += 1000; w.localStorage.setItem("dexm:points", JSON.stringify(s)); P.reload();
    assert.strictEqual(P.balance(), 150); assert.ok(P.notice());
  });
  t("points: the ledger keeps the last 200 entries and carries the rest forward, and still verifies", function () {
    var w = win(), P = w.DexmPoints, expect = 150;
    for (var i = 0; i < 450; i++) { if (i % 3) { P.earn("x", 7, "e" + i); expect += 7; } else if (P.spend("x", 3, "s" + i).ok) expect -= 3; }
    P.earn("lorenz", 100, "lorenz:daily:" + KEY_DAY); expect += 100;
    for (var j = 0; j < 205; j++) { P.spend("x", 1); expect -= 1; }
    var s = stored(w); assert.strictEqual(s.entries.length, 200); assert.strictEqual(P.balance(), expect);
    assert.strictEqual(s.carried + s.entries.reduce(function (b, e) { return b + (e.kind === "earn" ? e.amount : -e.amount); }, 0), expect);
    P.reload(); assert.strictEqual(P.balance(), expect, "verifies after a reload"); assert.strictEqual(P.notice(), null);
    assert.ok(P.has("lorenz:daily:" + KEY_DAY), "today's daily is remembered after it rolls off"); assert.strictEqual(P.earn("lorenz", 100, "lorenz:daily:" + KEY_DAY).ok, false);
  });
  t("points: change events fire here and when another tab writes; no storage still works in memory", function () {
    var w = win(), P = w.DexmPoints, seen = [], off = P.on("change", function (b) { seen.push(b); }), ev = [];
    w.addEventListener("dexm:points", function (e) { ev.push(e.detail.balance); });
    P.earn("x", 10, "a"); P.spend("x", 5); off(); P.earn("x", 1, "b");
    assert.strictEqual(seen.join(), "160,155"); assert.strictEqual(ev.join(), "160,155,156");
    var other = stored(w); w.localStorage.setItem("dexm:points", JSON.stringify(other));
    var w2 = new jsdom.JSDOM("", {url: "https://dexmlabs.app/", runScripts: "outside-only"}).window;
    Object.defineProperty(w2, "localStorage", {get: function () { throw new Error("blocked"); }});
    w2.eval(POINTS); assert.strictEqual(w2.DexmPoints.balance(), 150); assert.ok(w2.DexmPoints.earn("x", 5, "m").ok); assert.strictEqual(w2.DexmPoints.balance(), 155);
  });

  /* ---------- header chip, popover and points page ---------- */
  t("header: every page has the points chip and the theme toggle, and loads the shared files", function () {
    ALL.forEach(function (f) {
      var d = ctx.dom(f), h = d.querySelector("header");
      var chip = h.querySelector("button[data-points-chip]"), tog = h.querySelector("button[data-theme-toggle]");
      assert.ok(chip && chip.querySelector("[data-points-balance]"), f + " chip"); assert.ok(tog && tog.getAttribute("aria-label"), f + " toggle");
      assert.ok(tog.querySelector("svg.sun") && tog.querySelector("svg.moon"), f + " sun and moon");
      var base = path.dirname(path.join(ROOT, f));
      ["dexm-ui.css", "points.js", "theme.js"].forEach(function (a) {
        var el = d.querySelector('[href$="assets/' + a + '"],[src$="assets/' + a + '"]'); assert.ok(el, f + " " + a);
        assert.ok(fs.existsSync(path.join(base, el.getAttribute("href") || el.getAttribute("src"))) || f === "404.html", f + " " + a + " resolves");
      });
      var page = chip.getAttribute("data-points-page"); assert.ok(f === "404.html" ? page === "/points/" : fs.existsSync(path.join(base, page, "index.html")), f + " points page link");
    });
  });
  t("header: the chip shows the balance and opens 'How points work'; Escape closes it and focus goes back", async function () {
    var w = win({}, read("index.html").replace(/<script[^>]*src=[^>]*><\/script>/g, ""));
    await new Promise(function (r) { setTimeout(r, 20); });
    var d = w.document, chip = d.querySelector("[data-points-chip]");
    assert.strictEqual(chip.querySelector("[data-points-balance]").textContent, "150"); assert.ok(/Points: 150/.test(chip.getAttribute("aria-label")));
    chip.click(); var pop = d.getElementById("dexm-points-pop");
    assert.ok(pop && !pop.hidden, "open"); assert.strictEqual(chip.getAttribute("aria-expanded"), "true"); assert.strictEqual(pop.getAttribute("role"), "dialog");
    assert.ok(/How points work/.test(pop.textContent) && /You have 150 points/.test(pop.textContent)); assert.strictEqual(pop.querySelector("a").getAttribute("href"), "points/");
    assert.ok(!/!(?!!)/.test(pop.textContent.replace(/!!/g, "")) && !/\s-\s|\u2013|\u2014/.test(pop.textContent), "copy rules");
    d.dispatchEvent(new w.KeyboardEvent("keydown", {key: "Escape", bubbles: true})); assert.ok(pop.hidden); assert.strictEqual(d.activeElement, chip);
    w.DexmPoints.earn("skywave", 100, "skywave:daily:x"); assert.strictEqual(chip.querySelector("[data-points-balance]").textContent, "250", "updates live");
  });
  t("points page: explains earning and spending with the real prices, and lists the ledger", async function () {
    var w = win({}, read("points/index.html").replace(/<script[^>]*src=[^>]*><\/script>/g, ""));
    await new Promise(function (r) { setTimeout(r, 20); });
    var P = w.DexmPoints, x = w.document.querySelector("main").textContent;
    [P.EARN.skywave, P.EARN.lorenz, P.EARN.lorenzHard, P.EARN.practice, P.WELCOME, P.COSTS.lorenz.check, P.COSTS.lorenz.reveal, P.COSTS.lorenz.qep, P.COSTS.lorenz.char, P.COSTS.skywave.muf, P.COSTS.skywave.scope].forEach(function (n) { assert.ok(x.indexOf(String(n)) >= 0, n); });
    assert.ok(/You have 150 points/.test(w.document.querySelector("[data-points-ledger]").textContent)); assert.ok(w.document.querySelector("[data-points-ledger] table"));
  });

  /* ---------- theme ---------- */
  var INLINE = /<script>(\(function\(\)\{var d=document\.documentElement[\s\S]*?)<\/script>/;
  t("theme: the inline theme script is the first script in <head>, before any stylesheet, on every page", function () {
    ALL.forEach(function (f) {
      var html = read(f), head = html.slice(0, html.indexOf("</head>")), m = head.match(INLINE);
      assert.ok(m, f + " has it"); var at = head.indexOf(m[0]);
      assert.ok(at < head.search(/<script(?![^>]*type="application\/ld\+json")/) + 1, f + " first script");
      assert.ok(at < head.indexOf('rel="stylesheet"'), f + " before the stylesheets");
      assert.strictEqual(m[1], ctx.dom(f).querySelector("head script").textContent, f + " the same script everywhere");
    });
  });
  t("theme: pages with a CSP allow the inline scripts by hash, not unsafe-inline", function () {
    ALL.forEach(function (f) {
      var html = read(f), meta = ctx.dom(f).querySelector('meta[http-equiv="Content-Security-Policy"]'); if (!meta) return;
      var src = meta.content.match(/script-src([^;]*)/)[1]; assert.ok(!/unsafe-inline/.test(src), f);
      [].forEach.call(ctx.dom(f).querySelectorAll("script:not([src])"), function (s) {
        if (s.type === "application/ld+json") return;
        var h = "'sha256-" + crypto.createHash("sha256").update(s.textContent).digest("base64") + "'"; assert.ok(src.indexOf(h) >= 0, f + " " + (s.type || "script"));
      });
    });
  });
  async function themed(opts) {
    var html = read("privacy/index.html").replace(/<script[^>]*src=[^>]*><\/script>/g, "");
    var w = new jsdom.JSDOM("", {url: "https://dexmlabs.app/privacy/", runScripts: "outside-only", pretendToBeVisual: true}).window;
    if (opts.stored) w.localStorage.setItem("dexm:theme", opts.stored);
    var listeners = []; w.matchMedia = function (q) { return {get matches() { return /light/.test(q) ? opts.system === "light" : false; }, addEventListener: function (e, f) { listeners.push(f); }, removeEventListener: function () {}}; };
    w.document.open(); w.document.write(html); w.document.close();
    w.eval(html.match(INLINE)[1]); var early = w.document.documentElement.getAttribute("data-theme");
    w.eval(THEME); await new Promise(function (r) { setTimeout(r, 10); }); return {w: w, early: early, flip: function (sys) { opts.system = sys; listeners.forEach(function (f) { f(); }); }};
  }
  t("theme: follows the system setting by default, before paint", async function () {
    var a = await themed({system: "light"}); assert.strictEqual(a.early, "light"); assert.strictEqual(a.w.document.documentElement.dataset.theme, "light");
    var b = await themed({system: "dark"}); assert.strictEqual(b.early, "dark");
    a.flip("dark"); assert.strictEqual(a.w.document.documentElement.dataset.theme, "dark", "follows a system change while no choice is saved");
  });
  t("theme: the toggle switches, is remembered, and wins over the system setting", async function () {
    var a = await themed({system: "dark"}), d = a.w.document, btn = d.querySelector("[data-theme-toggle]");
    assert.strictEqual(btn.getAttribute("aria-label"), "Switch to light mode");
    btn.click(); assert.strictEqual(d.documentElement.dataset.theme, "light"); assert.strictEqual(a.w.localStorage.getItem("dexm:theme"), "light");
    assert.strictEqual(btn.getAttribute("aria-label"), "Switch to dark mode"); assert.strictEqual(d.querySelector('meta[name="theme-color"]').content, "#f3f2ec");
    a.flip("dark"); assert.strictEqual(d.documentElement.dataset.theme, "light", "a saved choice beats the system");
    var b = await themed({system: "light", stored: "dark"}); assert.strictEqual(b.early, "dark");
    var c = await themed({system: "light", stored: "purple"}); assert.strictEqual(c.early, "light", "junk falls back to the system");
  });

  /* ---------- contrast ---------- */
  function hex(c) { c = c.replace("#", ""); if (c.length === 3) c = c.split("").map(function (x) { return x + x; }).join(""); return [0, 2, 4].map(function (i) { return parseInt(c.substr(i, 2), 16); }); }
  function lum(c) { return c.map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }).reduce(function (s, v, i) { return s + v * [0.2126, 0.7152, 0.0722][i]; }, 0); }
  function ratio(a, b) { var x = lum(hex(a)), y = lum(hex(b)); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  function vars(css, light) {
    var m = light ? css.match(/:root\[data-theme=light\]\{color-scheme:light;([^}]*)\}/) : css.match(/:root\{([^}]*)\}/), out = {};
    m[1].split(";").forEach(function (d) { var p = d.split(":"); if (/^--/.test(p[0])) out[p[0].slice(2)] = p.slice(1).join(":"); }); return out;
  }
  t("contrast: key colour tokens pass AA in both themes, in every stylesheet", function () {
    ["assets/site.css", "skywave/css/style.css", "lorenz/css/style.css"].forEach(function (f) {
      var css = read(f), dark = vars(css, false), light = Object.assign({}, dark, vars(css, true)); dark["acid-ink"] = dark["acid-ink"] && /^#/.test(dark["acid-ink"]) ? dark["acid-ink"] : dark.acid;
      [["dark", dark], ["light", light]].forEach(function (pair) {
        var v = pair[1], n = f + " " + pair[0] + " ";
        ["bg", "panel", "panel2"].filter(function (s) { return v[s]; }).forEach(function (s) {
          assert.ok(ratio(v.ink, v[s]) >= 7, n + "ink on " + s); assert.ok(ratio(v.muted, v[s]) >= 4.5, n + "muted on " + s + " " + ratio(v.muted, v[s]).toFixed(2));
          assert.ok(ratio(v["acid-ink"], v[s]) >= 4.5, n + "acid text on " + s + " " + ratio(v["acid-ink"], v[s]).toFixed(2));
          if (v.red) assert.ok(ratio(v.red, v[s]) >= 4.5, n + "red on " + s); if (v.amber) assert.ok(ratio(v.amber, v[s]) >= 4.5, n + "amber on " + s);
          if (!/site\.css/.test(f)) assert.ok(ratio(v.edge, v[s]) >= 3, n + "control edges on " + s + " " + ratio(v.edge, v[s]).toFixed(2));
        });
        assert.ok(ratio("#0a0b09", v.acid) >= 7, n + "dark text on the acid fill");
        if (v["stl-blue"]) assert.ok(ratio(v["stl-ink"], v["stl-blue"]) >= 4.5, n + "STL button");
        if (v.paper) assert.ok(ratio(v["paper-ink"], v.paper) >= 7, n + "tape ink on paper");
      });
      assert.ok(ratio(light["acid-ink"], "#ffffff") >= 4.5 && ratio("#d6ff00", "#ffffff") < 3, f + " acid is never text on light, the olive is");
    });
    var ui = read("assets/dexm-ui.css"), dl = ui.match(/:root\[data-theme=light\]\{([^}]*)\}/)[1];
    var get = function (s, k) { return s.match(new RegExp("--dx-" + k + ":(#[0-9a-f]{6})"))[1]; };
    assert.ok(ratio(get(dl, "accent-ink"), get(dl, "bg")) >= 4.5 && ratio(get(dl, "muted"), get(dl, "bg")) >= 4.5 && ratio(get(dl, "line"), get(dl, "bg")) >= 3, "popover, light");
  });
  t("light theme: the generated light rules are up to date with the dark rules", function () {
    var py = require("child_process").spawnSync("python3", [path.join(ROOT, "build/light.py"), "--check"], {encoding: "utf8"});
    assert.strictEqual(py.status, 0, py.stdout + py.stderr);
  });
};
