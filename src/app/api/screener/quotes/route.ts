/**
 * Lightweight quote batch for the screener's visible page.
 * Accepts up to 50 tickers at a time; returns price, change%, volume, market cap.
 * Never bulk-fetches entire universes — only the rows currently shown.
 * Results cached in-memory per ticker for 60s to absorb rapid pagination.
 */
import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit } from "@/lib/rateLimit";
import { computeScores } from "@/lib/momentum";
import { getSector } from "@/lib/stockUniverse";
import { CATALOG } from "@/lib/stockCatalog";
import { STOCK_INFO } from "@/lib/stockNames";
import { getYahooQuote } from "@/lib/yahooFinance";

export const dynamic = "force-dynamic";

const MAX_TICKERS  = 25; // one page — stays well within Finnhub's 60 req/min free tier
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
      // Try Finnhub first (real-time)
      let price    = 0;
      let prevClose = 0;
      let volume   = 0;
      let stale    = false;

      const res = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(ticker)}&token=${apiKey}`,
        { signal: AbortSignal.timeout(3000) }
      );
      if (res.ok) {
        const q = (await res.json()) as { c: number; pc: number; v: number; t: number };
        if (q.c && q.c > 0.01) {
          price     = q.c;
          prevClose = q.pc;
          volume    = q.v;
        }
      }

      // Finnhub rate-limited or returned no data — fall back to Yahoo Finance
      if (price === 0) {
        const yq = await getYahooQuote(ticker);
        if (yq && yq.price > 0) {
          price     = yq.price;
          prevClose = yq.prevClose;
          volume    = yq.volume;
          stale     = true; // Yahoo is ~15 min delayed
        }
      }

      if (price === 0) return null;

      const change1D = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0;
      const scores   = computeScores(change1D, volume, 0, 50, 0);

      const result: QuoteResult = {
        ticker,
        name:          resolveName(ticker),
        sector:        resolveSector(ticker),
        price,
        change1D,
        volume,
        marketCap:     price * 1_000_000, // approximation only — screener metrics route has accurate beta/PE
        momentumScore: scores.momentumScore,
        qualityScore:  scores.qualityScore,
        breakoutScore: scores.breakoutScore,
        volumeSurge:   scores.volumeSurge,
        stale,
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
  const limited = await applyRateLimit(request, "default");
  if (limited) return limited;
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
