import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/getSession";

const TICKER_RE = /^[A-Z][A-Z.\-]{0,9}$/;

const CreateSchema = z.object({
  ticker:    z.string().regex(TICKER_RE),
  threshold: z.number().positive().finite(),
  condition: z.enum(["above", "below"]),
});

export async function GET(): Promise<NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ alerts: [] });

  const alerts = await prisma.priceAlert.findMany({
    where:   { userId },
    orderBy: { createdAt: "desc" },
    take:    20,
  });
  return NextResponse.json({ alerts });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "ยังไม่ได้เข้าสู่ระบบ" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 422 });

  const { ticker, threshold, condition } = parsed.data;

  // Limit 10 active alerts per user
  const activeCount = await prisma.priceAlert.count({ where: { userId, triggered: false } });
  if (activeCount >= 10) {
    return NextResponse.json({ error: "แจ้งเตือนสูงสุด 10 รายการ" }, { status: 400 });
  }

  const alert = await prisma.priceAlert.create({
    data: { userId, ticker, threshold, condition },
  });
  return NextResponse.json(alert, { status: 201 });
}
