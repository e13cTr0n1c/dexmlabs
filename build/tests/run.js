// Site checks for the generated pages of dexmlabs.app. Run: node build/tests/run.js (needs jsdom).
var assert = require("assert"), path = require("path"), fs = require("fs"), jsdom = require("jsdom");
var ROOT = path.join(__dirname, "../..");
var pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; console.log("ok   " + name); } catch (e) { fail++; console.log("FAIL " + name + "\n  " + e.message.split("\n")[0]); } }
function read(f) { return fs.readFileSync(path.join(ROOT, f), "utf8"); }
function dom(f) { return new jsdom.JSDOM(read(f)).window.document; }
function visible(d) { var b = d.body.cloneNode(true); [].forEach.call(b.querySelectorAll("script,style"), function (e) { e.remove(); }); return b.textContent; }
var GENERATED = ["index.html", "privacy/index.html", "cookies/index.html", "terms/index.html", "disclaimer/index.html", "contact/index.html", "404.html"];
var NEW = "https://e13ctr0n1c.github.io/";
var TOOLS = ["cis-refund-estimator", "cis-deduction-calculator", "probate-iht-calculator", "late-payment-interest-calculator", "gift-iht-taper-checker", "vat-threshold-checker"];
var TEMPLATES = ["cis-subcontractor-tracker", "cis-contractor-tracker", "cis-mileage-lite", "cis-bundle", "probate-tracker", "gifts-iht-tracker", "freelancer-late-payment-tracker", "sales-dashboard-vat-watch"];
var MOVED = ["tools/"].concat(TOOLS.map(function (s) { return "tools/" + s + "/"; }), ["templates/"], TEMPLATES.map(function (s) { return "templates/" + s + "/"; }));
var TAX = /tools\/|templates\/|gumroad|LAUNCH25|\bCIS\b|calculator|Inheritance Tax|probate|\bVAT\b|HMRC/i;

t("homepage: games first, then makes, then support", function () {
  var d = dom("index.html");
  assert.deepStrictEqual([].map.call(d.querySelectorAll("main > section"), function (s) { return s.id || s.className; }), ["hero", "games", "makes", "support"]);
  assert.deepStrictEqual([].map.call(d.querySelectorAll("#games .btn"), function (a) { return a.getAttribute("href"); }), ["skywave/", "lorenz/"]);
  var makes = [].map.call(d.querySelectorAll("#makes a"), function (a) { return a.getAttribute("href"); });
  assert.strictEqual(makes.length, 4);
  assert.ok(makes.some(function (h) { return /cults3d\.com\/.*lorenz-cipher-chi-wheel/.test(h); }), "Lorenz STL on Cults3D");
  assert.strictEqual(makes.filter(function (h) { return /cults3d\.com/.test(h); }).length, 3, "three Cults3D links");
  assert.ok(d.querySelector('#support a[href="https://buymeacoffee.com/arthurdeusexmachina"]'), "BMC button");
});
t("Lorenz card wording", function () {
  var x = visible(dom("index.html"));
  assert.ok(x.indexOf("the Lorenz SZ40/42 cipher machine that Bletchley Park called Tunny") >= 0);
  ["index.html", "llms.txt"].forEach(function (f) { assert.ok(!/teleprinter machine|teleprinter cipher machine/i.test(read(f)), f); });
});
t("nav: home, games, makes", function () {
  GENERATED.forEach(function (f) {
    var d = dom(f), nav = [].map.call(d.querySelectorAll(".top nav a"), function (a) { return a.textContent; });
    assert.deepStrictEqual(nav, ["HOME", "GAMES", "MAKES"], f);
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
t("cookies table lists every storage key, hard mode rows after lorenz:stats", function () {
  var keys = [].map.call(dom("cookies/index.html").querySelectorAll("tbody tr td:first-child"), function (td) { return td.textContent; });
  assert.deepStrictEqual(keys, ["skywave:settings", "skywave:round:<date>", "skywave:stats", "skywave:tutorial", "lorenz:settings", "lorenz:round:<date>", "lorenz:stats", "lorenz:difficulty", "lorenz:hard:round:<date>", "lorenz:hard:stats", "dexm:storage-note-dismissed"]);
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
  assert.strictEqual(locs.length, 14);
  locs.forEach(function (u) { assert.ok(/^https:\/\/dexmlabs\.app\/(|skywave\/.*|lorenz\/.*|(privacy|cookies|terms|disclaimer|contact)\/)$/.test(u), u); });
  var ll = read("llms.txt"); assert.ok(!TAX.test(ll) && /## Games/.test(ll) && /## Makes/.test(ll), "llms.txt");
  assert.ok(/Sitemap: https:\/\/dexmlabs\.app\/sitemap\.xml/.test(read("robots.txt")));
  assert.strictEqual(read("deec04819134d490fb0bce54af34ef6d.txt"), "deec04819134d490fb0bce54af34ef6d");
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
console.log(pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
