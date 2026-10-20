/* Scroll reveal for the homepage and /hire/, the same approach as /cv/: IntersectionObserver adds .in once,
   CSS fades and lifts with opacity and transform only. Skipped entirely for reduced motion or without IntersectionObserver,
   so content is never hidden. Cards in a closed game category are revealed when the category opens. */
(function () {
  if (!("IntersectionObserver" in window)) return;
  var mq = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)");
  if (mq && mq.matches) return;
  var sel = "main .sec-head, main .sec-lead, main .card, main .game-sec .sec-title, main .support a, main .hire-item, main .hero .plate, main .hero .warn, main .hire-cta, main .mk-more, main .hire-h, main .hire > section:first-child .label, main .dexm-signup";
  var els = [].slice.call(document.querySelectorAll(sel));
  var vh = window.innerHeight || 800;
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { rootMargin: "0px 0px -8% 0px" });
  els.forEach(function (el) {
    var r = el.getBoundingClientRect();
    if (r.top < vh && r.bottom > 0 && !el.closest("[hidden]")) return; /* already on screen: leave it be, no flash */
    el.classList.add("rv");
    var sib = el.parentNode ? [].indexOf.call(el.parentNode.children, el) : 0;
    if (/card|support|hire-item/.test(el.className) || el.parentNode.classList.contains("support")) el.style.setProperty("--rv-d", Math.min(sib, 5) * 0.07 + "s");
    io.observe(el);
  });
  document.documentElement.classList.add("rv-on");
  if (mq && mq.addEventListener) mq.addEventListener("change", function (e) { if (e.matches) els.forEach(function (el) { el.classList.add("in"); }); });
})();
