import { NextResponse } from "next/server";

export const revalidate = 300;

const CURATED: readonly string[] = [
  "AAPL", "MSFT", "NVDA", "AMZN", "META", "GOOGL", "TSLA", "AMD",  "NFLX", "PLTR",
  "AVGO", "JPM",  "V",    "BAC",  "XOM",  "WMT",   "UNH",  "COST", "DIS",  "PYPL",
  "INTC", "QCOM", "MU",   "UBER", "COIN", "HOOD",  "SOFI", "RIVN", "NIO",  "GME",
  "MARA", "RIOT", "SMCI", "APP",  "HIMS", "RKLB",  "IONQ", "JOBY", "CRWD", "SNOW",
];

interface QuoteData {
  c: number;
  pc: number;
  v: number;
}

interface Mover {
  ticker: string;
  price: number;
  change: number;
  volume: number;
}

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

export async function GET(): Promise<NextResponse> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API not configured" }, { status: 500 });
  }

  const raw = await Promise.all(
    CURATED.map(async (ticker) => {
      const q = await fetchQuote(ticker, apiKey);
      if (!q) return null;
      const change = q.pc > 0 ? ((q.c - q.pc) / q.pc) * 100 : 0;
      return { ticker, price: q.c, change, volume: q.v } satisfies Mover;
    })
  );

  const valid = raw.filter((q): q is Mover => q !== null);

  const gainers = [...valid].sort((a, b) => b.change - a.change).slice(0, 5);
  const losers  = [...valid].sort((a, b) => a.change - b.change).slice(0, 5);
  const active  = [...valid].sort((a, b) => b.volume - a.volume).slice(0, 5);

  return NextResponse.json(
    { gainers, losers, active },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
  );
}
