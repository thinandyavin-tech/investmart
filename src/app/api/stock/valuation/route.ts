/**
 * Stock data fetcher for the Multiple-Growth 5Y valuation page.
 * Returns everything the model needs: price, PE, EPS₀, beta,
 * industry, growth metrics, and Damodaran CoE suggestion.
 */

import { NextRequest, NextResponse } from "next/server";
import { z }                         from "zod";
import { lookupIndustry }            from "@/lib/damodaran";
import { applyRateLimit }            from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const TICKER_RE = /^[A-Z][A-Z.\-]{0,9}$/;
const QuerySchema = z.object({ ticker: z.string().regex(TICKER_RE) });

const CACHE_TTL_MS = 5 * 60_000;
const cache    = new Map<string, { data: ValuationStockData; at: number }>();
const inflight = new Map<string, Promise<ValuationStockData>>();

export interface GrowthMetric {
  label:  string;
  value:  number | null; // decimal form; null = N/A
}

export interface ValuationStockData {
  ticker:       string;
  name:         string;
  industry:     string | null;
  exchange:     string | null;
  price:        number;
  change1D:     number;
  // Fundamentals
  ttmPE:        number | null;   // TTM P/E from Finnhub
  beta:         number | null;
  eps0:         number | null;   // TTM EPS = price / ttmPE (proxy for EPS₀)
  epsGrowth3Y:  number | null;   // 3Y EPS CAGR (decimal) — useful starting point for g
  revenueGrowth3Y: number | null;
  grossMarginTTM:  number | null;
  week52High:   number | null;
  week52Low:    number | null;
  marketCap:    number | null;
  // Damodaran suggestion
  damodaranCoE:     number | null;  // cost of equity suggestion
  damodaranBeta:    number | null;
  damodaranIndustry: string | null;
  // Growth comparison metrics for the table
  growthMetrics: GrowthMetric[];
}

interface FinnhubQuote  { c: number; dp: number; }
interface FinnhubProfile { name?: string; finnhubIndustry?: string; exchange?: string; marketCapitalization?: number; }
interface FinnhubMetric {
  "52WeekHigh"?:                 number;
  "52WeekLow"?:                  number;
  beta?:                         number;
  peBasicExclExtraTTM?:          number;
  grossMarginTTM?:               number;
  netMarginTTM?:                 number;
  netProfitMarginTTM?:           number;
  revenueGrowth3Y?:              number;
  revenue3YGrowth?:              number;
  epsGrowth3Y?:                  number;
  epsGrowth5Y?:                  number;
  roeTTM?:                       number;
  revenueTTM?:                   number;
  revenueGrowthQuarterlyYoy?:    number;
  epsNormalizedAnnual?:          number;
  currentRatioAnnual?:           number;
  "totalDebt/totalEquityAnnual"?: number;
  dividendYieldIndicatedAnnual?:  number;
  [k: string]: unknown;
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch { return null; }
}

function pct(v: number | null | undefined): number | null {
  if (v == null) return null;
  return Math.abs(v) <= 2 ? v * 100 : v; // normalise Finnhub's mixed decimal/percent encoding
}

async function fetchStockData(ticker: string): Promise<ValuationStockData> {
  const key = process.env.FINNHUB_API_KEY ?? "";
  const b   = "https://finnhub.io/api/v1";
  const sym = encodeURIComponent(ticker);
  const tok = `token=${key}`;

  const [qR, mR, pR] = await Promise.allSettled([
    fetchJson<FinnhubQuote>(`${b}/quote?symbol=${sym}&${tok}`),
    fetchJson<{ metric?: FinnhubMetric }>(`${b}/stock/metric?symbol=${sym}&metric=all&${tok}`),
    fetchJson<FinnhubProfile>(`${b}/stock/profile2?symbol=${sym}&${tok}`),
  ]);

  const q = qR.status === "fulfilled" ? qR.value : null;
  const m = mR.status === "fulfilled" ? mR.value?.metric ?? null : null;
  const p = pR.status === "fulfilled" ? pR.value : null;

  const price    = q?.c ?? 0;
  const change1D = q?.dp ?? 0;
  const ttmPE    = m?.peBasicExclExtraTTM ?? null;
  const beta     = m?.beta ?? null;
  const eps0     = (ttmPE && ttmPE > 0 && price > 0) ? price / ttmPE : null;

  const industry = p?.finnhubIndustry ?? null;
  const damo     = lookupIndustry(industry);

  const eg3 = pct(m?.epsGrowth3Y);
  const rg3  = pct(m?.revenueGrowth3Y ?? m?.revenue3YGrowth);

  const growthMetrics: GrowthMetric[] = [
    { label: "Revenue Growth (3Y CAGR)",  value: rg3     != null ? rg3 / 100 : null },
    { label: "EPS Growth (3Y CAGR)",      value: eg3     != null ? eg3 / 100 : null },
    { label: "EPS Growth (5Y CAGR)",      value: pct(m?.epsGrowth5Y) != null ? pct(m?.epsGrowth5Y)! / 100 : null },
    { label: "Gross Margin (TTM)",        value: pct(m?.grossMarginTTM) != null ? pct(m?.grossMarginTTM)! / 100 : null },
    { label: "Net Margin (TTM)",          value: pct(m?.netMarginTTM ?? m?.netProfitMarginTTM) != null ? pct(m?.netMarginTTM ?? m?.netProfitMarginTTM)! / 100 : null },
    { label: "Return on Equity (TTM)",    value: pct(m?.roeTTM) != null ? pct(m?.roeTTM)! / 100 : null },
    { label: "Dividend Yield",            value: m?.dividendYieldIndicatedAnnual != null ? m.dividendYieldIndicatedAnnual / 100 : null },
  ];

  return {
    ticker,
    name:               p?.name ?? ticker,
    industry,
    exchange:           p?.exchange ?? null,
    price,
    change1D,
    ttmPE,
    beta,
    eps0,
    epsGrowth3Y:        eg3 != null ? eg3 / 100 : null,
    revenueGrowth3Y:    rg3 != null ? rg3 / 100 : null,
    grossMarginTTM:     pct(m?.grossMarginTTM) != null ? pct(m?.grossMarginTTM)! / 100 : null,
    week52High:         m?.["52WeekHigh"] ?? null,
    week52Low:          m?.["52WeekLow"]  ?? null,
    marketCap:          p?.marketCapitalization ?? null,
    damodaranCoE:       damo?.coe  ?? null,
    damodaranBeta:      damo?.beta ?? null,
    damodaranIndustry:  damo?.name ?? null,
    growthMetrics,
  };
}

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
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return NextResponse.json(hit.data);

  const existing = inflight.get(ticker);
  if (existing) return NextResponse.json(await existing);

  const promise = fetchStockData(ticker).then(data => {
    cache.set(ticker, { data, at: Date.now() });
    inflight.delete(ticker);
    return data;
  }).catch(err => { inflight.delete(ticker); throw err; });

  inflight.set(ticker, promise);

  try {
    return NextResponse.json(await promise);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "error" }, { status: 500 });
  }
}
