/**
 * Journey progress — stores and retrieves a user's learning journey state.
 * GET  /api/journey/progress   — returns current progress for auth'd user
 * PATCH /api/journey/progress  — updates completed steps / readiness flags
 */

import { NextRequest, NextResponse } from "next/server";
import { z }                         from "zod";
import { prisma }                    from "@/lib/prisma";
import { getSessionInfo }            from "@/lib/getSession";

const PatchSchema = z.object({
  completedSteps:   z.array(z.string()).optional(),
  readinessDone:    z.boolean().optional(),
  readinessSkipped: z.boolean().optional(),
  firstTradeAt:     z.string().datetime().optional(),
});

export async function GET(_request: NextRequest): Promise<NextResponse> {
  const session = await getSessionInfo();
  if (!session.userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const progress = await prisma.journeyProgress.findUnique({
    where: { userId: session.userId! },
  });

  if (!progress) {
    return NextResponse.json({
      completedSteps:   [],
      readinessDone:    false,
      readinessSkipped: false,
      firstTradeAt:     null,
    });
  }

  let completedSteps: string[] = [];
  try { completedSteps = JSON.parse(progress.completedSteps) as string[]; } catch { /* noop */ }

  return NextResponse.json({
    completedSteps,
    readinessDone:    progress.readinessDone,
    readinessSkipped: progress.readinessSkipped,
    firstTradeAt:     progress.firstTradeAt?.toISOString() ?? null,
  });
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const session = await getSessionInfo();
  if (!session.userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "invalid body" }, { status: 400 }); }

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid params" }, { status: 422 });

  const data = parsed.data;

  const uid = session.userId!;
  const existing = await prisma.journeyProgress.findUnique({ where: { userId: uid } });

  // Merge incoming completedSteps with existing to avoid overwriting progress
  let merged: string[] = [];
  if (existing) {
    try { merged = JSON.parse(existing.completedSteps) as string[]; } catch { /* noop */ }
  }
  if (data.completedSteps) {
    merged = Array.from(new Set([...merged, ...data.completedSteps]));
  }

  await prisma.journeyProgress.upsert({
    where:  { userId: uid },
    create: {
      userId:           uid,
      completedSteps:   JSON.stringify(merged),
      readinessDone:    data.readinessDone    ?? false,
      readinessSkipped: data.readinessSkipped ?? false,
      firstTradeAt:     data.firstTradeAt ? new Date(data.firstTradeAt) : null,
    },
    update: {
      completedSteps:   JSON.stringify(merged),
      ...(data.readinessDone    !== undefined && { readinessDone:    data.readinessDone }),
      ...(data.readinessSkipped !== undefined && { readinessSkipped: data.readinessSkipped }),
      ...(data.firstTradeAt     !== undefined && { firstTradeAt:     new Date(data.firstTradeAt) }),
    },
  });

  return NextResponse.json({ ok: true, completedSteps: merged });
}
