import { NextResponse } from "next/server";

export const revalidate = 60; // cache for 60s at the edge

const MACRO_SYMBOLS = [
  { symbol: "SPY",  labelEn: "S&P 500",      labelTh: "S&P 500"       },
  { symbol: "QQQ",  labelEn: "Nasdaq 100",   labelTh: "Nasdaq 100"    },
  { symbol: "TLT",  labelEn: "20Y Treasury", labelTh: "พันธบัตร 20Y"  },
  { symbol: "GLD",  labelEn: "Gold",         labelTh: "ทองคำ"         },
  { symbol: "UUP",  labelEn: "USD Index",    labelTh: "ดัชนี USD"     },
  { symbol: "VXX",  labelEn: "Volatility",   labelTh: "ความผันผวน"    },
];

interface FinnhubQuote { c: number; d: number; dp: number; }

async function fetchQuote(symbol: string, apiKey: string): Promise<{ c: number; dp: number } | null> {
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`,
      { signal: AbortSignal.timeout(4000) },
    );
    if (!res.ok) return null;
    const data = await res.json() as FinnhubQuote;
    return data.c > 0 ? { c: data.c, dp: data.dp } : null;
  } catch { return null; }
}

export async function GET(): Promise<NextResponse> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return NextResponse.json({ items: [] });

  const results = await Promise.all(
    MACRO_SYMBOLS.map(s => fetchQuote(s.symbol, apiKey)),
  );

  const items = MACRO_SYMBOLS.map((s, i) => ({
    symbol:  s.symbol,
    labelEn: s.labelEn,
    labelTh: s.labelTh,
    price:   results[i]?.c ?? null,
    dp:      results[i]?.dp ?? null,
  }));

  return NextResponse.json({ items });
}
