"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n";

interface MacroItem {
  symbol:  string;
  labelEn: string;
  labelTh: string;
  price:   number | null;
  dp:      number | null;
}

interface SectorItem {
  sector: string;
  change: number;
}

function fmtPct(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

export function MacroPulse() {
  const { lang } = useI18n();
  const isEn = lang === "en";

  const [items,   setItems]   = useState<MacroItem[]>([]);
  const [sectors, setSectors] = useState<SectorItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [macroRes, sectorsRes] = await Promise.all([
        fetch("/api/market/macro")
          .then(r => r.json() as Promise<{ items?: MacroItem[] }>)
          .catch(() => ({ items: [] })),
        fetch("/api/market/sectors")
          .then(r => r.json() as Promise<{ sectors?: SectorItem[] }>)
          .catch(() => ({ sectors: [] })),
      ]);

      setItems(macroRes.items ?? []);
      setSectors((sectorsRes.sectors ?? []).slice(0, 6));
      setLoading(false);
    }

    void load();
  }, []);

  if (loading) {
    return (
      <div className="mx-3 mb-3">
        <div className="h-32 bg-[#e9edc9] animate-pulse rounded-2xl" />
      </div>
    );
  }

  const hasData = items.some(i => i.price !== null);

  if (!hasData && sectors.length === 0) return null;

  return (
    <div className="mx-3 mb-3">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
        {isEn ? "Macro Pulse" : "สัญญาณมหภาค"}
      </p>

      {/* Macro ETF grid */}
      {hasData && (
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          {items.map(item => {
            const pos = (item.dp ?? 0) >= 0;
            return (
              <div key={item.symbol} className="bg-[#faedcd] border border-[#ccd5ae] rounded-xl p-2">
                <p className="text-[10px] text-slate-500 leading-tight truncate">
                  {isEn ? item.labelEn : item.labelTh}
                </p>
                {item.price !== null ? (
                  <>
                    <p className="text-xs font-bold text-slate-900 mt-0.5" style={{ fontFamily: "var(--font-mono)" }}>
                      ${item.price.toFixed(2)}
                    </p>
                    {item.dp !== null && (
                      <p className="text-[10px] font-semibold mt-0.5" style={{ color: pos ? "#16A34A" : "#DC2626" }}>
                        {fmtPct(item.dp)}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-slate-400 mt-0.5">—</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Sector heatmap */}
      {sectors.length > 0 && (
        <>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
            {isEn ? "Sector Performance" : "ผลตอบแทนตามกลุ่ม"}
          </p>
          <div className="flex flex-col gap-1">
            {sectors.map(s => {
              const pos  = s.change >= 0;
              const bar  = Math.min(Math.abs(s.change) * 10, 100);
              return (
                <div key={s.sector} className="flex items-center gap-2">
                  <p className="text-[10px] text-slate-600 w-28 flex-shrink-0 truncate">{s.sector}</p>
                  <div className="flex-1 h-1.5 bg-[#e9edc9] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${bar}%`, background: pos ? "#16A34A" : "#DC2626" }}
                    />
                  </div>
                  <p className="text-[10px] font-bold w-12 text-right flex-shrink-0"
                    style={{ color: pos ? "#16A34A" : "#DC2626", fontFamily: "var(--font-mono)" }}>
                    {fmtPct(s.change)}
                  </p>
                </div>
              );
            })}
          </div>
          <p className="text-[9px] text-slate-400 mt-1.5">📊 {isEn ? "Source: Finnhub" : "ข้อมูล: Finnhub"}</p>
        </>
      )}
    </div>
  );
}
