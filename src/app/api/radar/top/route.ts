import { NextResponse } from "next/server";
import { CEO_PORTFOLIO_TICKERS } from "@/lib/stockUniverse";
import { computeScores } from "@/lib/momentum";

interface QuoteData { c: number; pc: number; v: number; }
interface ProfileData { name?: string; finnhubIndustry?: string; }

interface TopPick {
  ticker:      string;
  price:       number;
  change:      number;
  companyName: string;
  sector:      string;
}

// In-memory cache — survives across warm invocations
let cachedPick: TopPick | null = null;
let cacheTime  = 0;
const TTL_MS   = 5 * 60 * 1000; // 5 minutes

async function fetchQuote(symbol: string, apiKey: string): Promise<QuoteData | null> {
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`,
      { signal: AbortSignal.timeout(3000) }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as QuoteData;
    return data.c > 0 ? data : null;
  } catch {
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function GET(): Promise<NextResponse> {
  // Serve stale cache immediately — don't block on a slow scan
  if (cachedPick && Date.now() - cacheTime < TTL_MS) {
    return NextResponse.json(cachedPick);
  }

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return cachedPick
      ? NextResponse.json(cachedPick)
      : NextResponse.json({ error: "API not configured" }, { status: 500 });
  }

  // Fetch in small batches to stay under Finnhub 30 req/s limit
  const results: { ticker: string; price: number; change: number; momentumScore: number }[] = [];

  for (let i = 0; i < CEO_PORTFOLIO_TICKERS.length; i += 5) {
    const batch = CEO_PORTFOLIO_TICKERS.slice(i, i + 5);
    const batchResults = await Promise.all(
      batch.map(async (ticker) => {
        const q = await fetchQuote(ticker, apiKey);
        if (!q) return null;
        const change1D = q.pc > 0 ? ((q.c - q.pc) / q.pc) * 100 : 0;
        const scores = computeScores(change1D, q.v, q.v * 0.5, 50, q.c * 1_000_000);
        return { ticker, price: q.c, change: change1D, momentumScore: scores.momentumScore };
      })
    );
    for (const r of batchResults) {
      if (r) results.push(r);
    }
    if (i + 5 < CEO_PORTFOLIO_TICKERS.length) await sleep(150);
  }

  if (results.length === 0) {
    // All fetches failed — return stale cache or fallback
    if (cachedPick) return NextResponse.json(cachedPick);
    return NextResponse.json(
      { ticker: "AAPL", price: 0, change: 0, companyName: "Apple Inc", sector: "Technology" }
    );
  }

  results.sort((a, b) => b.momentumScore - a.momentumScore);
  const top = results[0];

  let companyName = top.ticker;
  let sector      = "Technology";
  try {
    const profileRes = await fetch(
      `https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(top.ticker)}&token=${apiKey}`,
      { signal: AbortSignal.timeout(3000) }
    );
    if (profileRes.ok) {
      const profile = (await profileRes.json()) as ProfileData;
      companyName = profile.name ?? top.ticker;
      sector      = profile.finnhubIndustry ?? "Technology";
    }
  } catch {
    // fall back to ticker name
  }

  cachedPick = { ticker: top.ticker, price: top.price, change: top.change, companyName, sector };
  cacheTime  = Date.now();

  return NextResponse.json(cachedPick);
}
