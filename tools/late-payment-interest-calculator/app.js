(function () {
  "use strict";
  var L = window.LatePay, $ = function (id) { return document.getElementById(id); };
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function today() { var d = new Date(); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function gbp(n) { return "£" + Number(n).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function pct(n) { return Number(n).toFixed(2).replace(/\.?0+$/, "") + "%"; }
  function set(id, t) { $(id).textContent = t; }
  var form = $("lp-form");
  if (!$("paid").value) $("paid").value = today();
  function mode() { return form.querySelector('input[name="mode"]:checked').value; }
  function sync() {
    var due = mode() === "due";
    $("due-fields").hidden = !due; $("inv-fields").hidden = due;
  }
  function run() {
    sync();
    var input = { amount: $("amount").value, paidDate: $("paid").value || today() };
    if (mode() === "due") input.dueDate = $("due").value; else { input.invoiceDate = $("invdate").value; input.termsDays = $("terms").value; }
    var r = $("amount").value === "" ? { error: "Enter the invoice amount and dates to see what you can claim." } : L.calculate(input);
    var out = $("out-rows"), msg = $("out-msg");
    if (r.error) {
      out.hidden = true; msg.hidden = false; msg.textContent = r.error;
      set("out-headline", "£0.00"); set("out-headline-sub", ""); return;
    }
    out.hidden = false;
    set("out-due", r.dueNice);
    set("out-paid", r.paidNice);
    set("out-days", r.daysLate + (r.daysLate === 1 ? " day" : " days"));
    if (!r.late) {
      msg.hidden = false;
      msg.textContent = "Not late: it was paid (or today is) on or before the due date of " + r.dueNice + ". Nothing to claim yet.";
      ["out-rate", "out-daily", "out-interest", "out-comp", "out-total", "out-grand"].forEach(function (id) { set(id, "–"); });
      set("out-headline", "£0.00"); set("out-headline-sub", "Not late yet");
      return;
    }
    msg.hidden = true;
    var ri = r.rateInfo;
    set("out-rate", pct(r.rate) + " a year (8% + " + pct(ri.base) + " base rate on " + ri.refNice + ")");
    set("out-daily", gbp(r.daily));
    set("out-interest", gbp(r.interest));
    set("out-comp", gbp(r.compensation));
    set("out-total", gbp(r.total));
    set("out-grand", gbp(r.grandTotal));
    set("out-headline", gbp(r.total));
    set("out-headline-sub", "Interest " + gbp(r.interest) + " + compensation " + gbp(r.compensation) + ", on top of the " + gbp(r.amount) + " invoice. Interest runs from " + r.interestStartNice + ".");
  }
  form.addEventListener("input", run);
  form.addEventListener("change", run);
  form.addEventListener("submit", function (e) { e.preventDefault(); run(); });
  run();
})();
