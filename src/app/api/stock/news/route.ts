import { NextRequest, NextResponse } from "next/server";

const TICKER_RE    = /^[A-Z][A-Z0-9.\-]{0,9}$/;
const MAX_ARTICLES = 10;
const ONE_WEEK_MS  = 7 * 24 * 60 * 60 * 1000;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 min per ticker

interface FinnhubArticle {
  id:       number;
  headline: string;
  source:   string;
  url:      string;
  datetime: number;
  summary:  string;
  category: string;
}

interface CacheEntry {
  articles: ReturnType<typeof mapArticle>[];
  ts:       number;
}

const cache = new Map<string, CacheEntry>();

function mapArticle(a: FinnhubArticle) {
  return {
    id:       a.id,
    headline: a.headline,
    source:   a.source,
    url:      a.url,
    datetime: a.datetime,
    summary:  a.summary?.slice(0, 200) ?? "",
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const ticker = request.nextUrl.searchParams.get("symbol")?.toUpperCase().trim() ?? "";

  if (!TICKER_RE.test(ticker)) {
    return NextResponse.json({ error: "invalid ticker" }, { status: 400 });
  }

  // Per-ticker server-side cache — prevents serving one ticker's news for another
  const hit = cache.get(ticker);
  if (hit && Date.now() - hit.ts < CACHE_TTL_MS) {
    return NextResponse.json({ articles: hit.articles, ticker });
  }

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API not configured" }, { status: 500 });
  }

  const now  = Date.now();
  const from = now - ONE_WEEK_MS;

  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(ticker)}&from=${fmtDate(from)}&to=${fmtDate(now)}&token=${apiKey}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) {
      return NextResponse.json({ articles: [], ticker });
    }

    const raw      = (await res.json()) as FinnhubArticle[];
    const articles = raw
      .filter((a) => a.headline && a.url)
      .sort((a, b) => b.datetime - a.datetime)
      .slice(0, MAX_ARTICLES)
      .map(mapArticle);

    cache.set(ticker, { articles, ts: Date.now() });
    return NextResponse.json({ articles, ticker });
  } catch {
    return NextResponse.json({ articles: [], ticker });
  }
}

function fmtDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}
