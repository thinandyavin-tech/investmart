/**
 * Market movers endpoint — fetches FMP daily snapshot and caches in DB.
 *
 * GET  /api/radar/movers           → serve cache; fetch on demand if empty/stale
 * GET  /api/radar/movers?force=1   → bypass TTL, always fetch fresh from FMP
 * POST /api/radar/movers           → scheduler/webhook refresh (requires CRON_SECRET if set)
 *
 * FMP free tier: 250 calls/day. Each fetch uses 3 calls (gainers + losers + actives).
 * On-demand fetches are safe — the page self-heals without needing a scheduler.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic     = "force-dynamic";
export const maxDuration = 30;

const CACHE_KEY = "radar_movers_v1";
const TTL_MS    = 30 * 60 * 1000; // 30 min

export interface Mover {
  symbol:            string;
  name:              string;
  price:             number;
  change:            number;
  changesPercentage: number;
  exchange:          string;
  category:          "gainer" | "loser" | "active";
}

export interface MoversCache {
  gainers:   Mover[];
  losers:    Mover[];
  actives:   Mover[];
  updatedAt: string;
}

// ── DB helpers ────────────────────────────────────────────────────────────────

interface StoredCache extends MoversCache { _ts: number; }

async function loadCache(): Promise<StoredCache | null> {
  try {
    const row = await prisma.siteCache.findUnique({ where: { key: CACHE_KEY } });
    if (!row) return null;
    const data = row.value as unknown as StoredCache;
    if (!data?._ts) return null;
    return data;
  } catch { return null; }
}

async function saveCache(data: MoversCache): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const val: any = { ...data, _ts: Date.now() };
  await prisma.siteCache.upsert({
    where:  { key: CACHE_KEY },
    update: { value: val },
    create: { key: CACHE_KEY, value: val },
  });
}

// ── FMP fetch ─────────────────────────────────────────────────────────────────

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
  return items.slice(0, 20).map((item) => ({
    symbol:            item.symbol,
    name:              item.name ?? item.symbol,
    price:             item.price,
    change:            item.change,
    changesPercentage: item.changesPercentage,
    exchange:          item.exchange ?? "US",
    category,
  }));
}

// ── In-flight lock (single-instance deduplication) ────────────────────────────

let inFlight: Promise<MoversCache> | null = null;

async function fetchAndCache(apiKey: string): Promise<MoversCache> {
  if (inFlight) return inFlight;

  inFlight = (async () => {
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
    return data;
  })().finally(() => { inFlight = null; });

  return inFlight;
}

// ── GET — serve cache, fetch on demand when empty/stale ───────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  const force  = request.nextUrl.searchParams.get("force") === "1";
  const apiKey = process.env.FMP_API_KEY;

  const cached = await loadCache();
  const ageMs  = cached ? Date.now() - cached._ts : Infinity;
  const stale  = ageMs > TTL_MS;

  // Serve fresh cache immediately if within TTL and not forced
  if (cached && !stale && !force) {
    return NextResponse.json({
      gainers:   cached.gainers,
      losers:    cached.losers,
      actives:   cached.actives,
      updatedAt: cached.updatedAt,
      stale:     false,
      building:  false,
    });
  }

  // Fetch on demand (empty, stale, or forced)
  if (!apiKey) {
    if (cached) {
      // Return stale data with honest label rather than an error
      return NextResponse.json({
        gainers:   cached.gainers,
        losers:    cached.losers,
        actives:   cached.actives,
        updatedAt: cached.updatedAt,
        stale:     true,
        building:  false,
        error:     "FMP_API_KEY not configured — showing last cached data",
      });
    }
    return NextResponse.json(
      { error: "FMP_API_KEY not configured", gainers: [], losers: [], actives: [], building: false },
      { status: 503 },
    );
  }

  try {
    const fresh = await fetchAndCache(apiKey);
    return NextResponse.json({
      gainers:   fresh.gainers,
      losers:    fresh.losers,
      actives:   fresh.actives,
      updatedAt: fresh.updatedAt,
      stale:     false,
      building:  false,
    });
  } catch (err) {
    // FMP failed — return stale data if available, error otherwise
    if (cached) {
      return NextResponse.json({
        gainers:   cached.gainers,
        losers:    cached.losers,
        actives:   cached.actives,
        updatedAt: cached.updatedAt,
        stale:     true,
        building:  false,
        error:     `Could not refresh: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err), gainers: [], losers: [], actives: [], building: false },
      { status: 500 },
    );
  }
}

// ── POST — scheduler/webhook refresh (optional, CRON_SECRET protected) ───────

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
    const data = await fetchAndCache(apiKey);
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
