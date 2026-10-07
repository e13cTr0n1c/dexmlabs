/*!
 * CIS tax refund estimator: calculation engine (no DOM).
 * Estimate only, not tax advice. Rates checked against GOV.UK on 6 October 2026.
 * Sources are listed in RATES[year].sources and in README.md.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.CISRefund = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // Bands are "taxable income after allowances" (as GOV.UK publishes them).
  // upTo = top of band; Infinity for the last band.
  var RATES = {
    "2025-26": {
      label: "2025 to 2026 (6 Apr 2025 to 5 Apr 2026)",
      personalAllowance: 12570,
      paTaperStart: 100000,
      bands: {
        ruk: [
          { name: "Basic rate", rate: 0.20, upTo: 37700 },
          { name: "Higher rate", rate: 0.40, upTo: 125140 },
          { name: "Additional rate", rate: 0.45, upTo: Infinity }
        ],
        scot: [
          { name: "Starter rate", rate: 0.19, upTo: 2827 },
          { name: "Basic rate", rate: 0.20, upTo: 14921 },
          { name: "Intermediate rate", rate: 0.21, upTo: 31092 },
          { name: "Higher rate", rate: 0.42, upTo: 62430 },
          { name: "Advanced rate", rate: 0.45, upTo: 125140 },
          { name: "Top rate", rate: 0.48, upTo: Infinity }
        ]
      },
      class4: { lpl: 12570, upl: 50270, main: 0.06, upper: 0.02 },
      class2: { spt: 6845, weekly: 3.50, weeks: 52 },
      mileage: { first10k: 0.45, after: 0.25 },
      studentLoan: { plan1: 26065, plan2: 28470, plan4: 32745, plan5: null, pg: 21000, rate: 0.09, pgRate: 0.06 },
      tradingAllowance: 1000,
      formsPublished: true
    },
    "2026-27": {
      label: "2026 to 2027 (6 Apr 2026 to 5 Apr 2027)",
      personalAllowance: 12570,
      paTaperStart: 100000,
      bands: {
        ruk: [
          { name: "Basic rate", rate: 0.20, upTo: 37700 },
          { name: "Higher rate", rate: 0.40, upTo: 125140 },
          { name: "Additional rate", rate: 0.45, upTo: Infinity }
        ],
        scot: [
          { name: "Starter rate", rate: 0.19, upTo: 3967 },
          { name: "Basic rate", rate: 0.20, upTo: 16956 },
          { name: "Intermediate rate", rate: 0.21, upTo: 31092 },
          { name: "Higher rate", rate: 0.42, upTo: 62430 },
          { name: "Advanced rate", rate: 0.45, upTo: 125140 },
          { name: "Top rate", rate: 0.48, upTo: Infinity }
        ]
      },
      class4: { lpl: 12570, upl: 50270, main: 0.06, upper: 0.02 },
      class2: { spt: 7105, weekly: 3.65, weeks: 52 },
      mileage: { first10k: 0.55, after: 0.25 },
      studentLoan: { plan1: 26900, plan2: 29385, plan4: 33795, plan5: 25000, pg: 21000, rate: 0.09, pgRate: 0.06 },
      tradingAllowance: 1000,
      formsPublished: false
    }
  };

  var VAT_THRESHOLD_SHORT_FORM = 90000; // SA103S is for turnover below £90,000

  function r2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }
  function num(v) { v = Number(v); return isFinite(v) && v > 0 ? v : 0; }

  function mileageAllowance(miles, year) {
    var m = RATES[year].mileage;
    miles = num(miles);
    var first = Math.min(miles, 10000), rest = Math.max(0, miles - 10000);
    return { miles: miles, first: first, rest: rest, rateFirst: m.first10k, rateAfter: m.after,
      amount: r2(first * m.first10k + rest * m.after) };
  }

  function personalAllowance(income, year) {
    var R = RATES[year];
    var excess = Math.max(0, income - R.paTaperStart);
    return Math.max(0, R.personalAllowance - Math.floor(excess / 2));
  }

  function incomeTax(taxable, bands) {
    var lines = [], prev = 0, total = 0;
    for (var i = 0; i < bands.length; i++) {
      var b = bands[i];
      if (taxable <= prev) break;
      var slice = Math.min(taxable, b.upTo) - prev;
      if (slice > 0) {
        var tax = r2(slice * b.rate);
        lines.push({ name: b.name, rate: b.rate, amount: r2(slice), tax: tax });
        total += tax;
      }
      prev = b.upTo;
    }
    return { lines: lines, total: r2(total) };
  }

  function class4(profit, year) {
    var c = RATES[year].class4;
    var main = Math.max(0, Math.min(profit, c.upl) - c.lpl);
    var upper = Math.max(0, profit - c.upl);
    return { mainSlice: r2(main), upperSlice: r2(upper), main: r2(main * c.main), upper: r2(upper * c.upper),
      total: r2(main * c.main + upper * c.upper) };
  }

  function studentLoan(income, plan, postgrad, year) {
    var s = RATES[year].studentLoan, out = { plan: 0, pg: 0, threshold: null, pgThreshold: null, planAvailable: true };
    if (plan && plan !== "none") {
      var t = s["plan" + plan];
      if (t == null) { out.planAvailable = false; }
      else {
        out.threshold = t;
        out.plan = Math.max(0, Math.floor((income - t) * s.rate));
      }
    }
    if (postgrad) {
      out.pgThreshold = s.pg;
      out.pg = Math.max(0, Math.floor((income - s.pg) * s.pgRate));
    }
    out.total = out.plan + out.pg;
    return out;
  }

  /**
   * inputs: {
   *   year: "2025-26"|"2026-27", region: "ruk"|"scot",
   *   cisGross, otherSEIncome, cisDeducted,
   *   materials, miles, otherTravel, otherExpenses, useTradingAllowance,
   *   employmentPay, employmentTax,
   *   studentPlan: "none"|"1"|"2"|"4"|"5", postgrad: bool, loanDeducted,
   *   voluntaryClass2: bool
   * }
   */
  function estimate(inp) {
    var year = RATES[inp.year] ? inp.year : "2026-27";
    var R = RATES[year];
    var region = inp.region === "scot" ? "scot" : "ruk";

    var cisGross = num(inp.cisGross), otherSE = num(inp.otherSEIncome);
    var turnover = r2(cisGross + otherSE);
    var cisDeducted = num(inp.cisDeducted);

    var mileage = mileageAllowance(inp.miles, year);
    var materials = num(inp.materials), otherTravel = num(inp.otherTravel), otherExp = num(inp.otherExpenses);
    var useTA = !!inp.useTradingAllowance;
    var tradingAllowance = useTA ? Math.min(R.tradingAllowance, turnover) : 0;
    var travelBox = useTA ? 0 : r2(mileage.amount + otherTravel);
    var expenses = useTA ? 0 : r2(materials + travelBox + otherExp);

    var net = r2(turnover - expenses - tradingAllowance);
    var profit = Math.max(0, net);
    var loss = Math.max(0, -net);

    var empPay = num(inp.employmentPay), empTax = num(inp.employmentTax);
    var totalIncome = r2(profit + empPay);
    var pa = personalAllowance(totalIncome, year);
    var taxable = Math.max(0, r2(totalIncome - pa));
    var it = incomeTax(taxable, R.bands[region]);

    var c4 = class4(profit, year);
    var c2due = 0, c2belowSPT = profit < R.class2.spt;
    if (c2belowSPT && inp.voluntaryClass2) c2due = r2(R.class2.weekly * R.class2.weeks);

    var sl = studentLoan(totalIncome, inp.studentPlan, !!inp.postgrad, year);
    var loanDeducted = num(inp.loanDeducted);

    var liability = r2(it.total + c4.total + c2due + sl.total);
    var alreadyPaid = r2(cisDeducted + empTax + loanDeducted);
    var balance = r2(liability - alreadyPaid); // >0 owed, <0 refund

    // Payments on account check (GOV.UK: not needed if <£1,000 owed via SA,
    // or >80% of tax paid outside SA). POAs cover income tax + Class 4 only.
    var taxAndC4 = r2(it.total + c4.total);
    var atSource = r2(cisDeducted + empTax);
    var relevant = r2(taxAndC4 - atSource);
    var poaNeeded = relevant >= 1000 && atSource <= 0.8 * taxAndC4;
    var poaEach = poaNeeded ? r2(relevant / 2) : 0;

    var shortForm = turnover < VAT_THRESHOLD_SHORT_FORM;
    var boxes = [];
    function bx(form, box, label, value, note) { boxes.push({ form: form, box: box, label: label, value: value, note: note || "" }); }
    if (shortForm) {
      bx("SA103S", "9", "Your turnover (gross before CIS, incl. materials)", turnover);
      if (useTA) bx("SA103S", "10.1", "Trading income allowance", tradingAllowance, "Leave boxes 11 to 20 blank");
      else {
        bx("SA103S", "11", "Costs of goods bought for resale or goods used (materials)", materials);
        bx("SA103S", "12", "Car, van and travel expenses (mileage + other travel)", travelBox);
        bx("SA103S", "13 to 19", "Other allowable expenses, by category", otherExp, "Or just put the total in box 20 (turnover under £90,000)");
        bx("SA103S", "20", "Total allowable expenses", expenses);
      }
      if (useTA) bx("SA103S", "21", "Net profit (box 9 + box 10, before the allowance)", turnover, "Box 28 then takes off box 10.1");
      else if (net >= 0) bx("SA103S", "21", "Net profit", profit);
      else bx("SA103S", "22", "Net loss", loss);
      bx("SA103S", "28 / 31", "Net business profit for tax purposes / total taxable profits", profit, "Assumes no capital allowances, adjustments or losses brought forward");
      if (c2belowSPT && inp.voluntaryClass2) bx("SA103S", "36", "Voluntary Class 2 NICs", "X", "Profits below £" + R.class2.spt.toLocaleString("en-GB"));
      bx("SA103S", "38", "Total CIS deductions taken by contractors", cisDeducted);
    } else {
      bx("SA103F", "15", "Your turnover (gross before CIS, incl. materials)", turnover);
      if (useTA) bx("SA103F", "16.1", "Trading income allowance", tradingAllowance);
      else {
        bx("SA103F", "17", "Cost of goods bought for resale or goods used (materials)", materials);
        bx("SA103F", "20", "Car, van and travel expenses (mileage + other travel)", travelBox);
        bx("SA103F", "19, 21 to 30", "Other allowable expenses, by category", otherExp);
        bx("SA103F", "31", "Total expenses", expenses);
      }
      if (useTA) bx("SA103F", "47", "Net profit (before the allowance)", turnover, "The allowance in box 16.1 comes off when you work out the adjusted profit");
      else if (net >= 0) bx("SA103F", "47", "Net profit", profit); else bx("SA103F", "48", "Net loss", loss);
      bx("SA103F", "73 / 76", "Adjusted profit / total taxable profits", profit, "Assumes no capital allowances, adjustments or losses brought forward");
      if (c2belowSPT && inp.voluntaryClass2) bx("SA103F", "100", "Voluntary Class 2 NICs", "X");
      bx("SA103F", "81", "Total CIS deductions taken by contractors", cisDeducted);
    }
    if (empPay > 0 || empTax > 0) {
      bx("SA102", "1", "Pay from employment (P60/P45)", empPay);
      bx("SA102", "2", "UK tax taken off pay", empTax);
    }
    if ((inp.studentPlan && inp.studentPlan !== "none") || inp.postgrad) {
      bx("SA100", "TR 4, box 1", "Student/Postgraduate Loan repayments due: put X", "X");
      if (loanDeducted > 0) bx("SA100", "TR 4, boxes 2 and 3", "Loan repayments your employer already deducted", loanDeducted, "Split Student Loan (box 2) and Postgraduate Loan (box 3)");
    }

    return {
      year: year, region: region, rates: R,
      turnover: turnover, cisDeducted: cisDeducted,
      mileage: mileage, materials: materials, otherTravel: otherTravel, otherExpenses: otherExp,
      travelBox: travelBox, expenses: expenses, useTradingAllowance: useTA, tradingAllowance: tradingAllowance,
      profit: r2(profit), loss: r2(loss),
      employmentPay: empPay, employmentTax: empTax,
      totalIncome: totalIncome, personalAllowance: pa, taxable: taxable,
      incomeTax: it, class4: c4, class2: { due: c2due, belowSPT: c2belowSPT, spt: R.class2.spt },
      studentLoan: sl, loanDeducted: loanDeducted,
      liability: liability, alreadyPaid: alreadyPaid, balance: balance,
      refund: balance < 0 ? r2(-balance) : 0, owed: balance > 0 ? balance : 0,
      poa: { needed: poaNeeded, each: poaEach, relevant: relevant, atSource: atSource, taxAndC4: taxAndC4 },
      form: shortForm ? "SA103S" : "SA103F", boxes: boxes
    };
  }

  return { RATES: RATES, estimate: estimate, mileageAllowance: mileageAllowance,
    personalAllowance: personalAllowance, incomeTax: incomeTax, class4: class4, studentLoan: studentLoan };
});
