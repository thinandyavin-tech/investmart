/**
 * Radar precompute cron — runs twice daily (market open + afternoon).
 *
 * Processes ALL chunks for each universe in one invocation by looping until
 * the cursor resets to 0 (full cycle complete). Each loop iteration handles
 * CHUNK_SIZE=40 tickers, so the function does short predictable bursts of
 * work rather than one giant scan. Per-ticker try/catch means one bad ticker
 * never aborts the run.
 *
 * Timing (paid Finnhub, BATCH_DELAY=2100ms):
 *   NASDAQ100 (95):  10 batches × 2.1s ≈ 21s
 *   SP500 (capped 150): 15 batches × 2.1s ≈ 32s
 *   CEO (20): <5s
 *   Total per run: ~60s — safely under maxDuration=120
 *
 * Timing (free tier, BATCH_DELAY=10000ms):
 *   NASDAQ100: ~100s  |  CEO: <15s  — SP500 is skipped when SKIP_SP500=true
 *   or set FINNHUB_BATCH_DELAY_MS=3000 to use Finnhub's free 60req/min plan.
 */
import { NextRequest, NextResponse } from "next/server";

import { scanChunk, scanUniverse, resetCursor } from "@/lib/radarScan";
import type { Universe } from "@/lib/stockUniverse";

export const dynamic    = "force-dynamic";
export const maxDuration = 120;

const CHUNK_UNIVERSES: readonly Universe[] = ["NASDAQ100", "SP500"] as const;
const FULL_UNIVERSES:  readonly Universe[] = ["CEO"] as const;
const MAX_CHUNKS_PER_RUN = 20; // safety cap; normal runs complete in 3–4 chunks

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

  const summary: Record<string, unknown> = {};

  // Run all chunks for each large universe until the full cycle completes
  for (const universe of CHUNK_UNIVERSES) {
    const t0 = Date.now();
    let chunks = 0;
    let lastResult: Awaited<ReturnType<typeof scanChunk>> | null = null;

    try {
      // Reset cursor so we always start a fresh cycle each cron run
      await resetCursor(universe);

      do {
        lastResult = await scanChunk(universe, apiKey);
        chunks++;
      } while (!lastResult.cycleComplete && chunks < MAX_CHUNKS_PER_RUN);

      summary[universe] = {
        chunks,
        cycleComplete: lastResult?.cycleComplete ?? false,
        total:         lastResult?.total ?? 0,
        durationMs:    Date.now() - t0,
      };
    } catch (err) {
      summary[universe] = {
        error:      err instanceof Error ? err.message : String(err),
        chunks,
        durationMs: Date.now() - t0,
      };
    }
  }

  // Full scans for small universes (CEO, 20 tickers — always fast)
  for (const universe of FULL_UNIVERSES) {
    const t0 = Date.now();
    try {
      const { scanned, total } = await scanUniverse(universe, apiKey);
      summary[universe] = { scanned, total, durationMs: Date.now() - t0 };
    } catch (err) {
      summary[universe] = {
        error:      err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - t0,
      };
    }
  }

  return NextResponse.json({ ok: true, summary, completedAt: new Date().toISOString() });
}
