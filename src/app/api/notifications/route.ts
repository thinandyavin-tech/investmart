import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/getSession";

export async function GET(): Promise<NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ notifications: [], unread: 0 });

  const notifications = await prisma.notification.findMany({
    where:   { userId },
    orderBy: { createdAt: "desc" },
    take:    30,
  });
  const unread = notifications.filter((n) => !n.read).length;
  return NextResponse.json({ notifications, unread });
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "ยังไม่ได้เข้าสู่ระบบ" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { markAllRead?: boolean };
  if (body.markAllRead) {
    await prisma.notification.updateMany({
      where: { userId, read: false },
      data:  { read: true },
    });
  }
  return NextResponse.json({ ok: true });
}
