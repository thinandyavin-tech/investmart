/**
 * Dividend screen — reads from precomputed SiteCache, enriches visible page
 * with live Finnhub quotes. Paginated 20 rows per page.
 *
 * The cache is populated by /api/cron/screens-precompute (runs daily).
 * On first deploy: hit /api/cron/screens-precompute manually to seed it.
 */

import { NextRequest, NextResponse } from "next/server";
import { z }                         from "zod";
import { applyRateLimit }            from "@/lib/rateLimit";
import { loadScreensCache, isCacheFresh } from "@/lib/screensCache";
import type { TickerMetrics }        from "@/lib/screensCache";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  sort: z.enum(["yield_desc", "yield_asc", "ticker_asc"]).default("yield_desc"),
});

// ── Live quote enrichment ─────────────────────────────────────────────────────

interface FinnhubQuote { c: number; pc: number; dp: number; }

const quoteCache    = new Map<string, { price: number; change1D: number; at: number }>();
const QUOTE_TTL_MS  = 60_000; // 1 min

async function fetchLiveQuote(
  ticker: string,
  apiKey: string,
): Promise<{ price: number; change1D: number }> {
  const hit = quoteCache.get(ticker);
  if (hit && Date.now() - hit.at < QUOTE_TTL_MS) return hit;

  try {
    const r = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(ticker)}&token=${apiKey}`,
      { signal: AbortSignal.timeout(3000) },
    );
    if (!r.ok) return { price: 0, change1D: 0 };
    const q = (await r.json()) as FinnhubQuote;
    const entry = { price: q.c ?? 0, change1D: q.dp ?? 0, at: Date.now() };
    quoteCache.set(ticker, entry);
    return entry;
  } catch {
    return { price: 0, change1D: 0 };
  }
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

  // Filter to dividend-paying stocks (yield > 0)
  let filtered = screensData.tickers.filter(
    (t): t is TickerMetrics => t.dividendYield !== null && t.dividendYield > 0,
  );

  // Sort
  if (sort === "yield_desc") {
    filtered.sort((a, b) => (b.dividendYield ?? 0) - (a.dividendYield ?? 0));
  } else if (sort === "yield_asc") {
    filtered.sort((a, b) => (a.dividendYield ?? 0) - (b.dividendYield ?? 0));
  } else {
    filtered.sort((a, b) => a.ticker.localeCompare(b.ticker));
  }

  const total  = filtered.length;
  const offset = (page - 1) * PAGE_SIZE;
  const slice  = filtered.slice(offset, offset + PAGE_SIZE);

  // Enrich visible slice with live quotes
  const quotes = await Promise.all(
    slice.map(t => fetchLiveQuote(t.ticker, apiKey)),
  );

  const rows = slice.map((t, i) => ({
    ticker:           t.ticker,
    name:             t.name,
    price:            quotes[i]!.price,
    change1D:         quotes[i]!.change1D,
    dividendYield:    t.dividendYield,
    dividendPerShare: t.dividendPerShare,
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
