"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/Card";
import { useI18n } from "@/lib/i18n";

interface Sector {
  name:   string;
  change: number;
}

// Sector display names are handled via t.market.sectors in the component

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
  const [error, setError]     = useState(false);
  const { t } = useI18n();

  function load() {
    setLoading(true);
    setError(false);
    fetch("/api/market/sectors")
      .then((r) => r.json())
      .then((d: { sectors?: Sector[] }) => setSectors(d.sectors ?? []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const maxAbs = sectors.reduce((m, s) => Math.max(m, Math.abs(s.change)), 0);

  return (
    <Card className="overflow-hidden">
      <div className="px-3 pt-3 pb-2 border-b border-[#ccd5ae]">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#1F1A14]">{t.market.sectorTitle}</h2>
        <p className="text-[10px] text-[#8A8378] mt-0.5">{t.market.sectorSubtitle}</p>
      </div>

      {loading ? (
        <div className="divide-y divide-[#e9edc9]">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-1.5">
              <div className="h-2.5 w-24 skeleton rounded" />
              <div className="h-2 flex-1 skeleton rounded" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="px-3 py-5 text-center">
          <p className="text-xs text-[#8A8378] mb-2">โหลดข้อมูลไม่ได้</p>
          <button onClick={load} className="text-xs font-bold text-[#5B8A2A] hover:underline">{t.errors.retry}</button>
        </div>
      ) : sectors.length === 0 ? (
        <div className="px-3 py-5 text-center">
          <p className="text-xs text-[#8A8378] mb-1">{t.market.noSectorData}</p>
          <p className="text-[10px] text-[#8A8378]">Finnhub free tier</p>
        </div>
      ) : (
        <div className="divide-y divide-[#e9edc9]">
          {sectors.map(({ name, change }) => {
            const positive    = change >= 0;
            const changeColor = positive ? "#16A34A" : "#DC2626";
            const thaiName    = (t.market.sectors as Record<string, string>)[name] ?? name;

            return (
              <div key={name} className="flex items-center gap-2 px-3 py-1.5">
                <span className="text-xs text-[#1F1A14] w-28 flex-shrink-0 truncate" title={name}>
                  {thaiName}
                </span>
                <Bar change={change} maxAbs={maxAbs} />
                <span
                  className="text-xs font-bold w-12 text-right flex-shrink-0"
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
