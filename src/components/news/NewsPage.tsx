"use client";

import { useState, useEffect, useCallback } from "react";
import { NewsAnalysisPanel } from "@/components/NewsAnalysisPanel";
import { useI18n }           from "@/lib/i18n";
import { newsTeaser }        from "@/lib/newsUtils";
import type { NewsArticleInput } from "@/components/NewsAnalysisPanel";

interface SectorNewsArticle {
  id:       number;
  headline: string;
  source:   string;
  url:      string;
  datetime: number;
  summary:  string;
  ticker:   string | null;
}

interface Tab {
  key:  string;
  icon: string;
}

const TABS: Tab[] = [
  { key: "all",      icon: "🌐" },
  { key: "tech",     icon: "💻" },
  { key: "finance",  icon: "🏦" },
  { key: "health",   icon: "🏥" },
  { key: "biotech",  icon: "🧬" },
  { key: "energy",   icon: "⚡" },
  { key: "consumer", icon: "🛒" },
  { key: "indust",   icon: "⚙️" },
  { key: "space",    icon: "🚀" },
  { key: "crypto",   icon: "🪙" },
];

export function NewsPage() {
  const { t } = useI18n();
  const nt = t.news;

  const [activeTab, setActiveTab] = useState("all");
  const [articles, setArticles]   = useState<SectorNewsArticle[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(false);

  const loadNews = useCallback(async (sector: string) => {
    setLoading(true);
    setError(false);
    try {
      const res  = await fetch(`/api/news/sector?sector=${sector}`);
      const data = (await res.json()) as { articles?: SectorNewsArticle[] };
      setArticles(data.articles ?? []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadNews(activeTab); }, [activeTab, loadNews]);

  function handleTab(key: string) {
    setActiveTab(key);
    setArticles([]);
  }

  return (
    <div className="flex flex-col page-fullheight bg-transparent">
      {/* Header */}
      <div className="border-b border-[#ccd5ae] bg-[#faedcd] px-4 py-2.5 flex-shrink-0 flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xs font-bold uppercase tracking-widest">{nt.pageTitle}</h1>
          <p className="text-xs text-slate-500 mt-0.5">{nt.pageSubtitle}</p>
        </div>
        <button
          onClick={() => void loadNews(activeTab)}
          disabled={loading}
          aria-label="Refresh news"
          className="flex-shrink-0 text-xs font-semibold px-2 py-1 border border-[#ccd5ae] rounded-lg text-slate-500 hover:bg-[#e9edc9] disabled:opacity-40 transition-colors"
        >
          {loading ? "…" : "↻"}
        </button>
      </div>

      {/* Industry tabs */}
      <div className="border-b border-[#ccd5ae] bg-[#faedcd] flex-shrink-0 overflow-x-auto">
        <div className="flex min-w-max">
          {TABS.map(tab => {
            const label = nt.tabs[tab.key as keyof typeof nt.tabs];
            return (
              <button
                key={tab.key}
                onClick={() => handleTab(tab.key)}
                className={`px-3 py-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap border-r border-[#e9edc9] transition-colors ${
                  activeTab === tab.key
                    ? "bg-violet-600 text-white"
                    : "text-slate-500 hover:bg-[#faedcd] hover:text-slate-900"
                }`}
              >
                <span className="mr-1">{tab.icon}</span>
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Article list */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="divide-y divide-white/20">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="px-4 py-3">
                <div className="h-3 w-3/4 bg-[#faedcd] animate-pulse rounded mb-2" />
                <div className="h-2.5 w-1/2 bg-[#faedcd] animate-pulse rounded mb-2" />
                <div className="h-2 w-1/4 bg-[#faedcd] animate-pulse rounded" />
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <p className="text-xs text-red-600">{nt.loadError}</p>
            <button
              onClick={() => void loadNews(activeTab)}
              className="text-xs border border-slate-300 px-3 py-1 hover:bg-slate-900 hover:text-white transition-colors"
            >
              {t.common.retry}
            </button>
          </div>
        )}

        {!loading && !error && articles.length === 0 && (
          <div className="flex items-center justify-center py-16">
            <p className="text-xs text-slate-500">{nt.empty}</p>
          </div>
        )}

        {!loading && !error && articles.length > 0 && (
          <div className="divide-y divide-white/20">
            {(() => {
              const allHeadlines = articles.map(a => a.headline);
              return articles.map(a => (
                <ArticleRow key={a.id} article={a} otherHeadlines={allHeadlines} />
              ));
            })()}
          </div>
        )}
      </div>
    </div>
  );
}

function ArticleRow({ article: a, otherHeadlines }: { article: SectorNewsArticle; otherHeadlines: string[] }) {
  const { t, lang } = useI18n();

  function timeAgo(unixSecs: number): string {
    const diff = Math.floor(Date.now() / 1000 - unixSecs);
    if (diff < 60)    return t.time.now;
    if (diff < 3600)  return t.time.minutesAgo(Math.floor(diff / 60));
    if (diff < 86400) return t.time.hoursAgo(Math.floor(diff / 3600));
    return t.time.daysAgo(Math.floor(diff / 86400));
  }

  const panelArticle: NewsArticleInput = {
    id:       a.id,
    headline: a.headline,
    source:   a.source,
    url:      a.url,
    snippet:  newsTeaser(a.summary),
  };

  return (
    <div className="px-4 py-3 hover:bg-[#faedcd] transition-colors">
      <a
        href={a.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block group"
        aria-label={`${a.headline} — ${lang === "th" ? "เปิดในแท็บใหม่" : "open in new tab"}`}
      >
        <p className="text-sm leading-snug text-slate-900 group-hover:underline mb-1.5">
          {a.headline}
        </p>
      </a>

      <div className="flex items-center gap-2 flex-wrap">
        {a.ticker && (
          <span className="text-xs font-bold border border-slate-300 px-1.5 py-0.5 bg-[#faedcd]">
            {a.ticker}
          </span>
        )}
        <span className="text-xs text-slate-500">{a.source}</span>
        <span className="text-xs text-slate-500">·</span>
        <span className="text-xs text-slate-500">{timeAgo(a.datetime)}</span>
      </div>

      {a.summary && (
        <p className="text-xs text-slate-500 mt-1.5 leading-relaxed line-clamp-2">
          {newsTeaser(a.summary)}
        </p>
      )}

      <NewsAnalysisPanel
        article={panelArticle}
        ticker={a.ticker ?? undefined}
        otherHeadlines={otherHeadlines}
      />
    </div>
  );
}
