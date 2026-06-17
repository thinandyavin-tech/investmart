"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Link }     from "@/i18n/navigation";
import {
  Home, PieChart, Radio, Newspaper, MessageCircle, User, Mail,
  ArrowLeftRight, ClipboardList, Trophy, Search, Eye,
  SlidersHorizontal, Calculator, Crosshair, LayoutGrid,
  Users, Shield, SquarePen,
} from "lucide-react";
import { Logo }              from "@/components/Logo";
import { RetroMenu }         from "@/components/RetroMenu";
import { NotificationBell }  from "@/components/NotificationBell";
import { LanguageToggle }    from "@/components/LanguageToggle";
import { useUser }           from "@/lib/userContext";
import { useI18n }           from "@/lib/i18n";

const SZ = 16;

export function IconRail() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user }    = useUser();
  const { t }       = useI18n();
  const pathname    = usePathname();
  const isAdmin     = user?.isAdmin === true;

  const icons = [
    { href: "/",            label: t.nav.home,        icon: <Home size={SZ} /> },
    { href: "/assets",      label: t.nav.assets,      icon: <PieChart size={SZ} /> },
    { href: "/radar",       label: t.nav.radar,       icon: <Radio size={SZ} /> },
    { href: "/news",        label: t.nav.news,        icon: <Newspaper size={SZ} /> },
    { href: "/chat",        label: t.nav.chat,        icon: <MessageCircle size={SZ} /> },
    { href: "/profile",     label: t.nav.profile,     icon: <User size={SZ} /> },
    { href: "/mail",        label: t.nav.mail,        icon: <Mail size={SZ} /> },
    { href: "/exchange",    label: t.nav.exchange,    icon: <ArrowLeftRight size={SZ} /> },
    { href: "/history",     label: t.nav.history,     icon: <ClipboardList size={SZ} /> },
    { href: "/leaderboard", label: t.nav.leaderboard, icon: <Trophy size={SZ} /> },
    { href: "/search",      label: t.nav.search,      icon: <Search size={SZ} /> },
    { href: "/watchlist",   label: t.nav.watchlist,   icon: <Eye size={SZ} /> },
    { href: "/screener",    label: t.nav.screener,    icon: <SlidersHorizontal size={SZ} /> },
    { href: "/valuation",   label: t.nav.valuation,   icon: <Calculator size={SZ} /> },
    { href: "/hunter",      label: t.nav.hunter,      icon: <Crosshair size={SZ} /> },
    { href: "/screens",     label: t.nav.screens,     icon: <LayoutGrid size={SZ} /> },
    { href: "/personas",    label: t.nav.personas,    icon: <Users size={SZ} /> },
  ];

  function isActive(href: string): boolean {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  }

  return (
    <>
      <nav
        className="fixed left-0 top-0 h-full w-12 flex flex-col items-center py-2 gap-1 z-40"
        style={{ background: "#faedcd", borderRight: "1px solid #ccd5ae" }}
        aria-label={t.nav.mainNav}
      >
        {/* Logo / menu trigger */}
        <button
          onClick={() => setMenuOpen(true)}
          className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors"
          style={{ background: "transparent" }}
          onMouseEnter={e => (e.currentTarget.style.background = "#e9edc9")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          aria-label={t.nav.openMenu}
        >
          <Logo size={20} />
        </button>

        <div className="w-7 h-px my-0.5" style={{ background: "#ccd5ae" }} />

        {/* Nav icons */}
        {icons.map(({ href, label, icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              title={label}
              aria-current={active ? "page" : undefined}
              className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors"
              style={{
                background: active ? "#e9edc9" : "transparent",
                color:      active ? "#8B5CF6"  : "#8A8378",
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "#e9edc9"; }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              {icon}
            </Link>
          );
        })}

        {/* Bottom controls */}
        <div className="mt-auto mb-1 flex flex-col items-center gap-1">
          <NotificationBell size="md" />
          <LanguageToggle size="sm" />
          {isAdmin && (
            <Link
              href="/admin"
              title="Admin"
              className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors"
              style={{ color: "#8A8378" }}
            >
              <Shield size={SZ} />
            </Link>
          )}
          {/* Compose button */}
          <Link
            href="/compose"
            title="เขียนโพสต์"
            className="w-9 h-9 flex items-center justify-center rounded-lg border transition-colors"
            style={{ borderColor: "#ccd5ae", background: "#fefae0", color: "#8B5CF6" }}
          >
            <SquarePen size={SZ} />
          </Link>
        </div>
      </nav>
      {menuOpen && <RetroMenu onClose={() => setMenuOpen(false)} />}
    </>
  );
}
