"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PostComposer } from "@/components/social/PostComposer";
import type { PostData } from "@/components/social/PostRow";
import { useUser } from "@/lib/userContext";

export function ComposePageClient() {
  const { user, loading } = useUser();
  const router            = useRouter();
  const [published, setPublished] = useState(false);

  function handlePublished(post: PostData) {
    setPublished(true);
    setTimeout(() => router.push(`/u/${post.author.username ?? post.author.id}`), 1200);
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto p-4">
        <div className="h-4 w-32 bg-[#E8E2D4] animate-pulse rounded mb-4" />
        <div className="h-32 bg-[#E8E2D4] animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto p-4">
      <h1 className="text-xs font-bold uppercase tracking-widest mb-4">เขียนโพสต์</h1>

      {!user ? (
        <div className="border-2 border-[#1F1A14] bg-[#F3EDE0] p-6 text-center flex flex-col gap-3">
          <p className="text-xs text-[#8A8378]">เข้าสู่ระบบเพื่อเขียนโพสต์</p>
          <div className="flex gap-2 justify-center">
            <Link href="/signin">
              <span className="inline-block px-5 py-2 text-xs font-bold bg-[#1F1A14] text-white border-2 border-[#1F1A14]" style={{ boxShadow: "2px 2px 0 #5B8A2A" }}>
                เข้าสู่ระบบ
              </span>
            </Link>
            <Link href="/signup">
              <span className="inline-block px-5 py-2 text-xs font-bold border-2 border-[#5B8A2A] text-[#5B8A2A] hover:bg-[#9BE15D] transition-colors">
                สมัครสมาชิก
              </span>
            </Link>
          </div>
        </div>
      ) : published ? (
        <div className="border border-[#5B8A2A] bg-[#F3EDE0] p-6 text-center">
          <p className="text-xs font-bold text-[#5B8A2A]">โพสต์สำเร็จ ✓</p>
          <p className="text-xs text-[#8A8378] mt-1">กำลังไปที่โปรไฟล์...</p>
        </div>
      ) : (
        <PostComposer onPublished={handlePublished} />
      )}

      <p className="text-xs text-[#8A8378] mt-3 text-center">
        ข้อความล้วน · ไม่มีรูป · ไม่มีวิดีโอ · ไม่มีอีโมจิ — มีแต่ความคิด
      </p>
    </div>
  );
}
