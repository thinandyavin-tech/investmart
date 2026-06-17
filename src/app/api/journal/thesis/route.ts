/**
 * Save or update a trade thesis.
 * POST /api/journal/thesis — { tradeId, thesis, tags }
 *
 * Journal entries are private to the user. tradeId must belong to the
 * requesting user — we verify ownership before writing.
 */

import { NextRequest, NextResponse } from "next/server";
import { z }                         from "zod";
import { prisma }                    from "@/lib/prisma";
import { getSessionUserId }          from "@/lib/getSession";
import { applyRateLimit }            from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const VALID_TAGS = [
  "theme", "moat", "valuation", "catalyst", "growth", "technical", "macro", "other",
] as const;

const BodySchema = z.object({
  tradeId: z.string().min(1).max(64),
  thesis:  z.string().max(2000).default(""),
  tags:    z.array(z.enum(VALID_TAGS)).max(4).default([]),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const limited = await applyRateLimit(request, "write");
  if (limited) return limited;

  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "bad request" }, { status: 400 }); }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid params" }, { status: 422 });

  const { tradeId, thesis, tags } = parsed.data;

  // Verify trade belongs to this user
  const trade = await prisma.trade.findUnique({ where: { id: tradeId }, select: { userId: true } });
  if (!trade || trade.userId !== userId) {
    return NextResponse.json({ error: "trade not found" }, { status: 404 });
  }

  const record = await prisma.tradeThesis.upsert({
    where:  { tradeId },
    create: { tradeId, userId, thesis, tags: JSON.stringify(tags) },
    update: { thesis, tags: JSON.stringify(tags) },
  });

  return NextResponse.json({ ok: true, id: record.id });
}
