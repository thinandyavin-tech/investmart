import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { computeIndicators, type OHLCV } from "@/lib/indicators";
import { generateText } from "@/lib/aiService";
import { extractJson } from "@/lib/ai/utils";
import { prisma }      from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 45;

const TICKER_RE = /^[A-Z][A-Z.\-]{0,9}$/;

const VALID_TIMEFRAMES = ["3M", "1Y", "5Y"] as const;
type Timeframe = (typeof VALID_TIMEFRAMES)[number];

const YF_CONFIG: Record<Timeframe, { range: string; interval: string }> = {
  "3M": { range: "3mo", interval: "1d" },
  "1Y": { range: "1y",  interval: "1d" },
  "5Y": { range: "5y",  interval: "1wk" },
};

const ANALYSIS_TTL_MS = 15 * 60 * 1000; // 15 min in-memory
const DB_TTL_MS       = 45 * 60 * 1000; // 45 min DB cache — survives cold starts

// ── In-memory cache + in-flight dedup ────────────────────────────────────────

interface CacheEntry {
  data:     AnalysisResponse;
  cachedAt: number;
}

const cache    = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<AnalysisResponse>>();

function cacheKey(ticker: string, tf: string): string {
  return createHash("sha256").update(`${ticker}|${tf}`).digest("hex").slice(0, 16);
}

// ── External data types ────────────────────────────────────────────────────

interface YFCandle { time: number; open: number; high: number; low: number; close: number; volume: number }

interface FinnhubQuote  { c: number; d: number; dp: number; h: number; l: number; pc: number }
interface FinnhubMetric { metric?: {
  "52WeekHigh"?: number; "52WeekLow"?: number;
  peBasicExclExtraTTM?: number; beta?: number;
  marketCapitalization?: number; "10DayAverageTradingVolume"?: number;
}}
interface FinnhubNews   { headline: string; source: string; datetime: number }
interface FinnhubProfile { name?: string; exchange?: string; finnhubIndustry?: string }

async function fetchJson<T>(url: string, timeout = 5000): Promise<T | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeout) });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch { return null; }
}

// ── Yahoo Finance history ─────────────────────────────────────────────────

async function fetchHistory(ticker: string, tf: Timeframe): Promise<OHLCV[]> {
  const { range, interval } = YF_CONFIG[tf];
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=${interval}&range=${range}`;
  const res = await fetchJson<{
    chart?: { result?: Array<{
      timestamp?: number[];
      indicators?: { quote?: Array<{ open?: (number|null)[]; high?: (number|null)[]; low?: (number|null)[]; close?: (number|null)[]; volume?: (number|null)[] }> };
    }> };
  }>(url, 7000);

  const result = res?.chart?.result?.[0];
  if (!result?.timestamp || !result.indicators?.quote?.[0]) return [];

  const ts = result.timestamp;
  const q  = result.indicators.quote[0];

  return ts
    .map((t, i) => ({
      time:   t,
      open:   q.open?.[i]   ?? 0,
      high:   q.high?.[i]   ?? 0,
      low:    q.low?.[i]    ?? 0,
      close:  q.close?.[i]  ?? 0,
      volume: q.volume?.[i] ?? 0,
    }))
    .filter(c => c.close > 0);
}

// ── AI Scenario schema ────────────────────────────────────────────────────

export interface Scenario {
  direction:    "bullish" | "bearish";
  variation:    "aggressive" | "conservative";
  entryTrigger: string;
  entryPrice:   number;
  stop:         number;
  targets:      [number, number];
  rr:           string;
  confidence:   "low" | "medium" | "high";
  bestFor:      string;
  whatToExpect: string;
}

export interface AnalysisOutput {
  summary:             string;
  trendStructure:      string;
  bullishSignals:      { label: string; value: string; detail: string }[];
  bearishSignals:      { label: string; value: string; detail: string }[];
  volumeRead:          string;
  volatilityNote:      string;
  scenarios:           Scenario[];
  noTradeZone:         { range: string; reason: string };
  managementNote:      string;
  bullishInvalidation: string;
  bearishInvalidation: string;
  chartSays:           string;
  keyLesson:           string;
  disclaimer:          string;
  isHighRisk:          boolean;
  highRiskReason:      string;
}

export interface AnalysisResponse {
  ticker:     string;
  timeframe:  string;
  quote: {
    price:     number;
    change:    number;
    changePct: number;
    high:      number;
    low:       number;
    prevClose: number;
  };
  indicators: {
    ma20:         number | null;
    ma50:         number | null;
    ma200:        number | null;
    rsi14:        number | null;
    atr14:        number | null;
    adx14:        number | null;
    plusDI:       number | null;
    minusDI:      number | null;
    volumeRatio:  number | null;
    trend:        string;
    support:      { price: number }[];
    resistance:   { price: number }[];
    fibLevels:    { label: string; price: number; pct: number }[] | null;
    lastPattern:  { name: string; direction: string } | null;
    pctFromMa20:  number | null;
    pctFromMa50:  number | null;
    pctFromMa200: number | null;
    dataPoints:   number;
  };
  fundamentals: {
    name:       string | null;
    exchange:   string | null;
    industry:   string | null;
    marketCap:  number | null;
    peRatio:    number | null;
    beta:       number | null;
    week52High: number | null;
    week52Low:  number | null;
  };
  recentNews:  { headline: string; source: string; date: string }[];
  analysis:    AnalysisOutput;
  meta: {
    cachedAt:      number;
    fromCache:     boolean;
    exchangeNote:  string;
    dataPoints:    number;
  };
}

// ── Build data prompt for AI ───────────────────────────────────────────────

function n(v: number | null, decimals = 2): string {
  return v != null ? v.toFixed(decimals) : "N/A";
}

function buildDataPrompt(
  ticker: string,
  tf: Timeframe,
  quote: AnalysisResponse["quote"],
  ind: ReturnType<typeof computeIndicators>,
  fund: AnalysisResponse["fundamentals"],
  news: AnalysisResponse["recentNews"],
): string {
  const p = quote.price;
  const sign = quote.changePct >= 0 ? "+" : "";

  const lines: string[] = [
    `=== ${ticker} · CHART ANALYSIS DATA · Timeframe: ${tf} · Fetched: ${new Date().toUTCString()} ===`,
    "",
    "── QUOTE ──",
    `Current Price: $${p.toFixed(2)} (${sign}${quote.changePct.toFixed(2)}% today)`,
    `Day Range: $${quote.low.toFixed(2)} – $${quote.high.toFixed(2)}`,
    `Prev Close: $${quote.prevClose.toFixed(2)}`,
    "",
    "── FUNDAMENTALS ──",
    `Company: ${fund.name ?? "N/A"} | Exchange: ${fund.exchange ?? "N/A"} | Industry: ${fund.industry ?? "N/A"}`,
    `Market Cap: ${fund.marketCap ? "$" + (fund.marketCap / 1000).toFixed(1) + "B" : "N/A"}`,
    `P/E TTM: ${n(fund.peRatio)}x | Beta: ${n(fund.beta)}`,
    `52-Week: $${n(fund.week52Low)} – $${n(fund.week52High)}`,
    "",
    "── COMPUTED TECHNICAL INDICATORS (from real price history) ──",
    `MA20:  ${n(ind.ma20)} | Distance: ${ind.pctFromMa20 != null ? (ind.pctFromMa20 >= 0 ? "+" : "") + ind.pctFromMa20.toFixed(2) + "%" : "N/A"}`,
    `MA50:  ${n(ind.ma50)} | Distance: ${ind.pctFromMa50 != null ? (ind.pctFromMa50 >= 0 ? "+" : "") + ind.pctFromMa50.toFixed(2) + "%" : "N/A"}`,
    `MA200: ${n(ind.ma200)} | Distance: ${ind.pctFromMa200 != null ? (ind.pctFromMa200 >= 0 ? "+" : "") + ind.pctFromMa200.toFixed(2) + "%" : "N/A"}`,
    `RSI-14: ${n(ind.rsi14)} (>70=overbought, <30=oversold)`,
    `ATR-14: ${n(ind.atr14)} (daily volatility range, ${ind.atr14 && p ? ((ind.atr14 / p) * 100).toFixed(2) + "% of price" : "N/A"})`,
    `ADX-14: ${n(ind.adx14)} (>25=trending, <20=choppy) | +DI: ${n(ind.plusDI)} | -DI: ${n(ind.minusDI)}`,
    `Trend Structure: ${ind.trend}`,
    `Volume: last=${ind.lastVolume ? ind.lastVolume.toLocaleString() : "N/A"} | 20-period avg=${ind.avgVolume20 ? ind.avgVolume20.toFixed(0) : "N/A"} | Ratio: ${ind.volumeRatio != null ? ind.volumeRatio.toFixed(2) + "x" : "N/A"}`,
    `Data Points: ${ind.dataPoints} candles`,
    `Last Candle Pattern: ${ind.lastPattern ? ind.lastPattern.name + " (" + ind.lastPattern.direction + ")" : "No clear pattern"}`,
    "",
    "── SUPPORT LEVELS (from swing lows, below current price) ──",
    ind.support.length > 0
      ? ind.support.map(s => `  $${s.price.toFixed(2)}`).join(", ")
      : "  None detected in this range",
    "",
    "── RESISTANCE LEVELS (from swing highs, above current price) ──",
    ind.resistance.length > 0
      ? ind.resistance.map(r => `  $${r.price.toFixed(2)}`).join(", ")
      : "  None detected in this range",
    "",
    "── FIBONACCI RETRACEMENT (recent swing high → low range) ──",
  ];

  if (ind.fibLevels) {
    for (const f of ind.fibLevels) {
      lines.push(`  ${f.label} → $${f.price.toFixed(2)}`);
    }
  } else {
    lines.push("  Insufficient data for Fibonacci");
  }

  if (news.length > 0) {
    lines.push("", "── RECENT NEWS (last 7 days) ──");
    news.forEach((n, i) => lines.push(`  ${i + 1}. "${n.headline}" — ${n.source} (${n.date})`));
  }

  lines.push("", `=== END DATA ===`);
  return lines.join("\n");
}

// ── AI system prompt ──────────────────────────────────────────────────────

const SYSTEM_PROMPT = `คุณคือ Martin — นักวิเคราะห์ทางเทคนิคระดับ senior ประจำ InvestMart
งานของคุณ: ผลิต Chart Analysis ที่มีโครงสร้าง มีคุณภาพสูง ซื่อสัตย์ และ grounded จากข้อมูลจริงที่ให้มา

กฎเหล็ก (ละเมิดไม่ได้):
1. ตัวเลขทุกตัว (ราคา, ระดับ, indicator) ต้องมาจาก DATA ที่ให้มาเท่านั้น ห้ามแต่งหรือเดา
2. ค่า N/A → ระบุว่า "ไม่มีข้อมูล" แล้วลด confidence
3. entry/stop/target ต้องอิงจาก support, resistance, ATR, หรือ Fibonacci levels ที่มีในข้อมูล ห้ามใช้ตัวเลขสุ่ม
4. isHighRisk=true ถ้า: ATR/price > 5%, RSI > 85 หรือ < 15, หรือราคาขึ้น/ลง > 50% ใน timeframe ที่วิเคราะห์ → ต้องระบุเหตุผลชัดเจน
5. เสนอทั้ง bull + bear อย่างซื่อสัตย์ — ห้ามเอนเอียงข้างเดียว
6. ห้ามพูดว่า "แน่นอน" หรือ "ต้องขึ้น/ต้องลง" — ใช้ภาษา probabilistic เสมอ
7. คำตอบทั้งหมดเป็นภาษาไทย (ชื่อ pattern, indicator ใช้ภาษาอังกฤษได้)

ตอบด้วย JSON เท่านั้น ตาม schema ด้านล่างนี้ ไม่มี markdown หรือ text นอก JSON:`;

const JSON_SCHEMA = `
{
  "summary": "2–4 ประโยค: ภาพรวมกราฟ ณ ปัจจุบัน, ข้อสังเกตสำคัญ (เช่น extreme move, volume surge, position vs MA), framing ความเสี่ยง 1 ประโยค",
  "trendStructure": "อธิบาย trend structure: จริงๆ แล้วนี่คือ trend แท้ หรือแค่ spike ชั่วคราว? ตำแหน่งราคา vs MA, Fib level สำคัญ, pattern ที่พบ (ถ้ามี)",
  "bullishSignals": [
    { "label": "ชื่อ signal", "value": "ค่าตัวเลขจริง", "detail": "อธิบาย why this is bullish" }
  ],
  "bearishSignals": [
    { "label": "ชื่อ signal", "value": "ค่าตัวเลขจริง", "detail": "อธิบาย why this is bearish" }
  ],
  "volumeRead": "ประเมิน volume: ปริมาณ vs เฉลี่ย, confirmation หรือ divergence, สิ่งที่ volume บอก",
  "volatilityNote": "ประเมิน ATR และ volatility: ค่า ATR เป็น % ของราคา, ผลต่อ stop size, ความเสี่ยง",
  "scenarios": [
    {
      "direction": "bullish",
      "variation": "aggressive",
      "entryTrigger": "เงื่อนไขและราคา entry ที่ชัดเจน มาจาก level จริง",
      "entryPrice": 0.0,
      "stop": 0.0,
      "targets": [0.0, 0.0],
      "rr": "1:X",
      "confidence": "medium",
      "bestFor": "เหมาะกับใคร/สไตล์การเทรดแบบไหน",
      "whatToExpect": "คาดการณ์ถ้า scenario นี้เกิดขึ้น"
    },
    {
      "direction": "bullish",
      "variation": "conservative",
      "entryTrigger": "...",
      "entryPrice": 0.0,
      "stop": 0.0,
      "targets": [0.0, 0.0],
      "rr": "1:X",
      "confidence": "medium",
      "bestFor": "...",
      "whatToExpect": "..."
    },
    {
      "direction": "bearish",
      "variation": "aggressive",
      "entryTrigger": "...",
      "entryPrice": 0.0,
      "stop": 0.0,
      "targets": [0.0, 0.0],
      "rr": "1:X",
      "confidence": "low",
      "bestFor": "...",
      "whatToExpect": "..."
    },
    {
      "direction": "bearish",
      "variation": "conservative",
      "entryTrigger": "...",
      "entryPrice": 0.0,
      "stop": 0.0,
      "targets": [0.0, 0.0],
      "rr": "1:X",
      "confidence": "low",
      "bestFor": "...",
      "whatToExpect": "..."
    }
  ],
  "noTradeZone": {
    "range": "ช่วงราคาที่ risk/reward แย่หรือ chop สูง เช่น $X – $Y",
    "reason": "เหตุผล 1 ประโยค"
  },
  "managementNote": "วิธี trail stop, exit discipline, สิ่งที่ต้องทำเมื่อ thesis เริ่มพัง",
  "bullishInvalidation": "ราคา/เหตุการณ์เฉพาะที่จะพิสูจน์ว่า bull thesis ผิด",
  "bearishInvalidation": "ราคา/เหตุการณ์เฉพาะที่จะพิสูจน์ว่า bear thesis ผิด",
  "chartSays": "สรุปสิ่งที่กราฟบอกจริงๆ: trend structure, Fib/MA levels สำคัญ, pattern — พร้อม caveat ว่า pattern ไม่ใช่ guarantee",
  "keyLesson": "บทเรียน/discipline note สั้นๆ สำหรับ setup นี้ — เน้น risk management",
  "disclaimer": "การวิเคราะห์นี้เป็นการศึกษาทางเทคนิคเท่านั้น ตัวเลขและระดับราคาทั้งหมดมาจากข้อมูลที่ดึงมาจริง ไม่ใช่คำแนะนำการลงทุน การวิเคราะห์ทางเทคนิคเป็นการประมาณความน่าจะเป็น ไม่ใช่ความแน่นอน",
  "isHighRisk": false,
  "highRiskReason": "ระบุเหตุผลถ้า isHighRisk=true มิฉะนั้นเว้นว่าง"
}`;

// ── Core analysis builder ────────────────────────────────────────────────

async function buildAnalysis(
  ticker: string,
  tf: Timeframe,
  apiKey: string,
): Promise<AnalysisResponse> {
  const base = "https://finnhub.io/api/v1";
  const tok  = `token=${apiKey}`;
  const ago7 = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);

  // Parallel fetches
  const [candles, quoteR, metR, newsR, profileR] = await Promise.all([
    fetchHistory(ticker, tf),
    fetchJson<FinnhubQuote>(`${base}/quote?symbol=${ticker}&${tok}`),
    fetchJson<FinnhubMetric>(`${base}/stock/metric?symbol=${ticker}&metric=all&${tok}`),
    fetchJson<FinnhubNews[]>(`${base}/company-news?symbol=${ticker}&from=${ago7}&to=${today}&${tok}`),
    fetchJson<FinnhubProfile>(`${base}/stock/profile2?symbol=${ticker}&${tok}`),
  ]);

  const m = metR?.metric ?? null;

  const quote: AnalysisResponse["quote"] = quoteR
    ? { price: quoteR.c, change: quoteR.d, changePct: quoteR.dp, high: quoteR.h, low: quoteR.l, prevClose: quoteR.pc }
    : { price: 0, change: 0, changePct: 0, high: 0, low: 0, prevClose: 0 };

  const fund: AnalysisResponse["fundamentals"] = {
    name:       profileR?.name       ?? null,
    exchange:   profileR?.exchange   ?? null,
    industry:   profileR?.finnhubIndustry ?? null,
    marketCap:  m?.marketCapitalization ?? null,
    peRatio:    m?.peBasicExclExtraTTM  ?? null,
    beta:       m?.beta                 ?? null,
    week52High: m?.["52WeekHigh"]       ?? null,
    week52Low:  m?.["52WeekLow"]        ?? null,
  };

  const recentNews = (newsR ?? []).slice(0, 5).map(n => ({
    headline: n.headline,
    source:   n.source,
    date:     new Date(n.datetime * 1000).toLocaleDateString("th-TH"),
  }));

  if (candles.length < 15) {
    throw new Error(`ข้อมูลราคาไม่เพียงพอ (${candles.length} candles) สำหรับการวิเคราะห์`);
  }

  const ind = computeIndicators(candles);

  const dataPrompt = buildDataPrompt(ticker, tf, quote, ind, fund, recentNews);

  const userMsg = `วิเคราะห์กราฟ ${ticker} timeframe ${tf} จากข้อมูลด้านล่างนี้\n\n${dataPrompt}\n\nSchema ที่ต้องตอบ:\n${JSON_SCHEMA}`;

  const raw = await generateText(userMsg, SYSTEM_PROMPT, {
    maxTokens:   4000, // schema response easily exceeds 2000 tokens when complete
    temperature: 0.2,
    // No jsonMode: rely on prompt. jsonMode can cause empty responses on some providers.
  });

  let analysis: AnalysisOutput;
  try {
    const cleaned = extractJson(raw);
    analysis = JSON.parse(cleaned) as AnalysisOutput;
  } catch (e) {
    const preview = raw?.slice(0, 150) ?? "(empty)";
    console.error(`[analyze/${ticker}] JSON extract failed. Raw preview: ${preview}`);
    throw new Error(`AI ส่งข้อมูลในรูปแบบที่ไม่ถูกต้อง — ${e instanceof Error ? e.message.slice(0, 80) : "parse error"}`);
  }

  return {
    ticker,
    timeframe: tf,
    quote,
    indicators: {
      ma20:         ind.ma20,
      ma50:         ind.ma50,
      ma200:        ind.ma200,
      rsi14:        ind.rsi14,
      atr14:        ind.atr14,
      adx14:        ind.adx14,
      plusDI:       ind.plusDI,
      minusDI:      ind.minusDI,
      volumeRatio:  ind.volumeRatio,
      trend:        ind.trend,
      support:      ind.support.map(s => ({ price: s.price })),
      resistance:   ind.resistance.map(r => ({ price: r.price })),
      fibLevels:    ind.fibLevels,
      lastPattern:  ind.lastPattern,
      pctFromMa20:  ind.pctFromMa20,
      pctFromMa50:  ind.pctFromMa50,
      pctFromMa200: ind.pctFromMa200,
      dataPoints:   ind.dataPoints,
    },
    fundamentals: fund,
    recentNews,
    analysis,
    meta: {
      cachedAt:    Date.now(),
      fromCache:   false,
      exchangeNote: tf === "3M" || tf === "1Y"
        ? "ข้อมูลราคาอาจล่าช้า 15 นาที (Yahoo Finance delayed)"
        : "ข้อมูลรายสัปดาห์จาก Yahoo Finance",
      dataPoints:  candles.length,
    },
  };
}

// ── Route handler ─────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> },
): Promise<NextResponse> {
  const { ticker: rawTicker } = await params;
  const ticker = rawTicker.toUpperCase();

  if (!TICKER_RE.test(ticker)) {
    return NextResponse.json({ error: "invalid ticker" }, { status: 400 });
  }

  const tf = (request.nextUrl.searchParams.get("timeframe") ?? "3M") as Timeframe;
  if (!VALID_TIMEFRAMES.includes(tf)) {
    return NextResponse.json({ error: "invalid timeframe" }, { status: 400 });
  }

  const refresh = request.nextUrl.searchParams.get("refresh") === "true";

  const hasAi = !!(
    process.env.CEREBRAS_API_KEY ||
    process.env.GROQ_API_KEY ||
    process.env.NVIDIA_NIM_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.LOCAL_AI_BASE_URL
  );
  const finnhubKey = process.env.FINNHUB_API_KEY;

  if (!hasAi || !finnhubKey) {
    return NextResponse.json({ error: "AI or Finnhub not configured" }, { status: 503 });
  }

  const key = cacheKey(ticker, tf);

  // L1: in-process memory cache
  if (!refresh) {
    const hit = cache.get(key);
    if (hit && Date.now() - hit.cachedAt < ANALYSIS_TTL_MS) {
      return NextResponse.json({ ...hit.data, meta: { ...hit.data.meta, fromCache: true } });
    }

    // L2: DB cache — survives cold starts and new instances
    try {
      const dbRow = await prisma.siteCache.findUnique({ where: { key: `analyze:${key}` } });
      if (dbRow) {
        const stored = dbRow.value as unknown as { data: AnalysisResponse; cachedAt: number };
        if (stored?.data && Date.now() - stored.cachedAt < DB_TTL_MS) {
          cache.set(key, { data: stored.data, cachedAt: stored.cachedAt });
          return NextResponse.json({ ...stored.data, meta: { ...stored.data.meta, fromCache: true } });
        }
      }
    } catch { /* DB miss — proceed to generate */ }
  }

  // Deduplicate in-flight requests for same ticker+timeframe
  const existing = inflight.get(key);
  if (existing) {
    try {
      const data = await existing;
      return NextResponse.json({ ...data, meta: { ...data.meta, fromCache: true } });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Analysis failed" },
        { status: 500 },
      );
    }
  }

  const promise = buildAnalysis(ticker, tf, finnhubKey);
  inflight.set(key, promise);

  try {
    const data = await promise;
    cache.set(key, { data, cachedAt: Date.now() });
    inflight.delete(key);
    // Persist to DB (fire-and-forget)
    const payload = { data, cachedAt: Date.now() } as unknown as import("@prisma/client").Prisma.InputJsonValue;
    prisma.siteCache.upsert({
      where:  { key: `analyze:${key}` },
      update: { value: payload },
      create: { key: `analyze:${key}`, value: payload },
    }).catch(() => { /* non-critical */ });
    return NextResponse.json(data);
  } catch (err) {
    inflight.delete(key);
    const msg = err instanceof Error ? err.message : "Analysis failed";
    console.error(`[analyze/${ticker}]`, msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
