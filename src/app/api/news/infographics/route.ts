import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { z } from "zod";

export const dynamic    = "force-dynamic"; // run fresh; Next.js fetch() cache handles 4h TTL internally
export const revalidate = 14400;

const GROQ_MODEL    = "llama-3.3-70b-versatile";
const MAX_ARTICLES  = 10;
const MAX_CARDS     = 8;
const TICKER_RE     = /^[A-Z]{1,5}$/;

// ─── Zod schema ──────────────────────────────────────────────────────────────

const CardSchema = z.object({
  headline_th: z.string().min(1).max(120),
  key_facts:   z.array(z.string().min(1)).min(1).max(4),
  ticker:      z.union([z.string().regex(TICKER_RE), z.null()]).catch(null),
  category:    z.enum(["earnings", "product", "ma", "macro", "disaster", "regulatory", "other"]).catch("other"),
  sentiment:   z.enum(["positive", "negative", "neutral"]).catch("neutral"),
  icon_hint:   z.enum(["chart", "chip", "globe", "warning", "gavel", "money", "rocket", "oil", "bank", "car"]).catch("chart"),
  source_name: z.string().min(1),
  source_url:  z.string().min(10), // accept any non-empty URL string
});

const ResponseSchema = z.object({
  cards: z.array(CardSchema).max(MAX_CARDS),
});

export type InfographicCard = z.infer<typeof CardSchema> & {
  id:           string;
  ticker_move:  number | null;
  generated_at: number;
};

export interface InfographicsResponse {
  cards:        InfographicCard[];
  generated_at: number;
}

// ─── Finnhub types ───────────────────────────────────────────────────────────

interface FinnhubArticle {
  id:       number;
  headline: string;
  source:   string;
  url:      string;
  datetime: number;
  summary:  string;
}

interface FinnhubQuote { c: number; pc: number; }

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function fetchNewsArticles(apiKey: string): Promise<FinnhubArticle[]> {
  const [generalRes, mergerRes] = await Promise.allSettled([
    fetch(`https://finnhub.io/api/v1/news?category=general&token=${apiKey}`,
      { signal: AbortSignal.timeout(6000) }),
    fetch(`https://finnhub.io/api/v1/news?category=merger&token=${apiKey}`,
      { signal: AbortSignal.timeout(6000) }),
  ]);

  const parse = async (r: PromiseSettledResult<Response>): Promise<FinnhubArticle[]> => {
    if (r.status === "rejected" || !r.value.ok) return [];
    const raw = (await r.value.json()) as unknown;
    return Array.isArray(raw) ? (raw as FinnhubArticle[]) : [];
  };

  const [general, merger] = await Promise.all([parse(generalRes), parse(mergerRes)]);
  const seen = new Set<number>();

  return [...general, ...merger]
    .filter(a => {
      if (!a.headline || !a.url || seen.has(a.id)) return false;
      seen.add(a.id);
      return true;
    })
    .sort((a, b) => b.datetime - a.datetime)
    .slice(0, MAX_ARTICLES);
}

async function fetchTickerMove(ticker: string, apiKey: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(ticker)}&token=${apiKey}`,
      { signal: AbortSignal.timeout(3000) }
    );
    if (!res.ok) return null;
    const q = (await res.json()) as FinnhubQuote;
    if (!q.c || !q.pc || q.pc === 0) return null;
    return ((q.c - q.pc) / q.pc) * 100;
  } catch {
    return null;
  }
}

const SYSTEM_PROMPT = `คุณคือผู้สร้างข้อมูล infographic สำหรับ InvestMart แอปหุ้นไทย

รับข่าวการเงินมาแล้วสร้างข้อมูล infographic card สำหรับข่าวสำคัญ

ส่งคืนเฉพาะ JSON object: { "cards": [...] }

แต่ละ card:
{
  "headline_th": "หัวข่าวภาษาไทยของเราเอง (ไม่เกิน 12 คำ ข้อเท็จจริง)",
  "key_facts": ["ข้อเท็จจริง 1", "ข้อเท็จจริง 2"],
  "ticker": "AAPL" หรือ null,
  "category": "earnings" | "product" | "ma" | "macro" | "disaster" | "regulatory" | "other",
  "sentiment": "positive" | "negative" | "neutral",
  "icon_hint": "chart" | "chip" | "globe" | "warning" | "gavel" | "money" | "rocket" | "oil" | "bank" | "car",
  "source_name": "ชื่อแหล่งข่าวตรงๆ",
  "source_url": "URL ต้นฉบับ"
}

กฎเหล็ก:
- headline_th และ key_facts เป็นภาษาไทยเท่านั้น
- ใช้คำพูดของตัวเอง ห้ามคัดลอกจากต้นฉบับ
- จากข้อมูลที่มีเท่านั้น ห้ามแต่งรายละเอียด
- ไม่แนะนำซื้อขาย ไม่ทำนายราคา
- 5-8 cards`;

async function generateCards(
  articles: FinnhubArticle[],
  apiKey: string
): Promise<z.infer<typeof CardSchema>[]> {
  const articleList = articles
    .map((a, i) =>
      `[${i + 1}] แหล่ง: ${a.source}\nURL: ${a.url}\nหัวข่าว: ${a.headline}${
        a.summary ? `\nเนื้อหา: ${a.summary.slice(0, 200)}` : ""
      }`
    )
    .join("\n\n");

  const groq   = new Groq({ apiKey });
  const result = await groq.chat.completions.create({
    model:           GROQ_MODEL,
    messages:        [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user",   content: articleList   },
    ],
    response_format: { type: "json_object" },
    max_tokens:      1500,
    temperature:     0.3,
  });

  const text = result.choices[0]?.message?.content?.trim() ?? "{}";
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return [];
  }

  const validated = ResponseSchema.safeParse(parsed);
  return validated.success ? validated.data.cards : [];
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(): Promise<NextResponse> {
  const apiKey = process.env.FINNHUB_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;

  if (!apiKey || !groqKey) {
    return NextResponse.json({ error: "API not configured" }, { status: 503 });
  }

  try {
    const articles = await fetchNewsArticles(apiKey);
    if (articles.length === 0) {
      return NextResponse.json({ cards: [], generated_at: Date.now() });
    }

    const rawCards = await generateCards(articles, groqKey);
    if (rawCards.length === 0) {
      return NextResponse.json({ cards: [], generated_at: Date.now() });
    }

    // Batch-fetch quote moves for all unique, valid tickers
    const tickers = [...new Set(rawCards.map(c => c.ticker).filter((t): t is string => t !== null))];
    const moves   = await Promise.all(tickers.map(t => fetchTickerMove(t, apiKey)));
    const moveMap = Object.fromEntries(tickers.map((t, i) => [t, moves[i]]));

    const now = Date.now();
    const cards: InfographicCard[] = rawCards.map((c, i) => ({
      ...c,
      id:           `inf-${now}-${i}`,
      ticker_move:  c.ticker ? (moveMap[c.ticker] ?? null) : null,
      generated_at: now,
    }));

    return NextResponse.json(
      { cards, generated_at: now } satisfies InfographicsResponse,
      { headers: { "Cache-Control": "public, s-maxage=14400, stale-while-revalidate=28800" } }
    );
  } catch {
    return NextResponse.json({ error: "generation failed" }, { status: 503 });
  }
}
