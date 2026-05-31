import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import type { StockMetrics } from "@/lib/momentum";

export const dynamic = "force-dynamic";

const GROQ_MODEL = "llama-3.3-70b-versatile";

const SYSTEM_PROMPT = `คุณคือนักวิเคราะห์ตลาดหุ้นผู้เชี่ยวชาญ สรุปผลการสแกนเรดาร์หุ้นวันนี้เป็นภาษาไทย

กฎสำคัญ:
- 2-3 ประโยคเท่านั้น กระชับ ข้อเท็จจริง
- บอกแนวโน้มตลาดวันนี้ (ร้อนแรง/เย็นชา/ผสม)
- กล่าวถึงหุ้น 2-3 ตัวที่น่าสนใจที่สุด พร้อม % เปลี่ยนแปลง
- ห้ามแนะนำซื้อขาย ห้ามทำนายราคา
- ระบุว่าเป็น snapshot ของวันนี้ ไม่ใช่การคาดการณ์`;

interface SummaryRequest {
  stocks: Pick<StockMetrics, "ticker" | "companyName" | "change1D" | "volumeSurge" | "sector">[];
  total:  number;
}

const summaryCache = new Map<string, { text: string; cachedAt: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

export async function POST(req: NextRequest): Promise<NextResponse> {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) return NextResponse.json({ error: "AI not configured" }, { status: 503 });

  let body: SummaryRequest;
  try {
    body = (await req.json()) as SummaryRequest;
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const { stocks, total } = body;
  if (!Array.isArray(stocks) || stocks.length === 0) {
    return NextResponse.json({ summary: "" });
  }

  const cacheKey = stocks.slice(0, 5).map((s) => `${s.ticker}${s.change1D.toFixed(1)}`).join(",");
  const hit = summaryCache.get(cacheKey);
  if (hit && Date.now() - hit.cachedAt < CACHE_TTL) {
    return NextResponse.json({ summary: hit.text });
  }

  const bullCount = stocks.filter((s) => s.change1D > 0).length;
  const stockList = stocks
    .slice(0, 10)
    .map((s) =>
      `${s.ticker} (${s.change1D >= 0 ? "+" : ""}${s.change1D.toFixed(2)}%, ${s.sector}, volume surge ${s.volumeSurge.toFixed(1)}x)`
    )
    .join(", ");

  const userMsg = `สแกนจาก ${total} หุ้น · ติดเรดาร์ ${stocks.length} ตัว · บวก ${bullCount}/${stocks.length} · หุ้นเด่น: ${stockList}`;

  try {
    const groq   = new Groq({ apiKey: groqKey });
    const result = await groq.chat.completions.create({
      model:       GROQ_MODEL,
      messages:    [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user",   content: userMsg },
      ],
      max_tokens:  200,
      temperature: 0.4,
    });

    const text = result.choices[0]?.message?.content?.trim() ?? "";
    summaryCache.set(cacheKey, { text, cachedAt: Date.now() });
    return NextResponse.json({ summary: text });
  } catch {
    return NextResponse.json({ error: "generation failed" }, { status: 503 });
  }
}
