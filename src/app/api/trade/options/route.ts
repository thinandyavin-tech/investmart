import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/getSession";
import { applyRateLimit } from "@/lib/rateLimit";

const TICKER_RE = /^[A-Z][A-Z.\-]{0,9}$/;

const BuySchema = z.object({
  ticker:     z.string().regex(TICKER_RE),
  optionType: z.enum(["CALL", "PUT"]),
  strikePrice: z.number().positive().finite(),
  expiry:     z.string(), // ISO date string
  contracts:  z.number().int().positive().max(100),
  premium:    z.number().positive().finite(),
});

const CloseSchema = z.object({
  id:         z.string(),
  closePrice: z.number().positive().finite(),
});

export async function GET(): Promise<NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ positions: [] });

  const positions = await prisma.optionPosition.findMany({
    where:   { userId },
    orderBy: { createdAt: "desc" },
    take:    50,
  });
  return NextResponse.json({ positions });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const limited = await applyRateLimit(request, "write");
  if (limited) return limited;

  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "ยังไม่ได้เข้าสู่ระบบ" }, { status: 401 });

  const body = await request.json().catch(() => null);

  // Close existing position
  if (body?.action === "close") {
    const parsed = CloseSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 422 });

    const { id, closePrice } = parsed.data;
    const pos = await prisma.optionPosition.findFirst({ where: { id, userId, status: "OPEN" } });
    if (!pos) return NextResponse.json({ error: "ไม่พบ position" }, { status: 404 });

    const pnl       = (closePrice - pos.premium) * pos.contracts * 100;
    const returnUsd = pos.optionType === "CALL"
      ? Math.max(0, closePrice - pos.strikePrice) * pos.contracts * 100
      : Math.max(0, pos.strikePrice - closePrice) * pos.contracts * 100;

    await prisma.$transaction([
      prisma.optionPosition.update({
        where: { id },
        data:  { status: "CLOSED", closedAt: new Date(), closedPrice: closePrice },
      }),
      prisma.user.update({
        where: { id: userId },
        data:  { cashUsd: { increment: returnUsd } },
      }),
    ]);
    return NextResponse.json({ ok: true, pnl });
  }

  // Buy new option
  const parsed = BuySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 422 });

  const { ticker, optionType, strikePrice, expiry, contracts, premium } = parsed.data;
  const totalCost = premium * contracts * 100;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { cashUsd: true } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (user.cashUsd < totalCost) {
    return NextResponse.json({ error: `เงินไม่พอ (ต้องการ $${totalCost.toFixed(2)})` }, { status: 400 });
  }

  const [position] = await prisma.$transaction([
    prisma.optionPosition.create({
      data: {
        userId, ticker, optionType, strikePrice,
        expiry:    new Date(expiry),
        contracts, premium, totalCost, status: "OPEN",
      },
    }),
    prisma.user.update({
      where: { id: userId },
      data:  { cashUsd: { decrement: totalCost } },
    }),
  ]);

  return NextResponse.json({ position });
}
