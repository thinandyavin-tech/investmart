"use client";

import { useState, useEffect, useCallback } from "react";

import { PostRow, type PostData } from "@/components/social/PostRow";
import { PostComposer } from "@/components/social/PostComposer";
import { useI18n } from "@/lib/i18n";

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
  const { t } = useI18n();
  const [tab, setTab]          = useState<FeedTab>("discover");
  const [posts, setPosts]      = useState<PostData[]>([]);
  const [cursor, setCursor]    = useState<string | null>(null);
  const [loading, setLoading]  = useState(true);
  const [hasMore, setHasMore]  = useState(false);
  const [loadingMore, setMore] = useState(false);
  const [error, setError]      = useState<string | null>(null);
  const [retryCount, setRetry] = useState(0);

  const fetchPosts = useCallback(async (nextTab: FeedTab, nextCursor: string | null) => {
    const params = new URLSearchParams({ tab: nextTab });
    if (userId) params.set("userId", userId);
    if (nextCursor) params.set("cursor", nextCursor);
    const res = await fetch(`/api/posts?${params.toString()}`);
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
      .catch(() => setError(t.social.loadFailed))
      .finally(() => setLoading(false));
  }, [tab, fetchPosts, retryCount, t.social.loadFailed]);

  async function loadMore() {
    if (!cursor || loadingMore) return;
    setMore(true);
    try {
      const { data, nextCursor } = await fetchPosts(tab, cursor);
      setPosts((prev) => [...prev, ...data]);
      setCursor(nextCursor);
      setHasMore(!!nextCursor);
    } catch { /* keep existing state */ }
    finally { setMore(false); }
  }

  function prepend(post: PostData) { setPosts((prev) => [post, ...prev]); }

  return (
    <div className="flex flex-col">
      {!userId && (
        <div className="flex border-b border-[#1F1A14]">
          {(["discover", "following"] as const).map((tabKey) => (
            <button
              key={tabKey}
              onClick={() => setTab(tabKey)}
              className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wide transition-colors ${
                tab === tabKey
                  ? "bg-[#1F1A14] text-white"
                  : "bg-[#faedcd] text-[#8A8378] hover:text-[#1F1A14]"
              }`}
              aria-pressed={tab === tabKey}
            >
              {tabKey === "discover" ? t.social.discover : t.social.following}
            </button>
          ))}
        </div>
      )}

      {showComposer && !userId && (
        <div className="border-b border-[#e9edc9]">
          <PostComposer onPublished={prepend} compact={compact} />
        </div>
      )}

      {loading ? (
        <FeedSkeleton label={t.social.loadingFeed} />
      ) : error ? (
        <div className="flex flex-col items-center py-12 gap-2 px-4">
          <p className="text-xs font-bold text-red-600 text-center">{error}</p>
          <button
            onClick={() => setRetry((c) => c + 1)}
            className="text-xs underline text-[#8A8378] hover:text-[#1F1A14]"
          >
            {t.errors.retry}
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
              className="w-full py-3 text-xs font-bold text-[#8A8378] hover:text-[#1F1A14] border-t border-[#e9edc9] transition-colors disabled:opacity-40"
            >
              {loadingMore ? t.social.loadingMore : t.social.loadMore}
            </button>
          )}
        </>
      )}
    </div>
  );
}

function FeedSkeleton({ label }: { label: string }) {
  return (
    <div className="flex flex-col" aria-busy="true" aria-label={label}>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex gap-3 px-4 py-3 border-b border-[#e9edc9]">
          <div className="w-9 h-9 rounded-full skeleton flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-32 skeleton rounded" />
            <div className="h-3 w-full skeleton rounded" />
            <div className="h-3 w-3/4 skeleton rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

function FeedEmpty({ tab }: { tab: FeedTab }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center py-12 gap-2 px-4">
      <span className="text-2xl" aria-hidden="true">✏️</span>
      <p className="text-xs font-bold text-[#1F1A14] text-center">
        {tab === "following" ? t.social.emptyFollowing : t.social.emptyFeed}
      </p>
      <p className="text-xs text-[#8A8378] text-center">
        {tab === "following" ? t.social.emptyFollowCta : t.social.emptyDiscoverCta}
      </p>
    </div>
  );
}
