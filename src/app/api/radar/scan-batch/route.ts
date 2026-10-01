/**
 * Batch scan endpoint — called by an external scheduler every 2–3 minutes.
 *
 * Each call scans ONE small batch (~15–20 tickers) for the requested universe,
 * writes results to the DB, advances the cursor, and returns immediately.
 * Over several calls the full universe is scanned and refreshed continuously.
 *
 * Protected by CRON_SECRET (Authorization: Bearer <secret>).
 * If CRON_SECRET is not set, every call is refused.
 *
 * Query params:
 *   universe  SP500 | NASDAQ100 | CEO  (default: NASDAQ100)
 *
 * External scheduler setup (cron-job.org — free plan):
 *   URL:      https://investmart.vercel.app/api/radar/scan-batch?universe=NASDAQ100
 *   Method:   GET
 *   Interval: every 2 minutes
 *   Header:   Authorization: Bearer <your CRON_SECRET value>
 *   Repeat for SP500 (every 3 min) and CEO (every 10 min, optional)
 */
import { rejectUnlessCron } from "@/lib/cronAuth";
import { NextRequest, NextResponse } from "next/server";

import { scanChunk } from "@/lib/radarScan";
import type { Universe } from "@/lib/stockUniverse";

export const dynamic    = "force-dynamic";
export const maxDuration = 55; // stays well under 60 s Hobby timeout

const VALID: Set<Universe> = new Set(["SP500", "NASDAQ100", "CEO"]);

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Auth check — reject without secret
  const denied = rejectUnlessCron(request);
  if (denied) return denied;

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "FINNHUB_API_KEY not configured" }, { status: 503 });
  }

  const raw      = request.nextUrl.searchParams.get("universe") ?? "NASDAQ100";
  const universe = (VALID.has(raw as Universe) ? raw : "NASDAQ100") as Universe;

  try {
    const result = await scanChunk(universe, apiKey);
    return NextResponse.json({
      ok:            true,
      universe,
      chunkScanned:  result.chunkScanned,
      cycleScanned:  result.cycleScanned,
      total:         result.total,
      cursor:        result.cursor,
      cycleComplete: result.cycleComplete,
      completedAt:   new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
