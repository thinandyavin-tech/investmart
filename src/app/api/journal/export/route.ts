/**
 * GET /api/journal/export — returns the user's trade journal as a CSV file.
 * Journal is private; requires authentication.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma }                    from "@/lib/prisma";
import { getSessionUserId }          from "@/lib/getSession";

export const dynamic = "force-dynamic";

function csvEscape(v: string | number | null | undefined): string {
  if (v == null) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const [trades, theses] = await Promise.all([
    prisma.trade.findMany({
      where:   { userId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.tradeThesis.findMany({
      where:  { userId },
      select: { tradeId: true, thesis: true, tags: true },
    }),
  ]);

  const thesisMap = new Map(theses.map(t => [t.tradeId, t]));

  const header = ["date", "ticker", "side", "shares", "price_usd", "total_usd", "thesis", "tags"].join(",");

  const rows = trades.map(t => {
    const th   = thesisMap.get(t.id);
    let tags   = "";
    if (th?.tags) { try { tags = (JSON.parse(th.tags) as string[]).join("|"); } catch { /* noop */ } }
    return [
      csvEscape(t.createdAt.toISOString().slice(0, 10)),
      csvEscape(t.ticker),
      csvEscape(t.side),
      csvEscape(t.shares),
      csvEscape(t.price.toFixed(4)),
      csvEscape(t.total.toFixed(2)),
      csvEscape(th?.thesis ?? ""),
      csvEscape(tags),
    ].join(",");
  });

  const csv = [header, ...rows].join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type":        "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="investmart-journal-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
