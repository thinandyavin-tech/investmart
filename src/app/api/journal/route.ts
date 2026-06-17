/**
 * GET /api/journal — returns all trades for the current user,
 * each annotated with thesis (if saved) and live P&L data.
 *
 * Journal is private to the user.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma }                    from "@/lib/prisma";
import { getSessionUserId }          from "@/lib/getSession";
import { applyRateLimit }            from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export interface JournalTrade {
  id:           string;
  ticker:       string;
  side:         "BUY" | "SELL";
  shares:       number;
  price:        number;
  total:        number;
  currency:     string;
  createdAt:    string;
  thesis:       string | null;
  tags:         string[];
  thesisId:     string | null;
  reviewedAt:   string | null;
}

export interface JournalPosition {
  ticker:    string;
  shares:    number;    // current holding shares (0 if fully sold)
  avgCost:   number;    // avg cost USD
  trades:    JournalTrade[];
}

export interface JournalResponse {
  positions: JournalPosition[];
  trades:    JournalTrade[];
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const limited = await applyRateLimit(request, "quote");
  if (limited) return limited;

  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const [trades, theses, holdings] = await Promise.all([
    prisma.trade.findMany({
      where:   { userId },
      orderBy: { createdAt: "desc" },
      select:  { id: true, ticker: true, side: true, shares: true, price: true, total: true, currency: true, createdAt: true },
    }),
    prisma.tradeThesis.findMany({
      where:  { userId },
      select: { tradeId: true, thesis: true, tags: true, id: true, reviewedAt: true },
    }),
    prisma.holding.findMany({
      where:  { userId },
      select: { ticker: true, shares: true, avgCost: true },
    }),
  ]);

  // Build thesis lookup by tradeId
  const thesisMap = new Map(theses.map(t => [t.tradeId, t]));

  const journalTrades: JournalTrade[] = trades.map(t => {
    const th = thesisMap.get(t.id);
    let tags: string[] = [];
    if (th?.tags) { try { tags = JSON.parse(th.tags) as string[]; } catch { /* noop */ } }
    return {
      id: t.id,
      ticker: t.ticker,
      side: t.side as "BUY" | "SELL",
      shares: t.shares,
      price: t.price,
      total: t.total,
      currency: t.currency,
      createdAt: t.createdAt.toISOString(),
      thesis:    th?.thesis ?? null,
      tags,
      thesisId:  th?.id    ?? null,
      reviewedAt: th?.reviewedAt?.toISOString() ?? null,
    };
  });

  // Build positions map from current holdings
  const holdingMap = new Map(holdings.map(h => [h.ticker, h]));

  // Group trades by ticker
  const byTicker = new Map<string, JournalTrade[]>();
  for (const t of journalTrades) {
    if (!byTicker.has(t.ticker)) byTicker.set(t.ticker, []);
    byTicker.get(t.ticker)!.push(t);
  }

  const positions: JournalPosition[] = Array.from(byTicker.entries()).map(([ticker, trades]) => {
    const holding = holdingMap.get(ticker);
    return {
      ticker,
      shares:  holding?.shares  ?? 0,
      avgCost: holding?.avgCost ?? 0,
      trades,
    };
  });

  return NextResponse.json({ positions, trades: journalTrades } satisfies JournalResponse);
}
