/* CIS tax refund estimator: page wiring. Uses window.CISRefund from estimator.js. */
(function () {
  "use strict";
  var C = window.CISRefund;
  var $ = function (id) { return document.getElementById(id); };

  function money(n) {
    var neg = n < 0; n = Math.abs(n);
    return (neg ? "−" : "") + "£" + n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function minus(n) { return n > 0 ? "−" + money(n) : money(0); }
  function val(id) { var v = parseFloat($(id).value); return isNaN(v) || v < 0 ? 0 : v; }
  function pct(r) { return (Math.round(r * 10000) / 100) + "%"; }
  function radio(name) { var c = document.querySelector('input[name="' + name + '"]:checked'); return c ? c.value : null; }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  function sumMonthly() {
    var g = 0, c = 0;
    Array.prototype.forEach.call(document.querySelectorAll(".m-gross"), function (i) { var v = parseFloat(i.value); if (v > 0) g += v; });
    Array.prototype.forEach.call(document.querySelectorAll(".m-cis"), function (i) { var v = parseFloat(i.value); if (v > 0) c += v; });
    g = Math.round(g * 100) / 100; c = Math.round(c * 100) / 100;
    $("m-gross-total").textContent = money(g);
    $("m-cis-total").textContent = money(c);
    return { gross: g, cis: c };
  }

  function syncUi() {
    var year = $("year").value, R = C.RATES[year];
    var monthly = $("use-monthly").checked;
    $("monthly-wrap").classList.toggle("visible", monthly);
    $("cis-gross").readOnly = monthly; $("cis-deducted").readOnly = monthly;
    if (monthly) { var t = sumMonthly(); $("cis-gross").value = t.gross; $("cis-deducted").value = t.cis; }

    var ta = $("use-ta").checked;
    $("expense-fields").hidden = ta;
    $("mileage-rate").textContent = Math.round(R.mileage.first10k * 100) + "p";

    var plan5 = $("sl-plan").querySelector('option[value="5"]');
    plan5.disabled = R.studentLoan.plan5 == null;
    if (plan5.disabled && $("sl-plan").value === "5") $("sl-plan").value = "none";
    plan5.textContent = R.studentLoan.plan5 == null ? "Plan 5 (repayments start April 2026)" : "Plan 5";

    $("c2-hint").textContent = "Only applies if your profit is below the Small Profits Threshold (£" + R.class2.spt.toLocaleString("en-GB") +
      " for " + year.replace("-", "/") + "), at £" + R.class2.weekly.toFixed(2) + " a week. Above it, Class 2 is treated as paid at no cost.";
    $("year-hint").textContent = year === "2026-27"
      ? "2026/27 rates are confirmed on GOV.UK. The 2026/27 tax return forms are not published yet."
      : "Rates and box numbers from GOV.UK and HMRC's 2025/26 forms. Online filing deadline 31 January 2027.";
  }

  function row(label, value, cls) {
    var d = el("div", "result-row" + (cls ? " " + cls : ""));
    d.appendChild(el("span", "result-label", label));
    d.appendChild(el("span", "result-value", value));
    return d;
  }

  function render(r) {
    var R = r.rates;
    var refund = r.balance <= 0;
    $("headline").className = "headline " + (refund ? "refund" : "owed");
    $("out-headline-label").textContent = refund ? "Estimated refund" : "Estimated tax to pay";
    $("out-headline").textContent = money(refund ? r.refund : r.owed);
    $("out-balance-label").textContent = refund ? "Estimated refund" : "Estimated amount to pay by 31 January";
    $("out-balance").textContent = money(refund ? r.refund : r.owed);
    $("out-balance").style.color = refund ? "" : "var(--danger)";

    $("out-turnover").textContent = money(r.turnover);
    $("out-expenses-label").textContent = r.useTradingAllowance ? "Trading income allowance" : "Allowable expenses";
    $("out-expenses").textContent = minus(r.useTradingAllowance ? r.tradingAllowance : r.expenses);
    $("out-profit").textContent = money(r.profit);
    $("row-emp").hidden = !(r.employmentPay > 0);
    $("out-emp").textContent = money(r.employmentPay);
    $("out-pa").textContent = minus(r.personalAllowance);
    $("out-taxable").textContent = money(r.taxable);
    $("out-it").textContent = money(r.incomeTax.total);
    var lines = $("it-lines"); lines.textContent = "";
    r.incomeTax.lines.forEach(function (l) {
      lines.appendChild(row(l.name + " " + pct(l.rate) + " on " + money(l.amount), money(l.tax), "sub"));
    });
    $("out-c4").textContent = money(r.class4.total);
    $("out-c2").textContent = money(r.class2.due);
    $("out-c2-label").textContent = "Class 2 National Insurance" + (r.class2.due > 0 ? " (voluntary)" : (r.class2.belowSPT ? " (none due)" : " (treated as paid)"));
    var hasSL = r.studentLoan.total > 0 || $("sl-plan").value !== "none" || $("pg-loan").checked;
    $("row-sl").hidden = !hasSL;
    $("out-sl").textContent = money(r.studentLoan.total);
    $("out-liability").textContent = money(r.liability);
    $("out-cis").textContent = minus(r.cisDeducted);
    $("row-paye").hidden = !(r.employmentTax > 0);
    $("out-paye").textContent = minus(r.employmentTax);
    $("row-loanded").hidden = !(r.loanDeducted > 0);
    $("out-loanded").textContent = minus(r.loanDeducted);

    // Worked breakdown (plain text built safely)
    var b = $("out-breakdown"); b.textContent = "";
    var parts = [];
    parts.push("Worked breakdown: turnover " + money(r.turnover));
    if (r.useTradingAllowance) parts.push(" − trading allowance " + money(r.tradingAllowance));
    else {
      if (r.materials) parts.push(" − materials " + money(r.materials));
      if (r.mileage.amount) parts.push(" − mileage " + money(r.mileage.amount) + " (" + r.mileage.first.toLocaleString("en-GB") + " mi × " +
        Math.round(r.mileage.rateFirst * 100) + "p" + (r.mileage.rest ? " + " + r.mileage.rest.toLocaleString("en-GB") + " mi × 25p" : "") + ")");
      if (r.otherTravel) parts.push(" − other travel " + money(r.otherTravel));
      if (r.otherExpenses) parts.push(" − other expenses " + money(r.otherExpenses));
    }
    parts.push(" = profit " + money(r.profit) + ". ");
    if (r.employmentPay) parts.push("Plus wages " + money(r.employmentPay) + " = total income " + money(r.totalIncome) + ". ");
    parts.push("Personal Allowance " + money(r.personalAllowance) + (r.personalAllowance < R.personalAllowance ? " (reduced because income is over £100,000)" : "") +
      ", so " + money(r.taxable) + " is taxed" + (r.region === "scot" ? " at Scottish rates" : "") + ": " + money(r.incomeTax.total) + ". ");
    if (r.class4.total) parts.push("Class 4: 6% × " + money(r.class4.mainSlice) + (r.class4.upperSlice ? " + 2% × " + money(r.class4.upperSlice) : "") + " = " + money(r.class4.total) + ". ");
    if (r.studentLoan.plan) parts.push("Student loan: 9% × (" + money(r.totalIncome) + " − " + money(r.studentLoan.threshold) + ") = " + money(r.studentLoan.plan) + ". ");
    if (r.studentLoan.pg) parts.push("Postgraduate Loan: 6% × (" + money(r.totalIncome) + " − £21,000.00) = " + money(r.studentLoan.pg) + ". ");
    parts.push("Total due " + money(r.liability) + " − already paid " + money(r.alreadyPaid) + " = " +
      (refund ? "refund of " + money(r.refund) : money(r.owed) + " to pay") + ".");
    var strong = el("strong", null, parts.shift());
    b.appendChild(strong);
    b.appendChild(document.createTextNode(parts.join("")));

    // Notes
    var notes = $("out-notes"); notes.textContent = "";
    function note(html) { var d = el("div", "note"); d.innerHTML = html; notes.appendChild(d); }
    if (r.poa.needed) note("<strong>Payments on account:</strong> because you would owe £1,000 or more and less than 80% of your tax was taken at source, HMRC will probably also ask for two payments on account of about <strong>" +
      money(r.poa.each) + "</strong> each towards next year (31 January and 31 July). <a href=\"https://www.gov.uk/understand-self-assessment-bill/payments-on-account\" target=\"_blank\" rel=\"noopener\">GOV.UK</a>");
    else if (!refund) note("<strong>Payments on account:</strong> probably not needed, because " + (r.poa.relevant < 1000 ? "the tax owed through Self Assessment is under £1,000." : "more than 80% of your tax was collected at source (CIS and PAYE).") +
      " <a href=\"https://www.gov.uk/understand-self-assessment-bill/payments-on-account\" target=\"_blank\" rel=\"noopener\">GOV.UK</a>");
    if (r.loss > 0) note("<strong>Loss:</strong> your expenses are more than your income, so this shows £0 profit. Loss relief (setting it against other income or carrying it forward) is not modelled here.");
    if (!r.studentLoan.planAvailable) note("<strong>Plan 5:</strong> no Plan 5 repayments are due before 6 April 2026, so none are included for 2025/26.");
    if (r.year === "2026-27") note("<strong>2026/27:</strong> the 55p mileage rate is backdated to 6 April 2026 but was still going through Parliament when announced, and mileage rates are being reviewed at Budget 2026. If you are signed up to Making Tax Digital for Income Tax, you report through software, not the SA103 pages. <a href=\"https://www.gov.uk/government/publications/increase-to-approved-mileage-allowance-payments-amaps-and-self-employed-simplified-mileage-rates/increasing-mileage-rates\" target=\"_blank\" rel=\"noopener\">GOV.UK</a>");
    if (r.turnover >= 90000) note("<strong>Turnover £90,000 or more:</strong> use the full SA103F pages, and check whether you must register for VAT.");

    // SA boxes
    $("boxes-intro").textContent = (r.form === "SA103S"
      ? "Turnover under £90,000, so the short Self-employment page (SA103S) is likely to fit."
      : "Turnover of £90,000 or more, so use the full Self-employment page (SA103F).") +
      (r.year === "2026-27" ? " Box numbers are from the 2025/26 forms; the 2026/27 forms are not published yet." : "");
    var tb = $("boxes-body"); tb.textContent = "";
    r.boxes.forEach(function (x) {
      var tr = el("tr");
      var tdb = el("td", "box", x.box);
      tdb.insertBefore(el("small", null, x.form), tdb.firstChild);
      tr.appendChild(tdb);
      var td = el("td", null, x.label);
      if (x.note) td.appendChild(el("small", null, x.note));
      tr.appendChild(td);
      tr.appendChild(el("td", "num", typeof x.value === "number" ? money(x.value) : x.value));
      tb.appendChild(tr);
    });
  }

  function calculate() {
    syncUi();
    var r = C.estimate({
      year: $("year").value, region: radio("region"),
      cisGross: val("cis-gross"), cisDeducted: val("cis-deducted"), otherSEIncome: val("other-se"),
      useTradingAllowance: $("use-ta").checked,
      materials: val("materials"), miles: val("miles"), otherTravel: val("other-travel"), otherExpenses: val("other-exp"),
      employmentPay: val("emp-pay"), employmentTax: val("emp-tax"),
      studentPlan: $("sl-plan").value, postgrad: $("pg-loan").checked, loanDeducted: val("loan-deducted"),
      voluntaryClass2: $("vol-c2").checked
    });
    render(r);
    window.__lastEstimate = r;
  }

  ["input", "change"].forEach(function (evt) { $("refund-form").addEventListener(evt, calculate); });
  calculate();
})();
