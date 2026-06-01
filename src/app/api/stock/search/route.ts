import { NextRequest, NextResponse } from "next/server";

interface FinnhubResult {
  description: string;
  displaySymbol: string;
  symbol: string;
  type: string;
}

interface FinnhubSearchResponse {
  count: number;
  result: FinnhubResult[];
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 1) {
    return NextResponse.json({ results: [] });
  }

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return NextResponse.json({ results: [] });

  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/search?q=${encodeURIComponent(q)}&token=${apiKey}`,
      { signal: AbortSignal.timeout(3000), next: { revalidate: 300 } }
    );
    if (!res.ok) return NextResponse.json({ results: [] });

    const data = (await res.json()) as FinnhubSearchResponse;

    // Filter to common US exchange stocks only, deduplicate
    const seen = new Set<string>();
    const results = (data.result ?? [])
      .filter((r) => {
        if (r.type !== "Common Stock") return false;
        // Keep simple tickers (no dots for preferred shares, etc.)
        if (!/^[A-Z]{1,5}$/.test(r.displaySymbol)) return false;
        if (seen.has(r.displaySymbol)) return false;
        seen.add(r.displaySymbol);
        return true;
      })
      .slice(0, 8)
      .map((r) => ({ ticker: r.displaySymbol, name: r.description }));

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
