"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";

import { Card } from "@/components/Card";
import { useUser } from "@/lib/userContext";
import { useI18n } from "@/lib/i18n";

interface Trade {
  id:        string;
  ticker:    string;
  side:      string;
  shares:    number;
  price:     number;
  total:     number;
  currency:  string;
  createdAt: string;
}

interface Holding {
  ticker:   string;
  shares:   number;
  avgCost:  number;
  currency: string;
}

interface Analytics {
  totalBought:   number;
  totalSold:     number;
  tradeCount:    number;
  uniqueTickers: number;
  costBasis:     number;
  holdings:      Holding[];
}

function computeAnalytics(trades: Trade[]): Analytics {
  const totalBought   = trades.filter((t) => t.side === "BUY").reduce((s, t) => s + t.total, 0);
  const totalSold     = trades.filter((t) => t.side === "SELL").reduce((s, t) => s + t.total, 0);
  const uniqueTickers = new Set(trades.map((t) => t.ticker)).size;

  // Compute running holdings for cost basis
  const holdingMap: Record<string, { shares: number; cost: number }> = {};
  for (const t of [...trades].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())) {
    if (!holdingMap[t.ticker]) holdingMap[t.ticker] = { shares: 0, cost: 0 };
    const h = holdingMap[t.ticker];
    if (t.side === "BUY") {
      h.cost   = (h.cost * h.shares + t.price * t.shares) / (h.shares + t.shares);
      h.shares += t.shares;
    } else {
      h.shares = Math.max(0, h.shares - t.shares);
    }
  }

  const holdings: Holding[] = Object.entries(holdingMap)
    .filter(([, h]) => h.shares > 0.0001)
    .map(([ticker, h]) => ({ ticker, shares: h.shares, avgCost: h.cost, currency: "USD" }));

  const costBasis = holdings.reduce((s, h) => s + h.shares * h.avgCost, 0);

  return { totalBought, totalSold, tradeCount: trades.length, uniqueTickers, costBasis, holdings };
}

export function HistoryClient() {
  const { user } = useUser();
  const { t } = useI18n();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res  = await fetch("/api/user/history");
        const data = (await res.json()) as { trades: Trade[] };
        setTrades(data.trades ?? []);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [user]);

  const analytics = computeAnalytics(trades);

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-1 flex-wrap">
        <h1 className="text-xs font-bold uppercase tracking-widest">{t.history.title}</h1>
        <Link href="/journal" className="text-[10px] font-bold px-2.5 py-1 border border-[#ccd5ae] text-[#8B5CF6] hover:border-[#8B5CF6] transition-colors">
          📝 {t.nav.journal} →
        </Link>
      </div>
      <p className="text-xs text-[#8A8378] mb-4">{t.history.subtitle}</p>

      {!user && !loading && (
        <Card className="p-4 text-center mb-4 flex flex-col gap-2">
          <p className="text-xs text-[#8A8378]">{t.history.loginPrompt}</p>
          <div className="flex gap-2 justify-center">
            <Link href="/signin">
              <span className="inline-block px-4 py-2 text-xs font-bold bg-[#1F1A14] text-white border-2 border-[#1F1A14]" style={{ boxShadow: "2px 2px 0 #5B8A2A" }}>
                {t.common.signIn}
              </span>
            </Link>
            <Link href="/signup">
              <span className="inline-block px-4 py-2 text-xs font-bold border-2 border-[#5B8A2A] text-[#5B8A2A] hover:bg-[#9BE15D] transition-colors">
                {t.common.signUp}
              </span>
            </Link>
          </div>
        </Card>
      )}

      {loading ? (
        <div className="text-xs text-[#8A8378] text-center py-8">{t.common.loading}</div>
      ) : trades.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-xs text-[#8A8378]">{t.history.empty}</p>
          <p className="text-xs text-[#8A8378] mt-1">{t.history.emptyCta}</p>
        </Card>
      ) : (
        <>
          {/* Portfolio Analytics */}
          <Card className="p-4 mb-4">
            <h2 className="text-xs font-bold uppercase tracking-widest mb-3 text-[#8A8378]">Portfolio Summary</h2>
            <div className="grid grid-cols-2 gap-3 mb-3">
              {[
                { label: t.history.totalBought, value: `$${analytics.totalBought.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
                { label: t.history.totalSold,   value: `$${analytics.totalSold.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
                { label: t.history.costBasis,   value: `$${analytics.costBasis.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
                { label: t.history.orderCount,  value: String(analytics.tradeCount) },
                { label: t.history.uniqueTickers, value: `${analytics.uniqueTickers}${t.history.uniqueTickerSuffix}` },
              ].map(({ label, value }) => (
                <div key={label} className="flex flex-col gap-0.5">
                  <span className="text-xs text-[#8A8378] uppercase tracking-wide">{label}</span>
                  <span className="text-sm font-bold" style={{ fontFamily: "var(--font-mono)" }}>{value}</span>
                </div>
              ))}
            </div>
            {analytics.holdings.length > 0 && (
              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-[#8A8378] mb-1.5">
                  {t.history.holdingCount(analytics.holdings.length)}
                </div>
                <div className="flex flex-wrap gap-2">
                  {analytics.holdings.map((h) => (
                    <Link
                      key={h.ticker}
                      href={`/stock/${h.ticker}`}
                      className="flex items-center gap-1.5 border border-[#1F1A14] px-2 py-1 text-xs hover:bg-[#1F1A14] hover:text-white transition-colors"
                    >
                      <span className="font-bold">{h.ticker}</span>
                      <span className="text-[#8A8378]">{t.history.sharesUnit(h.shares.toFixed(2))}</span>
                      <span style={{ fontFamily: "var(--font-mono)" }}>@ ${h.avgCost.toFixed(2)}</span>
                    </Link>
                  ))}
                </div>
                <p className="text-xs text-[#8A8378] mt-1.5">
                  {t.history.costBasisNote}
                </p>
              </div>
            )}
          </Card>

          {/* Trade history table */}
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse min-w-[420px]">
              <thead>
                <tr className="bg-[#1F1A14] text-[#faedcd]">
                  {["วันที่", "หุ้น", "ซื้อ/ขาย", "จำนวน", "ราคา", "รวม"].map((h) => (
                    <th key={h} className="text-left px-3 py-2 text-xs uppercase tracking-wide font-bold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trades.map((t) => (
                  <tr key={t.id} className="border-b border-[#e9edc9] last:border-0">
                    <td className="px-3 py-2 text-xs text-[#8A8378]">
                      {new Date(t.createdAt).toLocaleDateString("th-TH", {
                        day:   "numeric",
                        month: "short",
                        year:  "numeric",
                      })}
                    </td>
                    <td className="px-3 py-2 font-bold">
                      <Link href={`/stock/${t.ticker}`} className="hover:text-[#5B8A2A] transition-colors">
                        {t.ticker}
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className="px-1.5 py-0.5 text-xs font-bold"
                        style={{
                          background: t.side === "BUY" ? "#3FA34D22" : "#E5484D22",
                          color:      t.side === "BUY" ? "#3FA34D"   : "#E5484D",
                          border:     `1px solid ${t.side === "BUY" ? "#3FA34D" : "#E5484D"}`,
                        }}
                      >
                        {t.side}
                      </span>
                    </td>
                    <td className="px-3 py-2" style={{ fontFamily: "var(--font-mono)" }}>{t.shares}</td>
                    <td className="px-3 py-2" style={{ fontFamily: "var(--font-mono)" }}>${t.price.toFixed(2)}</td>
                    <td className="px-3 py-2 font-bold" style={{ fontFamily: "var(--font-mono)" }}>
                      ${t.total.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
