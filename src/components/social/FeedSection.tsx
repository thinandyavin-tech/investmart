"use client";

import { useState, useEffect, useCallback } from "react";
import { PostRow, type PostData } from "@/components/social/PostRow";
import { PostComposer } from "@/components/social/PostComposer";

type FeedTab = "discover" | "following";

interface FeedSectionProps {
  userId?:       string | null;
  showComposer?: boolean;
  compact?:      boolean;
}

interface FeedResponse {
  data:       PostData[];
  nextCursor: string | null;
}

export function FeedSection({ userId, showComposer = true, compact = false }: FeedSectionProps) {
  const [tab, setTab]           = useState<FeedTab>("discover");
  const [posts, setPosts]       = useState<PostData[]>([]);
  const [cursor, setCursor]     = useState<string | null>(null);
  const [loading, setLoading]   = useState(true);
  const [hasMore, setHasMore]   = useState(false);
  const [loadingMore, setMore]  = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [retryCount, setRetry]  = useState(0);

  const fetchPosts = useCallback(async (nextTab: FeedTab, nextCursor: string | null) => {
    const params = new URLSearchParams({ tab: nextTab });
    if (userId) params.set("userId", userId);
    if (nextCursor) params.set("cursor", nextCursor);

    const res  = await fetch(`/api/posts?${params.toString()}`);
    return (await res.json()) as FeedResponse;
  }, [userId]);

  useEffect(() => {
    setLoading(true);
    setPosts([]);
    setCursor(null);
    setError(null);
    fetchPosts(tab, null)
      .then(({ data, nextCursor }) => {
        setPosts(data);
        setCursor(nextCursor);
        setHasMore(!!nextCursor);
      })
      .catch(() => setError("ไม่สามารถโหลดโพสต์ได้ กรุณาลองใหม่"))
      .finally(() => setLoading(false));
  }, [tab, fetchPosts, retryCount]);

  async function loadMore() {
    if (!cursor || loadingMore) return;
    setMore(true);
    try {
      const { data, nextCursor } = await fetchPosts(tab, cursor);
      setPosts((prev) => [...prev, ...data]);
      setCursor(nextCursor);
      setHasMore(!!nextCursor);
    } catch {
      // keep existing state
    } finally {
      setMore(false);
    }
  }

  function prepend(post: PostData) {
    setPosts((prev) => [post, ...prev]);
  }

  return (
    <div className="flex flex-col">
      {!userId && (
        <div className="flex border-b border-[#1F1A14]">
          {(["discover", "following"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wide transition-colors ${
                tab === t
                  ? "bg-[#1F1A14] text-white"
                  : "bg-[#F3EDE0] text-[#8A8378] hover:text-[#1F1A14]"
              }`}
              aria-pressed={tab === t}
            >
              {t === "discover" ? "ค้นพบ" : "ติดตาม"}
            </button>
          ))}
        </div>
      )}

      {showComposer && !userId && (
        <div className="border-b border-[#E8E2D4]">
          <PostComposer onPublished={prepend} compact={compact} />
        </div>
      )}

      {loading ? (
        <FeedSkeleton />
      ) : error ? (
        <div className="flex flex-col items-center py-12 gap-2 px-4">
          <p className="text-xs font-bold text-red-600 text-center">{error}</p>
          <button
            onClick={() => setRetry((c) => c + 1)}
            className="text-[10px] underline text-[#8A8378] hover:text-[#1F1A14]"
          >
            ลองใหม่
          </button>
        </div>
      ) : posts.length === 0 ? (
        <FeedEmpty tab={tab} />
      ) : (
        <>
          {posts.map((p) => <PostRow key={p.id} post={p} />)}
          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="w-full py-3 text-xs font-bold text-[#8A8378] hover:text-[#1F1A14] border-t border-[#E8E2D4] transition-colors disabled:opacity-40"
            >
              {loadingMore ? "กำลังโหลด..." : "โหลดเพิ่มเติม"}
            </button>
          )}
        </>
      )}
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="flex flex-col" aria-busy="true" aria-label="กำลังโหลดฟีด">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex gap-3 px-4 py-3 border-b border-[#E8E2D4] animate-pulse">
          <div className="w-9 h-9 rounded-full bg-[#E8E2D4] flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-32 bg-[#E8E2D4] rounded" />
            <div className="h-3 w-full bg-[#E8E2D4] rounded" />
            <div className="h-3 w-3/4 bg-[#E8E2D4] rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

function FeedEmpty({ tab }: { tab: FeedTab }) {
  return (
    <div className="flex flex-col items-center py-12 gap-2 px-4">
      <span className="text-2xl" aria-hidden="true">✏️</span>
      <p className="text-xs font-bold text-[#1F1A14] text-center">
        {tab === "following" ? "ยังไม่มีโพสต์จากคนที่ติดตาม" : "ยังไม่มีโพสต์"}
      </p>
      <p className="text-[10px] text-[#8A8378] text-center">
        {tab === "following"
          ? "ติดตามเทรดเดอร์คนอื่นเพื่อดูโพสต์ของพวกเขาที่นี่"
          : "เป็นคนแรกที่แบ่งปันมุมมองการลงทุน!"}
      </p>
    </div>
  );
}
