/**
 * Market movers endpoint — fetches FMP daily snapshot and caches it.
 *
 * GET  /api/radar/movers          → return cached movers (reads only)
 * POST /api/radar/movers          → refresh cache from FMP (requires CRON_SECRET)
 *
 * FMP free tier: 250 calls/day, 5/min.
 * Each POST uses 3 calls (gainers + losers + actives).
 * At 30-min refresh intervals: 3 × 48 = 144 calls/day — safely within quota.
 *
 * External scheduler (cron-job.org):
 *   URL:     https://investmart.vercel.app/api/radar/movers
 *   Method:  POST
 *   Interval: every 30 minutes
 *   Header:  Authorization: Bearer <CRON_SECRET>
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic    = "force-dynamic";
export const maxDuration = 30;

const CACHE_KEY = "radar_movers_v1";
const TTL_MS    = 30 * 60 * 1000; // 30 min

export interface Mover {
  symbol:           string;
  name:             string;
  price:            number;
  change:           number;
  changesPercentage:number;
  exchange:         string;
  category:         "gainer" | "loser" | "active";
}

export interface MoversCache {
  gainers:   Mover[];
  losers:    Mover[];
  actives:   Mover[];
  updatedAt: string; // ISO
}

async function loadCache(): Promise<MoversCache | null> {
  try {
    const row = await prisma.siteCache.findUnique({ where: { key: CACHE_KEY } });
    if (!row) return null;
    const data = row.value as unknown as MoversCache & { _ts?: number };
    // Reject entries older than 4 hours (stale beyond usefulness)
    if (data._ts && Date.now() - data._ts > 4 * 60 * 60 * 1000) return null;
    return data;
  } catch { return null; }
}

async function saveCache(data: MoversCache): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const val = { ...data, _ts: Date.now() } as any;
  await prisma.siteCache.upsert({
    where:  { key: CACHE_KEY },
    update: { value: val },
    create: { key: CACHE_KEY, value: val },
  });
}

interface FmpItem {
  symbol:            string;
  name:              string;
  price:             number;
  change:            number;
  changesPercentage: number;
  exchange:          string;
}

async function fetchFmp(path: string, apiKey: string): Promise<FmpItem[]> {
  const res = await fetch(
    `https://financialmodelingprep.com/stable/${path}?apikey=${apiKey}`,
    { signal: AbortSignal.timeout(10_000) },
  );
  if (!res.ok) throw new Error(`FMP ${path} returned ${res.status}`);
  return (await res.json()) as FmpItem[];
}

function normalize(items: FmpItem[], category: Mover["category"]): Mover[] {
  return items.map((item) => ({
    symbol:            item.symbol,
    name:              item.name ?? item.symbol,
    price:             item.price,
    change:            item.change,
    changesPercentage: item.changesPercentage,
    exchange:          item.exchange ?? "US",
    category,
  }));
}

// ── GET — serve cache ─────────────────────────────────────────────────────────

export async function GET(): Promise<NextResponse> {
  const cached = await loadCache();

  if (!cached) {
    return NextResponse.json({
      gainers: [], losers: [], actives: [],
      updatedAt: null, building: true,
    });
  }

  const ageMs   = Date.now() - new Date(cached.updatedAt).getTime();
  const stale   = ageMs > TTL_MS;

  return NextResponse.json({
    gainers:   cached.gainers,
    losers:    cached.losers,
    actives:   cached.actives,
    updatedAt: cached.updatedAt,
    building:  false,
    stale,
  });
}

// ── POST — refresh from FMP (protected) ──────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "FMP_API_KEY not configured" }, { status: 503 });
  }

  try {
    const [raw_gainers, raw_losers, raw_actives] = await Promise.all([
      fetchFmp("biggest-gainers", apiKey),
      fetchFmp("biggest-losers",  apiKey),
      fetchFmp("most-actives",    apiKey),
    ]);

    const data: MoversCache = {
      gainers:   normalize(raw_gainers,  "gainer"),
      losers:    normalize(raw_losers,   "loser"),
      actives:   normalize(raw_actives,  "active"),
      updatedAt: new Date().toISOString(),
    };

    await saveCache(data);

    return NextResponse.json({
      ok:        true,
      counts:    { gainers: data.gainers.length, losers: data.losers.length, actives: data.actives.length },
      updatedAt: data.updatedAt,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
