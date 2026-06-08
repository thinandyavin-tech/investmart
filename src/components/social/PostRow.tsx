"use client";

import { useState } from "react";
import Link from "next/link";
import { relativeTime, MAX_CONTENT } from "@/lib/postUtils";

export interface QuotedPost {
  id:        string;
  content:   string;
  ticker:    string | null;
  createdAt: string;
  author: { id: string; name: string | null; username: string | null };
}

export interface PostData {
  id:           string;
  content:      string;
  ticker:       string | null;
  topic:        string | null;
  quoteCount?:  number;
  createdAt:    string;
  likeCount:    number;
  commentCount: number;
  liked:        boolean;
  bookmarked:   boolean;
  quotedPost?:  QuotedPost | null;
  author: {
    id:         string;
    name:       string | null;
    username:   string | null;
    tradeCount?: number;
  };
}

interface PostRowProps {
  post:      PostData;
  showReply?: boolean;
}

const CASHTAG_RE = /(\$[A-Z][A-Z.\-]{0,9})|(@[a-zA-Z0-9_]{1,30})/g;

function renderContent(text: string) {
  const parts = text.split(CASHTAG_RE).filter(Boolean);
  return parts.map((part, i) => {
    if (/^\$[A-Z]/.test(part)) {
      return (
        <Link key={i} href={`/stock/${part.slice(1)}`} className="font-bold hover:underline" style={{ color: "#5B8A2A" }}>
          {part}
        </Link>
      );
    }
    if (/^@/.test(part)) {
      return (
        <Link key={i} href={`/u/${part.slice(1)}`} className="font-bold hover:underline" style={{ color: "#8B5CF6" }}>
          {part}
        </Link>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function PostRow({ post, showReply = true }: PostRowProps) {
  const [liked, setLiked]           = useState(post.liked);
  const [likeCount, setLikeCount]   = useState(post.likeCount);
  const [bookmarked, setBookmarked] = useState(post.bookmarked);
  const [busy, setBusy]             = useState(false);
  const [quoting, setQuoting]       = useState(false);

  const username    = post.author.username ?? post.author.name ?? "ผู้ใช้";
  const displayId   = `#${post.author.id.slice(-4)}`;
  const initial     = (post.author.name?.[0] ?? "U").toUpperCase();
  const isTrader    = (post.author.tradeCount ?? 0) > 0;
  const avatarColor = stringToColor(post.author.id);

  async function toggleLike() {
    if (busy) return;
    setBusy(true);
    setLiked((v) => !v);
    setLikeCount((c) => (liked ? c - 1 : c + 1));
    try {
      await fetch(`/api/posts/${post.id}/like`, { method: "POST" });
    } catch {
      setLiked((v) => !v);
      setLikeCount((c) => (liked ? c + 1 : c - 1));
    } finally {
      setBusy(false);
    }
  }

  async function toggleBookmark() {
    if (busy) return;
    setBusy(true);
    setBookmarked((v) => !v);
    try {
      await fetch(`/api/posts/${post.id}/bookmark`, { method: "POST" });
    } catch {
      setBookmarked((v) => !v);
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="px-4 py-3 border-b border-[#E8E2D4]">
      <div className="flex gap-3">
        <Link href={`/u/${post.author.username ?? post.author.id}`} aria-label={`โปรไฟล์ของ ${username}`}>
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
            style={{ background: avatarColor }}
            aria-hidden="true"
          >
            {initial}
          </div>
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
            <Link href={`/u/${post.author.username ?? post.author.id}`} className="text-xs font-bold hover:underline">
              {username}
            </Link>
            <span className="text-xs text-[#8A8378]">{displayId}</span>
            {isTrader && (
              <span
                className="text-xs px-1.5 py-0.5 font-bold border rounded-sm flex-shrink-0"
                style={{ borderColor: "#8B5CF6", color: "#8B5CF6" }}
              >
                TRADER
              </span>
            )}
            <span className="text-xs text-[#8A8378] ml-auto flex-shrink-0">
              {relativeTime(new Date(post.createdAt))}
            </span>
          </div>

          <p className="text-xs leading-relaxed text-[#1F1A14] break-words">
            {renderContent(post.content)}
          </p>

          {post.quotedPost && <QuotedPostCard post={post.quotedPost} />}

          {(post.ticker || post.topic) && (
            <div className="flex gap-1.5 mt-1.5 flex-wrap">
              {post.ticker && (
                <Link
                  href={`/stock/${post.ticker}`}
                  className="text-xs px-1.5 py-0.5 font-bold border border-[#5B8A2A] text-[#5B8A2A] rounded-sm hover:bg-[#5B8A2A] hover:text-white transition-colors"
                >
                  ${post.ticker}
                </Link>
              )}
              {post.topic && (
                <span className="text-xs px-1.5 py-0.5 border border-[#E8E2D4] text-[#8A8378] rounded-sm">
                  {post.topic}
                </span>
              )}
            </div>
          )}

          <div className="flex items-center gap-4 mt-2">
            <button
              onClick={toggleLike}
              disabled={busy}
              className={`flex items-center gap-1 text-xs transition-colors ${liked ? "text-[#E5484D]" : "text-[#8A8378] hover:text-[#E5484D]"}`}
              aria-label={liked ? "เอาถูกใจออก" : "ถูกใจ"}
              aria-pressed={liked}
            >
              <HeartIcon filled={liked} />
              <span>{likeCount > 0 ? likeCount : ""}</span>
            </button>

            {showReply && (
              <button
                className="flex items-center gap-1 text-xs text-[#8A8378] hover:text-[#1F1A14] transition-colors"
                aria-label="แสดงความคิดเห็น"
              >
                <CommentIcon />
                <span>{post.commentCount > 0 ? post.commentCount : ""}</span>
              </button>
            )}

            <button
              onClick={() => setQuoting((v) => !v)}
              className={`flex items-center gap-1 text-xs transition-colors ${quoting ? "text-[#1F1A14]" : "text-[#8A8378] hover:text-[#1F1A14]"}`}
              aria-label="อ้างอิงโพสต์"
              aria-pressed={quoting}
            >
              <QuoteIcon />
              <span>{(post.quoteCount ?? 0) > 0 ? post.quoteCount : ""}</span>
            </button>

            <button
              onClick={toggleBookmark}
              disabled={busy}
              className={`flex items-center gap-1 text-xs transition-colors ml-auto ${bookmarked ? "text-[#8B5CF6]" : "text-[#8A8378] hover:text-[#8B5CF6]"}`}
              aria-label={bookmarked ? "เอาออกจากบันทึก" : "บันทึกโพสต์"}
              aria-pressed={bookmarked}
            >
              <BookmarkIcon filled={bookmarked} />
            </button>
          </div>

          {quoting && (
            <QuoteComposer
              quotedPostId={post.id}
              onClose={() => setQuoting(false)}
            />
          )}
        </div>
      </div>
    </article>
  );
}

function QuotedPostCard({ post }: { post: QuotedPost }) {
  const author = post.author.username ?? post.author.name ?? "ผู้ใช้";
  return (
    <div className="mt-2 p-2.5 border border-[#E8E2D4] bg-[#F9F6EE]">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-xs font-bold text-[#1F1A14] truncate">{author}</span>
        <span className="text-xs text-[#8A8378] flex-shrink-0">{relativeTime(new Date(post.createdAt))}</span>
        {post.ticker && (
          <span className="text-xs font-bold text-[#5B8A2A] ml-auto flex-shrink-0">${post.ticker}</span>
        )}
      </div>
      <p className="text-xs text-[#1F1A14] leading-relaxed line-clamp-3 break-words">{post.content}</p>
    </div>
  );
}

function QuoteComposer({ quotedPostId, onClose }: { quotedPostId: string; onClose: () => void }) {
  const [content, setContent] = useState("");
  const [submitting, setSubmit] = useState(false);
  const [error, setError]       = useState("");
  const remaining = MAX_CONTENT - content.length;

  async function submit() {
    if (!content.trim() || remaining < 0 || submitting) return;
    setSubmit(true);
    setError("");
    try {
      const res  = await fetch("/api/posts", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ content, quotedPostId }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) { setError(data.error ?? "เกิดข้อผิดพลาด"); return; }
      onClose();
    } catch {
      setError("เชื่อมต่อไม่ได้");
    } finally {
      setSubmit(false);
    }
  }

  return (
    <div className="mt-2 p-3 bg-[#F3EDE0] border border-[#E8E2D4]">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="เพิ่มความคิดเห็นของคุณ..."
        rows={3}
        maxLength={MAX_CONTENT}
        autoFocus
        className="w-full resize-none bg-[#FBF7ED] border border-[#E8E2D4] px-3 py-2 text-xs leading-relaxed focus:outline-none focus:border-[#1F1A14] transition-colors"
        aria-label="ความคิดเห็นสำหรับโพสต์อ้างอิง"
      />
      <div className="flex items-center gap-2 mt-1.5">
        <span className={`text-xs font-bold ${remaining < 0 ? "text-[#E5484D]" : "text-[#8A8378]"}`}>
          {remaining}
        </span>
        <button onClick={onClose} className="ml-auto text-xs text-[#8A8378] hover:text-[#1F1A14] transition-colors">
          ยกเลิก
        </button>
        <button
          onClick={submit}
          disabled={!content.trim() || remaining < 0 || submitting}
          className="px-3 py-1 text-xs font-bold text-white bg-[#1F1A14] disabled:opacity-40 transition-opacity"
          aria-busy={submitting}
        >
          {submitting ? "..." : "โพสต์"}
        </button>
      </div>
      {error && <p className="text-xs text-[#E5484D] mt-1" role="alert">{error}</p>}
    </div>
  );
}

function stringToColor(str: string): string {
  const COLORS = ["#5B8A2A", "#8B5CF6", "#E5484D", "#000080", "#3FA34D", "#D6336C"];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}
function CommentIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}
function QuoteIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/>
      <path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
    </svg>
  );
}
