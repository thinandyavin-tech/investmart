/**
 * Manual radar refresh trigger.
 * Resets the cursor for the requested universe so the next cron invocation
 * starts a fresh scan cycle from the beginning.
 *
 * Returns immediately — does NOT start an inline scan.
 * The cron job (/api/cron/radar-precompute) picks up the reset cursor
 * on its next scheduled run (every 15 min).
 */
import { NextRequest, NextResponse } from "next/server";

import { resetCursor } from "@/lib/radarScan";
import type { Universe } from "@/lib/stockUniverse";
import { applyRateLimit } from "@/lib/rateLimit";

export const dynamic    = "force-dynamic";
export const maxDuration = 10;

const VALID_UNIVERSES = new Set<Universe>(["SP500", "NASDAQ100", "CEO", "SET50"]);

export async function POST(request: NextRequest): Promise<NextResponse> {
  const limited = await applyRateLimit(request, "scan");
  if (limited) return limited;

  let universe: Universe = "NASDAQ100";
  try {
    const body = (await request.json().catch(() => ({}))) as { universe?: string };
    if (body.universe && VALID_UNIVERSES.has(body.universe as Universe)) {
      universe = body.universe as Universe;
    }
  } catch { /* use default */ }

  await resetCursor(universe);

  return NextResponse.json({
    ok:      true,
    message: "รีเซ็ตแล้ว — การสแกนจะเริ่มในรอบถัดไป (ทุก 15 นาที)",
    universe,
  });
}
