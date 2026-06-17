"use client";

import { useEffect, useState } from "react";
import { Card }             from "@/components/Card";
import { newsTeaser }       from "@/lib/newsUtils";
import { NewsAnalysisPanel } from "@/components/NewsAnalysisPanel";

interface Article {
  id:       number;
  headline: string;
  source:   string;
  url:      string;
  datetime: number;
  summary:  string;
}

function timeAgo(unixSecs: number): string {
  const diff = Math.floor(Date.now() / 1000 - unixSecs);
  if (diff < 3600)  return `${Math.floor(diff / 60)} นาทีที่แล้ว`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ชม.ที่แล้ว`;
  return `${Math.floor(diff / 86400)} วันที่แล้ว`;
}

interface StockNewsSectionProps {
  ticker: string;
}

export function StockNewsSection({ ticker }: StockNewsSectionProps) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);

  useEffect(() => {
    setArticles([]);
    setLoading(true);
    setError(false);
    let cancelled = false;
    fetch(`/api/stock/news?symbol=${encodeURIComponent(ticker)}`)
      .then((r) => r.json())
      .then((d: { articles?: Article[] }) => { if (!cancelled) setArticles(d.articles ?? []); })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [ticker]);

  const allHeadlines = articles.map(a => a.headline);

  return (
    <Card className="overflow-hidden">
      <div className="px-3 pt-3 pb-2 border-b border-[#e9edc9]">
        <h2 className="text-xs font-bold uppercase tracking-widest">ข่าว {ticker}</h2>
        <p className="text-xs text-[#8A8378] mt-0.5">จาก Finnhub · อ่านต้นฉบับก่อนตัดสินใจ</p>
      </div>

      {loading ? (
        <div className="divide-y divide-[#e9edc9]">
          {[0, 1, 2].map((i) => (
            <div key={i} className="px-3 py-3">
              <div className="h-3 w-full bg-[#e9edc9] animate-pulse rounded mb-2" />
              <div className="h-2.5 w-24 bg-[#e9edc9] animate-pulse rounded" />
            </div>
          ))}
        </div>
      ) : error ? (
        <p className="px-3 py-4 text-xs text-[#8A8378] text-center">
          ไม่สามารถโหลดข่าวได้
        </p>
      ) : articles.length === 0 ? (
        <p className="px-3 py-4 text-xs text-[#8A8378] text-center">
          ยังไม่มีข่าวล่าสุดสำหรับ {ticker}
        </p>
      ) : (
        <div className="divide-y divide-[#e9edc9]">
          {articles.map((a) => (
            <div key={a.id} className="px-3 py-2.5">
              <a
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block group mb-1"
                aria-label={`${a.headline} — เปิดในแท็บใหม่`}
              >
                <p className="text-xs leading-snug text-[#1F1A14] group-hover:underline">
                  {a.headline}
                </p>
              </a>
              <p className="text-xs text-[#8A8378] mb-1">
                {a.source} · {timeAgo(a.datetime)}
              </p>
              <NewsAnalysisPanel
                article={{ id: a.id, headline: a.headline, source: a.source, url: a.url, snippet: newsTeaser(a.summary) }}
                ticker={ticker}
                otherHeadlines={allHeadlines}
              />
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
