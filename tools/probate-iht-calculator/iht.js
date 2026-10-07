/*!
 * England & Wales probate and Inheritance Tax estimate calculator: calculation engine (no DOM).
 * Estimate only, not tax or legal advice. Figures checked against GOV.UK on 6 October 2026.
 * Sources are listed in RATES.sources and in README.md.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.ProbateIHT = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var RATES = {
    nrb: 325000,                 // nil rate band, fixed to 5 April 2031
    rnrb: 175000,                // residence nil rate band, fixed to 5 April 2031
    rnrbTaperThreshold: 2000000, // RNRB reduced by £1 for every £2 above this
    rate: 0.40,
    charityRate: 0.36,           // if 10%+ of the "baseline amount" goes to charity
    charityShare: 0.10,
    // Tax on a gift above the nil rate band, by years between gift and death
    giftBands: [
      { key: "0-3", label: "less than 3 years", rate: 0.40 },
      { key: "3-4", label: "3 to 4 years", rate: 0.32 },
      { key: "4-5", label: "4 to 5 years", rate: 0.24 },
      { key: "5-6", label: "5 to 6 years", rate: 0.16 },
      { key: "6-7", label: "6 to 7 years", rate: 0.08 }
    ],
    excepted: {
      grossLimitExempt: 3000000, // exempt excepted estates (spouse/charity), deaths from 1 Jan 2022
      giftsLimit: 250000,        // specified transfers limit, deaths from 1 Jan 2022
      maxNrbMultiple: 2          // low value limit can be up to 2 x NRB with a transferred NRB
    },
    probate: { fee: 526, feeThreshold: 5000, copyAtApplication: 2, copyLater: 16, feeFrom: "13 July 2026", oldFee: 300 },
    pensionsFrom: "6 April 2027",
    lateInterest: 0.0775,        // HMRC late payment interest from 9 January 2026
    checked: "6 October 2026",
    sources: {
      overview: "https://www.gov.uk/inheritance-tax",
      thresholds: "https://www.gov.uk/government/publications/rates-and-allowances-inheritance-tax-thresholds-and-interest-rates/inheritance-tax-thresholds-and-interest-rates",
      freeze: "https://www.gov.uk/government/publications/inheritance-tax-thresholds/inheritance-tax-thresholds",
      rnrb: "https://www.gov.uk/guidance/inheritance-tax-residence-nil-rate-band",
      rnrbQualify: "https://www.gov.uk/guidance/check-if-you-can-get-an-additional-inheritance-tax-threshold",
      rnrbTransfer: "https://www.gov.uk/guidance/inheritance-tax-transfer-of-threshold",
      nrbTransfer: "https://www.gov.uk/guidance/transferring-unused-basic-threshold-for-inheritance-tax",
      gifts: "https://www.gov.uk/inheritance-tax/gifts",
      charity: "https://www.gov.uk/hmrc-internal-manuals/inheritance-tax-manual/ihtm45009",
      value: "https://www.gov.uk/valuing-estate-of-someone-who-died",
      excepted: "https://www.gov.uk/hmrc-internal-manuals/inheritance-tax-manual/ihtm06011",
      probate: "https://www.gov.uk/applying-for-probate",
      probateFees: "https://www.gov.uk/applying-for-probate/fees",
      pensions: "https://www.gov.uk/government/publications/inheritance-tax-unused-pension-funds-and-death-benefits",
      apr: "https://www.gov.uk/guidance/agricultural-relief-on-inheritance-tax",
      bpr: "https://www.gov.uk/business-relief-inheritance-tax",
      pay: "https://www.gov.uk/paying-inheritance-tax"
    }
  };

  function r2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }
  function num(v) { v = Number(v); return isFinite(v) && v > 0 ? v : 0; }
  function pct(v) { return Math.min(100, num(v)) / 100; }
  function bandFor(key) {
    for (var i = 0; i < RATES.giftBands.length; i++) if (RATES.giftBands[i].key === key) return RATES.giftBands[i];
    return RATES.giftBands[0];
  }

  /**
   * inputs: {
   *   status: "single" | "married" | "widowed",
   *   deathFromApril2027: bool,              // include unused pension pots (Finance Act 2026)
   *   home, homeMortgage, homeJoint (bool: joint tenants, passes automatically),
   *   otherProperty, savings, investments, otherAssets, pensions,
   *   otherJoint (joint accounts etc. passing automatically; included in the figures above),
   *   debts, funeral,
   *   spouseMode: "all" | "amount" | "none", spouseAmount, charity,
   *   homeToDescendantsPct (0-100),
   *   transferNrbPct, transferRnrbPct (0-100, widowed only),
   *   gifts: [{ amount, band: "0-3" | "3-4" | "4-5" | "5-6" | "6-7" }]
   * }
   * overrides (tests only): { nrb, rnrb }
   */
  function estimate(inp, overrides) {
    inp = inp || {};
    var NRB = overrides && overrides.nrb != null ? overrides.nrb : RATES.nrb;
    var RNRB = overrides && overrides.rnrb != null ? overrides.rnrb : RATES.rnrb;
    var status = inp.status === "married" || inp.status === "widowed" ? inp.status : "single";
    var married = status === "married", widowed = status === "widowed";

    // ---- 1. Value of the estate ----
    var home = num(inp.home), mortgage = Math.min(num(inp.homeMortgage), home);
    var pensionsEntered = num(inp.pensions);
    var pensionsIncluded = inp.deathFromApril2027 ? pensionsEntered : 0;
    var assets = {
      home: home, otherProperty: num(inp.otherProperty), savings: num(inp.savings),
      investments: num(inp.investments), otherAssets: num(inp.otherAssets), pensions: pensionsIncluded
    };
    var gross = r2(assets.home + assets.otherProperty + assets.savings + assets.investments + assets.otherAssets + assets.pensions);
    var debts = num(inp.debts), funeral = num(inp.funeral);
    var liabilities = r2(mortgage + debts + funeral);
    var net = r2(Math.max(0, gross - liabilities));

    // ---- 2. Exemptions ----
    var charity = r2(Math.min(num(inp.charity), net));
    var spouse = 0;
    if (married) {
      if (inp.spouseMode === "all") spouse = r2(Math.max(0, net - charity));
      else if (inp.spouseMode === "amount") spouse = r2(Math.min(num(inp.spouseAmount), Math.max(0, net - charity)));
    }
    var chargeable = r2(Math.max(0, net - spouse - charity));

    // ---- 3. Nil rate band and gifts in the 7 years before death (oldest first) ----
    var nrbTransferPct = widowed ? pct(inp.transferNrbPct) : 0;
    var rnrbTransferPct = widowed ? pct(inp.transferRnrbPct) : 0;
    var nrbTransferred = r2(NRB * nrbTransferPct);
    var nrbTotal = r2(NRB + nrbTransferred);
    var order = ["6-7", "5-6", "4-5", "3-4", "0-3"];
    var gifts = (inp.gifts || []).map(function (g, i) { return { index: i, amount: num(g && g.amount), band: bandFor(g && g.band) }; })
      .filter(function (g) { return g.amount > 0; })
      .sort(function (a, b) { return order.indexOf(a.band.key) - order.indexOf(b.band.key) || a.index - b.index; });
    var remaining = nrbTotal, giftsTotal = 0, giftsTax = 0, giftsTaperRelief = 0, giftsTaxable = 0;
    gifts.forEach(function (g) {
      var covered = Math.min(g.amount, remaining);
      remaining = r2(remaining - covered);
      g.covered = r2(covered);
      g.taxable = r2(g.amount - covered);
      g.rate = g.band.rate;
      g.tax = r2(g.taxable * g.band.rate);
      g.taperRelief = r2(g.taxable * RATES.rate - g.tax);
      giftsTotal = r2(giftsTotal + g.amount);
      giftsTaxable = r2(giftsTaxable + g.taxable);
      giftsTax = r2(giftsTax + g.tax);
      giftsTaperRelief = r2(giftsTaperRelief + g.taperRelief);
    });
    var nrbUsedByGifts = r2(Math.min(giftsTotal, nrbTotal));
    var nrbForEstate = r2(Math.max(0, nrbTotal - giftsTotal));

    // ---- 4. Residence nil rate band ----
    var homeNet = r2(home - mortgage);
    var closelyInherited = r2(homeNet * pct(inp.homeToDescendantsPct));
    var rnrbDefault = r2(RNRB * (1 + rnrbTransferPct));
    var taper = r2(Math.max(0, (net - RATES.rnrbTaperThreshold) / 2));
    var rnrbAdjusted = r2(Math.max(0, rnrbDefault - taper));
    var rnrb = r2(Math.min(closelyInherited, rnrbAdjusted));
    var rnrbUsed = r2(Math.min(rnrb, chargeable));

    // ---- 5. Taxable estate and rate ----
    var afterRnrb = r2(chargeable - rnrbUsed);
    var nrbUsedByEstate = r2(Math.min(nrbForEstate, afterRnrb));
    var taxable = r2(afterRnrb - nrbUsedByEstate);
    var baseline = r2(Math.max(0, chargeable - nrbForEstate) + charity);
    var charityQualifies = charity > 0 && charity >= RATES.charityShare * baseline - 0.005;
    var charityNeeded = Math.ceil(RATES.charityShare * Math.max(0, net - spouse - nrbForEstate) - 1e-9);
    var rate = charityQualifies ? RATES.charityRate : RATES.rate;
    var estateTax = r2(taxable * rate);
    var estateTaxFull = r2(taxable * RATES.rate);
    var totalTax = r2(estateTax + giftsTax);

    // ---- 6. Unused allowance that could pass to a surviving spouse or civil partner ----
    var transferable = null;
    if (married) {
      var nrbUnused = r2(Math.max(0, NRB - nrbUsedByGifts - nrbUsedByEstate));
      var ownRnrbAfterTaper = r2(Math.max(0, RNRB - taper));
      var rnrbUnused = r2(Math.max(0, ownRnrbAfterTaper - rnrbUsed));
      transferable = {
        nrbUnused: nrbUnused, nrbPct: Math.round(nrbUnused / NRB * 10000) / 100,
        rnrbUnused: rnrbUnused, rnrbPct: Math.round(rnrbUnused / RNRB * 10000) / 100
      };
    }

    // ---- 7. IHT400 or excepted estate ----
    var E = RATES.excepted;
    var grossWithGifts = r2(gross + giftsTotal);
    var lowLimit = nrbTransferPct > 0 ? Math.min(E.maxNrbMultiple * NRB, nrbTotal) : NRB;
    var lowValue = grossWithGifts <= lowLimit;
    var exemptRoute = (spouse + charity) > 0 && grossWithGifts <= E.grossLimitExempt && r2(chargeable + giftsTotal) <= lowLimit;
    var reasons = [];
    if (totalTax > 0) reasons.push("tax");
    if (giftsTotal > E.giftsLimit) reasons.push("gifts");
    if (grossWithGifts > E.grossLimitExempt) reasons.push("over3m");
    if (!lowValue && !exemptRoute && totalTax === 0) reasons.push(rnrbUsed > 0 ? "rnrb" : "overLimit");
    var excepted = reasons.length === 0 && (lowValue || exemptRoute);
    var forms = [];
    if (!excepted) {
      forms.push("IHT400");
      if (rnrb > 0 || rnrbTransferPct > 0) forms.push("IHT435");
      if (rnrbTransferPct > 0) forms.push("IHT436");
      if (nrbTransferPct > 0) forms.push("IHT402");
      if (giftsTotal > 0) forms.push("IHT403");
      if (charityQualifies && taxable > 0) forms.push("IHT430");
    }

    // ---- 8. Probate ----
    var jointValue = r2(Math.min((inp.homeJoint ? home : 0) + num(inp.otherJoint), gross - pensionsIncluded));
    var probateGross = r2(Math.max(0, gross - pensionsIncluded - jointValue));
    var probateDebts = r2(debts + funeral + (inp.homeJoint ? 0 : mortgage));
    var probateNet = r2(Math.max(0, probateGross - probateDebts));
    var soleProperty = (home > 0 && !inp.homeJoint) || assets.otherProperty > 0;
    var probateLikely = soleProperty ? "yes" : (probateGross > 0 ? "maybe" : "no");
    var probateFee = probateNet > RATES.probate.feeThreshold ? RATES.probate.fee : 0;

    return {
      rates: RATES, nrb: NRB, rnrbMax: RNRB, status: status,
      assets: assets, pensionsEntered: pensionsEntered, pensionsIncluded: pensionsIncluded,
      gross: gross, mortgage: mortgage, debts: debts, funeral: funeral, liabilities: liabilities, net: net,
      spouse: spouse, charity: charity, chargeable: chargeable,
      nrbOwn: NRB, nrbTransferred: nrbTransferred, nrbTotal: nrbTotal, nrbUsedByGifts: nrbUsedByGifts,
      nrbForEstate: nrbForEstate, nrbUsedByEstate: nrbUsedByEstate,
      gifts: gifts, giftsTotal: giftsTotal, giftsTaxable: giftsTaxable, giftsTax: giftsTax, giftsTaperRelief: giftsTaperRelief,
      homeNet: homeNet, closelyInherited: closelyInherited, rnrbDefault: rnrbDefault, rnrbTransferred: r2(RNRB * rnrbTransferPct),
      taper: taper, rnrbAdjusted: rnrbAdjusted, rnrb: rnrb, rnrbUsed: rnrbUsed,
      taxable: taxable, baseline: baseline, charityQualifies: charityQualifies, charityNeeded: charityNeeded,
      rate: rate, estateTax: estateTax, estateTaxFull: estateTaxFull, totalTax: totalTax,
      transferable: transferable,
      excepted: excepted, exceptedRoute: excepted ? (lowValue ? "low" : "exempt") : null, exceptedLimit: lowLimit,
      notExceptedReasons: reasons, forms: forms,
      jointValue: jointValue, probateGross: probateGross, probateDebts: probateDebts, probateNet: probateNet,
      soleProperty: soleProperty, probateLikely: probateLikely, probateFee: probateFee
    };
  }

  return { RATES: RATES, estimate: estimate, r2: r2 };
});
