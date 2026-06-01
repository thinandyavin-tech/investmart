import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/getSession";

import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 20;

export async function GET(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "ยังไม่ได้เข้าสู่ระบบ" }, { status: 401 });
  }

  const cursor = request.nextUrl.searchParams.get("cursor") ?? undefined;

  const bookmarks = await prisma.bookmark.findMany({
    where:   { userId },
    orderBy: { createdAt: "desc" },
    take:    PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id:   true,
      post: {
        select: {
          id:        true,
          content:   true,
          ticker:    true,
          topic:     true,
          createdAt: true,
          user: {
            select: { id: true, name: true, username: true },
          },
          _count: { select: { likes: true, comments: true } },
        },
      },
    },
  });

  const hasMore   = bookmarks.length > PAGE_SIZE;
  const items     = hasMore ? bookmarks.slice(0, PAGE_SIZE) : bookmarks;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  return NextResponse.json({
    data: items.map((b) => ({
      bookmarkId:   b.id,
      id:           b.post.id,
      content:      b.post.content,
      ticker:       b.post.ticker,
      topic:        b.post.topic,
      createdAt:    b.post.createdAt.toISOString(),
      likeCount:    b.post._count.likes,
      commentCount: b.post._count.comments,
      liked:        false,
      bookmarked:   true,
      author: {
        id:       b.post.user.id,
        name:     b.post.user.name,
        username: b.post.user.username,
      },
    })),
    nextCursor,
  });
}
