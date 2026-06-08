"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/userContext";
import { BrandPillDropdown } from "@/components/BrandPillDropdown";
import { RadarPickCard } from "@/components/home/RadarPickCard";
import { FeedSection } from "@/components/social/FeedSection";
import { HotNewsSection } from "@/components/home/HotNewsSection";
import { InfographicsSection } from "@/components/home/InfographicsSection";
import { DailyDigestCard } from "@/components/home/DailyDigestCard";
import { EarningsCalendarCard } from "@/components/home/EarningsCalendarCard";
import { MarketStatusBanner } from "@/components/market/MarketStatusBanner";
import { TradingViewTickerTape } from "@/components/tradingview/TradingViewTickerTape";
import { BRAND_NAME_UPPER } from "@/lib/brand";
import { SearchIcon } from "@/components/icons/SearchIcon";
import { NotificationBell } from "@/components/NotificationBell";
import { ThemeToggle } from "@/components/ThemeToggle";

const QUICK_ACTIONS = [
  { href: "/radar",       label: "เรดาร์",     icon: "📡" },
  { href: "/screener",    label: "สกรีนเนอร์", icon: "🔍" },
  { href: "/market",      label: "ตลาด",       icon: "📈" },
  { href: "/exchange",    label: "แลกเงิน",    icon: "💱" },
  { href: "/history",     label: "ประวัติ",    icon: "📋" },
  { href: "/leaderboard", label: "อันดับ",      icon: "🏆" },
  { href: "/watchlist",   label: "Watchlist",  icon: "👁️" },
  { href: "/mail",        label: "จดหมาย",    icon: "✉️" },
] as const;

export function HomeMobile() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen]   = useState(false);
  const [noticeVisible, setNoticeVisible] = useState(true);
  const [holdingsOpen, setHoldingsOpen]   = useState(false);

  const initial     = user ? ((user.name?.[0] ?? "D").toUpperCase()) : "N";
  const displayName = user
    ? `${user.username || user.name} #${user.id.slice(-4)}`
    : "เด็กฝึกหุ้น #----";

  return (
    <div className="flex flex-col min-h-screen relative">
      {/* Sticky header */}
      <div className="sticky top-0 z-30 relative">
        <header className="bg-white/75 dark:bg-slate-900/70 backdrop-blur-md border-b border-white/40 dark:border-slate-700/60 flex items-center justify-between px-4 py-2.5">
          <Link
            href="/radar"
            className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
            aria-label="เปิดเรดาร์แสกนหุ้น"
          >
            <RadarScanIcon />
          </Link>

          <button
            className="flex items-center gap-1.5 px-4 py-1.5 bg-[#0F172A] dark:bg-slate-700 text-white text-xs font-bold tracking-widest rounded-full"
            onClick={() => setDropdownOpen((v) => !v)}
            aria-expanded={dropdownOpen}
            aria-haspopup="menu"
          >
            {BRAND_NAME_UPPER}
            <span className="text-[10px] leading-none">{dropdownOpen ? "▴" : "▾"}</span>
          </button>

          <div className="flex items-center gap-1">
            <Link
              href="/search"
              className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
              aria-label="ค้นหาหุ้น"
            >
              <SearchIcon size={18} />
            </Link>
            <NotificationBell size="sm" />
            <ThemeToggle size="sm" />
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
      <TradingViewTickerTape className="border-b border-white/20" />
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
            className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border border-white/30 dark:border-slate-700/40 rounded-full px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-500 whitespace-nowrap flex-shrink-0 flex flex-col items-center gap-0.5 transition-colors"
            style={{ minWidth: "56px" }}
          >
            <span className="text-base leading-none" aria-hidden="true">{icon}</span>
            <span className="text-[10px] font-semibold whitespace-nowrap">{label}</span>
          </Link>
        ))}
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
      <div className="border-t border-slate-200 dark:border-slate-700 mt-1">
        <FeedSection showComposer compact />
      </div>
    </div>
  );
}

// ── Trending Ticker Bar ────────────────────────────────────────────────────────

interface TickerCount { ticker: string; count: number; }

function TrendingTickerBar() {
  const [tickers, setTickers] = useState<TickerCount[]>([]);

  useEffect(() => {
    fetch("/api/discover")
      .then((r) => r.json() as Promise<{ trendingTickers?: TickerCount[] }>)
      .then((d) => setTickers(d.trendingTickers?.slice(0, 8) ?? []))
      .catch(() => {});
  }, []);

  if (tickers.length === 0) return null;

  return (
    <div className="mx-3 mb-3">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
        หุ้นถูกพูดถึงมากสุด
      </p>
      <div className="flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {tickers.map(({ ticker, count }) => (
          <Link
            key={ticker}
            href={`/stock/${ticker}`}
            className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border border-white/30 dark:border-slate-700/40 rounded-full text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-500 transition-colors"
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
  return (
    <div className="px-4 pt-4 pb-3 flex flex-col gap-3">
      {/* Avatar + name row */}
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
          <p className="text-sm font-bold truncate text-slate-900 dark:text-slate-100">{loading ? "กำลังโหลด..." : displayName}</p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">พอร์ตหุ้นอเมริกา (จำลอง)</p>
        </div>

        {loggedIn && (
          <Link
            href="/u/me"
            className="flex-shrink-0 text-[10px] font-semibold border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-slate-500 dark:text-slate-400 hover:border-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
          >
            โปรไฟล์
          </Link>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        <StatChip label="เงินสด (฿)" value={loading ? "..." : `฿${(cashThb / 1000).toFixed(0)}K`} mono />
        <StatChip label="เงินสด ($)" value={loading ? "..." : `$${cashUsd.toFixed(0)}`}         mono />
        <button
          onClick={onToggleHoldings}
          className="flex flex-col items-center justify-center p-2 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border border-white/30 dark:border-slate-700/40 rounded-xl text-center hover:border-slate-400 dark:hover:border-slate-500 transition-colors"
          aria-expanded={holdingsOpen}
        >
          <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide leading-tight">ถือหุ้น</span>
          <span className="text-xs font-bold text-slate-900 dark:text-slate-100" style={{ fontFamily: "var(--font-mono)" }}>
            {loading ? "..." : holdings.length}
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">{holdingsOpen ? "▴" : "▾"}</span>
        </button>
      </div>

      {/* Collapsible holdings list */}
      {holdingsOpen && !loading && (
        <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border border-white/30 dark:border-slate-700/40 rounded-xl overflow-hidden">
          {holdings.length === 0 ? (
            <p className="text-[10px] text-slate-500 dark:text-slate-400 text-center py-3">ยังไม่มีหุ้นในพอร์ต</p>
          ) : (
            <table className="w-full text-[10px] border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700">
                  {["หุ้น", "หุ้น", "ต้นทุน"].map((h, i) => (
                    <th key={i} className="text-left px-2 py-1.5 text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {holdings.map((h) => (
                  <tr key={h.ticker} className="border-b border-slate-100 dark:border-slate-700 last:border-0">
                    <td className="px-2 py-1.5 font-bold text-slate-900 dark:text-slate-100">
                      <Link href={`/stock/${h.ticker}`} className="hover:underline">{h.ticker}</Link>
                    </td>
                    <td className="px-2 py-1.5 text-slate-700 dark:text-slate-300" style={{ fontFamily: "var(--font-mono)" }}>{h.shares}</td>
                    <td className="px-2 py-1.5 text-slate-700 dark:text-slate-300" style={{ fontFamily: "var(--font-mono)" }}>${h.avgCost.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Login CTA */}
      {!loggedIn && !loading && (
        <button
          className="w-full py-2.5 text-xs font-semibold text-white bg-[#16A34A] hover:bg-[#15803D] rounded-lg transition-colors"
          onClick={onLogin}
        >
          ▶ เข้าสู่ระบบเพื่อเริ่มเล่น simulator
        </button>
      )}

      {!loggedIn && !loading && noticeVisible && (
        <div className="flex items-center justify-between px-3 py-2 text-[10px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl">
          <span className="text-slate-500 dark:text-slate-400">
            <span className="font-bold text-slate-900 dark:text-slate-100">ใหม่!</span>{" "}
            คุณกำลังใช้งานไอดีแบบไม่ได้ล็อกอินอยู่
          </span>
          <button
            className="ml-2 text-slate-400 font-bold hover:text-slate-700 dark:hover:text-slate-200 flex-shrink-0"
            onClick={onDismissNotice}
            aria-label="ปิดประกาศ"
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
    <div className="flex flex-col items-center justify-center p-2 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border border-white/30 dark:border-slate-700/40 rounded-xl text-center">
      <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide leading-tight">{label}</span>
      <span className="text-xs font-bold mt-0.5 text-slate-900 dark:text-slate-100" style={{ fontFamily: mono ? "var(--font-mono)" : undefined }}>
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
