/**
 * POST /api/journal/review — Martin reviews a trade thesis against
 * what actually played out, using real current price data.
 *
 * Framing: observational learning review, never "you should have."
 * Honest N/A where data is missing.
 */

import { NextRequest, NextResponse } from "next/server";
import { z }                         from "zod";
import { prisma }                    from "@/lib/prisma";
import { getSessionUserId }          from "@/lib/getSession";
import { generateText }              from "@/lib/aiService";
import { applyRateLimit }            from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const CACHE_TTL = 15 * 60_000;
const cache     = new Map<string, { review: string; at: number }>();

const BodySchema = z.object({
  tradeId: z.string().min(1).max(64),
  locale:  z.enum(["en", "th"]).default("en"),
});

async function fetchCurrentPrice(ticker: string): Promise<number | null> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return null;
  try {
    const r = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(ticker)}&token=${apiKey}`,
      { signal: AbortSignal.timeout(4000) },
    );
    if (!r.ok) return null;
    const d = (await r.json()) as { c?: number };
    return typeof d.c === "number" && d.c > 0 ? d.c : null;
  } catch { return null; }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const limited = await applyRateLimit(request, "ai");
  if (limited) return limited;

  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "bad request" }, { status: 400 }); }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid params" }, { status: 422 });

  const { tradeId, locale } = parsed.data;

  // Verify ownership + fetch trade + thesis
  const trade = await prisma.trade.findUnique({
    where: { id: tradeId },
    select: { userId: true, ticker: true, side: true, shares: true, price: true, total: true, createdAt: true },
  });
  if (!trade || trade.userId !== userId) {
    return NextResponse.json({ error: "trade not found" }, { status: 404 });
  }

  const thesis = await prisma.tradeThesis.findUnique({
    where: { tradeId },
    select: { thesis: true, tags: true, id: true },
  });

  const cacheKey = `${tradeId}-${locale}`;
  const hit      = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_TTL) {
    return NextResponse.json({ review: hit.review });
  }

  // Fetch current price
  const currentPrice = await fetchCurrentPrice(trade.ticker);
  const tradeDate    = trade.createdAt.toISOString().slice(0, 10);
  const pnlPct       = currentPrice
    ? ((currentPrice - trade.price) / trade.price * 100).toFixed(1) + "%"
    : "N/A (price unavailable)";
  const direction    = trade.side === "BUY" ? "long" : "short";

  let tags: string[] = [];
  if (thesis?.tags) { try { tags = JSON.parse(thesis.tags) as string[]; } catch { /* noop */ } }

  const isEn    = locale === "en";
  const sysPrompt = `You are Martin, InvestMart's educational AI assistant. Your job is to help paper traders learn from their trades by reviewing their thesis against what actually happened. Be observational and educational — never judgmental, never say "you should have." Honest N/A where data is missing. Never say buy/sell.`;

  const userPrompt = `Review this paper trade thesis:

Ticker: ${trade.ticker}
Trade: ${trade.side} ${trade.shares} shares @ $${trade.price.toFixed(2)} on ${tradeDate}
Position type: ${direction}
Tags: ${tags.length ? tags.join(", ") : "none"}
Thesis saved by the trader: "${thesis?.thesis ?? "(no thesis recorded)"}"

Current price: ${currentPrice != null ? `$${currentPrice.toFixed(2)}` : "unavailable"}
P&L since trade: ${pnlPct} (${trade.side === "BUY" ? "vs entry" : "short gain"})
Note: this is paper trading — no real money. Focus on learning.

Write a concise review in ${isEn ? "English" : "Thai"} with 3 parts:
1. What the thesis got right (or N/A if thesis was empty/unavailable)
2. What turned out differently (based on available price data; honest N/A if no data)
3. One thing to carry forward as a learning — framed as a question or observation to think about

Be brief (3–5 sentences per part), warm, and educational. Never judgmental. Never buy/sell.`;

  const review = await generateText(userPrompt, sysPrompt, { maxTokens: 600 });

  cache.set(cacheKey, { review, at: Date.now() });

  // Mark thesis as reviewed
  if (thesis?.id) {
    await prisma.tradeThesis.update({
      where: { id: thesis.id },
      data:  { reviewedAt: new Date() },
    }).catch(() => { /* non-critical */ });
  }

  return NextResponse.json({ review });
}
