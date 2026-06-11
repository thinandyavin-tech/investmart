import { NextRequest, NextResponse } from "next/server";
import { newsTeaser }               from "@/lib/newsUtils";

export const dynamic    = "force-dynamic";
export const revalidate = 300; // 5 min CDN TTL

interface FinnhubArticle {
  id:       number;
  headline: string;
  source:   string;
  url:      string;
  datetime: number;
  summary:  string;
}

interface SectorNewsArticle {
  id:       number;
  headline: string;
  source:   string;
  url:      string;
  datetime: number;
  summary:  string;
  ticker:   string | null;
}

// Representative tickers per sector — small lists to stay within Finnhub rate limits
const SECTOR_TICKERS: Record<string, string[]> = {
  all:       [],                                          // use general market news endpoint instead
  tech:      ["AAPL", "MSFT", "NVDA", "GOOGL", "META"],
  finance:   ["JPM", "BAC", "GS", "V", "BLK"],
  health:    ["JNJ", "LLY", "PFE", "ABBV", "UNH"],
  biotech:   ["MRNA", "GILD", "BIIB", "VRTX", "REGN"],
  energy:    ["XOM", "CVX", "COP", "SLB", "OXY"],
  consumer:  ["AMZN", "TSLA", "HD", "MCD", "NKE"],
  indust:    ["GE", "CAT", "DE", "RTX", "HON"],
  space:     ["RKLB", "JOBY", "IONQ", "BA", "LMT"],
  crypto:    ["COIN", "MSTR", "MARA", "RIOT", "HOOD"],
};

const VALID_SECTORS = new Set(Object.keys(SECTOR_TICKERS));

// In-memory cache keyed by sector
interface CacheEntry { articles: SectorNewsArticle[]; cachedAt: number; }
const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 min

function formatDate(unixSecs: number): string {
  return new Date(unixSecs * 1000).toISOString().slice(0, 10);
}

async function fetchCompanyNews(ticker: string, apiKey: string): Promise<SectorNewsArticle[]> {
  const now  = Math.floor(Date.now() / 1000);
  const from = now - 7 * 24 * 3600;
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(ticker)}&from=${formatDate(from)}&to=${formatDate(now)}&token=${apiKey}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return [];
    const raw = (await res.json()) as FinnhubArticle[];
    return raw.slice(0, 6).map(a => ({ ...a, ticker, summary: newsTeaser(a.summary ?? "") }));
  } catch {
    return [];
  }
}

async function fetchGeneralNews(apiKey: string): Promise<SectorNewsArticle[]> {
  try {
    const [g, m] = await Promise.all([
      fetch(`https://finnhub.io/api/v1/news?category=general&token=${apiKey}`, { signal: AbortSignal.timeout(6000) }),
      fetch(`https://finnhub.io/api/v1/news?category=merger&token=${apiKey}`,  { signal: AbortSignal.timeout(6000) }),
    ]);
    const parse = async (r: Response): Promise<FinnhubArticle[]> => {
      if (!r.ok) return [];
      const d = (await r.json()) as unknown;
      return Array.isArray(d) ? (d as FinnhubArticle[]) : [];
    };
    const [gen, mer] = await Promise.all([parse(g), parse(m)]);
    const seen = new Set<number>();
    return [...gen, ...mer]
      .filter(a => { if (!a.id || !a.headline || seen.has(a.id)) return false; seen.add(a.id); return true; })
      .sort((a, b) => b.datetime - a.datetime)
      .slice(0, 30)
      .map(a => ({ ...a, ticker: null, summary: newsTeaser(a.summary ?? "") }));
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const sector = (req.nextUrl.searchParams.get("sector") ?? "all").toLowerCase();
  if (!VALID_SECTORS.has(sector)) {
    return NextResponse.json({ error: "invalid sector" }, { status: 400 });
  }

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return NextResponse.json({ articles: [] });

  // Serve from cache if fresh
  const cached = cache.get(sector);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL) {
    return NextResponse.json(
      { articles: cached.articles },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
    );
  }

  let articles: SectorNewsArticle[];
  if (sector === "all") {
    articles = await fetchGeneralNews(apiKey);
  } else {
    const tickers = SECTOR_TICKERS[sector]!;
    const results = await Promise.all(tickers.map(t => fetchCompanyNews(t, apiKey)));
    const seen = new Set<number>();
    articles = results.flat()
      .filter(a => { if (!a.id || !a.headline || seen.has(a.id)) return false; seen.add(a.id); return true; })
      .sort((a, b) => b.datetime - a.datetime)
      .slice(0, 30);
  }

  cache.set(sector, { articles, cachedAt: Date.now() });
  return NextResponse.json(
    { articles },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
  );
}
