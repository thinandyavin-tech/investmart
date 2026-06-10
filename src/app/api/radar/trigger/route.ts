/**
 * Manual trigger for the radar precompute job.
 * Called by the "Refresh" button on the Radar page.
 * Starts the scan for a single universe in the background and returns immediately.
 * The client polls /api/radar/scan to see when results arrive.
 */
import { NextRequest, NextResponse } from "next/server";
import { scanUniverse, saveDbScan } from "@/lib/radarScan";
import { setScan } from "@/lib/scanCache";
import type { Universe } from "@/lib/stockUniverse";
import { applyRateLimit } from "@/lib/rateLimit";

export const dynamic    = "force-dynamic";
export const maxDuration = 5; // returns immediately; scan runs async

const VALID_UNIVERSES = new Set<Universe>(["SP500", "NASDAQ100", "CEO", "SET50"]);

export async function POST(request: NextRequest): Promise<NextResponse> {
  const limited = await applyRateLimit(request, "scan");
  if (limited) return limited;

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "API not configured" }, { status: 500 });

  let universe: Universe = "SP500";
  try {
    const body = (await request.json().catch(() => ({}))) as { universe?: string };
    if (body.universe && VALID_UNIVERSES.has(body.universe as Universe)) {
      universe = body.universe as Universe;
    }
  } catch { /* use default */ }

  // Fire-and-forget: scan runs in background, page polls for updates
  void (async () => {
    try {
      const { results, total } = await scanUniverse(universe, apiKey);
      await saveDbScan(universe, results, total);
      setScan(`${universe}|0|ALL|false`, {
        results, total, scannedAt: new Date().toISOString(), refreshing: false,
      });
    } catch { /* non-fatal */ }
  })();

  return NextResponse.json({ ok: true, message: "สแกนเริ่มแล้ว ผลจะแสดงใน 1–2 นาที" });
}
