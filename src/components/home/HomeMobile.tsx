"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/userContext";
import { BrandPillDropdown } from "@/components/BrandPillDropdown";
import { RadarPickCard } from "@/components/home/RadarPickCard";
import { FeedSection } from "@/components/social/FeedSection";
import { HotNewsSection } from "@/components/home/HotNewsSection";
import { InfographicsSection } from "@/components/home/InfographicsSection";
import { MarketStatusBanner } from "@/components/market/MarketStatusBanner";
import { BRAND_NAME_UPPER } from "@/lib/brand";
import { SearchIcon } from "@/components/icons/SearchIcon";
import { NotificationBell } from "@/components/NotificationBell";

const QUICK_ACTIONS = [
  { href: "/radar",       label: "เรดาร์",     icon: "📡" },
  { href: "/screener",    label: "สกรีนเนอร์", icon: "🔍" },
  { href: "/market",      label: "ตลาด",       icon: "📈" },
  { href: "/exchange",    label: "แลกเงิน",    icon: "💱" },
  { href: "/history",     label: "ประวัติ",    icon: "📋" },
  { href: "/leaderboard", label: "อันดับ",      icon: "🏆" },
] as const;

export function HomeMobile() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen]     = useState(false);
  const [noticeVisible, setNoticeVisible]   = useState(true);
  const [holdingsOpen, setHoldingsOpen]     = useState(false);

  const initial     = user ? ((user.name?.[0] ?? "D").toUpperCase()) : "N";
  const displayName = user
    ? `${user.username || user.name} #${user.id.slice(-4)}`
    : "เด็กฝึกหุ้น #----";

  return (
    <div className="flex flex-col min-h-screen bg-[#FBF7ED]">
      {/* Sticky header */}
      <div className="sticky top-0 z-30 relative">
        <header className="bg-[#FBF7ED] border-b border-[#E8E2D4] flex items-center justify-between px-4 py-2.5">
          <Link
            href="/radar"
            className="w-9 h-9 flex items-center justify-center border border-[#1F1A14] rounded-full bg-[#F3EDE0] hover:bg-[#1F1A14] hover:text-white transition-colors"
            aria-label="เปิดเรดาร์แสกนหุ้น"
          >
            <RadarScanIcon />
          </Link>

          <button
            className="flex items-center gap-1.5 px-4 py-1.5 border border-[#1F1A14] bg-[#1F1A14] text-white text-xs font-bold tracking-widest rounded-full"
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
              className="w-9 h-9 flex items-center justify-center border border-[#1F1A14] rounded-full bg-[#F3EDE0] hover:bg-[#1F1A14] hover:text-white transition-colors"
              aria-label="ค้นหาหุ้น"
            >
              <SearchIcon size={18} />
            </Link>
            <NotificationBell size="sm" />
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
      <MarketStatusBanner />

      {/* Profile + balance */}
      <ProfileSection
        loading={loading}
        initial={initial}
        displayName={displayName}
        cashThb={user?.cashThb ?? 1_250_000}
        cashUsd={user?.cashUsd ?? 0}
        holdings={user?.holdings ?? []}
        loggedIn={user !== null}
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
            className="flex-shrink-0 flex flex-col items-center gap-0.5 px-3 py-2 border border-[#E8E2D4] bg-white text-center hover:border-[#1F1A14] transition-colors"
            style={{ minWidth: "56px" }}
          >
            <span className="text-base leading-none" aria-hidden="true">{icon}</span>
            <span className="text-[8px] font-bold text-[#1F1A14] whitespace-nowrap">{label}</span>
          </Link>
        ))}
      </div>

      <RadarPickCard />

      <div className="mx-3 mb-3">
        <InfographicsSection />
      </div>

      <div className="mx-3 mb-3">
        <HotNewsSection />
      </div>

      {/* Feed with composer enabled */}
      <div className="border-t border-[#E8E2D4] mt-1">
        <FeedSection showComposer compact />
      </div>
    </div>
  );
}

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
        <div className="w-14 h-14 rounded-full border-2 border-dashed border-[#5B8A2A] p-0.5 flex-shrink-0">
          <div
            className="w-full h-full rounded-full flex items-center justify-center text-white text-xl font-bold"
            style={{ background: "#5B8A2A" }}
            aria-hidden="true"
          >
            {loading ? "…" : initial}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold truncate">{loading ? "กำลังโหลด..." : displayName}</p>
          <p className="text-[9px] text-[#8A8378] mt-0.5">พอร์ตหุ้นอเมริกา (จำลอง)</p>
        </div>

        {loggedIn && (
          <Link
            href="/u/me"
            className="flex-shrink-0 text-[9px] font-bold border border-[#E8E2D4] px-2 py-1 text-[#8A8378] hover:border-[#1F1A14] hover:text-[#1F1A14] transition-colors"
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
          className="flex flex-col items-center justify-center p-2 border border-[#E8E2D4] bg-white text-center hover:border-[#1F1A14] transition-colors"
          aria-expanded={holdingsOpen}
        >
          <span className="text-[9px] text-[#8A8378] uppercase tracking-wide leading-tight">ถือหุ้น</span>
          <span className="text-xs font-bold" style={{ fontFamily: "var(--font-mono)" }}>
            {loading ? "..." : holdings.length}
          </span>
          <span className="text-[8px] text-[#8A8378]">{holdingsOpen ? "▴" : "▾"}</span>
        </button>
      </div>

      {/* Collapsible holdings list */}
      {holdingsOpen && !loading && (
        <div className="border border-[#E8E2D4] bg-white">
          {holdings.length === 0 ? (
            <p className="text-[10px] text-[#8A8378] text-center py-3">ยังไม่มีหุ้นในพอร์ต</p>
          ) : (
            <table className="w-full text-[10px] border-collapse">
              <thead>
                <tr className="border-b border-[#E8E2D4]">
                  {["หุ้น", "หุ้น", "ต้นทุน"].map((h, i) => (
                    <th key={i} className="text-left px-2 py-1.5 text-[8px] text-[#8A8378] font-bold uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {holdings.map((h) => (
                  <tr key={h.ticker} className="border-b border-[#E8E2D4] last:border-0">
                    <td className="px-2 py-1.5 font-bold">
                      <Link href={`/stock/${h.ticker}`} className="hover:underline">{h.ticker}</Link>
                    </td>
                    <td className="px-2 py-1.5" style={{ fontFamily: "var(--font-mono)" }}>{h.shares}</td>
                    <td className="px-2 py-1.5" style={{ fontFamily: "var(--font-mono)" }}>${h.avgCost.toFixed(2)}</td>
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
          className="w-full py-2.5 text-xs font-bold text-white bg-[#1F1A14] border border-[#1F1A14] uppercase tracking-wide"
          style={{ boxShadow: "2px 2px 0 #5B8A2A" }}
          onClick={onLogin}
        >
          ▶ เข้าสู่ระบบเพื่อเริ่มเล่น simulator
        </button>
      )}

      {!loggedIn && !loading && noticeVisible && (
        <div className="flex items-center justify-between px-3 py-2 text-[10px] border border-[#E8E2D4] bg-[#F3EDE0]">
          <span className="text-[#8A8378]">
            <span className="font-bold text-[#1F1A14]">ใหม่!</span>{" "}
            คุณกำลังใช้งานไอดีแบบไม่ได้ล็อกอินอยู่
          </span>
          <button
            className="ml-2 text-[#8A8378] font-bold hover:text-[#1F1A14] flex-shrink-0"
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
    <div className="flex flex-col items-center justify-center p-2 border border-[#E8E2D4] bg-white text-center">
      <span className="text-[9px] text-[#8A8378] uppercase tracking-wide leading-tight">{label}</span>
      <span className="text-xs font-bold mt-0.5" style={{ fontFamily: mono ? "var(--font-mono)" : undefined }}>
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
