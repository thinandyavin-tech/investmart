import { NextRequest, NextResponse } from "next/server";

import { type Universe } from "@/lib/stockUniverse";
import { filterByCapSize, type CapSize } from "@/lib/momentum";
import type { StockMetrics } from "@/lib/momentum";
import { getScan, setScan, isStale, getBaseline, type ScanEntry } from "@/lib/scanCache";
import { scanUniverse, loadDbScan, saveDbScan, dbScanFresh, dbScanUsable } from "@/lib/radarScan";
import { applyRateLimit } from "@/lib/rateLimit";

export const dynamic    = "force-dynamic";
export const maxDuration = 300; // full SP500 live scan takes ~110 s; SET100 ~30 s

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
  const universe   = (params.get("universe") ?? "SP500") as Universe;
  const minScore   = parseInt(params.get("minScore") ?? "20", 10);
  const capSize    = (params.get("capSize") ?? "ALL") as CapSize;
  const filterDead = params.get("filterDead") !== "false";
  const force      = params.get("force") === "true";

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "API not configured" }, { status: 500 });

  const opts = { minScore, capSize, filterDead } satisfies FilterOpts;
  const key  = l1Key(universe, opts);
  const base = getBaseline(key);

  if (!force) {
    // L1: in-process memory (hot path — same warm instance)
    const l1 = getScan(key);
    if (l1 && !isStale(l1)) {
      return NextResponse.json({ ...l1, cached: true });
    }

    // L2: persistent DB (survives cold starts and multiple instances)
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
        return NextResponse.json({ ...entry, cached: true });
      }

      // Stale but usable: serve immediately, refresh DB in background
      setScan(key, { ...entry, refreshing: true });
      void (async () => {
        try {
          const { results, total } = await scanUniverse(universe, apiKey);
          await saveDbScan(universe, results, total);
          const refreshed = applyFilters(results, opts);
          markNew(refreshed, base);
          setScan(key, { results: refreshed, total, scannedAt: new Date().toISOString(), refreshing: false });
        } catch { /* background refresh failed — next request will retry */ }
      })();
      return NextResponse.json({ ...entry, cached: true, refreshing: true });
    }
  }

  // No usable cache — run a live scan, persist to DB, return
  const { results, scanned, total } = await scanUniverse(universe, apiKey);
  await saveDbScan(universe, results, total).catch(() => { /* non-fatal */ });
  const filtered = applyFilters(results, opts);
  markNew(filtered, base);
  const entry: ScanEntry = {
    results: filtered, total, scannedAt: new Date().toISOString(), refreshing: false,
  };
  setScan(key, entry);
  return NextResponse.json({ ...entry, scanned, cached: false });
}
