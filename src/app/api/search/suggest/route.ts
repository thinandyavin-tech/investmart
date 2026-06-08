import { NextRequest, NextResponse } from "next/server";
import {
  SP500_TICKERS, NASDAQ100_TICKERS, SET50_TICKERS, CEO_PORTFOLIO_TICKERS,
} from "@/lib/stockUniverse";
import { STOCK_INFO } from "@/lib/stockNames";

export const dynamic    = "force-dynamic";
export const maxDuration = 5;

interface Suggestion {
  ticker:   string;
  name:     string;
  exchange: string;
  indices:  string[];
}

// Build a deduplicated flat list of every ticker in all universes at module load time.
// This runs once per warm instance — no per-request cost.
const ALL_TICKERS: Suggestion[] = (() => {
  const sets: [string, readonly string[]][] = [
    ["S&P 500",   SP500_TICKERS],
    ["NASDAQ 100",NASDAQ100_TICKERS],
    ["SET 50",   SET50_TICKERS],
    ["CEO",       CEO_PORTFOLIO_TICKERS],
  ];
  const map = new Map<string, Suggestion>();
  for (const [index, tickers] of sets) {
    for (const t of tickers) {
      const info = STOCK_INFO[t];
      if (map.has(t)) {
        map.get(t)!.indices.push(index);
      } else {
        map.set(t, {
          ticker:   t,
          name:     info?.name ?? "",
          exchange: info?.exchange ?? (t.endsWith(".BK") ? "SET" : "US"),
          indices:  [index],
        });
      }
    }
  }
  return Array.from(map.values());
})();

// Rank: 0 = exact ticker, 1 = ticker prefix, 2 = name prefix, 3 = name contains
function score(s: Suggestion, upper: string): number | null {
  const tickerUpper = s.ticker.toUpperCase();
  const nameUpper   = s.name.toUpperCase();
  if (tickerUpper === upper)                   return 0;
  if (tickerUpper.startsWith(upper))           return 1;
  if (nameUpper.startsWith(upper))             return 2;
  if (nameUpper.includes(upper) && upper.length >= 2) return 3;
  return null;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 1) return NextResponse.json({ results: [] });

  const upper = q.toUpperCase();

  const scored: { s: Suggestion; rank: number }[] = [];
  for (const s of ALL_TICKERS) {
    const rank = score(s, upper);
    if (rank !== null) scored.push({ s, rank });
  }

  scored.sort((a, b) => a.rank - b.rank || a.s.ticker.localeCompare(b.s.ticker));

  const results = scored.slice(0, 20).map(({ s }) => ({
    ticker:   s.ticker,
    name:     s.name || s.ticker,
    exchange: s.exchange,
    indices:  s.indices,
  }));

  return NextResponse.json({ results });
}
