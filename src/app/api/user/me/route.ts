import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionInfo } from "@/lib/getSession";

export async function GET() {
  const { userId, isDemo } = await getSessionInfo();
  if (!userId) return NextResponse.json({ user: null });

  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: {
      id:               true,
      name:             true,
      username:         true,
      bio:              true,
      email:            true,
      cashThb:          true,
      cashUsd:          true,
      lastNameChangeAt: true,
      holdings: {
        select: { ticker: true, shares: true, avgCost: true, currency: true },
      },
      _count: { select: { tradeHistory: true } },
    },
  });
  if (!user) return NextResponse.json({ user: null });

  const { _count, ...rest } = user;
  return NextResponse.json({
    user: {
      ...rest,
      lastNameChangeAt: user.lastNameChangeAt?.toISOString() ?? null,
      isAdmin:    user.email === (process.env.ADMIN_EMAIL ?? ""),
      tradeCount: _count.tradeHistory,
      isDemo,
    },
  });
}
