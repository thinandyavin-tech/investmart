import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/getSession";

export async function GET(): Promise<NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "ยังไม่ได้เข้าสู่ระบบ" }, { status: 401 });
  }

  const snapshots = await prisma.portfolioSnapshot.findMany({
    where:   { userId },
    orderBy: { createdAt: "asc" },
    take:    200,
    select:  { valueThb: true, createdAt: true },
  });

  return NextResponse.json({ snapshots });
}
