import { NextRequest, NextResponse } from "next/server";

import { generateText }  from "@/lib/aiService";
import { applyRateLimit } from "@/lib/rateLimit";
import { prisma }         from "@/lib/prisma";

const CACHE_KEY    = "market_digest_v1";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface DigestValue { digest: string; generatedAt: string; _ts: number }

async function loadDigest(): Promise<DigestValue | null> {
  try {
    const row = await prisma.siteCache.findUnique({ where: { key: CACHE_KEY } });
    if (!row) return null;
    const v = row.value as unknown as DigestValue;
    if (!v?._ts || !v.digest) return null;
    return v;
  } catch { return null; }
}

async function saveDigest(v: DigestValue): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const val: any = v;
  await prisma.siteCache.upsert({
    where:  { key: CACHE_KEY },
    update: { value: val },
    create: { key: CACHE_KEY, value: val },
  });
}

const TOP_TICKERS = ["SPY", "QQQ", "AAPL", "NVDA", "TSLA", "MSFT", "META", "AMZN"];

interface FinnhubQuote   { c: number; pc: number; dp: number }
interface FinnhubArticle { headline: string }

async function fetchQuote(ticker: string, apiKey: string): Promise<{ ticker: string; change: number } | null> {
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${apiKey}`,
      { signal: AbortSignal.timeout(3000) },
    );
    if (!res.ok) return null;
    const q = (await res.json()) as FinnhubQuote;
    if (!q.c || !q.pc) return null;
    return { ticker, change: q.dp ?? ((q.c - q.pc) / q.pc) * 100 };
  } catch { return null; }
}

async function fetchHeadlines(apiKey: string): Promise<string[]> {
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/news?category=general&token=${apiKey}`,
      { signal: AbortSignal.timeout(4000) },
    );
    if (!res.ok) return [];
    const items = (await res.json()) as FinnhubArticle[];
    return items.slice(0, 5).map((n) => n.headline);
  } catch { return []; }
}

// In-flight lock so concurrent cold-starts don't all generate simultaneously
let generating: Promise<DigestValue | null> | null = null;

async function generateDigest(finnhubKey: string): Promise<DigestValue | null> {
  if (generating) return generating;

  generating = (async (): Promise<DigestValue | null> => {
    const [quotes, headlines] = await Promise.all([
      Promise.all(TOP_TICKERS.map((t) => fetchQuote(t, finnhubKey))),
      fetchHeadlines(finnhubKey),
    ]);

    const validQuotes  = quotes.filter((q): q is { ticker: string; change: number } => q !== null);
    const marketBlock  = validQuotes.map((q) => `${q.ticker} ${q.change >= 0 ? "+" : ""}${q.change.toFixed(2)}%`).join(", ");
    const newsBlock    = headlines.length > 0 ? headlines.map((h) => `- ${h}`).join("\n") : "No headlines available";

    const prompt = `Summarise today's US market in 2-3 concise sentences for a retail investor.
Use only the data provided — never invent facts.

Today's prices: ${marketBlock || "unavailable"}

Top headlines:
${newsBlock}`;

    const system = "You are a senior market analyst writing a brief daily market summary. Be concise, factual, and neutral. No investment advice.";

    try {
      const digest = await generateText(prompt, system, { maxTokens: 180, temperature: 0.35 });
      const v: DigestValue = { digest: digest.trim(), generatedAt: new Date().toISOString(), _ts: Date.now() };
      await saveDigest(v);
      return v;
    } catch (err) {
      console.error("[market/digest] generation failed:", err instanceof Error ? err.message : err);
      return null;
    }
  })().finally(() => { generating = null; });

  return generating;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const limited = await applyRateLimit(request, "ai");
  if (limited) return limited;

  // Serve from DB cache if fresh
  const cached = await loadDigest();
  if (cached && Date.now() - cached._ts < CACHE_TTL_MS) {
    return NextResponse.json({ digest: cached.digest, generatedAt: cached.generatedAt });
  }

  const finnhubKey = process.env.FINNHUB_API_KEY;
  const hasAi      = !!(process.env.CEREBRAS_API_KEY || process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY || process.env.NVIDIA_NIM_API_KEY);

  if (!finnhubKey || !hasAi) {
    // Return stale digest rather than nothing, if available
    if (cached) return NextResponse.json({ digest: cached.digest, generatedAt: cached.generatedAt, stale: true });
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }

  const fresh = await generateDigest(finnhubKey);
  if (fresh) return NextResponse.json({ digest: fresh.digest, generatedAt: fresh.generatedAt });

  // Generation failed — serve stale if available
  if (cached) return NextResponse.json({ digest: cached.digest, generatedAt: cached.generatedAt, stale: true });
  return NextResponse.json({ error: "generation failed" }, { status: 503 });
}
