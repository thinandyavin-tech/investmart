import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { validateContent, extractCashtags } from "@/lib/postUtils";
import { getSessionUserId } from "@/lib/getSession";

const TICKER_RE = /^[A-Z][A-Z.\-]{0,9}$/;
const PAGE_SIZE = 20;

const CreatePostSchema = z.object({
  content: z.string().min(1).max(500),
  ticker:  z.string().regex(TICKER_RE).optional(),
  topic:   z.string().max(50).optional(),
});

const postSelect = {
  id:        true,
  content:   true,
  ticker:    true,
  topic:     true,
  createdAt: true,
  user: {
    select: {
      id:       true,
      name:     true,
      username: true,
      _count:   { select: { tradeHistory: true } },
    },
  },
  _count: { select: { likes: true, comments: true } },
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
      ? {
          user: {
            followers: { some: { followerId: userId } },
          },
        }
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
  }));

  return NextResponse.json({ data: serialized, nextCursor });
}

export async function POST(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "ยังไม่ได้เข้าสู่ระบบ" }, { status: 401 });
  }

  const parseResult = CreatePostSchema.safeParse(await request.json().catch(() => null));
  if (!parseResult.success) {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 422 });
  }

  const { content: rawContent, ticker, topic } = parseResult.data;
  const content = validateContent(rawContent);
  if (!content) {
    return NextResponse.json({ error: "เนื้อหาไม่ถูกต้อง" }, { status: 422 });
  }

  // Auto-detect primary cashtag from content if ticker not explicitly set
  const cashtags  = extractCashtags(content);
  const finalTicker = ticker ?? cashtags[0];

  const post = await prisma.post.create({
    data:   { userId, content, ticker: finalTicker, topic },
    select: postSelect,
  });

  return NextResponse.json({
    id:           post.id,
    content:      post.content,
    ticker:       post.ticker,
    topic:        post.topic,
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
  }, { status: 201 });
}
