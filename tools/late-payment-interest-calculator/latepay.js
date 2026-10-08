/* Late Payment of Commercial Debts (Interest) Act 1998: statutory interest and fixed compensation.
   Pure logic, no DOM. Works in the browser (window.LatePay) and in Node (require).
   Rates checked 8 October 2026.
   - Rate = 8% + Bank of England Bank Rate ("official dealing rate") in force on 30 June (for interest that
     STARTS to run 1 Jul-31 Dec) or 31 December (for interest that starts to run 1 Jan-30 Jun).
     The rate is fixed by the date interest starts to run and does not change while the debt is unpaid.
     Source: The Late Payment of Commercial Debts (Rate of Interest) (No. 3) Order 2002, art. 4
     https://www.legislation.gov.uk/uksi/2002/1675/article/4/made
   - Daily interest = debt x rate / 365, simple interest.
     https://www.gov.uk/late-commercial-payments-interest-debt-recovery/charging-interest-commercial-debt
   - Compensation: up to £999.99 = £40, £1,000 to £9,999.99 = £70, £10,000 or more = £100.
     https://www.gov.uk/late-commercial-payments-interest-debt-recovery/claim-compensation-for-late-payment
   - No agreed date: late 30 days after the customer gets the invoice (or delivery, if later).
     https://www.gov.uk/late-commercial-payments-interest-debt-recovery

   HOW TO UPDATE THE BASE-RATE TABLE
   Twice a year (after 30 June and after 31 December) add one line to REF_RATES:
     { from: first day the rate applies, ref: reference date, base: Bank Rate in force on that date }
   Bank Rate history: https://www.bankofengland.co.uk/boeapps/database/Bank-Rate.asp
   NEXT UPDATE (TODO after 31 Dec 2026): { from: "2027-01-01", ref: "2026-12-31", base: ? }
   Until it is added, debts where interest starts on or after 1 Jan 2027 show "rate not known yet". */
(function (root) {
  "use strict";
  var MARGIN = 8;
  var REF_RATES = [
    { from: "2020-01-01", ref: "2019-12-31", base: 0.75 },
    { from: "2020-07-01", ref: "2020-06-30", base: 0.10 },
    { from: "2021-01-01", ref: "2020-12-31", base: 0.10 },
    { from: "2021-07-01", ref: "2021-06-30", base: 0.10 },
    { from: "2022-01-01", ref: "2021-12-31", base: 0.25 },
    { from: "2022-07-01", ref: "2022-06-30", base: 1.25 },
    { from: "2023-01-01", ref: "2022-12-31", base: 3.50 },
    { from: "2023-07-01", ref: "2023-06-30", base: 5.00 },
    { from: "2024-01-01", ref: "2023-12-31", base: 5.25 },
    { from: "2024-07-01", ref: "2024-06-30", base: 5.25 },
    { from: "2025-01-01", ref: "2024-12-31", base: 4.75 },
    { from: "2025-07-01", ref: "2025-06-30", base: 4.25 },
    { from: "2026-01-01", ref: "2025-12-31", base: 3.75 },
    { from: "2026-07-01", ref: "2026-06-30", base: 3.75 }
  ];
  var MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  var DAY = 86400000;

  function parse(s) { // "YYYY-MM-DD" -> whole days since 1970-01-01 (UTC), or NaN
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || "").trim());
    if (!m) return NaN;
    var y = +m[1], mo = +m[2], d = +m[3], t = Date.UTC(y, mo - 1, d), dt = new Date(t);
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return NaN;
    return t / DAY;
  }
  function iso(n) { return new Date(n * DAY).toISOString().slice(0, 10); }
  function nice(n) { var d = new Date(n * DAY); return d.getUTCDate() + " " + MONTHS[d.getUTCMonth()] + " " + d.getUTCFullYear(); }
  function pennies(x) { return Math.round(Number(x) * 100); }
  function round2(x) { return Math.round((x + Number.EPSILON) * 100) / 100; }

  function compensation(amount) {
    var p = pennies(amount);
    if (!(p > 0)) return 0;
    if (p < 100000) return 40;
    if (p < 1000000) return 70;
    return 100;
  }

  // Reference-rate entry for interest that starts to run on day n (null if outside the table).
  function rateFor(n) {
    var hit = null;
    for (var i = 0; i < REF_RATES.length; i++) if (parse(REF_RATES[i].from) <= n) hit = REF_RATES[i];
    if (!hit) return null;
    var f = new Date(parse(hit.from) * DAY), end = Date.UTC(f.getUTCFullYear(), f.getUTCMonth() + 6, 1) / DAY;
    if (n >= end) return null; // next half-year's rate not in the table yet
    return { from: hit.from, ref: hit.ref, refNice: nice(parse(hit.ref)), base: hit.base, rate: round2(hit.base + MARGIN) };
  }

  /* input: { amount, dueDate } or { amount, invoiceDate, termsDays (default 30) }, plus paidDate (default today) */
  function calculate(input) {
    var amount = Number(input.amount);
    if (!(amount > 0) || !isFinite(amount)) return { error: "Enter the invoice amount." };
    var due;
    if (input.dueDate) {
      due = parse(input.dueDate);
      if (isNaN(due)) return { error: "Enter a valid due date." };
    } else {
      var inv = parse(input.invoiceDate);
      if (isNaN(inv)) return { error: "Enter the due date, or the invoice date." };
      var terms = input.termsDays === "" || input.termsDays == null ? 30 : Number(input.termsDays);
      if (!(terms >= 0) || Math.floor(terms) !== terms) return { error: "Payment terms must be a whole number of days." };
      due = inv + terms;
    }
    var paid = parse(input.paidDate || input.today);
    if (isNaN(paid)) return { error: "Enter a valid paid date." };
    var daysLate = paid - due;
    var res = { amount: round2(amount), dueDate: iso(due), dueNice: nice(due), paidDate: iso(paid), paidNice: nice(paid) };
    if (daysLate <= 0) {
      res.late = false; res.daysLate = 0; res.interest = 0; res.compensation = 0; res.total = 0; res.daily = 0;
      res.rateInfo = rateFor(due + 1);
      return res;
    }
    var start = due + 1; // statutory interest starts to run the day after the due date
    var r = rateFor(start);
    if (!r) return { error: start < parse(REF_RATES[0].from)
      ? "This calculator has base rates for interest starting from 1 January 2020 onwards."
      : "The rate for interest starting on " + nice(start) + " is not known yet (it uses the Bank Rate on the next 30 June or 31 December)." };
    var dailyExact = amount * r.rate / 100 / 365;
    res.late = true;
    res.daysLate = daysLate;
    res.interestStart = iso(start); res.interestStartNice = nice(start);
    res.rateInfo = r;
    res.rate = r.rate;
    res.daily = round2(dailyExact);
    res.interest = round2(dailyExact * daysLate);
    res.compensation = compensation(amount);
    res.total = round2(res.interest + res.compensation);
    res.grandTotal = round2(amount + res.total);
    return res;
  }

  var api = { REF_RATES: REF_RATES, MARGIN: MARGIN, parse: parse, iso: iso, nice: nice, compensation: compensation, rateFor: rateFor, calculate: calculate };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.LatePay = api;
})(this);
