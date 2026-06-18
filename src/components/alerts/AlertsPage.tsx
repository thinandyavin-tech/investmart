"use client";

import { useState, useEffect } from "react";
import { Link } from "@/i18n/navigation";
import { PushNotificationSetup } from "@/components/PushNotificationSetup";
import { useI18n } from "@/lib/i18n";

interface PriceAlert {
  id:        string;
  ticker:    string;
  threshold: number;
  condition: "above" | "below";
  triggered: boolean;
  createdAt: string;
}

const TICKER_RE = /^[A-Z][A-Z.\-]{0,9}$/;

function fmtPrice(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}

export function AlertsPage() {
  const { lang } = useI18n();
  const isEn = lang === "en";

  const [alerts,    setAlerts]    = useState<PriceAlert[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [ticker,    setTicker]    = useState("");
  const [threshold, setThreshold] = useState("");
  const [condition, setCondition] = useState<"above" | "below">("above");
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");
  const [tab,       setTab]       = useState<"active" | "triggered">("active");

  useEffect(() => {
    fetch("/api/alerts")
      .then(r => r.json())
      .then((d: { alerts?: PriceAlert[] }) => setAlerts(d.alerts ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const active    = alerts.filter(a => !a.triggered);
  const triggered = alerts.filter(a =>  a.triggered);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const t = ticker.trim().toUpperCase();
    const v = parseFloat(threshold);
    if (!TICKER_RE.test(t))        { setError(isEn ? "Invalid ticker" : "รหัสหุ้นไม่ถูกต้อง"); return; }
    if (isNaN(v) || v <= 0)        { setError(isEn ? "Invalid price" : "ราคาไม่ถูกต้อง"); return; }
    if (active.length >= 10)       { setError(isEn ? "Max 10 active alerts" : "แจ้งเตือนสูงสุด 10 รายการ"); return; }
    setError("");
    setSaving(true);
    try {
      const res  = await fetch("/api/alerts", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ticker: t, threshold: v, condition }),
      });
      const data = (await res.json()) as PriceAlert & { error?: string };
      if (!res.ok) { setError(data.error ?? (isEn ? "Could not create alert" : "ไม่สามารถตั้งแจ้งเตือนได้")); return; }
      setAlerts(prev => [data, ...prev]);
      setTicker("");
      setThreshold("");
    } catch {
      setError(isEn ? "Network error" : "เกิดข้อผิดพลาด ลองใหม่อีกครั้ง");
    } finally {
      setSaving(false);
    }
  }

  async function deleteAlert(id: string) {
    await fetch(`/api/alerts/${id}`, { method: "DELETE" });
    setAlerts(prev => prev.filter(a => a.id !== id));
  }

  const listToShow = tab === "active" ? active : triggered;

  return (
    <div className="max-w-lg mx-auto px-4 py-4 flex flex-col gap-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-slate-900">
            {isEn ? "Price Alerts" : "แจ้งเตือนราคา"}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isEn ? "Get notified when a stock hits your target" : "รับแจ้งเตือนเมื่อราคาถึงเป้าหมาย"}
          </p>
        </div>
        <PushNotificationSetup compact />
      </div>

      {/* Create form */}
      <div className="bg-white rounded-2xl border border-[#ccd5ae] p-4">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
          {isEn ? "New Alert" : "ตั้งแจ้งเตือนใหม่"}
        </p>
        <form onSubmit={e => void submit(e)} className="flex flex-col gap-3">
          <div className="flex gap-2">
            <input
              value={ticker}
              onChange={e => setTicker(e.target.value.toUpperCase())}
              placeholder={isEn ? "Ticker (e.g. AAPL)" : "รหัสหุ้น (เช่น AAPL)"}
              maxLength={10}
              className="flex-1 border border-[#ccd5ae] rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400 uppercase"
              aria-label="Stock ticker"
            />
            <input
              value={threshold}
              onChange={e => setThreshold(e.target.value)}
              placeholder={isEn ? "Price $" : "ราคา $"}
              type="number"
              min="0.01"
              step="0.01"
              className="w-28 border border-[#ccd5ae] rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400"
              aria-label="Target price"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-xl overflow-hidden border border-[#ccd5ae] text-xs font-semibold flex-shrink-0">
              {(["above", "below"] as const).map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCondition(c)}
                  className={`px-3 py-2 transition-colors ${
                    condition === c ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-[#e9edc9]"
                  }`}
                >
                  {c === "above" ? (isEn ? "↑ Above" : "↑ สูงกว่า") : (isEn ? "↓ Below" : "↓ ต่ำกว่า")}
                </button>
              ))}
            </div>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl disabled:opacity-40 transition-colors"
            >
              {saving ? "..." : (isEn ? "Set Alert" : "ตั้งแจ้งเตือน")}
            </button>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}
        </form>
      </div>

      {/* Alerts list */}
      <div className="bg-white rounded-2xl border border-[#ccd5ae] overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-[#ccd5ae]">
          {(["active", "triggered"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
                tab === t ? "text-violet-700 border-b-2 border-violet-600 bg-violet-50" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t === "active"
                ? `${isEn ? "Active" : "ใช้งานอยู่"} (${active.length})`
                : `${isEn ? "Triggered" : "เกิดขึ้นแล้ว"} (${triggered.length})`
              }
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex flex-col gap-2 p-4">
            {[1,2].map(i => <div key={i} className="h-12 bg-[#e9edc9] animate-pulse rounded-xl" />)}
          </div>
        )}

        {!loading && listToShow.length === 0 && (
          <div className="text-center py-8 text-xs text-slate-400">
            {tab === "active"
              ? (isEn ? "No active alerts — set one above" : "ยังไม่มีแจ้งเตือน — ตั้งค่าด้านบน")
              : (isEn ? "No triggered alerts yet" : "ยังไม่มีแจ้งเตือนที่เกิดขึ้น")
            }
          </div>
        )}

        {listToShow.map((alert, i) => (
          <div
            key={alert.id}
            className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-[#e9edc9]" : ""}`}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
              style={{ background: alert.condition === "above" ? "#16A34A" : "#DC2626" }}
            >
              {alert.condition === "above" ? "↑" : "↓"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-1.5">
                <Link href={`/stock/${alert.ticker}`} className="text-xs font-bold text-slate-900 hover:underline">
                  {alert.ticker}
                </Link>
                <span className="text-xs text-slate-500">
                  {alert.condition === "above" ? (isEn ? "above" : "สูงกว่า") : (isEn ? "below" : "ต่ำกว่า")}
                </span>
                <span className="text-xs font-semibold text-slate-900">{fmtPrice(alert.threshold)}</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">{fmtDate(alert.createdAt)}</p>
            </div>
            {alert.triggered ? (
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex-shrink-0">
                {isEn ? "Fired" : "เกิดขึ้น"}
              </span>
            ) : (
              <button
                onClick={() => void deleteAlert(alert.id)}
                className="text-slate-300 hover:text-red-500 transition-colors text-lg leading-none flex-shrink-0"
                aria-label="ลบแจ้งเตือน"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-400 text-center leading-snug">
        {isEn
          ? "Alerts fire when InvestMart detects the price crossing your threshold · Max 10 active"
          : "แจ้งเตือนเมื่อ InvestMart ตรวจพบราคาผ่านเกณฑ์ · สูงสุด 10 รายการ"
        }
      </p>
    </div>
  );
}
