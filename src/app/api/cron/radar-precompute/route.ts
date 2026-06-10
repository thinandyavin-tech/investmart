/**
 * Chunked radar precompute — called by Vercel cron every 15 minutes.
 *
 * Each invocation processes ONE chunk (~40 tickers) per universe and returns.
 * A cursor in SiteCache tracks progress; the next invocation picks up where
 * the last left off. This keeps every invocation well under the timeout
 * regardless of universe size or BATCH_DELAY setting.
 *
 * SP500 (capped to 150) + NASDAQ100: one chunk each per invocation.
 * CEO (20 tickers): full scan each time (tiny, always completes).
 * SET50: skipped — Finnhub free tier doesn't serve .BK quotes.
 */
import { NextRequest, NextResponse } from "next/server";

import { scanChunk, scanUniverse } from "@/lib/radarScan";
import type { Universe } from "@/lib/stockUniverse";

export const dynamic    = "force-dynamic";
export const maxDuration = 60; // chunks complete in 8–40s; 60s is comfortable headroom

const CHUNK_UNIVERSES: readonly Universe[] = ["SP500", "NASDAQ100"] as const;
const FULL_UNIVERSES:  readonly Universe[] = ["CEO"] as const;

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

  for (const universe of CHUNK_UNIVERSES) {
    const t0 = Date.now();
    try {
      const result = await scanChunk(universe, apiKey);
      summary[universe] = { ...result, durationMs: Date.now() - t0 };
    } catch (err) {
      summary[universe] = {
        error: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - t0,
      };
    }
  }

  for (const universe of FULL_UNIVERSES) {
    const t0 = Date.now();
    try {
      const { scanned, total } = await scanUniverse(universe, apiKey);
      summary[universe] = { scanned, total, durationMs: Date.now() - t0 };
    } catch (err) {
      summary[universe] = {
        error: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - t0,
      };
    }
  }

  return NextResponse.json({ ok: true, summary, completedAt: new Date().toISOString() });
}
