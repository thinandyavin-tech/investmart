/**
 * Market movers endpoint — real FMP data only, never fabricated.
 *
 * GET  /api/radar/movers           → serve cache; fetch on demand if empty/stale
 * GET  /api/radar/movers?force=1   → bypass TTL, always fetch fresh from FMP
 * POST /api/radar/movers           → scheduler/webhook refresh (requires CRON_SECRET if set)
 *
 * Uses FMP /stable/ endpoints: changesPercentage is a number (not the legacy string "(3.66%)").
 * FMP free tier: 250 calls/day. Each fetch = 3 calls. Safe to fetch on demand.
 *
 * CRITICAL: if FMP returns an error (invalid key, rate limit, bad response),
 * we serve stale cache clearly labeled, or an honest empty state.
 * We never fabricate or silently serve wrong data.
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
    if (!data?._ts || !Array.isArray(data.gainers)) return null;
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

// ── FMP fetch + parse ─────────────────────────────────────────────────────────

// FMP /stable/ returns changesPercentage as a number.
// FMP /v3/ (legacy) returns it as a string like "(3.66%)" — handle both defensively.
interface FmpRaw {
  symbol?:            string;
  ticker?:            string; // legacy field name
  name?:              string;
  companyName?:       string; // legacy field name
  price?:             number;
  change?:            number;
  changes?:           number; // legacy field name
  changesPercentage?: number | string;
  exchange?:          string;
}

function parsePercent(raw: number | string | undefined): number | null {
  if (raw == null) return null;
  if (typeof raw === "number") return isFinite(raw) ? raw : null;
  // Legacy string format: "(3.66%)" or "3.66%"
  const cleaned = String(raw).replace(/[()%\s]/g, "");
  const n = parseFloat(cleaned);
  return isFinite(n) ? n : null;
}

async function fetchFmp(path: string, apiKey: string): Promise<FmpRaw[]> {
  const res = await fetch(
    `https://financialmodelingprep.com/stable/${path}?apikey=${apiKey}`,
    { signal: AbortSignal.timeout(10_000) },
  );

  if (!res.ok) {
    throw new Error(`FMP ${path} HTTP ${res.status}`);
  }

  const body: unknown = await res.json();

  // FMP returns HTTP 200 with an error object on auth/quota failures
  if (!Array.isArray(body)) {
    const msg = (body as Record<string, string>)?.["Error Message"]
      ?? (body as Record<string, string>)?.["message"]
      ?? "FMP returned unexpected response format";
    throw new Error(`FMP error: ${msg}`);
  }

  return body as FmpRaw[];
}

function normalize(items: FmpRaw[], category: Mover["category"]): Mover[] {
  const result: Mover[] = [];

  for (const item of items) {
    const symbol  = (item.symbol ?? item.ticker ?? "").trim().toUpperCase();
    const pct     = parsePercent(item.changesPercentage);
    const price   = typeof item.price === "number" ? item.price : null;
    const change  = typeof item.change === "number" ? item.change
                  : typeof item.changes === "number" ? item.changes : null;

    // Skip malformed rows — no symbol, unparseable percentage, or non-finite price
    if (!symbol || pct === null || price === null || !isFinite(price) || price < 0) continue;
    // Drop rows where the percentage is beyond anything real (> ±10,000%)
    if (Math.abs(pct) > 10_000) continue;

    result.push({
      symbol,
      name:              (item.name ?? item.companyName ?? symbol).slice(0, 80),
      price,
      change:            change ?? 0,
      changesPercentage: pct,
      exchange:          (item.exchange ?? "US").slice(0, 20),
      category,
    });

    if (result.length >= 20) break;
  }

  return result;
}

// ── In-flight lock (single-instance deduplication) ────────────────────────────

let inFlight: Promise<MoversCache> | null = null;

async function fetchAndCache(apiKey: string): Promise<MoversCache> {
  if (inFlight) return inFlight;

  inFlight = (async (): Promise<MoversCache> => {
    const [raw_gainers, raw_losers, raw_actives] = await Promise.all([
      fetchFmp("biggest-gainers", apiKey),
      fetchFmp("biggest-losers",  apiKey),
      fetchFmp("most-actives",    apiKey),
    ]);

    const gainers = normalize(raw_gainers,  "gainer");
    const losers  = normalize(raw_losers,   "loser");
    const actives = normalize(raw_actives,  "active");

    // Reject the whole batch if FMP returned suspiciously empty results
    // (valid calls always return at least 5 rows)
    if (gainers.length < 3 && losers.length < 3) {
      throw new Error("FMP returned fewer than 3 rows — possible auth or quota issue");
    }

    const data: MoversCache = {
      gainers,
      losers,
      actives,
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
  const apiKey = process.env.FMP_API_KEY?.trim();

  const cached = await loadCache();
  const ageMs  = cached ? Date.now() - cached._ts : Infinity;
  const stale  = ageMs > TTL_MS;

  // Serve from cache if fresh and not forced
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

  // No key configured
  if (!apiKey || apiKey === "demo") {
    if (cached) {
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

  // Fetch on demand (stale, empty, or forced)
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
    const msg = err instanceof Error ? err.message : String(err);

    // Return stale cache with honest error label rather than a dead page
    if (cached) {
      return NextResponse.json({
        gainers:   cached.gainers,
        losers:    cached.losers,
        actives:   cached.actives,
        updatedAt: cached.updatedAt,
        stale:     true,
        building:  false,
        error:     `Could not refresh: ${msg}`,
      });
    }

    // No cache at all — honest empty state
    return NextResponse.json(
      { error: msg, gainers: [], losers: [], actives: [], building: false },
      { status: 502 },
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

  const apiKey = process.env.FMP_API_KEY?.trim();
  if (!apiKey || apiKey === "demo") {
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
      { status: 502 },
    );
  }
}
