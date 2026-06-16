import { createHash }   from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z }             from "zod";
import { generateText }  from "@/lib/aiService";
import { extractJson }   from "@/lib/ai/utils";
import { hasAiProvider } from "@/lib/ai/utils";
import { applyRateLimit } from "@/lib/rateLimit";

export const dynamic     = "force-dynamic";
export const maxDuration = 45;

const TICKER_RE = /^[A-Z][A-Z.\-]{0,9}$/;
const CACHE_TTL = 30 * 60 * 1000; // 30 min

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
  dividendPerShareAnnual?:        number;
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

interface SwotQuadrant {
  strengths:     string[];
  weaknesses:    string[];
  opportunities: string[];
  threats:       string[];
  disclaimer:    string;
}

export interface SwotData {
  ticker:      string;
  companyName: string;
  price:       number;
  change1D:    number;
  pe:          string;
  beta:        string;
  grossMargin: string;
  divYield:    string;
  revGrowth3Y: string;
  epsGrowth3Y: string;
  week52High:  number | null;
  week52Low:   number | null;
  swot:        SwotQuadrant;
  swotError?:  string;
  locale:      "en" | "th";
  generatedAt: string;
}

// ── Cache ─────────────────────────────────────────────────────────────────────

interface CacheEntry { data: SwotData; at: number; }
const cache    = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<SwotData>>();

function cacheKey(ticker: string, locale: string): string {
  return createHash("sha256").update(`swot|${ticker}|${locale}`).digest("hex").slice(0, 16);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function fetchJson<T>(url: string, timeout = 5000): Promise<T | null> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(timeout) });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch { return null; }
}

function fmtPct(v: number | null | undefined, decimals = 1): string {
  if (v == null) return "N/A";
  const pct = Math.abs(v) > 2 ? v : v * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(decimals)}%`;
}

function fmtNum(v: number | null | undefined, suffix = "", decimals = 1): string {
  if (v == null) return "N/A";
  return `${v.toFixed(decimals)}${suffix}`;
}

function fmtMarketCap(mcap: number | null): string {
  if (mcap == null) return "N/A";
  if (mcap >= 1_000_000) return `$${(mcap / 1_000_000).toFixed(1)}T`;
  if (mcap >= 1_000)     return `$${(mcap / 1_000).toFixed(1)}B`;
  return `$${mcap.toFixed(0)}M`;
}

// ── Core builder ──────────────────────────────────────────────────────────────

async function buildSwot(ticker: string, locale: "en" | "th"): Promise<SwotData> {
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

  const price    = quote?.c  ?? 0;
  const change1D = quote?.dp ?? 0;

  // Formatted metric strings — N/A where unavailable
  const pe          = metrics?.peBasicExclExtraTTM != null ? `${metrics.peBasicExclExtraTTM.toFixed(1)}x` : "N/A";
  const beta        = metrics?.beta != null ? `${metrics.beta.toFixed(2)}` : "N/A";
  const grossMargin = metrics?.grossMarginTTM != null ? fmtPct(metrics.grossMarginTTM, 1) : "N/A";
  const divYield    = metrics?.dividendYieldIndicatedAnnual != null ? `${metrics.dividendYieldIndicatedAnnual.toFixed(2)}%` : "N/A";
  const revGrowth3Y = fmtPct(metrics?.revenueGrowth3Y ?? metrics?.revenue3YGrowth);
  const epsGrowth3Y = fmtPct(metrics?.epsGrowth3Y);
  const week52High  = metrics?.["52WeekHigh"] ?? null;
  const week52Low   = metrics?.["52WeekLow"]  ?? null;

  const companyName = profile?.name ?? ticker;
  const industry    = profile?.finnhubIndustry ?? "N/A";
  const marketCap   = fmtMarketCap(profile?.marketCapitalization ?? metrics?.marketCapitalization ?? null);
  const roe         = fmtPct(metrics?.roeTTM);
  const netMargin   = fmtPct(metrics?.netMarginTTM ?? metrics?.netProfitMarginTTM);
  const epsGrowth5Y = fmtPct(metrics?.epsGrowth5Y);
  const currentRatio = fmtNum(metrics?.currentRatioAnnual, "x", 2);
  const debtEquity   = fmtNum(metrics?.["totalDebt/totalEquityAnnual"] ?? metrics?.["longTermDebt/equityAnnual"], "x", 2);

  const week52Range = (week52High && week52Low)
    ? `$${week52Low.toFixed(2)} – $${week52High.toFixed(2)}`
    : "N/A";

  const pctFrom52H = (week52High && price > 0)
    ? `${(((price - week52High) / week52High) * 100).toFixed(1)}%`
    : "N/A";

  const topHeadlines = (news ?? []).slice(0, 6).map(n => n.headline).join("\n- ") || "N/A";

  // ── AI SWOT ───────────────────────────────────────────────────────────────

  const lang = locale === "th" ? "Thai" : "English";

  const dataBlock = `
TICKER: ${ticker}
COMPANY: ${companyName}
INDUSTRY: ${industry}
MARKET CAP: ${marketCap}

PRICE DATA:
- Current Price: $${price.toFixed(2)} (${change1D >= 0 ? "+" : ""}${change1D.toFixed(2)}% today)
- 52-Week Range: ${week52Range}
- Distance from 52W High: ${pctFrom52H}

FINANCIALS (TTM unless noted):
- P/E Ratio: ${pe}
- Beta (volatility vs. market): ${beta}
- Gross Margin: ${grossMargin}
- Net Margin: ${netMargin}
- Return on Equity: ${roe}
- Dividend Yield: ${divYield}
- Revenue Growth (3Y CAGR): ${revGrowth3Y}
- EPS Growth (3Y CAGR): ${epsGrowth3Y}
- EPS Growth (5Y CAGR): ${epsGrowth5Y}
- Current Ratio: ${currentRatio}
- Debt/Equity: ${debtEquity}

RECENT NEWS (last 7 days):
- ${topHeadlines}
`.trim();

  const systemPrompt = `You are Martin, InvestMart's financial analysis assistant. You produce grounded, educational SWOT analyses in ${lang}.

CRITICAL RULES:
1. Every point MUST be tied to a specific data point from the provided data.
2. Where data shows "N/A", acknowledge uncertainty — never invent numbers.
3. This is OBSERVATIONAL ANALYSIS for education, NOT investment advice.
4. Be honest about data limitations. "N/A" means data was not available from our source.
5. Do not say "buy", "sell", or make any price predictions.
6. Respond in ${lang} only.`;

  const userPrompt = `Generate a SWOT analysis for ${ticker} using ONLY this data:

${dataBlock}

Return ONLY valid JSON (no markdown, no preamble):
{
  "strengths": ["2-4 items, each 1-2 sentences, citing specific data"],
  "weaknesses": ["2-4 items, citing data or noting N/A where unavailable"],
  "opportunities": ["2-4 items grounded in the data and sector context"],
  "threats": ["2-4 items grounded in data — valuation, competition, macro, news"],
  "disclaimer": "One sentence in ${lang}: this is educational analysis based on ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} data, not investment advice."
}`;

  let swot: SwotQuadrant;
  let swotError: string | undefined;

  if (!hasAiProvider()) {
    swotError = locale === "th"
      ? "ไม่มี AI provider — กรุณาตั้งค่า API key"
      : "No AI provider configured. Please set an API key.";
    swot = { strengths: [], weaknesses: [], opportunities: [], threats: [], disclaimer: "" };
  } else {
    try {
      const raw = await generateText(userPrompt, systemPrompt, {
        maxTokens:   1200,
        temperature: 0.3,
        jsonMode:    false,
      });
      const jsonStr = extractJson(raw);
      const parsed  = JSON.parse(jsonStr) as Partial<SwotQuadrant>;
      swot = {
        strengths:     Array.isArray(parsed.strengths)     ? parsed.strengths     : [],
        weaknesses:    Array.isArray(parsed.weaknesses)    ? parsed.weaknesses    : [],
        opportunities: Array.isArray(parsed.opportunities) ? parsed.opportunities : [],
        threats:       Array.isArray(parsed.threats)       ? parsed.threats       : [],
        disclaimer:    typeof parsed.disclaimer === "string" ? parsed.disclaimer  : "",
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[swot] AI error for ${ticker}:`, msg);
      swotError = locale === "th"
        ? "การวิเคราะห์ AI ไม่พร้อมใช้งานชั่วคราว กรุณาลองใหม่อีกครั้ง"
        : "AI analysis temporarily unavailable. Please try again.";
      swot = { strengths: [], weaknesses: [], opportunities: [], threats: [], disclaimer: "" };
    }
  }

  return {
    ticker, companyName, price, change1D,
    pe, beta, grossMargin, divYield, revGrowth3Y, epsGrowth3Y,
    week52High, week52Low,
    swot, swotError, locale,
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

  // L1 memory cache
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL) {
    return NextResponse.json(hit.data);
  }

  // In-flight dedup
  const existing = inflight.get(key);
  if (existing) {
    return NextResponse.json(await existing);
  }

  const promise = buildSwot(ticker, locale).then(data => {
    cache.set(key, { data, at: Date.now() });
    inflight.delete(key);
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
    console.error("[swot] route error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
