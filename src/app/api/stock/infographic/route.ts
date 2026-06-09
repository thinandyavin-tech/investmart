import { NextRequest, NextResponse } from "next/server";

import { generateText } from "@/lib/aiService";

export const dynamic = "force-dynamic";

const TICKER_RE = /^[A-Z][A-Z.\-]{0,9}$/;
const TTL_MS    = 15 * 60 * 1000; // 15 min cache per ticker

// ─── Types ───────────────────────────────────────────────────────────────────

export interface InfographicData {
  ticker:           string;
  companyName:      string;
  sector:           string;
  price:            number;
  change1D:         number;       // percent
  priceUnavailable: boolean;      // true when Finnhub returned no price (e.g. SET stocks)
  marketCap:        string;       // formatted e.g. "$2.8T"
  pe:               string;       // e.g. "31.1x" or "N/A"
  peg:              string;       // calculated or "N/A"
  rsi:              number | null;
  week52High:       number | null;
  week52Low:        number | null;
  volume10d:        string;       // formatted
  sparkline:        number[];     // last 30 close prices for mini chart
  takeaway:         string;       // AI-generated Thai takeaway ~80 words
  generatedAt:      string;       // ISO timestamp
}

interface CacheEntry { data: InfographicData; cachedAt: number }
const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<InfographicData>>();

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function fetchJ<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(4000) });
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
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const d = recent[i] - recent[i - 1];
    if (d > 0) gains += d; else losses -= d;
  }
  let ag = gains / period;
  let al = losses / period;
  for (let i = period + 1; i < recent.length; i++) {
    const d = recent[i] - recent[i - 1];
    ag = (ag * (period - 1) + (d > 0 ? d : 0)) / period;
    al = (al * (period - 1) + (d < 0 ? -d : 0)) / period;
  }
  if (al === 0) return 100;
  return Math.round(100 - 100 / (1 + ag / al));
}

// ─── Data builder ─────────────────────────────────────────────────────────────

async function buildInfographic(ticker: string, origin: string): Promise<InfographicData> {
  const base  = origin;
  const fin   = process.env.FINNHUB_API_KEY ?? "";
  const fBase = "https://finnhub.io/api/v1";

  // Actual shapes from our API routes
  interface RawQuote   { c: number; d: number; dp: number; h: number; l: number; o: number; pc: number }
  interface RawMetrics { peBasicExclExtraTTM?: number; beta?: number; marketCapitalization?: number; epsGrowth3Y?: number; "52WeekHigh"?: number; "52WeekLow"?: number; "10DayAverageTradingVolume"?: number }
  // /api/stock/profile returns { profile: {...}, metrics: { metric: {...}, series: {...}, ... } }
  interface RawProfile { profile?: { name?: string; finnhubIndustry?: string }; metrics?: { metric?: RawMetrics } }
  interface RawHistory { candles?: { time: number; open: number; high: number; low: number; close: number; volume: number }[] }
  interface FinnMetric { metric?: RawMetrics }

  const [quoteR, profileR, histR, metR] = await Promise.allSettled([
    fetchJ<RawQuote>(`${base}/api/stock/quote?symbol=${ticker}`),
    fetchJ<RawProfile>(`${base}/api/stock/profile?symbol=${ticker}`),
    fetchJ<RawHistory>(`${base}/api/stock/history?symbol=${ticker}&timeframe=3M`),
    fetchJ<FinnMetric>(`${fBase}/stock/metric?symbol=${ticker}&metric=all&token=${fin}`),
  ]);

  const rawQ    = quoteR.status   === "fulfilled" ? quoteR.value   : null;
  const rawP    = profileR.status === "fulfilled" ? profileR.value : null;
  const hist    = histR.status    === "fulfilled" ? histR.value    : null;
  // Prefer direct Finnhub metrics, fall back to profile's nested metric object
  const met     = (metR.status === "fulfilled" ? metR.value?.metric : null)
               ?? rawP?.metrics?.metric
               ?? null;

  const profile          = rawP?.profile ?? null;
  const price            = rawQ?.c ?? 0;
  const chgPct           = rawQ?.dp ?? 0;
  // Finnhub returns c=0 for tickers it doesn't cover (e.g. SET stocks, some OTC)
  const priceUnavailable = !rawQ || rawQ.c === 0;

  const closes  = (hist?.candles ?? []).map(c => c.close);
  const rsi     = closes.length >= 15 ? computeRSI(closes) : null;
  const spark   = closes.slice(-30);

  const pe  = met?.peBasicExclExtraTTM ? `${met.peBasicExclExtraTTM.toFixed(1)}x` : "N/A";
  const peg = (met?.peBasicExclExtraTTM && met?.epsGrowth3Y && met.epsGrowth3Y > 0)
    ? `${(met.peBasicExclExtraTTM / met.epsGrowth3Y).toFixed(2)}x`
    : "N/A";

  const dataBlock = [
    `${ticker} — ${profile?.name ?? ticker} (${profile?.finnhubIndustry ?? "N/A"})`,
    priceUnavailable ? "ราคา: ไม่มีข้อมูลจาก Finnhub (อาจเป็นหุ้นนอก US หรือ OTC)" : `ราคา: $${price.toFixed(2)} (${chgPct >= 0 ? "+" : ""}${chgPct.toFixed(2)}% วันนี้)`,
    met?.marketCapitalization ? `Market Cap: ${fmtCap(met.marketCapitalization)}` : "",
    `P/E TTM: ${pe}, PEG: ${peg}`,
    rsi !== null ? `RSI-14: ${rsi}` : "",
    met?.["52WeekHigh"] ? `52W range: $${met["52WeekLow"]?.toFixed(2)} – $${met["52WeekHigh"]?.toFixed(2)}` : "",
  ].filter(Boolean).join("\n");

  const takeaway = await generateText(
    `ข้อมูลล่าสุดของ ${ticker}:\n${dataBlock}\n\nเขียน takeaway ภาษาไทย ~80 คำ ในฐานะ Martin นักวิเคราะห์ InvestMart — สรุปสิ่งที่ข้อมูลบอก จุดแข็งหรือจุดอ่อนสำคัญ และประเด็นที่ต้องติดตาม ใช้ข้อมูลที่ได้รับเท่านั้น อย่าแนะนำซื้อขาย`,
    "คุณคือ Martin นักวิเคราะห์หุ้น InvestMart ตอบภาษาไทย กระชับ มีจุดยืน ใช้ข้อมูลที่ได้รับเท่านั้น ห้ามเดาตัวเลข",
    { maxTokens: 200, temperature: 0.25 },
  ).catch(() => "ไม่สามารถสร้าง takeaway ได้ในขณะนี้");

  return {
    ticker,
    companyName:      profile?.name ?? ticker,
    sector:           profile?.finnhubIndustry ?? "N/A",
    price,
    change1D:         chgPct,
    priceUnavailable,
    marketCap:    fmtCap(met?.marketCapitalization),
    pe,
    peg,
    rsi,
    week52High:   met?.["52WeekHigh"] ?? null,
    week52Low:    met?.["52WeekLow"]  ?? null,
    volume10d:    fmtVol(met?.["10DayAverageTradingVolume"]),
    sparkline:    spark,
    takeaway:     takeaway.trim(),
    generatedAt:  new Date().toISOString(),
  };
}

// ─── Route ───────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  const ticker = (request.nextUrl.searchParams.get("ticker") ?? "").toUpperCase();
  if (!TICKER_RE.test(ticker)) {
    return NextResponse.json({ error: "invalid ticker" }, { status: 400 });
  }

  const hit = cache.get(ticker);
  if (hit && Date.now() - hit.cachedAt < TTL_MS) {
    return NextResponse.json(hit.data);
  }

  // In-flight deduplication
  let p = inflight.get(ticker);
  if (!p) {
    const origin = request.nextUrl.origin;
    p = buildInfographic(ticker, origin)
      .then(data => { cache.set(ticker, { data, cachedAt: Date.now() }); return data; })
      .finally(() => inflight.delete(ticker));
    inflight.set(ticker, p);
  }

  try {
    const data = await p;
    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
