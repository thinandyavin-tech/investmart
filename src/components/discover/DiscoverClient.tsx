"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card } from "@/components/Card";

interface Post {
  id:        string;
  content:   string;
  createdAt: string;
  ticker:    string | null;
  liked:     boolean;
  _count:    { likes: number; comments: number };
  user:      { id: string; name: string | null; username: string | null };
}

interface Trader {
  id:        string;
  name:      string;
  username:  string | null;
  followers: number;
  posts:     number;
}

interface TickerCount {
  ticker: string;
  count:  number;
}

interface DiscoverData {
  trendingPosts:   Post[];
  topTraders:      Trader[];
  trendingTickers: TickerCount[];
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "เมื่อกี้";
  if (m < 60) return `${m}น. ที่แล้ว`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}ช. ที่แล้ว`;
  return `${Math.floor(h / 24)}ว. ที่แล้ว`;
}

export function DiscoverClient() {
  const [data, setData]       = useState<DiscoverData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    fetch("/api/discover")
      .then((r) => r.json() as Promise<DiscoverData>)
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 flex flex-col gap-5">
      <div>
        <h1 className="text-xs font-bold uppercase tracking-widest">Discover</h1>
        <p className="text-xs text-[#8A8378] mt-0.5">ยอดนิยมใน 7 วัน</p>
      </div>

      {loading && (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="p-4">
              <div className="h-3 w-48 bg-[#E8E2D4] animate-pulse rounded mb-2" />
              <div className="h-2 w-full bg-[#E8E2D4] animate-pulse rounded mb-1" />
              <div className="h-2 w-3/4 bg-[#E8E2D4] animate-pulse rounded" />
            </Card>
          ))}
        </div>
      )}

      {error && (
        <Card className="p-4 text-center">
          <p className="text-xs text-[#DC2626]">โหลดไม่ได้ กรุณาลองใหม่</p>
        </Card>
      )}

      {!loading && !error && data && (
        <>
          {/* Trending tickers */}
          {data.trendingTickers.length > 0 && (
            <section>
              <h2 className="text-xs font-bold uppercase tracking-widest mb-2 text-[#8A8378]">
                หุ้นที่ถูกพูดถึงมากสุด
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {data.trendingTickers.map(({ ticker, count }) => (
                  <Link
                    key={ticker}
                    href={`/stock/${ticker}`}
                    className="flex items-center gap-1.5 border border-[#1F1A14] px-2.5 py-1 text-xs font-bold hover:bg-[#1F1A14] hover:text-white transition-colors"
                  >
                    <span>${ticker}</span>
                    <span className="text-[#8A8378] group-hover:text-[#ccc] text-xs">{count}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Top traders */}
          {data.topTraders.length > 0 && (
            <section>
              <h2 className="text-xs font-bold uppercase tracking-widest mb-2 text-[#8A8378]">
                เทรดเดอร์ยอดนิยม
              </h2>
              <Card className="overflow-hidden">
                {data.topTraders.map((trader, i) => (
                  <div
                    key={trader.id}
                    className="flex items-center gap-3 px-3 py-2.5 border-b border-[#E8E2D4] last:border-0"
                  >
                    <span className="text-xs font-bold text-[#8A8378] w-5 flex-shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={trader.username ? `/u/${trader.username}` : "#"}
                        className="font-bold text-xs hover:underline"
                      >
                        {trader.name}
                      </Link>
                      {trader.username && (
                        <span className="text-xs text-[#8A8378] ml-1.5">@{trader.username}</span>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs font-bold">{trader.followers.toLocaleString()} followers</div>
                      <div className="text-xs text-[#8A8378]">{trader.posts} โพสต์</div>
                    </div>
                    {trader.username && (
                      <Link
                        href={`/u/${trader.username}`}
                        className="text-xs font-bold border border-[#5B8A2A] text-[#5B8A2A] px-2 py-0.5 hover:bg-[#5B8A2A] hover:text-white transition-colors flex-shrink-0"
                      >
                        ดู
                      </Link>
                    )}
                  </div>
                ))}
              </Card>
            </section>
          )}

          {/* Trending posts */}
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest mb-2 text-[#8A8378]">
              โพสต์ยอดนิยม (7 วัน)
            </h2>
            {data.trendingPosts.length === 0 ? (
              <Card className="p-4 text-center">
                <p className="text-xs text-[#8A8378]">ยังไม่มีโพสต์ในช่วงนี้</p>
              </Card>
            ) : (
              <div className="flex flex-col gap-2">
                {data.trendingPosts.map((post) => {
                  const author = post.user.name ?? post.user.username ?? "นักลงทุน";
                  const handle = post.user.username ? `@${post.user.username}` : "";
                  return (
                    <Card key={post.id} className="p-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-xs font-bold">{author}</span>
                        {handle && <span className="text-xs text-[#8A8378]">{handle}</span>}
                        <span className="text-xs text-[#8A8378] ml-auto flex-shrink-0">
                          {relativeTime(post.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed line-clamp-3">{post.content}</p>
                      {post.ticker && (
                        <Link
                          href={`/stock/${post.ticker}`}
                          className="inline-block text-xs font-bold text-[#5B8A2A] hover:underline mt-1.5"
                        >
                          ${post.ticker}
                        </Link>
                      )}
                      <div className="flex gap-3 mt-2 text-xs text-[#8A8378]">
                        <span>❤️ {post._count.likes}</span>
                        <span>💬 {post._count.comments}</span>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
