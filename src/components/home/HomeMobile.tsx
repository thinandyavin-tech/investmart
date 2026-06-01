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
import { BRAND_NAME_UPPER } from "@/lib/brand";
import { SearchIcon } from "@/components/icons/SearchIcon";
import { NotificationBell } from "@/components/NotificationBell";


export function HomeMobile() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen]   = useState(false);
  const [noticeVisible, setNoticeVisible] = useState(true);

  const initial     = user ? ((user.name?.[0] ?? "D").toUpperCase()) : "N";
  const displayName = user
    ? `${user.username || user.name} #${user.id.slice(-4)}`
    : "เด็กฝึกหุ้น #----";
  const balance = user?.cashThb ?? 1_250_000;

  return (
    <div className="flex flex-col min-h-screen bg-[#FBF7ED]">
      {/* Sticky top bar container (header + dropdown both live here for correct overlay) */}
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

      <ProfileSection
        loading={loading}
        initial={initial}
        displayName={displayName}
        balance={balance}
        loggedIn={user !== null}
        noticeVisible={noticeVisible}
        onDismissNotice={() => setNoticeVisible(false)}
        onLogin={() => router.push("/signin")}
      />

      <RadarPickCard />

      <div className="mx-3 mb-3">
        <InfographicsSection />
      </div>

      <div className="mx-3 mb-3">
        <HotNewsSection />
      </div>

      <div className="border-t border-[#E8E2D4] mt-1">
        <FeedSection showComposer={false} compact />
      </div>
    </div>
  );
}

interface ProfileSectionProps {
  loading:         boolean;
  initial:         string;
  displayName:     string;
  balance:         number;
  loggedIn:        boolean;
  noticeVisible:   boolean;
  onDismissNotice: () => void;
  onLogin:         () => void;
}

function ProfileSection({
  loading,
  initial,
  displayName,
  balance,
  loggedIn,
  noticeVisible,
  onDismissNotice,
  onLogin,
}: ProfileSectionProps) {
  return (
    <div className="px-4 pt-5 pb-4 flex flex-col items-center gap-2.5">
      <div className="w-20 h-20 rounded-full border-2 border-dashed border-[#5B8A2A] p-1 flex-shrink-0">
        <div
          className="w-full h-full rounded-full flex items-center justify-center text-white text-2xl font-bold"
          style={{ background: "#5B8A2A" }}
          aria-hidden="true"
        >
          {loading ? "…" : initial}
        </div>
      </div>

      <div className="text-center">
        <p className="text-sm font-bold">{loading ? "กำลังโหลด..." : displayName}</p>
        <p className="text-[10px] text-[#8A8378] mt-0.5">
          พอร์ตหุ้นอเมริกา ·{" "}
          <span style={{ fontFamily: "var(--font-mono)" }}>
            {loading ? "..." : balance.toLocaleString("th-TH")} ฿
          </span>
        </p>
      </div>

      {!loggedIn && !loading && (
        <button
          className="w-full py-2.5 text-xs font-bold text-white bg-[#1F1A14] border border-[#1F1A14] uppercase tracking-wide shadow-offset-lime"
          onClick={onLogin}
        >
          ▶ เข้าสู่ระบบ
        </button>
      )}

      {!loggedIn && !loading && noticeVisible && (
        <div className="w-full flex items-center justify-between px-3 py-2 text-[10px] border border-[#E8E2D4] bg-[#F3EDE0]">
          <span className="text-[#8A8378]">
            <span className="font-bold text-[#1F1A14]">ใหม่!</span>{" "}
            คุณกำลังใช้งานไอดีแบบไม่ได้ล็อกอินอยู่! ▾
          </span>
          <button
            className="ml-2 text-[#8A8378] font-bold leading-none hover:text-[#1F1A14] flex-shrink-0"
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


function RadarScanIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
}
