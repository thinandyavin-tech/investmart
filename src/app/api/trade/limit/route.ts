import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/getSession";
import { applyRateLimit } from "@/lib/rateLimit";

const TICKER_RE = /^[A-Z][A-Z.\-]{0,9}$/;

const CreateSchema = z.object({
  ticker:     z.string().regex(TICKER_RE),
  side:       z.enum(["BUY", "SELL"]),
  shares:     z.number().positive().finite().max(1_000_000),
  limitPrice: z.number().positive().finite(),
});

export async function GET(): Promise<NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ orders: [] });

  const orders = await prisma.limitOrder.findMany({
    where:   { userId },
    orderBy: { createdAt: "desc" },
    take:    50,
  });
  return NextResponse.json({ orders });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const limited = await applyRateLimit(request, "write");
  if (limited) return limited;

  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "ยังไม่ได้เข้าสู่ระบบ" }, { status: 401 });

  const body   = await request.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 422 });

  const { ticker, side, shares, limitPrice } = parsed.data;

  const pendingCount = await prisma.limitOrder.count({ where: { userId, status: "PENDING" } });
  if (pendingCount >= 20) {
    return NextResponse.json({ error: "Limit orders สูงสุด 20 รายการ" }, { status: 400 });
  }

  const order = await prisma.limitOrder.create({
    data: { userId, ticker, side, shares, limitPrice, status: "PENDING" },
  });

  return NextResponse.json({ order });
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await prisma.limitOrder.updateMany({
    where: { id, userId, status: "PENDING" },
    data:  { status: "CANCELLED" },
  });
  return NextResponse.json({ ok: true });
}
