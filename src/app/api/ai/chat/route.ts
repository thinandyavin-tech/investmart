import { NextRequest } from "next/server";
import { z } from "zod";

import { streamChat } from "@/lib/aiService";
import { applyRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const MAX_MESSAGES = 30;
const DATA_TTL_MS  = 5 * 60 * 1000; // 5-minute live data cache

const BodySchema = z.object({
  messages: z.array(z.object({
    role:    z.enum(["user", "assistant"]),
    content: z.string().max(12000), // AI replies can reach ~8k chars at maxTokens:2500
  })).min(1).max(MAX_MESSAGES),
  ticker: z.string().regex(/^[A-Z][A-Z.\-]{0,9}$/).optional(),
});

// ─── Ticker extraction ──────────────────────────────────────────────────────

const TICKER_RE = /\$([A-Z][A-Z.\-]{0,9})/g;

function extractTickers(text: string): string[] {
  const found: string[] = [];
  TICKER_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TICKER_RE.exec(text)) !== null) {
    if (!found.includes(m[1])) found.push(m[1]);
  }
  return found.slice(0, 2);
}

// ─── Finnhub types ──────────────────────────────────────────────────────────

interface FinnhubQuote  { c: number; d: number; dp: number; h: number; l: number; pc: number }
interface FinnhubMetric {
  "52WeekHigh"?: number; "52WeekLow"?: number;
  peBasicExclExtraTTM?: number; beta?: number;
  marketCapitalization?: number; epsNormalizedAnnual?: number;
  epsGrowth3Y?: number; epsGrowth5Y?: number;
  revenueGrowthQuarterlyYoy?: number;
  dividendYieldIndicatedAnnual?: number;
  "10DayAverageTradingVolume"?: number;
}
interface FinnhubNews   { headline: string; source: string; datetime: number }
interface FinnhubRec    { strongBuy: number; buy: number; hold: number; sell: number; strongSell: number; period: string }

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3500) });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch { return null; }
}

// ─── Live data per ticker (cached 5 min, in-flight deduplicated) ─────────────

const dataCache    = new Map<string, { block: string; cachedAt: number }>();
const dataInflight = new Map<string, Promise<string>>();

async function buildTickerBlock(ticker: string, apiKey: string): Promise<string> {
  const hit = dataCache.get(ticker);
  if (hit && Date.now() - hit.cachedAt < DATA_TTL_MS) return hit.block;

  // Deduplicate: if already fetching this ticker, wait for that same promise
  const existing = dataInflight.get(ticker);
  if (existing) return existing;

  const promise = (async () => {
  const ago7 = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  const base  = "https://finnhub.io/api/v1";
  const tok   = `token=${apiKey}`;

  const [quoteR, metR, newsR, recR] = await Promise.allSettled([
    fetchJson<FinnhubQuote>(`${base}/quote?symbol=${ticker}&${tok}`),
    fetchJson<{ metric?: FinnhubMetric }>(`${base}/stock/metric?symbol=${ticker}&metric=all&${tok}`),
    fetchJson<FinnhubNews[]>(`${base}/company-news?symbol=${ticker}&from=${ago7}&to=${today}&${tok}`),
    fetchJson<FinnhubRec[]>(`${base}/stock/recommendation?symbol=${ticker}&${tok}`),
  ]);

  const q   = quoteR.status   === "fulfilled" ? quoteR.value   : null;
  const m   = metR.status     === "fulfilled" ? metR.value?.metric ?? null : null;
  const news = newsR.status   === "fulfilled" ? (newsR.value ?? []).slice(0, 5) : [];
  const rec  = recR.status    === "fulfilled" && recR.value?.length ? recR.value[0] : null;

  const lines: string[] = [`=== ${ticker} — live data fetched ${new Date().toUTCString()} ===`];

  if (q && q.c > 0) {
    const sign = q.dp >= 0 ? "+" : "";
    lines.push(`Price: $${q.c.toFixed(2)} (${sign}${q.dp.toFixed(2)}% today)`);
    lines.push(`Day range: $${q.l.toFixed(2)} – $${q.h.toFixed(2)}, Prev close: $${q.pc.toFixed(2)}`);
  } else {
    // c=0 means Finnhub has no data (common for non-US/SET tickers on the free tier)
    lines.push("Price: ไม่มีข้อมูลราคาจาก Finnhub (Finnhub free tier อาจไม่รองรับหุ้นนี้)");
  }

  if (m) {
    const f = (v: number | undefined) => v != null ? v.toFixed(2) : "N/A";
    lines.push(`52W range: $${f(m["52WeekLow"])} – $${f(m["52WeekHigh"])}`);
    lines.push(`P/E TTM: ${f(m.peBasicExclExtraTTM)}x, Beta: ${f(m.beta)}`);
    lines.push(`Market Cap: ${m.marketCapitalization ? "$" + (m.marketCapitalization / 1000).toFixed(1) + "B" : "N/A"}`);
    lines.push(`EPS (normalized): $${f(m.epsNormalizedAnnual)}`);
    if (m.epsGrowth3Y   != null) lines.push(`EPS Growth 3Y: ${m.epsGrowth3Y.toFixed(1)}%`);
    if (m.epsGrowth5Y   != null) lines.push(`EPS Growth 5Y: ${m.epsGrowth5Y.toFixed(1)}%`);
    if (m.revenueGrowthQuarterlyYoy != null) lines.push(`Revenue Growth QoQ: ${m.revenueGrowthQuarterlyYoy.toFixed(1)}%`);
    if (m.dividendYieldIndicatedAnnual) lines.push(`Dividend Yield: ${m.dividendYieldIndicatedAnnual.toFixed(2)}%`);
    if (m["10DayAverageTradingVolume"] != null) {
      lines.push(`10D Avg Volume: ${(m["10DayAverageTradingVolume"] * 1_000).toLocaleString()}`);
    }
  } else {
    lines.push("Fundamentals: unavailable");
  }

  if (rec) {
    lines.push(`Analyst (${rec.period}): Strong Buy ${rec.strongBuy}, Buy ${rec.buy}, Hold ${rec.hold}, Sell ${rec.sell}, Strong Sell ${rec.strongSell}`);
  }

  if (news.length > 0) {
    lines.push("Recent news (7 days):");
    news.forEach((n, i) => {
      const d = new Date(n.datetime * 1000).toLocaleDateString("th-TH");
      lines.push(`  ${i + 1}. "${n.headline}" — ${n.source} (${d})`);
    });
  } else {
    lines.push("Recent news: none in 7 days");
  }

  lines.push(`=== end ${ticker} data ===`);
  const block = lines.join("\n");
  dataCache.set(ticker, { block, cachedAt: Date.now() });
  return block;
  })();

  dataInflight.set(ticker, promise);
  promise.finally(() => dataInflight.delete(ticker));
  return promise;
}

// ─── System prompt ───────────────────────────────────────────────────────────

function buildSystemPrompt(liveBlocks: string[]): string {
  const dataSection = liveBlocks.length > 0
    ? `\n\n--- LIVE MARKET DATA (use ONLY these figures for all stock-specific facts) ---\n${liveBlocks.join("\n\n")}\n--- END LIVE MARKET DATA ---`
    : "\n\n(No live market data for this turn. If asked for stock-specific figures, tell the user clearly that live data is unavailable — do not invent or recall any figures from training memory.)";

  return `คุณคือ Martin — นักวิเคราะห์หุ้น AI ระดับ senior buy-side analyst ประจำ InvestMart
ตอบเป็นภาษาไทยเสมอ ยกเว้นผู้ใช้เขียนภาษาอังกฤษมาก็ตอบภาษาอังกฤษ

═══ กระบวนการคิดก่อนตอบ (ทำทุกครั้ง ไม่แสดงในคำตอบ) ═══
ก่อนเริ่มพิมพ์คำตอบ ให้คิดผ่านขั้นตอนต่อไปนี้ภายในใจ:
1. ทบทวน LIVE MARKET DATA ที่มี — ตัวเลขอะไรอยู่ที่นี่บ้าง?
2. คำถามนี้ต้องการข้อมูลอะไร? ข้อมูลนั้นอยู่ใน live data ไหม?
3. จะสร้าง thesis อะไรจากข้อมูลที่มี? มีหลักฐานสนับสนุนมากแค่ไหน?
4. กรณี Bull/Base/Bear ที่แข็งที่สุดคืออะไร? probability ของแต่ละกรณี?
5. อะไรจะพิสูจน์ว่า thesis นี้ผิด (invalidation)?
6. Self-check: ตัวเลขทุกตัวมาจาก live data? thesis ชัดเจนมีจุดยืน? ครบ 7 องค์ประกอบ?
เมื่อคิดครบแล้วจึงเริ่มพิมพ์คำตอบที่สะอาด มีโครงสร้าง

═══ กฎข้อมูล (ห้ามละเมิดเด็ดขาด) ═══
• ตัวเลขเฉพาะหุ้น (ราคา, P/E, Beta, Market Cap, EPS, growth rates, ข่าว, analyst rec ฯลฯ) → มาจาก LIVE MARKET DATA เท่านั้น ห้ามอ้างจากความจำในการเทรน
• ตัวเลขไม่มีใน live data → บอกว่า "ข้อมูลนี้ไม่มีในชุดข้อมูลปัจจุบัน" แล้วลด conviction ห้ามประมาณหรือเดา
• PEG ratio → คำนวณเองจาก P/E ÷ EPS Growth rate ที่มีใน live data
• ความรู้ทั่วไป (นิยาม RSI, candlestick, DCF ฯลฯ) → ใช้ได้ แต่ต้องแยกให้ชัดด้วย [ความรู้ทั่วไป]
• ห้ามแต่งข่าว ตัวเลข หรือแหล่งที่มา

═══ โครงสร้างคำตอบตามประเภทคำถาม ═══

**คำถามวิเคราะห์หุ้น / ทิศทางราคา ("วิเคราะห์ X", "จะขึ้นไหม", "ควรซื้อไหม")**
ตอบด้วยโครงสร้าง 7 ส่วนนี้เสมอ:

**📊 Thesis**
[จุดยืนชัดเจน 1-2 ประโยค — decisive, มีตัวเลขจริงสนับสนุน]

**🎯 กรณีที่เป็นไปได้**
• 🟢 Bull (~X%): [เงื่อนไข + mechanism ที่จะทำให้เกิด]
• ⚪ Base (~X%): [กรณีกลาง + ราคาเป้าหมายคร่าวๆ]
• 🔴 Bear (~X%): [เงื่อนไขที่จะทำให้ thesis พัง]

**⚡ Key Driver**
[ปัจจัยหลัก 1-2 ข้อที่ขับเคลื่อนหุ้นตอนนี้ — ผูกกับ live data หรือข่าวจริง อธิบาย mechanism ว่าทำไมมันสำคัญ]

**⚠️ ความเสี่ยงหลัก**
[ความเสี่ยงที่สำคัญที่สุด 1-2 ข้อในขณะนี้ — เป็นรูปธรรม]

**🚫 Invalidation**
[เงื่อนไขเฉพาะที่จะพิสูจน์ว่า thesis ผิด — ต้องระบุ mandatory]

**📈 Conviction: [Low / Medium / High]**
[เหตุผล 1-2 ประโยค ว่าทำไมถึง low/medium/high — ขึ้นอยู่กับปริมาณ/คุณภาพข้อมูลที่มี]

**⚠️ Disclaimer**
การวิเคราะห์นี้เพื่อการศึกษาเท่านั้น ไม่ใช่คำแนะนำลงทุน ตลาดมีความไม่แน่นอนเสมอ

---

**คำถามพื้นฐาน / P/E / Fundamentals**
• ใช้ตัวเลขจาก live data ทั้งหมด
• อธิบาย mechanism: ตัวเลขนี้บอกอะไร ดีหรือแย่เทียบกับอะไร ทำไมสำคัญ
• คำนวณ PEG ถ้ามีข้อมูลครบ
• ระบุสิ่งที่ข้อมูลบอกไม่ได้ด้วย

**คำถามข่าว**
• สรุปในคำพูดตัวเอง (ห้ามคัดลอก) ระบุแหล่งที่มา
• ประเมิน: ข่าวนี้ material ต่อราคาแค่ไหน ทำไม
• อย่าตัดสิน true/false

**คำถามเปรียบเทียบ**
• ตารางเปรียบเทียบตัวเลขจาก live data
• อธิบาย trade-off: A เก่งกว่าในด้านใด B เก่งในด้านใด
• ให้มุมมองที่ชัดเจนพร้อมเหตุผล

**คำถามวิชาการ / นิยาม**
• อธิบายชัด กระชับ ยกตัวอย่างที่จับต้องได้
• ถ้ามี live data ที่เกี่ยวข้อง ให้เชื่อมโยงทันที
• ระบุ [ความรู้ทั่วไป] ให้ชัด

═══ มาตรฐานคุณภาพ ═══
✓ อธิบาย "ทำไม" และ "mechanism" ไม่ใช่แค่ตัวเลข
✓ ชัดเจนและมีจุดยืน ไม่คลุมเครือ แต่ซื่อสัตย์เรื่องความไม่แน่นอน
✓ ทุก quantitative claim มีตัวเลขจาก live data อ้างอิง
✓ Conviction สอดคล้องกับปริมาณข้อมูลที่มี (data น้อย → low conviction)
✓ ระบุคำถามที่น่าจะถามต่อท้ายถ้าเหมาะสม เพื่อช่วย user วางแผนการศึกษาต่อ
✓ ไม่รับประกันราคา ไม่พูดว่า "แน่นอน" หรือ "ต้องขึ้น/ลง"${dataSection}`;
}

// ─── Route handler ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<Response> {
  const limited = await applyRateLimit(request, "ai");
  if (limited) return limited;

  // Accept any configured provider — Groq, Gemini, or local (Ollama/LM Studio)
  const hasAi      = !!(process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY || process.env.LOCAL_AI_BASE_URL);
  const finnhubKey = process.env.FINNHUB_API_KEY;

  if (!hasAi || !finnhubKey) {
    return Response.json({ error: "AI not configured" }, { status: 503 });
  }

  let body: unknown;
  try { body = await request.json(); }
  catch { return Response.json({ error: "invalid JSON" }, { status: 400 }); }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "invalid request" }, { status: 422 });
  }

  const { messages, ticker: pageTicker } = parsed.data;

  // Collect tickers: page context + $TICKER mentions in latest user message
  const lastUser  = [...messages].reverse().find(m => m.role === "user");
  const mentioned = lastUser ? extractTickers(lastUser.content) : [];
  const allTickers = [...new Set([...(pageTicker ? [pageTicker] : []), ...mentioned])].slice(0, 2);

  // Fetch live data for all detected tickers
  const liveBlocks = await Promise.all(
    allTickers.map(t => buildTickerBlock(t, finnhubKey))
  );

  const systemPrompt = buildSystemPrompt(liveBlocks);

  const history = messages.slice(-20).map(m => ({
    role:    m.role as "user" | "assistant",
    content: m.content,
  }));

  const readable = streamChat(history, systemPrompt, {
    maxTokens:   2500, // deeper analysis needs more room
    temperature: 0.25, // lower = more consistent, less hallucination
  });

  return new Response(readable, {
    headers: {
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection":    "keep-alive",
    },
  });
}
