"use client";

import { useState } from "react";
import type { PostData } from "@/components/social/PostRow";
import { MAX_CONTENT }   from "@/lib/postUtils";
import { useI18n }       from "@/lib/i18n";

const TICKER_RE = /^[A-Z][A-Z.\-]{0,9}$/;

interface PostComposerProps {
  onPublished?: (post: PostData) => void;
  placeholder?: string;
  compact?:     boolean;
  quotePost?:   PostData;
}

export function PostComposer({ onPublished, placeholder, compact = false, quotePost }: PostComposerProps) {
  const { t } = useI18n();
  const sc = t.social;
  const topics = sc.topics as readonly string[];
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
        setError(data.error ?? sc.postError);
        return;
      }
      setContent("");
      setTicker("");
      setTopic("");
      onPublished?.(data);
    } catch {
      setError(sc.connectError);
    } finally {
      setSubmit(false);
    }
  }

  return (
    <div className={`bg-[#F3EDE0] border border-[#1F1A14] ${compact ? "p-3" : "p-4"}`}>
      {!compact && (
        <p className="text-xs font-bold uppercase tracking-widest text-[#8A8378] mb-2">
          เขียนโพสต์ · ไม่มีรูป ไม่มีอีโมจิ — มีแต่ความคิด
        </p>
      )}

      {quotePost && (
        <div className="mb-2 p-2.5 border border-[#E8E2D4] bg-[#F9F6EE]">
          <p className="text-xs font-bold text-[#8A8378] mb-0.5">
            {sc.quoteRefPrefix} {quotePost.author.username ?? quotePost.author.name ?? sc.user}
          </p>
          <p className="text-xs text-[#1F1A14] leading-relaxed line-clamp-2 break-words">{quotePost.content}</p>
        </div>
      )}

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={quotePost ? sc.commentPlaceholder : (placeholder ?? sc.composePlaceholder)}
        rows={compact ? 3 : 5}
        maxLength={MAX_CONTENT}
        className="w-full resize-none bg-[#FBF7ED] border border-[#E8E2D4] px-3 py-2 text-xs leading-relaxed focus:outline-none focus:border-[#1F1A14] transition-colors"
        aria-label={sc.commentLabel}
      />

      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <input
          type="text"
          value={ticker}
          onChange={(e) => setTicker(e.target.value.toUpperCase().replace(/[^A-Z.\-]/g, "").slice(0, 10))}
          placeholder="$NVDA"
          className="w-20 bg-[#FBF7ED] border border-[#E8E2D4] px-2 py-1 text-xs font-bold focus:outline-none focus:border-[#5B8A2A] transition-colors"
          aria-label="cashtag (เช่น NVDA)"
        />

        <select
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="bg-[#FBF7ED] border border-[#E8E2D4] px-2 py-1 text-xs focus:outline-none focus:border-[#1F1A14] transition-colors"
          aria-label={sc.topicLabel}
        >
          <option value="">{sc.topicLabel} ({t.common.optional})</option>
          {topics.map((topic) => <option key={topic} value={topic}>{topic}</option>)}
        </select>

        <span
          className={`text-xs font-bold ml-auto ${remaining < 50 ? (remaining < 0 ? "text-[#E5484D]" : "text-[#D6336C]") : "text-[#8A8378]"}`}
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
          {submitting ? sc.submitting : sc.postBtn}
        </button>
      </div>

      {error && (
        <p className="text-xs text-[#E5484D] font-bold mt-1" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
