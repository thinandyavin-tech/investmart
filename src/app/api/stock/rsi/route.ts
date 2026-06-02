import { NextRequest, NextResponse } from "next/server";

const TICKER_RE = /^[A-Z][A-Z.\-]{0,9}$/;

interface CacheEntry { rsi: number; ts: number }
const cache = new Map<string, CacheEntry>();
const TTL   = 15 * 60 * 1000; // 15 min

function computeRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;

  const recent = closes.slice(-(period * 3)); // last 3×period for accuracy
  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = recent[i] - recent[i - 1];
    if (diff > 0) gains  += diff;
    else          losses -= diff;
  }

  let avgGain = gains  / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < recent.length; i++) {
    const diff = recent[i] - recent[i - 1];
    avgGain = (avgGain * (period - 1) + (diff > 0 ? diff : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (diff < 0 ? -diff : 0)) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return Math.round(100 - 100 / (1 + rs));
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const symbol = req.nextUrl.searchParams.get("symbol")?.toUpperCase().trim();
  if (!symbol || !TICKER_RE.test(symbol)) {
    return NextResponse.json({ error: "invalid symbol" }, { status: 400 });
  }

  const hit = cache.get(symbol);
  if (hit && Date.now() - hit.ts < TTL) {
    return NextResponse.json({ rsi: hit.rsi, symbol });
  }

  // Fetch 3 months of daily data from Stooq
  const to   = new Date();
  const from = new Date(to.getTime() - 90 * 24 * 3600 * 1000);
  const fmt  = (d: Date) =>
    `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;

  try {
    const res = await fetch(
      `https://stooq.com/q/d/l/?s=${encodeURIComponent(symbol.toLowerCase())}.us&d1=${fmt(from)}&d2=${fmt(to)}&i=d`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return NextResponse.json({ rsi: 50, symbol });

    const text = await res.text();
    const lines = text.trim().split("\n").slice(1); // skip header
    const closes = lines
      .map((l) => parseFloat(l.split(",")[4] ?? ""))
      .filter((v) => !isNaN(v) && v > 0);

    if (closes.length < 15) return NextResponse.json({ rsi: 50, symbol });

    const rsi = computeRSI(closes);
    cache.set(symbol, { rsi, ts: Date.now() });
    return NextResponse.json({ rsi, symbol });
  } catch {
    return NextResponse.json({ rsi: 50, symbol });
  }
}
