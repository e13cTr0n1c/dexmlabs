/* Homepage game categories: closed by default, one button each. The HTML ships them open, so with no JS nothing is hidden. */
(function () {
  var secs = [].slice.call(document.querySelectorAll("#games .game-sec"));
  function parts(sec) { var b = sec.querySelector(".sec-toggle"); return { b: b, g: document.getElementById(b.getAttribute("aria-controls")) }; }
  function set(sec, open) { var p = parts(sec); p.b.setAttribute("aria-expanded", open ? "true" : "false"); p.g.hidden = !open; sec.classList.toggle("open", open); }
  function fromHash(scroll) {
    var id = decodeURIComponent((location.hash || "").slice(1)); if (!id) return;
    var el = document.getElementById(id), sec = el && el.closest ? el.closest("#games .game-sec") : null;
    if (!sec) return;
    set(sec, true);
    if (scroll) sec.scrollIntoView({ block: "start" });
  }
  secs.forEach(function (sec) {
    var b = parts(sec).b;
    set(sec, false);
    b.addEventListener("click", function () { set(sec, b.getAttribute("aria-expanded") !== "true"); });
    b.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") { e.preventDefault(); b.click(); }
    });
  });
  document.documentElement.classList.add("games-js");
  fromHash(true);
  window.addEventListener("hashchange", function () { fromHash(true); });
})();
