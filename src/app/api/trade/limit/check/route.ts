import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/getSession";

const Schema = z.object({
  ticker: z.string().regex(/^[A-Z][A-Z.\-]{0,9}$/),
  price:  z.number().positive().finite(),
});

// Called client-side when we have a live price — fills any matching limit orders
export async function POST(request: NextRequest): Promise<NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ filled: [] });

  const body   = await request.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ filled: [] });

  const { ticker, price } = parsed.data;

  const orders = await prisma.limitOrder.findMany({
    where: { userId, ticker, status: "PENDING" },
  });

  const toFill = orders.filter(o =>
    (o.side === "BUY"  && price <= o.limitPrice) ||
    (o.side === "SELL" && price >= o.limitPrice)
  );

  if (toFill.length === 0) return NextResponse.json({ filled: [] });

  const filled: string[] = [];

  for (const order of toFill) {
    try {
      const total = order.shares * price;

      if (order.side === "BUY") {
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { cashUsd: true } });
        if (!user || user.cashUsd < total) continue;

        await prisma.$transaction(async tx => {
          const existing = await tx.holding.findUnique({ where: { userId_ticker: { userId, ticker } } });
          const newShares   = (existing?.shares ?? 0) + order.shares;
          const newAvgCost  = existing
            ? (existing.avgCost * existing.shares + price * order.shares) / newShares
            : price;

          await tx.holding.upsert({
            where:  { userId_ticker: { userId, ticker } },
            create: { userId, ticker, shares: order.shares, avgCost: price },
            update: { shares: newShares, avgCost: newAvgCost },
          });
          await tx.user.update({ where: { id: userId }, data: { cashUsd: { decrement: total } } });
          await tx.trade.create({ data: { userId, ticker, side: "BUY", shares: order.shares, price, total, currency: "USD" } });
          await tx.limitOrder.update({ where: { id: order.id }, data: { status: "FILLED", filledAt: new Date(), filledPrice: price } });
        });
      } else {
        const holding = await prisma.holding.findUnique({ where: { userId_ticker: { userId, ticker } } });
        if (!holding || holding.shares < order.shares) continue;

        await prisma.$transaction(async tx => {
          const remaining = holding.shares - order.shares;
          if (remaining <= 0.0001) {
            await tx.holding.delete({ where: { userId_ticker: { userId, ticker } } });
          } else {
            await tx.holding.update({ where: { userId_ticker: { userId, ticker } }, data: { shares: remaining } });
          }
          await tx.user.update({ where: { id: userId }, data: { cashUsd: { increment: total } } });
          await tx.trade.create({ data: { userId, ticker, side: "SELL", shares: order.shares, price, total, currency: "USD" } });
          await tx.limitOrder.update({ where: { id: order.id }, data: { status: "FILLED", filledAt: new Date(), filledPrice: price } });
        });
      }

      filled.push(order.id);
    } catch { /* non-critical — skip failed fill */ }
  }

  return NextResponse.json({ filled });
}
