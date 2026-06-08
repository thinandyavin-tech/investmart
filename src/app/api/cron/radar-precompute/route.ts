import { NextRequest, NextResponse } from "next/server";
import { scanUniverse, saveDbScan } from "@/lib/radarScan";
import type { Universe } from "@/lib/stockUniverse";

// Runs on schedule and on-demand to pre-compute radar scans for all universes.
// Vercel invokes this with Authorization: Bearer <CRON_SECRET>.
// Timing (Growth plan): SP500 ~110s, NASDAQ100 ~25s → total ~135s, safely under 300s.
// SET50: skipped if Finnhub free tier (returns 0 valid quotes for .BK tickers).
// Set FINNHUB_BATCH_DELAY_MS=10000 in env if using free tier (60 req/min).
export const dynamic    = "force-dynamic";
export const maxDuration = 300;

const UNIVERSES: readonly Universe[] = ["SP500", "NASDAQ100", "SET50"] as const;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "FINNHUB_API_KEY not set" }, { status: 503 });
  }

  const summary: Record<string, { scanned: number; total: number; durationMs: number; error?: string }> = {};

  for (const universe of UNIVERSES) {
    const t0 = Date.now();
    try {
      const { results, scanned, total } = await scanUniverse(universe, apiKey);
      await saveDbScan(universe, results, total);
      summary[universe] = { scanned, total, durationMs: Date.now() - t0 };
    } catch (err) {
      summary[universe] = {
        scanned: 0, total: 0, durationMs: Date.now() - t0,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  return NextResponse.json({ ok: true, summary, completedAt: new Date().toISOString() });
}
