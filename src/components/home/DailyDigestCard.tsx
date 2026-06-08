"use client";

import { useState, useEffect } from "react";

interface DigestData {
  digest:      string;
  generatedAt: string;
}

export function DailyDigestCard() {
  const [data, setData]       = useState<DigestData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/market/digest")
      .then((r) => r.json() as Promise<DigestData & { error?: string }>)
      .then((d) => { if (d.digest) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (!loading && !data) return null;

  const hour = data ? new Date(data.generatedAt).getHours() : null;
  const timeLabel = hour !== null ? `อัพเดท ${hour}:00 น.` : "";

  return (
    <div className="mx-3 mb-3 rounded-xl bg-slate-900/60 backdrop-blur-md border border-white/10 text-white p-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-bold uppercase tracking-widest text-violet-300">
          ▶ AI DIGEST วันนี้
        </span>
        {timeLabel && (
          <span className="text-xs text-slate-400">{timeLabel}</span>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col gap-1.5">
          <div className="h-2 bg-white/10 animate-pulse rounded w-full" />
          <div className="h-2 bg-white/10 animate-pulse rounded w-4/5" />
          <div className="h-2 bg-white/10 animate-pulse rounded w-3/5" />
        </div>
      ) : (
        <p className="text-xs leading-relaxed text-slate-200">{data?.digest}</p>
      )}
    </div>
  );
}
