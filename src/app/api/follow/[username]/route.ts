import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/getSession";

import { prisma } from "@/lib/prisma";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const followerId = await getSessionUserId();
  if (!followerId) {
    return NextResponse.json({ error: "ยังไม่ได้เข้าสู่ระบบ" }, { status: 401 });
  }

  const { username } = await params;

  const target = await prisma.user.findFirst({
    where: { OR: [{ username }, { id: username }] },
    select: { id: true },
  });
  if (!target) return NextResponse.json({ error: "ไม่พบผู้ใช้" }, { status: 404 });

  const followingId = target.id;
  if (followingId === followerId) {
    return NextResponse.json({ error: "ไม่สามารถติดตามตัวเองได้" }, { status: 400 });
  }

  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId, followingId } },
  });

  if (existing) {
    await prisma.follow.delete({ where: { id: existing.id } });
  } else {
    await prisma.follow.create({ data: { followerId, followingId } });

    // Notify the followed user
    const follower = await prisma.user.findUnique({ where: { id: followerId }, select: { username: true, name: true } });
    const from = follower?.username ?? follower?.name ?? "ผู้ใช้";
    await prisma.notification.create({
      data: {
        userId:  followingId,
        type:    "follow",
        message: `${from} เริ่มติดตามคุณ`,
        link:    `/u/${follower?.username ?? followerId}`,
      },
    });
  }

  const count = await prisma.follow.count({ where: { followingId } });
  return NextResponse.json({ following: !existing, followerCount: count });
}
