import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/getSession";

const TICKER_RE = /^[A-Z][A-Z.\-]{0,9}$/;
const AddSchema  = z.object({ ticker: z.string().regex(TICKER_RE) });

export async function GET(): Promise<NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ items: [] });

  const items = await prisma.watchlistItem.findMany({
    where:   { userId },
    orderBy: { createdAt: "desc" },
    select:  { ticker: true, createdAt: true },
  });
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "not authenticated" }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "invalid JSON" }, { status: 400 }); }

  const parsed = AddSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid ticker" }, { status: 422 });
  }

  const count = await prisma.watchlistItem.count({ where: { userId } });
  if (count >= 50) {
    return NextResponse.json({ error: "สูงสุด 50 หุ้น" }, { status: 422 });
  }

  const item = await prisma.watchlistItem.upsert({
    where:  { userId_ticker: { userId, ticker: parsed.data.ticker } },
    update: {},
    create: { userId, ticker: parsed.data.ticker },
    select: { ticker: true },
  });
  return NextResponse.json({ ok: true, ticker: item.ticker }, { status: 201 });
}
