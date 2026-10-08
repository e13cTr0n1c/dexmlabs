(function () {
  "use strict";
  var V = window.VatCheck, $ = function (id) { return document.getElementById(id); };
  var MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  var now = new Date();
  function today() { return now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate()); }
  function gbp(n) { return (n < 0 ? "−£" : "£") + Math.abs(Number(n)).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function set(id, t) { $(id).textContent = t; }
  var form = $("vat-form"), sel = $("start");
  // start-month options: the last 47 months; default = the 12 complete months before this one
  for (var k = 47; k >= 1; k--) {
    var d = new Date(now.getFullYear(), now.getMonth() - k, 1), o = document.createElement("option");
    o.value = d.getFullYear() + "-" + pad(d.getMonth() + 1); o.textContent = MONTHS[d.getMonth()] + " " + d.getFullYear();
    if (k === 12) o.selected = true;
    sel.appendChild(o);
  }
  if (!$("n30start").value) $("n30start").value = today();
  function labels() {
    var p = sel.value.split("-"), y = +p[0], m = +p[1] - 1;
    for (var i = 0; i < 12; i++) { var dd = new Date(y, m + i, 1); $("ml" + i).textContent = MONTHS[dd.getMonth()] + " " + dd.getFullYear(); }
  }
  function run() {
    labels();
    var months = []; for (var i = 0; i < 12; i++) months.push($("m" + i).value);
    var r = V.calculate({ startMonth: sel.value, months: months, next30: $("n30").value, next30Start: $("n30start").value || today() });
    var out = $("out-rows"), msg = $("out-msg"), hl = $("headline"), tb = $("roll-rows");
    tb.innerHTML = "";
    if (r.error) { out.hidden = true; $("roll-wrap").hidden = true; msg.textContent = "Enter your taxable turnover for each month to see your rolling total."; set("out-headline", "–"); set("out-headline-sub", ""); hl.className = "headline none"; return; }
    out.hidden = false; $("roll-wrap").hidden = false;
    set("out-latest", gbp(r.latest)); set("out-latest-label", "Rolling total, 12 months to the end of " + r.latestMonth);
    set("out-headroom", r.headroom >= 0 ? gbp(r.headroom) + " left before you go over" : gbp(-r.headroom) + " over");
    set("out-month", r.firstOver ? r.firstOver.month + " (" + gbp(r.firstOver.rolling) + ")" : "None");
    set("out-deadline", r.firstOver ? "Register by " + r.firstOver.registerByNice + ", effective " + r.firstOver.effectiveNice : "–");
    var f = r.forward;
    set("out-forward", !f ? "Not checked" : f.over ? "Over: register by " + f.registerByNice + ", effective " + f.effectiveNice
      : "Not over (" + gbp(f.amount) + " in the 30 days " + f.startNice + " to " + f.endNice + ")");
    r.rows.forEach(function (row) {
      var tr = document.createElement("tr");
      tr.innerHTML = "<td></td><td class=\"num\"></td><td class=\"num\"></td><td></td>";
      tr.children[0].textContent = row.label; tr.children[1].textContent = row.blank ? "–" : gbp(row.value);
      tr.children[2].textContent = gbp(row.rolling); tr.children[3].textContent = row.over ? "Over £90,000" : "";
      if (r.firstOver && row.label === r.firstOver.month) tr.className = "total";
      tb.appendChild(tr);
    });
    var notes = [];
    if (r.firstOver || (f && f.over)) {
      hl.className = "headline owed";
      var first = r.firstOver && (!f || !f.over || r.firstOver.registerBy <= f.registerBy) ? r.firstOver : f;
      set("out-headline", "Register by " + first.registerByNice);
      set("out-headline-sub", r.firstOver ? "Your rolling total went over £90,000 at the end of " + r.firstOver.month + "." : "You expect more than £90,000 in the next 30 days alone.");
      if (r.firstOver && r.firstOver.index < 11) notes.push("Months before " + r.rows[0].label + " count as £0 here. If you had sales before then, you may have gone over sooner: move the first month back to check.");
    } else {
      hl.className = "headline refund";
      set("out-headline", gbp(r.headroom) + " headroom");
      set("out-headline-sub", "Your rolling 12-month total is not over £90,000, so you don't have to register on these figures. Keep checking at the end of every month.");
    }
    if (r.missing) notes.push(r.missing + (r.missing === 1 ? " month is" : " months are") + " blank and counted as £0.");
    if (r.belowDereg) notes.push("If you're already VAT registered: below £88,000 you can ask HMRC to cancel your registration (optional).");
    msg.textContent = notes.join(" ");
  }
  form.addEventListener("input", run);
  form.addEventListener("change", run);
  form.addEventListener("submit", function (e) { e.preventDefault(); run(); });
  run();
})();
