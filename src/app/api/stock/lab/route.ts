/**
 * Valuation Lab auto-fill — fetches real fundamentals for the Reverse DCF page.
 * Returns each field with a source note + time basis so the UI can show provenance.
 * Honest N/A where data is unavailable on the free tier.
 */

import { NextRequest, NextResponse } from "next/server";
import { z }                         from "zod";
import { lookupIndustry }            from "@/lib/damodaran";
import { applyRateLimit }            from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const TICKER_RE  = /^[A-Z][A-Z.\-]{0,9}$/;
const CACHE_TTL  = 5 * 60_000;

const QuerySchema = z.object({ ticker: z.string().regex(TICKER_RE) });

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LabField<T> {
  value:  T;
  source: string;     // e.g. "Finnhub, LTM"
  basis:  string;     // e.g. "FY2024" | "LTM" | "NTM" | "estimate"
  verify: boolean;    // true = user should manually verify
}

export interface LabAutoFill {
  ticker:          string;
  name:            string | null;
  industry:        string | null;
  // Core RDCF inputs
  ev:              LabField<number | null>;   // $B
  r0:              LabField<number | null>;   // $B current revenue
  price:           LabField<number | null>;   // $ current price
  shares:          LabField<number | null>;   // B shares outstanding
  netDebt:         LabField<number | null>;   // $B (positive=debt, negative=net cash)
  wacc:            LabField<number | null>;   // decimal
  terminalMargin:  LabField<number | null>;   // decimal
  hist3Y:          LabField<number | null>;   // decimal
  forwardCagr:     LabField<number | null>;   // decimal
  analystTarget:   LabField<number | null>;   // $ price target
  // Context
  evSales:         number | null;
  marketCap:       number | null;            // $B
  sanityNotes:     string[];
}

interface FinnhubQuote   { c: number; dp: number; }
interface FinnhubProfile { name?: string; finnhubIndustry?: string; marketCapitalization?: number; shareOutstanding?: number; }
interface FinnhubMetric  {
  revenueTTM?:              number;
  revenueGrowth3Y?:         number;
  revenue3YGrowth?:         number;
  netMarginTTM?:            number;
  netProfitMarginTTM?:      number;
  enterpriseValue?:         number;
  marketCapitalization?:    number;
  "longTermDebt/equityAnnual"?: number;
  "totalDebt/totalEquityAnnual"?: number;
  epsGrowth3Y?:             number;
  epsGrowth5Y?:             number;
  peBasicExclExtraTTM?:     number;
  [k: string]: unknown;
}
interface FinnhubPriceTarget { targetHigh?: number; targetLow?: number; targetMean?: number; targetMedian?: number; }

// ── Cache ─────────────────────────────────────────────────────────────────────

const cache    = new Map<string, { data: LabAutoFill; at: number }>();
const inflight = new Map<string, Promise<LabAutoFill>>();

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch { return null; }
}

function pct(v: number | null | undefined): number | null {
  if (v == null) return null;
  return Math.abs(v) <= 2 ? v : v / 100;
}

function field<T>(value: T, source: string, basis: string, verify = false): LabField<T> {
  return { value, source, basis, verify };
}

// ── Builder ───────────────────────────────────────────────────────────────────

async function buildAutoFill(ticker: string): Promise<LabAutoFill> {
  const key = process.env.FINNHUB_API_KEY ?? "";
  const b   = "https://finnhub.io/api/v1";
  const sym = encodeURIComponent(ticker);
  const tok = `token=${key}`;

  const [qR, mR, pR, ptR] = await Promise.allSettled([
    fetchJson<FinnhubQuote>(`${b}/quote?symbol=${sym}&${tok}`),
    fetchJson<{ metric?: FinnhubMetric }>(`${b}/stock/metric?symbol=${sym}&metric=all&${tok}`),
    fetchJson<FinnhubProfile>(`${b}/stock/profile2?symbol=${sym}&${tok}`),
    fetchJson<FinnhubPriceTarget>(`${b}/stock/price-target?symbol=${sym}&${tok}`),
  ]);

  const q  = qR.status  === "fulfilled" ? qR.value  : null;
  const m  = mR.status  === "fulfilled" ? mR.value?.metric ?? null : null;
  const p  = pR.status  === "fulfilled" ? pR.value  : null;
  const pt = ptR.status === "fulfilled" ? ptR.value : null;

  const price   = q?.c ?? null;
  const mcapM   = p?.marketCapitalization ?? m?.marketCapitalization ?? null; // in $M
  const mcapB   = mcapM != null ? mcapM / 1000 : null;   // $B

  // Shares: profile shareOutstanding (in millions) → convert to B
  const sharesM = p?.shareOutstanding ?? null;
  const sharesB = sharesM != null ? sharesM / 1000 : (mcapM != null && price ? mcapM / price / 1000 : null);

  // Revenue TTM in $B
  const revM = m?.revenueTTM ?? null;   // Finnhub returns in $M
  const revB = revM != null ? revM / 1000 : null;

  // Enterprise Value in $B (prefer direct, proxy with market cap)
  const evM  = m?.enterpriseValue ?? null;
  const evB  = evM != null ? evM / 1000 : mcapB;  // EV direct or marketCap proxy

  // Net debt ($B): derive from EV - market cap if both available
  const netDebtB = (evM != null && mcapM != null) ? (evM - mcapM) / 1000 : null;

  // Revenue growth
  const hist3Y     = pct(m?.revenueGrowth3Y ?? m?.revenue3YGrowth);
  const epsGrowth3 = pct(m?.epsGrowth3Y);
  const epsGrowth5 = pct(m?.epsGrowth5Y);
  const forwardG   = epsGrowth3 ?? epsGrowth5 ?? null;  // proxy for forward CAGR

  // Margin (net → approximate EBIT proxy; users should verify)
  const netMargin = pct(m?.netMarginTTM ?? m?.netProfitMarginTTM);

  // WACC from Damodaran
  const damo    = lookupIndustry(p?.finnhubIndustry ?? null);
  const waccVal = damo?.coe ?? null;

  // EV/Sales ratio
  const evSales = (evB != null && revB != null && revB > 0) ? evB / revB : null;

  // Analyst target
  const analystT = pt?.targetMedian ?? pt?.targetMean ?? null;

  // Sanity notes
  const sanity: string[] = [];
  if (hist3Y !== null && hist3Y < 0.05) sanity.push("Hist 3Y CAGR < 5% — inputs may be too low; recheck data.");
  if (forwardG !== null && hist3Y !== null && Math.abs(forwardG - hist3Y) > 0.2) {
    sanity.push(`Forward CAGR (${(forwardG*100).toFixed(0)}%) diverges significantly from hist3Y (${(hist3Y*100).toFixed(0)}%) — verify.`);
  }
  if (evSales != null && evSales > 50) sanity.push(`EV/Sales=${evSales.toFixed(1)}× — very high; terminal margin assumption is load-bearing.`);

  return {
    ticker,
    name:        p?.name ?? null,
    industry:    p?.finnhubIndustry ?? null,
    ev:          field(evB,       evM != null ? "Finnhub, direct EV" : "Finnhub, MarketCap proxy", "LTM",      evM == null),
    r0:          field(revB,      "Finnhub, revenueTTM",             "LTM",      false),
    price:       field(price,     "Finnhub, real-time quote",        "Live",     false),
    shares:      field(sharesB,   "Finnhub profile / computed",      "recent",   sharesM == null),
    netDebt:     field(netDebtB,  "Derived: EV − MarketCap",         "LTM",      true),
    wacc:        field(waccVal,   `Damodaran 2025, ${damo?.name ?? p?.finnhubIndustry ?? "Market"}`, "2025", false),
    terminalMargin: field(netMargin, "Finnhub Net Margin TTM (proxy for EBIT terminal)", "LTM", true),
    hist3Y:      field(hist3Y,    "Finnhub Revenue CAGR 3Y",         "3Y",       false),
    forwardCagr: field(forwardG,  "Finnhub EPS Growth 3Y (proxy)",   "FY+1 est", true),
    analystTarget: field(analystT, "Finnhub consensus price target",  "current",  false),
    evSales,
    marketCap:   mcapB,
    sanityNotes: sanity,
  };
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  const limited = await applyRateLimit(request, "quote");
  if (limited) return limited;

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "API not configured" }, { status: 503 });

  const raw    = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = QuerySchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "invalid ticker" }, { status: 422 });

  const { ticker } = parsed.data;

  const hit = cache.get(ticker);
  if (hit && Date.now() - hit.at < CACHE_TTL) return NextResponse.json(hit.data);

  const existing = inflight.get(ticker);
  if (existing) return NextResponse.json(await existing);

  const promise = buildAutoFill(ticker).then(data => {
    cache.set(ticker, { data, at: Date.now() });
    inflight.delete(ticker);
    return data;
  }).catch(err => { inflight.delete(ticker); throw err; });

  inflight.set(ticker, promise);

  try {
    return NextResponse.json(await promise);
  } catch {
    return NextResponse.json({ error: "fetch failed" }, { status: 500 });
  }
}
