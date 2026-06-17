"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/lib/userContext";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/Card";
import { OffsetButton } from "@/components/OffsetButton";

const STARTING_THB = 1_250_000;
const FALLBACK_FX  = 35.2;

interface LeaderboardEntry {
  username: string | null;
  rank:     number;
}

export default function ProfileSharePage() {
  const { user, loading } = useUser();
  const [rank, setRank]     = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user?.username) return;
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((d: { leaderboard?: LeaderboardEntry[] }) => {
        const entry = d.leaderboard?.find((e) => e.username === user.username);
        if (entry) setRank(entry.rank);
      })
      .catch(() => {});
  }, [user?.username]);

  const costBasis   = user?.holdings.reduce((s, h) => s + h.shares * h.avgCost, 0) ?? 0;
  const totalThb    = user
    ? user.cashThb + user.cashUsd * FALLBACK_FX + costBasis * FALLBACK_FX
    : 0;
  const pnl         = totalThb - STARTING_THB;
  const pnlPct      = (pnl / STARTING_THB) * 100;
  const pnlPos      = pnl >= 0;
  const displayName = user?.name ?? user?.username ?? "นักลงทุน";
  const handle      = user?.username ? `@${user.username}` : null;
  const topHolding  = user?.holdings
    .slice()
    .sort((a, b) => b.shares * b.avgCost - a.shares * a.avgCost)[0];

  function buildShareText(): string {
    const lines = [
      `📊 ${displayName} บน InvestMart`,
      handle ?? "",
      "",
      `พอร์ตจำลอง: ฿${Math.round(totalThb).toLocaleString("th-TH")}`,
      `P&L: ${pnlPos ? "+" : ""}${pnlPct.toFixed(2)}% (${pnlPos ? "+" : ""}฿${Math.round(pnl).toLocaleString("th-TH")})`,
      rank ? `อันดับ: #${rank}` : "",
      `หุ้น: ${user?.holdings.length ?? 0} ตัว · เทรด: ${user?.tradeCount ?? 0} ครั้ง`,
      topHolding ? `Top holding: ${topHolding.ticker}` : "",
      "",
      "investmart.vercel.app",
    ].filter(Boolean);
    return lines.join("\n");
  }

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(buildShareText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked in some browsers — silent fail
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-sm mx-auto px-4 py-6">
          <div className="h-48 animate-pulse bg-[#e9edc9] rounded" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-sm mx-auto px-4 py-6 flex flex-col gap-4">
        <div>
          <h1 className="text-sm font-bold uppercase tracking-widest mb-1">แชร์โปรไฟล์</h1>
          <p className="text-xs text-[#8A8378]">คัดลอกข้อมูลพอร์ตเพื่อแชร์ให้เพื่อน</p>
        </div>

        <Card className="p-4" style={{ fontFamily: "var(--font-mono)" }}>
          <div className="border-b border-[#e9edc9] pb-3 mb-3">
            <p className="text-xs font-bold">{displayName}</p>
            {handle && <p className="text-xs text-[#8A8378]">{handle}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-[#8A8378] uppercase tracking-widest">มูลค่าพอร์ต</span>
              <span className="text-sm font-bold">฿{Math.round(totalThb).toLocaleString("th-TH")}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-[#8A8378] uppercase tracking-widest">P&L</span>
              <span
                className="text-sm font-bold"
                style={{ color: pnlPos ? "#5B8A2A" : "#DC2626" }}
              >
                {pnlPos ? "+" : ""}{pnlPct.toFixed(2)}%
              </span>
            </div>
            {rank !== null && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-[#8A8378] uppercase tracking-widest">อันดับ</span>
                <span className="text-sm font-bold">#{rank}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-xs text-[#8A8378] uppercase tracking-widest">หุ้น / เทรด</span>
              <span className="text-xs">{user?.holdings.length ?? 0} ตัว / {user?.tradeCount ?? 0} ครั้ง</span>
            </div>
            {topHolding && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-[#8A8378] uppercase tracking-widest">Top holding</span>
                <span className="text-xs font-bold">{topHolding.ticker}</span>
              </div>
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-[#e9edc9]">
            <p className="text-xs text-[#8A8378] text-center">investmart.vercel.app</p>
          </div>
        </Card>

        <OffsetButton variant="lime" onClick={() => void copyToClipboard()} className="w-full text-center">
          {copied ? "✓ คัดลอกแล้ว!" : "คัดลอกข้อมูล"}
        </OffsetButton>

        <p className="text-xs text-[#8A8378] text-center">
          ข้อมูลพอร์ตจำลอง · ไม่ใช่คำแนะนำการลงทุน
        </p>
      </div>
    </AppShell>
  );
}
