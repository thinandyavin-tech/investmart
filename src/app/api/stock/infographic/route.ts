/**
 * Stock infographic data endpoint.
 *
 * Three-way split (enforced here):
 *   Numbers  → fetched from Finnhub/history; never from LLM output
 *   Narrative → LLM returns strict JSON with words only, no numbers
 *   Design   → the component/template renders both
 *
 * GET /api/stock/infographic?ticker=NVDA&locale=en
 */
import { NextRequest, NextResponse } from "next/server";
import { generateText } from "@/lib/aiService";
import { extractJson } from "@/lib/ai/utils";

export const dynamic = "force-dynamic";

const TICKER_RE = /^[A-Z][A-Z.\-]{0,9}$/;
const TTL_MS    = 15 * 60 * 1000; // 15 min cache per ticker+locale

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InfographicNarrative {
  language:   "en" | "th";
  eyebrow:    string; // e.g. "STOCK SNAPSHOT" or "ภาพรวมหุ้น"
  thesis:     string; // grounded sentence; **keywords** marked for accent color
  highlights: string[]; // 2–3 short observational points (words only, no numbers)
  watch?:     string;   // one short line to watch (optional)
}

export interface InfographicData {
  // ── Identity ──────────────────────────────────────────────────────────────
  ticker:           string;
  companyName:      string;
  sector:           string;
  exchange:         string;
  // ── Price (from Finnhub) ──────────────────────────────────────────────────
  price:            number;
  change1D:         number;       // percent; 0 when no prior close
  noChangeData:     boolean;      // true for new listings (dp=null)
  priceUnavailable: boolean;      // true when Finnhub c=0
  source:           string;       // "finnhub" | "yahoo" | "unavailable"
  // ── Formatted fundamentals (code-formatted, never from LLM) ──────────────
  marketCap:        string;       // "$2.8T" or "N/A"
  pe:               string;       // "31.1x" or "N/A"
  peg:              string;       // "1.23x" or "N/A"
  week52High:       number | null;
  week52Low:        number | null;
  volume10d:        string;       // "45.2M" or "N/A"
  rsi:              number | null;
  // ── Chart ─────────────────────────────────────────────────────────────────
  sparkline:        number[];     // last 30 close prices for mini sparkline
  // ── LLM narrative (words only, no numbers) ────────────────────────────────
  narrative:        InfographicNarrative;
  locale:           "en" | "th";
  generatedAt:      string;       // ISO
}

// ─── Cache ────────────────────────────────────────────────────────────────────

interface CacheEntry { data: InfographicData; cachedAt: number }
const cache   = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<InfographicData>>();

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function fetchJ<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(4_500) });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch { return null; }
}

function fmtCap(mc: number | undefined): string {
  if (!mc) return "N/A";
  if (mc >= 1_000_000) return `$${(mc / 1_000_000).toFixed(1)}T`;
  if (mc >= 1_000)     return `$${(mc / 1_000).toFixed(1)}B`;
  return `$${mc.toFixed(0)}M`;
}

function fmtVol(v: number | undefined): string {
  if (!v) return "N/A";
  const shares = v * 1_000;
  if (shares >= 1_000_000) return `${(shares / 1_000_000).toFixed(1)}M`;
  if (shares >= 1_000)     return `${(shares / 1_000).toFixed(0)}K`;
  return String(Math.round(shares));
}

function computeRSI(closes: number[], period = 14): number {
  const recent = closes.slice(-(period * 3));
  if (recent.length < period + 1) return 50;
  let ag = 0, al = 0;
  for (let i = 1; i <= period; i++) {
    const d = recent[i]! - recent[i - 1]!;
    if (d > 0) ag += d; else al -= d;
  }
  ag /= period; al /= period;
  for (let i = period + 1; i < recent.length; i++) {
    const d = recent[i]! - recent[i - 1]!;
    ag = (ag * (period - 1) + (d > 0 ? d : 0)) / period;
    al = (al * (period - 1) + (d < 0 ? -d : 0)) / period;
  }
  if (al === 0) return 100;
  return Math.round(100 - 100 / (1 + ag / al));
}

// ─── LLM narrative (JSON contract — words only, no numbers) ──────────────────

const SAFE_NARRATIVE: InfographicNarrative = {
  language:   "th",
  eyebrow:    "ภาพรวมหุ้น",
  thesis:     "ข้อมูลตลาดล่าสุดอยู่ด้านบน — ไม่สามารถสร้างบทวิเคราะห์ได้ในขณะนี้",
  highlights: [],
};

async function buildNarrative(
  ticker: string,
  dataBlock: string,
  locale: "en" | "th",
): Promise<InfographicNarrative> {
  const lang = locale === "en" ? "English" : "Thai (ภาษาไทย)";
  const eyebrow = locale === "en" ? "STOCK SNAPSHOT" : "ภาพรวมหุ้น";

  const systemPrompt =
    `You are Martin, an observational market analyst at InvestMart. ` +
    `Return ONLY valid JSON. No markdown, no explanation, no numbers in your output. ` +
    `All data numbers are shown separately in the infographic — your job is words only.`;

  const userPrompt = `Here is the market data for ${ticker}:\n${dataBlock}\n\n` +
    `Return ONLY this JSON in ${lang}. Use the data to write grounded observations — ` +
    `but do NOT put any numbers, prices, or ratios in the JSON values. ` +
    `Mark at most 2 important words with **asterisks** in the thesis for accent color.\n\n` +
    `{\n` +
    `  "language": "${locale}",\n` +
    `  "eyebrow": "${eyebrow}",\n` +
    `  "thesis": "One grounded observational sentence. Mark **two keywords** max.",\n` +
    `  "highlights": ["Short point 1 (no numbers)", "Short point 2", "Short point 3"],\n` +
    `  "watch": "One short line on what to watch (optional, omit if nothing stands out)"\n` +
    `}`;

  const raw = await generateText(userPrompt, systemPrompt, {
    maxTokens:   300,
    temperature: 0.3,
  }).catch(() => "");

  if (!raw.trim()) return { ...SAFE_NARRATIVE, language: locale, eyebrow };

  try {
    const cleaned = extractJson(raw);
    const parsed = JSON.parse(cleaned) as Partial<InfographicNarrative>;
    return {
      language:   locale,
      eyebrow:    typeof parsed.eyebrow    === "string" ? parsed.eyebrow.slice(0, 60)  : eyebrow,
      thesis:     typeof parsed.thesis     === "string" ? parsed.thesis.slice(0, 200)  : SAFE_NARRATIVE.thesis,
      highlights: Array.isArray(parsed.highlights)
        ? parsed.highlights.filter((h): h is string => typeof h === "string").slice(0, 3).map(h => h.slice(0, 100))
        : [],
      watch: typeof parsed.watch === "string" ? parsed.watch.slice(0, 100) : undefined,
    };
  } catch {
    return { ...SAFE_NARRATIVE, language: locale, eyebrow };
  }
}

// ─── Data builder ─────────────────────────────────────────────────────────────

async function buildInfographic(
  ticker:  string,
  origin:  string,
  locale:  "en" | "th",
): Promise<InfographicData> {
  const fin   = process.env.FINNHUB_API_KEY ?? "";
  const fBase = "https://finnhub.io/api/v1";

  interface RawQuote   { c: number; d: number | null; dp: number | null; pc: number; source?: string }
  interface RawMetrics { peBasicExclExtraTTM?: number; marketCapitalization?: number; epsGrowth3Y?: number; "52WeekHigh"?: number; "52WeekLow"?: number; "10DayAverageTradingVolume"?: number }
  interface RawProfile { profile?: { name?: string; finnhubIndustry?: string; exchange?: string }; metrics?: { metric?: RawMetrics } }
  interface RawHistory { candles?: { close: number }[] }
  interface FinnMetric { metric?: RawMetrics }

  const [quoteR, profileR, histR, metR] = await Promise.allSettled([
    fetchJ<RawQuote>(`${origin}/api/stock/quote?symbol=${ticker}`),
    fetchJ<RawProfile>(`${origin}/api/stock/profile?symbol=${ticker}`),
    fetchJ<RawHistory>(`${origin}/api/stock/history?symbol=${ticker}&timeframe=3M`),
    fetchJ<FinnMetric>(`${fBase}/stock/metric?symbol=${ticker}&metric=all&token=${fin}`),
  ]);

  const rawQ    = quoteR.status   === "fulfilled" ? quoteR.value   : null;
  const rawP    = profileR.status === "fulfilled" ? profileR.value : null;
  const hist    = histR.status    === "fulfilled" ? histR.value    : null;
  const met     = (metR.status === "fulfilled" ? metR.value?.metric : null)
               ?? rawP?.metrics?.metric ?? null;

  const profile          = rawP?.profile ?? null;
  const price            = rawQ?.c ?? 0;
  const chgPct           = rawQ?.dp ?? 0;
  const priceUnavailable = !rawQ || rawQ.c === 0;
  const noChangeData     = !priceUnavailable && rawQ?.pc === 0 && rawQ?.dp === null;

  const closes = (hist?.candles ?? []).map(c => c.close);
  const rsi    = closes.length >= 15 ? computeRSI(closes) : null;
  const spark  = closes.slice(-30);

  const pe  = met?.peBasicExclExtraTTM ? `${met.peBasicExclExtraTTM.toFixed(1)}x` : "N/A";
  const peg = (met?.peBasicExclExtraTTM && met?.epsGrowth3Y && met.epsGrowth3Y > 0)
    ? `${(met.peBasicExclExtraTTM / met.epsGrowth3Y).toFixed(2)}x`
    : "N/A";

  // Build descriptive data block for LLM (words and numbers to reason from)
  const rsiLabel = rsi === null ? "N/A"
    : rsi >= 70 ? `${rsi} (overbought zone)`
    : rsi <= 30 ? `${rsi} (oversold zone)`
    : `${rsi} (neutral zone)`;

  const dataBlock = [
    `${ticker} — ${profile?.name ?? ticker} (${profile?.finnhubIndustry ?? "N/A"})`,
    priceUnavailable ? "Price: unavailable (Finnhub doesn't cover this ticker)"
      : noChangeData  ? `Price: $${price.toFixed(2)} (new listing, no prior close yet)`
      : `Price: $${price.toFixed(2)} (${chgPct >= 0 ? "+" : ""}${chgPct.toFixed(2)}% today)`,
    met?.marketCapitalization ? `Market Cap: ${fmtCap(met.marketCapitalization)}` : "",
    `P/E TTM: ${pe}, PEG: ${peg}`,
    rsi !== null ? `RSI-14: ${rsiLabel}` : "",
    met?.["52WeekHigh"] ? `52W range: $${met["52WeekLow"]?.toFixed(2) ?? "?"} – $${met["52WeekHigh"]?.toFixed(2)}` : "",
  ].filter(Boolean).join("\n");

  const narrative = await buildNarrative(ticker, dataBlock, locale);

  return {
    ticker,
    companyName:      profile?.name             ?? ticker,
    sector:           profile?.finnhubIndustry  ?? "N/A",
    exchange:         profile?.exchange          ?? "US",
    price,
    change1D:         chgPct,
    noChangeData:     noChangeData ?? false,
    priceUnavailable,
    source:           rawQ?.source ?? "finnhub",
    marketCap:        fmtCap(met?.marketCapitalization),
    pe,
    peg,
    rsi,
    week52High:       met?.["52WeekHigh"] ?? null,
    week52Low:        met?.["52WeekLow"]  ?? null,
    volume10d:        fmtVol(met?.["10DayAverageTradingVolume"]),
    sparkline:        spark,
    narrative,
    locale,
    generatedAt:      new Date().toISOString(),
  };
}

// ─── Route ───────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  const ticker = (request.nextUrl.searchParams.get("ticker") ?? "").toUpperCase();
  if (!TICKER_RE.test(ticker)) {
    return NextResponse.json({ error: "invalid ticker" }, { status: 400 });
  }
  const locale = (request.nextUrl.searchParams.get("locale") ?? "th") === "en" ? "en" : "th";
  const key    = `${ticker}_${locale}`;

  const hit = cache.get(key);
  if (hit && Date.now() - hit.cachedAt < TTL_MS) {
    return NextResponse.json(hit.data);
  }

  let p = inflight.get(key);
  if (!p) {
    const origin = request.nextUrl.origin;
    p = buildInfographic(ticker, origin, locale)
      .then(data => { cache.set(key, { data, cachedAt: Date.now() }); return data; })
      .finally(() => inflight.delete(key));
    inflight.set(key, p);
  }

  try {
    const data = await p;
    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
