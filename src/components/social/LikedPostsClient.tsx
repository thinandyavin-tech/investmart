"use client";

import { useState, useEffect } from "react";
import { PostRow, type PostData } from "@/components/social/PostRow";
import { useUser } from "@/lib/userContext";

interface FeedResponse {
  data:       PostData[];
  nextCursor: string | null;
}

export function LikedPostsClient() {
  const { user, loading: userLoading } = useUser();
  const [posts, setPosts]     = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userLoading) return;
    if (!user) { setLoading(false); return; }

    // Fetch posts liked by the current user by filtering liked=true in the feed
    // The API doesn't have a dedicated liked-posts endpoint yet; use the general feed
    // and let each PostRow show liked state based on the user's data
    fetch(`/api/posts?tab=discover`)
      .then(async (res) => {
        const data = (await res.json()) as FeedResponse;
        const liked = data.data.filter((p) => p.liked);
        setPosts(liked);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, userLoading]);

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
          <p className="text-[10px] text-[#8A8378]">เริ่ม demo เพื่อถูกใจโพสต์</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="py-12 text-center px-4">
          <p className="text-sm" aria-hidden="true">♥</p>
          <p className="text-xs font-bold mt-2 mb-1">ยังไม่มีโพสต์ที่ถูกใจ</p>
          <p className="text-[10px] text-[#8A8378]">กดหัวใจบนโพสต์เพื่อแสดงการสนับสนุน</p>
        </div>
      ) : (
        posts.map((p) => <PostRow key={p.id} post={p} />)
      )}
    </div>
  );
}
