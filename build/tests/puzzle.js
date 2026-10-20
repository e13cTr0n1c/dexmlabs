// Today's Puzzle checks. Plain answers are never in the repo: the answer checks decode the cipher days with the JS
// machine, and use the private answers file (PUZZLE_PLAIN, default /workspace/dexm-puzzle-worker/answers-plain.json) when it is there.
var assert = require("assert"), path = require("path"), fs = require("fs"), crypto = require("crypto"), jsdom = require("jsdom");
module.exports = function (t, o) {
  var ROOT = o.ROOT, read = o.read;
  var P = require(path.join(ROOT, "assets/puzzle.js"));
  var LIST = JSON.parse(read("build/puzzles.json")), PUB = JSON.parse(read("puzzle/puzzles.json"));
  var PLAIN_F = process.env.PUZZLE_PLAIN || "/workspace/dexm-puzzle-worker/answers-plain.json";
  var PLAIN = fs.existsSync(PLAIN_F) ? JSON.parse(fs.readFileSync(PLAIN_F, "utf8")) : null;
  var REF = "/workspace/digital-assets/rotor-cipher-demonstrator/reference.py";
  function h(s) { return crypto.createHash("sha256").update(P.norm(s)).digest("hex"); }
  function decode(p) { return new P.Machine(p.rings, p.start).run(p.cipher).toLowerCase(); }

  t("puzzle: the JS rotor machine matches the reference test vectors", function () {
    var V = [["AAA", "AAA", "AAAAA", "BDZGO"], ["AAA", "ADU", "AAAA", "EQIB"], ["BBB", "AAA", "AAAAA", "EWTYX"], ["AAA", "AAA", "HELLOWORLD", "ILBDAAMTAZ"]];
    if (fs.existsSync(REF)) {
      var src = fs.readFileSync(REF, "utf8"), m, re = /\('([A-Z]{3})', '([A-Z]{3})', '([A-Z]+)', '([A-Z]+)'/g, got = [];
      while ((m = re.exec(src))) got.push([m[1], m[2], m[3], m[4]]);
      assert.deepStrictEqual(got, V, "vectors read from reference.py");
    }
    V.forEach(function (v) {
      assert.strictEqual(new P.Machine(v[0], v[1]).run(v[2]), v[3], v.join(" "));
      assert.strictEqual(new P.Machine(v[0], v[1]).run(v[3]), v[2], "reciprocal " + v.join(" "));
    });
    var m2 = new P.Machine("AAA", "ADU"), seen = [];
    for (var i = 0; i < 4; i++) { m2.press(); seen.push(m2.window()); }
    assert.deepStrictEqual(seen, ["ADV", "AEW", "BFX", "BFY"], "double step");
  });
  t("puzzle: at least 21 days from 21 Oct 2026, one per date, every one with a hash, types rotate", function () {
    assert.ok(LIST.length >= 21);
    assert.strictEqual(LIST[0].date, "2026-10-21");
    var types = ["cipher", "morse", "aviation", "physics"];
    LIST.forEach(function (p, i) {
      var d = new Date(Date.UTC(2026, 9, 21 + i)).toISOString().slice(0, 10);
      assert.strictEqual(p.date, d, "consecutive dates");
      assert.ok(/^[0-9a-f]{64}$/.test(p.hash), p.id + " hash");
      if (i < 24) assert.strictEqual(p.type, types[i % 4], p.id + " rotation");
      if (p.type === "cipher") assert.ok(p.cipher && p.rings && p.start, p.id);
      if (p.type === "morse") assert.ok(/^[.\- \/]+$/.test(p.morse), p.id);
    });
    assert.deepStrictEqual(PUB, LIST, "the public copy matches build/puzzles.json");
  });
  t("puzzle: correct answers match, wrong ones don't", function () {
    LIST.filter(function (p) { return p.type === "cipher"; }).forEach(function (p) {
      var w = decode(p);
      assert.strictEqual(h(w), p.hash, p.id + " cipher decodes to the answer");
      assert.strictEqual(h("  " + w.toUpperCase() + " "), p.hash, p.id + " trimmed and lower cased");
      assert.notStrictEqual(h(w + "x"), p.hash); assert.notStrictEqual(h(p.cipher), p.hash);
    });
    if (PLAIN) LIST.forEach(function (p) {
      assert.strictEqual(h(PLAIN[p.date]), p.hash, p.id + " private answer");
      assert.notStrictEqual(h("wrong"), p.hash);
    });
  });
  t("puzzle: no plain answers in public files", function () {
    var answers = LIST.filter(function (p) { return p.type === "cipher"; }).map(decode);
    if (PLAIN) answers = answers.concat(Object.keys(PLAIN).map(function (k) { return PLAIN[k]; }));
    var files = ["build/puzzles.json", "puzzle/puzzles.json", "puzzle/index.html", "assets/puzzle.js", "build/PUZZLES.md", "build/tests/puzzle.js"];
    files.forEach(function (f) {
      var x = read(f).replace(/[0-9a-f]{64}/g, "");
      answers.forEach(function (a) { assert.ok(!new RegExp("(^|[^a-z0-9])" + a + "([^a-z0-9]|$)", "i").test(x), f + " gives away an answer"); });
    });
    LIST.forEach(function (p) { assert.ok(!("answer" in p), p.id); });
    var cs = /data-cipher-set="([^"]+)"/.exec(read("puzzle/index.html"))[1];
    assert.ok(/^https:\/\/cults3d\.com\/en\/3d-model\/.*cipher-set/.test(cs), "Cipher Set link from makes_data.py");
    assert.ok(!/gumroad/i.test(read("puzzle/index.html") + read("assets/puzzle.js")), "no Gumroad on the puzzle page");
  });

  function run(d, opts) {
    var html = read("puzzle/index.html").replace(/<script[^>]*src="[^"]*(cloudflareinsights|points|support|theme|storage-note)[^"]*"[^>]*><\/script>/g, "");
    var src = read("assets/puzzle.js");
    if (opts.offline) src = src.replace(/var PUZZLE_API = '[^']*';/, "var PUZZLE_API = '';");
    html = html.replace('<script src="../assets/puzzle.js" defer></script>', "");
    var w = new jsdom.JSDOM(html, {url: "https://dexmlabs.app/puzzle/?d=" + d, runScripts: "outside-only"}).window;
    var calls = [];
    Object.defineProperty(w, "crypto", {value: crypto.webcrypto});
    w.TextEncoder = TextEncoder;
    w.fetch = function (u) {
      calls.push(String(u));
      if (/puzzles\.json/.test(u)) return Promise.resolve({ok: true, json: function () { return Promise.resolve(PUB); }});
      return Promise.reject(new Error("network down"));
    };
    w.eval(src);
    return {w: w, d: w.document, calls: calls};
  }
  function tick(ms) { return new Promise(function (r) { setTimeout(r, ms || 60); }); }
  async function play(env, guess) {
    env.d.getElementById("pz-answer").value = guess;
    env.d.querySelector("[data-pz-form]").dispatchEvent(new env.w.Event("submit", {cancelable: true}));
    await tick(80);
  }
  t("puzzle: offline mode solves fully, with no counter, top 10 or network", async function () {
    var p = LIST[0], env = run(p.date, {offline: true}); await tick();
    assert.ok(/WTTOQ|[A-Z]{5}/.test(env.d.querySelector(".pz-code").textContent));
    await play(env, "nope");
    assert.ok(/Not that/.test(env.d.querySelector("[data-pz-msg]").textContent));
    await play(env, " " + decode(p).toUpperCase() + " ");
    assert.ok(/Correct/.test(env.d.querySelector("[data-pz-msg]").textContent));
    assert.ok(!env.d.querySelector("[data-pz-result]").hidden, "result shown");
    var share = env.d.querySelector("[data-pz-share]").textContent;
    assert.ok(/2 tries/.test(share) && /\u2B1B\uD83D\uDFE9/.test(share), share);
    assert.ok(share.toLowerCase().indexOf(decode(p)) < 0 && share.indexOf(p.cipher) < 0, "share card has no spoilers");
    assert.ok(env.d.querySelector("[data-pz-board]").hidden, "top 10 hidden");
    assert.ok(env.d.querySelector("[data-pz-nickrow]").hidden, "no send time form offline");
    assert.ok(!env.d.querySelector("[data-pz-upsell]").hidden, "Cipher Set link on a cipher day");
    assert.deepStrictEqual(env.calls.filter(function (u) { return !/puzzles\.json/.test(u); }), [], "no API calls");
    var s = JSON.parse(env.w.localStorage.getItem("puzzle:stats"));
    assert.strictEqual(s.points, 40); assert.strictEqual(s.streak, 1); assert.ok(s.history[p.date].ok);
  });
  t("puzzle: if the counter API fails the page still works and hides the board; no Cipher Set link on other days", async function () {
    var p = LIST[1], env = run(p.date, {}); await tick();
    assert.ok(env.calls.some(function (u) { return /\/api\/today\?d=2026-10-22$/.test(u); }), "asked the counter");
    assert.ok(env.d.querySelector("[data-pz-board]").hidden, "board hidden on error");
    await play(env, "wrong");
    assert.ok(/Not that/.test(env.d.querySelector("[data-pz-msg]").textContent));
    if (PLAIN) {
      await play(env, PLAIN[p.date]);
      assert.ok(!env.d.querySelector("[data-pz-result]").hidden);
      assert.ok(env.d.querySelector("[data-pz-upsell]").hidden, "Cipher Set link only on cipher days");
    }
  });
  t("puzzle: API base is one constant, sitemap, llms.txt, structured data and homepage card", function () {
    assert.strictEqual((read("assets/puzzle.js").match(/PUZZLE_API = '/g) || []).length, 1);
    assert.ok(/<loc>https:\/\/dexmlabs\.app\/puzzle\/<\/loc>/.test(read("sitemap.xml")));
    assert.ok(/\(https:\/\/dexmlabs\.app\/puzzle\/\)/.test(read("llms.txt")));
    var d = o.dom("puzzle/index.html");
    var ld = [].map.call(d.querySelectorAll('script[type="application/ld+json"]'), function (e) { return JSON.parse(e.textContent); });
    assert.ok(ld.some(function (j) { return j.url === "https://dexmlabs.app/puzzle/"; }));
    var home = o.dom("index.html"), c = home.querySelector("main > section:first-child [data-puzzle-card]");
    assert.ok(c && c.querySelector('a[href="puzzle/"]'), "featured card at the top links to /puzzle/");
    assert.ok(!/gumroad/i.test(c.innerHTML));
  });
};
