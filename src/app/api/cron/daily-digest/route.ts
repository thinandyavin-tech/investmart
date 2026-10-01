import { rejectUnlessCron } from "@/lib/cronAuth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";


interface FinnhubQuote { c: number; pc: number; }
interface FinnhubArticle { headline: string; source: string; url: string; }

async function getTopMovers(apiKey: string): Promise<string> {
  const tickers = ["AAPL","NVDA","TSLA","MSFT","META","AMZN","GOOGL","AMD","NFLX","AVGO"];

  const results = await Promise.all(
    tickers.map(async (t) => {
      try {
        const res = await fetch(
          `https://finnhub.io/api/v1/quote?symbol=${t}&token=${apiKey}`,
          { signal: AbortSignal.timeout(3000) }
        );
        if (!res.ok) return null;
        const q = (await res.json()) as FinnhubQuote;
        if (!q.c || !q.pc) return null;
        return { ticker: t, change: ((q.c - q.pc) / q.pc) * 100 };
      } catch {
        return null;
      }
    })
  );

  const valid = results
    .filter((r): r is { ticker: string; change: number } => r !== null)
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
    .slice(0, 5);

  return valid
    .map((r) => `${r.ticker} ${r.change >= 0 ? "+" : ""}${r.change.toFixed(1)}%`)
    .join(" · ");
}

async function getTopNews(apiKey: string): Promise<string> {
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/news?category=general&token=${apiKey}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return "";
    const articles = (await res.json()) as FinnhubArticle[];
    return articles[0]?.headline ?? "";
  } catch {
    return "";
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const denied = rejectUnlessCron(req);
  if (denied) return denied;

  const finnhubKey = process.env.FINNHUB_API_KEY;
  if (!finnhubKey) return NextResponse.json({ error: "API not configured" }, { status: 503 });

  const [movers, news] = await Promise.all([
    getTopMovers(finnhubKey),
    getTopNews(finnhubKey),
  ]);

  const now   = new Date().toLocaleString("th-TH", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit" });
  const lines = [
    `📡 InvestMart Daily Digest — ปิดตลาด ${now} ET`,
    movers ? `\n📈 หุ้นเด่นวันนี้: ${movers}` : "",
    news   ? `\n📰 ข่าวใหญ่: ${news}` : "",
    `\n💡 ข้อมูลนี้เป็นเพียงสรุปตลาด · ไม่ใช่คำแนะนำลงทุน`,
  ].filter(Boolean).join("");

  await prisma.chatMessage.create({
    data: { content: lines, isSystem: true, authorId: null },
  });

  return NextResponse.json({ ok: true });
}
