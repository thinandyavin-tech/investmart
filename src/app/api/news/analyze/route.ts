import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const GROQ_MODEL    = "llama-3.3-70b-versatile";
const CACHE_TTL_MS  = 60 * 60 * 1000; // 1 hour
const MAX_HEADLINE  = 300;
const MAX_SNIPPET   = 500;
const MAX_SOURCE    = 80;
const MAX_OTHER     = 10;   // max corroboration headlines to send
const MAX_OTHER_LEN = 120;  // chars per headline

interface CacheEntry {
  result:   AnalysisResult;
  cachedAt: number;
}

export interface CredibilityRating {
  rating:  "สูง" | "ปานกลาง" | "ต่ำ";
  reason:  string;
  caveats: string[];
}

export interface AnalysisResult {
  credibility: CredibilityRating;
  summary:     string;
}

// Module-level cache survives across requests within the same server instance
const cache = new Map<string, CacheEntry>();

function cacheKey(headline: string, source: string): string {
  return createHash("sha256").update(`${headline}\0${source}`).digest("hex");
}

function isStale(entry: CacheEntry): boolean {
  return Date.now() - entry.cachedAt > CACHE_TTL_MS;
}

const SYSTEM_PROMPT = `คุณคือนักวิเคราะห์ข่าวการเงินสำหรับ InvestMart แอปหุ้นไทย

งานของคุณมี 2 ส่วน:

[1] ประเมินความน่าเชื่อถือ (ไม่ใช่ตรวจสอบข้อเท็จจริง):
คุณ ไม่สามารถ ยืนยันว่าข่าวจริงหรือเท็จได้ ห้ามอ้างว่าทำได้
ประเมินเฉพาะสิ่งที่ AI สามารถตัดสินได้:
- ชื่อเสียงแหล่งข่าว: สำนักข่าวใหญ่/น่าเชื่อถือ (Reuters, Bloomberg, AP, WSJ, CNBC, Financial Times) หรือไม่รู้จัก/โปรโมท/กด release
- ประเภทเนื้อหา: ข่าวข้อเท็จจริง vs ความเห็น/วิเคราะห์ vs การคาดเดา/ข่าวลือ vs โปรโมชั่น
- สัญญาณเกินจริง: ภาษาเว่อร์, clickbait, คำอ้างที่ไม่มีหลักฐาน, อารมณ์เกินจริง
- การยืนยันซ้ำ: ข่าวอื่นในรายการที่ให้มาพูดถึงเรื่องเดียวกันหรือไม่

ให้คะแนน: สูง / ปานกลาง / ต่ำ พร้อมเหตุผล 1 ประโยค และข้อสังเกต 1-2 ข้อ
ห้ามตัดสินว่า "จริง" หรือ "เท็จ" เด็ดขาด

[2] สรุปข่าว:
2-4 ประโยคภาษาไทยที่กระชับ: เกิดอะไร → ใครได้รับผลกระทบ → ทำไมสำคัญต่อหุ้น
เป็นกลาง ไม่แนะนำซื้อขาย ไม่คาดการณ์ราคา
ใช้คำพูดของตัวเอง ห้ามคัดลอกประโยคจากต้นฉบับ
ถ้ามีแค่หัวข้อ ให้ระบุว่าสรุปจากข้อมูลจำกัด อย่าแต่งรายละเอียดเพิ่ม

กฎ: ตอบเป็น JSON เท่านั้น ในรูปแบบ:
{
  "credibility": {
    "rating": "สูง" หรือ "ปานกลาง" หรือ "ต่ำ",
    "reason": "เหตุผล 1 ประโยค",
    "caveats": ["ข้อสังเกต 1", "ข้อสังเกต 2"]
  },
  "summary": "สรุป 2-4 ประโยค"
}`;

function validateResult(raw: unknown): AnalysisResult | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;

  const cred = r["credibility"];
  if (typeof cred !== "object" || cred === null) return null;
  const c = cred as Record<string, unknown>;

  const rating = c["rating"];
  if (rating !== "สูง" && rating !== "ปานกลาง" && rating !== "ต่ำ") return null;

  const reason = c["reason"];
  if (typeof reason !== "string") return null;

  const rawCaveats = c["caveats"];
  const caveats = Array.isArray(rawCaveats)
    ? (rawCaveats as unknown[]).filter((x): x is string => typeof x === "string").slice(0, 2)
    : [];

  const summary = r["summary"];
  if (typeof summary !== "string") return null;

  return { credibility: { rating, reason, caveats }, summary };
}

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

  const raw = body as Record<string, unknown>;
  const headline       = typeof raw["headline"]       === "string" ? raw["headline"].trim().slice(0, MAX_HEADLINE)  : "";
  const snippet        = typeof raw["snippet"]        === "string" ? raw["snippet"].trim().slice(0, MAX_SNIPPET)    : "";
  const source         = typeof raw["source"]         === "string" ? raw["source"].trim().slice(0, MAX_SOURCE)      : "unknown";
  const ticker         = typeof raw["ticker"]         === "string" ? raw["ticker"].trim().slice(0, 15)              : "";
  const otherRaw       = Array.isArray(raw["otherHeadlines"]) ? (raw["otherHeadlines"] as unknown[]) : [];
  const otherHeadlines = otherRaw
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .slice(0, MAX_OTHER)
    .map(h => h.trim().slice(0, MAX_OTHER_LEN));

  if (!headline) {
    return NextResponse.json({ error: "headline required" }, { status: 400 });
  }

  const key    = cacheKey(headline, source);
  const cached = cache.get(key);
  if (cached && !isStale(cached)) {
    return NextResponse.json({ ...cached.result, cached: true });
  }

  const corroborationBlock = otherHeadlines.length > 0
    ? `\nหัวข่าวอื่นๆ ที่เกี่ยวข้อง (ใช้ตรวจสอบการยืนยัน):\n${otherHeadlines.map((h, i) => `${i + 1}. ${h}`).join("\n")}`
    : "\n(ไม่มีหัวข่าวอื่นให้เปรียบเทียบ)";

  const userMessage = [
    `แหล่งข่าว: ${source}`,
    ticker ? `หุ้น: $${ticker}` : "",
    `หัวข่าว: ${headline}`,
    snippet ? `ย่อหน้าเปิด: ${snippet}` : "(มีเฉพาะหัวข่าว ไม่มีเนื้อหา)",
    corroborationBlock,
  ].filter(Boolean).join("\n");

  try {
    const groq   = new Groq({ apiKey });
    const result = await groq.chat.completions.create({
      model:           GROQ_MODEL,
      messages:        [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user",   content: userMessage   },
      ],
      response_format: { type: "json_object" },
      max_tokens:      500,
      temperature:     0.3,
    });

    const text = result.choices[0]?.message?.content?.trim() ?? "";
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: "invalid AI response" }, { status: 502 });
    }

    const validated = validateResult(parsed);
    if (!validated) {
      return NextResponse.json({ error: "malformed AI response" }, { status: 502 });
    }

    cache.set(key, { result: validated, cachedAt: Date.now() });
    return NextResponse.json({ ...validated, cached: false });
  } catch {
    return NextResponse.json({ error: "AI unavailable" }, { status: 503 });
  }
}
