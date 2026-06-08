"use client";

import { useState, useEffect } from "react";
import { PostRow, type PostData } from "@/components/social/PostRow";

interface BookmarksResponse {
  data:       PostData[];
  nextCursor: string | null;
}

export function SavedPostsClient() {
  const [posts, setPosts]     = useState<PostData[]>([]);
  const [cursor, setCursor]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [more, setMore]       = useState(false);
  const [authed, setAuthed]   = useState(true);

  useEffect(() => {
    fetch("/api/bookmarks")
      .then(async (res) => {
        if (res.status === 401) { setAuthed(false); return; }
        const data = (await res.json()) as BookmarksResponse;
        setPosts(data.data);
        setCursor(data.nextCursor);
        setHasMore(!!data.nextCursor);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function loadMore() {
    if (!cursor || more) return;
    setMore(true);
    try {
      const res  = await fetch(`/api/bookmarks?cursor=${cursor}`);
      const data = (await res.json()) as BookmarksResponse;
      setPosts((prev) => [...prev, ...data.data]);
      setCursor(data.nextCursor);
      setHasMore(!!data.nextCursor);
    } catch {
      // keep state
    } finally {
      setMore(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="px-4 py-3 border-b border-[#1F1A14]">
        <h1 className="text-xs font-bold uppercase tracking-widest">หน้าบันทึกโพส</h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <p className="text-xs text-[#8A8378]">กำลังโหลด...</p>
        </div>
      ) : !authed ? (
        <div className="py-12 text-center px-4">
          <p className="text-xs font-bold mb-1">กรุณาเข้าสู่ระบบก่อน</p>
          <p className="text-xs text-[#8A8378]">เริ่ม demo เพื่อบันทึกโพสต์</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="py-12 text-center px-4">
          <p className="text-sm" aria-hidden="true">🔖</p>
          <p className="text-xs font-bold mt-2 mb-1">ยังไม่มีโพสต์ที่บันทึก</p>
          <p className="text-xs text-[#8A8378]">กดไอคอนบันทึกบนโพสต์เพื่อเก็บไว้ที่นี่</p>
        </div>
      ) : (
        <>
          {posts.map((p) => <PostRow key={p.id} post={p} />)}
          {hasMore && (
            <button
              onClick={loadMore}
              disabled={more}
              className="w-full py-3 text-xs font-bold text-[#8A8378] hover:text-[#1F1A14] border-t border-[#E8E2D4] transition-colors disabled:opacity-40"
            >
              {more ? "กำลังโหลด..." : "โหลดเพิ่มเติม"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
