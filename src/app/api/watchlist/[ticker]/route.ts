import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/getSession";

interface Params { params: Promise<{ ticker: string }> }

export async function DELETE(_req: NextRequest, { params }: Params): Promise<NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "not authenticated" }, { status: 401 });

  const { ticker } = await params;
  await prisma.watchlistItem.deleteMany({ where: { userId, ticker: ticker.toUpperCase() } });
  return NextResponse.json({ ok: true });
}
