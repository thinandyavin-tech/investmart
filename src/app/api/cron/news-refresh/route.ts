import { rejectUnlessCron } from "@/lib/cronAuth";
import { NextRequest, NextResponse } from "next/server";

export const dynamic    = "force-dynamic";
export const maxDuration = 60;


const SECTOR_TICKERS: Record<string, string[]> = {
  all:      [],
  tech:     ["AAPL", "MSFT", "NVDA", "GOOGL", "META"],
  finance:  ["JPM", "BAC", "GS", "V", "BLK"],
  health:   ["JNJ", "LLY", "PFE", "ABBV", "UNH"],
  biotech:  ["MRNA", "GILD", "BIIB", "VRTX", "REGN"],
  energy:   ["XOM", "CVX", "COP", "SLB", "OXY"],
  consumer: ["AMZN", "TSLA", "HD", "MCD", "NKE"],
  indust:   ["GE", "CAT", "DE", "RTX", "HON"],
  space:    ["RKLB", "JOBY", "IONQ", "BA", "LMT"],
  crypto:   ["COIN", "MSTR", "MARA", "RIOT", "HOOD"],
};

const POPULAR = ["AAPL", "NVDA", "TSLA", "MSFT", "META", "AMZN", "GOOGL", "AMD", "PLTR", "NFLX"];

export async function GET(req: NextRequest): Promise<NextResponse> {
  const denied = rejectUnlessCron(req);
  if (denied) return denied;

  const base = req.nextUrl.origin;

  // Warm all sector tabs in parallel
  const sectorKeys = Object.keys(SECTOR_TICKERS);
  const sectorFetches = sectorKeys.map((s) =>
    fetch(`${base}/api/news/sector?sector=${s}`, { signal: AbortSignal.timeout(15_000) }).catch(() => null)
  );

  // Warm stock news for popular tickers
  const stockFetches = POPULAR.map((t) =>
    fetch(`${base}/api/stock/news?symbol=${t}`, { signal: AbortSignal.timeout(8_000) }).catch(() => null)
  );

  // Warm market news
  const marketFetch = fetch(`${base}/api/market/news`, { signal: AbortSignal.timeout(10_000) }).catch(() => null);

  const results = await Promise.allSettled([...sectorFetches, ...stockFetches, marketFetch]);

  const ok     = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.length - ok;

  return NextResponse.json({
    refreshed: ok,
    failed,
    sectors:   sectorKeys.length,
    stocks:    POPULAR.length,
    ts:        new Date().toISOString(),
  });
}
