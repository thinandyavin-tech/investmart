import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/getSession";

const FALLBACK_FX = 35.2;

async function recordSnapshot(userId: string): Promise<void> {
  try {
    const u = await prisma.user.findUnique({
      where:  { id: userId },
      select: { cashThb: true, cashUsd: true, holdings: { select: { shares: true, avgCost: true } } },
    });
    if (!u) return;
    const holdingValue = u.holdings.reduce((s, h) => s + h.shares * h.avgCost * FALLBACK_FX, 0);
    const valueThb     = u.cashThb + u.cashUsd * FALLBACK_FX + holdingValue;
    await prisma.portfolioSnapshot.create({ data: { userId, valueThb } });
  } catch {
    // Non-critical; don't fail the trade if snapshot fails
  }
}

const TICKER_RE = /^[A-Z][A-Z.\-]{0,9}$/;

const TradeSchema = z.object({
  ticker: z.string().regex(TICKER_RE, "invalid ticker"),
  side:   z.enum(["BUY", "SELL"]),
  shares: z.number().positive().finite().max(1_000_000),
});

async function fetchCurrentPrice(ticker: string): Promise<number | null> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(ticker)}&token=${apiKey}`,
      { signal: AbortSignal.timeout(4000) }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { c?: number };
    return typeof data.c === "number" && data.c > 0 ? data.c : null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "ยังไม่ได้เข้าสู่ระบบ" }, { status: 401 });
  }

  const parseResult = TradeSchema.safeParse(await request.json().catch(() => null));
  if (!parseResult.success) {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 422 });
  }

  const { ticker, side, shares } = parseResult.data;

  const price = await fetchCurrentPrice(ticker);
  if (!price) {
    return NextResponse.json({ error: "ไม่สามารถดึงราคาหุ้นได้" }, { status: 503 });
  }

  const total = shares * price;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: "ไม่พบผู้ใช้" }, { status: 404 });
  }

  if (side === "BUY") {
    if (user.cashUsd < total) {
      return NextResponse.json({ error: "เงิน USD ไม่พอ" }, { status: 400 });
    }

    const [updatedUser, holding] = await prisma.$transaction(async (tx) => {
      const existing = await tx.holding.findUnique({
        where: { userId_ticker: { userId, ticker } },
      });

      const newShares  = (existing?.shares ?? 0) + shares;
      const newAvgCost = existing
        ? (existing.avgCost * existing.shares + price * shares) / newShares
        : price;

      const updated = await tx.holding.upsert({
        where:  { userId_ticker: { userId, ticker } },
        create: { userId, ticker, shares, avgCost: price },
        update: { shares: newShares, avgCost: newAvgCost },
      });

      const u = await tx.user.update({
        where: { id: userId },
        data:  { cashUsd: { decrement: total } },
      });

      await tx.trade.create({
        data: { userId, ticker, side, shares, price, total, currency: "USD" },
      });

      return [u, updated] as const;
    });

    void recordSnapshot(userId);
    return NextResponse.json({
      cashUsd: updatedUser.cashUsd,
      cashThb: updatedUser.cashThb,
      holding,
      executedPrice: price,
    });
  }

  // SELL
  const existing = await prisma.holding.findUnique({
    where: { userId_ticker: { userId, ticker } },
  });

  if (!existing || existing.shares < shares) {
    return NextResponse.json({ error: "หุ้นไม่พอขาย" }, { status: 400 });
  }

  const [updatedUser] = await prisma.$transaction(async (tx) => {
    const remaining = existing.shares - shares;

    if (remaining <= 0.0001) {
      await tx.holding.delete({ where: { userId_ticker: { userId, ticker } } });
    } else {
      await tx.holding.update({
        where: { userId_ticker: { userId, ticker } },
        data:  { shares: remaining },
      });
    }

    const u = await tx.user.update({
      where: { id: userId },
      data:  { cashUsd: { increment: total } },
    });

    await tx.trade.create({
      data: { userId, ticker, side, shares, price, total, currency: "USD" },
    });

    return [u] as const;
  });

  void recordSnapshot(userId);
  return NextResponse.json({
    cashUsd: updatedUser.cashUsd,
    cashThb: updatedUser.cashThb,
    executedPrice: price,
  });
}
