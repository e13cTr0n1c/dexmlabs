(function () {
  "use strict";
  var T = window.Taper, $ = function (id) { return document.getElementById(id); };
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function today() { var d = new Date(); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function gbp(n) { return "£" + Number(n).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function set(id, t) { $(id).textContent = t; }
  var form = $("tp-form");
  if (!$("death").value) $("death").value = today();
  function run() {
    var r = ($("giftdate").value === "" || $("value").value === "") ? { error: "Enter the gift date and value to see where it stands." }
      : T.calculate({ giftDate: $("giftdate").value, value: $("value").value, deathDate: $("death").value || today(), nrb: $("nrb").value });
    var out = $("out-rows"), msg = $("out-msg"), hl = $("headline");
    if (r.error) { out.hidden = true; msg.textContent = r.error; set("out-headline", "–"); set("out-headline-sub", ""); hl.className = "headline none"; return; }
    out.hidden = false;
    set("out-elapsed", r.years + (r.years === 1 ? " year" : " years") + " and " + r.days + (r.days === 1 ? " day" : " days"));
    set("out-band", r.band);
    set("out-rate", r.rate + "%");
    set("out-over", gbp(r.over));
    set("out-tax", gbp(r.tax));
    set("out-saving", r.taperSaving > 0 ? gbp(r.taperSaving) + " less than at 40%" : "–");
    set("out-exempt", r.exemptNice);
    set("out-next", r.next ? (r.next.rate === 0 ? "Exempt from " + r.next.nice : "Drops to " + r.next.rate + "% from " + r.next.nice) : "–");
    if (r.exempt) {
      hl.className = "headline refund"; set("out-headline", "Exempt");
      set("out-headline-sub", "7 years had passed by " + r.deathNice + ", so no Inheritance Tax is due on this gift and it no longer uses the nil-rate band.");
      msg.textContent = "";
    } else if (r.withinNrb) {
      hl.className = "headline none"; set("out-headline", gbp(0));
      set("out-headline-sub", "The gift fits inside the " + gbp(r.nrb) + " nil-rate band, so there is no tax on it and taper relief doesn't matter. It still uses up that much of the band, which leaves less for the estate.");
      msg.textContent = "";
    } else {
      hl.className = "headline owed"; set("out-headline", gbp(r.tax));
      set("out-headline-sub", r.rate + "% on the " + gbp(r.over) + " above the nil-rate band, if death were on " + r.deathNice + ".");
      msg.textContent = r.rate < 40 ? "Taper relief cuts the tax on the gift from " + gbp(r.fullTax) + " to " + gbp(r.tax) + ". The value of the gift doesn't change." : "Under 3 years: the full 40% applies to the part above the nil-rate band.";
    }
  }
  form.addEventListener("input", run);
  form.addEventListener("change", run);
  form.addEventListener("submit", function (e) { e.preventDefault(); run(); });
  run();
})();
