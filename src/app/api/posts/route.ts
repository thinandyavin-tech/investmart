import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { validateContent, extractCashtags } from "@/lib/postUtils";
import { getSessionUserId } from "@/lib/getSession";
import { applyRateLimit } from "@/lib/rateLimit";

const TICKER_RE = /^[A-Z][A-Z.\-]{0,9}$/;
const PAGE_SIZE = 20;

const CreatePostSchema = z.object({
  content:      z.string().min(1).max(500),
  ticker:       z.string().regex(TICKER_RE).optional(),
  topic:        z.string().max(50).optional(),
  quotedPostId: z.string().min(1).max(40).optional(),
});

const postSelect = {
  id:         true,
  content:    true,
  ticker:     true,
  topic:      true,
  quoteCount: true,
  createdAt:  true,
  user: {
    select: {
      id:       true,
      name:     true,
      username: true,
      _count:   { select: { tradeHistory: true } },
    },
  },
  _count: { select: { likes: true, comments: true } },
  quotedPost: {
    select: {
      id:        true,
      content:   true,
      ticker:    true,
      createdAt: true,
      user: { select: { id: true, name: true, username: true } },
    },
  },
} as const;

export async function GET(request: NextRequest) {
  const userId = await getSessionUserId();

  const { searchParams } = request.nextUrl;
  const tab      = searchParams.get("tab") ?? "discover";
  const cursor   = searchParams.get("cursor") ?? undefined;
  const userParam = searchParams.get("userId") ?? undefined;

  const where = userParam
    ? { userId: userParam }
    : tab === "following" && userId
      ? { user: { followers: { some: { followerId: userId } } } }
      : tab === "liked" && userId
        ? { likes: { some: { userId } } }
        : {};

  const posts = await prisma.post.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take:    PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select:  postSelect,
  });

  const hasMore   = posts.length > PAGE_SIZE;
  const pageItems = hasMore ? posts.slice(0, PAGE_SIZE) : posts;
  const nextCursor = hasMore ? pageItems[pageItems.length - 1].id : null;

  let likedIds: Set<string> = new Set();
  let bookmarkedIds: Set<string> = new Set();

  if (userId) {
    const ids = pageItems.map((p) => p.id);
    const [likes, bookmarks] = await Promise.all([
      prisma.like.findMany({
        where: { userId, postId: { in: ids } },
        select: { postId: true },
      }),
      prisma.bookmark.findMany({
        where: { userId, postId: { in: ids } },
        select: { postId: true },
      }),
    ]);
    likedIds      = new Set(likes.map((l) => l.postId));
    bookmarkedIds = new Set(bookmarks.map((b) => b.postId));
  }

  const serialized = pageItems.map((p) => ({
    id:           p.id,
    content:      p.content,
    ticker:       p.ticker,
    topic:        p.topic,
    quoteCount:   p.quoteCount,
    createdAt:    p.createdAt.toISOString(),
    likeCount:    p._count.likes,
    commentCount: p._count.comments,
    liked:        likedIds.has(p.id),
    bookmarked:   bookmarkedIds.has(p.id),
    author: {
      id:          p.user.id,
      name:        p.user.name,
      username:    p.user.username,
      tradeCount:  p.user._count.tradeHistory,
    },
    quotedPost: p.quotedPost
      ? {
          id:        p.quotedPost.id,
          content:   p.quotedPost.content,
          ticker:    p.quotedPost.ticker,
          createdAt: p.quotedPost.createdAt.toISOString(),
          author: {
            id:       p.quotedPost.user.id,
            name:     p.quotedPost.user.name,
            username: p.quotedPost.user.username,
          },
        }
      : null,
  }));

  return NextResponse.json({ data: serialized, nextCursor });
}

export async function POST(request: NextRequest) {
  const limited = await applyRateLimit(request, "write");
  if (limited) return limited;

  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "ยังไม่ได้เข้าสู่ระบบ" }, { status: 401 });
  }

  const parseResult = CreatePostSchema.safeParse(await request.json().catch(() => null));
  if (!parseResult.success) {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 422 });
  }

  const { content: rawContent, ticker, topic, quotedPostId } = parseResult.data;
  const content = validateContent(rawContent);
  if (!content) {
    return NextResponse.json({ error: "เนื้อหาไม่ถูกต้อง" }, { status: 422 });
  }

  if (quotedPostId) {
    const exists = await prisma.post.findUnique({ where: { id: quotedPostId }, select: { id: true } });
    if (!exists) return NextResponse.json({ error: "โพสต์ที่อ้างอิงไม่พบ" }, { status: 404 });
  }

  const cashtags    = extractCashtags(content);
  const finalTicker = ticker ?? cashtags[0];

  const post = await prisma.$transaction(async (tx) => {
    const newPost = await tx.post.create({
      data:   { userId, content, ticker: finalTicker, topic, quotedPostId },
      select: postSelect,
    });
    if (quotedPostId) {
      await tx.post.update({ where: { id: quotedPostId }, data: { quoteCount: { increment: 1 } } });
    }
    return newPost;
  });

  return NextResponse.json({
    id:           post.id,
    content:      post.content,
    ticker:       post.ticker,
    topic:        post.topic,
    quoteCount:   post.quoteCount,
    createdAt:    post.createdAt.toISOString(),
    likeCount:    0,
    commentCount: 0,
    liked:        false,
    bookmarked:   false,
    author: {
      id:         post.user.id,
      name:       post.user.name,
      username:   post.user.username,
      tradeCount: post.user._count.tradeHistory,
    },
    quotedPost: post.quotedPost
      ? {
          id:        post.quotedPost.id,
          content:   post.quotedPost.content,
          ticker:    post.quotedPost.ticker,
          createdAt: post.quotedPost.createdAt.toISOString(),
          author: {
            id:       post.quotedPost.user.id,
            name:     post.quotedPost.user.name,
            username: post.quotedPost.user.username,
          },
        }
      : null,
  }, { status: 201 });
}
