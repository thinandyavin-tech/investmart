"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/Card";

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

interface SummarizeButtonProps {
  article: Article;
  ticker:  string;
}

function SummarizeButton({ article, ticker }: SummarizeButtonProps) {
  const [summary, setSummary]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [open, setOpen]         = useState(false);

  const handleSummarize = useCallback(async () => {
    if (summary) { setOpen((v) => !v); return; }
    setLoading(true);
    setOpen(true);
    try {
      const res = await fetch("/api/news/summarize", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          headline: article.headline,
          snippet:  article.summary,
          source:   article.source,
          ticker,
        }),
      });
      const data = (await res.json()) as { summary?: string; error?: string };
      setSummary(data.summary ?? "ไม่สามารถสรุปได้ในขณะนี้");
    } catch {
      setSummary("ไม่สามารถสรุปได้ในขณะนี้");
    } finally {
      setLoading(false);
    }
  }, [article, ticker, summary]);

  return (
    <div>
      <button
        onClick={() => void handleSummarize()}
        disabled={loading}
        className="text-[9px] font-bold px-2 py-0.5 border border-[#8A8378] text-[#8A8378] hover:border-[#1F1A14] hover:text-[#1F1A14] transition-colors disabled:opacity-50"
        aria-expanded={open}
        aria-label={`สรุปข่าว ${article.headline} ด้วย AI`}
      >
        {loading ? "กำลังสรุป..." : open ? "ซ่อน AI" : "สรุปด้วย AI"}
      </button>
      {open && summary && (
        <div
          className="mt-1.5 px-2 py-2 text-[10px] leading-relaxed border-l-2 border-[#5B8A2A] bg-[#F3EDE0]"
          role="region"
          aria-label="AI summary"
        >
          <p className="text-[#1F1A14]">{summary}</p>
          <p className="text-[9px] text-[#8A8378] mt-1">
            AI สรุปจาก {article.source} · ไม่ใช่คำแนะนำการลงทุน ·{" "}
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              อ่านต้นฉบับ
            </a>
          </p>
        </div>
      )}
    </div>
  );
}

interface StockNewsSectionProps {
  ticker: string;
}

export function StockNewsSection({ ticker }: StockNewsSectionProps) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    fetch(`/api/stock/news?symbol=${encodeURIComponent(ticker)}`)
      .then((r) => r.json())
      .then((d: { articles?: Article[] }) => setArticles(d.articles ?? []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [ticker]);

  return (
    <Card className="overflow-hidden">
      <div className="px-3 pt-3 pb-2 border-b border-[#E8E2D4]">
        <h2 className="text-[10px] font-bold uppercase tracking-widest">ข่าว {ticker}</h2>
        <p className="text-[9px] text-[#8A8378] mt-0.5">จาก Finnhub · อ่านต้นฉบับก่อนตัดสินใจ</p>
      </div>

      {loading ? (
        <div className="divide-y divide-[#E8E2D4]">
          {[0, 1, 2].map((i) => (
            <div key={i} className="px-3 py-3">
              <div className="h-3 w-full bg-[#E8E2D4] animate-pulse rounded mb-2" />
              <div className="h-2.5 w-24 bg-[#E8E2D4] animate-pulse rounded" />
            </div>
          ))}
        </div>
      ) : error ? (
        <p className="px-3 py-4 text-[10px] text-[#8A8378] text-center">
          ไม่สามารถโหลดข่าวได้
        </p>
      ) : articles.length === 0 ? (
        <p className="px-3 py-4 text-[10px] text-[#8A8378] text-center">
          ยังไม่มีข่าวล่าสุดสำหรับ {ticker}
        </p>
      ) : (
        <div className="divide-y divide-[#E8E2D4]">
          {articles.map((a) => (
            <div key={a.id} className="px-3 py-2.5">
              <a
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block group mb-1"
                aria-label={`${a.headline} — เปิดในแท็บใหม่`}
              >
                <p className="text-[11px] leading-snug text-[#1F1A14] group-hover:underline">
                  {a.headline}
                </p>
              </a>
              <div className="flex items-center justify-between gap-2 mt-1">
                <p className="text-[9px] text-[#8A8378]">
                  {a.source} · {timeAgo(a.datetime)}
                </p>
                <SummarizeButton article={a} ticker={ticker} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
