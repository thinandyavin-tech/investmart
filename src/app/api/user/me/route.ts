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
    },
  });
  if (!user) return NextResponse.json({ user: null });

  return NextResponse.json({
    user: {
      ...user,
      lastNameChangeAt: user.lastNameChangeAt?.toISOString() ?? null,
      isDemo,
    },
  });
}
