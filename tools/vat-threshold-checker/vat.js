/* VAT registration threshold check: rolling 12-month test and 30-day forward-look test. Pure logic, no DOM.
   Browser: window.VatCheck. Node: require. Thresholds checked 8 October 2026.
   - Register if taxable turnover for the last 12 months goes OVER £90,000 (so exactly £90,000 is not over):
     register within 30 days of the end of the month you went over; effective date is the first day of the
     second month after. https://www.gov.uk/vat-registration/when-to-register
   - Forward look: if you expect to go over £90,000 in the next 30 days alone, register by the end of those
     30 days; effective from the date you realised (the start of the period). GOV.UK example: 1 May -> by 30 May.
   - Deregistration threshold: you can ask to cancel if taxable turnover is less than £88,000.
     https://www.gov.uk/how-vat-works/vat-thresholds */
(function (root) {
  "use strict";
  var THRESHOLD = 90000, DEREG = 88000;
  var MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  var DAY = 86400000;
  function parse(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || "").trim());
    if (!m) return NaN;
    var y = +m[1], mo = +m[2], d = +m[3], t = Date.UTC(y, mo - 1, d), dt = new Date(t);
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return NaN;
    return t / DAY;
  }
  function iso(n) { return new Date(n * DAY).toISOString().slice(0, 10); }
  function nice(n) { var d = new Date(n * DAY); return d.getUTCDate() + " " + MONTHS[d.getUTCMonth()] + " " + d.getUTCFullYear(); }
  function p(x) { return Math.round(Number(x) * 100); } // pennies, so totals compare exactly

  function monthInfo(y, m0) { // m0 may run past 11
    var first = Date.UTC(y, m0, 1) / DAY, last = Date.UTC(y, m0 + 1, 0) / DAY, d = new Date(first * DAY);
    return { first: first, last: last, label: MONTHS[d.getUTCMonth()] + " " + d.getUTCFullYear(), short: MONTHS[d.getUTCMonth()].slice(0, 3) + " " + d.getUTCFullYear() };
  }

  /* input: { startMonth: "YYYY-MM", months: [12 numbers or ""], next30: number or "", next30Start: "YYYY-MM-DD" (default today) } */
  function calculate(input) {
    var sm = /^(\d{4})-(\d{2})$/.exec(String(input.startMonth || "").trim());
    if (!sm || +sm[2] < 1 || +sm[2] > 12) return { error: "Choose the first month." };
    var y = +sm[1], m0 = +sm[2] - 1, vals = input.months || [];
    var rows = [], cum = 0, entered = 0, firstOver = null;
    for (var i = 0; i < 12; i++) {
      var raw = vals[i], blank = raw === "" || raw == null;
      var v = blank ? 0 : Number(raw);
      if (!isFinite(v) || v < 0) return { error: "Turnover for month " + (i + 1) + " must be £0 or more." };
      if (!blank) entered = i + 1;
      cum += p(v);
      var mi = monthInfo(y, m0 + i);
      var over = cum > p(THRESHOLD);
      rows.push({ label: mi.label, short: mi.short, value: v, rolling: cum / 100, over: over, blank: blank });
      if (over && firstOver === null) {
        var reg = monthInfo(y, m0 + i + 2);
        firstOver = { index: i, month: mi.label, monthEnd: nice(mi.last), registerBy: iso(mi.last + 30), registerByNice: nice(mi.last + 30), effective: iso(reg.first), effectiveNice: nice(reg.first), rolling: cum / 100 };
      }
    }
    if (entered === 0 && (input.next30 === "" || input.next30 == null)) return { error: "Enter your taxable turnover for at least one month." };
    var latest = cum / 100;
    var res = {
      threshold: THRESHOLD, dereg: DEREG, rows: rows, latest: latest, latestMonth: rows[11].label,
      headroom: (p(THRESHOLD) - cum) / 100, over: firstOver !== null, firstOver: firstOver,
      missing: rows.filter(function (r) { return r.blank; }).length,
      belowDereg: cum < p(DEREG)
    };
    if (!(input.next30 === "" || input.next30 == null)) {
      var n = Number(input.next30);
      if (!isFinite(n) || n < 0) return { error: "Expected turnover for the next 30 days must be £0 or more." };
      var start = parse(input.next30Start || input.today);
      if (isNaN(start)) return { error: "Enter the date the 30 days start." };
      var fo = p(n) > p(THRESHOLD);
      res.forward = { amount: n, over: fo, start: iso(start), startNice: nice(start), end: iso(start + 29), endNice: nice(start + 29), headroom: (p(THRESHOLD) - p(n)) / 100 };
      if (fo) { res.forward.registerBy = res.forward.end; res.forward.registerByNice = res.forward.endNice; res.forward.effective = res.forward.start; res.forward.effectiveNice = res.forward.startNice; }
    }
    return res;
  }
  var api = { THRESHOLD: THRESHOLD, DEREG: DEREG, parse: parse, iso: iso, nice: nice, calculate: calculate };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.VatCheck = api;
})(this);
