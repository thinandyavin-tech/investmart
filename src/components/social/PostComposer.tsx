"use client";

import { useState } from "react";
import type { PostData } from "@/components/social/PostRow";
import { MAX_CONTENT } from "@/lib/postUtils";

const TICKER_RE = /^[A-Z][A-Z.\-]{0,9}$/;

const TOPICS = ["หุ้น", "Macro", "เทคนิค", "ข่าว", "แชร์พอร์ต", "คำถาม"] as const;

interface PostComposerProps {
  onPublished?: (post: PostData) => void;
  placeholder?: string;
  compact?:     boolean;
  quotePost?:   PostData;
}

export function PostComposer({ onPublished, placeholder, compact = false, quotePost }: PostComposerProps) {
  const [content, setContent]   = useState("");
  const [ticker, setTicker]     = useState("");
  const [topic, setTopic]       = useState("");
  const [submitting, setSubmit] = useState(false);
  const [error, setError]       = useState("");

  const remaining = MAX_CONTENT - content.length;
  const isValid   = content.trim().length > 0 && content.length <= MAX_CONTENT;

  async function handleSubmit() {
    if (!isValid || submitting) return;
    setSubmit(true);
    setError("");
    try {
      const body: Record<string, string> = { content };
      if (ticker && TICKER_RE.test(ticker)) body.ticker = ticker;
      if (topic) body.topic = topic;
      if (quotePost) body.quotedPostId = quotePost.id;

      const res  = await fetch("/api/posts", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      const data = (await res.json()) as PostData & { error?: string };
      if (!res.ok) {
        setError(data.error ?? "เกิดข้อผิดพลาด");
        return;
      }
      setContent("");
      setTicker("");
      setTopic("");
      onPublished?.(data);
    } catch {
      setError("เชื่อมต่อไม่ได้");
    } finally {
      setSubmit(false);
    }
  }

  return (
    <div className={`bg-[#F3EDE0] border border-[#1F1A14] ${compact ? "p-3" : "p-4"}`}>
      {!compact && (
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#8A8378] mb-2">
          เขียนโพสต์ · ไม่มีรูป ไม่มีอีโมจิ — มีแต่ความคิด
        </p>
      )}

      {quotePost && (
        <div className="mb-2 p-2.5 border border-[#E8E2D4] bg-[#F9F6EE]">
          <p className="text-[9px] font-bold text-[#8A8378] mb-0.5">
            อ้างอิงโพสต์ของ {quotePost.author.username ?? quotePost.author.name ?? "ผู้ใช้"}
          </p>
          <p className="text-[10px] text-[#1F1A14] leading-relaxed line-clamp-2 break-words">{quotePost.content}</p>
        </div>
      )}

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={quotePost ? "เพิ่มความคิดเห็นของคุณ..." : (placeholder ?? "แบ่งปันมุมมองการลงทุน...")}
        rows={compact ? 3 : 5}
        maxLength={MAX_CONTENT}
        className="w-full resize-none bg-[#FBF7ED] border border-[#E8E2D4] px-3 py-2 text-xs leading-relaxed focus:outline-none focus:border-[#1F1A14] transition-colors"
        aria-label="เนื้อหาโพสต์"
      />

      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <input
          type="text"
          value={ticker}
          onChange={(e) => setTicker(e.target.value.toUpperCase().replace(/[^A-Z.\-]/g, "").slice(0, 10))}
          placeholder="$NVDA"
          className="w-20 bg-[#FBF7ED] border border-[#E8E2D4] px-2 py-1 text-[10px] font-bold focus:outline-none focus:border-[#5B8A2A] transition-colors"
          aria-label="cashtag (เช่น NVDA)"
        />

        <select
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="bg-[#FBF7ED] border border-[#E8E2D4] px-2 py-1 text-[10px] focus:outline-none focus:border-[#1F1A14] transition-colors"
          aria-label="หัวข้อ"
        >
          <option value="">หัวข้อ (ไม่บังคับ)</option>
          {TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>

        <span
          className={`text-[10px] font-bold ml-auto ${remaining < 50 ? (remaining < 0 ? "text-[#E5484D]" : "text-[#D6336C]") : "text-[#8A8378]"}`}
          aria-live="polite"
          aria-label={`เหลือ ${remaining} ตัวอักษร`}
        >
          {remaining}
        </span>

        <button
          onClick={handleSubmit}
          disabled={!isValid || submitting}
          className="px-4 py-1.5 text-xs font-bold text-white bg-[#1F1A14] border border-[#1F1A14] shadow-offset-lime disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          aria-busy={submitting}
        >
          {submitting ? "กำลังโพสต์..." : "โพสต์"}
        </button>
      </div>

      {error && (
        <p className="text-[10px] text-[#E5484D] font-bold mt-1" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
