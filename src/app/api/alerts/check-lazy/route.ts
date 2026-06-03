import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/getSession";
import { sendPushToUser } from "@/lib/webPush";

export const dynamic = "force-dynamic";

const Schema = z.object({
  ticker: z.string().regex(/^[A-Z][A-Z.\-]{0,9}$/),
  price:  z.number().positive().finite(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ ok: true }); // silently ignore unauthenticated

  const body   = await request.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: true });

  const { ticker, price } = parsed.data;

  const alerts = await prisma.priceAlert.findMany({
    where: { userId, ticker, triggered: false },
  });

  const fired = alerts.filter(
    (a) =>
      (a.condition === "above" && price >= a.threshold) ||
      (a.condition === "below" && price <= a.threshold),
  );

  if (fired.length === 0) return NextResponse.json({ ok: true, triggered: 0 });

  const ids = fired.map((a) => a.id);
  await prisma.priceAlert.updateMany({
    where: { id: { in: ids } },
    data:  { triggered: true, triggeredAt: new Date() },
  });

  await Promise.allSettled(
    fired.map(async (a) => {
      const direction = a.condition === "above" ? "ขึ้นถึง" : "ลงถึง";
      const message   = `${ticker} ${direction} $${price.toFixed(2)} (เป้าหมาย $${a.threshold.toFixed(2)})`;

      await prisma.notification.create({
        data: { userId, type: "alert", message, link: `/stock/${ticker}` },
      });

      await sendPushToUser(userId, {
        title: `แจ้งเตือนราคา ${ticker}`,
        body:  message,
        url:   `/stock/${ticker}`,
      });
    }),
  );

  return NextResponse.json({ ok: true, triggered: fired.length });
}
