"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/Card";

interface Article {
  id:       number;
  headline: string;
  source:   string;
  url:      string;
  datetime: number;
}

function timeAgo(unixSeconds: number): string {
  const diff = Math.floor(Date.now() / 1000 - unixSeconds);
  if (diff < 3600)  return `${Math.floor(diff / 60)} นาทีที่แล้ว`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ชั่วโมงที่แล้ว`;
  return `${Math.floor(diff / 86400)} วันที่แล้ว`;
}

export function MarketNewsCard() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    fetch("/api/market/news")
      .then((r) => r.json())
      .then((d: { articles?: Article[] }) => setArticles(d.articles ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card className="overflow-hidden">
      <div className="px-3 pt-3 pb-2 border-b border-slate-100">
        <h2 className="text-xs font-bold uppercase tracking-widest">ข่าวตลาด</h2>
        <p className="text-xs text-slate-500 mt-0.5">แหล่งข่าวภายนอก — ตรวจสอบก่อนตัดสินใจ</p>
      </div>

      {loading ? (
        <div className="divide-y divide-slate-100">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="px-3 py-2.5">
              <div className="h-3 w-full bg-slate-200 animate-pulse rounded mb-1.5" />
              <div className="h-2.5 w-24 bg-slate-200 animate-pulse rounded" />
            </div>
          ))}
        </div>
      ) : articles.length === 0 ? (
        <p className="px-3 py-4 text-xs text-slate-500 text-center">
          ไม่มีข่าว
        </p>
      ) : (
        <div className="divide-y divide-slate-100">
          {articles.map((a) => (
            <a
              key={a.id}
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-3 py-2.5 hover:bg-slate-50 transition-colors group"
              aria-label={`${a.headline} — เปิดในแท็บใหม่`}
            >
              <p className="text-xs leading-snug text-slate-900 group-hover:underline line-clamp-2">
                {a.headline}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {a.source} · {timeAgo(a.datetime)}
              </p>
            </a>
          ))}
        </div>
      )}
    </Card>
  );
}
