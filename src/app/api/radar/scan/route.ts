import { NextRequest, NextResponse } from "next/server";
import { getUniverseTickers, type Universe } from "@/lib/stockUniverse";
import { computeScores, type StockMetrics } from "@/lib/momentum";
import { getScan, setScan, isStale, type ScanEntry } from "@/lib/scanCache";

const BATCH_SIZE  = 25;
const DELAY_MS    = 100; // stay under 30 req/s Finnhub free limit

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

interface QuoteResult {
  c:  number;
  pc: number;
  v:  number;
}

async function fetchQuote(symbol: string, apiKey: string): Promise<QuoteResult | null> {
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`,
      { signal: AbortSignal.timeout(2000) }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as QuoteResult;
    return data.c ? data : null;
  } catch {
    return null;
  }
}

interface ScanOptions {
  universe:   Universe;
  minScore:   number;
  capSize:    string;
  filterDead: boolean;
}

function cacheKey(opts: ScanOptions): string {
  return `${opts.universe}|${opts.minScore}|${opts.capSize}|${opts.filterDead}`;
}

async function doScan(opts: ScanOptions, apiKey: string): Promise<ScanEntry> {
  const tickers = getUniverseTickers(opts.universe);
  const results: StockMetrics[] = [];

  for (let i = 0; i < tickers.length; i += BATCH_SIZE) {
    const batch = tickers.slice(i, i + BATCH_SIZE);

    const batchData = await Promise.all(
      batch.map(async (ticker): Promise<StockMetrics | null> => {
        try {
          const quote = await fetchQuote(ticker, apiKey);
          if (!quote) return null;

          const price     = quote.c;
          const prevClose = quote.pc;
          const change1D  = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0;
          const volume    = quote.v;

          // avgVolume placeholder: use rolling estimate; refined when profile loads lazily
          // Without historical data we cannot compute a true average — we mark it 0
          // so volumeSurge defaults to 1 (neutral) via the guard in computeScores
          const avgVolume = 0;

          const marketCap = price * 1_000_000; // placeholder, refined on stock select

          if (opts.filterDead && price < 1) return null;

          const scores = computeScores(change1D, volume, avgVolume, 50, marketCap);
          if (scores.momentumScore < opts.minScore) return null;

          return {
            ticker,
            price,
            change1D,
            volume,
            avgVolume,
            marketCap,
            rsi:         50,
            companyName: ticker,
            exchange:    "US",
            ...scores,
          } satisfies StockMetrics;
        } catch {
          return null;
        }
      })
    );

    for (const item of batchData) {
      if (item) results.push(item);
    }

    if (i + BATCH_SIZE < tickers.length) await sleep(DELAY_MS);
  }

  results.sort((a, b) => b.change1D - a.change1D);

  return {
    results:    results.slice(0, 100),
    total:      tickers.length,
    scannedAt:  new Date().toISOString(),
    refreshing: false,
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const params    = request.nextUrl.searchParams;
  const universe  = (params.get("universe") ?? "SP500") as Universe;
  const minScore  = parseInt(params.get("minScore") ?? "20", 10);
  const capSize   = params.get("capSize") ?? "ALL";
  const filterDead = params.get("filterDead") !== "false";
  const force     = params.get("force") === "true";

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API not configured" }, { status: 500 });
  }

  const opts: ScanOptions = { universe, minScore, capSize, filterDead };
  const key = cacheKey(opts);

  if (!force) {
    const cached = getScan(key);

    if (cached && !isStale(cached)) {
      // Fresh cache hit — return immediately
      return NextResponse.json({ ...cached, cached: true });
    }

    if (cached && isStale(cached)) {
      // Stale — return stale data immediately and refresh in background
      setScan(key, { ...cached, refreshing: true });
      void doScan(opts, apiKey).then((entry) => setScan(key, entry));
      return NextResponse.json({ ...cached, cached: true, refreshing: true });
    }
  }

  // Cache miss (or force refresh) — run synchronously
  const entry = await doScan(opts, apiKey);
  setScan(key, entry);
  return NextResponse.json({ ...entry, cached: false });
}
