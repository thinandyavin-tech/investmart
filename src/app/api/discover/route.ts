import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/getSession";

const TRENDING_DAYS = 7;
const CACHE_TTL_MS  = 5 * 60 * 1000;

interface CacheEntry { data: unknown; at: number }
const cache = new Map<string, CacheEntry>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry || Date.now() - entry.at > CACHE_TTL_MS) return null;
  return entry.data as T;
}
function setCached(key: string, data: unknown) {
  cache.set(key, { data, at: Date.now() });
}

export async function GET(): Promise<NextResponse> {
  const userId = await getSessionUserId();

  const cached = getCached<unknown>("discover");
  if (cached) {
    return NextResponse.json(cached);
  }

  const since = new Date(Date.now() - TRENDING_DAYS * 24 * 60 * 60 * 1000);

  const [trendingPosts, topTraders, hotTickers] = await Promise.all([
    // Top 10 posts by likes in last 7 days
    prisma.post.findMany({
      where:   { createdAt: { gte: since } },
      orderBy: { likes: { _count: "desc" } },
      take:    10,
      select: {
        id:        true,
        content:   true,
        createdAt: true,
        ticker:  true,
        _count:    { select: { likes: true, comments: true } },
        user: {
          select: {
            id:       true,
            name:     true,
            username: true,
          },
        },
      },
    }),

    // Top 5 traders by follower count
    prisma.user.findMany({
      orderBy: { followers: { _count: "desc" } },
      take:    5,
      select: {
        id:       true,
        name:     true,
        username: true,
        _count:   { select: { followers: true, posts: true } },
      },
    }),

    // Hot tickers in last 7 days
    prisma.post.findMany({
      where:   { createdAt: { gte: since }, ticker: { not: null } },
      select:  { ticker: true },
      take:    200,
    }),
  ]);

  // Count ticker frequency
  const tickerCounts: Record<string, number> = {};
  for (const post of hotTickers) {
    if (post.ticker) {
      tickerCounts[post.ticker] = (tickerCounts[post.ticker] ?? 0) + 1;
    }
  }
  const trendingTickers = Object.entries(tickerCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([ticker, count]) => ({ ticker, count }));

  // Mark liked posts for authenticated user
  let likedIds = new Set<string>();
  if (userId) {
    const postIds = trendingPosts.map((p) => p.id);
    const likes   = await prisma.like.findMany({
      where:  { userId, postId: { in: postIds } },
      select: { postId: true },
    });
    likedIds = new Set(likes.map((l) => l.postId));
  }

  const result = {
    trendingPosts: trendingPosts.map((p) => ({
      ...p,
      liked: likedIds.has(p.id),
    })),
    topTraders: topTraders.map((t) => ({
      id:        t.id,
      name:      t.name ?? t.username ?? "นักลงทุน",
      username:  t.username,
      followers: t._count.followers,
      posts:     t._count.posts,
    })),
    trendingTickers,
  };

  setCached("discover", result);
  return NextResponse.json(result);
}
