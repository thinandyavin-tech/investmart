"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import type { EarningsEvent } from "@/app/api/earnings/upcoming/route";

interface GroupedDay {
  date:   string;
  label:  string;
  events: EarningsEvent[];
}

function formatRevenue(rev: number | null): string {
  if (rev === null) return "";
  if (rev >= 1e9) return `$${(rev / 1e9).toFixed(1)}B`;
  if (rev >= 1e6) return `$${(rev / 1e6).toFixed(0)}M`;
  return `$${rev.toFixed(0)}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00Z");
  return d.toLocaleDateString("th-TH", { weekday: "short", month: "short", day: "numeric" });
}

function groupByDate(events: EarningsEvent[]): GroupedDay[] {
  const map = new Map<string, EarningsEvent[]>();
  for (const e of events) {
    const list = map.get(e.date) ?? [];
    list.push(e);
    map.set(e.date, list);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, evts]) => ({ date, label: formatDate(date), events: evts }));
}

export function EarningsCalendarCard() {
  const [groups, setGroups]   = useState<GroupedDay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/earnings/upcoming")
      .then((r) => r.json() as Promise<{ events: EarningsEvent[] }>)
      .then((d) => setGroups(groupByDate(d.events ?? [])))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (!loading && groups.length === 0) return null;

  return (
    <div className="bg-[#faedcd] border border-[#ccd5ae] rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#ccd5ae]">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
          Earnings สัปดาห์นี้
        </span>
        <span className="text-slate-300 text-xs">·</span>
        <span className="text-xs text-slate-400">7 วันข้างหน้า</span>
      </div>

      {loading ? (
        <div className="px-3 py-4 text-center text-xs text-slate-400">
          กำลังโหลด...
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {groups.map(({ date, label, events }) => (
            <div key={date} className="px-3 py-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                {label}
              </p>
              <div className="flex flex-col gap-0.5">
                {events.map((e) => (
                  <Link
                    key={e.symbol}
                    href={`/stock/${e.symbol}`}
                    className="flex items-center justify-between py-0.5 hover:bg-[#e9edc9] rounded transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 w-16 truncate">
                        {e.symbol}
                      </span>
                      <HourBadge hour={e.hour} />
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      {e.epsEstimate !== null && (
                        <span className="text-xs text-slate-500">
                          EPS <span className="font-semibold text-slate-700">${e.epsEstimate.toFixed(2)}</span>
                        </span>
                      )}
                      {e.revenueEstimate !== null && (
                        <span className="text-xs text-slate-500">
                          Rev <span className="font-semibold text-slate-700">{formatRevenue(e.revenueEstimate)}</span>
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function HourBadge({ hour }: { hour: string }) {
  if (hour === "bmo") {
    return (
      <span className="text-xs font-semibold px-1 py-0.5 rounded bg-amber-50 text-amber-600">
        ก่อนเปิด
      </span>
    );
  }
  if (hour === "amc") {
    return (
      <span className="text-xs font-semibold px-1 py-0.5 rounded bg-indigo-50 text-indigo-600">
        หลังปิด
      </span>
    );
  }
  return null;
}
