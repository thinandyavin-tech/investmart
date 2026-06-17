/**
 * Playbook Scorecard — rates a stock against the 7-pillar Thematic Growth framework.
 * Each pillar gets a grounded read from real fundamentals + Martin AI analysis.
 * Framing: observational expectations assessment, never buy/sell advice.
 */

import { NextRequest, NextResponse } from "next/server";
import { z }                         from "zod";
import { generateText }              from "@/lib/aiService";
import { applyRateLimit }            from "@/lib/rateLimit";

export const dynamic  = "force-dynamic";
export const maxDuration = 60;

const TICKER_RE = /^[A-Z][A-Z.\-]{0,9}$/;
const CACHE_TTL = 30 * 60_000;

const QuerySchema = z.object({
  ticker: z.string().regex(TICKER_RE),
  locale: z.enum(["en", "th"]).default("en"),
});

export type PillarRating = "Strong" | "Mixed" | "Weak" | "N/A";

export interface PillarScore {
  pillar:    number;
  title:     string;
  titleTh:   string;
  rating:    PillarRating;
  summary:   string;       // 2–3 sentences, grounded, observational
  dataUsed:  string[];     // e.g. ["Revenue CAGR 3Y: 122%", "Gross margin: 72%"]
  caveat:    string;
}

export interface ScorecardResult {
  ticker:         string;
  name:           string | null;
  industry:       string | null;
  price:          number | null;
  generatedAt:    string;
  locale:         string;
  pillars:        PillarScore[];
  disclaimer:     string;
  dataSource:     string;
}

// ── Cache ─────────────────────────────────────────────────────────────────────

const cache    = new Map<string, { data: ScorecardResult; at: number }>();
const inflight = new Map<string, Promise<ScorecardResult>>();

// ── Finnhub fetch ─────────────────────────────────────────────────────────────

interface FinnhubQuote   { c: number; dp: number; }
interface FinnhubProfile { name?: string; finnhubIndustry?: string; shareOutstanding?: number; marketCapitalization?: number; }
interface FinnhubMetric  {
  revenueTTM?:            number;
  revenueGrowth3Y?:       number;
  revenue3YGrowth?:       number;
  epsGrowth3Y?:           number;
  grossMarginTTM?:        number;
  netMarginTTM?:          number;
  netProfitMarginTTM?:    number;
  roeTTM?:                number;
  roicTTM?:               number;
  peBasicExclExtraTTM?:   number;
  pbAnnual?:              number;
  enterpriseValue?:       number;
  marketCapitalization?:  number;
  beta?:                  number;
  "52WeekHigh"?:          number;
  "52WeekLow"?:           number;
  "totalDebt/totalEquityAnnual"?: number;
  revenueGrowthQuarterlyYoy?:     number;
  [k: string]: unknown;
}
interface FinnhubPriceTarget { targetMedian?: number; targetMean?: number; }

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch { return null; }
}

function pct(v: number | null | undefined): number | null {
  if (v == null) return null;
  return Math.abs(v) <= 2 ? v * 100 : v;
}

function fmt(v: number | null | undefined, suffix = "%", dec = 1): string {
  return v != null ? `${v.toFixed(dec)}${suffix}` : "N/A";
}

// ── Scorecard builder ─────────────────────────────────────────────────────────

async function buildScorecard(ticker: string, locale: string): Promise<ScorecardResult> {
  const key = process.env.FINNHUB_API_KEY ?? "";
  const b   = "https://finnhub.io/api/v1";
  const sym = encodeURIComponent(ticker);
  const tok = `token=${key}`;

  const [qR, mR, pR, ptR] = await Promise.allSettled([
    fetchJson<FinnhubQuote>(`${b}/quote?symbol=${sym}&${tok}`),
    fetchJson<{ metric?: FinnhubMetric }>(`${b}/stock/metric?symbol=${sym}&metric=all&${tok}`),
    fetchJson<FinnhubProfile>(`${b}/stock/profile2?symbol=${sym}&${tok}`),
    fetchJson<FinnhubPriceTarget>(`${b}/stock/price-target?symbol=${sym}&${tok}`),
  ]);

  const q  = qR.status  === "fulfilled" ? qR.value  : null;
  const m  = mR.status  === "fulfilled" ? mR.value?.metric ?? null : null;
  const p  = pR.status  === "fulfilled" ? pR.value  : null;
  const pt = ptR.status === "fulfilled" ? ptR.value : null;

  const price   = q?.c ?? null;
  const name    = p?.name ?? null;
  const industry = p?.finnhubIndustry ?? null;
  const mcapM   = p?.marketCapitalization ?? m?.marketCapitalization ?? null;
  const mcapB   = mcapM != null ? mcapM / 1000 : null;

  const revGrowth3Y  = pct(m?.revenueGrowth3Y ?? m?.revenue3YGrowth);
  const epsGrowth3Y  = pct(m?.epsGrowth3Y);
  const grossMargin  = pct(m?.grossMarginTTM);
  const netMargin    = pct(m?.netMarginTTM ?? m?.netProfitMarginTTM);
  const roe          = pct(m?.roeTTM);
  const roic         = pct(m?.roicTTM);
  const pe           = m?.peBasicExclExtraTTM ?? null;
  const beta         = m?.beta ?? null;
  const debt_equity  = m?.["totalDebt/totalEquityAnnual"] ?? null;
  const evB          = m?.enterpriseValue != null ? m.enterpriseValue / 1000 : (mcapB ?? null);
  const revB         = m?.revenueTTM      != null ? m.revenueTTM / 1000       : null;
  const evSales      = evB != null && revB != null && revB > 0 ? evB / revB : null;
  const analystT     = pt?.targetMedian ?? pt?.targetMean ?? null;
  const w52hi        = m?.["52WeekHigh"] ?? null;
  const w52lo        = m?.["52WeekLow"]  ?? null;
  const drawdown     = (w52hi && price) ? ((price - w52hi) / w52hi) * 100 : null;

  // Assemble data context for Martin
  const dataContext = [
    `Ticker: ${ticker}`, `Name: ${name ?? "N/A"}`, `Industry: ${industry ?? "N/A"}`,
    `Price: ${price != null ? `$${price.toFixed(2)}` : "N/A"}`,
    `Market Cap: ${mcapB != null ? `$${mcapB.toFixed(1)}B` : "N/A"}`,
    `EV: ${evB != null ? `$${evB.toFixed(1)}B` : "N/A"}`,
    `EV/Sales: ${evSales != null ? `${evSales.toFixed(1)}×` : "N/A"}`,
    `Revenue TTM: ${revB != null ? `$${revB.toFixed(1)}B` : "N/A"}`,
    `Revenue Growth 3Y CAGR: ${fmt(revGrowth3Y)}`,
    `EPS Growth 3Y CAGR: ${fmt(epsGrowth3Y)}`,
    `Gross Margin TTM: ${fmt(grossMargin)}`,
    `Net Margin TTM: ${fmt(netMargin)}`,
    `ROE TTM: ${fmt(roe)}`,
    `ROIC TTM: ${fmt(roic)}`,
    `P/E (TTM): ${pe != null ? `${pe.toFixed(1)}×` : "N/A"}`,
    `Beta: ${beta != null ? beta.toFixed(2) : "N/A"}`,
    `Debt/Equity: ${debt_equity != null ? debt_equity.toFixed(2) : "N/A"}`,
    `Analyst Target: ${analystT != null ? `$${analystT.toFixed(2)}` : "N/A"}`,
    `52-Wk High: ${w52hi != null ? `$${w52hi.toFixed(2)}` : "N/A"}`,
    `Drawdown from 52-Wk High: ${drawdown != null ? `${drawdown.toFixed(1)}%` : "N/A"}`,
  ].join("\n");

  const isEn = locale === "en";

  const systemPrompt = `You are Martin, InvestMart's educational AI assistant. You apply a thematic growth / GARP framework to assess a stock across 7 pillars. You are observational and probabilistic — never buy/sell advice. If data is missing say N/A. Return VALID JSON only — no markdown, no prose outside JSON.`;

  const userPrompt = `REAL FUNDAMENTALS for ${ticker} (use exactly as shown, never fabricate):
${dataContext}

Output strict JSON with this exact shape (7 pillars):
{
  "pillars": [
    { "pillar": 1, "title": "Theme + Runway", "titleTh": "ธีมและ Runway", "rating": "Strong|Mixed|Weak|N/A", "summary": "2-3 sentences grounded in data. Observational.", "dataUsed": ["figures used"], "caveat": "one honest caveat" },
    { "pillar": 2, "title": "Moat", "titleTh": "ความได้เปรียบแข่งขัน (Moat)", "rating": "...", "summary": "...", "dataUsed": [], "caveat": "..." },
    { "pillar": 3, "title": "Founder-Led / Execution", "titleTh": "ผู้นำและการดำเนินงาน", "rating": "...", "summary": "...", "dataUsed": [], "caveat": "..." },
    { "pillar": 4, "title": "Growth + Quality", "titleTh": "การเติบโตและคุณภาพ", "rating": "...", "summary": "...", "dataUsed": [], "caveat": "..." },
    { "pillar": 5, "title": "Valuation (What's Priced In)", "titleTh": "มูลค่า (ตลาดตั้งราคาอะไรไว้)", "rating": "...", "summary": "...", "dataUsed": [], "caveat": "..." },
    { "pillar": 6, "title": "Entry: DCA + Technical Levels", "titleTh": "จังหวะเข้า: DCA + แนวเทคนิค", "rating": "...", "summary": "...", "dataUsed": [], "caveat": "..." },
    { "pillar": 7, "title": "Risk & Survival", "titleTh": "ความเสี่ยงและการรอดชีวิต", "rating": "...", "summary": "...", "dataUsed": [], "caveat": "..." }
  ],
  "disclaimer": "${isEn ? "Educational expectations assessment — not investment advice. Verify all data independently." : "การศึกษาเท่านั้น ไม่ใช่คำแนะนำลงทุน ตรวจสอบข้อมูลก่อนใช้"}"
}

Respond summaries and caveats in ${isEn ? "English" : "Thai"}. Be concise. Never invent numbers not in the data. Never say buy/sell.`;

  const raw = await generateText(userPrompt, systemPrompt, { maxTokens: 1800 });

  let pillars: PillarScore[];
  let disclaimer = isEn
    ? "This scorecard is an educational expectations assessment, not investment advice."
    : "Scorecard นี้เป็นการศึกษาเท่านั้น ไม่ใช่คำแนะนำลงทุน";

  try {
    const jsonStart = raw.indexOf("{");
    const jsonEnd   = raw.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) throw new Error("no json");
    const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1)) as {
      pillars: PillarScore[];
      disclaimer?: string;
    };
    pillars    = parsed.pillars ?? [];
    disclaimer = parsed.disclaimer ?? disclaimer;
  } catch {
    // Fallback: build N/A pillars
    const PILLAR_DEFS = [
      { n: 1, en: "Theme + Runway",              th: "ธีมและ Runway" },
      { n: 2, en: "Moat",                        th: "ความได้เปรียบแข่งขัน" },
      { n: 3, en: "Founder-Led / Execution",      th: "ผู้นำและการดำเนินงาน" },
      { n: 4, en: "Growth + Quality",             th: "การเติบโตและคุณภาพ" },
      { n: 5, en: "Valuation (What's Priced In)", th: "มูลค่า" },
      { n: 6, en: "Entry: DCA + Technical Levels", th: "จังหวะเข้า" },
      { n: 7, en: "Risk & Survival",              th: "ความเสี่ยง" },
    ];
    pillars = PILLAR_DEFS.map(d => ({
      pillar: d.n, title: d.en, titleTh: d.th, rating: "N/A" as PillarRating,
      summary: "Analysis unavailable — AI response could not be parsed.",
      dataUsed: [], caveat: "Retry or check AI service status.",
    }));
  }

  return {
    ticker, name, industry, price,
    generatedAt: new Date().toISOString(),
    locale, pillars, disclaimer,
    dataSource: "Finnhub (quote + profile + metrics + price targets) · Damodaran WACC table",
  };
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  const limited = await applyRateLimit(request, "ai");
  if (limited) return limited;

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "API not configured" }, { status: 503 });

  const raw    = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = QuerySchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "invalid params" }, { status: 422 });

  const { ticker, locale } = parsed.data;
  const cacheKey = `${ticker}-${locale}`;

  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_TTL) return NextResponse.json(hit.data);

  const existing = inflight.get(cacheKey);
  if (existing) return NextResponse.json(await existing);

  const promise = buildScorecard(ticker, locale).then(data => {
    cache.set(cacheKey, { data, at: Date.now() });
    inflight.delete(cacheKey);
    return data;
  }).catch(err => { inflight.delete(cacheKey); throw err; });

  inflight.set(cacheKey, promise);

  try {
    return NextResponse.json(await promise);
  } catch {
    return NextResponse.json({ error: "scorecard generation failed" }, { status: 500 });
  }
}
