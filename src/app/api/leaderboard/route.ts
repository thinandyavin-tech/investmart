import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const FALLBACK_FX = 35.2; // THB per USD

export async function GET(): Promise<NextResponse> {
  const users = await prisma.user.findMany({
    select: {
      id:       true,
      name:     true,
      username: true,
      cashThb:  true,
      cashUsd:  true,
      holdings: { select: { ticker: true, shares: true, avgCost: true, currency: true } },
      _count:   { select: { tradeHistory: true } },
    },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  // Portfolio value = cashThb + cashUsd * fx + sum(shares * avgCost * fx for USD holdings)
  // Uses cost basis — not current market price. Labeled accordingly.
  const leaderboard = users
    .map((u) => {
      const holdingValue = u.holdings.reduce((sum, h) => {
        const valueUsd = h.shares * h.avgCost;
        return sum + (h.currency === "USD" ? valueUsd * FALLBACK_FX : valueUsd);
      }, 0);
      const totalThb  = u.cashThb + u.cashUsd * FALLBACK_FX + holdingValue;
      const startThb  = 1_250_000;
      const pnl       = totalThb - startThb;
      return {
        id:       u.id.slice(-6),
        name:     u.name ?? "นักลงทุน",
        username:   u.username,
        totalThb,
        pnl,
        trades:     u._count.tradeHistory,
        holdings:   u.holdings.length,
      };
    })
    .sort((a, b) => b.totalThb - a.totalThb)
    .map((u, i) => ({ ...u, rank: i + 1 }));

  return NextResponse.json({
    leaderboard,
    note: "มูลค่าคำนวณจากราคาต้นทุน + เงินสด ไม่ใช่ราคาตลาดปัจจุบัน",
  });
}
