import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

/**
 * Scheduled jobs are expensive (Finnhub quota, AI calls). Only Vercel cron / your own scheduler,
 * sending "Authorization: Bearer <CRON_SECRET>", may run them. Fails closed if the secret is missing.
 * Returns a 401 response to send back, or null when the caller is allowed.
 */
export function rejectUnlessCron(req: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  const given  = Buffer.from(req.headers.get("authorization") ?? "");
  const wanted = Buffer.from(`Bearer ${secret ?? ""}`);
  const ok = !!secret && given.length === wanted.length && timingSafeEqual(given, wanted);
  return ok ? null : NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
