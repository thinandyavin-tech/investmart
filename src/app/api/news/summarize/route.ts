import { createHash } from "crypto";

import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const GROQ_MODEL   = "llama-3.3-70b-versatile";
const MAX_HEADLINE = 300;
const MAX_SNIPPET  = 500;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface CacheEntry {
  summary:  string;
  cachedAt: number;
}

// Module-level in-memory cache keyed by SHA-256 of headline+snippet
const summaryCache = new Map<string, CacheEntry>();

function cacheKey(headline: string, snippet: string): string {
  return createHash("sha256").update(`${headline}\0${snippet}`).digest("hex");
}

function isCacheStale(entry: CacheEntry): boolean {
  return Date.now() - entry.cachedAt > CACHE_TTL_MS;
}

const SYSTEM_PROMPT = `คุณคือผู้สรุปข่าวการเงินสำหรับ InvestMart ผู้เรียนรู้การลงทุน
กฎเหล็ก:
1. สรุปจากข้อมูลที่ได้รับเท่านั้น ห้ามเพิ่มข้อเท็จจริงที่ไม่อยู่ในต้นฉบับ
2. 2-4 ประโยคภาษาไทย: เกิดอะไรขึ้น → ใครได้รับผลกระทบ → ทำไมสำคัญต่อหุ้น
3. เป็นกลาง ไม่แนะนำซื้อหรือขาย ไม่ใช้ภาษาโอ้อวด
4. ใช้คำพูดของตัวเอง ห้ามคัดลอกประโยคจากต้นฉบับทุกกรณี
5. ถ้ามีแค่หัวข้อข่าว ให้ระบุ "(สรุปจากหัวข้อเท่านั้น)"
6. ลงท้ายด้วย: "สรุปโดย AI · อ่านต้นฉบับเพื่อความครบถ้วน"`;

export async function POST(request: NextRequest): Promise<NextResponse> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI not configured" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const { headline, snippet, source, ticker } = body as {
    headline?: unknown;
    snippet?:  unknown;
    source?:   unknown;
    ticker?:   unknown;
  };

  if (typeof headline !== "string" || headline.trim().length === 0) {
    return NextResponse.json({ error: "headline required" }, { status: 400 });
  }

  const safeHeadline = headline.trim().slice(0, MAX_HEADLINE);
  const safeSnippet  = typeof snippet === "string" ? snippet.trim().slice(0, MAX_SNIPPET) : "";
  const safeSource   = typeof source  === "string" ? source.trim().slice(0, 80) : "unknown";
  const safeTicker   = typeof ticker  === "string" ? ticker.trim().slice(0, 15) : "";

  const key = cacheKey(safeHeadline, safeSnippet);
  const cached = summaryCache.get(key);
  if (cached && !isCacheStale(cached)) {
    return NextResponse.json({ summary: cached.summary, source: safeSource });
  }

  const tickerNote = safeTicker ? `เกี่ยวกับหุ้น $${safeTicker}` : "";
  const context    = safeSnippet ? `\nTeaser: ${safeSnippet}` : "";

  const userMessage = `แหล่งข่าว: ${safeSource}${tickerNote ? " | " + tickerNote : ""}
หัวข่าว: ${safeHeadline}${context}`;

  try {
    const groq   = new Groq({ apiKey });
    const result = await groq.chat.completions.create({
      model:       GROQ_MODEL,
      messages:    [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user",   content: userMessage   },
      ],
      max_tokens:  250,
      temperature: 0.2,
    });

    const summary = result.choices[0]?.message?.content?.trim() ?? "";
    if (!summary) {
      return NextResponse.json({ error: "empty response" }, { status: 502 });
    }

    summaryCache.set(key, { summary, cachedAt: Date.now() });
    return NextResponse.json({ summary, source: safeSource });
  } catch {
    return NextResponse.json({ error: "AI unavailable" }, { status: 503 });
  }
}
