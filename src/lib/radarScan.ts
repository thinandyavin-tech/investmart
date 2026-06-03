import { prisma } from "@/lib/prisma";
import { getUniverseTickers, getSector, type Universe } from "@/lib/stockUniverse";
import { computeScores, type StockMetrics } from "@/lib/momentum";

// Finnhub Growth/Premium plans allow 300 calls/min.
// BATCH_SIZE=10 @ BATCH_DELAY=2100ms → 10/2.1s ≈ 286/min — safely under 300/min.
// Full S&P 500 (503 tickers): ~53 batches × 2.1s = ~111s (well under 300s maxDuration).
// Override via FINNHUB_BATCH_DELAY_MS env var (e.g. set to 10000 for free-plan 60/min).
const BATCH_SIZE  = 10;
const BATCH_DELAY = parseInt(process.env.FINNHUB_BATCH_DELAY_MS ?? "2100", 10);

// S&P 500 and Nasdaq 100 members are large-/mid-cap by definition.
// Using price×1M as a proxy would classify them as "small cap" and distort scores.
// We use a conservative $50B floor for index members; Phase 2 overwrites with real data.
const INDEX_MARKET_CAP_FLOOR = 50_000_000_000;

export const DB_TTL_MS       = 30 * 60 * 1000; // serve fresh if < 30 min old
export const DB_MAX_STALE_MS =  4 * 60 * 60 * 1000; // refuse to serve if > 4 h old

function sleep(ms: number) { return new Promise<void>((r) => setTimeout(r, ms)); }

interface QuoteResult   { c: number; pc: number; v: number; }
interface ProfileResult { name?: string; marketCapitalization?: number; }

async function fetchJson<T>(url: string, retries = 1): Promise<T | null> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (r.status === 429 && retries > 0) {
      await sleep(60_000); // back off a full minute on rate-limit hit
      return fetchJson<T>(url, retries - 1);
    }
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch { return null; }
}

// ── Full universe scan ─────────────────────────────────────────────────────────

export async function scanUniverse(
  universe: Universe,
  apiKey: string,
): Promise<{ results: StockMetrics[]; scanned: number; total: number }> {
  const tickers = getUniverseTickers(universe);
  const scored: StockMetrics[] = [];
  const isIndexUniverse = universe === "SP500" || universe === "NASDAQ100";

  // Phase 1: fetch quotes for EVERY ticker in the universe
  for (let i = 0; i < tickers.length; i += BATCH_SIZE) {
    const batch = tickers.slice(i, i + BATCH_SIZE);
    const batchItems = await Promise.all(
      batch.map(async (ticker): Promise<StockMetrics | null> => {
        const q = await fetchJson<QuoteResult>(
          `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(ticker)}&token=${apiKey}`,
        );
        if (!q?.c || q.c < 0.01) return null; // skip missing / de-listed

        const change1D    = q.pc > 0 ? ((q.c - q.pc) / q.pc) * 100 : 0;
        // Use the index floor so S&P 500 / Nasdaq 100 members aren't penalised as small caps.
        // Phase 2 overwrites with real market-cap data from Finnhub profile.
        const marketCap   = isIndexUniverse ? INDEX_MARKET_CAP_FLOOR : q.c * 1_000_000;
        const scores      = computeScores(change1D, q.v, 0, 50, marketCap);

        return {
          ticker, price: q.c, change1D, volume: q.v, avgVolume: 0,
          marketCap, rsi: 50,
          companyName: ticker, exchange: "US",
          sector: getSector(ticker), isNew: false,
          ...scores,
        } satisfies StockMetrics;
      }),
    );
    for (const item of batchItems) if (item) scored.push(item);
    if (i + BATCH_SIZE < tickers.length) await sleep(BATCH_DELAY);
  }

  // Phase 2: enrich top 150 by initial score with real names + market caps
  scored.sort((a, b) => b.momentumScore - a.momentumScore);
  const top150 = scored.slice(0, 150);

  for (let i = 0; i < top150.length; i += BATCH_SIZE) {
    const batch = top150.slice(i, i + BATCH_SIZE);
    const profiles = await Promise.all(
      batch.map((s) =>
        fetchJson<ProfileResult>(
          `https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(s.ticker)}&token=${apiKey}`,
        ),
      ),
    );
    for (let j = 0; j < batch.length; j++) {
      const p = profiles[j];
      if (p?.name)                 batch[j].companyName = p.name;
      if (p?.marketCapitalization) batch[j].marketCap   = p.marketCapitalization * 1_000_000;
    }
    if (i + BATCH_SIZE < top150.length) await sleep(BATCH_DELAY);
  }

  // Re-score top 150 now that we have real market caps
  for (const s of top150) {
    const updated = computeScores(s.change1D, s.volume, 0, 50, s.marketCap);
    Object.assign(s, updated);
  }

  scored.sort((a, b) => b.momentumScore - a.momentumScore);
  return { results: scored, scanned: scored.length, total: tickers.length };
}

// ── DB persistence ─────────────────────────────────────────────────────────────

export interface DbScan {
  results:   StockMetrics[];
  total:     number; // universe size (number of tickers attempted)
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
