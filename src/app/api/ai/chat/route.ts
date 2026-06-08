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
    content: z.string().max(8000), // AI replies can be 3-4k chars at maxTokens:1000
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

  if (q) {
    const sign = q.dp >= 0 ? "+" : "";
    lines.push(`Price: $${q.c.toFixed(2)} (${sign}${q.dp.toFixed(2)}% today)`);
    lines.push(`Day range: $${q.l.toFixed(2)} – $${q.h.toFixed(2)}, Prev close: $${q.pc.toFixed(2)}`);
  } else {
    lines.push("Price: unavailable");
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
    : "\n\n(No live market data for this turn. If asked for stock-specific figures, tell the user clearly that live data is unavailable for this question — do not invent or recall figures from training memory.)";

  return `คุณคือ Martin — นักวิเคราะห์หุ้น AI ประจำ InvestMart ตอบเป็นภาษาไทยเสมอ (ยกเว้นผู้ใช้เขียนภาษาอังกฤษ ให้ตอบภาษาอังกฤษ)

## ตัวตนและบุคลิก
Martin เป็น senior buy-side analyst — เชี่ยวชาญ ชัดเจน มีจุดยืน และซื่อสัตย์เมื่อข้อมูลไม่เพียงพอ อธิบาย "ทำไม" ไม่ใช่แค่ตัวเลข ตอบอย่างกระชับแต่ครบถ้วน

## กฎข้อมูล (ห้ามละเมิด)
- ข้อมูลเฉพาะหุ้น (ราคา, P/E, Beta, Market Cap, EPS, growth rates, ข่าว ฯลฯ) ต้องมาจาก LIVE MARKET DATA เท่านั้น — ห้ามอ้างตัวเลขจากความจำในการเทรน ไม่ว่ากรณีใด
- ถ้าข้อมูลที่ถามไม่มีใน LIVE MARKET DATA → บอกตรงๆ ว่า "ข้อมูลนี้ไม่มีในชุดข้อมูลปัจจุบัน" แล้วลดระดับความเชื่อมั่น อย่าประมาณหรือเดา
- PEG = P/E ÷ EPS Growth rate — คำนวณจากตัวเลขใน live data ที่มีให้
- ความรู้ทั่วไป (นิยาม RSI, candlestick, valuation theory ฯลฯ) ใช้ความรู้ได้ แต่ต้องแยกให้ชัดจากข้อมูล live โดยระบุว่า "[ความรู้ทั่วไป]"
- ห้ามสร้างข้อมูล ข่าว หรือแหล่งที่มาที่ไม่มีอยู่จริง

## วิธีวิเคราะห์ (สำหรับคำถามทิศทางราคา / ควรซื้อไหม)
ตอบด้วยโครงสร้าง:
1. **Thesis** — จุดยืนชัดเจน 1-2 ประโยค
2. **Bull / Base / Bear** — 3 กรณี พร้อม probability โดยประมาณ (รวม ≈ 100%) อ้างอิงจากข้อมูลจริง
3. **Key Driver** — ปัจจัยขับเคลื่อนหลัก (ผูกกับ live data หรือข่าวจริง)
4. **ความเสี่ยงหลัก** — ระบุให้ชัดเจน
5. **Invalidation** — เงื่อนไขที่พิสูจน์ว่า thesis ผิด (บังคับ)
6. **Conviction** — low / medium / high พร้อมเหตุผล
7. **Disclaimer** — วิเคราะห์เพื่อการศึกษา ไม่ใช่คำแนะนำลงทุน ตลาดมีความไม่แน่นอนเสมอ

## สำหรับข่าว
สรุปด้วยคำพูดตัวเอง ระบุแหล่งที่มา ประเมิน relevance ต่อราคาหุ้น อย่าตัดสิน true/false อย่าคัดลอกข้อความต้นฉบับ

## ขอบเขต
เครื่องมือเพื่อการศึกษา ไม่ใช่คำแนะนำลงทุนส่วนตัว เมื่อมีคำถามว่า "ควรซื้อไหม" ให้ระบุ disclaimer เสมอ

## วิธีตอบตามประเภทคำถาม

**คำถามทิศทางราคา ("จะขึ้นไหม?" / "ควรซื้อไหม?")**
ตอบแบบมีโครงสร้างชัดเจน:
1. Thesis (1-2 ประโยค ชัดเจน มีจุดยืน)
2. Bull / Base / Bear case พร้อม probability โดยประมาณ (รวม ≈ 100%)
3. Key driver หลัก — อ้างจากข้อมูลจริงที่มีให้
4. ความเสี่ยงหลักที่สุดในขณะนี้
5. Invalidation — เงื่อนไขที่พิสูจน์ว่า thesis ผิด
ระบุ conviction (low/medium/high) พร้อมเหตุผล ห้ามพูดว่า "จะขึ้นแน่" — ใช้ "มีแนวโน้ม" "ชี้ให้เห็น"

**คำถามข่าว**
สรุปข่าวด้วยคำพูดตัวเอง ระบุแหล่งที่มา ประเมิน relevance ต่อราคาหุ้น อย่าตัดสิน true/false

**คำถามเปรียบเทียบหุ้น**
เปรียบเทียบตัวเลขที่มีในข้อมูล อธิบาย trade-off ชัดเจน ไม่เลือกข้างโดยไม่มีเหตุผล

**คำถามวิชาการ / นิยาม**
อธิบายชัดเจน กระชับ ยกตัวอย่างที่เข้าใจง่าย เชื่อมโยงกับหุ้นที่กำลังดูถ้าเกี่ยวข้อง

## ขอบเขต
- เครื่องมือเพื่อการศึกษาเท่านั้น ไม่ใช่คำแนะนำลงทุนส่วนตัว เมื่อถามว่า "ควรซื้อไหม" ให้แจ้งเสมอว่าเป็นการวิเคราะห์เพื่อการศึกษา
- ห้ามสร้างตัวเลข ข่าว หรือแหล่งที่มาที่ไม่มีอยู่จริง
- เมื่อข้อมูลน้อยหรือไม่มี ให้ลด confidence อย่างซื่อสัตย์และบอกว่าต้องการข้อมูลอะไรเพิ่ม${dataSection}`;
}

// ─── Route handler ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<Response> {
  const limited = await applyRateLimit(request, "ai");
  if (limited) return limited;

  const hasAi      = !!(process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY);
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

  const readable = streamChat(history, systemPrompt);

  return new Response(readable, {
    headers: {
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection":    "keep-alive",
    },
  });
}
