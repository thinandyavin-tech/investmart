// Terminal-Anchored Reverse DCF — InvestMart's own implementation.
// Technique: Mauboussin (2001) "Expectations Investing" — public academic method.
// Pure functions: zero I/O, safe to import on server and client.

export type EvSource = "direct" | "marketCapProxy";
export type Verdict  = "expensive" | "fair" | "cheap";

export interface RdcfInputs {
  readonly ev:               number;          // raw USD
  readonly revenueTTM:       number;          // raw USD
  readonly wacc:             number;          // decimal, e.g. 0.10
  readonly g:                number;          // terminal growth rate, e.g. 0.03
  readonly terminalMargin:   number;          // decimal FCFF margin at terminal year
  readonly taxRate:          number;          // decimal
  readonly roic:             number;          // decimal
  readonly n:                number;          // explicit forecast years
  readonly historicalCAGR3Y: number | null;   // decimal or null if unavailable
  readonly tam:              number | null;   // raw USD or null
  readonly maxPenetration:   number;          // decimal
  readonly buffer:           number;          // gap threshold for verdict
  readonly absoluteCap:      number;          // hard ceiling for plausible CAGR
}

export interface RdcfSuccess {
  readonly kind:             "success";
  readonly tv:               number;
  readonly fcff:             number;
  readonly reinvestmentRate: number;
  readonly clampedReinvest:  boolean;
  readonly impliedRevenue:   number;
  readonly impliedCAGR:      number;
  readonly capAFade:         number | null;
  readonly capA:             number | null;
  readonly capB:             number | null;
  readonly capC:             number;
  readonly plausibleCAGR:    number;
  readonly plausibleSource:  string;
  readonly gap:              number;
  readonly verdict:          Verdict;
}

export interface RdcfError {
  readonly kind:   "error";
  readonly reason: "wacc_lte_g" | "negative_implied_revenue" | "invalid_inputs";
}

export type RdcfResult = RdcfSuccess | RdcfError;

// Growth decays with scale — larger companies face harder comparables.
export function fadeFactor(revenueTTM: number): number {
  const b = revenueTTM / 1e9;
  if (b < 1)   return 1.00;
  if (b < 10)  return 0.85;
  if (b < 100) return 0.70;
  return 0.50;
}

export function computeRdcf(inputs: RdcfInputs): RdcfResult {
  const {
    ev, revenueTTM, wacc, g, terminalMargin, taxRate, roic, n,
    historicalCAGR3Y, tam, maxPenetration, buffer, absoluteCap,
  } = inputs;

  if (ev <= 0 || revenueTTM <= 0 || terminalMargin <= 0) {
    return { kind: "error", reason: "invalid_inputs" };
  }
  // Gordon Growth requires WACC > g to avoid TV → ∞ or TV < 0
  if (wacc <= g) {
    return { kind: "error", reason: "wacc_lte_g" };
  }

  // Step 1: Compound today's EV forward at WACC to get the embedded terminal value
  const tv = ev * Math.pow(1 + wacc, n);

  // Step 2: Rearrange Gordon Growth (TV = FCFF / (WACC − g))
  const fcff = tv * (wacc - g);

  // Step 3: Reinvestment rate — cap at 0.99 to avoid degenerate output
  const rawReinvest    = g / roic;
  const clampedReinvest = rawReinvest > 0.99;
  const reinvestmentRate = Math.min(0.99, rawReinvest);

  // Step 4: Back out to revenue: FCFF = Rev × margin × (1−tax) × (1−reinvest)
  const denom = terminalMargin * (1 - taxRate) * (1 - reinvestmentRate);
  if (denom <= 0) return { kind: "error", reason: "negative_implied_revenue" };

  const impliedRevenue = fcff / denom;
  if (impliedRevenue <= 0) return { kind: "error", reason: "negative_implied_revenue" };

  // Step 5: Implied CAGR — N+1 period (today=0, terminal=N+1 per convention)
  const rawCAGR    = Math.pow(impliedRevenue / revenueTTM, 1 / (n + 1)) - 1;
  const impliedCAGR = Math.max(rawCAGR, -0.9999); // guard against NaN from negative base

  // Step 6: Three plausible-CAGR caps
  const fade  = fadeFactor(revenueTTM);
  const capA  = historicalCAGR3Y !== null ? historicalCAGR3Y * fade : null;
  const capB  = tam !== null && tam > 0 && maxPenetration > 0
    ? Math.pow((maxPenetration * tam) / revenueTTM, 1 / (n + 1)) - 1
    : null;
  const capC  = absoluteCap;

  const available: { cap: number; source: string }[] = [];
  if (capA !== null) available.push({ cap: capA, source: "Cap A (Historical × Fade)" });
  if (capB !== null) available.push({ cap: capB, source: "Cap B (TAM Penetration)" });
  available.push({ cap: capC, source: "Cap C (Absolute Ceiling)" });

  const binding       = available.reduce((a, b) => b.cap < a.cap ? b : a);
  const plausibleCAGR = binding.cap;
  const plausibleSource = binding.source;

  // Step 7: Verdict
  const gap     = impliedCAGR - plausibleCAGR;
  const verdict: Verdict =
    gap > buffer  ? "expensive" :
    gap < -buffer ? "cheap"     : "fair";

  return {
    kind: "success",
    tv, fcff, reinvestmentRate, clampedReinvest,
    impliedRevenue, impliedCAGR,
    capAFade: capA !== null ? fade : null, capA, capB, capC,
    plausibleCAGR, plausibleSource,
    gap, verdict,
  };
}

// ── Suitability Flag ──────────────────────────────────────────────────────────

export type Suitability = "good_fit" | "stress_test";

export interface SuitabilityResult {
  suitability: Suitability;
  reason:      string;
}

const MATURE_RE = /bank|util|insurance|consumer.?def|telecom|reit|food.?proc|tobacco|regulated/i;

export function computeSuitabilityFlag(
  industry:    string | null,
  impliedCAGR: number,
): SuitabilityResult {
  if (industry && MATURE_RE.test(industry)) {
    return {
      suitability: "stress_test",
      reason: `${industry} companies generate significant near-term cash flows — Terminal-Anchored DCF overstates required CAGR here. Interpret as a stress test only.`,
    };
  }
  if (impliedCAGR > 0.5) {
    return {
      suitability: "stress_test",
      reason: "Implied CAGR >50% is extreme — verify EV and revenue inputs. Pre-revenue companies make terminal anchoring highly uncertain.",
    };
  }
  return {
    suitability: "good_fit",
    reason: "Growth/pre-profit company where most value is in the terminal period — good fit for Terminal-Anchored Reverse DCF.",
  };
}

// ── Fair-Value Price Zones (inverse of Reverse DCF) ───────────────────────────

export interface PriceZones {
  accumulate: number;   // price implied by 0.8 × plausibleCAGR
  fair:       number;   // price implied by plausibleCAGR
  expensive:  number;   // price implied by 1.2 × plausibleCAGR
  mosPct:     number;   // (fair − currentPrice) / fair
}

function cagrToEV(
  cagr: number, r0: number, wacc: number, g: number,
  terminalMargin: number, taxRate: number, roic: number, n: number,
): number {
  const impliedRevenue = r0 * Math.pow(1 + cagr, n + 1);
  const reinvest       = Math.min(0.99, g / roic);
  const fcff           = impliedRevenue * terminalMargin * (1 - taxRate) * (1 - reinvest);
  const tv             = fcff / (wacc - g);
  return tv / Math.pow(1 + wacc, n);
}

export function computePriceZones(
  plausibleCAGR:  number,
  r0:             number,    // raw USD
  wacc:           number,
  g:              number,
  terminalMargin: number,
  taxRate:        number,
  roic:           number,
  n:              number,
  netDebt:        number,    // raw USD, positive = more debt than cash
  shares:         number,    // total share count
  currentPrice:   number,
): PriceZones | null {
  if (shares <= 0 || r0 <= 0 || wacc <= g || plausibleCAGR <= 0) return null;
  const toPrice = (cagr: number): number => {
    const ev     = cagrToEV(cagr, r0, wacc, g, terminalMargin, taxRate, roic, n);
    return Math.max(0, (ev - netDebt) / shares);
  };
  const fair       = toPrice(plausibleCAGR);
  const accumulate = toPrice(plausibleCAGR * 0.80);
  const expensive  = toPrice(plausibleCAGR * 1.20);
  const mosPct     = fair > 0 ? (fair - currentPrice) / fair : 0;
  return { accumulate, fair, expensive, mosPct };
}

// ── Reverse P/E (beginner companion) ──────────────────────────────────────────

/**
 * Implied EPS CAGR from current P/E, assumed exit P/E, years, and cost of equity.
 * g = (currentPE × (1+coe)^N / exitPE)^(1/N) − 1
 */
export function computeReversePE(
  currentPE: number,
  exitPE:    number,
  years:     number,
  coe:       number,
): number | null {
  if (currentPE <= 0 || exitPE <= 0 || years <= 0 || coe <= 0) return null;
  return Math.pow(currentPE * Math.pow(1 + coe, years) / exitPE, 1 / years) - 1;
}

// ── Expected-Return Estimator ─────────────────────────────────────────────────

export interface ExpectedReturn {
  exitEPS:      number;
  exitPrice:    number;
  annualReturn: number;
}

export function computeExpectedReturn(
  currentPrice: number,
  currentEPS:   number,
  epsGrowth:    number,
  exitPE:       number,
  years:        number,
): ExpectedReturn | null {
  if (currentPrice <= 0 || currentEPS <= 0 || years <= 0 || exitPE <= 0) return null;
  const exitEPS      = currentEPS * Math.pow(1 + epsGrowth, years);
  const exitPrice    = exitEPS * exitPE;
  const annualReturn = Math.pow(exitPrice / currentPrice, 1 / years) - 1;
  return { exitEPS, exitPrice, annualReturn };
}

// ── Position-Sizing Helper ────────────────────────────────────────────────────

export type ConvictionTier = 1 | 2 | 3 | 4 | 5;
const TIER_MULT: Record<ConvictionTier, number> = { 1: 0.20, 2: 0.40, 3: 0.60, 4: 0.80, 5: 1.00 };

export function computePositionSize(
  portfolioValue: number,
  conviction:     ConvictionTier,
  maxSinglePct:   number,   // decimal, e.g. 0.10 for 10%
): { suggestedPct: number; dollarAmount: number } {
  const pct = maxSinglePct * TIER_MULT[conviction];
  return { suggestedPct: pct, dollarAmount: portfolioValue * pct };
}
