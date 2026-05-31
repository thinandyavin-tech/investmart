import type { StockMetrics } from "@/lib/momentum";

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export interface ScanEntry {
  results:    StockMetrics[];
  total:      number;
  scannedAt:  string; // ISO string
  refreshing: boolean;
}

const cache    = new Map<string, ScanEntry>();
const baseline = new Map<string, Set<string>>(); // first-scan-of-session tickers per key

export function getScan(key: string): ScanEntry | undefined {
  return cache.get(key);
}

export function setScan(key: string, entry: ScanEntry): void {
  // First time we see results for this key → save as baseline for "new today" detection
  if (!baseline.has(key) && entry.results.length > 0) {
    baseline.set(key, new Set(entry.results.map((r) => r.ticker)));
  }
  cache.set(key, entry);
}

export function isStale(entry: ScanEntry): boolean {
  return Date.now() - new Date(entry.scannedAt).getTime() > CACHE_TTL_MS;
}

export function getBaseline(key: string): Set<string> {
  return baseline.get(key) ?? new Set();
}
