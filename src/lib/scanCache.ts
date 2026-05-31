import type { StockMetrics } from "@/lib/momentum";

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export interface ScanEntry {
  results:    StockMetrics[];
  total:      number;
  scannedAt:  string; // ISO string
  refreshing: boolean;
}

// Module-level cache persists across requests within the same server process
const cache = new Map<string, ScanEntry>();

export function getScan(key: string): ScanEntry | undefined {
  return cache.get(key);
}

export function setScan(key: string, entry: ScanEntry): void {
  cache.set(key, entry);
}

export function isStale(entry: ScanEntry): boolean {
  return Date.now() - new Date(entry.scannedAt).getTime() > CACHE_TTL_MS;
}
