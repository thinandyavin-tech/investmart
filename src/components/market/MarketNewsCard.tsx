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
  const [error, setError]       = useState(false);

  function load() {
    setLoading(true);
    setError(false);
    fetch("/api/market/news")
      .then((r) => r.json())
      .then((d: { articles?: Article[] }) => setArticles(d.articles ?? []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Card className="overflow-hidden">
      <div className="px-3 pt-3 pb-2 border-b border-[#E0D9CC]">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#1F1A14]">ข่าวตลาด</h2>
        <p className="text-[10px] text-[#8A8378] mt-0.5">แหล่งข่าวภายนอก — ตรวจสอบก่อนตัดสินใจ · Finnhub</p>
      </div>

      {loading ? (
        <div className="divide-y divide-[#E8E2D4]">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="px-3 py-2.5">
              <div className="h-3 w-full skeleton rounded mb-1.5" />
              <div className="h-2.5 w-24 skeleton rounded" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="px-3 py-5 text-center">
          <p className="text-xs text-[#8A8378] mb-2">โหลดข่าวไม่ได้</p>
          <button
            onClick={load}
            className="text-xs font-bold text-[#5B8A2A] hover:underline focus-visible:underline"
          >
            ลองใหม่
          </button>
        </div>
      ) : articles.length === 0 ? (
        <p className="px-3 py-5 text-xs text-[#8A8378] text-center">ไม่พบข่าว</p>
      ) : (
        <div className="divide-y divide-[#E8E2D4]">
          {articles.map((a) => (
            <a
              key={a.id}
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-3 py-2.5 hover:bg-[#F8F5EF] transition-colors group"
              aria-label={`${a.headline} — เปิดในแท็บใหม่`}
            >
              <p className="text-xs leading-snug text-[#1F1A14] group-hover:underline line-clamp-2">
                {a.headline}
              </p>
              <p className="text-[10px] text-[#8A8378] mt-1">
                {a.source} · {timeAgo(a.datetime)}
              </p>
            </a>
          ))}
        </div>
      )}
    </Card>
  );
}
