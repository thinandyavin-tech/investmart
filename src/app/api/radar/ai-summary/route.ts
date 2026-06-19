import { NextRequest, NextResponse } from "next/server";

import { generateText } from "@/lib/aiService";
import type { StockMetrics } from "@/lib/momentum";
import { applyRateLimit } from "@/lib/rateLimit";
import { siteCacheGet, siteCacheSet, isSiteCacheStale } from "@/lib/siteCache";

export const dynamic = "force-dynamic";

const SYSTEM_PROMPT_TH = `คุณคือนักวิเคราะห์ตลาดหุ้นผู้เชี่ยวชาญ สรุปผลการสแกนเรดาร์หุ้นวันนี้เป็นภาษาไทย

กฎสำคัญ:
- 2-3 ประโยคเท่านั้น กระชับ ข้อเท็จจริง
- บอกแนวโน้มตลาดวันนี้ (ร้อนแรง/เย็นชา/ผสม)
- กล่าวถึงหุ้น 2-3 ตัวที่น่าสนใจที่สุด พร้อม % เปลี่ยนแปลง
- ห้ามแนะนำซื้อขาย ห้ามทำนายราคา
- ระบุว่าเป็น snapshot ของวันนี้ ไม่ใช่การคาดการณ์`;

const SYSTEM_PROMPT_EN = `You are an expert stock market analyst. Summarize today's radar scan results in English.

Rules:
- 2-3 sentences only. Concise. Factual.
- Describe today's market trend (hot / cool / mixed).
- Mention 2-3 most notable stocks with their % change.
- Never recommend buying or selling. Never predict prices.
- Note this is today's snapshot, not a forecast.`;

interface SummaryRequest {
  stocks: Pick<StockMetrics, "ticker" | "companyName" | "change1D" | "volumeSurge" | "sector">[];
  total:  number;
  locale?: "en" | "th";
}

const L1_TTL_MS = 10 * 60 * 1000;   // 10 min in-process
const DB_TTL_MS = 60 * 60 * 1000;   // 1 hr SiteCache

const l1Cache = new Map<string, { text: string; cachedAt: number }>();

export async function POST(req: NextRequest): Promise<NextResponse> {
  const limited = await applyRateLimit(req, "ai");
  if (limited) return limited;

  const hasAi = !!(process.env.CEREBRAS_API_KEY || process.env.GROQ_API_KEY || process.env.NVIDIA_NIM_API_KEY || process.env.GEMINI_API_KEY || process.env.LOCAL_AI_BASE_URL);
  if (!hasAi) {
    return NextResponse.json({
      summary: "",
      martinBusy: true,
    });
  }

  let body: SummaryRequest;
  try {
    body = (await req.json()) as SummaryRequest;
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const { stocks, total } = body;
  const locale = body.locale === "en" ? "en" as const : "th" as const;

  if (!Array.isArray(stocks) || stocks.length === 0) {
    return NextResponse.json({ summary: "" });
  }

  const contentKey = stocks.slice(0, 5).map((s) => `${s.ticker}${s.change1D.toFixed(1)}`).join(",");
  const l1Key = `${contentKey}:${locale}`;
  const dbKey = `radar_summary:${contentKey}:${locale}`;

  // L1: in-process
  const l1 = l1Cache.get(l1Key);
  if (l1 && Date.now() - l1.cachedAt < L1_TTL_MS) {
    return NextResponse.json({ summary: l1.text });
  }

  // L2: SiteCache (survives cold starts)
  const db = await siteCacheGet<{ text: string }>(dbKey);
  if (db && !isSiteCacheStale(db.savedAt, DB_TTL_MS)) {
    l1Cache.set(l1Key, { text: db.data.text, cachedAt: Date.now() });
    return NextResponse.json({ summary: db.data.text });
  }

  const bullCount = stocks.filter((s) => s.change1D > 0).length;
  const stockList = stocks
    .slice(0, 10)
    .map((s) =>
      `${s.ticker} (${s.change1D >= 0 ? "+" : ""}${s.change1D.toFixed(2)}%, ${s.sector}, volume surge ${s.volumeSurge.toFixed(1)}x)`
    )
    .join(", ");

  const userMsg = locale === "en"
    ? `Scanned ${total} stocks · ${stocks.length} flagged by radar · ${bullCount}/${stocks.length} bullish · Standouts: ${stockList}`
    : `สแกนจาก ${total} หุ้น · ติดเรดาร์ ${stocks.length} ตัว · บวก ${bullCount}/${stocks.length} · หุ้นเด่น: ${stockList}`;

  const systemPrompt = locale === "en" ? SYSTEM_PROMPT_EN : SYSTEM_PROMPT_TH;

  try {
    const text = await generateText(userMsg, systemPrompt, { maxTokens: 200, temperature: 0.4 });
    l1Cache.set(l1Key, { text, cachedAt: Date.now() });
    siteCacheSet(dbKey, { text }).catch(() => {});
    return NextResponse.json({ summary: text });
  } catch {
    return NextResponse.json({
      summary: "",
      martinBusy: true,
    });
  }
}
