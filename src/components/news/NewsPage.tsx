"use client";

import { useState, useEffect, useCallback } from "react";
import { NewsAnalysisPanel } from "@/components/NewsAnalysisPanel";
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
  key:   string;
  label: string;
  icon:  string;
}

const TABS: Tab[] = [
  { key: "all",      label: "ทั้งหมด",      icon: "🌐" },
  { key: "tech",     label: "เทคโนโลยี",    icon: "💻" },
  { key: "finance",  label: "การเงิน",       icon: "🏦" },
  { key: "health",   label: "สุขภาพ",        icon: "🏥" },
  { key: "biotech",  label: "ไบโอเทค",       icon: "🧬" },
  { key: "energy",   label: "พลังงาน",       icon: "⚡" },
  { key: "consumer", label: "ผู้บริโภค",     icon: "🛒" },
  { key: "indust",   label: "อุตสาหกรรม",   icon: "⚙️" },
  { key: "space",    label: "อวกาศ",         icon: "🚀" },
  { key: "crypto",   label: "คริปโต",        icon: "🪙" },
];

function timeAgo(unixSecs: number): string {
  const diff = Math.floor(Date.now() / 1000 - unixSecs);
  if (diff < 60)    return "เพิ่งนี้";
  if (diff < 3600)  return `${Math.floor(diff / 60)} นาทีที่แล้ว`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ชม.ที่แล้ว`;
  return `${Math.floor(diff / 86400)} วันที่แล้ว`;
}

export function NewsPage() {
  const [activeTab, setActiveTab]     = useState("all");
  const [articles, setArticles]       = useState<SectorNewsArticle[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(false);

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
      <div className="border-b border-white/20 bg-white/60 backdrop-blur-md px-4 py-2.5 flex-shrink-0">
        <h1 className="text-xs font-bold uppercase tracking-widest">ข่าวตลาด · InvestMart</h1>
        <p className="text-xs text-slate-500 mt-0.5">ข่าวล่าสุดจาก Finnhub · ไม่ใช่คำแนะนำลงทุน</p>
      </div>

      {/* Industry tabs */}
      <div className="border-b border-white/20 bg-white/60 backdrop-blur-md flex-shrink-0 overflow-x-auto">
        <div className="flex min-w-max">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => handleTab(tab.key)}
              className={`px-3 py-2 text-xs font-bold uppercase tracking-wide whitespace-nowrap border-r border-[#E8E2D4] transition-colors ${
                activeTab === tab.key
                  ? "bg-violet-600 text-white"
                  : "text-slate-500 hover:bg-white/30 hover:text-slate-900"
              }`}
            >
              <span className="mr-1">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Article list */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="divide-y divide-white/20">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="px-4 py-3">
                <div className="h-3 w-3/4 bg-white/30 animate-pulse rounded mb-2" />
                <div className="h-2.5 w-1/2 bg-white/30 animate-pulse rounded mb-2" />
                <div className="h-2 w-1/4 bg-white/30 animate-pulse rounded" />
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <p className="text-xs text-red-600">ไม่สามารถโหลดข่าวได้</p>
            <button
              onClick={() => void loadNews(activeTab)}
              className="text-xs border border-slate-300 px-3 py-1 hover:bg-slate-900 hover:text-white transition-colors"
            >
              ลองใหม่
            </button>
          </div>
        )}

        {!loading && !error && articles.length === 0 && (
          <div className="flex items-center justify-center py-16">
            <p className="text-xs text-slate-500">ยังไม่มีข่าวล่าสุดในหมวดนี้</p>
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
  const panelArticle: NewsArticleInput = {
    id:      a.id,
    headline: a.headline,
    source:  a.source,
    url:     a.url,
    snippet: a.summary,
  };

  return (
    <div className="px-4 py-3 hover:bg-white/50 transition-colors">
      <a
        href={a.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block group"
        aria-label={`${a.headline} — เปิดในแท็บใหม่`}
      >
        <p className="text-sm leading-snug text-slate-900 group-hover:underline mb-1.5">
          {a.headline}
        </p>
      </a>

      <div className="flex items-center gap-2 flex-wrap">
        {a.ticker && (
          <span className="text-xs font-bold border border-slate-300 px-1.5 py-0.5 bg-white/50">
            {a.ticker}
          </span>
        )}
        <span className="text-xs text-slate-500">{a.source}</span>
        <span className="text-xs text-slate-500">·</span>
        <span className="text-xs text-slate-500">{timeAgo(a.datetime)}</span>
      </div>

      {a.summary && (
        <p className="text-xs text-slate-500 mt-1.5 leading-relaxed line-clamp-2">
          {a.summary}
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
