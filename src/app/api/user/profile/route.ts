import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/getSession";

const NAME_COOLDOWN_DAYS = 5;

const UpdateSchema = z.object({
  // Allow empty string so callers can clear the name (stored as null)
  name: z.string().max(50).optional(),
  bio:  z.string().max(300).optional(),
});

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "invalid JSON" }, { status: 400 }); }

  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "invalid input" }, { status: 422 });
  }

  const { name, bio } = parsed.data;

  // Enforce name-change cooldown when name is being updated
  if (name !== undefined) {
    const existing = await prisma.user.findUnique({
      where:  { id: userId },
      select: { lastNameChangeAt: true },
    });

    if (existing?.lastNameChangeAt) {
      const msSinceChange  = Date.now() - existing.lastNameChangeAt.getTime();
      const msCooldown     = NAME_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
      if (msSinceChange < msCooldown) {
        const daysRemaining = Math.ceil((msCooldown - msSinceChange) / (24 * 60 * 60 * 1000));
        return NextResponse.json(
          { error: `เปลี่ยนชื่อได้อีกครั้งใน ${daysRemaining} วัน` },
          { status: 429 }
        );
      }
    }
  }

  // Build the update payload
  const data: Record<string, string | null | Date> = {};
  if (name !== undefined) {
    // Empty string → clear the name (set null)
    data.name            = name.trim() === "" ? null : name.trim();
    data.lastNameChangeAt = new Date();
  }
  if (bio !== undefined) {
    data.bio = bio.trim();
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "nothing to update" }, { status: 400 });
  }

  const user = await prisma.user.update({ where: { id: userId }, data });
  return NextResponse.json({
    ok:               true,
    name:             user.name,
    bio:              user.bio,
    lastNameChangeAt: user.lastNameChangeAt?.toISOString() ?? null,
  });
}
