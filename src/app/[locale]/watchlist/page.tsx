"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Link } from "@/i18n/navigation";
import { useUser } from "@/lib/userContext";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/Card";
import { OffsetButton } from "@/components/OffsetButton";
import { useLiveQuotes } from "@/hooks/useLiveQuotes";
import { AskMartinButton } from "@/components/ai/AskMartinButton";

const TICKER_RE = /^[A-Z][A-Z.\-]{0,9}$/;

interface WatchItem {
  ticker: string;
}

export default function WatchlistPage() {
  const { user, loading: userLoading } = useUser();
  const [items, setItems]     = useState<WatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput]     = useState("");
  const [addMsg, setAddMsg]   = useState("");
  const [adding, setAdding]   = useState(false);

  const tickers = useMemo(() => items.map((i) => i.ticker), [items]);
  const { prices, loading: pricesLoading } = useLiveQuotes(tickers);

  const loadWatchlist = useCallback(async () => {
    const res  = await fetch("/api/watchlist");
    const data = (await res.json()) as { items?: { ticker: string }[] };
    const list = (data.items ?? []).map((i) => i.ticker);
    setItems(list.map((t) => ({ ticker: t })));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!userLoading) void loadWatchlist();
  }, [userLoading, loadWatchlist]);

  async function handleAdd() {
    const ticker = input.trim().toUpperCase();
    if (!TICKER_RE.test(ticker)) { setAddMsg("Ticker ไม่ถูกต้อง"); return; }
    if (items.some((i) => i.ticker === ticker)) { setAddMsg("มีอยู่แล้ว"); return; }
    setAdding(true);
    setAddMsg("");
    try {
      const res  = await fetch("/api/watchlist", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ticker }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) { setAddMsg(data.error ?? "เกิดข้อผิดพลาด"); return; }
      setInput("");
      setItems((prev) => [{ ticker }, ...prev]);
    } catch {
      setAddMsg("เกิดข้อผิดพลาด");
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(ticker: string) {
    setItems((prev) => prev.filter((i) => i.ticker !== ticker));
    await fetch(`/api/watchlist/${ticker}`, { method: "DELETE" });
  }

  if (!userLoading && !user) {
    return (
      <AppShell>
        <div className="max-w-sm mx-auto px-4 py-8 text-center">
          <p className="text-xs text-[#8A8378] mb-3">เข้าสู่ระบบเพื่อใช้ Watchlist</p>
          <Link href="/signin">
            <OffsetButton variant="lime">เข้าสู่ระบบ / สมัครสมาชิก</OffsetButton>
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-lg mx-auto px-4 py-4 flex flex-col gap-4">
        <h1 className="text-xs font-bold uppercase tracking-widest">Watchlist — รายการติดตาม</h1>

        {/* Add ticker */}
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value.replace(/[^a-zA-Z.\-]/g, "").toUpperCase())}
              onKeyDown={(e) => { if (e.key === "Enter") void handleAdd(); }}
              placeholder="AAPL, NVDA, TSLA..."
              maxLength={10}
              className="flex-1 border border-[#1F1A14] bg-[#fefae0] px-3 py-2 text-xs font-bold uppercase focus:outline-none focus:ring-1 focus:ring-[#1F1A14]"
              style={{ fontFamily: "var(--font-mono)" }}
              aria-label="Ticker เพื่อเพิ่ม watchlist"
            />
            <OffsetButton size="sm" onClick={() => void handleAdd()} disabled={adding}>
              {adding ? "..." : "+ เพิ่ม"}
            </OffsetButton>
          </div>
          {addMsg && (
            <p className="text-xs mt-1" style={{ color: "#DC2626" }} role="alert">
              {addMsg}
            </p>
          )}
        </Card>

        {/* List */}
        <Card className="overflow-hidden">
          <div className="px-3 pt-3 pb-2 border-b border-[#e9edc9] flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-widest">
              {items.length} หุ้น
            </h2>
            <span className="text-xs text-[#8A8378]">สูงสุด 50 หุ้น</span>
          </div>

          {loading ? (
            <div className="divide-y divide-[#e9edc9]">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center justify-between px-3 py-3">
                  <div className="h-3 w-16 bg-[#e9edc9] animate-pulse rounded" />
                  <div className="h-3 w-20 bg-[#e9edc9] animate-pulse rounded" />
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="px-3 py-6 text-xs text-[#8A8378] text-center">
              Watchlist ว่างอยู่ — เพิ่มหุ้นด้านบน
            </p>
          ) : (
            <div className="divide-y divide-[#e9edc9]">
              {items.map((item) => {
                const liveData = prices[item.ticker];
                const positive = (liveData?.changePct ?? 0) >= 0;
                const isPriceLoading = pricesLoading && !liveData;
                return (
                  <div key={item.ticker} className="flex items-center gap-3 px-3 py-2.5 hover:bg-[#EDE7D9] transition-colors">
                    <Link
                      href={`/stock/${item.ticker}`}
                      className="font-bold text-xs w-16 flex-shrink-0 hover:underline text-[#5B8A2A]"
                    >
                      {item.ticker}
                    </Link>

                    {isPriceLoading ? (
                      <div className="flex-1 h-3 bg-[#e9edc9] animate-pulse rounded" />
                    ) : liveData ? (
                      <>
                        <span
                          className="flex-1 text-xs font-bold"
                          style={{ fontFamily: "var(--font-mono)" }}
                        >
                          ${liveData.price.toFixed(2)}
                        </span>
                        <span
                          className="text-xs font-bold w-16 text-right"
                          style={{
                            fontFamily: "var(--font-mono)",
                            color: positive ? "#5B8A2A" : "#DC2626",
                          }}
                        >
                          {positive ? "+" : ""}{(liveData.changePct ?? 0).toFixed(2)}%
                        </span>
                      </>
                    ) : (
                      <span className="flex-1 text-xs text-[#8A8378]">—</span>
                    )}

                    <div className="flex gap-1.5 flex-shrink-0">
                      <AskMartinButton
                        q={`Tell me about $${item.ticker} — current price action, key catalysts, and what to watch.`}
                        className="text-xs px-1.5 py-0.5 border border-violet-300 text-violet-600 font-bold hover:bg-violet-600 hover:text-white transition-colors"
                        aria-label={`Ask Martin about ${item.ticker}`}
                      >
                        ✦
                      </AskMartinButton>
                      <Link
                        href={`/alerts?ticker=${item.ticker}`}
                        className="text-xs px-1.5 py-0.5 border border-[#ccd5ae] text-[#8A8378] hover:border-[#1F1A14] hover:text-[#1F1A14] transition-colors"
                        title="ตั้งแจ้งเตือนราคา"
                      >
                        🔔
                      </Link>
                      <Link
                        href={`/radar?ticker=${item.ticker}`}
                        className="text-xs px-1.5 py-0.5 border border-[#1F1A14] font-bold hover:bg-[#1F1A14] hover:text-white transition-colors"
                        title="วิเคราะห์ใน Radar"
                      >
                        Radar
                      </Link>
                      <button
                        onClick={() => void handleRemove(item.ticker)}
                        className="text-xs px-1.5 py-0.5 border border-[#e9edc9] text-[#8A8378] hover:border-[#DC2626] hover:text-[#DC2626] transition-colors"
                        aria-label={`ลบ ${item.ticker}`}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <p className="text-xs text-[#8A8378] text-center">
          ราคาจาก Finnhub · อัพเดทอัตโนมัติระหว่างตลาดเปิด
        </p>
      </div>
    </AppShell>
  );
}
