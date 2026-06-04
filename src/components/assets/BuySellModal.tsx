"use client";

import { useState, useRef, useEffect } from "react";

interface BuySellModalProps {
  ticker:         string;
  side:           "BUY" | "SELL";
  currentPrice:   number;
  availableUsd:   number;
  availableShares: number;
  fxRate:         number;
  onClose:        () => void;
  onSuccess:      () => void;
}

export function BuySellModal({
  ticker, side, currentPrice, availableUsd, availableShares, fxRate, onClose, onSuccess,
}: BuySellModalProps) {
  const [shares, setShares]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const inputRef              = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const parsed   = parseFloat(shares) || 0;
  const total    = parsed * currentPrice;
  const canBuy   = side === "BUY"  && parsed > 0 && total <= availableUsd;
  const canSell  = side === "SELL" && parsed > 0 && parsed <= availableShares;
  const canSubmit = side === "BUY" ? canBuy : canSell;

  async function submit() {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch("/api/trade", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ticker, side, shares: parsed }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) { setError(data.error ?? "เกิดข้อผิดพลาด"); return; }
      onSuccess();
    } catch {
      setError("เชื่อมต่อไม่ได้ กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && canSubmit) void submit();
    if (e.key === "Escape") onClose();
  }

  const isBuy     = side === "BUY";
  const accentCls = isBuy ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-500 hover:bg-red-600";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${isBuy ? "ซื้อ" : "ขาย"} ${ticker}`}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full sm:w-96 bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-xl p-6 pb-8 sm:pb-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold dark:text-white">
            <span className={isBuy ? "text-emerald-600" : "text-red-500"}>{isBuy ? "ซื้อ" : "ขาย"}</span>
            {" "}{ticker}
          </h2>
          <button
            onClick={onClose}
            aria-label="ปิด"
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400"
          >
            ✕
          </button>
        </div>

        <div className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">
            ${currentPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          {" "}ต่อหุ้น
        </div>

        <div className="mb-4">
          <label htmlFor="shares-input" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            จำนวนหุ้น
          </label>
          <input
            id="shares-input"
            ref={inputRef}
            type="number"
            min="0"
            step="0.01"
            value={shares}
            onChange={(e) => setShares(e.target.value)}
            onKeyDown={handleKey}
            placeholder="0"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-lg font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="space-y-1.5 text-sm mb-5">
          {isBuy ? (
            <>
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>เงิน USD ที่มี</span>
                <span className="font-mono">${availableUsd.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold text-slate-800 dark:text-slate-200">
                <span>มูลค่ารวม</span>
                <span className={`font-mono ${total > availableUsd ? "text-red-500" : ""}`}>
                  ${total.toFixed(2)}
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>หุ้นที่ถือ</span>
                <span className="font-mono">{availableShares.toFixed(4)} หุ้น</span>
              </div>
              <div className="flex justify-between font-semibold text-slate-800 dark:text-slate-200">
                <span>มูลค่าที่ขาย</span>
                <span className="font-mono">${total.toFixed(2)}</span>
              </div>
            </>
          )}
          <div className="flex justify-between text-slate-400 dark:text-slate-500 text-xs">
            <span>≈ ฿</span>
            <span className="font-mono">{(total * fxRate).toLocaleString("th-TH", { maximumFractionDigits: 0 })}</span>
          </div>
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-500 mb-4">{error}</p>
        )}

        <button
          onClick={() => void submit()}
          disabled={!canSubmit || loading}
          className={`w-full py-3.5 rounded-xl text-white font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${accentCls}`}
        >
          {loading ? "กำลังดำเนินการ…" : `${isBuy ? "ซื้อ" : "ขาย"} ${parsed > 0 ? `${parsed} หุ้น` : ""}`}
        </button>
      </div>
    </div>
  );
}
