"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Link }     from "@/i18n/navigation";
import {
  Home, PieChart, Radio, Newspaper, MessageCircle, User, Mail,
  ArrowLeftRight, ClipboardList, Trophy, Search, Eye,
  SlidersHorizontal, Calculator, Crosshair, LayoutGrid, Users,
  Shield, SquarePen, Globe, TrendingUp, CalendarDays, Compass,
  BookOpen, Route, BookMarked, Layers,
} from "lucide-react";
import { RetroMenu }        from "@/components/RetroMenu";
import { NotificationBell } from "@/components/NotificationBell";
import { LanguageToggle }   from "@/components/LanguageToggle";
import { useUser }          from "@/lib/userContext";
import { useI18n }          from "@/lib/i18n";

const SZ = 15;

// ── Nav item definition ───────────────────────────────────────────────────────

interface NavItem { href: string; label: string; icon: React.ReactNode; }

// ── Tooltip-label nav link ────────────────────────────────────────────────────

function NavLink({ href, label, icon, active }: NavItem & { active: boolean }) {
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className="group relative w-9 h-9 flex items-center justify-center rounded-lg transition-colors flex-shrink-0"
      style={{
        background: active ? "#e9edc9"   : "transparent",
        color:      active ? "#8B5CF6"   : "#8A8378",
      }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "#e9edc9"; }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
    >
      {icon}
      {/* Hover label tooltip */}
      <span
        className="pointer-events-none absolute left-full ml-2 px-2 py-1 text-[10px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50"
        style={{ background: "#1A1A1A", color: "#fff", borderRadius: 4 }}
        role="tooltip"
      >
        {label}
      </span>
    </Link>
  );
}

// ── Divider ───────────────────────────────────────────────────────────────────

function Divider({ label }: { label: string }) {
  return (
    <div className="w-full flex flex-col items-center gap-0.5 my-0.5">
      <div className="w-7 h-px" style={{ background: "#ccd5ae" }} />
      <span className="text-[7px] font-bold uppercase tracking-widest" style={{ color: "#ccd5ae" }}>
        {label}
      </span>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function IconRail() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user }    = useUser();
  const { t }       = useI18n();
  const pathname    = usePathname();
  const isAdmin     = user?.isAdmin === true;

  function active(href: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  }

  const CORE: NavItem[] = [
    { href: "/",         label: t.nav.home,        icon: <Home size={SZ} /> },
    { href: "/assets",   label: t.nav.assets,      icon: <PieChart size={SZ} /> },
    { href: "/chat",     label: t.nav.chat,        icon: <MessageCircle size={SZ} /> },
    { href: "/search",   label: t.nav.search,      icon: <Search size={SZ} /> },
    { href: "/profile",  label: t.nav.profile,     icon: <User size={SZ} /> },
  ];

  const MARKETS: NavItem[] = [
    { href: "/radar",      label: t.nav.radar,      icon: <Radio size={SZ} /> },
    { href: "/market",     label: t.nav.market,     icon: <TrendingUp size={SZ} /> },
    { href: "/browse",     label: t.nav.browse,     icon: <Globe size={SZ} /> },
    { href: "/screener",   label: t.nav.screener,   icon: <SlidersHorizontal size={SZ} /> },
    { href: "/screens",    label: t.nav.screens,    icon: <LayoutGrid size={SZ} /> },
    { href: "/news",       label: t.nav.news,       icon: <Newspaper size={SZ} /> },
    { href: "/calendar",   label: t.nav.calendar,   icon: <CalendarDays size={SZ} /> },
  ];

  const ANALYSIS: NavItem[] = [
    { href: "/valuation",  label: t.nav.valuation,  icon: <Calculator size={SZ} /> },
    { href: "/hunter",     label: t.nav.hunter,     icon: <Crosshair size={SZ} /> },
    { href: "/playbook",   label: t.nav.playbook,   icon: <BookMarked size={SZ} /> },
    { href: "/blueprint",  label: t.nav.blueprint,  icon: <Layers size={SZ} /> },
    { href: "/discover",   label: t.nav.discover,   icon: <Compass size={SZ} /> },
  ];

  const SOCIAL: NavItem[] = [
    { href: "/leaderboard",label: t.nav.leaderboard,icon: <Trophy size={SZ} /> },
    { href: "/watchlist",  label: t.nav.watchlist,  icon: <Eye size={SZ} /> },
    { href: "/exchange",   label: t.nav.exchange,   icon: <ArrowLeftRight size={SZ} /> },
    { href: "/history",    label: t.nav.history,    icon: <ClipboardList size={SZ} /> },
    { href: "/journal",    label: t.nav.journal,    icon: <BookOpen size={SZ} /> },
    { href: "/journey",    label: t.nav.journey,    icon: <Route size={SZ} /> },
    { href: "/mail",       label: t.nav.mail,       icon: <Mail size={SZ} /> },
    { href: "/personas",   label: t.nav.personas,   icon: <Users size={SZ} /> },
  ];

  const sections = [
    { label: "CORE",     items: CORE     },
    { label: "MARKETS",  items: MARKETS  },
    { label: "ANALYSIS", items: ANALYSIS },
    { label: "SOCIAL",   items: SOCIAL   },
  ];

  return (
    <>
      <nav
        className="fixed left-0 top-0 h-full w-12 flex flex-col items-center z-40"
        style={{ background: "#faedcd", borderRight: "1px solid #ccd5ae" }}
        aria-label={t.nav.mainNav}
      >
        {/* ── Menu button — prominent, always visible ── */}
        <button
          onClick={() => setMenuOpen(true)}
          aria-label={t.nav.openMenu}
          aria-expanded={menuOpen}
          className="group relative w-full flex flex-col items-center justify-center py-3 gap-1 transition-colors flex-shrink-0"
          style={{ background: "#8B5CF6", borderBottom: "2px solid #d4a373" }}
          onMouseEnter={e => (e.currentTarget.style.background = "#7C3AED")}
          onMouseLeave={e => (e.currentTarget.style.background = "#8B5CF6")}
        >
          <Layers size={18} color="#fff" strokeWidth={2.5} />
          <span className="text-[8px] font-bold tracking-wider text-white/90 uppercase">Menu</span>
          {/* Hover tooltip */}
          <span
            className="pointer-events-none absolute left-full ml-2 px-2 py-1 text-[10px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50"
            style={{ background: "#1A1A1A", color: "#fff", borderRadius: 4 }}
            role="tooltip"
          >
            All pages →
          </span>
        </button>

        {/* ── Scrollable nav sections ── */}
        <div className="flex-1 w-full overflow-y-auto overflow-x-hidden flex flex-col items-center gap-0.5 py-2" style={{ scrollbarWidth: "none" }}>
          {sections.map(({ label, items }) => (
            <div key={label} className="w-full flex flex-col items-center">
              <Divider label={label} />
              {items.map(item => (
                <NavLink key={item.href} {...item} active={active(item.href)} />
              ))}
            </div>
          ))}
        </div>

        {/* ── Bottom controls ── */}
        <div className="w-full flex flex-col items-center gap-1 pb-2 pt-1 flex-shrink-0" style={{ borderTop: "1px solid #ccd5ae" }}>
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
