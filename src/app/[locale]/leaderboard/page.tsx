"use client";

import { useEffect, useState } from "react";

import { useUser } from "@/lib/userContext";
import { useI18n } from "@/lib/i18n";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/Card";
import { TierBadge } from "@/components/TierBadge";
import type { TierKey } from "@/lib/traderTier";

interface LeaderboardEntry {
  rank:     number;
  id:       string;
  username: string | null;
  name:     string | null;
  totalThb: number;
  pnl:      number;
  pnlPct:   number;
  trades:   number;
  holdings: number;
  tier:     TierKey;
}

const RANK_ICONS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

function formatTHB(n: number): string {
  return `฿${Math.round(n).toLocaleString("th-TH")}`;
}

export default function LeaderboardPage() {
  const { user, loading: userLoading } = useUser();
  const { t } = useI18n();
  const [entries, setEntries]          = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading]          = useState(true);
  const [error, setError]              = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const res  = await fetch("/api/leaderboard");
        const data = (await res.json()) as { leaderboard?: LeaderboardEntry[] };
        setEntries(data.leaderboard ?? []);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-4 flex flex-col gap-4">
        <div>
          <h1 className="text-xs font-bold uppercase tracking-widest">{t.leaderboard.title}</h1>
          <p className="text-xs text-[#8A8378] mt-0.5">{t.leaderboard.subtitle}</p>
        </div>

        <Card className="overflow-hidden">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#1F1A14] bg-[#1F1A14] text-[#F3EDE0]">
                <th className="text-left px-3 py-2 text-xs uppercase tracking-wide">#</th>
                <th className="text-left px-3 py-2 text-xs uppercase tracking-wide">{t.leaderboard.user}</th>
                <th className="text-right px-3 py-2 text-xs uppercase tracking-wide">{t.leaderboard.portfolio}</th>
                <th className="text-right px-3 py-2 text-xs uppercase tracking-wide hidden sm:table-cell">{t.leaderboard.trades}</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <tr key={i} className="border-b border-[#E8E2D4]">
                      <td className="px-3 py-3"><div className="h-3 w-4 bg-[#E8E2D4] animate-pulse rounded" /></td>
                      <td className="px-3 py-3"><div className="h-3 w-32 bg-[#E8E2D4] animate-pulse rounded" /></td>
                      <td className="px-3 py-3"><div className="h-3 w-24 bg-[#E8E2D4] animate-pulse rounded ml-auto" /></td>
                      <td className="px-3 py-3 hidden sm:table-cell"><div className="h-3 w-8 bg-[#E8E2D4] animate-pulse rounded ml-auto" /></td>
                    </tr>
                  ))}
                </>
              )}

              {!loading && error && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-xs text-[#8A8378]">
                    {t.leaderboard.loadFailed}
                  </td>
                </tr>
              )}

              {!loading && !error && entries.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-xs text-[#8A8378]">
                    {t.leaderboard.noData}
                  </td>
                </tr>
              )}

              {!loading && !error && entries.map((e) => {
                const isMe        = !userLoading && user?.username != null && user.username === e.username;
                const displayName = e.name ?? e.username ?? `#${e.id}`;
                const handle      = e.username ? `@${e.username}` : `#${e.id}`;
                const rankIcon    = RANK_ICONS[e.rank];

                return (
                  <tr
                    key={e.id}
                    className="border-b border-[#E8E2D4] last:border-0"
                    style={{ background: isMe ? "#F5FAEE" : undefined }}
                  >
                    <td className="px-3 py-2.5 font-bold text-xs" style={{ fontFamily: "var(--font-mono)" }}>
                      {rankIcon ?? e.rank}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs">{displayName}</span>
                        <TierBadge tier={e.tier} size="xs" />
                        {e.name && e.username && (
                          <span className="text-xs text-[#8A8378]">{handle}</span>
                        )}
                        {isMe && (
                          <span
                            className="text-xs px-1.5 py-0.5 font-bold"
                            style={{ background: "#9BE15D", color: "#1F1A14" }}
                          >
                            {t.leaderboard.you}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right" style={{ fontFamily: "var(--font-mono)" }}>
                      <div className="font-bold text-xs">{formatTHB(e.totalThb)}</div>
                      <div
                        className="text-xs"
                        style={{ color: e.pnl >= 0 ? "#5B8A2A" : "#DC2626" }}
                      >
                        {e.pnl >= 0 ? "+" : ""}{formatTHB(e.pnl)}{" "}
                        ({e.pnl >= 0 ? "+" : ""}{e.pnlPct?.toFixed(1) ?? "0.0"}%)
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right text-xs text-[#8A8378] hidden sm:table-cell"
                        style={{ fontFamily: "var(--font-mono)" }}>
                      {e.trades}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>

        <p className="text-xs text-[#8A8378] text-center">
          มูลค่าคำนวณจากราคาต้นทุน + เงินสด · InvestMart
        </p>
      </div>
    </AppShell>
  );
}
