/**
 * Screener ticker list — returns the static catalog for a universe.
 * No Finnhub calls here. Live quotes are fetched per visible page via /api/screener/quotes.
 * This prevents the full-universe burst that exhausted the rate limit on cold starts.
 */
import { NextRequest, NextResponse } from "next/server";
import { getUniverseTickers, getSector, type Universe } from "@/lib/stockUniverse";
import { CATALOG } from "@/lib/stockCatalog";
import { STOCK_INFO } from "@/lib/stockNames";

export const dynamic = "force-dynamic";

export interface ScreenerTicker {
  ticker:   string;
  name:     string;
  sector:   string;
  exchange: string;
}

// Kept for any consumers of the old ScreenerRow shape (metrics route, etc.)
export interface ScreenerRow extends ScreenerTicker {
  price:         number;
  change1D:      number;
  volume:        number;
  marketCap:     number;
  momentumScore: number;
  qualityScore:  number;
  breakoutScore: number;
  volumeSurge:   number;
}

function resolveName(ticker: string): string {
  return CATALOG.get(ticker)?.name ?? STOCK_INFO[ticker]?.name ?? ticker;
}

function resolveExchange(ticker: string): string {
  const ex = CATALOG.get(ticker)?.exchange;
  return ex ?? "US";
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const raw      = request.nextUrl.searchParams.get("universe") ?? "SP500";
  const universe = (["SP500","NASDAQ100","CEO","SET50"].includes(raw) ? raw : "SP500") as Universe;

  const tickers: ScreenerTicker[] = getUniverseTickers(universe).map(ticker => ({
    ticker,
    name:     resolveName(ticker),
    sector:   getSector(ticker),
    exchange: resolveExchange(ticker),
  }));

  return NextResponse.json({
    tickers,
    universe,
    total:       tickers.length,
    generatedAt: new Date().toISOString(),
  });
}
