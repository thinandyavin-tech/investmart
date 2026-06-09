/**
 * Lightweight quote batch for the screener's visible page.
 * Accepts up to 50 tickers at a time; returns price, change%, volume, market cap.
 * Never bulk-fetches entire universes — only the rows currently shown.
 * Results cached in-memory per ticker for 60s to absorb rapid pagination.
 */
import { NextRequest, NextResponse } from "next/server";
import { computeScores } from "@/lib/momentum";
import { getSector } from "@/lib/stockUniverse";
import { CATALOG } from "@/lib/stockCatalog";
import { STOCK_INFO } from "@/lib/stockNames";

export const dynamic = "force-dynamic";

const MAX_TICKERS  = 50;
const CACHE_TTL_MS = 60_000;

interface QuoteResult {
  ticker:        string;
  name:          string;
  sector:        string;
  price:         number;
  change1D:      number;
  volume:        number;
  marketCap:     number;
  momentumScore: number;
  qualityScore:  number;
  breakoutScore: number;
  volumeSurge:   number;
  stale:         boolean;
}

interface CacheEntry { result: QuoteResult; cachedAt: number }
const cache    = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<QuoteResult | null>>();

function resolveName(ticker: string): string {
  return CATALOG.get(ticker)?.name ?? STOCK_INFO[ticker]?.name ?? ticker;
}

function resolveSector(ticker: string): string {
  return CATALOG.get(ticker)?.sector ?? getSector(ticker);
}

async function fetchQuote(ticker: string, apiKey: string): Promise<QuoteResult | null> {
  const hit = cache.get(ticker);
  if (hit && Date.now() - hit.cachedAt < CACHE_TTL_MS) return hit.result;

  const existing = inflight.get(ticker);
  if (existing) return existing;

  const promise = (async (): Promise<QuoteResult | null> => {
    try {
      const res = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(ticker)}&token=${apiKey}`,
        { signal: AbortSignal.timeout(3000) }
      );
      if (!res.ok) return null;
      const q = (await res.json()) as { c: number; pc: number; v: number; t: number };
      if (!q.c || q.c < 0.01) return null;

      const change1D = q.pc > 0 ? ((q.c - q.pc) / q.pc) * 100 : 0;
      const scores   = computeScores(change1D, q.v, 0, 50, q.c * 1_000_000);

      const result: QuoteResult = {
        ticker,
        name:          resolveName(ticker),
        sector:        resolveSector(ticker),
        price:         q.c,
        change1D,
        volume:        q.v,
        marketCap:     q.c * 1_000_000,
        momentumScore: scores.momentumScore,
        qualityScore:  scores.qualityScore,
        breakoutScore: scores.breakoutScore,
        volumeSurge:   scores.volumeSurge,
        stale:         false,
      };
      cache.set(ticker, { result, cachedAt: Date.now() });
      return result;
    } catch {
      return null;
    } finally {
      inflight.delete(ticker);
    }
  })();

  inflight.set(ticker, promise);
  return promise;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "API not configured" }, { status: 503 });

  const raw = request.nextUrl.searchParams.get("tickers") ?? "";
  const tickers = raw
    .split(",")
    .map(t => t.trim().toUpperCase())
    .filter(t => /^[A-Z][A-Z.\-]{0,9}$/.test(t))
    .slice(0, MAX_TICKERS);

  if (tickers.length === 0) return NextResponse.json({ rows: [] });

  // Fetch all requested tickers concurrently (each is individually cached/deduped)
  const results = await Promise.all(tickers.map(t => fetchQuote(t, apiKey)));
  const rows = results.filter((r): r is QuoteResult => r !== null);

  return NextResponse.json({ rows, fetchedAt: new Date().toISOString() });
}
