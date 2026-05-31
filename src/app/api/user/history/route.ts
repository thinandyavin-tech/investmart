import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/getSession";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ trades: [] });

  const trades = await prisma.trade.findMany({
    where:   { userId },
    orderBy: { createdAt: "desc" },
    take:    100,
  });

  return NextResponse.json({ trades });
}
