"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n";

interface MacroItem {
  label:    string;
  value:    string;
  change?:  string;
  positive?: boolean;
  source:   string;
}

interface SectorItem {
  sector:  string;
  change:  number;
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
      const [sectorsRes] = await Promise.all([
        fetch("/api/market/sectors").then(r => r.json()).catch(() => ({ sectors: [] })),
      ]) as [{ sectors?: SectorItem[] }];

      setSectors((sectorsRes.sectors ?? []).slice(0, 6));

      // Macro proxies: SPY = S&P500, QQQ = Nasdaq, GLD = Gold, TLT = 20Y treasury, UUP = USD index
      const proxies: { symbol: string; label: string; labelTh: string }[] = [
        { symbol: "SPY",  label: "S&P 500",     labelTh: "S&P 500" },
        { symbol: "QQQ",  label: "Nasdaq 100",  labelTh: "Nasdaq 100" },
        { symbol: "TLT",  label: "20Y Treasury",labelTh: "พันธบัตร 20Y" },
        { symbol: "GLD",  label: "Gold",        labelTh: "ทองคำ" },
        { symbol: "UUP",  label: "USD Index",   labelTh: "ดัชนี USD" },
        { symbol: "VXX",  label: "Volatility",  labelTh: "ความผันผวน" },
      ];

      // Fetch via our internal API to avoid leaking the key client-side
      const results = await Promise.all(
        proxies.map(p =>
          fetch(`/api/stock/quote?ticker=${p.symbol}`)
            .then(r => r.json())
            .catch(() => null) as Promise<{ c?: number; dp?: number } | null>
        ),
      );

      const macroItems: MacroItem[] = proxies.map((p, i) => {
        const q = results[i];
        if (!q?.c) return { label: isEn ? p.label : p.labelTh, value: "—", source: "Finnhub" };
        const dp = q.dp ?? 0;
        return {
          label:    isEn ? p.label : p.labelTh,
          value:    `$${q.c.toFixed(2)}`,
          change:   fmtPct(dp),
          positive: dp >= 0,
          source:   "Finnhub",
        };
      });

      setItems(macroItems);
      setLoading(false);
    }

    void load();
  }, [isEn]);

  if (loading) {
    return (
      <div className="mx-3 mb-3">
        <div className="h-24 bg-[#e9edc9] animate-pulse rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="mx-3 mb-3">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
        {isEn ? "Macro Pulse" : "สัญญาณมหภาค"}
      </p>

      {/* Macro ETF proxies */}
      <div className="grid grid-cols-3 gap-1.5 mb-3">
        {items.map(item => (
          <div key={item.label} className="bg-[#faedcd] border border-[#ccd5ae] rounded-xl p-2">
            <p className="text-[10px] text-slate-500 leading-tight truncate">{item.label}</p>
            <p className="text-xs font-bold text-slate-900 mt-0.5" style={{ fontFamily: "var(--font-mono)" }}>
              {item.value}
            </p>
            {item.change && (
              <p
                className="text-[10px] font-semibold mt-0.5"
                style={{ color: item.positive ? "#16A34A" : "#DC2626" }}
              >
                {item.change}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Sector heatmap */}
      {sectors.length > 0 && (
        <>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
            {isEn ? "Sector Performance" : "ผลตอบแทนตามกลุ่ม"}
          </p>
          <div className="flex flex-col gap-1">
            {sectors.map(s => {
              const pos = s.change >= 0;
              const barPct = Math.min(Math.abs(s.change) * 10, 100);
              return (
                <div key={s.sector} className="flex items-center gap-2">
                  <p className="text-[10px] text-slate-600 w-28 flex-shrink-0 truncate">{s.sector}</p>
                  <div className="flex-1 h-1.5 bg-[#e9edc9] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width:      `${barPct}%`,
                        background: pos ? "#16A34A" : "#DC2626",
                        marginLeft: pos ? "0" : "auto",
                      }}
                    />
                  </div>
                  <p
                    className="text-[10px] font-bold w-12 text-right flex-shrink-0"
                    style={{ color: pos ? "#16A34A" : "#DC2626", fontFamily: "var(--font-mono)" }}
                  >
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
