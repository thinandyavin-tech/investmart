import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit } from "@/lib/rateLimit";

import { searchCatalog } from "@/lib/stockCatalog";
import { SET50_TICKERS } from "@/lib/stockUniverse";
import { STOCK_INFO } from "@/lib/stockNames";

export const dynamic     = "force-dynamic";
export const maxDuration = 8; // increased for Finnhub fallback

// Pre-build SET50 entries from existing stockNames for backward-compat
const SET50_EXTRAS = (() => {
  return SET50_TICKERS
    .filter(t => !searchCatalog(t, 1).some(e => e.ticker === t))
    .map(t => ({
      ticker:   t,
      name:     STOCK_INFO[t]?.name ?? t,
      exchange: "SET" as const,
      sector:   "Other",
      indices:  ["SET50"],
    }));
})();

// ── Finnhub live symbol search ────────────────────────────────────────────────
// Used as fallback when the static catalog has fewer than 3 matches.
// Covers new tickers, ETFs, and any covered symbol missing from our catalog.

interface FinnhubSearchItem {
  description:   string;
  displaySymbol: string;
  symbol:        string;
  type:          string;
}

interface FinnhubSearchResponse {
  result?: FinnhubSearchItem[];
}

interface SuggestResult {
  ticker:   string;
  name:     string;
  exchange: string;
  sector:   string;
  indices:  string[];
}

// In-process cache: keyed by lowercase query, 60-second TTL
const _finnhubCache = new Map<string, { results: SuggestResult[]; ts: number }>();
const FINNHUB_TTL   = 60_000;

async function searchFinnhub(query: string, apiKey: string): Promise<SuggestResult[]> {
  const key    = query.toLowerCase();
  const cached = _finnhubCache.get(key);
  if (cached && Date.now() - cached.ts < FINNHUB_TTL) return cached.results;

  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}&token=${apiKey}`,
      { signal: AbortSignal.timeout(5_000) },
    );
    if (!res.ok) return [];

    const data = (await res.json()) as FinnhubSearchResponse;
    const results: SuggestResult[] = (data.result ?? [])
      .filter(r => /^[A-Z]{1,6}$/.test(r.displaySymbol)) // US-style tickers only
      .slice(0, 8)
      .map(r => ({
        ticker:   r.displaySymbol,
        name:     r.description,
        exchange: "US",
        sector:   "Other",
        indices:  [] as string[],
      }));

    _finnhubCache.set(key, { results, ts: Date.now() });
    return results;
  } catch {
    return [];
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  const limited = await applyRateLimit(request, "default");
  if (limited) return limited;
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 1) return NextResponse.json({ results: [] });

  // 1. Static catalog (S&P 500, Nasdaq 100, major ETFs, ADRs, etc.)
  const catalogResults = searchCatalog(q, 18);

  // 2. SET50 Thai stocks
  const upper     = q.toUpperCase();
  const setResults = SET50_EXTRAS.filter(e => {
    const t = e.ticker.toUpperCase();
    const n = e.name.toUpperCase();
    return t === upper || t.startsWith(upper) || (n.includes(upper) && upper.length >= 2);
  }).slice(0, 4);

  // 3. Merge catalog + SET50, deduplicate
  const seen = new Set<string>();
  const merged: SuggestResult[] = [...catalogResults, ...setResults].filter(e => {
    if (seen.has(e.ticker)) return false;
    seen.add(e.ticker);
    return true;
  }).map(e => ({
    ticker:   e.ticker,
    name:     e.name || e.ticker,
    exchange: e.exchange as string,
    sector:   e.sector,
    indices:  e.indices,
  }));

  // 4. Finnhub live fallback — only when catalog has < 3 matches
  // Covers new tickers (e.g. SPCX) and any covered symbol not in our static list.
  // Honest: if Finnhub doesn't cover it either, nothing is returned — never fabricated.
  if (merged.length < 3) {
    const apiKey = process.env.FINNHUB_API_KEY?.trim();
    if (apiKey) {
      const live = await searchFinnhub(q, apiKey);
      for (const r of live) {
        if (!seen.has(r.ticker)) {
          seen.add(r.ticker);
          merged.push(r);
        }
      }
    }
  }

  return NextResponse.json({ results: merged.slice(0, 20) });
}
