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
const CACHE_TTL  = 30 * 60 * 1000;  // 30 min in-memory
const DB_TTL_MS  = 60 * 60 * 1000;  // 1 hour DB cache — survives cold starts

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
  assetType:   AssetType;
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

  const assetType   = detectAssetType(profile);
  const companyName = profile?.name ?? ticker;
  const typeLabel   = assetTypeLabel(assetType, "en");

  const week52Range = (week52High && week52Low)
    ? `$${week52Low.toFixed(2)} – $${week52High.toFixed(2)}`
    : "N/A";

  const pctFrom52H = (week52High && price > 0)
    ? `${(((price - week52High) / week52High) * 100).toFixed(1)}%`
    : "N/A";

  const topHeadlines = (news ?? []).slice(0, 6).map(n => n.headline).join("\n- ") || "N/A";

  // ── AI SWOT ───────────────────────────────────────────────────────────────

  const lang = locale === "th" ? "Thai" : "English";

  let dataBlock: string;

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

PRICE DATA:
- Current Price: $${price.toFixed(2)} (${change1D >= 0 ? "+" : ""}${change1D.toFixed(2)}% today)
- 52-Week Range: ${week52Range}
- Distance from 52W High: ${pctFrom52H}

RETURNS:
- YTD: ${retYtd != null ? `${retYtd.toFixed(2)}%` : "N/A (data unavailable)"}
- 13-Week: ${ret13W != null ? `${ret13W.toFixed(2)}%` : "N/A"}
- 26-Week: ${ret26W != null ? `${ret26W.toFixed(2)}%` : "N/A"}
- 52-Week: ${ret52W != null ? `${ret52W.toFixed(2)}%` : "N/A"}
- 3-Month Return Std Dev: ${retStd3M != null ? `${retStd3M.toFixed(2)}` : "N/A"}

TRADING:
- 10-Day Avg Volume: ${avgVol10D != null ? `${avgVol10D.toFixed(2)}M shares` : "N/A"}

IMPORTANT: This is an ETF, not a company. Company-fundamental metrics (P/E, EPS, margins, ROE, debt/equity) are NOT APPLICABLE — they describe the fund wrapper, not individual companies.
Distribution yield, expense ratio, AUM, holdings, and issuer data are NOT AVAILABLE from our current data source.

RECENT NEWS (last 7 days):
- ${topHeadlines}
`.trim();
  } else {
    const industry     = profile?.finnhubIndustry ?? "N/A";
    const marketCap    = fmtMarketCap(profile?.marketCapitalization ?? metrics?.marketCapitalization ?? null);
    const roe          = fmtPct(metrics?.roeTTM);
    const netMargin    = fmtPct(metrics?.netMarginTTM ?? metrics?.netProfitMarginTTM);
    const epsGrowth5Y  = fmtPct(metrics?.epsGrowth5Y);
    const currentRatio = fmtNum(metrics?.currentRatioAnnual, "x", 2);
    const debtEquity   = fmtNum(metrics?.["totalDebt/totalEquityAnnual"] ?? metrics?.["longTermDebt/equityAnnual"], "x", 2);

    dataBlock = `
TICKER: ${ticker}
ASSET TYPE: ${typeLabel}${assetType === "adr" ? " (foreign-listed, FX risk may apply)" : ""}
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
  }

  const etfSwotNote = assetType === "etf" ? `
IMPORTANT: For ETFs, frame the SWOT around the fund's purpose, returns, volatility, and liquidity — NOT company fundamentals. Acknowledge that distribution yield, expense ratio, AUM, and holdings are unavailable from our data source. For income/covered-call ETFs, explain the strategy as education (e.g. covered calls cap upside for income). Never fabricate these values.` : "";

  const systemPrompt = `You are Martin, InvestMart's financial analysis assistant. You produce grounded, educational SWOT analyses in ${lang}.

ASSET TYPE: ${typeLabel}

CRITICAL RULES:
1. Every point MUST be tied to a specific data point from the provided data.
2. Where data shows "N/A" or is unavailable, acknowledge it honestly — never invent numbers.
3. If a metric is NOT APPLICABLE to this asset type, say so — do not treat it as a weakness.
4. This is OBSERVATIONAL ANALYSIS for education, NOT investment advice.
5. Do not say "buy", "sell", or make any price predictions.
6. Respond in ${lang} only.${etfSwotNote}`;

  const userPrompt = `Generate a SWOT analysis for ${ticker} (${typeLabel}) using ONLY this data:

${dataBlock}

Return ONLY valid JSON (no markdown, no preamble):
{
  "strengths": ["2-4 items, each 1-2 sentences, citing specific data"],
  "weaknesses": ["2-4 items, citing data or noting what's unavailable — never treat NOT_APPLICABLE metrics as weakness"],
  "opportunities": ["2-4 items grounded in the data"],
  "threats": ["2-4 items grounded in data — volatility, strategy risk, market conditions, news"],
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
    const MAX_ATTEMPTS = 3;
    let lastErr = "";
    let parsed: Partial<SwotQuadrant> | undefined;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const raw = await generateText(userPrompt, systemPrompt, {
          maxTokens:   1600,
          temperature: 0.3,
          jsonMode:    false,
        });
        parsed = JSON.parse(extractJson(raw)) as Partial<SwotQuadrant>;
        break;
      } catch (e) {
        lastErr = e instanceof Error ? e.message : String(e);
        console.warn(`[swot] attempt ${attempt}/${MAX_ATTEMPTS} failed: ${lastErr.slice(0, 100)}`);
        if (attempt < MAX_ATTEMPTS) await new Promise(r => setTimeout(r, 600 * attempt));
      }
    }

    if (parsed) {
      swot = {
        strengths:     Array.isArray(parsed.strengths)     ? parsed.strengths     : [],
        weaknesses:    Array.isArray(parsed.weaknesses)    ? parsed.weaknesses    : [],
        opportunities: Array.isArray(parsed.opportunities) ? parsed.opportunities : [],
        threats:       Array.isArray(parsed.threats)       ? parsed.threats       : [],
        disclaimer:    typeof parsed.disclaimer === "string" ? parsed.disclaimer  : "",
      };
    } else {
      console.error(`[swot] all ${MAX_ATTEMPTS} attempts failed for ${ticker}: ${lastErr}`);
      swotError = locale === "th"
        ? "การวิเคราะห์ AI ไม่พร้อมใช้งานชั่วคราว กรุณาลองใหม่อีกครั้ง"
        : "AI analysis temporarily unavailable. Please try again.";
      swot = { strengths: [], weaknesses: [], opportunities: [], threats: [], disclaimer: "" };
    }
  }

  return {
    ticker, companyName, assetType, price, change1D,
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

  // L1: in-process memory (survives within the same warm instance)
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL) {
    return NextResponse.json(hit.data);
  }

  // L2: DB cache (survives cold starts across all instances)
  try {
    const dbRow = await prisma.siteCache.findUnique({ where: { key: `swot:${key}` } });
    if (dbRow) {
      const stored = dbRow.value as unknown as { data: SwotData; cachedAt: number };
      if (stored?.data && Date.now() - stored.cachedAt < DB_TTL_MS) {
        cache.set(key, { data: stored.data, at: stored.cachedAt });
        return NextResponse.json(stored.data);
      }
    }
  } catch { /* DB miss — proceed to generate */ }

  // In-flight dedup
  const existing = inflight.get(key);
  if (existing) {
    return NextResponse.json(await existing);
  }

  const promise = buildSwot(ticker, locale).then(async data => {
    cache.set(key, { data, at: Date.now() });
    inflight.delete(key);
    // Persist to DB (fire-and-forget — don't block the response)
    const payload = { data, cachedAt: Date.now() } as unknown as import("@prisma/client").Prisma.InputJsonValue;
    prisma.siteCache.upsert({
      where:  { key: `swot:${key}` },
      update: { value: payload },
      create: { key: `swot:${key}`, value: payload },
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
    console.error("[swot] route error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
