import { NextRequest, NextResponse } from "next/server";
import { getUniverseTickers, getSector, type Universe } from "@/lib/stockUniverse";
import { computeScores, type StockMetrics } from "@/lib/momentum";
import { getScan, setScan, isStale, getBaseline, type ScanEntry } from "@/lib/scanCache";

const BATCH_SIZE = 25;
const DELAY_MS   = 100; // stay under 30 req/s Finnhub free limit

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

interface QuoteResult { c: number; pc: number; v: number; }

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

interface ProfileResult { name?: string; marketCapitalization?: number; }

async function fetchProfile(symbol: string, apiKey: string): Promise<ProfileResult | null> {
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`,
      { signal: AbortSignal.timeout(2000) }
    );
    if (!res.ok) return null;
    return (await res.json()) as ProfileResult;
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

async function doScan(opts: ScanOptions, apiKey: string, key: string): Promise<ScanEntry> {
  const tickers = getUniverseTickers(opts.universe);
  const rawResults: StockMetrics[] = [];

  // Phase 1: fetch all quotes in batches
  for (let i = 0; i < tickers.length; i += BATCH_SIZE) {
    const batch = tickers.slice(i, i + BATCH_SIZE);

    const batchData = await Promise.all(
      batch.map(async (ticker): Promise<StockMetrics | null> => {
        const quote = await fetchQuote(ticker, apiKey);
        if (!quote) return null;

        const price    = quote.c;
        const change1D = quote.pc > 0 ? ((price - quote.pc) / quote.pc) * 100 : 0;
        const volume   = quote.v;

        if (opts.filterDead && price < 1) return null;

        const scores = computeScores(change1D, volume, 0, 50, price * 1_000_000);
        if (scores.momentumScore < opts.minScore) return null;

        return {
          ticker,
          price,
          change1D,
          volume,
          avgVolume:   0,
          marketCap:   price * 1_000_000,
          rsi:         50,
          companyName: ticker,
          exchange:    "US",
          sector:      getSector(ticker),
          isNew:       false,
          ...scores,
        } satisfies StockMetrics;
      })
    );

    for (const item of batchData) {
      if (item) rawResults.push(item);
    }

    if (i + BATCH_SIZE < tickers.length) await sleep(DELAY_MS);
  }

  rawResults.sort((a, b) => b.change1D - a.change1D);
  const top = rawResults.slice(0, 100);

  // Phase 2: enrich top 30 with real company name + market cap (fire-and-forget the rest)
  const enrichTargets = top.slice(0, 30);
  const profiles = await Promise.all(
    enrichTargets.map((s) => fetchProfile(s.ticker, apiKey))
  );
  for (let i = 0; i < enrichTargets.length; i++) {
    const p = profiles[i];
    if (!p) continue;
    if (p.name)                    enrichTargets[i].companyName = p.name;
    if (p.marketCapitalization)    enrichTargets[i].marketCap   = p.marketCapitalization * 1_000_000;
  }

  // Apply cap size filter (now we have real-ish market caps for top 30)
  const CAP_SMALL = 300_000_000;
  const CAP_MID   = 100_000_000_000;
  const filtered = top.filter((s) => {
    if (opts.capSize === "SMALL") return s.marketCap < CAP_SMALL;
    if (opts.capSize === "MID")   return s.marketCap >= CAP_SMALL && s.marketCap < CAP_MID;
    if (opts.capSize === "BIG")   return s.marketCap >= CAP_MID;
    return true;
  });

  // Mark new stocks (not in baseline from earlier scans this session)
  const base = getBaseline(key);
  for (const s of filtered) {
    s.isNew = base.size > 0 && !base.has(s.ticker);
  }

  return {
    results:   filtered,
    total:     tickers.length,
    scannedAt: new Date().toISOString(),
    refreshing: false,
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const params     = request.nextUrl.searchParams;
  const universe   = (params.get("universe") ?? "SP500") as Universe;
  const minScore   = parseInt(params.get("minScore") ?? "20", 10);
  const capSize    = params.get("capSize") ?? "ALL";
  const filterDead = params.get("filterDead") !== "false";
  const force      = params.get("force") === "true";

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "API not configured" }, { status: 500 });

  const opts: ScanOptions = { universe, minScore, capSize, filterDead };
  const key = cacheKey(opts);

  if (!force) {
    const cached = getScan(key);

    if (cached && !isStale(cached)) {
      return NextResponse.json({ ...cached, cached: true });
    }

    if (cached && isStale(cached)) {
      setScan(key, { ...cached, refreshing: true });
      void doScan(opts, apiKey, key).then((entry) => setScan(key, entry));
      return NextResponse.json({ ...cached, cached: true, refreshing: true });
    }
  }

  const entry = await doScan(opts, apiKey, key);
  setScan(key, entry);
  return NextResponse.json({ ...entry, cached: false });
}
