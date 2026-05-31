import { NextRequest, NextResponse } from "next/server";

const TICKER_RE = /^[A-Z][A-Z.\-]{0,9}$/;
const MAX_ARTICLES = 8;
const ONE_WEEK_SECS = 7 * 24 * 60 * 60;

interface FinnhubArticle {
  id:       number;
  headline: string;
  source:   string;
  url:      string;
  datetime: number;
  summary:  string;
  category: string;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const ticker = request.nextUrl.searchParams.get("symbol")?.toUpperCase() ?? "";

  if (!TICKER_RE.test(ticker)) {
    return NextResponse.json({ error: "invalid ticker" }, { status: 400 });
  }

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API not configured" }, { status: 500 });
  }

  const now   = Math.floor(Date.now() / 1000);
  const from  = now - ONE_WEEK_SECS;

  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(ticker)}&from=${formatDate(from)}&to=${formatDate(now)}&token=${apiKey}`,
      { signal: AbortSignal.timeout(5000), next: { revalidate: 600 } }
    );
    if (!res.ok) {
      return NextResponse.json({ articles: [] });
    }
    const raw = (await res.json()) as FinnhubArticle[];
    const articles = raw
      .sort((a, b) => b.datetime - a.datetime)
      .slice(0, MAX_ARTICLES)
      .map((a) => ({
        id:       a.id,
        headline: a.headline,
        source:   a.source,
        url:      a.url,
        datetime: a.datetime,
        summary:  a.summary?.slice(0, 200) ?? "",
      }));
    return NextResponse.json(
      { articles, ticker },
      { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200" } }
    );
  } catch {
    return NextResponse.json({ articles: [] });
  }
}

function formatDate(unixSecs: number): string {
  return new Date(unixSecs * 1000).toISOString().slice(0, 10);
}
