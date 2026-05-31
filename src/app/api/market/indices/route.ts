import { NextResponse } from "next/server";

export const revalidate = 60;

interface QuoteData {
  c: number;
  pc: number;
}

interface IndexConfig {
  symbol: string;
  name:   string;
}

const INDEX_LIST: readonly IndexConfig[] = [
  { symbol: "SPY", name: "S&P 500"    },
  { symbol: "QQQ", name: "Nasdaq 100" },
  { symbol: "DIA", name: "Dow Jones"  },
];

interface YahooChartResult {
  timestamp?: number[];
  indicators?: { quote?: Array<{ close?: (number | null)[] }> };
}
interface YahooResponse {
  chart?: { result?: YahooChartResult[] };
}

async function fetchQuote(symbol: string, apiKey: string): Promise<QuoteData | null> {
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`,
      { signal: AbortSignal.timeout(4000) }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as QuoteData;
    return data.c > 0 ? data : null;
  } catch {
    return null;
  }
}

async function fetchSparkline(symbol: string): Promise<number[]> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1mo`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next:    { revalidate: 3600 },
      signal:  AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const data   = (await res.json()) as YahooResponse;
    const result = data.chart?.result?.[0];
    if (!result?.timestamp) return [];
    const closes = result.indicators?.quote?.[0]?.close ?? [];
    return closes.filter((c): c is number => c !== null && c > 0);
  } catch {
    return [];
  }
}

export async function GET(): Promise<NextResponse> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API not configured" }, { status: 500 });
  }

  const results = await Promise.all(
    INDEX_LIST.map(async ({ symbol, name }) => {
      const [quote, sparkline] = await Promise.all([
        fetchQuote(symbol, apiKey),
        fetchSparkline(symbol),
      ]);
      if (!quote) return null;
      const change = quote.pc > 0 ? ((quote.c - quote.pc) / quote.pc) * 100 : 0;
      return { symbol, name, price: quote.c, change, sparkline };
    })
  );

  const indices = results.filter((r): r is NonNullable<typeof r> => r !== null);

  return NextResponse.json(
    { indices },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } }
  );
}
