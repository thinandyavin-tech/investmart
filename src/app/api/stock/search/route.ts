import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit } from "@/lib/rateLimit";

interface FinnhubResult {
  description:   string;
  displaySymbol: string;
  symbol:        string;
  type:          string;
}

interface FinnhubSearchResponse {
  count:  number;
  result: FinnhubResult[];
}

// Types that represent real tradable securities
const ALLOWED_TYPES = new Set([
  "Common Stock",
  "ETP",   // ETFs (SPY, QQQ, VTI, etc.)
  "ADR",   // foreign companies listed on US exchanges (BABA, TSM, ASML, etc.)
  "DR",    // depositary receipts
]);

// US-exchange tickers are pure letters, 1-5 chars. No dots (London .L, Tokyo .T, etc.)
const US_TICKER_RE = /^[A-Z]{1,5}$/;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const limited = await applyRateLimit(request, "default");
  if (limited) return limited;
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 1) {
    return NextResponse.json({ results: [] });
  }

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return NextResponse.json({ results: [] });

  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/search?q=${encodeURIComponent(q)}&token=${apiKey}`,
      { signal: AbortSignal.timeout(4000) }
    );
    if (!res.ok) return NextResponse.json({ results: [] });

    const data = (await res.json()) as FinnhubSearchResponse;

    const seen    = new Set<string>();
    const results = (data.result ?? [])
      .filter((r) => {
        if (!ALLOWED_TYPES.has(r.type))          return false;
        if (!US_TICKER_RE.test(r.displaySymbol)) return false;
        if (!r.description?.trim())              return false;
        if (seen.has(r.displaySymbol))           return false;
        seen.add(r.displaySymbol);
        return true;
      })
      // Common Stock first, then ETFs, then the rest
      .sort((a, b) => {
        const rank = (t: string) =>
          t === "Common Stock" ? 0 : t === "ETP" ? 1 : 2;
        return rank(a.type) - rank(b.type);
      })
      .slice(0, 10)
      .map((r) => ({
        ticker: r.displaySymbol,
        name:   r.description,
        type:   r.type,
      }));

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
