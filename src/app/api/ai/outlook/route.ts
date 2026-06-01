import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { getPersonaById } from "@/lib/personas";

const GROQ_MODEL   = "llama-3.3-70b-versatile";
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

const DISCLAIMER =
  "นี่คือการวิเคราะห์ AI เพื่อการศึกษา ไม่ใช่คำแนะนำการลงทุน ตลาดมีความไม่แน่นอนเสมอ";

interface OutlookEntry {
  ticker:          string;
  thesis:          string;
  conviction:      "low" | "medium" | "high";
  convictionReason: string;
  bull:            { description: string; probability: string };
  base:            { description: string; probability: string };
  bear:            { description: string; probability: string };
  drivers:         string[];
  risk:            string;
  invalidation:    string;
  disclaimer:      string;
  generatedAt:     string;
}

interface LlmOutlook {
  thesis:          string;
  conviction:      string;
  convictionReason: string;
  bull:            { description: string; probability: string };
  base:            { description: string; probability: string };
  bear:            { description: string; probability: string };
  drivers:         string[];
  risk:            string;
  invalidation:    string;
}

// Module-level cache keyed by "ticker:persona"
const outlookCache = new Map<string, OutlookEntry>();

function isCacheStale(entry: OutlookEntry): boolean {
  return Date.now() - new Date(entry.generatedAt).getTime() > CACHE_TTL_MS;
}

let groqClient: Groq | null = null;

function getGroq(): Groq {
  if (!groqClient) {
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groqClient;
}

interface FinnhubQuote {
  c:  number;
  d:  number;
  dp: number;
  h:  number;
  l:  number;
  o:  number;
  pc: number;
}

interface FinnhubNewsItem {
  headline: string;
  summary:  string;
  datetime: number;
  source:   string;
}

interface FinnhubMetrics {
  metric?: {
    "52WeekHigh"?:                  number;
    "52WeekLow"?:                   number;
    peBasicExclExtraTTM?:           number;
    beta?:                          number;
    "10DayAverageTradingVolume"?:   number;
    revenueGrowthQuarterlyYoy?:     number;
    epsNormalizedAnnual?:           number;
    marketCapitalization?:          number;
  };
}

interface FinnhubRecommendation {
  buy:        number;
  hold:       number;
  sell:       number;
  strongBuy:  number;
  strongSell: number;
  period:     string;
  symbol:     string;
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

function fallbackOutlook(ticker: string, errorMsg: string): OutlookEntry {
  return {
    ticker,
    thesis:           `ไม่สามารถสร้างการวิเคราะห์สำหรับ ${ticker} ได้: ${errorMsg}`,
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

const SYSTEM_PROMPT = `คุณคือนักวิเคราะห์หุ้นมืออาชีพสำหรับ InvestMart แพลตฟอร์มเรียนรู้การลงทุนไทย

วิธีคิดของคุณ:
1. สังเคราะห์ข้อมูลที่ได้รับ — ใช้เฉพาะสิ่งที่ให้มา ถ้าขาด ระบุและลด conviction
2. สร้าง bull case และ bear case ที่แข็งแกร่งที่สุดจากข้อมูล
3. ชั่งน้ำหนักและมีจุดยืนชัดเจน — decisive แต่ซื่อสัตย์ว่าเป็นความน่าจะเป็น ไม่ใช่ความแน่นอน
4. ให้ conviction (low/medium/high) และเหตุผล

กฎเหล็ก:
- ห้ามสร้างตัวเลข ราคาเป้าหมาย หรือข้อมูลที่ไม่ได้ให้มา
- ห้ามพูดว่าหุ้นจะขึ้นหรือลงแน่นอน ใช้ "มีโอกาส" "ชี้ว่า" "ขึ้นอยู่กับ"
- conviction = high ต้องการ: ข้อมูลครบ + ทิศทางชัด + ไม่ขัดแย้ง
- ผลบวกของ probability ≈ 100%

ตอบ JSON เท่านั้น:
{
  "thesis": "1-2 ประโยค: setup ปัจจุบัน momentum/fundamental ชี้ทางไหน",
  "conviction": "low|medium|high",
  "convictionReason": "เหตุผลระดับ conviction",
  "bull": {"description":"เงื่อนไขและผลลัพธ์กรณีดี","probability":"XX%"},
  "base": {"description":"กรณีน่าจะเป็น","probability":"XX%"},
  "bear": {"description":"เงื่อนไขและผลลัพธ์กรณีแย่","probability":"XX%"},
  "drivers": ["ปัจจัย 1 (source: news/metric/price)","ปัจจัย 2","ปัจจัย 3"],
  "risk": "ความเสี่ยงสำคัญสุด",
  "invalidation": "ระดับราคา/เหตุการณ์ที่พิสูจน์ว่าวิเคราะห์ผิด"
}`;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const params   = request.nextUrl.searchParams;
  const ticker   = params.get("ticker")?.toUpperCase().trim();
  const personaId = params.get("persona") ?? "general";
  const refresh  = params.get("refresh") === "true";

  if (!ticker || !/^[A-Z][A-Z.\-]{0,9}$/.test(ticker)) {
    return NextResponse.json({ error: "ticker required" }, { status: 400 });
  }

  const groqKey    = process.env.GROQ_API_KEY;
  const finnhubKey = process.env.FINNHUB_API_KEY;

  if (!groqKey || !finnhubKey) {
    return NextResponse.json({ error: "AI or market data not configured" }, { status: 500 });
  }

  const cacheKey = `${ticker}:${personaId}`;
  const cached   = outlookCache.get(cacheKey);
  if (!refresh && cached && !isCacheStale(cached)) {
    return NextResponse.json(cached);
  }

  const persona       = getPersonaById(personaId);
  const activePrompt  = persona?.systemPrompt ?? SYSTEM_PROMPT;

  const sevenDaysAgo = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000);
  const today        = Math.floor(Date.now() / 1000);
  const fromDate     = new Date(sevenDaysAgo * 1000).toISOString().split("T")[0];
  const toDate       = new Date(today * 1000).toISOString().split("T")[0];

  const [quote, newsItems, metricsData, recommendations] = await Promise.all([
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
  ]);

  const topNews   = (newsItems ?? []).slice(0, 5);
  const metrics   = metricsData?.metric;
  const latestRec = recommendations?.[0];

  const newsBlock = topNews.length > 0
    ? topNews.map((n) => `- ${n.headline}`).join("\n")
    : "ไม่มีข่าวล่าสุดใน 7 วัน";

  const recommendationBlock = latestRec
    ? `Analyst Consensus (${latestRec.period}): Strong Buy ${latestRec.strongBuy}, Buy ${latestRec.buy}, Hold ${latestRec.hold}, Sell ${latestRec.sell}, Strong Sell ${latestRec.strongSell}`
    : null;

  const metricsLines = [
    quote   ? `ราคาปัจจุบัน: $${quote.c.toFixed(2)}, เปลี่ยน: ${quote.dp?.toFixed(2) ?? "?"}%` : null,
    metrics?.["52WeekHigh"]                 ? `52W High: $${metrics["52WeekHigh"].toFixed(2)}`                                     : null,
    metrics?.["52WeekLow"]                  ? `52W Low: $${metrics["52WeekLow"].toFixed(2)}`                                       : null,
    metrics?.peBasicExclExtraTTM            ? `P/E TTM: ${metrics.peBasicExclExtraTTM.toFixed(1)}`                                 : null,
    metrics?.beta                           ? `Beta: ${metrics.beta.toFixed(2)}`                                                   : null,
    metrics?.["10DayAverageTradingVolume"]  ? `10D Avg Volume: ${(metrics["10DayAverageTradingVolume"] * 1000).toLocaleString()}`  : null,
    metrics?.revenueGrowthQuarterlyYoy      ? `Revenue Growth QoQ: ${metrics.revenueGrowthQuarterlyYoy.toFixed(1)}%`               : null,
    metrics?.epsNormalizedAnnual            ? `EPS (normalized): ${metrics.epsNormalizedAnnual.toFixed(2)}`                        : null,
    metrics?.marketCapitalization           ? `Market Cap: $${(metrics.marketCapitalization / 1000).toFixed(1)}B`                  : null,
    recommendationBlock,
  ].filter(Boolean).join("\n");

  const userPrompt = `วิเคราะห์หุ้น ${ticker}

ข้อมูลตลาด:
${metricsLines || "ไม่มีข้อมูล"}

ข่าวล่าสุด 7 วัน:
${newsBlock}`;

  try {
    const completion = await getGroq().chat.completions.create({
      model:           GROQ_MODEL,
      messages:        [
        { role: "system", content: activePrompt },
        { role: "user",   content: userPrompt   },
      ],
      max_tokens:      800,
      temperature:     0.3,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const llm = JSON.parse(raw) as Partial<LlmOutlook>;

    const entry: OutlookEntry = {
      ticker,
      thesis:           typeof llm.thesis === "string"          ? llm.thesis          : "—",
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
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json(fallbackOutlook(ticker, msg), { status: 500 });
  }
}
