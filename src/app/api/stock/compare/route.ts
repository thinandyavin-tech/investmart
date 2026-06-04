import { NextRequest, NextResponse } from "next/server";

import { applyRateLimit } from "@/lib/rateLimit";
import type { CompareRow } from "@/lib/compareTypes";

const TICKER_RE  = /^[A-Z][A-Z.\-]{0,9}$/;
const MAX_TICKERS = 3;
const TTL        = 5 * 60 * 1000; // 5 min

// ─── Finnhub types ────────────────────────────────────────────────────────────

interface FinnhubQuote   { c: number; dp: number }
interface FinnhubProfile { name?: string }
interface FinnhubMetric  {
  "52WeekHigh"?:               number;
  "52WeekLow"?:                number;
  "1WeekPriceReturnDaily"?:    number;
  "4WeekPriceReturnDaily"?:    number;
  "13WeekPriceReturnDaily"?:   number;
  peBasicExclExtraTTM?:        number;
  beta?:                       number;
  marketCapitalization?:       number;  // millions
  epsGrowth3Y?:                number;  // %
  dividendYieldIndicatedAnnual?: number;
  "10DayAverageTradingVolume"?: number; // thousands
}

// ─── In-memory cache ──────────────────────────────────────────────────────────

const rowCache = new Map<string, { row: CompareRow; cachedAt: number }>();

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch { return null; }
}

function computeRSI(closes: number[], period = 14): number {
  const recent = closes.slice(-(period * 3));
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const d = recent[i] - recent[i - 1];
    if (d > 0) gains += d; else losses -= d;
  }
  let avgGain = gains / period, avgLoss = losses / period;
  for (let i = period + 1; i < recent.length; i++) {
    const d = recent[i] - recent[i - 1];
    avgGain = (avgGain * (period - 1) + (d > 0 ? d : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (d < 0 ? -d : 0)) / period;
  }
  if (avgLoss === 0) return 100;
  return Math.round(100 - 100 / (1 + avgGain / avgLoss));
}

function fmt(d: Date): string {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

async function buildRow(ticker: string, apiKey: string): Promise<CompareRow> {
  const hit = rowCache.get(ticker);
  if (hit && Date.now() - hit.cachedAt < TTL) return hit.row;

  const base = "https://finnhub.io/api/v1";
  const tok  = `token=${apiKey}`;

  const to   = new Date();
  const from = new Date(to.getTime() - 90 * 24 * 3_600_000);
  const stooqUrl = `https://stooq.com/q/d/l/?s=${ticker.toLowerCase()}.us&d1=${fmt(from)}&d2=${fmt(to)}&i=d`;

  const [quoteR, profileR, metricR, stooqR] = await Promise.allSettled([
    fetchJson<FinnhubQuote>(`${base}/quote?symbol=${ticker}&${tok}`),
    fetchJson<FinnhubProfile>(`${base}/stock/profile2?symbol=${ticker}&${tok}`),
    fetchJson<{ metric?: FinnhubMetric }>(`${base}/stock/metric?symbol=${ticker}&metric=all&${tok}`),
    fetch(stooqUrl, { signal: AbortSignal.timeout(4000) })
      .then((r) => (r.ok ? r.text() : null))
      .catch(() => null),
  ]);

  const q = quoteR.status   === "fulfilled" ? quoteR.value   : null;
  const p = profileR.status === "fulfilled" ? profileR.value : null;
  const m = metricR.status  === "fulfilled" ? metricR.value?.metric ?? null : null;

  let rsi: number | null = null;
  if (stooqR.status === "fulfilled" && typeof stooqR.value === "string") {
    const lines  = stooqR.value.trim().split("\n").slice(1);
    const closes = lines
      .map((l) => parseFloat(l.split(",")[4] ?? ""))
      .filter((v) => !isNaN(v) && v > 0);
    if (closes.length >= 15) rsi = computeRSI(closes);
  }

  const pe         = m?.peBasicExclExtraTTM ?? null;
  const epsGrowth3Y = m?.epsGrowth3Y ?? null;
  const pegRatio   = pe && epsGrowth3Y && epsGrowth3Y > 0
    ? Math.round((pe / epsGrowth3Y) * 100) / 100
    : null;

  const row: CompareRow = {
    ticker,
    name:         p?.name ?? ticker,
    price:        q?.c  ?? null,
    change1D:     q?.dp ?? null,
    change1W:     m?.["1WeekPriceReturnDaily"]  ?? null,
    change1M:     m?.["4WeekPriceReturnDaily"]  ?? null,
    change3M:     m?.["13WeekPriceReturnDaily"] ?? null,
    marketCapB:   m?.marketCapitalization != null ? m.marketCapitalization / 1000 : null,
    pe,
    epsGrowth3Y,
    pegRatio,
    beta:         m?.beta ?? null,
    rsi,
    high52W:      m?.["52WeekHigh"] ?? null,
    low52W:       m?.["52WeekLow"]  ?? null,
    volumeAvg10D: m?.["10DayAverageTradingVolume"] != null
      ? m["10DayAverageTradingVolume"]! * 1_000
      : null,
  };

  rowCache.set(ticker, { row, cachedAt: Date.now() });
  return row;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  const limited = await applyRateLimit(request, "quote");
  if (limited) return limited;

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "API not configured" }, { status: 503 });

  const raw     = request.nextUrl.searchParams.get("tickers") ?? "";
  const tickers = raw
    .split(",")
    .map((t) => t.trim().toUpperCase())
    .filter((t) => TICKER_RE.test(t))
    .slice(0, MAX_TICKERS);

  if (tickers.length === 0) {
    return NextResponse.json({ error: "tickers required" }, { status: 400 });
  }

  const rows = await Promise.all(tickers.map((t) => buildRow(t, apiKey)));
  return NextResponse.json({ rows });
}
