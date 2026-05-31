import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/getSession";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,30}$/;

const Schema = z.object({
  username: z.string().regex(USERNAME_RE, "3-30 ตัวอักษร a-z 0-9 _"),
});

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "invalid JSON" }, { status: 400 }); }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 422 });
  }

  const { username } = parsed.data;

  const existing = await prisma.user.findFirst({
    where: { username, NOT: { id: userId } },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ error: "ชื่อผู้ใช้นี้มีคนใช้แล้ว" }, { status: 409 });
  }

  const user = await prisma.user.update({
    where:  { id: userId },
    data:   { username },
    select: { username: true },
  });
  return NextResponse.json({ ok: true, username: user.username });
}
