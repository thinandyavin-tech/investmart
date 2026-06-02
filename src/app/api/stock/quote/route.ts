import { NextRequest, NextResponse } from "next/server";

interface FinnhubQuote {
  c:  number;
  d:  number;
  dp: number;
  h:  number;
  l:  number;
  o:  number;
  pc: number;
  t:  number;
}

interface FinnhubCandle {
  s: string;
  c: number[];
  t: number[];
}

interface PreMarket {
  price:         number;
  change:        number;
  changePercent: number;
}

function getPreMarketWindow(): { from: number; to: number } {
  const now = new Date();
  // Convert current time to ET offset (UTC-4 EDT / UTC-5 EST)
  const etOffset = isDST(now) ? -4 : -5;
  const etNow = new Date(now.getTime() + etOffset * 3600 * 1000);

  const y = etNow.getUTCFullYear();
  const m = etNow.getUTCMonth();
  const d = etNow.getUTCDate();

  const from = Date.UTC(y, m, d, 4,  0, 0) / 1000 - etOffset * 3600;
  const to   = Date.UTC(y, m, d, 9, 30, 0) / 1000 - etOffset * 3600;
  return { from, to };
}

function isDST(date: Date): boolean {
  const jan = new Date(date.getFullYear(), 0, 1).getTimezoneOffset();
  const jul = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
  return date.getTimezoneOffset() < Math.max(jan, jul);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const symbol = request.nextUrl.searchParams.get("symbol")?.toUpperCase().trim();
  if (!symbol || !/^[A-Z][A-Z.\-]{0,9}$/.test(symbol)) {
    return NextResponse.json({ error: "invalid symbol" }, { status: 400 });
  }

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API not configured" }, { status: 500 });
  }

  const { from, to } = getPreMarketWindow();

  const [quoteRes, candleRes] = await Promise.allSettled([
    fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`,
      { next: { revalidate: 60 } }
    ),
    fetch(
      `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=5&from=${from}&to=${to}&token=${apiKey}`,
      { next: { revalidate: 60 } }
    ),
  ]);

  if (quoteRes.status === "rejected" || !quoteRes.value.ok) {
    return NextResponse.json({ error: "upstream error" }, { status: 502 });
  }

  const quote = (await quoteRes.value.json()) as FinnhubQuote;

  let preMarket: PreMarket | null = null;
  if (candleRes.status === "fulfilled" && candleRes.value.ok) {
    const candle = (await candleRes.value.json()) as FinnhubCandle;
    if (candle.s === "ok" && candle.c.length > 0) {
      const prePrice = candle.c[candle.c.length - 1];
      const change        = prePrice - quote.pc;
      const changePercent = quote.pc !== 0 ? (change / quote.pc) * 100 : 0;
      preMarket = { price: prePrice, change, changePercent };
    }
  }

  return NextResponse.json({ ...quote, preMarket });
}
