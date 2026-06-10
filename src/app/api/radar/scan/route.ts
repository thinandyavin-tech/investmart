/**
 * Radar scan endpoint — reads from cache ONLY. Never triggers a live scan.
 *
 * Cold cache → {building:true, results:[]} — cron will populate it.
 * Partial cache → results so far + building:true + scannedCount for progress.
 * Fresh full cache → results + building:false.
 * Stale but usable → results + refreshing:true (cron is working on next cycle).
 *
 * Actual scanning: /api/cron/radar-precompute (cron every 15 min).
 * Manual trigger:  /api/radar/trigger (resets cursor, next cron tick starts fresh).
 */
import { NextRequest, NextResponse } from "next/server";

import { type Universe } from "@/lib/stockUniverse";
import { filterByCapSize, type CapSize } from "@/lib/momentum";
import type { StockMetrics } from "@/lib/momentum";
import { getScan, setScan, isStale, getBaseline, type ScanEntry } from "@/lib/scanCache";
import { loadDbScan, dbScanFresh, dbScanUsable, getCursorState } from "@/lib/radarScan";
import { applyRateLimit } from "@/lib/rateLimit";

export const dynamic    = "force-dynamic";
export const maxDuration = 15;

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

export async function GET(request: NextRequest): Promise<NextResponse> {
  const limited = await applyRateLimit(request, "scan");
  if (limited) return limited;

  const params     = request.nextUrl.searchParams;
  const universe   = (params.get("universe") ?? "NASDAQ100") as Universe;
  const minScore   = parseInt(params.get("minScore") ?? "0", 10);
  const capSize    = (params.get("capSize") ?? "ALL") as CapSize;
  const filterDead = params.get("filterDead") !== "false";

  const opts = { minScore, capSize, filterDead } satisfies FilterOpts;
  const key  = l1Key(universe, opts);
  const base = getBaseline(key);

  // ── L1: in-process memory ─────────────────────────────────────────────────
  const l1 = getScan(key);
  if (l1 && !isStale(l1)) {
    return NextResponse.json({ ...l1, cached: true, building: false, scannedCount: 0 });
  }

  // ── L2: persistent DB + cursor ────────────────────────────────────────────
  const [db, cursor] = await Promise.all([
    loadDbScan(universe),
    getCursorState(universe),
  ]);

  if (db && db.results.length > 0 && dbScanUsable(db)) {
    const filtered  = applyFilters(db.results, opts);
    markNew(filtered, base);
    const isPartial = cursor.cursor > 0;
    const isFresh   = dbScanFresh(db) && !isPartial;

    const entry: ScanEntry = {
      results: filtered, total: db.total,
      scannedAt: db.scannedAt, refreshing: !isFresh,
    };

    setScan(key, entry);
    return NextResponse.json({
      ...entry,
      cached:       true,
      building:     isPartial,
      refreshing:   !isFresh,
      scannedCount: isPartial ? cursor.scannedCount : db.total,
    });
  }

  // ── Cold cache — no data yet ───────────────────────────────────────────────
  // Do NOT fire-and-forget here — Vercel kills background async on function return.
  // The cron job (every 15 min) will write the first results.
  return NextResponse.json({
    results: [], total: 0, scannedAt: null,
    cached: false, refreshing: false, building: true,
    scannedCount: 0,
  });
}
