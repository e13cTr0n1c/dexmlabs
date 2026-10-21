// Site checks for the generated pages of dexmlabs.app. Run: node build/tests/run.js (needs jsdom).
var assert = require("assert"), path = require("path"), fs = require("fs"), jsdom = require("jsdom");
var ROOT = path.join(__dirname, "../..");
var pass = 0, fail = 0, queue = [];
function t(name, fn) { queue.push([name, fn]); }
function read(f) { return fs.readFileSync(path.join(ROOT, f), "utf8"); }
function dom(f) { return new jsdom.JSDOM(read(f)).window.document; }
function visible(d) { var b = d.body.cloneNode(true); [].forEach.call(b.querySelectorAll("script,style"), function (e) { e.remove(); }); return b.textContent; }
var GENERATED = ["index.html", "points/index.html", "privacy/index.html", "cookies/index.html", "terms/index.html", "disclaimer/index.html", "contact/index.html", "makes/index.html", "puzzle/index.html", "404.html"];
var NEW = "https://e13ctr0n1c.github.io/";
var TOOLS = ["cis-refund-estimator", "cis-deduction-calculator", "probate-iht-calculator", "late-payment-interest-calculator", "gift-iht-taper-checker", "vat-threshold-checker"];
var TEMPLATES = ["cis-subcontractor-tracker", "cis-contractor-tracker", "cis-mileage-lite", "cis-bundle", "probate-tracker", "gifts-iht-tracker", "freelancer-late-payment-tracker", "sales-dashboard-vat-watch"];
var MOVED = ["tools/"].concat(TOOLS.map(function (s) { return "tools/" + s + "/"; }), ["templates/"], TEMPLATES.map(function (s) { return "templates/" + s + "/"; }));
var TAX = /tools\/|templates\/|gumroad|LAUNCH25|\bCIS\b|calculator|Inheritance Tax|probate|\bVAT\b|HMRC/i;

t("homepage: games first, then makes, then support", function () {
  var d = dom("index.html");
  assert.deepStrictEqual([].map.call(d.querySelectorAll("main > section"), function (s) { return s.id || s.className; }), ["puzzle-today", "hero", "games", "makes", "hire", "support"]);
  assert.deepStrictEqual([].map.call(d.querySelectorAll("#games .game-sec"), function (s) { return s.id + ":" + s.querySelector(".sec-h").textContent; }), ["games-physics:Physics & Flight", "games-daily:Daily Puzzles", "games-labs:Labs / Beta", "games-other:Other"], "game sections in order");
  var btns = [].map.call(d.querySelectorAll("#games .btn"), function (a) { return a.getAttribute("href"); });
  assert.deepStrictEqual(btns, ["booster-landing-game/", "docking-run-game/", "helicopter-sling-load-game/", "apollo-lunar-landing-game/", "glider-thermals-game/", "skywave/", "lorenz/", "enigma-machine/", "tolerance/", "flight-path/", "repurposed/", "missions/mmx/", "callsign-catch/", "vector/", "orbit/", "flying-over-me/", "chernobyl-reactor-simulator/"]);
  assert.strictEqual(d.querySelector(".bignum").textContent, String(btns.length), "games live counter matches the cards");
  var ld = [].map.call(d.querySelectorAll('script[type="application/ld+json"]'), function (e) { return JSON.parse(e.textContent); }).filter(function (j) { return j["@type"] === "ItemList"; })[0];
  assert.deepStrictEqual(ld.itemListElement.map(function (e) { return e.url; }), btns.map(function (h) { return "https://dexmlabs.app/" + h; }), "ItemList matches the cards");
  assert.strictEqual(ld.numberOfItems, btns.length);
  var makes = [].map.call(d.querySelectorAll("#makes a"), function (a) { return a.getAttribute("href"); });
  assert.strictEqual(makes.length, 6);
  assert.ok(d.querySelector('#makes a[href="makes/"]'), "links to the 3D models gallery");
  assert.ok(/radar-scope-desk-console/.test(d.querySelector("#makes .make-hero .btn").getAttribute("href")), "Radar Scope Desk Console is the featured make");
  assert.ok(/FIRST SALE/.test(d.querySelector("#makes .make-hero").textContent), "first sale badge");
  assert.ok(makes.some(function (h) { return /cults3d\.com\/.*lorenz-cipher-chi-wheel/.test(h); }), "Lorenz STL on Cults3D");
  assert.strictEqual(makes.filter(function (h) { return /cults3d\.com/.test(h); }).length, 4, "four Cults3D links");
  assert.ok(d.querySelector('#support a[href="https://buymeacoffee.com/arthurdeusexmachina"]'), "BMC button");
});
t("makes gallery: live Cults3D models, rocket first, lazy WebP renders", function () {
  var d = dom("makes/index.html"), cards = [].slice.call(d.querySelectorAll(".mk-card"));
  assert.strictEqual(cards.length, 32, "models listed");
  var radar = [].map.call(d.querySelectorAll("#mk-radar-and-radio .mk-card"), function (c) { return c.id; });
  assert.strictEqual(radar[0], "m-radar-desk-bundle", "the bundle comes straight after the featured Radar Scope Desk Console");
  assert.ok(/radar-desk-bundle-radar-station-desk-model-and-radar-scope-desk-console-with-di$/.test(d.querySelector("#m-radar-desk-bundle .btn").getAttribute("href")));
  assert.strictEqual(dom("index.html").querySelector('#makes a[href="makes/"]').textContent, "See all 32 3D models");
  assert.strictEqual(cards[0].id, "m-moon-rocket", "the rocket cutaway leads");
  assert.ok(/FIRST SALE/.test(d.getElementById("m-radar-scope").textContent), "first sale badge kept");
  var seen = {};
  cards.forEach(function (c) {
    var href = c.querySelector(".btn").getAttribute("href");
    assert.ok(/^https:\/\/cults3d\.com\/en\/3d-model\//.test(href), c.id + " links to its Cults3D page");
    assert.ok(!seen[href], "one card per model " + href); seen[href] = 1;
    var t = c.querySelector(".card-body p").textContent;
    assert.ok(!/[\u2013\u2014]| - |\bAI\b/.test(t), c.id + " caption rules");
  });
  [].forEach.call(d.querySelectorAll("main img"), function (i) { assert.ok(/\.webp$/.test(i.getAttribute("src")) && i.getAttribute("loading") === "lazy", i.getAttribute("src")); });
  var ld = [].map.call(d.querySelectorAll('script[type="application/ld+json"]'), function (e) { return JSON.parse(e.textContent); })[0];
  assert.strictEqual(ld.mainEntity.numberOfItems, cards.length, "structured data matches the cards");
  assert.ok(/dexmlabs\.app\/makes\//.test(read("sitemap.xml")) && /dexmlabs\.app\/makes\//.test(read("llms.txt")), "sitemap and llms.txt");
});
t("the old tagline and the long name are gone everywhere, only DEXM Labs is left", function () {
  // built from parts so this file doesn't match itself
  var bad = [new RegExp(["god", "from", "the", "lab"].join("\\s+"), "i"), new RegExp(["deus", "ex", "machina", "labs"].join("\\s+"), "i")];
  var seen = 0;
  (function walk(dir) {
    fs.readdirSync(path.join(ROOT, dir), {withFileTypes: true}).forEach(function (e) {
      var rel = dir ? dir + "/" + e.name : e.name;
      if (e.isDirectory()) { if (!/^(\.git|node_modules|__pycache__)$/.test(e.name)) walk(rel); return; }
      if (!/\.(html|js|mjs|css|py|txt|xml|json|md|svg|webmanifest)$|^LICENSE$/.test(e.name)) return;
      var text = read(rel); seen++;
      bad.forEach(function (re) { assert.ok(!re.test(text), rel + " still has " + re); });
    });
  })("");
  assert.ok(seen > 40, "walked the repo");
  var d = dom("index.html");
  assert.strictEqual(d.querySelector('meta[property="og:site_name"]').content, "DEXM Labs");
  assert.ok(/^DEXM Labs/.test(d.title));
  assert.strictEqual(d.querySelector(".tagline").textContent, "Deus ex machina", "the hero line keeps the meaning of the name, nothing about god");
  assert.ok(!/\bgod\b/i.test(d.querySelector(".tagline").textContent));
});
t("Lorenz card wording", function () {
  var x = visible(dom("index.html"));
  assert.ok(x.indexOf("the Lorenz SZ40/42 cipher machine that Bletchley Park called Tunny") >= 0);
  ["index.html", "llms.txt"].forEach(function (f) { assert.ok(!/teleprinter machine|teleprinter cipher machine/i.test(read(f)), f); });
});
t("nav: home, games, makes, hire me", function () {
  GENERATED.forEach(function (f) {
    var d = dom(f), nav = [].map.call(d.querySelectorAll(".top nav a"), function (a) { return a.textContent; });
    assert.deepStrictEqual(nav, ["HOME", "GAMES", "MAKES", "HIRE ME"], f);
  });
});
t("no tax, calculator, template or Gumroad content on generated pages", function () {
  GENERATED.forEach(function (f) {
    var d = dom(f);
    [].forEach.call(d.querySelectorAll("a[href]"), function (a) { assert.ok(!/tools\/|templates\/|gumroad|e13ctr0n1c/i.test(a.getAttribute("href")), f + " link " + a.getAttribute("href")); });
    assert.ok(!TAX.test(visible(d)), f + " copy: " + (visible(d).match(TAX) || [])[0]);
    assert.ok(!/AdSense|Google-certified/i.test(read(f)), f + " no ad plans");
  });
});
t("copy rules: no '!!' promo, no dashes as punctuation", function () {
  GENERATED.concat(["llms.txt"]).forEach(function (f) {
    var x = /\.html$/.test(f) ? visible(dom(f)) : read(f);
    assert.ok(!/!!/.test(x), f + " !!");
    assert.ok(!/\s-\s|–|—/.test(x.replace(/^- /gm, "")), f + " dash");
  });
});
t("Cloudflare beacon once on every generated page, never on redirects", function () {
  var cf = /static\.cloudflareinsights\.com\/beacon\.min\.js/g;
  GENERATED.forEach(function (f) { assert.strictEqual((read(f).match(cf) || []).length, 1, f); assert.ok(/d2c23a1c7dbd41168e2a3d54c4a4dc40/.test(read(f)), f + " token"); });
  MOVED.forEach(function (u) { assert.strictEqual((read(u + "index.html").match(cf) || []).length, 0, u); });
});
t("cookies table lists every storage key, hard and realistic rows after lorenz:stats", function () {
  var keys = [].map.call(dom("cookies/index.html").querySelectorAll("tbody tr td:first-child"), function (td) { return td.textContent; });
  assert.deepStrictEqual(keys, ["skywave:settings", "skywave:round:<date>", "skywave:stats", "skywave:tutorial", "lorenz:settings", "lorenz:round:<date>", "lorenz:stats", "lorenz:difficulty", "lorenz:hard:round:<date>", "lorenz:hard:stats", "lorenz:real:round:<date>", "lorenz:real:stats", "lorenz:panels", "tolerance:round:<date>", "tolerance:stats", "flightpath:stats", "flightpath:seen", "flightpath:sound", "flightpath:size", "vector:settings", "vector:stats", "orbit:settings", "orbit:stats", "fom:tle:<group>", "forge-shift-v1", "grid:power:v2", "grid:sound", "enigma:round:<date>", "enigma:stats", "rbmk:stats", "apollo:stats", "booster:stats", "docking:stats", "glider:stats", "glider:daily", "callsign:collection", "callsign:player", "callsign:nick", "sling:stats", "sling:daily", "roadster:stats", "roadster:daily", "rocket:stats", "puzzle:stats", "puzzle:nick", "dexm:storage-note-dismissed", "dexm:points", "dexm:theme"]);
});
t("old tool and template URLs are bare redirects to the new site", function () {
  MOVED.forEach(function (u) {
    var html = read(u + "index.html"), d = new jsdom.JSDOM(html).window.document, to = NEW + u;
    assert.strictEqual(d.querySelector('meta[name="robots"]').content, "noindex", u);
    assert.strictEqual(d.querySelector('link[rel="canonical"]').href, to, u);
    assert.strictEqual(d.querySelector('meta[http-equiv="refresh"]').content, "0; url=" + to, u);
    assert.ok(html.indexOf('location.replace("' + to + '"') >= 0, u + " js");
    var links = [].map.call(d.querySelectorAll("a"), function (a) { return a.href; });
    assert.deepStrictEqual(links, [to], u + " only the target link");
    assert.ok(!/DEXM|Deus Ex|Skywave|Lorenz|stylesheet|og:/i.test(html), u + " no branding");
    var files = fs.readdirSync(path.join(ROOT, u)).filter(function (f) { return !fs.statSync(path.join(ROOT, u, f)).isDirectory(); });
    assert.deepStrictEqual(files, ["index.html"], u + " nothing else left");
  });
  assert.ok(!fs.existsSync(path.join(ROOT, "assets/templates")) && !fs.existsSync(path.join(ROOT, "assets/tool-chrome.css")), "tool and template assets gone");
});
t("sitemap and llms.txt: games, home and policies only", function () {
  var sm = read("sitemap.xml"), locs = sm.match(/<loc>[^<]*<\/loc>/g).map(function (l) { return l.slice(5, -6); });
  assert.strictEqual(locs.length, 33); // Vector, Orbit, Hire me, Callsign Catch, Flight Path and Flying Over Me are listed now
  locs.forEach(function (u) { assert.ok(/^https:\/\/dexmlabs\.app\/(|skywave\/.*|lorenz\/.*|tolerance\/|flight-path\/|enigma-machine\/|rocket-launch-game\/|apollo-lunar-landing-game\/|chernobyl-reactor-simulator\/|vector\/|orbit\/|forge\/|grid\/|repurposed\/|puzzle\/|booster-landing-game\/|glider-thermals-game\/|callsign-catch\/|docking-run-game\/|helicopter-sling-load-game\/|makes\/|hire\/|missions\/mmx\/|flying-over-me\/|(points|privacy|cookies|terms|disclaimer|contact)\/)$/.test(u), u); });
  var ll = read("llms.txt"); assert.ok(!TAX.test(ll) && /## Games/.test(ll) && /## Makes/.test(ll), "llms.txt");
  assert.ok(/Sitemap: https:\/\/dexmlabs\.app\/sitemap\.xml/.test(read("robots.txt")));
  assert.strictEqual(read("deec04819134d490fb0bce54af34ef6d.txt"), "deec04819134d490fb0bce54af34ef6d");
});
t("Roadster Thrusters is unlisted: still playable, noindex, no inbound links", function () {
  var R = "tesla-roadster-thruster-game";
  ["index.html", "sitemap.xml", "llms.txt"].forEach(function (f) { assert.ok(!/roadster|tesla/i.test(read(f)), f); });
  var d = dom(R + "/index.html");
  assert.ok(/noindex/.test(d.querySelector('meta[name="robots"]').getAttribute("content")));
  assert.ok(!d.querySelector('meta[http-equiv="refresh"]') && d.querySelector("canvas, #game, main"), "the game itself is still there");
  assert.ok(fs.existsSync(path.join(ROOT, R + "/js/main.js")), "game code kept");
  (function walk(dir) {
    fs.readdirSync(path.join(ROOT, dir)).forEach(function (f) {
      var rel = dir ? dir + "/" + f : f;
      if (/^(\.git|node_modules|build|tesla-roadster-thruster-game)$/.test(f)) return;
      if (fs.statSync(path.join(ROOT, rel)).isDirectory()) return walk(rel);
      if (/\.(html|xml|txt|js|json|md)$/.test(f)) assert.ok(!/href=["'][^"']*tesla-roadster-thruster-game/.test(read(rel)), rel + " links to Roadster");
    });
  })("");
});
var GAME_PAGES = ["apollo-lunar-landing-game", "booster-landing-game", "callsign-catch", "chernobyl-reactor-simulator", "docking-run-game", "enigma-machine", "flying-over-me", "forge", "glider-thermals-game", "grid", "helicopter-sling-load-game", "lorenz", "mars-base-game", "missions/mmx", "orbit", "play-test-8179d030/game", "puzzle", "repurposed", "rocket-launch-game", "skywave", "tesla-roadster-thruster-game", "tolerance", "vector"];
t("every game page has the home bar: its own name on the left, a keyboard link to dexmlabs.app", function () {
  GAME_PAGES.forEach(function (g) {
    var f = g + "/index.html", d = dom(f), bar = d.body.firstElementChild;
    if (bar && /\bskip/.test(bar.className)) bar = bar.nextElementSibling;
    assert.ok(bar && bar.classList.contains("dexm-homebar") && bar.tagName === "NAV", f + " bar is first in the body, after any skip link");
    var a = bar.querySelector('a[href="https://dexmlabs.app/"]');
    assert.ok(a && a.textContent === "dexmlabs.app" && !a.hasAttribute("tabindex"), f + " home link");
    assert.ok(bar.querySelector(".dexm-homebar-game").textContent.trim(), f + " game name");
    assert.strictEqual(d.querySelectorAll(".dexm-homebar").length, 1, f);
    assert.ok(d.querySelector('link[rel="stylesheet"][href$="assets/homebar.css"]'), f + " stylesheet");
  });
  var css = read("assets/homebar.css");
  assert.ok(/\.dexm-homebar\{[^}]*height:32px[^}]*white-space:nowrap/.test(css), "slim, one line");
  assert.ok(/\.dexm-homebar a:focus-visible\{outline:3px/.test(css), "visible focus");
  assert.ok(/:fullscreen \.dexm-homebar/.test(css), "hidden in fullscreen");
});
function home(hash) {
  var html = read("index.html").replace(/<script src="assets\/games-collapse\.js"><\/script>/, "<script>" + read("assets/games-collapse.js") + "</script>");
  var w = new jsdom.JSDOM(html, { runScripts: "dangerously", url: "https://dexmlabs.app/" + (hash || ""), pretendToBeVisual: true, beforeParse: function (w) { w.Element.prototype.scrollIntoView = function () { w.__scrolled = this.id; }; } }).window;
  return w;
}
function key(w, el, k) { var e = new w.KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }); el.dispatchEvent(e); return e; }
var SECS = ["games-physics", "games-daily", "games-labs", "games-other"];
t("game categories: real buttons, open in the HTML so no JS hides nothing", function () {
  var d = dom("index.html");
  SECS.forEach(function (id) {
    var sec = d.getElementById(id), b = sec.querySelector("button.sec-toggle"), g = d.getElementById(b.getAttribute("aria-controls"));
    assert.ok(b && b.getAttribute("type") === "button", id + " button");
    assert.strictEqual(b.getAttribute("aria-expanded"), "true", id + " open without JS");
    assert.ok(g && sec.contains(g) && !g.hidden && g.querySelector(".card"), id + " grid");
    assert.ok(/\d+ GAMES?/.test(b.querySelector(".sec-count").textContent) && b.querySelector(".label.acid").textContent && b.querySelector(".sec-chev"), id + " header parts");
  });
  assert.ok(/\.game-sec \.grid\[hidden\]\{display:none\}/.test(read("assets/site.css")), "hidden grid really hides");
  assert.ok(/\.sec-toggle:focus-visible\{outline:3px solid/.test(read("assets/site.css")), "visible focus");
  assert.ok(!d.querySelector("#puzzle-today[hidden], #puzzle-today .grid[hidden], #makes [hidden]"), "puzzle card and makes never hidden");
});
t("game categories: closed with JS, click and keyboard toggle", function () {
  var w = home(), d = w.document;
  SECS.forEach(function (id) {
    var b = d.querySelector("#" + id + " .sec-toggle"), g = d.getElementById(b.getAttribute("aria-controls"));
    assert.strictEqual(b.getAttribute("aria-expanded"), "false", id); assert.ok(g.hidden, id + " hidden");
  });
  assert.ok(d.querySelector("[data-puzzle-card]") && !d.querySelector("#puzzle-today").closest("[hidden]"), "Today's Puzzle visible");
  assert.ok(!d.querySelector("#makes").closest("[hidden]") && !d.querySelector("#makes [hidden]"), "Makes visible");
  var b = d.querySelector("#games-daily .sec-toggle"), g = d.getElementById("games-daily-grid");
  b.click(); assert.ok(!g.hidden && b.getAttribute("aria-expanded") === "true", "click opens");
  b.click(); assert.ok(g.hidden && b.getAttribute("aria-expanded") === "false", "click closes");
  assert.ok(key(w, b, "Enter").defaultPrevented); assert.ok(!g.hidden, "Enter opens");
  key(w, b, " "); assert.ok(g.hidden, "Space closes");
  key(w, b, "Tab"); assert.ok(g.hidden, "other keys do nothing");
  var ld = [].map.call(d.querySelectorAll('script[type="application/ld+json"]'), function (e) { return JSON.parse(e.textContent); }).filter(function (j) { return j["@type"] === "ItemList"; })[0];
  assert.strictEqual(ld.itemListElement.length, d.querySelectorAll("#games .btn").length, "ItemList still lists every game");
  assert.strictEqual(d.querySelector(".bignum").textContent, String(ld.itemListElement.length));
});
t("game categories: a URL hash opens and scrolls to its category, also on hashchange", function () {
  var w = home("#games-labs"), d = w.document;
  assert.ok(!d.getElementById("games-labs-grid").hidden && d.getElementById("games-physics-grid").hidden);
  assert.strictEqual(w.__scrolled, "games-labs");
  w.location.hash = "#games-other"; w.dispatchEvent(new w.HashChangeEvent("hashchange"));
  assert.ok(!d.getElementById("games-other-grid").hidden, "hashchange opens");
  assert.strictEqual(w.__scrolled, "games-other");
  var w2 = home("#games"); assert.ok(w2.document.getElementById("games-physics-grid").hidden, "#games alone opens nothing");
});
t("internal links on generated pages resolve", function () {
  GENERATED.filter(function (f) { return f !== "404.html"; }).forEach(function (f) {
    var d = dom(f), base = path.dirname(path.join(ROOT, f));
    [].forEach.call(d.querySelectorAll("a[href],img[src],link[href],script[src]"), function (e) {
      var h = (e.getAttribute("href") || e.getAttribute("src")).split("#")[0];
      if (!h || /^(https?:|mailto:)/.test(h)) return;
      var p = path.join(base, h); if (h.slice(-1) === "/" || h === "") p = path.join(p, "index.html");
      assert.ok(fs.existsSync(p), f + " -> " + h);
    });
  });
});
t("game pages carry no links to the moved pages", function () {
  ["skywave", "lorenz"].forEach(function (dir) {
    fs.readdirSync(path.join(ROOT, dir)).filter(function (f) { return /\.html$/.test(f); }).forEach(function (f) {
      assert.ok(!/href="[^"]*(tools\/|templates\/|gumroad)/i.test(read(dir + "/" + f)), dir + "/" + f);
    });
  });
});
t("new game signup: one config constant, plain form, hidden while placeholder", function () {
  var gen = [0, 1, 2, 3].map(function (i) { return read("build/gen-src/" + i + ".py"); }).join("");
  assert.strictEqual((gen.match(/^BUTTONDOWN_USER=/mg) || []).length, 1);
  var user = /^BUTTONDOWN_USER='([^']+)'/m.exec(gen)[1];
  ["index.html", "skywave/index.html", "lorenz/index.html"].forEach(function (f) {
    var html = read(f), d = dom(f);
    assert.strictEqual((html.match(/data-signup/g) || []).length, 1, f);
    var box = d.querySelector(".dexm-signup"), form = box.querySelector("form"), input = form.querySelector("input[type=email]");
    assert.strictEqual(form.getAttribute("action"), "https://buttondown.com/api/emails/embed-subscribe/" + user, f);
    assert.strictEqual(form.getAttribute("method"), "post");
    assert.strictEqual(form.getAttribute("target"), "_blank");
    assert.strictEqual(input.getAttribute("name"), "email");
    assert.ok(input.required && d.querySelector('label[for="' + input.id + '"]'), f + " label");
    assert.strictEqual(box.hasAttribute("hidden"), user === "BUTTONDOWN_USER_TBD", f + " hidden");
    assert.ok(/One email when a new game is out\. Nothing else\./.test(box.textContent));
    assert.ok(/You confirm by email first\. Unsubscribe any time\. Your address is held by Buttondown, never sold\./.test(box.textContent));
    assert.ok(!box.querySelector("script,img,iframe"), f + " no script or pixel");
    assert.ok(!/buttondown\.com\/[^"]*\.js|<img[^>]+buttondown/.test(html), f);
  });
  assert.ok(/Buttondown[^<]*processor|processor[^<]*Buttondown/.test(read("privacy/index.html")) || /Buttondown, which runs the list for me as my processor/.test(read("privacy/index.html")));
  var css = read("assets/dexm-ui.css");
  assert.ok(/\.dexm-signup-row input\{[^}]*min-height:44px/.test(css) && /button\[type=submit\]\{[^}]*min-height:44px/.test(css));
  assert.ok(!/[\u2013\u2014]/.test(css.slice(css.indexOf(".dexm-signup"))) );
});
require("./puzzle.js")(t, {ROOT: ROOT, read: read, dom: dom});
require("./points-theme.js")(t, {ROOT: ROOT, read: read, dom: dom, GENERATED: GENERATED});
(async function () {
  for (var i = 0; i < queue.length; i++) {
    var name = queue[i][0];
    try { await queue[i][1](); pass++; console.log("ok   " + name); } catch (e) { fail++; console.log("FAIL " + name + "\n  " + String(e && e.message || e).split("\n").slice(0, 6).join(" ")); }
  }
  console.log(pass + " passed, " + fail + " failed");
  process.exit(fail ? 1 : 0);
})();
