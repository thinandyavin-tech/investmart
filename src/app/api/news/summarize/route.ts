import { createHash }          from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { generateText }   from "@/lib/aiService";
import { applyRateLimit } from "@/lib/rateLimit";
import { stripHtml }      from "@/lib/newsUtils";
import { prisma }         from "@/lib/prisma";

const MAX_HEADLINE = 300;
const MAX_SNIPPET  = 500;
// 24-hour TTL — an article summary doesn't change
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface SummaryValue { summary: string; _ts: number }

function dbKey(hash: string): string { return `news_summary_v1_${hash}`; }

function contentHash(headline: string, snippet: string): string {
  return createHash("sha256").update(`${headline}\0${snippet}`).digest("hex");
}

async function loadSummary(hash: string): Promise<string | null> {
  try {
    const row = await prisma.siteCache.findUnique({ where: { key: dbKey(hash) } });
    if (!row) return null;
    const v = row.value as unknown as SummaryValue;
    if (!v?._ts || !v.summary) return null;
    if (Date.now() - v._ts > CACHE_TTL_MS) return null;
    return v.summary;
  } catch { return null; }
}

async function saveSummary(hash: string, summary: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const val: any = { summary, _ts: Date.now() } satisfies SummaryValue;
  const key      = dbKey(hash);
  await prisma.siteCache.upsert({
    where:  { key },
    update: { value: val },
    create: { key,  value: val },
  });
}

// In-flight de-dup per article hash — prevents concurrent identical requests each hitting the AI
const inFlight = new Map<string, Promise<string>>();

const SYSTEM_PROMPT = `You are a financial news summariser for InvestMart.
Rules:
1. Summarise only from the provided headline and snippet — never invent facts.
2. 2-4 sentences: what happened → who is affected → why it matters for markets.
3. Neutral tone — no buy/sell language, no sensationalism.
4. Use your own words — never copy sentences from the source.
5. If only a headline is provided, note "(summary from headline only)".
6. End every summary with: "AI summary · read the original for full context"`;

export async function POST(request: NextRequest): Promise<NextResponse> {
  const limited = await applyRateLimit(request, "news");
  if (limited) return limited;

  const hasAi = !!(process.env.CEREBRAS_API_KEY || process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY || process.env.NVIDIA_NIM_API_KEY);
  if (!hasAi) {
    return NextResponse.json({ error: "AI not configured" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const { headline, snippet, source, ticker, locale } = body as {
    headline?: unknown; snippet?: unknown; source?: unknown;
    ticker?: unknown;   locale?:  unknown;
  };

  if (typeof headline !== "string" || headline.trim().length === 0) {
    return NextResponse.json({ error: "headline required" }, { status: 400 });
  }

  const safeHeadline = stripHtml(headline.trim()).slice(0, MAX_HEADLINE);
  const safeSnippet  = typeof snippet === "string" ? stripHtml(snippet.trim()).slice(0, MAX_SNIPPET) : "";
  const safeSource   = typeof source  === "string" ? source.trim().slice(0, 80) : "unknown";
  const safeTicker   = typeof ticker  === "string" ? ticker.trim().slice(0, 15) : "";
  const lang         = locale === "th" ? "th" : "en";

  const hash = contentHash(`${lang}:${safeHeadline}`, safeSnippet);

  // DB cache hit
  const cached = await loadSummary(hash);
  if (cached) return NextResponse.json({ summary: cached, source: safeSource });

  // In-flight de-dup
  if (inFlight.has(hash)) {
    const summary = await inFlight.get(hash)!;
    return NextResponse.json({ summary, source: safeSource });
  }

  const tickerNote = safeTicker ? ` · about $${safeTicker}` : "";
  const langNote   = lang === "th" ? " Respond in Thai." : " Respond in English.";
  const context    = safeSnippet ? `\nSnippet: ${safeSnippet}` : "";

  const userMessage = `Source: ${safeSource}${tickerNote}
Headline: ${safeHeadline}${context}`;

  const work = (async (): Promise<string> => {
    try {
      const summary = await generateText(userMessage, SYSTEM_PROMPT + langNote, {
        maxTokens:   220,
        temperature: 0.2,
      });
      if (!summary) throw new Error("empty response");
      await saveSummary(hash, summary);
      return summary;
    } finally {
      inFlight.delete(hash);
    }
  })();

  inFlight.set(hash, work);

  try {
    const summary = await work;
    return NextResponse.json({ summary, source: safeSource });
  } catch (err) {
    console.error("[news/summarize] failed:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: lang === "th" ? "AI ไม่พร้อมใช้งานชั่วคราว ลองใหม่อีกครั้ง" : "AI unavailable — please try again" },
      { status: 503 },
    );
  }
}
