"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

interface BrandPillDropdownProps {
  onClose: () => void;
}

interface DropdownItem {
  href:  string;
  label: string;
  icon:  ReactNode;
  soon?: boolean;
}

const ITEMS: DropdownItem[] = [
  { href: "/",         label: "หน้าหลัก",        icon: <HomeIcon /> },
  { href: "/market",   label: "ภาพรวมตลาด",       icon: <ChartIcon /> },
  { href: "/radar",    label: "เรดาร์แสกนหุ้น",  icon: <RadarIcon /> },
  { href: "/compose",  label: "โพส",               icon: <PencilIcon /> },
  { href: "/discover", label: "Discover",           icon: <DiscoverIcon />, soon: true },
  { href: "/watchlist", label: "Watchlist",          icon: <WatchlistIcon /> },
  { href: "/mail",      label: "จดหมาย",           icon: <MailIcon /> },
  { href: "/saved",    label: "หน้าบันทึกโพส",   icon: <BookmarkIcon /> },
  { href: "/profile",  label: "หน้าโปรไฟล์",     icon: <PersonIcon /> },
];

export function BrandPillDropdown({ onClose }: BrandPillDropdownProps) {
  const pathname = usePathname();

  return (
    <div
      className="w-56 bg-[#F3EDE0] rounded-xl overflow-hidden"
      style={{ boxShadow: "0 8px 32px rgba(31,26,20,0.20), 0 2px 8px rgba(31,26,20,0.10)" }}
      role="menu"
      aria-label="เมนูหลัก InvestMart"
    >
      {ITEMS.map(({ href, label, icon, soon }) => {
        if (soon) {
          return (
            <div
              key={href}
              className="flex items-center gap-3 px-4 py-3 opacity-50 cursor-not-allowed"
              role="menuitem"
              aria-disabled="true"
            >
              <span className="w-5 h-5 flex items-center justify-center text-[#8A8378] flex-shrink-0">
                {icon}
              </span>
              <span className="text-xs font-bold text-[#8A8378]">{label}</span>
              <span
                className="ml-auto text-[9px] px-1.5 py-0.5 font-bold rounded"
                style={{ background: "#FFD9E8", color: "#D6336C" }}
              >
                SOON
              </span>
            </div>
          );
        }
        const isActive = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            onClick={onClose}
            className={`flex items-center gap-3 px-4 py-3 transition-colors ${
              isActive
                ? "bg-[#1F1A14] text-white"
                : "text-[#1F1A14] hover:bg-[#F0E8D8]"
            }`}
            role="menuitem"
            aria-current={isActive ? "page" : undefined}
          >
            <span className={`w-5 h-5 flex items-center justify-center flex-shrink-0 ${isActive ? "text-white" : "text-[#1F1A14]"}`}>
              {icon}
            </span>
            <span className="text-xs font-bold">{label}</span>
          </Link>
        );
      })}
    </div>
  );
}

function ChartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}
function HomeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 12L12 3l9 9" /><path d="M5 10v11h5v-7h4v7h5V10" />
    </svg>
  );
}
function RadarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="2" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="10" />
    </svg>
  );
}
function DiscoverIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
    </svg>
  );
}
function PencilIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}
function BookmarkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}
function PersonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="7" r="4" /><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
    </svg>
  );
}
function WatchlistIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="4" width="20" height="16" rx="1" /><path d="M2 7l10 7 10-7" />
    </svg>
  );
}
