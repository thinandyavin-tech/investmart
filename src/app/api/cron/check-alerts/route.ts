import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/webPush";

export const dynamic    = "force-dynamic";
export const maxDuration = 60;

interface QuoteResult { c: number; }

async function fetchPrice(ticker: string, apiKey: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(ticker)}&token=${apiKey}`,
      { signal: AbortSignal.timeout(3000) },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as QuoteResult;
    return data.c > 0 ? data.c : null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "FINNHUB_API_KEY not set" }, { status: 503 });

  // Load all active (untriggered) alerts
  const alerts = await prisma.priceAlert.findMany({
    where: { triggered: false },
    take:  500,
  });

  if (alerts.length === 0) return NextResponse.json({ ok: true, checked: 0, triggered: 0 });

  // Deduplicate tickers and fetch prices
  const tickers = [...new Set(alerts.map((a) => a.ticker))];
  const prices  = new Map<string, number>();

  for (const ticker of tickers) {
    const price = await fetchPrice(ticker, apiKey);
    if (price !== null) prices.set(ticker, price);
  }

  // Check each alert
  const triggeredIds: string[] = [];
  const notifyJobs: Array<{ userId: string; ticker: string; price: number; condition: string; threshold: number }> = [];

  for (const alert of alerts) {
    const price = prices.get(alert.ticker);
    if (price === undefined) continue;

    const fired =
      (alert.condition === "above" && price >= alert.threshold) ||
      (alert.condition === "below" && price <= alert.threshold);

    if (fired) {
      triggeredIds.push(alert.id);
      notifyJobs.push({
        userId:    alert.userId,
        ticker:    alert.ticker,
        price,
        condition: alert.condition,
        threshold: alert.threshold,
      });
    }
  }

  if (triggeredIds.length === 0) {
    return NextResponse.json({ ok: true, checked: alerts.length, triggered: 0 });
  }

  // Mark alerts triggered
  await prisma.priceAlert.updateMany({
    where: { id: { in: triggeredIds } },
    data:  { triggered: true, triggeredAt: new Date() },
  });

  // Create in-app notifications + send push
  await Promise.allSettled(
    notifyJobs.map(async ({ userId, ticker, price, condition, threshold }) => {
      const direction = condition === "above" ? "ขึ้นถึง" : "ลงถึง";
      const message   = `${ticker} ${direction} $${price.toFixed(2)} (เป้าหมาย $${threshold.toFixed(2)})`;

      await prisma.notification.create({
        data: {
          userId,
          type:    "alert",
          message,
          link:    `/stock/${ticker}`,
        },
      });

      await sendPushToUser(userId, {
        title: `แจ้งเตือนราคา ${ticker}`,
        body:  message,
        url:   `/stock/${ticker}`,
      });
    }),
  );

  return NextResponse.json({
    ok:       true,
    checked:  alerts.length,
    triggered: triggeredIds.length,
  });
}
