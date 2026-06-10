import { prisma } from "@/lib/prisma";
import { getUniverseTickers, getSector, type Universe } from "@/lib/stockUniverse";
import { computeScores, type StockMetrics } from "@/lib/momentum";

// Each batch fetches BATCH_SIZE tickers in parallel, then waits BATCH_DELAY ms.
// Free tier:  60 calls/min → 10 parallel calls need ≥10 s gap → BATCH_DELAY ≥ 10000.
// Paid tier:  300 calls/min → BATCH_DELAY 2100 is safe.
// Set FINNHUB_BATCH_DELAY_MS in Vercel env to override.
const BATCH_SIZE  = 10;
const BATCH_DELAY = parseInt(process.env.FINNHUB_BATCH_DELAY_MS ?? "2100", 10);

// How many tickers to process in one cron invocation.
// 40 tickers = 4 batches.
// Paid (2100ms delay): 4 × 2.1s ≈ 8s — very fast.
// Free (10000ms delay): 4 × 10s = 40s — still well under 60s default timeout.
const CHUNK_SIZE = 40;

// Cap how many tickers from SP500 we'll ever scan for radar.
// The full 503-ticker list takes too many cron cycles to refresh.
// NASDAQ100 (95) and CEO (20) are fine at full size.
const SP500_RADAR_CAP = 150;

const INDEX_MARKET_CAP_FLOOR = 50_000_000_000;

// Stale thresholds — unchanged from before
export const DB_TTL_MS       = 30 * 60 * 1000;
export const DB_MAX_STALE_MS =  4 * 60 * 60 * 1000;

function sleep(ms: number) { return new Promise<void>((r) => setTimeout(r, ms)); }

interface QuoteResult   { c: number; pc: number; v: number; }
interface ProfileResult { name?: string; marketCapitalization?: number; }

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch { return null; }
}

// Returns the capped ticker list used for radar scanning.
function getRadarTickers(universe: Universe): readonly string[] {
  const all = getUniverseTickers(universe);
  if (universe === "SP500") return all.slice(0, SP500_RADAR_CAP);
  return all;
}

// ── Cursor (stored in SiteCache) ──────────────────────────────────────────────

interface ScanCursor {
  cursor:         number; // next ticker index to scan
  scannedCount:   number; // tickers processed in this cycle so far
  cycleStartedAt: string; // ISO — when this sweep began
}

const CURSOR_KEY = (u: Universe) => `radar_cursor_${u}`;

async function loadCursor(universe: Universe): Promise<ScanCursor> {
  try {
    const row = await prisma.siteCache.findUnique({ where: { key: CURSOR_KEY(universe) } });
    if (row) return row.value as unknown as ScanCursor;
  } catch { /* fall through */ }
  return { cursor: 0, scannedCount: 0, cycleStartedAt: new Date().toISOString() };
}

async function saveCursor(universe: Universe, state: ScanCursor): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const val = JSON.parse(JSON.stringify(state)) as any;
  await prisma.siteCache.upsert({
    where:  { key: CURSOR_KEY(universe) },
    update: { value: val },
    create: { key: CURSOR_KEY(universe), value: val },
  });
}

export async function resetCursor(universe: Universe): Promise<void> {
  await saveCursor(universe, { cursor: 0, scannedCount: 0, cycleStartedAt: new Date().toISOString() });
}

export async function getCursorState(universe: Universe): Promise<ScanCursor> {
  return loadCursor(universe);
}

// ── Score a single ticker (used in both chunk and full scans) ─────────────────

async function scoreTicker(
  ticker: string,
  apiKey: string,
  isIndexUniverse: boolean,
): Promise<StockMetrics | null> {
  const q = await fetchJson<QuoteResult>(
    `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(ticker)}&token=${apiKey}`,
  );
  if (!q?.c || q.c < 0.01) return null;

  const change1D  = q.pc > 0 ? ((q.c - q.pc) / q.pc) * 100 : 0;
  const marketCap = isIndexUniverse ? INDEX_MARKET_CAP_FLOOR : q.c * 1_000_000;
  const scores    = computeScores(change1D, q.v, 0, 50, marketCap);

  return {
    ticker, price: q.c, change1D, volume: q.v, avgVolume: 0,
    marketCap, rsi: 50,
    companyName: ticker, exchange: "US",
    sector: getSector(ticker), isNew: false,
    ...scores,
  } satisfies StockMetrics;
}

// ── Chunked scan (called by cron — one chunk per invocation) ──────────────────

export interface ChunkResult {
  universe:      Universe;
  chunkScanned:  number; // tickers scored in this chunk
  cycleScanned:  number; // tickers scored so far in this full cycle
  total:         number; // total tickers in this universe
  cycleComplete: boolean;
  cursor:        number; // cursor value after this invocation
}

export async function scanChunk(universe: Universe, apiKey: string): Promise<ChunkResult> {
  const tickers    = getRadarTickers(universe);
  const total      = tickers.length;
  const isIndex    = universe === "SP500" || universe === "NASDAQ100";

  const cursorState = await loadCursor(universe);
  const start = cursorState.cursor;
  const end   = Math.min(start + CHUNK_SIZE, total);
  const chunk = tickers.slice(start, end) as string[];

  // Fetch quotes for this chunk in BATCH_SIZE-sized batches
  const newResults: StockMetrics[] = [];
  for (let i = 0; i < chunk.length; i += BATCH_SIZE) {
    const batch = chunk.slice(i, i + BATCH_SIZE);
    const items = await Promise.all(
      batch.map((t) => scoreTicker(t, apiKey, isIndex).catch(() => null)),
    );
    for (const item of items) if (item) newResults.push(item);
    if (i + BATCH_SIZE < chunk.length) await sleep(BATCH_DELAY);
  }

  // Merge into existing results (replace tickers we just re-scanned)
  const existing = await loadDbScan(universe);
  const existingResults = existing?.results ?? [];
  const newSet = new Set(newResults.map((r) => r.ticker));
  const merged = [
    ...existingResults.filter((r) => !newSet.has(r.ticker)),
    ...newResults,
  ];
  merged.sort((a, b) => b.momentumScore - a.momentumScore);

  const cycleComplete  = end >= total;
  const newCursor      = cycleComplete ? 0 : end;
  const scannedCount   = cycleComplete ? 0 : (cursorState.scannedCount + newResults.length);

  // On cycle completion, stamp scannedAt as "now"
  await saveDbScan(universe, merged, total, cycleComplete ? new Date() : undefined);

  await saveCursor(universe, {
    cursor: newCursor,
    scannedCount,
    cycleStartedAt: cycleComplete
      ? new Date().toISOString()
      : cursorState.cycleStartedAt,
  });

  return {
    universe,
    chunkScanned:  newResults.length,
    cycleScanned:  cursorState.scannedCount + newResults.length,
    total,
    cycleComplete,
    cursor:        newCursor,
  };
}

// ── Full scan (kept for small universes like CEO) ─────────────────────────────
// Do NOT use for SP500 / NASDAQ100 — use chunked scan instead.

export async function scanUniverse(
  universe: Universe,
  apiKey: string,
): Promise<{ results: StockMetrics[]; scanned: number; total: number }> {
  const tickers = getRadarTickers(universe);
  const scored: StockMetrics[] = [];
  const isIndex = universe === "SP500" || universe === "NASDAQ100";

  for (let i = 0; i < tickers.length; i += BATCH_SIZE) {
    const batch = (tickers as string[]).slice(i, i + BATCH_SIZE);
    const items = await Promise.all(
      batch.map((t) => scoreTicker(t, apiKey, isIndex).catch(() => null)),
    );
    for (const item of items) if (item) scored.push(item);
    if (i + BATCH_SIZE < tickers.length) await sleep(BATCH_DELAY);
  }

  scored.sort((a, b) => b.momentumScore - a.momentumScore);
  await saveDbScan(universe, scored, tickers.length, new Date());
  await saveCursor(universe, { cursor: 0, scannedCount: 0, cycleStartedAt: new Date().toISOString() });
  return { results: scored, scanned: scored.length, total: tickers.length };
}

// ── DB persistence ─────────────────────────────────────────────────────────────

export interface DbScan {
  results:        StockMetrics[];
  total:          number;
  scannedAt:      string; // ISO — time of last FULL cycle completion
  partialCount:   number; // tickers scanned in current partial cycle (0 = full)
}

export async function loadDbScan(universe: Universe): Promise<DbScan | null> {
  try {
    const row = await prisma.radarScan.findUnique({ where: { universe } });
    if (!row) return null;
    return {
      results:      row.results as unknown as StockMetrics[],
      total:        row.total,
      scannedAt:    row.scannedAt.toISOString(),
      partialCount: 0,
    };
  } catch { return null; }
}

export async function saveDbScan(
  universe: Universe,
  results: StockMetrics[],
  total: number,
  fullCycleAt?: Date,  // if provided, stamps scannedAt; otherwise preserves existing
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plain = JSON.parse(JSON.stringify(results)) as any;
  const now   = new Date();

  await prisma.radarScan.upsert({
    where:  { universe },
    update: {
      results: plain,
      total,
      ...(fullCycleAt ? { scannedAt: fullCycleAt } : {}),
    },
    create: { universe, results: plain, total, scannedAt: fullCycleAt ?? now },
  });
}

export function dbScanFresh(entry: DbScan): boolean {
  return Date.now() - new Date(entry.scannedAt).getTime() < DB_TTL_MS;
}

export function dbScanUsable(entry: DbScan): boolean {
  return Date.now() - new Date(entry.scannedAt).getTime() < DB_MAX_STALE_MS;
}
