import { NextRequest, NextResponse } from "next/server";

import { applyRateLimit } from "@/lib/rateLimit";
import { getYahooQuote, prefersYahoo } from "@/lib/yahooFinance";

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
  const limited = await applyRateLimit(request, "quote");
  if (limited) return limited;

  const symbol = request.nextUrl.searchParams.get("symbol")?.toUpperCase().trim();
  if (!symbol || !/^[A-Z][A-Z.\-]{0,9}$/.test(symbol)) {
    return NextResponse.json({ error: "invalid symbol" }, { status: 400 });
  }

  const apiKey = process.env.FINNHUB_API_KEY;

  // ── Route non-US tickers directly to Yahoo Finance ────────────────────────
  if (prefersYahoo(symbol)) {
    const yq = await getYahooQuote(symbol);
    if (yq) {
      // Shape matches the Finnhub quote shape so all consumers work unchanged,
      // plus extra fields for the "delayed" label.
      return NextResponse.json({
        c:   yq.price,
        d:   yq.change,
        dp:  yq.changePct,
        h:   yq.high,
        l:   yq.low,
        o:   yq.open,
        pc:  yq.prevClose,
        t:   Math.floor(new Date(yq.fetchedAt).getTime() / 1000),
        preMarket: null,
        // Extra honesty fields — UI must show these
        source:    "yahoo",
        delayed:   true,
        currency:  yq.currency,
        exchange:  yq.exchange,
        marketState: yq.marketState,
      });
    }
    // Yahoo failed or returned no data
    return NextResponse.json({
      c: 0, d: 0, dp: 0, h: 0, l: 0, o: 0, pc: 0, t: 0,
      preMarket: null,
      source: "unavailable",
      delayed: true,
      note: "ข้อมูลราคาไม่พร้อมใช้งานสำหรับหุ้นนี้ในขณะนี้",
    });
  }

  // ── US tickers: Finnhub primary, Yahoo fallback if c=0 ────────────────────
  if (!apiKey) {
    return NextResponse.json({ error: "API not configured" }, { status: 500 });
  }

  const { from, to } = getPreMarketWindow();

  const [quoteRes, candleRes] = await Promise.allSettled([
    fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`,
      { next: { revalidate: 60 } },
    ),
    fetch(
      `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=5&from=${from}&to=${to}&token=${apiKey}`,
      { next: { revalidate: 60 } },
    ),
  ]);

  if (quoteRes.status === "rejected" || !quoteRes.value.ok) {
    return NextResponse.json({ error: "upstream error" }, { status: 502 });
  }

  const quote = (await quoteRes.value.json()) as FinnhubQuote;

  // If Finnhub has no data (c=0), try Yahoo as fallback for OTC/ADR names
  if (quote.c === 0) {
    const yq = await getYahooQuote(symbol);
    if (yq) {
      return NextResponse.json({
        c:   yq.price,
        d:   yq.change,
        dp:  yq.changePct,
        h:   yq.high,
        l:   yq.low,
        o:   yq.open,
        pc:  yq.prevClose,
        t:   Math.floor(new Date(yq.fetchedAt).getTime() / 1000),
        preMarket: null,
        source:   "yahoo",
        delayed:  true,
        currency: yq.currency,
        exchange: yq.exchange,
        marketState: yq.marketState,
      });
    }
  }

  let preMarket: PreMarket | null = null;
  if (candleRes.status === "fulfilled" && candleRes.value.ok) {
    const candle = (await candleRes.value.json()) as FinnhubCandle;
    if (candle.s === "ok" && candle.c.length > 0) {
      const prePrice      = candle.c[candle.c.length - 1]!;
      const change        = prePrice - quote.pc;
      const changePercent = quote.pc !== 0 ? (change / quote.pc) * 100 : 0;
      preMarket = { price: prePrice, change, changePercent };
    }
  }

  return NextResponse.json({ ...quote, preMarket, source: "finnhub", delayed: false });
}
