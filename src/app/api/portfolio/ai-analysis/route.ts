import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/getSession";
import { generateText } from "@/lib/aiService";

export const dynamic = "force-dynamic";

interface PositionAnalysis {
  ticker:       string;
  shares:       number;
  avgCost:      number;
  currentPrice: number;
  pnlPct:       number;
  note:         string;
}

export interface PortfolioAnalysis {
  headline:    string;
  healthScore: number;
  summary:     string;
  positions:   PositionAnalysis[];
  risks:       string[];
  highlights:  string[];
}

interface CacheEntry {
  data:      PortfolioAnalysis;
  cachedAt:  number;
}

const CACHE_TTL_MS = 15 * 60 * 1000;
const analysisCache = new Map<string, CacheEntry>();

interface QuoteResult { c: number; pc: number; }

async function fetchPrice(ticker: string, apiKey: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(ticker)}&token=${apiKey}`,
      { signal: AbortSignal.timeout(3000) }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as QuoteResult;
    return data.c > 0 ? data.c : null;
  } catch {
    return null;
  }
}

export async function GET(): Promise<NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cached = analysisCache.get(userId);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return NextResponse.json({ ...cached.data, cached: true });
  }

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "API not configured" }, { status: 503 });

  const user = await prisma.user.findUnique({
    where:   { id: userId },
    include: { holdings: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const holdings = user.holdings;
  if (holdings.length === 0) {
    const empty: PortfolioAnalysis = {
      headline:    "ยังไม่มีหุ้นในพอร์ต",
      healthScore: 0,
      summary:     "ซื้อหุ้นแรกของคุณผ่านเรดาร์เพื่อเริ่มต้นสร้างพอร์ต",
      positions:   [],
      risks:       [],
      highlights:  [],
    };
    return NextResponse.json({ ...empty, cached: false });
  }

  // Batch fetch current prices (sequential to stay within Finnhub rate limits)
  const prices = new Map<string, number>();
  for (const h of holdings) {
    const price = await fetchPrice(h.ticker, apiKey);
    if (price) prices.set(h.ticker, price);
  }

  // Build position summaries
  const positions: PositionAnalysis[] = holdings.map((h) => {
    const current = prices.get(h.ticker) ?? h.avgCost;
    const pnlPct  = ((current - h.avgCost) / h.avgCost) * 100;
    return {
      ticker:       h.ticker,
      shares:       h.shares,
      avgCost:      h.avgCost,
      currentPrice: current,
      pnlPct,
      note:         prices.has(h.ticker) ? "" : "ราคาไม่พร้อมใช้งาน",
    };
  });

  const totalCost    = positions.reduce((s, p) => s + p.shares * p.avgCost, 0);
  const totalValue   = positions.reduce((s, p) => s + p.shares * p.currentPrice, 0);
  const totalPnlPct  = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0;
  const winners      = positions.filter((p) => p.pnlPct > 0).length;
  const losers       = positions.filter((p) => p.pnlPct < 0).length;

  const positionLines = positions
    .map(
      (p) =>
        `${p.ticker}: ${p.shares} shares, avg cost $${p.avgCost.toFixed(2)}, ` +
        `current $${p.currentPrice.toFixed(2)}, P&L ${p.pnlPct >= 0 ? "+" : ""}${p.pnlPct.toFixed(1)}%`
    )
    .join("\n");

  const prompt = `Analyze this simulated trading portfolio and respond with ONLY a JSON object.

Portfolio (${holdings.length} positions, total cost $${totalCost.toFixed(0)}, current value $${totalValue.toFixed(0)}, total P&L ${totalPnlPct >= 0 ? "+" : ""}${totalPnlPct.toFixed(1)}%):
${positionLines}

Winners: ${winners}, Losers: ${losers}

Respond ONLY with this JSON (no markdown, no extra text):
{
  "headline": "one sentence summary of the portfolio",
  "healthScore": 0-100,
  "summary": "2-3 sentences on portfolio health, diversification, and key trends",
  "risks": ["risk 1", "risk 2", "risk 3"],
  "highlights": ["positive 1", "positive 2"]
}`;

  const systemPrompt =
    "You are a concise portfolio analyst. Respond only with the requested JSON. " +
    "Keep all text under 15 words per item. This is a simulated/paper trading portfolio for educational purposes.";

  let analysis: PortfolioAnalysis;
  try {
    const raw  = await generateText(prompt, systemPrompt, { maxTokens: 400, jsonMode: true });
    const json = JSON.parse(raw) as Omit<PortfolioAnalysis, "positions">;
    analysis   = {
      headline:    String(json.headline    ?? ""),
      healthScore: Number(json.healthScore ?? 50),
      summary:     String(json.summary     ?? ""),
      risks:       Array.isArray(json.risks)      ? (json.risks as string[])      : [],
      highlights:  Array.isArray(json.highlights) ? (json.highlights as string[]) : [],
      positions,
    };
  } catch {
    analysis = {
      headline:    `${holdings.length} positions · ${totalPnlPct >= 0 ? "+" : ""}${totalPnlPct.toFixed(1)}% overall`,
      healthScore: Math.max(0, Math.min(100, 50 + Math.round(totalPnlPct * 2))),
      summary:     "ไม่สามารถโหลดการวิเคราะห์ AI ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง",
      positions,
      risks:       [],
      highlights:  [],
    };
  }

  analysisCache.set(userId, { data: analysis, cachedAt: Date.now() });
  return NextResponse.json({ ...analysis, cached: false });
}
