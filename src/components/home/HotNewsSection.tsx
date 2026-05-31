"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface Article {
  id:       number;
  headline: string;
  source:   string;
  url:      string;
  datetime: number;
}

function timeAgo(unixSecs: number): string {
  const diff = Math.floor(Date.now() / 1000 - unixSecs);
  if (diff < 3600)  return `${Math.floor(diff / 60)} นาทีที่แล้ว`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ชม.ที่แล้ว`;
  return `${Math.floor(diff / 86400)} วันที่แล้ว`;
}

const CASHTAG_RE = /\$([A-Z][A-Z.\-]{0,9})/g;

function extractTickers(text: string): string[] {
  const matches: string[] = [];
  let m: RegExpExecArray | null;
  // reset the regex state
  CASHTAG_RE.lastIndex = 0;
  while ((m = CASHTAG_RE.exec(text)) !== null) {
    if (!matches.includes(m[1])) matches.push(m[1]);
  }
  return matches.slice(0, 3);
}

interface SummarizeState {
  text:    string;
  loading: boolean;
  open:    boolean;
}

function ArticleCard({ article }: { article: Article }) {
  const [sum, setSum] = useState<SummarizeState>({ text: "", loading: false, open: false });
  const tickers = extractTickers(article.headline);

  const handleSummarize = useCallback(async () => {
    if (sum.text) { setSum((s) => ({ ...s, open: !s.open })); return; }
    setSum((s) => ({ ...s, loading: true, open: true }));
    try {
      const res  = await fetch("/api/news/summarize", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ headline: article.headline, source: article.source }),
      });
      const data = (await res.json()) as { summary?: string };
      setSum({ text: data.summary ?? "ไม่สามารถสรุปได้", loading: false, open: true });
    } catch {
      setSum({ text: "ไม่สามารถสรุปได้ในขณะนี้", loading: false, open: true });
    }
  }, [article, sum.text]);

  return (
    <div className="border-b border-[#E8E2D4] last:border-0 px-3 py-3">
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block group"
        aria-label={`${article.headline} — เปิดในแท็บใหม่`}
      >
        <p className="text-[11px] leading-snug text-[#1F1A14] group-hover:underline mb-1.5">
          {article.headline}
        </p>
      </a>

      <div className="flex items-center flex-wrap gap-2">
        <span className="text-[9px] text-[#8A8378]">
          {article.source} · {timeAgo(article.datetime)}
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

        <button
          onClick={() => void handleSummarize()}
          disabled={sum.loading}
          className="ml-auto text-[9px] font-bold px-1.5 py-0.5 border border-[#8A8378] text-[#8A8378] hover:border-[#1F1A14] hover:text-[#1F1A14] transition-colors disabled:opacity-50 flex-shrink-0"
          aria-expanded={sum.open}
        >
          {sum.loading ? "กำลังสรุป..." : sum.open ? "ซ่อน" : "สรุปด้วย AI"}
        </button>
      </div>

      {sum.open && sum.text && (
        <div className="mt-2 px-2 py-1.5 border-l-2 border-[#5B8A2A] bg-[#F3EDE0] text-[10px] leading-relaxed">
          <p className="text-[#1F1A14]">{sum.text}</p>
          <p className="text-[9px] text-[#8A8378] mt-0.5">
            AI สรุปจาก {article.source} · ไม่ใช่คำแนะนำการลงทุน ·{" "}
            <a href={article.url} target="_blank" rel="noopener noreferrer" className="underline">
              อ่านต้นฉบับ
            </a>
          </p>
        </div>
      )}
    </div>
  );
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
          {articles.map((a) => (
            <ArticleCard key={a.id} article={a} />
          ))}
        </div>
      )}
    </div>
  );
}
