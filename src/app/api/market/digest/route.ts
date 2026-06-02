import { NextResponse } from "next/server";
import { generateText } from "@/lib/aiService";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface DigestCache { digest: string; generatedAt: string }
let cached: DigestCache | null = null;

function isStale(): boolean {
  if (!cached) return true;
  return Date.now() - new Date(cached.generatedAt).getTime() > CACHE_TTL_MS;
}

const TOP_TICKERS = ["SPY", "QQQ", "AAPL", "NVDA", "TSLA", "MSFT", "META", "AMZN"];

interface FinnhubQuote { c: number; pc: number; dp: number }

async function fetchQuote(ticker: string, apiKey: string): Promise<{ ticker: string; change: number } | null> {
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${apiKey}`,
      { signal: AbortSignal.timeout(3000) }
    );
    if (!res.ok) return null;
    const q = (await res.json()) as FinnhubQuote;
    if (!q.c || !q.pc) return null;
    return { ticker, change: q.dp ?? ((q.c - q.pc) / q.pc) * 100 };
  } catch {
    return null;
  }
}

interface FinnhubNewsItem { headline: string }

async function fetchHeadlines(apiKey: string): Promise<string[]> {
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/news?category=general&token=${apiKey}`,
      { signal: AbortSignal.timeout(4000) }
    );
    if (!res.ok) return [];
    const items = (await res.json()) as FinnhubNewsItem[];
    return items.slice(0, 5).map((n) => n.headline);
  } catch {
    return [];
  }
}

export async function GET(): Promise<NextResponse> {
  if (!isStale() && cached) {
    return NextResponse.json(cached);
  }

  const finnhubKey = process.env.FINNHUB_API_KEY;
  const hasAi      = !!(process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY);

  if (!finnhubKey || !hasAi) {
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }

  const [quotes, headlines] = await Promise.all([
    Promise.all(TOP_TICKERS.map((t) => fetchQuote(t, finnhubKey))),
    fetchHeadlines(finnhubKey),
  ]);

  const validQuotes = quotes.filter((q): q is { ticker: string; change: number } => q !== null);
  const marketSummary = validQuotes
    .map((q) => `${q.ticker} ${q.change >= 0 ? "+" : ""}${q.change.toFixed(2)}%`)
    .join(", ");

  const newsBlock = headlines.length > 0
    ? headlines.map((h) => `- ${h}`).join("\n")
    : "ไม่มีข่าว";

  const prompt = `วันนี้ตลาดหุ้นอเมริกาเป็นอย่างไร? สรุปให้สั้น ฉลาด และอ่านง่ายสำหรับนักลงทุนไทย ใน 2-3 ประโยค

ข้อมูลราคาวันนี้: ${marketSummary || "ไม่มีข้อมูล"}

ข่าวเด่นวันนี้:
${newsBlock}

ตอบเป็นภาษาไทย สรุปสั้นๆ ไม่เกิน 3 ประโยค ไม่ต้องใส่ disclaimer ห้ามสร้างข้อมูลที่ไม่ได้ให้มา`;

  const systemPrompt = `คุณคือนักวิเคราะห์ตลาดหุ้นอาวุโสที่เขียนสรุปตลาดรายวันสำหรับนักลงทุนไทย สไตล์กระชับ ฉลาด เข้าใจง่าย`;

  try {
    const digest = await generateText(prompt, systemPrompt, {
      maxTokens:   200,
      temperature: 0.4,
    });

    const result: DigestCache = {
      digest:      digest.trim(),
      generatedAt: new Date().toISOString(),
    };
    cached = result;
    return NextResponse.json(result);
  } catch (err) {
    console.error("[market/digest] failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "generation failed" }, { status: 503 });
  }
}
