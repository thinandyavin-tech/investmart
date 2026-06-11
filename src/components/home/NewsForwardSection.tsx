"use client";

import { useEffect, useState, useCallback } from "react";
import { Link }              from "@/i18n/navigation";
import { useI18n }           from "@/lib/i18n";
import { newsTeaser }        from "@/lib/newsUtils";
import { NewsAnalysisPanel } from "@/components/NewsAnalysisPanel";

interface Article {
  id:       number;
  headline: string;
  source:   string;
  url:      string;
  datetime: number;
  summary?: string;
}

function timeAgo(unixSecs: number): string {
  const diff = Math.floor(Date.now() / 1000 - unixSecs);
  if (diff < 3600)  return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

const CASHTAG_RE = /\$([A-Z][A-Z.\-]{0,9})/g;

function extractTickers(text: string): string[] {
  const out: string[] = [];
  CASHTAG_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = CASHTAG_RE.exec(text)) !== null) {
    if (!out.includes(m[1])) out.push(m[1]);
  }
  return out.slice(0, 3);
}

function SkeletonFeatured() {
  return (
    <div className="space-y-3">
      <div className="h-5 w-3/4 skeleton rounded" />
      <div className="h-4 w-full skeleton rounded" />
      <div className="h-4 w-2/3 skeleton rounded" />
      <div className="h-3 w-32 skeleton rounded" />
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {[0,1,2,3].map(i => (
        <div key={i} className="space-y-2">
          <div className="h-3 w-full skeleton rounded" />
          <div className="h-3 w-4/5 skeleton rounded" />
          <div className="h-2 w-20 skeleton rounded" />
        </div>
      ))}
    </div>
  );
}

interface FeaturedArticleProps {
  article:        Article;
  allHeadlines:   string[];
}

function FeaturedArticle({ article, allHeadlines }: FeaturedArticleProps) {
  const tickers = extractTickers(article.headline);
  return (
    <div className="pb-4 border-b border-[#E8E2D4]">
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group block mb-2"
        aria-label={`${article.headline} — เปิดในแท็บใหม่`}
      >
        <h2 className="text-base font-bold leading-snug text-[#1F1A14] group-hover:text-violet-700 transition-colors">
          {article.headline}
        </h2>
      </a>
      {article.summary && (
        <p className="text-xs text-[#5A4E42] leading-relaxed mb-2 line-clamp-2">{newsTeaser(article.summary)}</p>
      )}
      <div className="flex items-center flex-wrap gap-2 text-xs text-[#8A8378] mb-2">
        <span className="font-medium">{article.source}</span>
        <span>·</span>
        <span>{timeAgo(article.datetime)}</span>
        {tickers.map(t => (
          <Link key={t} href={`/stock/${t}`} className="font-semibold text-violet-600 hover:underline">
            ${t}
          </Link>
        ))}
      </div>
      <NewsAnalysisPanel
        article={{ id: article.id, headline: article.headline, source: article.source, url: article.url, snippet: article.summary }}
        otherHeadlines={allHeadlines}
      />
    </div>
  );
}

interface SecondaryArticleProps {
  article:      Article;
  allHeadlines: string[];
}

function SecondaryArticle({ article, allHeadlines }: SecondaryArticleProps) {
  const tickers = extractTickers(article.headline);
  return (
    <div className="flex flex-col gap-1">
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group"
        aria-label={`${article.headline} — เปิดในแท็บใหม่`}
      >
        <p className="text-xs font-semibold leading-snug text-[#1F1A14] group-hover:text-violet-700 transition-colors line-clamp-3">
          {article.headline}
        </p>
      </a>
      <div className="flex items-center flex-wrap gap-1.5 text-xs text-[#8A8378]">
        <span>{article.source}</span>
        <span>·</span>
        <span>{timeAgo(article.datetime)}</span>
        {tickers.map(t => (
          <Link key={t} href={`/stock/${t}`} className="font-semibold text-violet-500 hover:underline">
            ${t}
          </Link>
        ))}
      </div>
      <NewsAnalysisPanel
        article={{ id: article.id, headline: article.headline, source: article.source, url: article.url, snippet: article.summary }}
        otherHeadlines={allHeadlines}
      />
    </div>
  );
}

export function NewsForwardSection() {
  const { t }                   = useI18n();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);

  const load = useCallback(() => {
    setError(false);
    fetch("/api/market/news")
      .then(r => r.json())
      .then((d: { articles?: Article[] }) => setArticles(d.articles ?? []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const allHeadlines = articles.map(a => a.headline);
  const [featured, ...rest] = articles;
  const secondary = rest.slice(0, 6);

  return (
    <section className="rounded-2xl bg-white/60 backdrop-blur-md border border-white/40 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-[#E8E2D4] flex items-center justify-between">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-700">{t.homeStrings.hotNews}</h2>
          <p className="text-xs text-slate-400 mt-0.5">Finnhub · ตรวจสอบก่อนตัดสินใจ</p>
        </div>
        <Link href="/news" className="text-xs font-semibold text-violet-600 hover:text-violet-800 transition-colors">
          {t.homeStrings.allNews}
        </Link>
      </div>

      <div className="p-4 space-y-4">
        {loading ? (
          <>
            <SkeletonFeatured />
            <SkeletonGrid />
          </>
        ) : error ? (
          <div className="text-center py-4">
            <p className="text-xs text-[#8A8378] mb-2">{t.homeStrings.loadError}</p>
            <button
              onClick={load}
              className="text-xs font-semibold border border-slate-300 rounded-lg px-3 py-1.5 hover:bg-white/60 transition-colors text-slate-700"
            >
              {t.common.retry}
            </button>
          </div>
        ) : articles.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">{t.homeStrings.noNews}</p>
        ) : (
          <>
            {featured && (
              <FeaturedArticle article={featured} allHeadlines={allHeadlines} />
            )}
            {secondary.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {secondary.map(a => (
                  <SecondaryArticle key={a.id} article={a} allHeadlines={allHeadlines} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
