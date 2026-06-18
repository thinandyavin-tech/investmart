import { NextRequest, NextResponse } from "next/server";

import { getPersonaById } from "@/lib/personas";
import { generateText } from "@/lib/aiService";
import { applyRateLimit } from "@/lib/rateLimit";

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

const DISCLAIMER =
  "นี่คือการวิเคราะห์ AI เพื่อการศึกษา ไม่ใช่คำแนะนำการลงทุน ตลาดมีความไม่แน่นอนเสมอ";

interface OutlookEntry {
  ticker:           string;
  thesis:           string;
  conviction:       "low" | "medium" | "high";
  convictionReason: string;
  bull:             { description: string; probability: string };
  base:             { description: string; probability: string };
  bear:             { description: string; probability: string };
  drivers:          string[];
  risk:             string;
  invalidation:     string;
  disclaimer:       string;
  generatedAt:      string;
}

interface LlmOutlook {
  thesis:           string;
  conviction:       string;
  convictionReason: string;
  bull:             { description: string; probability: string };
  base:             { description: string; probability: string };
  bear:             { description: string; probability: string };
  drivers:          string[];
  risk:             string;
  invalidation:     string;
}

// Module-level cache keyed by "ticker:persona"
const outlookCache = new Map<string, OutlookEntry>();

function isCacheStale(entry: OutlookEntry): boolean {
  return Date.now() - new Date(entry.generatedAt).getTime() > CACHE_TTL_MS;
}

interface FinnhubQuote  { c: number; d: number; dp: number; h: number; l: number; o: number; pc: number }
interface FinnhubNewsItem { headline: string; summary: string; datetime: number; source: string }
interface FinnhubMetrics {
  metric?: {
    "52WeekHigh"?:                number;
    "52WeekLow"?:                 number;
    peBasicExclExtraTTM?:         number;
    beta?:                        number;
    "10DayAverageTradingVolume"?: number;
    revenueGrowthQuarterlyYoy?:   number;
    epsNormalizedAnnual?:         number;
    marketCapitalization?:        number;
  };
}
interface FinnhubRecommendation {
  buy: number; hold: number; sell: number;
  strongBuy: number; strongSell: number;
  period: string; symbol: string;
}
interface FinnhubProfile {
  name?: string; finnhubIndustry?: string; marketCapitalization?: number;
  description?: string; country?: string; exchange?: string;
}

async function fetchFinnhubJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function normalizeConviction(raw: unknown): "low" | "medium" | "high" {
  if (raw === "high" || raw === "medium" || raw === "low") return raw;
  return "low";
}

function fallbackOutlook(ticker: string): OutlookEntry {
  return {
    ticker,
    thesis:           `ไม่สามารถสร้างการวิเคราะห์สำหรับ ${ticker} ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง`,
    conviction:       "low",
    convictionReason: "ไม่มีข้อมูล",
    bull:             { description: "—", probability: "—" },
    base:             { description: "—", probability: "—" },
    bear:             { description: "—", probability: "—" },
    drivers:          [],
    risk:             "—",
    invalidation:     "—",
    disclaimer:       DISCLAIMER,
    generatedAt:      new Date().toISOString(),
  };
}

const DEFAULT_SYSTEM_PROMPT = `คุณคือนักวิเคราะห์หุ้นมืออาชีพระดับ buy-side ที่ทำงานให้กับ InvestMart แพลตฟอร์มเรียนรู้การลงทุนสำหรับนักลงทุนไทย (การวิเคราะห์นี้เพื่อการศึกษาเท่านั้น ไม่ใช่คำแนะนำลงทุน)

กระบวนการวิเคราะห์ที่เคร่งครัด:
1. อ่านและจัดหมวดหมู่ข้อมูลที่ได้รับ — แยกแยะระหว่างข้อมูลที่มีและที่ขาดหาย
2. วิเคราะห์ Valuation: ราคาอยู่ที่ไหนใน 52W range? P/E สมเหตุผลไหมเทียบ growth และ sector?
3. วิเคราะห์ Momentum & Sentiment: ทิศทางราคาล่าสุด + analyst consensus ชี้อะไร?
4. วิเคราะห์ Catalysts: ข่าวล่าสุดมี catalyst บวกหรือลบที่ชัดเจนไหม?
5. สร้าง Bull / Base / Bear case ที่แข็งแกร่งและน่าเชื่อถือจากข้อมูลที่มีจริง
6. กำหนด conviction ตาม: ความครบถ้วนของข้อมูล + ความชัดเจนของทิศทาง + ความสอดคล้องของสัญญาณ

กฎวิชาชีพที่ต้องปฏิบัติเคร่งครัด:
- ข้อมูลที่ใช้มาจาก Finnhub (ราคา, metrics, analyst ratings) และ Finnhub News (headline ข่าว 7 วัน) เท่านั้น — อ้างอิงแหล่งข้อมูลเสมอ
- ใช้เฉพาะข้อมูลที่ได้รับ ห้ามสร้างตัวเลข ราคาเป้าหมาย หรือสถิติที่ไม่มีในข้อมูล
- ห้ามใช้ภาษาที่แน่นอน เช่น "จะขึ้น" "จะลง" — ใช้ "มีแนวโน้ม" "ชี้ให้เห็น" "อาจส่งผล" เสมอ
- conviction = "high" ต้องการครบ 3 เงื่อนไข: ข้อมูล quantitative ครบ + ทิศทางชัดเจน + ข่าวและตัวเลขสอดคล้องกัน
- conviction = "low" เมื่อ: ข้อมูลน้อยกว่า 3 ตัวเลขสำคัญ, สัญญาณขัดแย้ง, หรือความไม่แน่นอนสูง
- probability ทั้ง 3 scenarios ต้องรวมกัน = 100% พอดี
- invalidation ต้องระบุเงื่อนไขที่วัดได้จริง ไม่ใช่ความเป็นไปได้คลุมเครือ

ตอบ JSON เท่านั้น ไม่มีข้อความอื่น ไม่มี markdown:
{"thesis":"สรุปมุมมองรวม 1-2 ประโยคที่มีจุดยืนชัดเจน","conviction":"low|medium|high","convictionReason":"เหตุผลเฉพาะที่กำหนด conviction ระดับนี้ อ้างอิงข้อมูลที่ให้มา","bull":{"description":"สถานการณ์ที่ดีที่สุดที่น่าจะเป็นไปได้ พร้อมกลไกที่จะทำให้เกิดขึ้น","probability":"XX%"},"base":{"description":"สถานการณ์กลางที่น่าจะเป็นที่สุด พร้อมกลไกหลัก","probability":"XX%"},"bear":{"description":"สถานการณ์ที่แย่ที่สุดที่เป็นไปได้ พร้อมกลไกที่จะทำให้เกิดขึ้น","probability":"XX%"},"drivers":["ปัจจัยขับเคลื่อนสำคัญที่สุดในขณะนี้","ปัจจัยที่ 2 ที่มีน้ำหนัก","ปัจจัยที่ 3 ที่ต้องติดตาม"],"risk":"ความเสี่ยงหลักที่สำคัญที่สุดที่นักลงทุนต้องติดตาม","invalidation":"เงื่อนไขที่วัดได้ซึ่งถ้าเกิดขึ้นจะพิสูจน์ว่า thesis นี้ผิด"}`;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const limited = await applyRateLimit(request, "ai");
  if (limited) return limited;

  const params    = request.nextUrl.searchParams;
  const ticker    = params.get("ticker")?.toUpperCase().trim();
  const personaId = params.get("persona") ?? "general";
  const refresh   = params.get("refresh") === "true";

  if (!ticker || !/^[A-Z][A-Z.\-]{0,9}$/.test(ticker)) {
    return NextResponse.json({ error: "ticker required" }, { status: 400 });
  }

  const hasAi      = !!(process.env.CEREBRAS_API_KEY || process.env.GROQ_API_KEY || process.env.NVIDIA_NIM_API_KEY || process.env.GEMINI_API_KEY || process.env.LOCAL_AI_BASE_URL);
  const finnhubKey = process.env.FINNHUB_API_KEY;

  if (!hasAi || !finnhubKey) {
    return NextResponse.json({ error: "AI or market data not configured" }, { status: 503 });
  }

  const cacheKey = `${ticker}:${personaId}`;
  const cached   = outlookCache.get(cacheKey);
  if (!refresh && cached && !isCacheStale(cached)) {
    return NextResponse.json(cached);
  }

  const persona      = getPersonaById(personaId);
  const systemPrompt = persona?.systemPrompt ?? DEFAULT_SYSTEM_PROMPT;

  const sevenDaysAgo = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000);
  const today        = Math.floor(Date.now() / 1000);
  const fromDate     = new Date(sevenDaysAgo * 1000).toISOString().split("T")[0];
  const toDate       = new Date(today * 1000).toISOString().split("T")[0];

  const [quote, newsItems, metricsData, recommendations, profileData] = await Promise.all([
    fetchFinnhubJson<FinnhubQuote>(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(ticker)}&token=${finnhubKey}`
    ),
    fetchFinnhubJson<FinnhubNewsItem[]>(
      `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(ticker)}&from=${fromDate}&to=${toDate}&token=${finnhubKey}`
    ),
    fetchFinnhubJson<FinnhubMetrics>(
      `https://finnhub.io/api/v1/stock/metric?symbol=${encodeURIComponent(ticker)}&metric=all&token=${finnhubKey}`
    ),
    fetchFinnhubJson<FinnhubRecommendation[]>(
      `https://finnhub.io/api/v1/stock/recommendation?symbol=${encodeURIComponent(ticker)}&token=${finnhubKey}`
    ),
    fetchFinnhubJson<FinnhubProfile>(
      `https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(ticker)}&token=${finnhubKey}`
    ),
  ]);

  const topNews   = (newsItems ?? []).slice(0, 7);
  const metrics   = metricsData?.metric;
  const latestRec = recommendations?.[0];
  const profile   = profileData;

  const newsBlock = topNews.length > 0
    ? topNews.map((n, i) => `${i + 1}. ${n.headline}${n.summary ? ` — ${n.summary.slice(0, 150)}` : ""}`).join("\n")
    : "ไม่มีข่าวล่าสุดใน 7 วัน";

  const companyLine = [
    profile?.name,
    profile?.finnhubIndustry && `อุตสาหกรรม: ${profile.finnhubIndustry}`,
    profile?.exchange         && `ตลาด: ${profile.exchange}`,
    profile?.country          && `ประเทศ: ${profile.country}`,
  ].filter(Boolean).join(" · ");

  const metricsLines = [
    quote   ? `ราคา: $${quote.c.toFixed(2)}, เปลี่ยนวันนี้: ${(quote.dp ?? 0) >= 0 ? "+" : ""}${(quote.dp ?? 0).toFixed(2)}% ($${(quote.d ?? 0) >= 0 ? "+" : ""}${(quote.d ?? 0).toFixed(2)})` : null,
    quote   ? `OHLC: เปิด $${quote.o.toFixed(2)} | สูง $${quote.h.toFixed(2)} | ต่ำ $${quote.l.toFixed(2)} | ปิดเมื่อวาน $${quote.pc.toFixed(2)}` : null,
    metrics?.["52WeekHigh"]                ? `52W High: $${metrics["52WeekHigh"].toFixed(2)}`                                      : null,
    metrics?.["52WeekLow"]                 ? `52W Low: $${metrics["52WeekLow"].toFixed(2)}`                                        : null,
    metrics?.peBasicExclExtraTTM           ? `P/E TTM: ${metrics.peBasicExclExtraTTM.toFixed(1)}`                                  : null,
    metrics?.beta                          ? `Beta: ${metrics.beta.toFixed(2)}`                                                    : null,
    metrics?.["10DayAverageTradingVolume"] ? `10D Avg Volume: ${(metrics["10DayAverageTradingVolume"] * 1000).toLocaleString()}`   : null,
    metrics?.revenueGrowthQuarterlyYoy     ? `Revenue Growth YoY (quarterly): ${metrics.revenueGrowthQuarterlyYoy.toFixed(1)}%`    : null,
    metrics?.epsNormalizedAnnual           ? `EPS normalized (annual): $${metrics.epsNormalizedAnnual.toFixed(2)}`                 : null,
    metrics?.marketCapitalization          ? `Market Cap: $${(metrics.marketCapitalization / 1000).toFixed(1)}B`                   : null,
    latestRec
      ? `Analyst Consensus (${latestRec.period}): Strong Buy ${latestRec.strongBuy} · Buy ${latestRec.buy} · Hold ${latestRec.hold} · Sell ${latestRec.sell} · Strong Sell ${latestRec.strongSell}`
      : null,
  ].filter(Boolean).join("\n");

  const userPrompt = `# วิเคราะห์หุ้น ${ticker}${companyLine ? `\n${companyLine}` : ""}

## ข้อมูลเชิงปริมาณ
${metricsLines || "ไม่มีข้อมูลตัวเลข"}

## ข่าวสำคัญ 7 วันล่าสุด
${newsBlock}`.trim();

  const MAX_ATTEMPTS = 3;
  let llm: Partial<LlmOutlook> | undefined;
  let lastErr = "";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const raw = await generateText(userPrompt, systemPrompt, {
        maxTokens:   1800,
        temperature: 0.2,
        jsonMode:    true,
      });
      llm = JSON.parse(raw) as Partial<LlmOutlook>;
      break;
    } catch (e) {
      lastErr = e instanceof Error ? e.message : "parse error";
      console.warn(`[ai/outlook] attempt ${attempt}/${MAX_ATTEMPTS} failed: ${lastErr.slice(0, 120)}`);
      if (attempt < MAX_ATTEMPTS) {
        await new Promise(r => setTimeout(r, 600 * attempt));
      }
    }
  }

  try {
    if (!llm) throw new Error(lastErr);

    const entry: OutlookEntry = {
      ticker,
      thesis:           typeof llm.thesis === "string"           ? llm.thesis           : "—",
      conviction:       normalizeConviction(llm.conviction),
      convictionReason: typeof llm.convictionReason === "string" ? llm.convictionReason : "—",
      bull: {
        description: typeof llm.bull?.description === "string" ? llm.bull.description : "—",
        probability: typeof llm.bull?.probability === "string" ? llm.bull.probability : "—",
      },
      base: {
        description: typeof llm.base?.description === "string" ? llm.base.description : "—",
        probability: typeof llm.base?.probability === "string" ? llm.base.probability : "—",
      },
      bear: {
        description: typeof llm.bear?.description === "string" ? llm.bear.description : "—",
        probability: typeof llm.bear?.probability === "string" ? llm.bear.probability : "—",
      },
      drivers:      Array.isArray(llm.drivers)
        ? (llm.drivers as unknown[]).filter((d): d is string => typeof d === "string")
        : [],
      risk:         typeof llm.risk         === "string" ? llm.risk         : "—",
      invalidation: typeof llm.invalidation === "string" ? llm.invalidation : "—",
      disclaimer:   DISCLAIMER,
      generatedAt:  new Date().toISOString(),
    };

    outlookCache.set(cacheKey, entry);
    return NextResponse.json(entry);
  } catch (err) {
    console.error("[ai/outlook] generation failed:", err instanceof Error ? err.message : err);
    return NextResponse.json(fallbackOutlook(ticker), { status: 503 });
  }
}
