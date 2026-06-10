import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/getSession";
import { applyRateLimit } from "@/lib/rateLimit";
import { getTHBRate } from "@/lib/fxRate";

const SUPPORTED = ["THB", "USD"] as const;

const ExchangeSchema = z.object({
  fromCurrency: z.enum(SUPPORTED),
  toCurrency:   z.enum(SUPPORTED),
  amount:       z.number().positive().finite().max(100_000_000),
});

async function fetchUsdThbRate(): Promise<number> {
  const { rate } = await getTHBRate();
  return rate;
}

export async function POST(request: NextRequest) {
  const limited = await applyRateLimit(request, "write");
  if (limited) return limited;

  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "ยังไม่ได้เข้าสู่ระบบ" }, { status: 401 });
  }

  const parseResult = ExchangeSchema.safeParse(await request.json().catch(() => null));
  if (!parseResult.success) {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 422 });
  }

  const { fromCurrency, toCurrency, amount } = parseResult.data;

  if (fromCurrency === toCurrency) {
    return NextResponse.json({ error: "สกุลเงินต้องต่างกัน" }, { status: 400 });
  }

  const usdThbRate   = await fetchUsdThbRate();
  const rate         = fromCurrency === "THB" ? 1 / usdThbRate : usdThbRate;
  const resultAmount = amount * rate;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: "ไม่พบผู้ใช้" }, { status: 404 });
  }

  if (fromCurrency === "THB" && user.cashThb < amount) {
    return NextResponse.json({ error: "เงิน THB ไม่พอ" }, { status: 400 });
  }
  if (fromCurrency === "USD" && user.cashUsd < amount) {
    return NextResponse.json({ error: "เงิน USD ไม่พอ" }, { status: 400 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const current = await tx.user.findUnique({ where: { id: userId } });
    if (!current) throw new Error("user not found");

    const newThb =
      fromCurrency === "THB" ? current.cashThb - amount
      : toCurrency === "THB" ? current.cashThb + resultAmount
      : current.cashThb;

    const newUsd =
      fromCurrency === "USD" ? current.cashUsd - amount
      : toCurrency === "USD" ? current.cashUsd + resultAmount
      : current.cashUsd;

    return tx.user.update({
      where: { id: userId },
      data:  { cashThb: newThb, cashUsd: newUsd },
    });
  });

  return NextResponse.json({
    cashThb: updated.cashThb,
    cashUsd: updated.cashUsd,
    rateUsed: rate,
  });
}
