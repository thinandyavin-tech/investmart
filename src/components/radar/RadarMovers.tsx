"use client";

import { useState, useEffect, useCallback } from "react";
import { Link }             from "@/i18n/navigation";
import dynamic              from "next/dynamic";
import { AskMartinButton } from "@/components/ai/AskMartinButton";

import { useI18n } from "@/lib/i18n";
import type { Mover, MoversCache } from "@/app/api/radar/movers/route";

const TradingViewHotlists = dynamic(
  () => import("@/components/tradingview/TradingViewHotlists").then(m => m.TradingViewHotlists),
  { ssr: false },
);

// ── Types ──────────────────────────────────────────────────────────────────────

interface MoversResponse extends Partial<MoversCache> {
  building?: boolean;
  stale?:    boolean;
  error?:    string;
  // quotedAt and enriched are now part of MoversCache
}

type Tab = "gainers" | "losers" | "actives";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtPct(v: number): string {
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
}

function fmtPrice(v: number): string {
  if (v >= 1000) return `$${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  return `$${v.toFixed(2)}`;
}

function fmtAsOf(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit",
    timeZone: "America/New_York",
    hour12: false,
  }) + " ET";
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric",
    timeZone: "America/New_York",
  });
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonRows() {
  return (
    <div className="divide-y divide-[#e9edc9]" aria-hidden="true">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2.5">
          <div className="w-16 h-3 skeleton rounded" />
          <div className="flex-1 h-3 skeleton rounded" />
          <div className="w-16 h-3 skeleton rounded" />
          <div className="w-12 h-3 skeleton rounded" />
        </div>
      ))}
    </div>
  );
}

// ── Mover row ────────────────────────────────────────────────────────────────

function MoverRow({ m, rank }: { m: Mover; rank: number }) {
  const up    = m.changesPercentage >= 0;
  const color = up ? "#16A34A" : "#DC2626";

  return (
    <div className="flex items-center gap-2 px-3 py-2 hover:bg-[#e9edc9] transition-colors">
      {/* Rank */}
      <span
        className="w-5 text-[10px] text-[#8A8378] text-right flex-shrink-0"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        {rank}
      </span>

      {/* Ticker + name */}
      <div className="flex-1 min-w-0">
        <Link
          href={`/stock/${m.symbol}`}
          className="text-xs font-bold text-[#5B8A2A] hover:underline"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          {m.symbol}
        </Link>
        <p className="text-[10px] text-[#8A8378] truncate">{m.name}</p>
      </div>

      {/* Price */}
      <span
        className="text-xs font-bold text-[#1F1A14] w-16 text-right flex-shrink-0"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        {fmtPrice(m.price)}
      </span>

      {/* % change */}
      <span
        className="text-xs font-bold w-16 text-right flex-shrink-0"
        style={{ fontFamily: "var(--font-mono)", color }}
      >
        {fmtPct(m.changesPercentage)}
      </span>

      {/* Ask Martin */}
      <AskMartinButton
        q={`Tell me about ${m.symbol} — why is it moving today?`}
        className="text-[10px] text-violet-500 hover:text-violet-700 flex-shrink-0 hidden sm:block"
        aria-label={`Ask Martin about ${m.symbol}`}
      >
        ✦
      </AskMartinButton>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

const TAB_LABELS: Record<Tab, string> = {
  gainers: "Top Gainers",
  losers:  "Top Losers",
  actives: "Most Active",
};

const TAB_COLORS: Record<Tab, string> = {
  gainers: "#16A34A",
  losers:  "#DC2626",
  actives: "#8B5CF6",
};

export function RadarMovers() {
  const { t, lang } = useI18n();
  const [data,     setData]     = useState<MoversResponse | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [tab,      setTab]      = useState<Tab>("gainers");
  const [refreshing, setRefreshing] = useState(false);

  const fetchMovers = useCallback(async (force = false) => {
    setError(null);
    try {
      const url  = force ? "/api/radar/movers?force=1" : "/api/radar/movers";
      const res  = await fetch(url);
      if (!res.ok) { setError(t.errors.loadFailed); return; }
      const json = (await res.json()) as MoversResponse;
      if (json.error && !json.gainers?.length) { setError(json.error); return; }
      setData(json);
    } catch {
      setError(t.errors.noConnection);
    } finally {
      setLoading(false);
    }
  }, [t.errors.loadFailed, t.errors.noConnection]);

  useEffect(() => { void fetchMovers(); }, [fetchMovers]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchMovers(true);
    setRefreshing(false);
  };

  const rows: Mover[] = (tab === "gainers" ? data?.gainers : tab === "losers" ? data?.losers : data?.actives) ?? [];
  const hasData       = rows.length > 0;
  const building      = data?.building === true || (!loading && !hasData && !error);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-[#ccd5ae] bg-[#fefae0]/90 px-4 py-3">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between gap-3 mb-2.5">
            <div>
              <h1 className="text-xs font-bold uppercase tracking-widest text-[#1F1A14]">
                📡 Radar — Market Movers
              </h1>
              <p className="text-[10px] text-[#8A8378] mt-0.5">
                {loading
                  ? t.common.loading
                  : building
                  ? "Fetching from FMP…"
                  : data?.stale && data?.error
                  ? `Stale · data as of ${data?.enriched ? fmtAsOf(data.quotedAt) : fmtDate(data.updatedAt)} · refresh failed`
                  : data?.stale
                  ? `Stale · data as of ${data?.enriched ? fmtAsOf(data.quotedAt) : fmtDate(data.updatedAt)}`
                  : data?.enriched
                  ? `Live quotes as of ${fmtAsOf(data.quotedAt)} · matches stock page`
                  : `FMP snapshot ${fmtDate(data?.updatedAt)} · prices differ from stock page`}
              </p>
            </div>
            <button
              onClick={() => void handleRefresh()}
              disabled={refreshing || loading}
              className="text-xs font-semibold px-3 py-1.5 border border-[#D0C8B8] text-[#5A4E42] hover:border-[#1F1A14] hover:text-[#1F1A14] disabled:opacity-40 transition-colors"
              aria-label="Refresh"
            >
              {refreshing ? "⟳…" : "⟳ Refresh"}
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1.5" role="tablist">
            {(["gainers", "losers", "actives"] as Tab[]).map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={`text-xs font-semibold px-3 py-1.5 border transition-colors ${
                  tab === t
                    ? "border-[#1F1A14] bg-[#1F1A14] text-white"
                    : "border-[#D0C8B8] text-[#5A4E42] hover:border-[#1F1A14] bg-transparent"
                }`}
              >
                <span style={{ color: tab === t ? "white" : TAB_COLORS[t] }}>
                  {t === "gainers" ? "▲" : t === "losers" ? "▼" : "⚡"}
                </span>{" "}
                {TAB_LABELS[t]}
                {!loading && hasData && (
                  <span className="ml-1 opacity-60 font-normal text-[10px]">
                    {(t === "gainers" ? data?.gainers : t === "losers" ? data?.losers : data?.actives)?.length ?? 0}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto">

          {/* Disclaimer */}
          <div className="px-3 py-2 bg-[#e9edc9] border-b border-[#e9edc9]">
            <p className="text-[10px] text-[#8A8378]">
              {data?.enriched
                ? "Movers identified by FMP · prices from Finnhub (same as stock page)"
                : "FMP daily snapshot · prices may differ from stock page"
              }
              {" · "}Volatile small-caps — observation only, not a recommendation ·{" "}
              click ticker to open stock page
            </p>
          </div>

          {/* Column headers */}
          {hasData && (
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[#e9edc9] bg-[#fefae0]">
              <span className="w-5" />
              <span className="flex-1 text-[10px] font-bold uppercase tracking-wide text-[#8A8378]">Ticker / Name</span>
              <span className="w-16 text-right text-[10px] font-bold uppercase tracking-wide text-[#8A8378]">Price</span>
              <span className="w-16 text-right text-[10px] font-bold uppercase tracking-wide text-[#8A8378]">Change</span>
              <span className="w-4 hidden sm:block" />
            </div>
          )}

          {/* Loading */}
          {loading && <SkeletonRows />}

          {/* Stale warning banner */}
          {!loading && !error && data?.stale && data?.error && (
            <div className="px-3 py-2 bg-amber-50 border-b border-amber-200 flex items-center justify-between gap-2">
              <p className="text-[10px] text-amber-800 flex-1">{data.error}</p>
              <button
                onClick={() => void handleRefresh()}
                className="text-[10px] font-bold text-amber-700 hover:underline flex-shrink-0"
              >
                Retry
              </button>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="flex flex-col items-center py-16 gap-3 text-center px-4">
              <p className="text-sm text-[#1F1A14]">{t.errors.loadFailed}</p>
              <p className="text-xs text-[#8A8378]">{error}</p>
              <button
                onClick={() => void fetchMovers()}
                className="text-xs font-bold text-[#5B8A2A] hover:underline"
              >
                {t.errors.retry}
              </button>
            </div>
          )}

          {/* FMP unavailable — show TradingView Hotlists as real-data fallback */}
          {!loading && !error && building && (
            <div className="px-3 py-3">
              <p className="text-[10px] text-[#8A8378] mb-2">
                FMP data unavailable · showing live TradingView hotlists instead
              </p>
              <TradingViewHotlists height={420} locale={lang} />
            </div>
          )}

          {/* Results */}
          {!loading && !error && hasData && (
            <div className="divide-y divide-[#e9edc9]">
              {rows.map((m, i) => (
                <MoverRow key={m.symbol} m={m} rank={i + 1} />
              ))}
            </div>
          )}

          {hasData && (
            <p className="text-[10px] text-[#8A8378] text-center py-3 px-4">
              {data?.enriched
                ? `Movers: FMP · Prices: Finnhub (as of ${fmtAsOf(data.quotedAt)}) · Not investment advice`
                : `FMP daily snapshot (${fmtDate(data?.updatedAt)}) · Prices may differ from stock page · Not investment advice`
              }
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
