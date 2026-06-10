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

import { scanChunk, resetCursor } from "@/lib/radarScan";
import type { Universe } from "@/lib/stockUniverse";

export const dynamic    = "force-dynamic";
export const maxDuration = 120;

// All universes use chunked scanning — consistent, rate-limit-safe.
// CEO (20 tickers) completes in a single chunk but uses the same path.
const CHUNK_UNIVERSES: readonly Universe[] = ["NASDAQ100", "SP500", "CEO"] as const;
const MAX_CHUNKS_PER_RUN = 20; // safety cap; normal runs complete in 3–4 chunks

// Pause between universes so Finnhub rate limits recover.
// After ~250 calls for NASDAQ100+SP500, CEO calls would be throttled without this.
const INTER_UNIVERSE_PAUSE_MS = 8_000;

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

  let first = true;
  for (const universe of CHUNK_UNIVERSES) {
    // Pause between universes so Finnhub rate limits can recover.
    // Skip before the first universe.
    if (!first) await new Promise<void>((r) => setTimeout(r, INTER_UNIVERSE_PAUSE_MS));
    first = false;

    const t0 = Date.now();
    let chunks = 0;
    let lastResult: Awaited<ReturnType<typeof scanChunk>> | null = null;

    try {
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

  return NextResponse.json({ ok: true, summary, completedAt: new Date().toISOString() });
}
