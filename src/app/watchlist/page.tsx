"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useUser } from "@/lib/userContext";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/Card";
import { OffsetButton } from "@/components/OffsetButton";

const TICKER_RE = /^[A-Z][A-Z.\-]{0,9}$/;

interface WatchItem {
  ticker:    string;
  price:     number | null;
  changePct: number | null;
  loading:   boolean;
}

export default function WatchlistPage() {
  const { user, loading: userLoading } = useUser();
  const [items, setItems]     = useState<WatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput]     = useState("");
  const [addMsg, setAddMsg]   = useState("");
  const [adding, setAdding]   = useState(false);

  const loadPrices = useCallback(async (tickers: string[]) => {
    if (tickers.length === 0) return;
    await Promise.all(
      tickers.map(async (ticker) => {
        try {
          const res  = await fetch(`/api/stock/quote?symbol=${ticker}`);
          const data = (await res.json()) as { c?: number; pc?: number; dp?: number };
          setItems((prev) =>
            prev.map((it) =>
              it.ticker === ticker
                ? { ...it, price: data.c ?? null, changePct: data.dp ?? null, loading: false }
                : it
            )
          );
        } catch {
          setItems((prev) =>
            prev.map((it) => it.ticker === ticker ? { ...it, loading: false } : it)
          );
        }
      })
    );
  }, []);

  const loadWatchlist = useCallback(async () => {
    const res  = await fetch("/api/watchlist");
    const data = (await res.json()) as { items?: { ticker: string }[] };
    const tickers = (data.items ?? []).map((i) => i.ticker);
    setItems(tickers.map((t) => ({ ticker: t, price: null, changePct: null, loading: true })));
    setLoading(false);
    await loadPrices(tickers);
  }, [loadPrices]);

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
      const newItem: WatchItem = { ticker, price: null, changePct: null, loading: true };
      setItems((prev) => [newItem, ...prev]);
      await loadPrices([ticker]);
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
              className="flex-1 border border-[#1F1A14] bg-[#FBF7ED] px-3 py-2 text-xs font-bold uppercase focus:outline-none focus:ring-1 focus:ring-[#1F1A14]"
              style={{ fontFamily: "var(--font-mono)" }}
              aria-label="Ticker เพื่อเพิ่ม watchlist"
            />
            <OffsetButton size="sm" onClick={() => void handleAdd()} disabled={adding}>
              {adding ? "..." : "+ เพิ่ม"}
            </OffsetButton>
          </div>
          {addMsg && (
            <p className="text-[10px] mt-1" style={{ color: "#DC2626" }} role="alert">
              {addMsg}
            </p>
          )}
        </Card>

        {/* List */}
        <Card className="overflow-hidden">
          <div className="px-3 pt-3 pb-2 border-b border-[#E8E2D4] flex items-center justify-between">
            <h2 className="text-[10px] font-bold uppercase tracking-widest">
              {items.length} หุ้น
            </h2>
            <span className="text-[9px] text-[#8A8378]">สูงสุด 50 หุ้น</span>
          </div>

          {loading ? (
            <div className="divide-y divide-[#E8E2D4]">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center justify-between px-3 py-3">
                  <div className="h-3 w-16 bg-[#E8E2D4] animate-pulse rounded" />
                  <div className="h-3 w-20 bg-[#E8E2D4] animate-pulse rounded" />
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="px-3 py-6 text-[10px] text-[#8A8378] text-center">
              Watchlist ว่างอยู่ — เพิ่มหุ้นด้านบน
            </p>
          ) : (
            <div className="divide-y divide-[#E8E2D4]">
              {items.map((item) => {
                const positive = (item.changePct ?? 0) >= 0;
                return (
                  <div key={item.ticker} className="flex items-center gap-3 px-3 py-2.5 hover:bg-[#EDE7D9] transition-colors">
                    <Link
                      href={`/stock/${item.ticker}`}
                      className="font-bold text-[11px] w-16 flex-shrink-0 hover:underline text-[#5B8A2A]"
                    >
                      {item.ticker}
                    </Link>

                    {item.loading ? (
                      <div className="flex-1 h-3 bg-[#E8E2D4] animate-pulse rounded" />
                    ) : item.price ? (
                      <>
                        <span
                          className="flex-1 text-[11px] font-bold"
                          style={{ fontFamily: "var(--font-mono)" }}
                        >
                          ${item.price.toFixed(2)}
                        </span>
                        <span
                          className="text-[10px] font-bold w-16 text-right"
                          style={{
                            fontFamily: "var(--font-mono)",
                            color: positive ? "#5B8A2A" : "#DC2626",
                          }}
                        >
                          {positive ? "+" : ""}{(item.changePct ?? 0).toFixed(2)}%
                        </span>
                      </>
                    ) : (
                      <span className="flex-1 text-[10px] text-[#8A8378]">—</span>
                    )}

                    <div className="flex gap-1.5 flex-shrink-0">
                      <Link
                        href={`/radar?ticker=${item.ticker}`}
                        className="text-[9px] px-1.5 py-0.5 border border-[#1F1A14] font-bold hover:bg-[#1F1A14] hover:text-white transition-colors"
                        title="วิเคราะห์ใน Radar"
                      >
                        Radar
                      </Link>
                      <button
                        onClick={() => void handleRemove(item.ticker)}
                        className="text-[9px] px-1.5 py-0.5 border border-[#E8E2D4] text-[#8A8378] hover:border-[#DC2626] hover:text-[#DC2626] transition-colors"
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

        <p className="text-[9px] text-[#8A8378] text-center">
          ราคาจาก Finnhub · พอร์ตหุ้นจำลอง ไม่ใช้เงินจริง
        </p>
      </div>
    </AppShell>
  );
}
