import { prisma } from "@/lib/prisma";
import { getUniverseTickers, getSector, type Universe } from "@/lib/stockUniverse";
import { computeScores, type StockMetrics } from "@/lib/momentum";

const BATCH_SIZE  = 25;
const BATCH_DELAY = 200; // ms between batches — ~125 concurrent calls/sec peak

export const DB_TTL_MS      = 30 * 60 * 1000; // serve fresh if < 30 min old
export const DB_MAX_STALE_MS = 4 * 60 * 60 * 1000; // refuse to serve if > 4 h old

function sleep(ms: number) { return new Promise<void>((r) => setTimeout(r, ms)); }

interface QuoteResult   { c: number; pc: number; v: number; }
interface ProfileResult { name?: string; marketCapitalization?: number; }

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch { return null; }
}

// ── Full universe scan ─────────────────────────────────────────────────────────

export async function scanUniverse(
  universe: Universe,
  apiKey: string,
): Promise<{ results: StockMetrics[]; total: number }> {
  const tickers = getUniverseTickers(universe);
  const scored: StockMetrics[] = [];

  // Phase 1: fetch quotes for EVERY ticker in the universe
  for (let i = 0; i < tickers.length; i += BATCH_SIZE) {
    const batch = tickers.slice(i, i + BATCH_SIZE);
    const batchItems = await Promise.all(
      batch.map(async (ticker): Promise<StockMetrics | null> => {
        const q = await fetchJson<QuoteResult>(
          `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(ticker)}&token=${apiKey}`,
        );
        if (!q?.c || q.c < 0.01) return null; // skip missing / de-listed
        const change1D = q.pc > 0 ? ((q.c - q.pc) / q.pc) * 100 : 0;
        const scores   = computeScores(change1D, q.v, 0, 50, q.c * 1_000_000);
        return {
          ticker, price: q.c, change1D, volume: q.v, avgVolume: 0,
          marketCap: q.c * 1_000_000, rsi: 50,
          companyName: ticker, exchange: "US",
          sector: getSector(ticker), isNew: false,
          ...scores,
        } satisfies StockMetrics;
      }),
    );
    for (const item of batchItems) if (item) scored.push(item);
    if (i + BATCH_SIZE < tickers.length) await sleep(BATCH_DELAY);
  }

  // Phase 2: enrich top 100 by initial momentumScore with real names + market caps
  scored.sort((a, b) => b.momentumScore - a.momentumScore);
  const top100 = scored.slice(0, 100);

  for (let i = 0; i < top100.length; i += BATCH_SIZE) {
    const batch = top100.slice(i, i + BATCH_SIZE);
    const profiles = await Promise.all(
      batch.map((s) =>
        fetchJson<ProfileResult>(
          `https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(s.ticker)}&token=${apiKey}`,
        ),
      ),
    );
    for (let j = 0; j < batch.length; j++) {
      const p = profiles[j];
      if (p?.name)                batch[j].companyName = p.name;
      if (p?.marketCapitalization) batch[j].marketCap  = p.marketCapitalization * 1_000_000;
    }
    if (i + BATCH_SIZE < top100.length) await sleep(BATCH_DELAY);
  }

  // Re-score top 100 now that we have real market caps (affects qualityScore / category)
  for (const s of top100) {
    const updated = computeScores(s.change1D, s.volume, 0, 50, s.marketCap);
    Object.assign(s, updated);
  }

  scored.sort((a, b) => b.momentumScore - a.momentumScore);
  return { results: scored, total: tickers.length };
}

// ── DB persistence ─────────────────────────────────────────────────────────────

export interface DbScan {
  results:   StockMetrics[];
  total:     number;
  scannedAt: string; // ISO
}

export async function loadDbScan(universe: Universe): Promise<DbScan | null> {
  try {
    const row = await prisma.radarScan.findUnique({ where: { universe } });
    if (!row) return null;
    return {
      results:   row.results as unknown as StockMetrics[],
      total:     row.total,
      scannedAt: row.scannedAt.toISOString(),
    };
  } catch { return null; }
}

export async function saveDbScan(
  universe: Universe,
  results: StockMetrics[],
  total: number,
): Promise<void> {
  // JSON round-trip strips class instances → plain objects Prisma can store
  const plain = JSON.parse(JSON.stringify(results));
  await prisma.radarScan.upsert({
    where:  { universe },
    update: { results: plain, total, scannedAt: new Date() },
    create: { universe, results: plain, total, scannedAt: new Date() },
  });
}

export function dbScanFresh(entry: DbScan): boolean {
  return Date.now() - new Date(entry.scannedAt).getTime() < DB_TTL_MS;
}

export function dbScanUsable(entry: DbScan): boolean {
  return Date.now() - new Date(entry.scannedAt).getTime() < DB_MAX_STALE_MS;
}
