import { NextRequest, NextResponse } from "next/server";
import { generateText } from "@/lib/aiService";

const TICKER_RE = /^[A-Z][A-Z.\-]{0,9}$/;

interface CacheEntry { reason: string; ts: number }
const cache = new Map<string, CacheEntry>();
const TTL   = 60 * 60 * 1000; // 1 hour

interface FinnhubNewsItem { headline: string; summary: string }
interface FinnhubQuote    { c: number; dp: number; d: number }

export async function GET(req: NextRequest): Promise<NextResponse> {
  const symbol = req.nextUrl.searchParams.get("symbol")?.toUpperCase().trim();
  if (!symbol || !TICKER_RE.test(symbol)) {
    return NextResponse.json({ error: "invalid symbol" }, { status: 400 });
  }

  const cached = cache.get(symbol);
  if (cached && Date.now() - cached.ts < TTL) {
    return NextResponse.json({ reason: cached.reason, symbol });
  }

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API not configured" }, { status: 500 });
  }

  const now   = Math.floor(Date.now() / 1000);
  const week  = now - 7 * 24 * 3600;

  const [newsRes, quoteRes] = await Promise.allSettled([
    fetch(
      `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(symbol)}&from=${new Date(week * 1000).toISOString().slice(0, 10)}&to=${new Date(now * 1000).toISOString().slice(0, 10)}&token=${apiKey}`,
      { signal: AbortSignal.timeout(4000) }
    ),
    fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`,
      { signal: AbortSignal.timeout(4000) }
    ),
  ]);

  const news: FinnhubNewsItem[] =
    newsRes.status === "fulfilled" && newsRes.value.ok
      ? ((await newsRes.value.json()) as FinnhubNewsItem[]).slice(0, 5)
      : [];

  const quote: FinnhubQuote | null =
    quoteRes.status === "fulfilled" && quoteRes.value.ok
      ? ((await quoteRes.value.json()) as FinnhubQuote)
      : null;

  const priceContext = quote
    ? `ราคาปัจจุบัน $${quote.c.toFixed(2)} เปลี่ยนแปลง ${quote.dp >= 0 ? "+" : ""}${quote.dp.toFixed(2)}% ($${quote.d >= 0 ? "+" : ""}${quote.d.toFixed(2)})`
    : "";

  const headlineList = news.length
    ? news.map((n) => `- ${n.headline}`).join("\n")
    : "ไม่มีข่าวล่าสุด";

  const prompt = `หุ้น ${symbol}: ${priceContext}

ข่าวล่าสุด:
${headlineList}

อธิบายเป็นภาษาไทยใน 2-3 ประโยคสั้นๆ ว่าทำไมหุ้นนี้ถึงเคลื่อนไหวแบบนี้วันนี้ ให้กระชับและตรงประเด็น`;

  const systemPrompt =
    "คุณเป็นนักวิเคราะห์หุ้นที่อธิบายความเคลื่อนไหวของราคาหุ้นเป็นภาษาไทยอย่างกระชับ ใช้ข้อมูลจากข่าวและราคา ไม่ต้องขึ้นต้นด้วย 'หุ้น X' ตอบตรงๆ";

  try {
    const reason = await generateText(prompt, systemPrompt, {
      maxTokens:   200,
      temperature: 0.4,
    });

    const clean = reason.trim();
    cache.set(symbol, { reason: clean, ts: Date.now() });
    return NextResponse.json({ reason: clean, symbol });
  } catch {
    return NextResponse.json({ error: "AI unavailable" }, { status: 503 });
  }
}
