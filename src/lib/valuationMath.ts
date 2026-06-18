/**
 * Multiple-Growth 5Y model — EPS × P/E valuation.
 *
 * Multiple-Growth 5Y Template — EPS-based valuation model.
 * Model: project EPS N years forward at CAGR g, multiply by target P/E,
 * discount back to present at cost-of-equity r.
 *
 * Mode controls how aggressively the P/E mean-reverts toward the 5Y average:
 *   Aggressive  — P/E reaches the full 5Y average by year N
 *   Base        — halfway between current P/E and 5Y average (geometric mid)
 *   Conservative — 25% of the gap toward 5Y average
 */

export type ValuationMode = "Aggressive" | "Base" | "Conservative";

export interface ValuationInputs {
  price:       number;   // P0 — current price
  eps1:        number;   // EPS₁ — next-year (forward) EPS
  g:           number;   // EPS CAGR (decimal, e.g. 0.45 = 45%)
  n:           number;   // projection years (typically 5)
  r:           number;   // cost of equity (decimal, e.g. 0.107)
  avgPE:       number;   // 5Y average forward P/E (or sector median)
  mode:        ValuationMode;
  manualPE?:   number;   // override target P/E — bypasses mode
}

export interface ValuationResult {
  m0:          number;   // current forward P/E = P0 / EPS₁
  targetPE:    number;   // P/E at year N
  mg:          number;   // implied P/E CAGR per year
  epsN:        number;   // EPS at year N = EPS₁ × (1+g)^N
  targetPrice: number;   // Pₙ = EPSₙ × targetPE
  pvToday:     number;   // present value = Pₙ / (1+r)^N
  priceCagr:   number;   // price CAGR over N years = (Pₙ/P0)^(1/N) − 1
  upsidePct:   number;   // (pvToday/P0) − 1
  mosPct:      number;   // margin of safety vs PV (pvToday−P0)/P0 if PV>P0, else negative
  valid:       boolean;
  error?:      string;
}

/** Compute target P/E from mode and inputs. */
function computeTargetPE(m0: number, avgPE: number, mode: ValuationMode, manualPE?: number): number {
  if (manualPE && manualPE > 0) return manualPE;

  // Blending in log space so the ratio is consistent
  const logM0  = Math.log(m0);
  const logAvg = Math.log(avgPE);

  const blend: Record<ValuationMode, number> = {
    Aggressive:   1.00,   // full reversion to 5Y avg
    Base:         0.50,   // halfway (geometric mean)
    Conservative: 0.25,   // quarter of the way
  };

  return Math.exp(logM0 + blend[mode] * (logAvg - logM0));
}

export function computeValuation(inputs: ValuationInputs): ValuationResult {
  const { price, eps1, g, n, r, avgPE, mode, manualPE } = inputs;

  if (price <= 0 || eps1 <= 0 || n <= 0 || r <= 0) {
    return { m0: 0, targetPE: 0, mg: 0, epsN: 0, targetPrice: 0, pvToday: 0, priceCagr: 0, upsidePct: 0, mosPct: 0, valid: false, error: "Inputs must be positive" };
  }
  if (avgPE <= 0) {
    return { m0: 0, targetPE: 0, mg: 0, epsN: 0, targetPrice: 0, pvToday: 0, priceCagr: 0, upsidePct: 0, mosPct: 0, valid: false, error: "5Y Avg P/E must be positive" };
  }

  const m0        = price / eps1;
  const targetPE  = computeTargetPE(m0, avgPE, mode, manualPE);
  const mg        = Math.pow(targetPE / m0, 1 / n) - 1;
  const epsN      = eps1 * Math.pow(1 + g, n);
  const targetPrice = epsN * targetPE;
  const pvToday   = targetPrice / Math.pow(1 + r, n);
  const priceCagr = Math.pow(targetPrice / price, 1 / n) - 1;
  const upsidePct = pvToday / price - 1;
  const mosPct    = (pvToday - price) / pvToday; // margin of safety as % of intrinsic value

  return { m0, targetPE, mg, epsN, targetPrice, pvToday, priceCagr, upsidePct, mosPct, valid: true };
}

/** Format a decimal as a percentage string. */
export function fmtPct(v: number, decimals = 1): string {
  const pct = v * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(decimals)}%`;
}

/** Format a multiplier (e.g. P/E). */
export function fmtX(v: number, decimals = 1): string {
  return `${v.toFixed(decimals)}×`;
}
