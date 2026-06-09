import { NextRequest, NextResponse } from "next/server";
import { searchCatalog } from "@/lib/stockCatalog";
import { SET50_TICKERS } from "@/lib/stockUniverse";
import { STOCK_INFO } from "@/lib/stockNames";

export const dynamic    = "force-dynamic";
export const maxDuration = 5;

// Pre-build SET50 entries from existing stockNames for backward-compat
const SET50_EXTRAS = (() => {
  return SET50_TICKERS
    .filter(t => !searchCatalog(t, 1).some(e => e.ticker === t))
    .map(t => ({
      ticker:   t,
      name:     STOCK_INFO[t]?.name ?? t,
      exchange: "SET" as const,
      sector:   "Other",
      indices:  ["SET50"],
    }));
})();

export async function GET(request: NextRequest): Promise<NextResponse> {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 1) return NextResponse.json({ results: [] });

  // Search the comprehensive catalog first
  const catalogResults = searchCatalog(q, 18);

  // Also search SET50 extras for Thai stocks
  const upper = q.toUpperCase();
  const setResults = SET50_EXTRAS.filter(e => {
    const t = e.ticker.toUpperCase();
    const n = e.name.toUpperCase();
    return t === upper || t.startsWith(upper) || (n.includes(upper) && upper.length >= 2);
  }).slice(0, 4);

  // Merge, deduplicate by ticker
  const seen = new Set<string>();
  const merged = [...catalogResults, ...setResults].filter(e => {
    if (seen.has(e.ticker)) return false;
    seen.add(e.ticker);
    return true;
  });

  const results = merged.slice(0, 20).map(e => ({
    ticker:   e.ticker,
    name:     e.name || e.ticker,
    exchange: e.exchange,
    sector:   e.sector,
    indices:  e.indices,
  }));

  return NextResponse.json({ results });
}
