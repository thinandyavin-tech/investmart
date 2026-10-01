/**
 * Market movers endpoint — FMP identifies movers; Finnhub enriches with live quotes
 * (same source as /stock pages) so the % shown here matches the stock page.
 *
 * GET  /api/radar/movers           → serve cache; fetch on demand if empty/stale
 * GET  /api/radar/movers?force=1   → bypass TTL, always fetch fresh
 * POST /api/radar/movers           → scheduler/webhook refresh (CRON_SECRET protected)
 *
 * Data flow:
 *   1. FMP /stable/biggest-gainers|losers|most-actives  → identify movers
 *   2. Finnhub /quote (batch, same source as /stock)    → enrich price + %
 *   3. Cache enriched result for 30 min in DB
 *
 * If Finnhub enrichment fails, cache retains FMP data labeled as a snapshot.
 * We never fabricate or silently serve wrong data.
 */
import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";

export const dynamic     = "force-dynamic";
export const maxDuration = 45;

const CACHE_KEY = "radar_movers_v2"; // bumped — cache shape changed (added quotedAt/enriched)
const TTL_MS    = 30 * 60 * 1000;

// ── Types ─────────────────────────────────────────────────────────────────────

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
  updatedAt: string; // FMP fetch time (ISO)
  quotedAt?: string; // Finnhub enrichment time (ISO); undefined = FMP snapshot only
  enriched?: boolean;
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

interface FmpRaw {
  symbol?:            string;
  ticker?:            string;
  name?:              string;
  companyName?:       string;
  price?:             number;
  change?:            number;
  changes?:           number;
  changesPercentage?: number | string;
  exchange?:          string;
}

function parsePercent(raw: number | string | undefined): number | null {
  if (raw == null) return null;
  if (typeof raw === "number") return isFinite(raw) ? raw : null;
  const cleaned = String(raw).replace(/[()%\s]/g, "");
  const n = parseFloat(cleaned);
  return isFinite(n) ? n : null;
}

async function fetchFmp(path: string, apiKey: string): Promise<FmpRaw[]> {
  const res = await fetch(
    `https://financialmodelingprep.com/stable/${path}?apikey=${apiKey}`,
    { signal: AbortSignal.timeout(10_000) },
  );
  if (!res.ok) throw new Error(`FMP ${path} HTTP ${res.status}`);

  const body: unknown = await res.json();
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
    const symbol = (item.symbol ?? item.ticker ?? "").trim().toUpperCase();
    const pct    = parsePercent(item.changesPercentage);
    const price  = typeof item.price === "number" ? item.price : null;
    const change = typeof item.change === "number" ? item.change
                 : typeof item.changes === "number" ? item.changes : null;

    if (!symbol || pct === null || price === null || !isFinite(price) || price < 0) continue;
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

// ── Finnhub enrichment ────────────────────────────────────────────────────────
// Replaces FMP's daily-snapshot price/% with Finnhub live quotes so values
// match what the /stock/[ticker] page shows.

interface FinnhubQuoteRaw { c: number; d: number; dp: number; }

async function enrichWithFinnhub(data: MoversCache, apiKey: string): Promise<MoversCache> {
  const symbols = Array.from(new Set([
    ...data.gainers.map(m => m.symbol),
    ...data.losers.map(m => m.symbol),
    ...data.actives.map(m => m.symbol),
  ]));

  const settled = await Promise.allSettled(
    symbols.map(sym =>
      fetch(
        `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(sym)}&token=${apiKey}`,
        { signal: AbortSignal.timeout(8_000) },
      )
        .then(r => r.json() as Promise<FinnhubQuoteRaw>)
        .then(q => ({ sym, q })),
    ),
  );

  const quoteMap = new Map<string, FinnhubQuoteRaw>();
  for (const r of settled) {
    if (r.status === "fulfilled" && r.value.q.c > 0 && isFinite(r.value.q.dp)) {
      quoteMap.set(r.value.sym, r.value.q);
    }
  }

  if (quoteMap.size === 0) return data; // all failed — keep FMP data

  const enrich = (arr: Mover[]): Mover[] =>
    arr.map(m => {
      const q = quoteMap.get(m.symbol);
      return q ? { ...m, price: q.c, change: q.d, changesPercentage: q.dp } : m;
    });

  return {
    gainers:  enrich(data.gainers),
    losers:   enrich(data.losers),
    actives:  enrich(data.actives),
    updatedAt: data.updatedAt,
    quotedAt:  new Date().toISOString(),
    enriched:  true,
  };
}

// ── In-flight lock ────────────────────────────────────────────────────────────

let inFlight: Promise<MoversCache> | null = null;

async function fetchAndCache(fmpKey: string, finnhubKey: string | undefined): Promise<MoversCache> {
  if (inFlight) return inFlight;

  inFlight = (async (): Promise<MoversCache> => {
    const [raw_gainers, raw_losers, raw_actives] = await Promise.all([
      fetchFmp("biggest-gainers", fmpKey),
      fetchFmp("biggest-losers",  fmpKey),
      fetchFmp("most-actives",    fmpKey),
    ]);

    const gainers = normalize(raw_gainers,  "gainer");
    const losers  = normalize(raw_losers,   "loser");
    const actives = normalize(raw_actives,  "active");

    if (gainers.length < 3 && losers.length < 3) {
      throw new Error("FMP returned fewer than 3 rows — possible auth or quota issue");
    }

    let data: MoversCache = {
      gainers,
      losers,
      actives,
      updatedAt: new Date().toISOString(),
      enriched:  false,
    };

    // Enrich with Finnhub live quotes (matches /stock/[ticker] source)
    if (finnhubKey) {
      try {
        data = await enrichWithFinnhub(data, finnhubKey);
      } catch {
        // Keep FMP snapshot; enriched remains false
      }
    }

    await saveCache(data);
    return data;
  })().finally(() => { inFlight = null; });

  return inFlight;
}

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  const limited = await applyRateLimit(request, "default");
  if (limited) return limited;
  const force      = request.nextUrl.searchParams.get("force") === "1";
  const fmpKey     = process.env.FMP_API_KEY?.trim();
  const finnhubKey = process.env.FINNHUB_API_KEY?.trim();

  const cached = await loadCache();
  const ageMs  = cached ? Date.now() - cached._ts : Infinity;
  const stale  = ageMs > TTL_MS;

  if (cached && !stale && !force) {
    return NextResponse.json({
      gainers:   cached.gainers,
      losers:    cached.losers,
      actives:   cached.actives,
      updatedAt: cached.updatedAt,
      quotedAt:  cached.quotedAt,
      enriched:  cached.enriched,
      stale:     false,
      building:  false,
    });
  }

  if (!fmpKey || fmpKey === "demo") {
    if (cached) {
      return NextResponse.json({
        gainers:   cached.gainers,
        losers:    cached.losers,
        actives:   cached.actives,
        updatedAt: cached.updatedAt,
        quotedAt:  cached.quotedAt,
        enriched:  cached.enriched,
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
    const fresh = await fetchAndCache(fmpKey, finnhubKey);
    return NextResponse.json({
      gainers:   fresh.gainers,
      losers:    fresh.losers,
      actives:   fresh.actives,
      updatedAt: fresh.updatedAt,
      quotedAt:  fresh.quotedAt,
      enriched:  fresh.enriched,
      stale:     false,
      building:  false,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (cached) {
      return NextResponse.json({
        gainers:   cached.gainers,
        losers:    cached.losers,
        actives:   cached.actives,
        updatedAt: cached.updatedAt,
        quotedAt:  cached.quotedAt,
        enriched:  cached.enriched,
        stale:     true,
        building:  false,
        error:     `Could not refresh: ${msg}`,
      });
    }
    return NextResponse.json(
      { error: msg, gainers: [], losers: [], actives: [], building: false },
      { status: 502 },
    );
  }
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  const limited = await applyRateLimit(request, "default");
  if (limited) return limited;
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const fmpKey     = process.env.FMP_API_KEY?.trim();
  const finnhubKey = process.env.FINNHUB_API_KEY?.trim();

  if (!fmpKey || fmpKey === "demo") {
    return NextResponse.json({ error: "FMP_API_KEY not configured" }, { status: 503 });
  }

  try {
    const data = await fetchAndCache(fmpKey, finnhubKey);
    return NextResponse.json({
      ok:        true,
      counts:    { gainers: data.gainers.length, losers: data.losers.length, actives: data.actives.length },
      updatedAt: data.updatedAt,
      quotedAt:  data.quotedAt,
      enriched:  data.enriched,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }
}
