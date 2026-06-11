"use client";

import { Link } from "@/i18n/navigation";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";
import { RetroMenu } from "@/components/RetroMenu";
import { NotificationBell } from "@/components/NotificationBell";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useUser } from "@/lib/userContext";
import { useI18n } from "@/lib/i18n";

export function IconRail() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useUser();
  const { t } = useI18n();
  const pathname = usePathname();
  const isAdmin = user?.isAdmin === true;

  const icons = [
    { href: "/",           label: t.nav.home,        icon: <HomeIcon /> },
    { href: "/assets",     label: t.nav.assets,      icon: <PieIcon /> },
    { href: "/radar",      label: t.nav.radar,       icon: <RadarIcon /> },
    { href: "/news",       label: t.nav.news,        icon: <NewspaperIcon /> },
    { href: "/chat",       label: t.nav.chat,        icon: <ChatIcon /> },
    { href: "/profile",    label: t.nav.profile,     icon: <PersonIcon /> },
    { href: "/mail",       label: t.nav.mail,        icon: <MailIcon /> },
    { href: "/exchange",   label: t.nav.exchange,    icon: <ExchangeIcon /> },
    { href: "/history",    label: t.nav.history,     icon: <ClipboardIcon /> },
    { href: "/leaderboard",label: t.nav.leaderboard, icon: <TrophyIcon /> },
    { href: "/search",     label: t.nav.search,      icon: <SearchIcon /> },
    { href: "/watchlist",  label: t.nav.watchlist,   icon: <WatchlistIcon /> },
    { href: "/screener",   label: t.nav.screener,    icon: <ScreenerIcon /> },
    { href: "/personas",   label: t.nav.personas,    icon: <PersonasIcon /> },
  ];

  function isActive(href: string): boolean {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  }

  return (
    <>
      <nav
        className="fixed left-0 top-0 h-full w-12 bg-white border-r border-slate-200 flex flex-col items-center py-2 gap-1 z-40"
        aria-label={t.nav.mainNav}
      >
        <button
          onClick={() => setMenuOpen(true)}
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors"
          aria-label={t.nav.openMenu}
        >
          <Logo size={20} />
        </button>
        <div className="w-full h-px bg-slate-200 my-1" />
        {icons.map(({ href, label, icon }) => (
          <Link
            key={href}
            href={href}
            title={label}
            className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${
              isActive(href)
                ? "bg-green-50 text-green-700"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            }`}
            aria-current={isActive(href) ? "page" : undefined}
          >
            {icon}
          </Link>
        ))}
        <div className="mt-auto mb-1 flex flex-col items-center gap-1">
          <NotificationBell size="md" />
          <LanguageToggle size="sm" />
          {isAdmin && (
            <Link
              href="/admin"
              title="Admin"
              className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 hover:text-slate-900 transition-colors text-slate-500"
            >
              <ShieldIcon />
            </Link>
          )}
          <PlusButton />
        </div>
      </nav>
      {menuOpen && <RetroMenu onClose={() => setMenuOpen(false)} />}
    </>
  );
}

function PlusButton() {
  return (
    <Link
      href="/compose"
      className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200"
      style={{
        background:
          "linear-gradient(135deg, #FF3D9A 0%, #8B5CF6 50%, #06B6D4 100%)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
      }}
      title="เขียนโพสต์"
    >
      <span
        style={{
          background:
            "linear-gradient(135deg, #FF3D9A 0%, #8B5CF6 50%, #06B6D4 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          fontSize: 20,
          fontWeight: 700,
        }}
      >
        +
      </span>
    </Link>
  );
}

function HomeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 12L12 3l9 9" />
      <path d="M5 10v11h5v-7h4v7h5V10" />
    </svg>
  );
}
function PieIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
      <path d="M22 12A10 10 0 0 0 12 2v10z" />
    </svg>
  );
}
function RadarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="2" />
      <path d="M12 2a10 10 0 1 0 10 10" />
      <path d="M12 6a6 6 0 1 0 6 6" />
      <path d="M22 12h-2M12 2v2" />
    </svg>
  );
}
function PersonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="7" r="4" />
      <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
    </svg>
  );
}
function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2" y="4" width="20" height="16" rx="1" />
      <path d="M2 7l10 7 10-7" />
    </svg>
  );
}
function ExchangeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M7 16V4m0 0L3 8m4-4l4 4" />
      <path d="M17 8v12m0 0l4-4m-4 4l-4-4" />
    </svg>
  );
}
function ClipboardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    </svg>
  );
}
function TrophyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 9H3a1 1 0 0 1-1-1V5h4" />
      <path d="M18 9h3a1 1 0 0 0 1-1V5h-4" />
      <path d="M6 4h12v7a6 6 0 0 1-12 0V4z" />
      <path d="M12 17v4" />
      <path d="M8 21h8" />
    </svg>
  );
}
function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  );
}
function ShieldIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.25C16.5 22.15 20 17.25 20 12V6l-8-4z" />
    </svg>
  );
}
function WatchlistIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function ScreenerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
    </svg>
  );
}
function PersonasIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="9" cy="7" r="3" />
      <path d="M3 21v-1a6 6 0 0 1 6-6h0" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M21 21v-1a4.5 4.5 0 0 0-4.5-4.5h-1" />
    </svg>
  );
}
function ChatIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
function NewspaperIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
      <path d="M18 14h-8M15 18h-5M10 6h8v4h-8z" />
    </svg>
  );
}
