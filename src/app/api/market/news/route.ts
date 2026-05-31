import { NextResponse } from "next/server";

export const revalidate = 600;

interface FinnhubArticle {
  id: number;
  headline: string;
  source: string;
  url: string;
  datetime: number;
  summary: string;
}

export async function GET(): Promise<NextResponse> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API not configured" }, { status: 500 });
  }

  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/news?category=general&token=${apiKey}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) {
      return NextResponse.json({ articles: [] });
    }
    const raw = (await res.json()) as FinnhubArticle[];
    const articles = raw.slice(0, 6).map((a) => ({
      id:       a.id,
      headline: a.headline,
      source:   a.source,
      url:      a.url,
      datetime: a.datetime,
    }));
    return NextResponse.json(
      { articles },
      { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200" } }
    );
  } catch {
    return NextResponse.json({ articles: [] });
  }
}
