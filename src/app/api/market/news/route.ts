import { NextResponse }               from "next/server";
import { newsTeaser, isStockRelated } from "@/lib/newsUtils";

export const revalidate = 120;

interface FinnhubArticle {
  id:       number;
  headline: string;
  source:   string;
  url:      string;
  datetime: number;
  summary:  string;
}

// Major US stocks covering the full market — no ETFs (SPY/QQQ pull in generic market commentary)
const MARKET_TICKERS = ["AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "JPM", "TSLA", "XOM", "JNJ"];

async function fetchCompanyNews(ticker: string, apiKey: string): Promise<FinnhubArticle[]> {
  const now  = Math.floor(Date.now() / 1000);
  const from = now - 3 * 24 * 3600; // last 3 days for home feed freshness
  const fromDate = new Date(from * 1000).toISOString().slice(0, 10);
  const toDate   = new Date(now  * 1000).toISOString().slice(0, 10);
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(ticker)}&from=${fromDate}&to=${toDate}&token=${apiKey}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return [];
    const raw = (await res.json()) as unknown;
    return Array.isArray(raw) ? (raw as FinnhubArticle[]).slice(0, 4) : [];
  } catch {
    return [];
  }
}

export async function GET(): Promise<NextResponse> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API not configured" }, { status: 500 });
  }

  try {
    const results = await Promise.all(MARKET_TICKERS.map(t => fetchCompanyNews(t, apiKey)));

    const seen = new Set<number>();
    const merged = results.flat()
      .filter(a => {
        if (!a.id || !a.headline || !a.url) return false;
        if (seen.has(a.id)) return false;
        if (!isStockRelated(a.headline, a.summary ?? "")) return false;
        seen.add(a.id);
        return true;
      })
      .sort((a, b) => b.datetime - a.datetime)
      .slice(0, 20)
      .map(a => ({
        id:       a.id,
        headline: a.headline,
        source:   a.source,
        url:      a.url,
        datetime: a.datetime,
        summary:  newsTeaser(a.summary ?? ""),
      }));

    return NextResponse.json(
      { articles: merged },
      { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" } }
    );
  } catch {
    return NextResponse.json({ articles: [] });
  }
}
