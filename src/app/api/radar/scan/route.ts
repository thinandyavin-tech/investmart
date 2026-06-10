/**
 * Radar scan endpoint — reads from cache ONLY on the hot path.
 *
 * Architecture:
 *  - GET ?universe=SP500 → instant read from L1 (memory) or L2 (DB)
 *  - Cold cache: return {building:true} immediately, trigger precompute async
 *  - Stale but usable: return stale data + trigger background refresh
 *  - NEVER blocks the request for a live full-universe scan
 *
 * The actual scanning lives in /api/cron/radar-precompute (scheduled) or
 * /api/radar/trigger (on-demand admin). This endpoint is read-only.
 */
import { NextRequest, NextResponse } from "next/server";

import { type Universe } from "@/lib/stockUniverse";
import { filterByCapSize, type CapSize } from "@/lib/momentum";
import type { StockMetrics } from "@/lib/momentum";
import { getScan, setScan, isStale, getBaseline, type ScanEntry } from "@/lib/scanCache";
import { scanUniverse, loadDbScan, saveDbScan, dbScanFresh, dbScanUsable } from "@/lib/radarScan";
import { applyRateLimit } from "@/lib/rateLimit";

export const dynamic    = "force-dynamic";
export const maxDuration = 15; // reads only — should return in <1s from cache

interface FilterOpts {
  minScore:   number;
  capSize:    CapSize;
  filterDead: boolean;
}

function l1Key(universe: Universe, opts: FilterOpts): string {
  return `${universe}|${opts.minScore}|${opts.capSize}|${opts.filterDead}`;
}

function applyFilters(raw: StockMetrics[], opts: FilterOpts): StockMetrics[] {
  return raw.filter((s) => {
    if (opts.filterDead && s.price < 1) return false;
    if (s.momentumScore < opts.minScore) return false;
    return filterByCapSize(s, opts.capSize);
  });
}

function markNew(results: StockMetrics[], base: Set<string>): void {
  for (const s of results) s.isNew = base.size > 0 && !base.has(s.ticker);
}

function triggerBackgroundScan(universe: Universe, apiKey: string): void {
  void (async () => {
    try {
      const { results, total } = await scanUniverse(universe, apiKey);
      await saveDbScan(universe, results, total);
      // Warm L1 with the no-filter set so next read is instant
      const opts: FilterOpts = { minScore: 0, capSize: "ALL", filterDead: false };
      setScan(l1Key(universe, opts), { results, total, scannedAt: new Date().toISOString(), refreshing: false });
    } catch { /* non-fatal — cron will retry */ }
  })();
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const limited = await applyRateLimit(request, "scan");
  if (limited) return limited;

  const params     = request.nextUrl.searchParams;
  const universe   = (params.get("universe") ?? "SP500") as Universe;
  const minScore   = parseInt(params.get("minScore") ?? "0", 10);
  const capSize    = (params.get("capSize") ?? "ALL") as CapSize;
  const filterDead = params.get("filterDead") !== "false";

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "API not configured" }, { status: 500 });

  const opts = { minScore, capSize, filterDead } satisfies FilterOpts;
  const key  = l1Key(universe, opts);
  const base = getBaseline(key);

  // ── L1: in-process memory ─────────────────────────────────────────────────
  const l1 = getScan(key);
  if (l1 && !isStale(l1)) {
    return NextResponse.json({ ...l1, cached: true, building: false });
  }

  // ── L2: persistent DB ─────────────────────────────────────────────────────
  const db = await loadDbScan(universe);

  if (db && dbScanUsable(db)) {
    const filtered = applyFilters(db.results, opts);
    markNew(filtered, base);
    const entry: ScanEntry = {
      results: filtered, total: db.total,
      scannedAt: db.scannedAt, refreshing: false,
    };

    if (dbScanFresh(db)) {
      setScan(key, entry);
      return NextResponse.json({ ...entry, cached: true, refreshing: false, building: false });
    }

    setScan(key, { ...entry, refreshing: true });
    triggerBackgroundScan(universe, apiKey);
    return NextResponse.json({ ...entry, cached: true, refreshing: true, building: false });
  }

  // ── Cold cache — NON-BLOCKING ─────────────────────────────────────────────
  triggerBackgroundScan(universe, apiKey);
  return NextResponse.json({
    results: [], total: 0, scannedAt: null,
    cached: false, refreshing: false, building: true,
  });
}
