import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const GROQ_MODEL   = "llama-3.3-70b-versatile";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const NEWS_LOOKBACK_DAYS = 3;

interface CacheEntry {
  reason:    string;
  cachedAt:  number;
}

// Keyed by `${ticker}:${score}` so different momentum snapshots get fresh analysis
const reasonCache = new Map<string, CacheEntry>();

function isCacheStale(entry: CacheEntry): boolean {
  return Date.now() - entry.cachedAt > CACHE_TTL_MS;
}

let groqClient: Groq | null = null;

function getGroq(): Groq {
  if (!groqClient) {
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groqClient;
}

interface FinnhubNewsItem {
  headline: string;
  datetime: number;
}

async function fetchRecentHeadlines(ticker: string, apiKey: string): Promise<string[]> {
  const to   = new Date();
  const from = new Date(Date.now() - NEWS_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  const fmt  = (d: Date): string => d.toISOString().split("T")[0]!;

  const url = `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(ticker)}&from=${fmt(from)}&to=${fmt(to)}&token=${apiKey}`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return [];
    const items = (await res.json()) as FinnhubNewsItem[];
    return items.slice(0, 3).map((n) => n.headline);
  } catch {
    return [];
  }
}

const SYSTEM_PROMPT = `คุณคือนักวิเคราะห์ momentum สำหรับ InvestMart
อธิบายว่าทำไมหุ้นจึงติดเรดาร์ momentum โดยใช้ข้อมูลที่ได้รับเท่านั้น
ห้ามทำนายอนาคตแน่นอน ใช้ภาษาความน่าจะเป็น
ตอบภาษาไทย 3-5 ประโยค ไม่มีหัวข้อ ไม่มี bullet points`;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const params = request.nextUrl.searchParams;
  const ticker = params.get("ticker")?.toUpperCase().trim();
  const change = params.get("change");
  const score  = params.get("score");

  if (!ticker) {
    return NextResponse.json({ error: "ticker required" }, { status: 400 });
  }

  const groqKey    = process.env.GROQ_API_KEY;
  const finnhubKey = process.env.FINNHUB_API_KEY;

  if (!groqKey) {
    return NextResponse.json({ error: "AI not configured" }, { status: 500 });
  }

  const cacheKey = `${ticker}:${score ?? ""}`;
  const cached   = reasonCache.get(cacheKey);
  if (cached && !isCacheStale(cached)) {
    return NextResponse.json({ reason: cached.reason });
  }

  // Fetch recent headlines if Finnhub key is available
  const headlines = finnhubKey
    ? await fetchRecentHeadlines(ticker, finnhubKey)
    : [];

  const newsBlock = headlines.length > 0
    ? `\n\nข่าวล่าสุด 3 วัน:\n${headlines.map((h) => `- ${h}`).join("\n")}`
    : "";

  const userMessage = `หุ้น: ${ticker}
เปลี่ยนแปลง 1 วัน: ${change ?? "N/A"}%
Momentum Score: ${score ?? "N/A"}/100${newsBlock}`;

  try {
    const completion = await getGroq().chat.completions.create({
      model:       GROQ_MODEL,
      messages:    [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user",   content: userMessage   },
      ],
      max_tokens:  300,
      temperature: 0.35,
    });

    const reason = completion.choices[0]?.message?.content?.trim() ?? "";
    reasonCache.set(cacheKey, { reason, cachedAt: Date.now() });
    return NextResponse.json({ reason });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json(
      { error: "AI generation failed", detail: message },
      { status: 500 }
    );
  }
}
