import { createHash } from "crypto";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { generateText } from "@/lib/aiService";
import { applyRateLimit } from "@/lib/rateLimit";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

const MAX_HEADLINE  = 300;
const MAX_SNIPPET   = 500;
const MAX_SOURCE    = 80;
const MAX_OTHER     = 10;
const MAX_OTHER_LEN = 120;

// Canonical disclaimer — always injected server-side, never left to the model
const DISCLAIMER =
  "AI ประเมินความน่าเชื่อถือของแหล่งข่าวและสรุปเนื้อหา ไม่ใช่การยืนยันว่าข่าวจริงหรือเท็จ และไม่ใช่คำแนะนำการลงทุน · อ่านต้นฉบับเพื่อตัดสินใจเอง";

const AnalysisSchema = z.object({
  summary_th:            z.string().min(1),
  reliability:           z.enum(["สูง", "ปานกลาง", "ต่ำ"]),
  reliability_reason_th: z.string().min(1),
  content_type:          z.enum(["รายงานข่าว", "บทวิเคราะห์", "ข่าวลือ", "ประชาสัมพันธ์"]),
  market_impact: z.object({
    direction: z.enum(["บวก", "ลบ", "เป็นกลาง"]),
    reason_th: z.string().min(1),
  }),
  confidence:    z.enum(["สูง", "ปานกลาง", "ต่ำ"]),
  disclaimer_th: z.string(),
});

export type AnalysisResult = z.infer<typeof AnalysisSchema>;

interface CacheEntry {
  result:   AnalysisResult;
  cachedAt: number;
}

const cache = new Map<string, CacheEntry>();

function cacheKey(headline: string, source: string): string {
  return createHash("sha256").update(`${headline}\0${source}`).digest("hex");
}

function isStale(entry: CacheEntry): boolean {
  return Date.now() - entry.cachedAt > CACHE_TTL_MS;
}

const SYSTEM_PROMPT = `You are a financial-news analyst for InvestMart, a Thai stock learning platform. You receive a news article's headline, snippet, source name, ticker, and other recent headlines about the same stock. Respond ONLY with valid JSON in the exact schema below, in Thai.

RULES:
- You CANNOT verify whether the news is factually true or false. NEVER output a จริง/ปลอม (true/false) verdict. Assess only how reliable and credible the SOURCE and article appear.
- reliability: judge source reputation (major wire/established outlet = สูง; unknown/blog/PR = ต่ำ), content type (factual reporting vs opinion vs rumor/speculation vs promotional), hype or sensationalism, and corroboration (echoed by other headlines = higher; lone source = lower). Rate สูง/ปานกลาง/ต่ำ with one concise Thai reason.
- summary_th: 2–4 short, neutral Thai sentences IN YOUR OWN WORDS. NEVER copy or reproduce sentences from the article. Cover: what happened, who/what is affected, why it matters for the stock. If you have only a headline with no snippet, say so and reduce confidence. Do not invent details.
- market_impact direction: บวก/ลบ/เป็นกลาง for the stock. Provide a one-line Thai reason framed as likely implication, never a price prediction or certainty.
- confidence: lower when info is thin (headline-only), source is unknown, or content is promotional or speculative.
- Be decisive but honest about uncertainty. Never fabricate. No investment advice.

Respond with exactly this JSON structure (no extra keys, no markdown):
{
  "summary_th": "สรุป 2–4 ประโยคภาษาไทย",
  "reliability": "สูง|ปานกลาง|ต่ำ",
  "reliability_reason_th": "เหตุผลสั้น 1 ประโยค",
  "content_type": "รายงานข่าว|บทวิเคราะห์|ข่าวลือ|ประชาสัมพันธ์",
  "market_impact": {
    "direction": "บวก|ลบ|เป็นกลาง",
    "reason_th": "เหตุผล 1 ประโยค"
  },
  "confidence": "สูง|ปานกลาง|ต่ำ",
  "disclaimer_th": "placeholder"
}`;

export async function POST(request: NextRequest): Promise<NextResponse> {
  const limited = await applyRateLimit(request, "news");
  if (limited) return limited;

  const hasAi = !!(process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY || process.env.LOCAL_AI_BASE_URL);
  if (!hasAi) {
    return NextResponse.json({ error: "AI not configured" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  const headline = typeof raw["headline"] === "string"
    ? raw["headline"].trim().slice(0, MAX_HEADLINE) : "";
  const snippet  = typeof raw["snippet"]  === "string"
    ? raw["snippet"].trim().slice(0, MAX_SNIPPET)   : "";
  const source   = typeof raw["source"]   === "string"
    ? raw["source"].trim().slice(0, MAX_SOURCE)     : "unknown";
  const ticker   = typeof raw["ticker"]   === "string"
    ? raw["ticker"].trim().slice(0, 15)             : "";
  const otherRaw = Array.isArray(raw["otherHeadlines"])
    ? (raw["otherHeadlines"] as unknown[]) : [];
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
    ? `\nOther recent headlines for the same stock (use for corroboration):\n${otherHeadlines.map((h, i) => `${i + 1}. ${h}`).join("\n")}`
    : "\n(No other headlines available for corroboration — single source)";

  const userMessage = [
    `Source: ${source}`,
    ticker ? `Stock: $${ticker}` : "",
    `Headline: ${headline}`,
    snippet ? `Snippet: ${snippet}` : "(Headline only — no article body available)",
    corroborationBlock,
  ].filter(Boolean).join("\n");

  try {
    const text = await generateText(userMessage, SYSTEM_PROMPT, {
      maxTokens:   600,
      temperature: 0.3,
      jsonMode:    true,
    });
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: "invalid AI response" }, { status: 502 });
    }

    // Always inject the canonical disclaimer — never trust the model's text
    if (typeof parsed === "object" && parsed !== null) {
      (parsed as Record<string, unknown>)["disclaimer_th"] = DISCLAIMER;
    }

    const validated = AnalysisSchema.safeParse(parsed);
    if (!validated.success) {
      return NextResponse.json({ error: "malformed AI response" }, { status: 502 });
    }

    cache.set(key, { result: validated.data, cachedAt: Date.now() });
    return NextResponse.json({ ...validated.data, cached: false });
  } catch (err) {
    console.error("[news/analyze] Groq error:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "AI ไม่พร้อมใช้งานชั่วคราว ลองใหม่อีกครั้ง" },
      { status: 503 }
    );
  }
}
