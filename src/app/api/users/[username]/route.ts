import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  const user = await prisma.user.findFirst({
    where: { OR: [{ username }, { id: username }] },
    select: {
      id:       true,
      name:     true,
      username: true,
      bio:      true,
      cashThb:  true,
      createdAt: true,
      _count: {
        select: {
          posts:       true,
          followers:   true,
          following:   true,
          tradeHistory: true,
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "ไม่พบผู้ใช้" }, { status: 404 });
  }

  const cookieStore = await cookies();
  const viewerId = cookieStore.get("demo_user_id")?.value ?? null;

  let isFollowing = false;
  if (viewerId && viewerId !== user.id) {
    const follow = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: viewerId, followingId: user.id } },
    });
    isFollowing = !!follow;
  }

  return NextResponse.json({
    id:            user.id,
    name:          user.name,
    username:      user.username,
    bio:           user.bio,
    cashThb:       user.cashThb,
    createdAt:     user.createdAt.toISOString(),
    postCount:     user._count.posts,
    followerCount: user._count.followers,
    followingCount: user._count.following,
    tradeCount:    user._count.tradeHistory,
    isFollowing,
    isSelf:        viewerId === user.id,
  });
}
