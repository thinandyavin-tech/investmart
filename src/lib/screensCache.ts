/**
 * Shared reader for the screens metrics SiteCache entry.
 * Screen routes (dividend, growth) call this; the precompute cron writes it.
 */

import { prisma }                 from "@/lib/prisma";
import { type ScreensCache, SCREENS_CACHE_KEY, SCREENS_TTL_MS } from "@/app/api/cron/screens-precompute/route";

export { type ScreensCache } from "@/app/api/cron/screens-precompute/route";
export type { TickerMetrics } from "@/app/api/cron/screens-precompute/route";

// L1 in-process cache so rapid pagination doesn't hit DB repeatedly
let _mem: { data: ScreensCache; at: number } | null = null;

export async function loadScreensCache(): Promise<ScreensCache | null> {
  // L1 in-process cache (5-min TTL)
  if (_mem && Date.now() - _mem.at < 5 * 60_000) return _mem.data;

  try {
    const row = await prisma.siteCache.findUnique({ where: { key: SCREENS_CACHE_KEY } });
    if (!row) return null;

    const data = row.value as unknown as ScreensCache;
    if (!data?.tickers || !Array.isArray(data.tickers)) return null;

    // Treat cache as stale but still usable up to SCREENS_TTL_MS
    _mem = { data, at: Date.now() };
    return data;
  } catch {
    return null;
  }
}

export function isCacheFresh(cache: ScreensCache): boolean {
  return Date.now() - new Date(cache.updatedAt).getTime() < SCREENS_TTL_MS;
}
