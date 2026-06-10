import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/getSession";
import { computeTier, computePnlPct } from "@/lib/traderTier";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  const user = await prisma.user.findFirst({
    where: { OR: [{ username }, { id: username }] },
    select: {
      id:        true,
      name:      true,
      username:  true,
      bio:       true,
      cashThb:   true,
      cashUsd:   true,
      createdAt: true,
      holdings:  { select: { shares: true, avgCost: true } },
      _count: {
        select: {
          posts:        true,
          followers:    true,
          following:    true,
          tradeHistory: true,
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "ไม่พบผู้ใช้" }, { status: 404 });
  }

  const viewerId = await getSessionUserId();

  let isFollowing = false;
  if (viewerId && viewerId !== user.id) {
    const follow = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: viewerId, followingId: user.id } },
    });
    isFollowing = !!follow;
  }

  const tradeCount = user._count.tradeHistory;
  const pnlPct     = computePnlPct(user.cashThb, user.cashUsd, user.holdings);
  const tier       = computeTier({ pnlPct, tradeCount });

  return NextResponse.json({
    id:             user.id,
    name:           user.name,
    username:       user.username,
    bio:            user.bio,
    cashThb:        user.cashThb,
    createdAt:      user.createdAt.toISOString(),
    postCount:      user._count.posts,
    followerCount:  user._count.followers,
    followingCount: user._count.following,
    tradeCount,
    tier,
    isFollowing,
    isSelf:         viewerId === user.id,
  });
}
