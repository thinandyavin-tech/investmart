/**
 * Screens precompute cron — runs once daily before market open.
 *
 * Fetches Finnhub metric=all for every S&P 500 ticker and stores the
 * dividend/growth data in SiteCache. Screen routes read from this cache
 * and enrich visible rows with live quotes on demand.
 *
 * Runs in batches with configurable delay to respect Finnhub rate limits.
 * Free tier:  60 calls/min → BATCH_DELAY ≥ 10 000 ms with BATCH_SIZE=10
 * Paid tier:  300 calls/min → BATCH_DELAY 2 100 ms is safe
 * Set FINNHUB_BATCH_DELAY_MS in Vercel env.
 */

import { NextResponse }  from "next/server";
import { prisma }        from "@/lib/prisma";
import { getUniverseTickers } from "@/lib/stockUniverse";
import { CATALOG }       from "@/lib/stockCatalog";
import { STOCK_INFO }    from "@/lib/stockNames";

export const dynamic     = "force-dynamic";
export const maxDuration = 300;

const BATCH_SIZE  = 10;
const BATCH_DELAY = parseInt(process.env.FINNHUB_BATCH_DELAY_MS ?? "2100", 10);

export const SCREENS_CACHE_KEY = "screens_metrics_v2";
export const SCREENS_TTL_MS    = 20 * 60 * 60 * 1000; // 20 hours

export interface TickerMetrics {
  ticker:           string;
  name:             string;
  dividendYield:    number | null;
  dividendPerShare: number | null;
  revenueGrowth3Y:  number | null;
  epsGrowth3Y:      number | null;
  epsGrowth5Y:      number | null;
  pe:               number | null;
  beta:             number | null;
  grossMarginTTM:   number | null;
  marketCap:        number | null;
  /** Last known price from precompute time — used as fallback if live quote fails */
  cachedPrice:      number | null;
  cachedChange1D:   number | null;
}

export interface ScreensCache {
  tickers:   TickerMetrics[];
  updatedAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchTickerData(
  ticker: string,
  apiKey: string,
): Promise<TickerMetrics | null> {
  const sym  = encodeURIComponent(ticker);
  const base = `https://finnhub.io/api/v1`;
  const tok  = `token=${apiKey}`;

  // Fetch metric and quote in parallel for each ticker
  const [metricRes, quoteRes] = await Promise.allSettled([
    fetch(`${base}/stock/metric?symbol=${sym}&metric=all&${tok}`, { signal: AbortSignal.timeout(5000) }),
    fetch(`${base}/quote?symbol=${sym}&${tok}`,                   { signal: AbortSignal.timeout(5000) }),
  ]);

  // Require at least metric data to include this ticker
  if (metricRes.status !== "fulfilled" || !metricRes.value.ok) return null;

  let metricBody: { metric?: Record<string, unknown> };
  try {
    metricBody = (await metricRes.value.json()) as { metric?: Record<string, unknown> };
  } catch { return null; }

  const m    = metricBody.metric ?? {};
  const name = CATALOG.get(ticker)?.name ?? STOCK_INFO[ticker]?.name ?? ticker;

  function num(k: string): number | null {
    const v = m[k];
    return typeof v === "number" && isFinite(v) ? v : null;
  }

  // Finnhub sometimes returns growth as 25.0 instead of 0.25 — normalise to percent
  function growthPct(k: string, ...alt: string[]): number | null {
    const raw = num(k) ?? (alt.length ? num(alt[0]!) : null);
    if (raw == null) return null;
    return Math.abs(raw) <= 2 ? raw * 100 : raw;
  }

  // Extract cached price from quote response (best-effort; null if unavailable)
  let cachedPrice: number | null    = null;
  let cachedChange1D: number | null = null;
  if (quoteRes.status === "fulfilled" && quoteRes.value.ok) {
    try {
      const q = (await quoteRes.value.json()) as { c?: number; pc?: number; dp?: number };
      if (q.c && q.c > 0.01) {
        cachedPrice    = q.c;
        cachedChange1D = q.dp ?? (q.pc && q.pc > 0 ? ((q.c - q.pc) / q.pc) * 100 : 0);
      }
    } catch { /* leave null */ }
  }

  return {
    ticker,
    name,
    dividendYield:    num("dividendYieldIndicatedAnnual"),
    dividendPerShare: num("dividendPerShareAnnual"),
    revenueGrowth3Y:  growthPct("revenueGrowth3Y", "revenue3YGrowth"),
    epsGrowth3Y:      growthPct("epsGrowth3Y"),
    epsGrowth5Y:      growthPct("epsGrowth5Y"),
    pe:               num("peBasicExclExtraTTM"),
    beta:             num("beta"),
    grossMarginTTM:   growthPct("grossMarginTTM"),
    marketCap:        num("marketCapitalization"),
    cachedPrice,
    cachedChange1D,
  };
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET(): Promise<NextResponse> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "FINNHUB_API_KEY not configured" }, { status: 503 });
  }

  const tickers = [...getUniverseTickers("SP500")];
  const results: TickerMetrics[] = [];
  const errors: string[] = [];

  console.info(`[screens-precompute] starting — ${tickers.length} tickers, batch=${BATCH_SIZE}, delay=${BATCH_DELAY}ms`);

  for (let i = 0; i < tickers.length; i += BATCH_SIZE) {
    const batch = tickers.slice(i, i + BATCH_SIZE);

    const settled = await Promise.allSettled(
      batch.map(t => fetchTickerData(t, apiKey))
    );

    for (let j = 0; j < batch.length; j++) {
      const s = settled[j]!;
      if (s.status === "fulfilled" && s.value) {
        results.push(s.value);
      } else {
        errors.push(batch[j]!);
      }
    }

    if (i + BATCH_SIZE < tickers.length) {
      await sleep(BATCH_DELAY);
    }
  }

  const payload: ScreensCache = {
    tickers:   results,
    updatedAt: new Date().toISOString(),
  };

  // Prisma Json column accepts plain objects; cast via unknown to satisfy strict mode
  const jsonValue = payload as unknown as import("@prisma/client").Prisma.InputJsonValue;
  await prisma.siteCache.upsert({
    where:  { key: SCREENS_CACHE_KEY },
    update: { value: jsonValue },
    create: { key: SCREENS_CACHE_KEY, value: jsonValue },
  });

  console.info(`[screens-precompute] done — ${results.length} ok, ${errors.length} failed`);

  return NextResponse.json({
    ok:      true,
    fetched: results.length,
    failed:  errors.length,
    errors:  errors.slice(0, 20),
  });
}
