"use client";

import { useState, useEffect, useCallback } from "react";
import { PostRow, type PostData } from "@/components/social/PostRow";
import { useUser } from "@/lib/userContext";

interface FeedResponse {
  data:       PostData[];
  nextCursor: string | null;
}

export function LikedPostsClient() {
  const { user, loading: userLoading } = useUser();
  const [posts, setPosts]       = useState<PostData[]>([]);
  const [cursor, setCursor]     = useState<string | null>(null);
  const [loading, setLoading]   = useState(true);
  const [hasMore, setHasMore]   = useState(false);
  const [loadingMore, setMore]  = useState(false);

  const fetchPosts = useCallback(async (nextCursor: string | null) => {
    const params = new URLSearchParams({ tab: "liked" });
    if (nextCursor) params.set("cursor", nextCursor);
    const res = await fetch(`/api/posts?${params.toString()}`);
    return (await res.json()) as FeedResponse;
  }, []);

  useEffect(() => {
    if (userLoading) return;
    if (!user) { setLoading(false); return; }
    setLoading(true);
    fetchPosts(null)
      .then(({ data, nextCursor }) => {
        setPosts(data);
        setCursor(nextCursor);
        setHasMore(!!nextCursor);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, userLoading, fetchPosts]);

  async function loadMore() {
    if (!cursor || loadingMore) return;
    setMore(true);
    try {
      const { data, nextCursor } = await fetchPosts(cursor);
      setPosts((prev) => [...prev, ...data]);
      setCursor(nextCursor);
      setHasMore(!!nextCursor);
    } catch {
      // keep existing state
    } finally {
      setMore(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="px-4 py-3 border-b border-[#1F1A14]">
        <h1 className="text-xs font-bold uppercase tracking-widest">โพสต์ที่ถูกใจ</h1>
      </div>

      {loading || userLoading ? (
        <div className="flex justify-center py-12">
          <p className="text-xs text-[#8A8378]">กำลังโหลด...</p>
        </div>
      ) : !user ? (
        <div className="py-12 text-center px-4">
          <p className="text-xs font-bold mb-1">กรุณาเข้าสู่ระบบก่อน</p>
          <p className="text-xs text-[#8A8378]">เข้าสู่ระบบเพื่อดูโพสต์ที่ถูกใจ</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="py-12 text-center px-4">
          <p className="text-sm" aria-hidden="true">♥</p>
          <p className="text-xs font-bold mt-2 mb-1">ยังไม่มีโพสต์ที่ถูกใจ</p>
          <p className="text-xs text-[#8A8378]">กดหัวใจบนโพสต์เพื่อแสดงการสนับสนุน</p>
        </div>
      ) : (
        <>
          {posts.map((p) => <PostRow key={p.id} post={p} />)}
          {hasMore && (
            <div className="p-4 text-center">
              <button
                onClick={() => void loadMore()}
                disabled={loadingMore}
                className="text-xs text-[#8A8378] hover:text-[#1F1A14] disabled:opacity-40"
              >
                {loadingMore ? "กำลังโหลด..." : "โหลดเพิ่มเติม"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
