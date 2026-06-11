"use client";

import { useState, useEffect } from "react";
import { Link } from "@/i18n/navigation";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/userContext";
import { BrandPillDropdown } from "@/components/BrandPillDropdown";
import { RadarPickCard } from "@/components/home/RadarPickCard";
import { FeedSection } from "@/components/social/FeedSection";
import { HotNewsSection } from "@/components/home/HotNewsSection";
import { InfographicsSection } from "@/components/home/InfographicsSection";
import { DailyDigestCard } from "@/components/home/DailyDigestCard";
import { PortfolioHero } from "@/components/home/PortfolioHero";
import { EarningsCalendarCard } from "@/components/home/EarningsCalendarCard";
import { MarketStatusBanner } from "@/components/market/MarketStatusBanner";
import { TradingViewTickerTape } from "@/components/tradingview/TradingViewTickerTape";
import { BRAND_NAME_UPPER } from "@/lib/brand";
import { SearchIcon } from "@/components/icons/SearchIcon";
import { NotificationBell } from "@/components/NotificationBell";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useI18n } from "@/lib/i18n";

export function HomeMobile() {
  const { user, loading } = useUser();
  const { t, lang } = useI18n();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen]   = useState(false);
  const [noticeVisible, setNoticeVisible] = useState(true);
  const [holdingsOpen, setHoldingsOpen]   = useState(false);

  const QUICK_ACTIONS = [
    { href: "/radar",       label: t.home.quickActions.radar,       icon: "📡" },
    { href: "/screener",    label: t.home.quickActions.screener,     icon: "🔍" },
    { href: "/market",      label: t.home.quickActions.market,       icon: "📈" },
    { href: "/exchange",    label: t.home.quickActions.exchange,     icon: "💱" },
    { href: "/history",     label: t.home.quickActions.history,      icon: "📋" },
    { href: "/leaderboard", label: t.home.quickActions.leaderboard,  icon: "🏆" },
    { href: "/watchlist",   label: t.home.quickActions.watchlist,    icon: "👁️" },
    { href: "/mail",        label: t.home.quickActions.mail,         icon: "✉️" },
  ];

  const initial     = user ? ((user.name?.[0] ?? "D").toUpperCase()) : "N";
  const displayName = user
    ? `${user.username || user.name} #${user.id.slice(-4)}`
    : "InvestMart #----";

  return (
    <div className="flex flex-col min-h-screen relative">
      {/* Sticky header */}
      <div className="sticky top-0 z-30 relative">
        <header className="bg-white/75 backdrop-blur-md border-b border-white/40 flex items-center justify-between px-4 py-2.5">
          <Link
            href="/radar"
            className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            aria-label="เปิดเรดาร์แสกนหุ้น"
          >
            <RadarScanIcon />
          </Link>

          <button
            className="flex items-center gap-1.5 px-4 py-1.5 bg-[#0F172A] text-white text-xs font-bold tracking-widest rounded-full"
            onClick={() => setDropdownOpen((v) => !v)}
            aria-expanded={dropdownOpen}
            aria-haspopup="menu"
          >
            {BRAND_NAME_UPPER}
            <span className="text-xs leading-none">{dropdownOpen ? "▴" : "▾"}</span>
          </button>

          <div className="flex items-center gap-1">
            <Link
              href="/search"
              className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              aria-label={t.nav.search}
            >
              <SearchIcon size={18} />
            </Link>
            <NotificationBell size="sm" />
            <LanguageToggle size="sm" />
          </div>
        </header>

        {dropdownOpen && (
          <>
            <div
              className="fixed inset-0 z-20"
              onClick={() => setDropdownOpen(false)}
              aria-hidden="true"
            />
            <div className="absolute inset-x-0 top-full flex justify-center pt-1 px-6 z-30 pointer-events-none">
              <div className="pointer-events-auto">
                <BrandPillDropdown onClose={() => setDropdownOpen(false)} />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Market status */}
      <TradingViewTickerTape className="border-b border-white/20" locale={lang} />
      <MarketStatusBanner />

      {/* Profile + balance */}
      <ProfileSection
        loading={loading}
        initial={initial}
        displayName={displayName}
        cashThb={user?.cashThb ?? 1_250_000}
        cashUsd={user?.cashUsd ?? 0}
        holdings={user?.holdings ?? []}
        loggedIn={user !== null && !user.isDemo}
        noticeVisible={noticeVisible}
        onDismissNotice={() => setNoticeVisible(false)}
        onLogin={() => router.push("/signin")}
        holdingsOpen={holdingsOpen}
        onToggleHoldings={() => setHoldingsOpen((v) => !v)}
      />

      {/* Quick action links */}
      <div
        className="flex gap-2 px-4 pb-3 overflow-x-auto"
        style={{ scrollbarWidth: "none" }}
        aria-label="เมนูด่วน"
      >
        {QUICK_ACTIONS.map(({ href, label, icon }) => (
          <Link
            key={href}
            href={href}
            className="bg-white/50 backdrop-blur-md border border-white/30 rounded-full px-3 py-1.5 text-xs text-slate-700 hover:border-slate-400 whitespace-nowrap flex-shrink-0 flex flex-col items-center gap-0.5 transition-colors"
            style={{ minWidth: "56px" }}
          >
            <span className="text-base leading-none" aria-hidden="true">{icon}</span>
            <span className="text-xs font-medium whitespace-nowrap leading-tight">{label}</span>
          </Link>
        ))}
      </div>

      {/* Portfolio hero — compact mode on mobile */}
      <div className="mx-3 mb-3">
        <PortfolioHero compact />
      </div>

      <DailyDigestCard />
      <TrendingTickerBar />
      <div className="mx-3 mb-3">
        <EarningsCalendarCard />
      </div>
      <RadarPickCard />

      <div className="mx-3 mb-3">
        <InfographicsSection />
      </div>

      <div className="mx-3 mb-3">
        <HotNewsSection />
      </div>

      {/* Feed with composer enabled */}
      <div className="border-t border-slate-200 mt-1">
        <FeedSection showComposer compact />
      </div>
    </div>
  );
}

// ── Trending Ticker Bar ────────────────────────────────────────────────────────

interface TickerCount { ticker: string; count: number; }

function TrendingTickerBar() {
  const [tickers, setTickers] = useState<TickerCount[]>([]);
  const { t } = useI18n();

  useEffect(() => {
    fetch("/api/discover")
      .then((r) => r.json() as Promise<{ trendingTickers?: TickerCount[] }>)
      .then((d) => setTickers(d.trendingTickers?.slice(0, 8) ?? []))
      .catch(() => {});
  }, []);

  if (tickers.length === 0) return null;

  return (
    <div className="mx-3 mb-3">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
        {t.home.trending}
      </p>
      <div className="flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {tickers.map(({ ticker, count }) => (
          <Link
            key={ticker}
            href={`/stock/${ticker}`}
            className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 bg-white/50 backdrop-blur-md border border-white/30 rounded-full text-xs font-bold text-slate-700 hover:border-slate-400 transition-colors"
          >
            <span className="text-green-600">${ticker}</span>
            <span className="text-slate-400 font-normal">{count}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────

interface Holding {
  ticker:  string;
  shares:  number;
  avgCost: number;
}

interface ProfileSectionProps {
  loading:           boolean;
  initial:           string;
  displayName:       string;
  cashThb:           number;
  cashUsd:           number;
  holdings:          Holding[];
  loggedIn:          boolean;
  noticeVisible:     boolean;
  onDismissNotice:   () => void;
  onLogin:           () => void;
  holdingsOpen:      boolean;
  onToggleHoldings:  () => void;
}

function ProfileSection({
  loading, initial, displayName, cashThb, cashUsd, holdings,
  loggedIn, noticeVisible, onDismissNotice, onLogin,
  holdingsOpen, onToggleHoldings,
}: ProfileSectionProps) {
  const { t } = useI18n();
  return (
    <div className="px-4 pt-4 pb-3 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-full border-2 border-green-500 p-0.5 flex-shrink-0">
          <div
            className="w-full h-full rounded-full flex items-center justify-center text-white text-xl font-bold"
            style={{ background: "#16A34A" }}
            aria-hidden="true"
          >
            {loading ? "…" : initial}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold truncate text-slate-900">
            {loading ? t.common.loading : displayName}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">{t.home.simulatedPortfolio}</p>
        </div>

        {loggedIn && (
          <Link
            href="/u/me"
            className="flex-shrink-0 text-xs font-semibold border border-slate-200 rounded-lg px-2 py-1 text-slate-500 hover:border-slate-400 hover:text-slate-900 transition-colors"
          >
            {t.nav.profile}
          </Link>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <StatChip label={t.home.cashThb} value={loading ? "..." : `฿${(cashThb / 1000).toFixed(0)}K`} mono />
        <StatChip label={t.home.cashUsd} value={loading ? "..." : `$${cashUsd.toFixed(0)}`} mono />
        <button
          onClick={onToggleHoldings}
          className="flex flex-col items-center justify-center p-2 bg-white/50 backdrop-blur-md border border-white/30 rounded-xl text-center hover:border-slate-400 transition-colors"
          aria-expanded={holdingsOpen}
        >
          <span className="text-xs text-slate-500 uppercase tracking-wide leading-tight">{t.home.holdings}</span>
          <span className="text-xs font-bold text-slate-900" style={{ fontFamily: "var(--font-mono)" }}>
            {loading ? "..." : holdings.length}
          </span>
          <span className="text-xs text-slate-400">{holdingsOpen ? "▴" : "▾"}</span>
        </button>
      </div>

      {holdingsOpen && !loading && (
        <div className="bg-white/50 backdrop-blur-md border border-white/30 rounded-xl overflow-hidden">
          {holdings.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-3">{t.home.noHoldings}</p>
          ) : (
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100">
                  {[t.stock.price, t.profile.holdings, t.trade.avgCost].map((h, i) => (
                    <th key={i} className="text-left px-2 py-1.5 text-xs text-slate-500 font-semibold uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {holdings.map((h) => (
                  <tr key={h.ticker} className="border-b border-slate-100 last:border-0">
                    <td className="px-2 py-1.5 font-bold text-slate-900">
                      <Link href={`/stock/${h.ticker}`} className="hover:underline">{h.ticker}</Link>
                    </td>
                    <td className="px-2 py-1.5 text-slate-700" style={{ fontFamily: "var(--font-mono)" }}>{h.shares}</td>
                    <td className="px-2 py-1.5 text-slate-700" style={{ fontFamily: "var(--font-mono)" }}>${h.avgCost.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {!loggedIn && !loading && (
        <button
          className="w-full py-2.5 text-xs font-semibold text-white bg-[#16A34A] hover:bg-[#15803D] rounded-lg transition-colors"
          onClick={onLogin}
        >
          {t.home.loginCta}
        </button>
      )}

      {!loggedIn && !loading && noticeVisible && (
        <div className="flex items-center justify-between px-3 py-2 text-xs border border-slate-200 bg-white rounded-xl">
          <span className="text-slate-500">{t.home.newUserNotice}</span>
          <button
            className="ml-2 text-slate-400 font-bold hover:text-slate-700 flex-shrink-0"
            onClick={onDismissNotice}
            aria-label={t.common.close}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

function StatChip({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center p-2 bg-white/50 backdrop-blur-md border border-white/30 rounded-xl text-center">
      <span className="text-xs text-slate-500 uppercase tracking-wide leading-tight">{label}</span>
      <span className="text-xs font-bold mt-0.5 text-slate-900" style={{ fontFamily: mono ? "var(--font-mono)" : undefined }}>
        {value}
      </span>
    </div>
  );
}

function RadarScanIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
}
