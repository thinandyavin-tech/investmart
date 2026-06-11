import { NextResponse } from "next/server";
import { newsTeaser }   from "@/lib/newsUtils";

export const revalidate = 120;

interface FinnhubArticle {
  id:       number;
  headline: string;
  source:   string;
  url:      string;
  datetime: number;
  summary:  string;
}

export async function GET(): Promise<NextResponse> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API not configured" }, { status: 500 });
  }

  try {
    const [generalRes, forexRes, mergerRes] = await Promise.all([
      fetch(`https://finnhub.io/api/v1/news?category=general&minId=0&token=${apiKey}`, { signal: AbortSignal.timeout(6000) }),
      fetch(`https://finnhub.io/api/v1/news?category=forex&minId=0&token=${apiKey}`,   { signal: AbortSignal.timeout(6000) }),
      fetch(`https://finnhub.io/api/v1/news?category=merger&minId=0&token=${apiKey}`,  { signal: AbortSignal.timeout(6000) }),
    ]);

    const parse = async (res: Response): Promise<FinnhubArticle[]> => {
      if (!res.ok) return [];
      const raw = (await res.json()) as unknown;
      return Array.isArray(raw) ? (raw as FinnhubArticle[]) : [];
    };

    const [general, forex, merger] = await Promise.all([parse(generalRes), parse(forexRes), parse(mergerRes)]);

    const seen = new Set<number>();
    const merged = [...general, ...forex, ...merger]
      .filter(a => {
        if (!a.id || !a.headline || !a.url) return false;
        if (seen.has(a.id)) return false;
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
