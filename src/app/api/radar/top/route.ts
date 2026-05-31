import { NextResponse } from "next/server";
import { CEO_PORTFOLIO_TICKERS } from "@/lib/stockUniverse";
import { computeScores } from "@/lib/momentum";

export const revalidate = 300;

interface QuoteData {
  c: number;
  pc: number;
  v: number;
}

interface ProfileData {
  name?: string;
  finnhubIndustry?: string;
}

async function fetchQuote(symbol: string, apiKey: string): Promise<QuoteData | null> {
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`,
      { signal: AbortSignal.timeout(4000) }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as QuoteData;
    return data.c > 0 ? data : null;
  } catch {
    return null;
  }
}

export async function GET() {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API not configured" }, { status: 500 });
  }

  const quotes = await Promise.all(
    CEO_PORTFOLIO_TICKERS.map(async (ticker) => {
      const q = await fetchQuote(ticker, apiKey);
      if (!q) return null;
      const change1D = q.pc > 0 ? ((q.c - q.pc) / q.pc) * 100 : 0;
      const scores = computeScores(change1D, q.v, q.v * 0.5, 50, q.c * 1_000_000);
      return { ticker, price: q.c, change: change1D, momentumScore: scores.momentumScore };
    })
  );

  const valid = quotes
    .filter((q): q is NonNullable<typeof q> => q !== null)
    .sort((a, b) => b.momentumScore - a.momentumScore);

  const top = valid[0];

  if (!top) {
    return NextResponse.json({ error: "no data available" }, { status: 503 });
  }

  let companyName: string = top.ticker;
  let sector = "Technology";
  try {
    const profileRes = await fetch(
      `https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(top.ticker)}&token=${apiKey}`,
      { signal: AbortSignal.timeout(4000) }
    );
    if (profileRes.ok) {
      const profile = (await profileRes.json()) as ProfileData;
      companyName = profile.name ?? top.ticker;
      sector = profile.finnhubIndustry ?? "Technology";
    }
  } catch {
    // fall back to ticker name
  }

  return NextResponse.json(
    { ticker: top.ticker, price: top.price, change: top.change, companyName, sector },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
  );
}
