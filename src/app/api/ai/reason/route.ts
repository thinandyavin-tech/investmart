import { NextRequest, NextResponse } from "next/server";

import { generateText } from "@/lib/aiService";
import { applyRateLimit } from "@/lib/rateLimit";
import { siteCacheGet, siteCacheSet, isSiteCacheStale } from "@/lib/siteCache";

const L1_TTL_MS          = 5 * 60 * 1000;   // 5 min in-process
const DB_TTL_MS          = 60 * 60 * 1000;   // 1 hr SiteCache
const NEWS_LOOKBACK_DAYS = 3;

interface CacheEntry {
  reason:   string;
  cachedAt: number;
}

const l1Cache = new Map<string, CacheEntry>();

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

const SYSTEM_PROMPT_TH = `คุณคือนักวิเคราะห์ momentum สำหรับ InvestMart
อธิบายว่าทำไมหุ้นจึงติดเรดาร์ momentum โดยใช้ข้อมูลที่ได้รับเท่านั้น
ห้ามทำนายอนาคตแน่นอน ใช้ภาษาความน่าจะเป็น
ตอบภาษาไทย 3-5 ประโยค ไม่มีหัวข้อ ไม่มี bullet points`;

const SYSTEM_PROMPT_EN = `You are a momentum analyst for InvestMart.
Explain why this stock appeared on the momentum radar using only the data provided.
Never predict the future with certainty — use probabilistic language.
Reply in English, 3-5 sentences, no headers, no bullet points.`;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const limited = await applyRateLimit(request, "ai");
  if (limited) return limited;

  const params = request.nextUrl.searchParams;
  const ticker = params.get("ticker")?.toUpperCase().trim();
  const change = params.get("change");
  const score  = params.get("score");
  const locale = (params.get("locale") ?? "th") === "en" ? "en" as const : "th" as const;

  if (!ticker) {
    return NextResponse.json({ error: "ticker required" }, { status: 400 });
  }

  const finnhubKey = process.env.FINNHUB_API_KEY;

  const l1Key = `${ticker}:${score ?? ""}:${locale}`;
  const dbKey = `reason:${ticker}:${score ?? ""}:${locale}`;

  // L1
  const l1 = l1Cache.get(l1Key);
  if (l1 && Date.now() - l1.cachedAt < L1_TTL_MS) {
    return NextResponse.json({ reason: l1.reason });
  }

  // L2: SiteCache
  const db = await siteCacheGet<{ reason: string }>(dbKey);
  if (db && !isSiteCacheStale(db.savedAt, DB_TTL_MS)) {
    l1Cache.set(l1Key, { reason: db.data.reason, cachedAt: Date.now() });
    return NextResponse.json({ reason: db.data.reason });
  }

  const headlines = finnhubKey
    ? await fetchRecentHeadlines(ticker, finnhubKey)
    : [];

  const newsBlock = headlines.length > 0
    ? `\n\nข่าวล่าสุด 3 วัน:\n${headlines.map((h) => `- ${h}`).join("\n")}`
    : "";

  const userMessage = `หุ้น: ${ticker}
เปลี่ยนแปลง 1 วัน: ${change ?? "N/A"}%
Momentum Score: ${score ?? "N/A"}/100${newsBlock}`;

  const systemPrompt = locale === "en" ? SYSTEM_PROMPT_EN : SYSTEM_PROMPT_TH;

  try {
    const reason = await generateText(userMessage, systemPrompt, {
      maxTokens:   300,
      temperature: 0.35,
    });

    l1Cache.set(l1Key, { reason, cachedAt: Date.now() });
    siteCacheSet(dbKey, { reason }).catch(() => {});
    return NextResponse.json({ reason });
  } catch {
    const busy = locale === "en"
      ? "Martin is currently busy. Please try again shortly."
      : "Martin กำลังยุ่ง กรุณาลองใหม่อีกครั้ง";
    return NextResponse.json({ reason: busy, martinBusy: true });
  }
}
