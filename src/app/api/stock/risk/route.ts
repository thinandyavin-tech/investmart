import { createHash }   from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z }             from "zod";
import { generateText }  from "@/lib/aiService";
import { extractJson }   from "@/lib/ai/utils";
import { hasAiProvider } from "@/lib/ai/utils";
import { applyRateLimit } from "@/lib/rateLimit";
import { prisma }        from "@/lib/prisma";
import { detectAssetType, assetTypeLabel } from "@/lib/assetType";
import type { AssetType } from "@/lib/assetType";

export const dynamic     = "force-dynamic";
export const maxDuration = 45;

const TICKER_RE  = /^[A-Z][A-Z.\-]{0,9}$/;
const CACHE_TTL  = 30 * 60 * 1000;
const DB_TTL_MS  = 60 * 60 * 1000;

const QuerySchema = z.object({
  ticker: z.string().regex(TICKER_RE),
  locale: z.enum(["en", "th"]).default("en"),
});

// ── Types ─────────────────────────────────────────────────────────────────────

interface FinnhubQuote {
  c: number; pc: number; d: number; dp: number; h: number; l: number;
}

interface FinnhubProfile {
  name?: string; finnhubIndustry?: string; exchange?: string;
  marketCapitalization?: number;
}

interface FinnhubMetricAll {
  "52WeekHigh"?:                  number;
  "52WeekLow"?:                   number;
  beta?:                          number;
  peBasicExclExtraTTM?:           number;
  grossMarginTTM?:                number;
  netMarginTTM?:                  number;
  netProfitMarginTTM?:            number;
  dividendYieldIndicatedAnnual?:  number;
  revenueGrowth3Y?:               number;
  revenue3YGrowth?:               number;
  epsGrowth3Y?:                   number;
  epsGrowth5Y?:                   number;
  roeTTM?:                        number;
  revenueTTM?:                    number;
  marketCapitalization?:          number;
  currentRatioAnnual?:            number;
  "longTermDebt/equityAnnual"?:   number;
  "totalDebt/totalEquityAnnual"?: number;
  [key: string]: unknown;
}

interface FinnhubNewsItem { headline: string; source: string; datetime: number; }

export interface RiskFactor {
  name:  string;
  level: "low" | "medium" | "high" | "not_assessable";
  note:  string;
}

export interface RiskAnalysis {
  overallRisk: "low" | "medium" | "high" | "insufficient_data";
  factors:     RiskFactor[];
  watchPoints: string[];
  disclaimer:  string;
}

export interface RiskData {
  ticker:      string;
  companyName: string;
  assetType:   AssetType;
  price:       number;
  change1D:    number;
  risk:        RiskAnalysis;
  riskError?:  string;
  locale:      "en" | "th";
  generatedAt: string;
}

// ── Cache ─────────────────────────────────────────────────────────────────────

interface CacheEntry { data: RiskData; at: number; }
const cache    = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<RiskData>>();

function cacheKey(ticker: string, locale: string): string {
  return createHash("sha256").update(`risk|${ticker}|${locale}`).digest("hex").slice(0, 16);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function fetchJson<T>(url: string, timeout = 5000): Promise<T | null> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(timeout) });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch { return null; }
}

function fmtPct(v: number | null | undefined): string {
  if (v == null) return "N/A";
  const pct = Math.abs(v) > 2 ? v : v * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
}

function fmtNum(v: number | null | undefined, suffix = "", decimals = 2): string {
  if (v == null) return "N/A";
  return `${v.toFixed(decimals)}${suffix}`;
}

// ── Stock risk factors (existing company analysis) ───────────────────────────

const STOCK_RISK_DIMENSIONS = [
  { name: "Valuation Risk",   note: "cite P/E and what it suggests" },
  { name: "Volatility Risk",  note: "cite beta; compare to market average 1.0" },
  { name: "Earnings Quality", note: "cite margins, EPS/revenue growth" },
  { name: "Leverage Risk",    note: "cite debt/equity and current ratio" },
  { name: "Price Momentum",   note: "cite distance from 52W high/low" },
  { name: "News & Event Risk", note: "cite recent headlines" },
] as const;

// ── ETF risk factors (replaces company-fundamental dimensions) ───────────────

const ETF_RISK_DIMENSIONS = [
  { name: "Price Momentum",       note: "cite distance from 52W high/low and recent returns" },
  { name: "Volatility",           note: "cite 3-month return standard deviation and price swings" },
  { name: "News & Event Risk",    note: "cite recent headlines; market or sector events" },
] as const;

// ── Core builder ──────────────────────────────────────────────────────────────

async function buildRisk(ticker: string, locale: "en" | "th"): Promise<RiskData> {
  const apiKey = process.env.FINNHUB_API_KEY ?? "";
  const base   = "https://finnhub.io/api/v1";
  const sym    = encodeURIComponent(ticker);
  const tok    = `token=${apiKey}`;

  const today   = new Date();
  const weekAgo = new Date(Date.now() - 7 * 86_400_000);
  const fmt     = (d: Date) => d.toISOString().slice(0, 10);

  const [quoteR, metricR, profileR, newsR] = await Promise.allSettled([
    fetchJson<FinnhubQuote>(`${base}/quote?symbol=${sym}&${tok}`),
    fetchJson<{ metric?: FinnhubMetricAll }>(`${base}/stock/metric?symbol=${sym}&metric=all&${tok}`),
    fetchJson<FinnhubProfile>(`${base}/stock/profile2?symbol=${sym}&${tok}`),
    fetchJson<FinnhubNewsItem[]>(`${base}/company-news?symbol=${sym}&from=${fmt(weekAgo)}&to=${fmt(today)}&${tok}`),
  ]);

  const quote   = quoteR.status   === "fulfilled" ? quoteR.value   : null;
  const metrics = metricR.status  === "fulfilled" ? metricR.value?.metric ?? null : null;
  const profile = profileR.status === "fulfilled" ? profileR.value : null;
  const news    = newsR.status    === "fulfilled"  ? newsR.value   : null;

  const assetType = detectAssetType(profile);
  const price     = quote?.c  ?? 0;
  const change1D  = quote?.dp ?? 0;
  const companyName = profile?.name ?? ticker;

  const week52High = metrics?.["52WeekHigh"];
  const week52Low  = metrics?.["52WeekLow"];
  const pctFrom52H = (week52High && price > 0)
    ? `${(((price - week52High) / week52High) * 100).toFixed(1)}%`
    : "N/A";
  const pctFrom52L = (week52Low && price > 0)
    ? `${(((price - week52Low) / week52Low) * 100).toFixed(1)}%`
    : "N/A";

  const topHeadlines = (news ?? []).slice(0, 6).map(n => n.headline).join("\n- ") || "N/A";
  const lang = locale === "th" ? "Thai" : "English";
  const typeLabel = assetTypeLabel(assetType, "en");

  // ── Build data block per asset type ──────────────────────────────────────

  let dataBlock: string;
  let dimensions: readonly { name: string; note: string }[];

  if (assetType === "etf") {
    const retStd3M  = metrics?.["3MonthADReturnStd"] as number | undefined;
    const ret13W    = metrics?.["13WeekPriceReturnDaily"] as number | undefined;
    const ret26W    = metrics?.["26WeekPriceReturnDaily"] as number | undefined;
    const ret52W    = metrics?.["52WeekPriceReturnDaily"] as number | undefined;
    const retYtd    = metrics?.["yearToDatePriceReturnDaily"] as number | undefined;
    const avgVol10D = metrics?.["10DayAverageTradingVolume"] as number | undefined;

    dataBlock = `
TICKER: ${ticker}
ASSET TYPE: ETF / ETP
NAME: ${companyName}

PRICE:
- Current: $${price.toFixed(2)} (${change1D >= 0 ? "+" : ""}${change1D.toFixed(2)}% today)
- 52W High: ${week52High != null ? `$${week52High.toFixed(2)}` : "N/A"} (${pctFrom52H} from high)
- 52W Low: ${week52Low != null ? `$${week52Low.toFixed(2)}` : "N/A"} (${pctFrom52L} from low)

RETURNS:
- YTD: ${retYtd != null ? `${retYtd.toFixed(2)}%` : "N/A"}
- 13-Week: ${ret13W != null ? `${ret13W.toFixed(2)}%` : "N/A"}
- 26-Week: ${ret26W != null ? `${ret26W.toFixed(2)}%` : "N/A"}
- 52-Week: ${ret52W != null ? `${ret52W.toFixed(2)}%` : "N/A"}
- 3-Month Return Std Dev: ${retStd3M != null ? `${retStd3M.toFixed(2)}` : "N/A"}

TRADING:
- 10-Day Avg Volume: ${avgVol10D != null ? `${avgVol10D.toFixed(2)}M shares` : "N/A"}

NOTE: Company-fundamental metrics (P/E, EPS, margins, debt/equity) are NOT APPLICABLE to ETFs — they measure the fund wrapper, not individual companies. Do NOT assess these.

NOTE: Distribution yield, expense ratio, AUM, and holdings data are not available from our current data source. Label these as "data unavailable" — do not estimate.

RECENT NEWS (last 7 days):
- ${topHeadlines}
`.trim();
    dimensions = ETF_RISK_DIMENSIONS;
  } else {
    const industry     = profile?.finnhubIndustry ?? "N/A";
    const beta         = fmtNum(metrics?.beta, "", 2);
    const pe           = metrics?.peBasicExclExtraTTM != null ? `${metrics.peBasicExclExtraTTM.toFixed(1)}x` : "N/A";
    const grossMargin  = fmtPct(metrics?.grossMarginTTM);
    const netMargin    = fmtPct(metrics?.netMarginTTM ?? metrics?.netProfitMarginTTM);
    const roe          = fmtPct(metrics?.roeTTM);
    const revGrowth3Y  = fmtPct(metrics?.revenueGrowth3Y ?? metrics?.revenue3YGrowth);
    const epsGrowth3Y  = fmtPct(metrics?.epsGrowth3Y);
    const currentRatio = fmtNum(metrics?.currentRatioAnnual, "x", 2);
    const debtEquity   = fmtNum(metrics?.["totalDebt/totalEquityAnnual"] ?? metrics?.["longTermDebt/equityAnnual"], "x", 2);

    dataBlock = `
TICKER: ${ticker}
ASSET TYPE: ${typeLabel}${assetType === "adr" ? " (foreign-listed, FX risk applies)" : ""}
COMPANY: ${companyName}
INDUSTRY: ${industry}

PRICE:
- Current: $${price.toFixed(2)} (${change1D >= 0 ? "+" : ""}${change1D.toFixed(2)}% today)
- 52W High: ${week52High != null ? `$${week52High.toFixed(2)}` : "N/A"} (${pctFrom52H} from high)
- 52W Low: ${week52Low != null ? `$${week52Low.toFixed(2)}` : "N/A"} (${pctFrom52L} from low)

VALUATION:
- P/E Ratio: ${pe}
- Beta: ${beta}

QUALITY:
- Gross Margin: ${grossMargin}
- Net Margin: ${netMargin}
- Return on Equity (ROE): ${roe}
- Revenue Growth (3Y): ${revGrowth3Y}
- EPS Growth (3Y): ${epsGrowth3Y}

LEVERAGE:
- Current Ratio: ${currentRatio}
- Debt/Equity: ${debtEquity}

RECENT NEWS (last 7 days):
- ${topHeadlines}
`.trim();
    dimensions = STOCK_RISK_DIMENSIONS;
  }

  // ── Prompt ──────────────────────────────────────────────────────────────

  const factorsJson = dimensions
    .map(d => `    {"name":"${d.name}","level":"low|medium|high|not_assessable","note":"${d.note}"}`)
    .join(",\n");

  const systemPrompt = `You are Martin, InvestMart's risk analysis assistant. You identify real, data-grounded risk factors for ${lang}-speaking retail investors.

ASSET TYPE: ${typeLabel}

CRITICAL RULES:
1. Every risk factor MUST reference specific data from the input. No fabrication.
2. If a metric is "N/A" or "not applicable", set that factor's level to "not_assessable" and explain why in the note. NEVER assign low/medium/high to a dimension that has no real data.
3. overallRisk is computed ONLY from factors that have a real level (low/medium/high). If fewer than 2 factors are assessable, set overallRisk to "insufficient_data".
4. This is EDUCATIONAL risk awareness, not financial advice. Never say "don't buy" or "sell."
5. Use probabilistic language: "suggests", "may indicate", "could signal."
6. Respond in ${lang} only.`;

  const userPrompt = `Analyze risk factors for ${ticker} using ONLY this data:

${dataBlock}

Return ONLY valid JSON:
{
  "overallRisk": "low" | "medium" | "high" | "insufficient_data",
  "factors": [
${factorsJson}
  ],
  "watchPoints": ["2-4 specific things to monitor — tied to the data"],
  "disclaimer": "One sentence in ${lang}: this is educational risk analysis based on ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} data, not investment advice."
}`;

  let risk: RiskAnalysis;
  let riskError: string | undefined;

  const VALID_LEVELS = new Set<string>(["low", "medium", "high", "not_assessable"]);
  const OVERALL_LEVELS = new Set<string>(["low", "medium", "high", "insufficient_data"]);

  function isValidFactorLevel(v: unknown): v is RiskFactor["level"] {
    return typeof v === "string" && VALID_LEVELS.has(v);
  }

  if (!hasAiProvider()) {
    riskError = locale === "th"
      ? "ไม่มี AI provider — กรุณาตั้งค่า API key"
      : "No AI provider configured. Please set an API key.";
    risk = { overallRisk: "insufficient_data", factors: [], watchPoints: [], disclaimer: "" };
  } else {
    try {
      const raw    = await generateText(userPrompt, systemPrompt, {
        maxTokens:   1400,
        temperature: 0.25,
        jsonMode:    false,
      });
      const jsonStr = extractJson(raw);
      const parsed  = JSON.parse(jsonStr) as Partial<{
        overallRisk: unknown;
        factors: unknown[];
        watchPoints: unknown[];
        disclaimer: string;
      }>;

      const factors: RiskFactor[] = (Array.isArray(parsed.factors) ? parsed.factors : [])
        .map((f): RiskFactor | null => {
          if (typeof f !== "object" || f === null) return null;
          const factor = f as Record<string, unknown>;
          if (typeof factor.name !== "string" || !isValidFactorLevel(factor.level) || typeof factor.note !== "string") return null;
          return { name: factor.name, level: factor.level, note: factor.note };
        })
        .filter((f): f is RiskFactor => f !== null);

      // Post-process: ensure overall risk respects data availability
      const assessable = factors.filter(f => f.level !== "not_assessable");
      let overallRisk: RiskAnalysis["overallRisk"];
      const rawOverall = parsed.overallRisk;
      if (assessable.length < 2) {
        overallRisk = "insufficient_data";
      } else if (typeof rawOverall === "string" && OVERALL_LEVELS.has(rawOverall)) {
        overallRisk = rawOverall as RiskAnalysis["overallRisk"];
      } else {
        overallRisk = "insufficient_data";
      }

      risk = {
        overallRisk,
        factors,
        watchPoints: (Array.isArray(parsed.watchPoints) ? parsed.watchPoints : [])
          .filter((w): w is string => typeof w === "string"),
        disclaimer:  typeof parsed.disclaimer === "string" ? parsed.disclaimer : "",
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[risk] AI error for ${ticker}:`, msg);
      riskError = locale === "th"
        ? "การวิเคราะห์ AI ไม่พร้อมใช้งานชั่วคราว กรุณาลองใหม่อีกครั้ง"
        : "AI analysis temporarily unavailable. Please try again.";
      risk = { overallRisk: "insufficient_data", factors: [], watchPoints: [], disclaimer: "" };
    }
  }

  return {
    ticker, companyName, assetType, price, change1D,
    risk, riskError, locale,
    generatedAt: new Date().toISOString(),
  };
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  const limited = await applyRateLimit(request, "ai");
  if (limited) return limited;

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "API not configured" }, { status: 503 });

  const raw    = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = QuerySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid params" }, { status: 422 });
  }

  const { ticker, locale } = parsed.data;
  const key = cacheKey(ticker, locale);

  // L1: in-process memory
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL) {
    return NextResponse.json(hit.data);
  }

  // L2: DB cache (survives cold starts)
  try {
    const dbRow = await prisma.siteCache.findUnique({ where: { key: `risk:${key}` } });
    if (dbRow) {
      const stored = dbRow.value as unknown as { data: RiskData; cachedAt: number };
      if (stored?.data && Date.now() - stored.cachedAt < DB_TTL_MS) {
        cache.set(key, { data: stored.data, at: stored.cachedAt });
        return NextResponse.json(stored.data);
      }
    }
  } catch { /* DB miss — proceed to generate */ }

  const existing = inflight.get(key);
  if (existing) {
    return NextResponse.json(await existing);
  }

  const promise = buildRisk(ticker, locale).then(async data => {
    cache.set(key, { data, at: Date.now() });
    inflight.delete(key);
    const payload = { data, cachedAt: Date.now() } as unknown as import("@prisma/client").Prisma.InputJsonValue;
    prisma.siteCache.upsert({
      where:  { key: `risk:${key}` },
      update: { value: payload },
      create: { key: `risk:${key}`, value: payload },
    }).catch(() => { /* non-critical */ });
    return data;
  }).catch(err => {
    inflight.delete(key);
    throw err;
  });

  inflight.set(key, promise);

  try {
    return NextResponse.json(await promise);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    console.error("[risk] route error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
