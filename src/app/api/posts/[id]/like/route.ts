import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/getSession";

import { prisma } from "@/lib/prisma";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "ยังไม่ได้เข้าสู่ระบบ" }, { status: 401 });
  }

  const { id: postId } = await params;

  const existing = await prisma.like.findUnique({
    where: { userId_postId: { userId, postId } },
  });

  if (existing) {
    await prisma.like.delete({ where: { id: existing.id } });
  } else {
    await prisma.like.create({ data: { userId, postId } });
  }

  const count = await prisma.like.count({ where: { postId } });
  return NextResponse.json({ liked: !existing, count });
}
