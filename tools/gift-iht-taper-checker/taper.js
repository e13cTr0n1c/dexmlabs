/* Gifts and the 7-year rule: taper relief on Inheritance Tax on a gift. Pure logic, no DOM.
   Browser: window.Taper. Node: require. Rates checked 8 October 2026.
   - Nil-rate band £325,000 (fixed to 5 April 2031):
     https://www.gov.uk/government/publications/rates-and-allowances-inheritance-tax-thresholds-and-interest-rates/inheritance-tax-thresholds-and-interest-rates
   - Rates on the part of gifts above the nil-rate band: under 3 years 40%, 3-4 32%, 4-5 24%, 5-6 16%, 6-7 8%, 7+ 0%:
     https://www.gov.uk/inheritance-tax/gifts  and  https://www.gov.uk/hmrc-internal-manuals/inheritance-tax-manual/ihtm14612
   - Exact boundaries follow the Inheritance Tax Act 1984:
     s.3A(4): a gift made "seven years or more" before death is exempt -> exactly 7 years = exempt.
     s.7(4): taper applies when made "more than three but not more than four years" before death, etc.
       -> on the exact 3rd/4th/5th/6th anniversary the higher rate still applies; it steps down the next day.
     https://www.legislation.gov.uk/ukpga/1984/51/section/7  https://www.legislation.gov.uk/ukpga/1984/51/section/3A
   - TODO (not confirmed on an official page): for a gift made on 29 February, we treat the anniversary in a
     non-leap year as 1 March (the later, more cautious date). GOV.UK and HMRC do not say which day applies. */
(function (root) {
  "use strict";
  var NRB = 325000, FULL = 40;
  var BANDS = [ // [years, rate% if death is AFTER the previous anniversary and ON or BEFORE this one]
    [3, 40], [4, 32], [5, 24], [6, 16], [7, 8]
  ];
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
  function round2(x) { return Math.round((x + Number.EPSILON) * 100) / 100; }
  // n-th anniversary; 29 Feb in a non-leap year rolls to 1 March (Date.UTC does this).
  function anniversary(day, years) {
    var d = new Date(day * DAY);
    return Date.UTC(d.getUTCFullYear() + years, d.getUTCMonth(), d.getUTCDate()) / DAY;
  }

  function band(gift, death) {
    if (death >= anniversary(gift, 7)) return { rate: 0, label: "7 years or more", exempt: true };
    var prev = 0;
    for (var i = 0; i < BANDS.length; i++) {
      if (death <= anniversary(gift, BANDS[i][0])) {
        return { rate: BANDS[i][1], label: prev === 0 ? "Under 3 years" : prev + " to " + BANDS[i][0] + " years", exempt: false };
      }
      prev = BANDS[i][0];
    }
  }

  /* input: { giftDate, value, deathDate (default today), nrb (default 325000) } */
  function calculate(input) {
    var gift = parse(input.giftDate);
    if (isNaN(gift)) return { error: "Enter the date of the gift." };
    var death = parse(input.deathDate || input.today);
    if (isNaN(death)) return { error: "Enter a valid date of death." };
    if (death < gift) return { error: "The date of death can't be before the gift." };
    var value = Number(input.value);
    if (!(value >= 0) || !isFinite(value) || input.value === "" || input.value == null) return { error: "Enter the value of the gift." };
    var nrb = input.nrb === "" || input.nrb == null ? NRB : Number(input.nrb);
    if (!(nrb >= 0) || !isFinite(nrb)) return { error: "The nil-rate band available can't be negative." };

    var full = 0; while (death >= anniversary(gift, full + 1)) full++;
    var days = death - anniversary(gift, full);
    var b = band(gift, death);
    var over = b.exempt ? 0 : Math.max(0, value - nrb);
    var tax = round2(over * b.rate / 100);
    var fullTax = round2(over * FULL / 100);
    var exemptDay = anniversary(gift, 7);
    var next = null; // the next date the rate drops
    if (!b.exempt) {
      for (var i = 0; i < BANDS.length; i++) {
        var a = anniversary(gift, BANDS[i][0]);
        if (death <= a) { next = BANDS[i][0] === 7 ? { date: iso(a), nice: nice(a), rate: 0 } : { date: iso(a + 1), nice: nice(a + 1), rate: BANDS[i + 1][1] }; break; }
      }
    }
    return {
      giftDate: iso(gift), deathDate: iso(death), deathNice: nice(death),
      years: full, days: days, totalDays: death - gift,
      band: b.label, rate: b.rate, exempt: b.exempt,
      value: round2(value), nrb: round2(nrb), over: round2(over), withinNrb: !b.exempt && over === 0,
      tax: tax, fullTax: fullTax, taperSaving: round2(fullTax - tax),
      exemptDate: iso(exemptDay), exemptNice: nice(exemptDay), next: next
    };
  }
  var api = { NRB: NRB, BANDS: BANDS, parse: parse, iso: iso, nice: nice, anniversary: anniversary, band: band, calculate: calculate };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.Taper = api;
})(this);
