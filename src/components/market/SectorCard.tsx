"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/Card";

interface Sector {
  name:   string;
  change: number;
}

const THAI_NAMES: Record<string, string> = {
  "Technology":             "เทคโนโลยี",
  "Healthcare":             "สุขภาพ",
  "Financial Services":     "การเงิน",
  "Consumer Cyclical":      "สินค้าวงจร",
  "Communication Services": "สื่อสาร",
  "Industrials":            "อุตสาหกรรม",
  "Consumer Defensive":     "สินค้าจำเป็น",
  "Energy":                 "พลังงาน",
  "Basic Materials":        "วัสดุ",
  "Real Estate":            "อสังหาริมทรัพย์",
  "Utilities":              "สาธารณูปโภค",
};

function Bar({ change, maxAbs }: { change: number; maxAbs: number }) {
  const pct   = maxAbs > 0 ? Math.abs(change) / maxAbs : 0;
  const width = `${(pct * 80).toFixed(1)}%`;
  const color = change >= 0 ? "#16A34A" : "#DC2626";

  return (
    <div className="flex items-center gap-1.5 flex-1 min-w-0">
      <div
        className="h-2 rounded-full transition-all"
        style={{ width, background: color, minWidth: "2px" }}
        aria-hidden="true"
      />
    </div>
  );
}

export function SectorCard() {
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/market/sectors")
      .then((r) => r.json())
      .then((d: { sectors?: Sector[] }) => setSectors(d.sectors ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const maxAbs = sectors.reduce((m, s) => Math.max(m, Math.abs(s.change)), 0);

  return (
    <Card className="overflow-hidden">
      <div className="px-3 pt-3 pb-2 border-b border-slate-100">
        <h2 className="text-[10px] font-bold uppercase tracking-widest">Sector Performance</h2>
      </div>

      {loading ? (
        <div className="divide-y divide-slate-100">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-1.5">
              <div className="h-2.5 w-24 bg-slate-200 animate-pulse rounded" />
              <div className="h-2 flex-1 bg-slate-200 animate-pulse rounded" />
            </div>
          ))}
        </div>
      ) : sectors.length === 0 ? (
        <p className="px-3 py-4 text-[10px] text-slate-500 text-center">
          ไม่มีข้อมูล Sector
        </p>
      ) : (
        <div className="divide-y divide-slate-100">
          {sectors.map(({ name, change }) => {
            const positive    = change >= 0;
            const changeColor = positive ? "#16A34A" : "#DC2626";
            const thaiName    = THAI_NAMES[name] ?? name;

            return (
              <div key={name} className="flex items-center gap-2 px-3 py-1.5">
                <span className="text-[9px] text-slate-900 w-28 flex-shrink-0 truncate" title={name}>
                  {thaiName}
                </span>
                <Bar change={change} maxAbs={maxAbs} />
                <span
                  className="text-[9px] font-bold w-12 text-right flex-shrink-0"
                  style={{ color: changeColor, fontFamily: "var(--font-mono)" }}
                >
                  {positive ? "+" : ""}{change.toFixed(2)}%
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
