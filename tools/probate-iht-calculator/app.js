/* Probate and Inheritance Tax calculator: page wiring. Uses window.ProbateIHT from iht.js. */
(function () {
  "use strict";
  var P = window.ProbateIHT, R = P.RATES, S = R.sources;
  var $ = function (id) { return document.getElementById(id); };

  function money(n, dp) {
    var neg = n < 0; n = Math.abs(n); dp = dp == null ? 2 : dp;
    return (neg ? "−" : "") + "£" + n.toLocaleString("en-GB", { minimumFractionDigits: dp, maximumFractionDigits: dp });
  }
  function whole(n) { return money(n, 0); }
  function minus(n) { return n > 0 ? "−" + money(n) : money(0); }
  function val(id) { var v = parseFloat($(id).value); return isNaN(v) || v < 0 ? 0 : v; }
  function radio(name) { var c = document.querySelector('input[name="' + name + '"]:checked'); return c ? c.value : null; }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function link(text, href) { var a = el("a", null, text); a.href = href; a.target = "_blank"; a.rel = "noopener"; return a; }
  // Build a node from parts: strings, or [text, href] for links, or {b: text} for bold
  function frag(parts) {
    var f = document.createDocumentFragment();
    parts.forEach(function (p) {
      if (typeof p === "string") f.appendChild(document.createTextNode(p));
      else if (Array.isArray(p)) f.appendChild(link(p[0], p[1]));
      else if (p && p.b) f.appendChild(el("strong", null, p.b));
    });
    return f;
  }
  function pctText(x) { return (Math.round(x * 100) / 100).toLocaleString("en-GB") + "%"; }

  function readInputs() {
    var gifts = [];
    for (var i = 0; i < 5; i++) gifts.push({ amount: val("g-amt-" + i), band: $("g-band-" + i).value });
    return {
      status: radio("status"),
      deathFromApril2027: $("dod").value === "from2027",
      transferNrbPct: val("transfer-nrb"), transferRnrbPct: val("transfer-rnrb"),
      home: val("home"), homeMortgage: val("home-mortgage"), homeJoint: $("home-joint").checked,
      otherProperty: val("other-property"), savings: val("savings"), investments: val("investments"),
      otherAssets: val("other-assets"), pensions: val("pensions"), otherJoint: val("other-joint"),
      debts: val("debts"), funeral: val("funeral"),
      homeToDescendantsPct: val("home-dd"),
      spouseMode: $("spouse-mode").value, spouseAmount: val("spouse-amount"),
      charity: val("charity"),
      gifts: gifts
    };
  }

  function syncUi() {
    var st = radio("status");
    $("widowed-fields").hidden = st !== "widowed";
    $("spouse-fields").hidden = st !== "married";
    $("spouse-amount-wrap").hidden = $("spouse-mode").value !== "amount";
    $("pensions-hint").textContent = $("dod").value === "from2027"
      ? "Counted, because the death is on or after 6 April 2027 (Finance Act 2026). Death-in-service lump sums are not counted. Pension money going to a spouse or civil partner is exempt."
      : "Not counted for deaths before 6 April 2027, so this is ignored. Choose the later date of death above to include it.";
  }

  function verdict(id, cls, title, parts, list) {
    var box = $(id);
    box.className = "verdict " + cls; box.hidden = false; box.textContent = "";
    box.appendChild(el("h3", null, title));
    var p = el("p"); p.style.margin = "0"; p.appendChild(frag(parts)); box.appendChild(p);
    if (list && list.length) {
      var ul = el("ul"); list.forEach(function (li) { var l = el("li"); l.appendChild(frag(li)); ul.appendChild(l); }); box.appendChild(ul);
    }
  }
  function note(parts) { var d = el("div", "note"); d.appendChild(frag(parts)); $("out-notes").appendChild(d); }

  var FORM_NAMES = { IHT400: "IHT400 (the Inheritance Tax account)", IHT435: "IHT435 (claim the residence nil rate band)",
    IHT436: "IHT436 (transfer a late spouse's unused residence nil rate band)", IHT402: "IHT402 (transfer a late spouse's unused nil rate band)",
    IHT403: "IHT403 (gifts in the last 7 years)", IHT430: "IHT430 (reduced rate for charity gifts)" };
  var REASONS = {
    tax: "there is Inheritance Tax to pay",
    gifts: "gifts in the 7 years before death add up to more than £250,000",
    over3m: "the estate (with gifts) is worth more than £3 million",
    rnrb: "no tax is due only because of the residence nil rate band, which doesn't count towards the excepted estate limits",
    overLimit: "the estate is over the excepted estate limit"
  };

  function render(r) {
    var hasTax = r.totalTax > 0;
    $("headline").className = "headline " + (hasTax ? "owed" : "none");
    $("out-headline-label").textContent = "Estimated Inheritance Tax";
    $("out-headline").textContent = money(r.totalTax);
    $("out-headline-sub").textContent = hasTax
      ? (r.giftsTax > 0 ? "Estate " + money(r.estateTax) + " + gifts " + money(r.giftsTax) : "On a taxable estate of " + whole(r.taxable))
      : "Nothing to pay on these figures";

    $("out-gross").textContent = money(r.gross);
    $("out-liab").textContent = minus(r.liabilities);
    $("out-net").textContent = money(r.net);
    $("row-spouse").hidden = !(r.spouse > 0); $("out-spouse").textContent = minus(r.spouse);
    $("row-charity").hidden = !(r.charity > 0); $("out-charity").textContent = minus(r.charity);
    $("out-chargeable").textContent = money(r.chargeable);
    $("out-rnrb-label").textContent = "Residence nil rate band" + (r.rnrb > r.rnrbUsed ? " (used " + whole(r.rnrbUsed) + " of " + whole(r.rnrb) + ")" : "");
    $("out-rnrb").textContent = minus(r.rnrbUsed);
    $("out-nrb-label").textContent = "Nil rate band " + whole(r.nrbTotal) + (r.giftsTotal > 0 ? " minus gifts" : "") + (r.nrbForEstate > r.nrbUsedByEstate ? " (used " + whole(r.nrbUsedByEstate) + ")" : "");
    $("out-nrb").textContent = minus(r.nrbUsedByEstate);
    $("out-taxable").textContent = money(r.taxable);
    $("out-rate-label").textContent = "Inheritance Tax on the estate at " + Math.round(r.rate * 100) + "%" + (r.charityQualifies ? " (charity rate)" : "");
    $("out-estate-tax").textContent = money(r.estateTax);
    $("row-gifts-tax").hidden = !(r.giftsTotal > 0 && r.giftsTaxable > 0); $("out-gifts-tax").textContent = money(r.giftsTax);
    $("out-total").textContent = money(r.totalTax);

    // Breakdown
    var b = $("out-breakdown"); b.textContent = "";
    var lines = [];
    lines.push(["Nil rate band: ", { b: whole(r.nrbOwn) }, r.nrbTransferred > 0 ? " + " + whole(r.nrbTransferred) + " from the late spouse" : "",
      r.giftsTotal > 0 ? " − " + whole(r.nrbUsedByGifts) + " used by gifts" : "", " = ", { b: whole(r.nrbForEstate) }, " for the estate."]);
    if (r.homeNet > 0 || r.rnrbTransferred > 0) {
      var rl = ["Residence nil rate band: up to ", { b: whole(r.rnrbDefault) }];
      if (r.taper > 0) rl.push(" − taper " + whole(Math.min(r.taper, r.rnrbDefault)) + " (estate over £2m)");
      rl.push(", limited to the home going to direct descendants (" + whole(r.closelyInherited) + ") = ", { b: whole(r.rnrb) }, ".");
      lines.push(rl);
    } else lines.push(["No residence nil rate band: there is no home in the estate (downsizing relief is not modelled)."]);
    if (r.charity > 0) lines.push(["Charity test: baseline amount ", { b: whole(r.baseline) }, ", 10% = " + money(r.baseline * 0.1) + "; charity gifts " + whole(r.charity) + (r.charityQualifies ? " pass, so 36% applies." : " fall short, so 40% applies.")]);
    lines.forEach(function (l) { var d = el("div"); d.appendChild(frag(l)); d.style.marginBottom = "0.3rem"; b.appendChild(d); });

    // Gifts table
    var tb = $("gift-rows"); tb.textContent = "";
    $("gift-table-wrap").hidden = r.gifts.length === 0;
    r.gifts.forEach(function (g) {
      var tr = el("tr");
      tr.appendChild(el("td", null, whole(g.amount) + ", " + g.band.label + " before death"));
      tr.appendChild(el("td", "num", whole(g.covered)));
      tr.appendChild(el("td", "num", whole(g.taxable)));
      tr.appendChild(el("td", "num", Math.round(g.rate * 100) + "%"));
      tr.appendChild(el("td", "num", money(g.tax)));
      tb.appendChild(tr);
    });

    // IHT400 or excepted
    if (r.excepted) {
      verdict("out-iht400", "good", "Probably an excepted estate: no Inheritance Tax form",
        ["The estate looks like an ", { b: r.exceptedRoute === "low" ? "excepted estate (low value)" : "excepted estate (left to a spouse, civil partner or charity)" },
         ". You don't send HMRC an IHT400; you give the estate's values in the probate application" + (r.nrbTransferred > 0 ? " and claim the late spouse's unused nil rate band there too" : "") + ". This assumes no trusts, foreign assets over £100,000 or gifts the person kept using. ",
         ["GOV.UK: excepted estates", S.value + "/check-type-of-estate"]]);
    } else {
      var rs = r.notExceptedReasons.map(function (k) { return REASONS[k]; }).join("; ");
      verdict("out-iht400", r.totalTax > 0 ? "bad" : "warn", "Form IHT400 likely needed",
        ["Full details probably have to go to HMRC because " + rs + ". Send the IHT400 within 12 months of the death, before applying for probate" + (r.totalTax > 0 ? ", and pay the tax by the end of the sixth month after the death to avoid interest (7.75% a year at present)" : "") + ". Likely forms: "],
        r.forms.map(function (f) { return [FORM_NAMES[f] || f]; }).concat([[["GOV.UK: IHT400 and schedules", "https://www.gov.uk/government/publications/inheritance-tax-inheritance-tax-account-iht400"]]]));
    }

    // Probate
    var feeText = r.probateFee > 0 ? "The application fee would be " + money(r.probateFee, 0) + " because the estate's value for probate (" + whole(r.probateNet) + ") is over £5,000, plus £2 for each extra copy you order with the application." : "There's no application fee because the estate's value for probate (" + whole(r.probateNet) + ") is £5,000 or less.";
    if (r.probateLikely === "yes") {
      verdict("out-probate", "warn", "Probate: very likely needed",
        ["Property or land in their sole name (or as tenants in common) usually can't be sold or transferred without a grant of probate. " + feeText + " ", ["GOV.UK: applying for probate", S.probate]]);
    } else if (r.probateLikely === "maybe") {
      verdict("out-probate", "warn", "Probate: maybe, so ask each bank",
        ["Each bank, building society and investment firm has its own limit for releasing money without probate. Ask them before you apply. If you do apply: " + feeText + " ", ["GOV.UK: check if probate is needed", S.probate]]);
    } else {
      verdict("out-probate", "good", "Probate: probably not needed",
        ["Everything here passes automatically to a joint owner, or is outside the probate estate. Check with each organisation, and see GOV.UK if anything is in their sole name. ", ["GOV.UK: applying for probate", S.probate]]);
    }

    // Unused allowance for the surviving spouse
    if (r.transferable) {
      verdict("out-transfer", "good", "Unused allowance the surviving spouse or civil partner could inherit",
        ["About ", { b: pctText(r.transferable.nrbPct) }, " of the nil rate band (" + whole(r.transferable.nrbUnused) + " today) and ",
         { b: pctText(r.transferable.rnrbPct) }, " of the residence nil rate band (" + whole(r.transferable.rnrbUnused) + " today) would be unused. Their executors can claim these percentages when the survivor dies. Keep a copy of the will, the estate values and any IHT forms. ",
         ["GOV.UK: transferring unused threshold", S.nrbTransfer]]);
    } else $("out-transfer").hidden = true;

    // Notes
    $("out-notes").textContent = "";
    if (r.taxable > 0 && !r.charityQualifies && r.charityNeeded > 0)
      note([{ b: "36% charity rate: " }, "leaving at least about " + whole(r.charityNeeded) + " to charity (10% of the baseline amount) would cut the rate on the estate to 36%. Beneficiaries usually still get less overall; HMRC has a ", ["reduced rate calculator", "https://www.gov.uk/inheritance-tax-reduced-rate-calculator"], " for exact figures. Beneficiaries can sometimes do this after the death with a deed of variation."]);
    if (r.taper > 0)
      note([{ b: "Taper: " }, "the net estate is " + whole(r.net) + ", so the residence nil rate band is reduced by " + whole(Math.min(r.taper, r.rnrbDefault)) + " (£1 for every £2 over £2 million). ", ["GOV.UK", S.rnrb]]);
    if (r.homeNet > 0 && r.closelyInherited === 0 && r.status !== "married")
      note([{ b: "No residence allowance: " }, "the home isn't going to children or grandchildren, so the residence nil rate band doesn't apply."]);
    if (r.pensionsEntered > 0 && r.pensionsIncluded === 0)
      note([{ b: "Pensions: " }, "the " + whole(r.pensionsEntered) + " of unused pensions is left out because the death is before 6 April 2027. Check with the provider. ", ["GOV.UK", S.pensions]]);
    if (r.pensionsIncluded > 0)
      note([{ b: "Pensions: " }, whole(r.pensionsIncluded) + " of unused pensions is included (deaths from 6 April 2027). Some reporting regulations were still being finalised when this page was checked, so treat this part as provisional. ", ["GOV.UK", S.pensions]]);
    if (r.giftsTaxable > 0)
      note([{ b: "Tax on gifts: " }, "the gifts exceed the nil rate band, so " + money(r.giftsTax) + " is due on them" + (r.giftsTaperRelief > 0 ? " after " + money(r.giftsTaperRelief) + " of taper relief" : "") + ". The people who received the gifts normally pay this. ", ["GOV.UK: rules on giving gifts", S.gifts]]);
    if (r.homeJoint && r.status === "single")
      note([{ b: "Joint home: " }, "for property owned as joint tenants with people other than a spouse, GOV.UK says to divide the value by the number of owners and take 10% off the deceased's share. Enter that reduced value. ", ["GOV.UK", S.value + "/estimate-estate-value"]]);

    renderSteps(r);
  }

  function renderSteps(r) {
    var ol = $("steps"); ol.textContent = "";
    var steps = [];
    steps.push([{ b: "Register the death" }, " within 5 days of the medical examiner's confirmation, and use Tell Us Once to tell government departments. ", ["GOV.UK: after a death", "https://www.gov.uk/after-a-death"]]);
    steps.push([{ b: "Value the estate. " }, "Write to each bank, pension provider, investment firm and creditor with a copy of the death certificate and ask for the value on the date of death. List any gifts from the last 7 years. ", ["GOV.UK: value the estate", S.value]]);
    if (r.excepted) {
      steps.push([{ b: "No Inheritance Tax form. " }, "As an excepted estate you put the values into the probate application" + (r.nrbTransferred > 0 ? ", where you also claim the late spouse's unused nil rate band (within 2 years of this death)" : "") + "."]);
    } else {
      steps.push([{ b: "Send form IHT400" }, (r.forms.length > 1 ? " with schedules " + r.forms.filter(function (f) { return f !== "IHT400"; }).join(", ") : "") + " to HMRC within 12 months, before applying for probate. ", ["GOV.UK: IHT400", "https://www.gov.uk/government/publications/inheritance-tax-inheritance-tax-account-iht400"]]);
      if (r.totalTax > 0) {
        steps.push([{ b: "Pay the tax: " }, "get an Inheritance Tax reference at least 3 weeks before paying, and pay by the end of the sixth month after the death (for a death in January, by 31 July). You can usually pay from the deceased's bank account, and tax on property can be paid in 10 yearly instalments. ", ["GOV.UK: pay Inheritance Tax", S.pay]]);
        steps.push([{ b: "Wait for HMRC's code" }, ", usually within 20 working days of them getting the IHT400 or payment, whichever is later. You need it to apply for probate."]);
      }
    }
    if (r.probateLikely !== "no")
      steps.push([{ b: "Apply for probate" }, " online (or by post on PA1P with a will, PA1A without). " + (r.probateFee > 0 ? "Fee £526, plus £2 per extra copy ordered at the same time." : "No fee for an estate of £5,000 or less.") + " It usually takes up to 12 weeks. ", ["GOV.UK: apply for probate", S.probate]]);
    steps.push([{ b: "Collect the assets, pay the debts and keep estate accounts. " }, "Pay bills and taxes before sharing anything out, record every payment in and out, and send the final accounts to the beneficiaries. HMRC can ask to see records for up to 20 years. ", ["GOV.UK: deal with the estate", "https://www.gov.uk/valuing-estate-of-someone-who-died/records"]]);
    if (r.transferable) steps.push([{ b: "Keep a record of unused allowances" }, " for the surviving spouse or civil partner's estate."]);
    steps.push([{ b: "Want it all in one place? " }, "The ", ["Executor & Probate Tracker (England & Wales)", "https://arthurverse67.gumroad.com/l/sutaw/LAUNCH25"], " spreadsheet from the maker of this calculator has these tasks, an assets and debts register, an IHT estimate and an estate ledger that should balance to £0 (£19.99, optional)."]);
    steps.forEach(function (s) { var li = el("li"); li.appendChild(frag(s)); ol.appendChild(li); });
  }

  function update() {
    syncUi();
    var r = P.estimate(readInputs());
    r.homeJoint = $("home-joint").checked;
    render(r);
  }

  document.getElementById("iht-form").addEventListener("input", update);
  document.getElementById("iht-form").addEventListener("change", update);
  update();
})();
