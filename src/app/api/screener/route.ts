import { NextRequest, NextResponse } from "next/server";
import { getUniverseTickers, getSector, type Universe } from "@/lib/stockUniverse";
import { computeScores } from "@/lib/momentum";

export const dynamic = "force-dynamic";

export interface ScreenerRow {
  ticker:        string;
  companyName:   string;
  sector:        string;
  price:         number;
  change1D:      number;
  volume:        number;
  marketCap:     number;
  momentumScore: number;
  qualityScore:  number;
  breakoutScore: number;
  volumeSurge:   number;
}

interface CacheEntry {
  rows:       ScreenerRow[];
  universe:   Universe;
  scannedAt:  string;
  refreshing: boolean;
}

const CACHE         = new Map<Universe, CacheEntry>();
const CACHE_TTL_MS  = 60 * 60 * 1000; // 1 hour
const BATCH_SIZE    = 25;
const DELAY_MS      = 100;

function isStale(entry: CacheEntry): boolean {
  return Date.now() - new Date(entry.scannedAt).getTime() > CACHE_TTL_MS;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function buildData(universe: Universe, apiKey: string): Promise<CacheEntry> {
  const tickers = getUniverseTickers(universe);
  const rows: ScreenerRow[] = [];

  for (let i = 0; i < tickers.length; i += BATCH_SIZE) {
    const batch = tickers.slice(i, i + BATCH_SIZE);

    const batchRows = await Promise.all(
      batch.map(async (ticker): Promise<ScreenerRow | null> => {
        try {
          const res = await fetch(
            `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(ticker)}&token=${apiKey}`,
            { signal: AbortSignal.timeout(2500) }
          );
          if (!res.ok) return null;
          const q = (await res.json()) as { c: number; pc: number; v: number };
          if (!q.c || q.c < 0.5) return null;

          const change1D = q.pc > 0 ? ((q.c - q.pc) / q.pc) * 100 : 0;
          const scores   = computeScores(change1D, q.v, 0, 50, q.c * 1_000_000);

          return {
            ticker,
            companyName:   ticker,
            sector:        getSector(ticker),
            price:         q.c,
            change1D,
            volume:        q.v,
            marketCap:     q.c * 1_000_000,
            momentumScore: scores.momentumScore,
            qualityScore:  scores.qualityScore,
            breakoutScore: scores.breakoutScore,
            volumeSurge:   scores.volumeSurge,
          };
        } catch {
          return null;
        }
      })
    );

    for (const row of batchRows) {
      if (row) rows.push(row);
    }

    if (i + BATCH_SIZE < tickers.length) await sleep(DELAY_MS);
  }

  rows.sort((a, b) => b.momentumScore - a.momentumScore);

  return { rows, universe, scannedAt: new Date().toISOString(), refreshing: false };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const universe = (request.nextUrl.searchParams.get("universe") ?? "SP500") as Universe;
  const apiKey   = process.env.FINNHUB_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "API not configured" }, { status: 500 });

  const cached = CACHE.get(universe);

  if (cached && !isStale(cached)) {
    return NextResponse.json({ ...cached, cached: true });
  }

  if (cached && isStale(cached) && !cached.refreshing) {
    CACHE.set(universe, { ...cached, refreshing: true });
    void buildData(universe, apiKey).then((entry) => CACHE.set(universe, entry));
    return NextResponse.json({ ...cached, cached: true, refreshing: true });
  }

  if (cached?.refreshing) {
    return NextResponse.json({ ...cached, cached: true });
  }

  const entry = await buildData(universe, apiKey);
  CACHE.set(universe, entry);
  return NextResponse.json({ ...entry, cached: false });
}
