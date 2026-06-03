import { NextRequest, NextResponse } from "next/server";
import { scanUniverse, saveDbScan } from "@/lib/radarScan";
import type { Universe } from "@/lib/stockUniverse";

// Runs on schedule and on-demand to pre-compute radar scans for all universes.
// Vercel invokes this with Authorization: Bearer <CRON_SECRET>.
export const dynamic    = "force-dynamic";
export const maxDuration = 300; // seconds — full S&P 500 + Nasdaq-100 scan fits in ~60 s

const UNIVERSES: readonly Universe[] = ["SP500", "NASDAQ100"] as const;

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
