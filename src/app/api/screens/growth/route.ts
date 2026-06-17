/**
 * Growth screen — reads from precomputed SiteCache, enriches visible page
 * with live Finnhub quotes. Paginated 20 rows per page.
 *
 * Sort options: EPS 3Y growth (desc), Revenue 3Y growth (desc), or A–Z.
 * Stocks with null growth data are shown last when sorting by growth.
 */

import { NextRequest, NextResponse } from "next/server";
import { z }                         from "zod";
import { applyRateLimit }            from "@/lib/rateLimit";
import { loadScreensCache, isCacheFresh } from "@/lib/screensCache";
import type { TickerMetrics }        from "@/lib/screensCache";
import { getYahooQuote }             from "@/lib/yahooFinance";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  sort: z.enum(["eps3y_desc", "rev3y_desc", "ticker_asc"]).default("eps3y_desc"),
});

// ── Live quote enrichment ─────────────────────────────────────────────────────

interface FinnhubQuote { c: number; pc: number; dp: number; }

const quoteCache   = new Map<string, { price: number; change1D: number; stale: boolean; at: number }>();
const QUOTE_TTL_MS = 60_000;

async function fetchLiveQuote(
  ticker:      string,
  apiKey:      string,
  cachedPrice: number | null,
  cachedChg:   number | null,
): Promise<{ price: number; change1D: number; stale: boolean }> {
  const hit = quoteCache.get(ticker);
  if (hit && Date.now() - hit.at < QUOTE_TTL_MS) return hit;

  // Try Finnhub first
  try {
    const r = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(ticker)}&token=${apiKey}`,
      { signal: AbortSignal.timeout(3000) },
    );
    if (r.ok) {
      const q = (await r.json()) as FinnhubQuote;
      if (q.c && q.c > 0.01) {
        const entry = { price: q.c, change1D: q.dp ?? 0, stale: false, at: Date.now() };
        quoteCache.set(ticker, entry);
        return entry;
      }
    }
  } catch { /* fall through */ }

  // Finnhub unavailable — try Yahoo Finance (real data, ~15 min delayed)
  try {
    const yq = await getYahooQuote(ticker);
    if (yq && yq.price > 0) {
      const entry = { price: yq.price, change1D: yq.changePct, stale: true, at: Date.now() };
      quoteCache.set(ticker, entry);
      return entry;
    }
  } catch { /* fall through */ }

  // Last resort: use the price cached during last precompute
  if (cachedPrice && cachedPrice > 0) {
    return { price: cachedPrice, change1D: cachedChg ?? 0, stale: true };
  }

  return { price: 0, change1D: 0, stale: true };
}

// Sort helper — nulls always last
function sortGrowth(a: TickerMetrics, b: TickerMetrics, key: "epsGrowth3Y" | "revenueGrowth3Y"): number {
  const av = a[key];
  const bv = b[key];
  if (av == null && bv == null) return 0;
  if (av == null) return 1;
  if (bv == null) return -1;
  return bv - av;
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  const limited = await applyRateLimit(request, "quote");
  if (limited) return limited;

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "API not configured" }, { status: 503 });

  const raw    = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = QuerySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid params" }, { status: 422 });
  }

  const { page, sort } = parsed.data;

  const screensData = await loadScreensCache();
  if (!screensData) {
    return NextResponse.json({
      rows:     [],
      page:     1,
      total:    0,
      pageSize: PAGE_SIZE,
      building: true,
    });
  }

  const all = [...screensData.tickers];

  if (sort === "eps3y_desc") {
    all.sort((a, b) => sortGrowth(a, b, "epsGrowth3Y"));
  } else if (sort === "rev3y_desc") {
    all.sort((a, b) => sortGrowth(a, b, "revenueGrowth3Y"));
  } else {
    all.sort((a, b) => a.ticker.localeCompare(b.ticker));
  }

  const total  = all.length;
  const offset = (page - 1) * PAGE_SIZE;
  const slice  = all.slice(offset, offset + PAGE_SIZE);

  const quotes = await Promise.all(
    slice.map(t => fetchLiveQuote(t.ticker, apiKey, t.cachedPrice ?? null, t.cachedChange1D ?? null)),
  );

  const rows = slice.map((t, i) => ({
    ticker:          t.ticker,
    name:            t.name,
    price:           quotes[i]!.price,
    change1D:        quotes[i]!.change1D,
    revenueGrowth3Y: t.revenueGrowth3Y,
    epsGrowth3Y:     t.epsGrowth3Y,
    epsGrowth5Y:     t.epsGrowth5Y,
    pe:              t.pe,
    beta:            t.beta,
    priceStale:      quotes[i]!.stale,
  }));

  return NextResponse.json({
    rows,
    page,
    total,
    pageSize: PAGE_SIZE,
    building: false,
    stale:    !isCacheFresh(screensData),
  });
}
