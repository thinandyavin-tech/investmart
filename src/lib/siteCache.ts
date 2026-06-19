/**
 * Thin wrapper around the Prisma SiteCache table for reusable persistent caching.
 * AI-generated results and expensive computations go through here so data
 * survives cold starts and redeploys (Postgres-backed, shared across all instances).
 */
import { prisma } from "./prisma";

export async function siteCacheGet<T>(key: string): Promise<{ data: T; savedAt: Date } | null> {
  try {
    const row = await prisma.siteCache.findUnique({ where: { key } });
    if (!row) return null;
    return { data: row.value as T, savedAt: row.updatedAt };
  } catch {
    return null;
  }
}

export async function siteCacheSet(key: string, value: unknown): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const v = value as any;
    await prisma.siteCache.upsert({
      where:  { key },
      update: { value: v },
      create: { key,   value: v },
    });
  } catch { /* non-fatal */ }
}

export function isSiteCacheStale(savedAt: Date, ttlMs: number): boolean {
  return Date.now() - savedAt.getTime() > ttlMs;
}
