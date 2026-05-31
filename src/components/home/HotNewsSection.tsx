"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
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
  if (diff < 3600)  return `${Math.floor(diff / 60)} นาทีที่แล้ว`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ชม.ที่แล้ว`;
  return `${Math.floor(diff / 86400)} วันที่แล้ว`;
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

export function HotNewsSection() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);

  const load = useCallback(() => {
    setError(false);
    fetch("/api/market/news")
      .then((r) => r.json())
      .then((d: { articles?: Article[] }) => setArticles(d.articles ?? []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const allHeadlines = articles.map(a => a.headline);

  return (
    <div className="bg-[#F3EDE0] border border-[#1F1A14]">
      <div className="px-3 pt-3 pb-2 border-b border-[#E8E2D4] flex items-center justify-between">
        <div>
          <h2 className="text-[10px] font-bold uppercase tracking-widest">ข่าวเด่นวันนี้</h2>
          <p className="text-[9px] text-[#8A8378] mt-0.5">จาก Finnhub · ตรวจสอบก่อนตัดสินใจลงทุน</p>
        </div>
        <Link href="/market" className="text-[9px] font-bold text-[#5B8A2A] hover:underline">
          ดูทั้งหมด →
        </Link>
      </div>

      {loading ? (
        <div className="divide-y divide-[#E8E2D4]">
          {[0, 1, 2].map((i) => (
            <div key={i} className="px-3 py-3">
              <div className="h-3 w-full bg-[#E8E2D4] animate-pulse rounded mb-2" />
              <div className="h-2 w-32 bg-[#E8E2D4] animate-pulse rounded" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="px-3 py-4 text-center">
          <p className="text-[10px] text-[#8A8378] mb-2">ไม่สามารถโหลดข่าวได้</p>
          <button
            onClick={load}
            className="text-[9px] font-bold border border-[#1F1A14] px-3 py-1 hover:bg-[#1F1A14] hover:text-white transition-colors"
          >
            ลองใหม่
          </button>
        </div>
      ) : articles.length === 0 ? (
        <p className="px-3 py-4 text-[10px] text-[#8A8378] text-center">
          ยังไม่มีข่าวเด่นตอนนี้
        </p>
      ) : (
        <div>
          {articles.map((a) => {
            const tickers = extractTickers(a.headline);
            return (
              <div key={a.id} className="border-b border-[#E8E2D4] last:border-0 px-3 py-3">
                <a
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block group"
                  aria-label={`${a.headline} — เปิดในแท็บใหม่`}
                >
                  <p className="text-[11px] leading-snug text-[#1F1A14] group-hover:underline mb-1.5">
                    {a.headline}
                  </p>
                </a>

                <div className="flex items-center flex-wrap gap-2 mb-1">
                  <span className="text-[9px] text-[#8A8378]">
                    {a.source} · {timeAgo(a.datetime)}
                  </span>
                  {tickers.map((t) => (
                    <Link
                      key={t}
                      href={`/stock/${t}`}
                      className="text-[9px] font-bold text-[#5B8A2A] hover:underline"
                    >
                      ${t}
                    </Link>
                  ))}
                </div>

                <NewsAnalysisPanel
                  article={{ id: a.id, headline: a.headline, source: a.source, url: a.url, snippet: a.summary }}
                  otherHeadlines={allHeadlines}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
