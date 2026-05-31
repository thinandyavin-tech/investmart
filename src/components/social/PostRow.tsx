"use client";

import { useState } from "react";
import Link from "next/link";
import { relativeTime } from "@/lib/postUtils";

export interface PostData {
  id:           string;
  content:      string;
  ticker:       string | null;
  topic:        string | null;
  createdAt:    string;
  likeCount:    number;
  commentCount: number;
  liked:        boolean;
  bookmarked:   boolean;
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
            <span className="text-[10px] text-[#8A8378]">{displayId}</span>
            {isTrader && (
              <span
                className="text-[9px] px-1.5 py-0.5 font-bold border rounded-sm flex-shrink-0"
                style={{ borderColor: "#8B5CF6", color: "#8B5CF6" }}
              >
                TRADER
              </span>
            )}
            <span className="text-[9px] text-[#8A8378] ml-auto flex-shrink-0">
              {relativeTime(new Date(post.createdAt))}
            </span>
          </div>

          <p className="text-xs leading-relaxed text-[#1F1A14] break-words">
            {renderContent(post.content)}
          </p>

          {(post.ticker || post.topic) && (
            <div className="flex gap-1.5 mt-1.5 flex-wrap">
              {post.ticker && (
                <Link
                  href={`/stock/${post.ticker}`}
                  className="text-[9px] px-1.5 py-0.5 font-bold border border-[#5B8A2A] text-[#5B8A2A] rounded-sm hover:bg-[#5B8A2A] hover:text-white transition-colors"
                >
                  ${post.ticker}
                </Link>
              )}
              {post.topic && (
                <span className="text-[9px] px-1.5 py-0.5 border border-[#E8E2D4] text-[#8A8378] rounded-sm">
                  {post.topic}
                </span>
              )}
            </div>
          )}

          <div className="flex items-center gap-4 mt-2">
            <button
              onClick={toggleLike}
              disabled={busy}
              className={`flex items-center gap-1 text-[10px] transition-colors ${liked ? "text-[#E5484D]" : "text-[#8A8378] hover:text-[#E5484D]"}`}
              aria-label={liked ? "เอาถูกใจออก" : "ถูกใจ"}
              aria-pressed={liked}
            >
              <HeartIcon filled={liked} />
              <span>{likeCount > 0 ? likeCount : ""}</span>
            </button>

            {showReply && (
              <button
                className="flex items-center gap-1 text-[10px] text-[#8A8378] hover:text-[#1F1A14] transition-colors"
                aria-label="แสดงความคิดเห็น"
              >
                <CommentIcon />
                <span>{post.commentCount > 0 ? post.commentCount : ""}</span>
              </button>
            )}

            <button
              onClick={toggleBookmark}
              disabled={busy}
              className={`flex items-center gap-1 text-[10px] transition-colors ml-auto ${bookmarked ? "text-[#8B5CF6]" : "text-[#8A8378] hover:text-[#8B5CF6]"}`}
              aria-label={bookmarked ? "เอาออกจากบันทึก" : "บันทึกโพสต์"}
              aria-pressed={bookmarked}
            >
              <BookmarkIcon filled={bookmarked} />
            </button>
          </div>
        </div>
      </div>
    </article>
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
