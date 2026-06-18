"use client";

import { Link } from "@/i18n/navigation";
import { useEffect } from "react";

import { useUser } from "@/lib/userContext";
import { useI18n } from "@/lib/i18n";

interface RetroMenuProps {
  onClose:    () => void;
  fromMobile?: boolean;
}

interface MenuItem {
  href: string;
  label: string;
  icon: string;
  soon?: boolean;
}

export function RetroMenu({ onClose, fromMobile = false }: RetroMenuProps) {
  const { user, signOut } = useUser();
  const { t } = useI18n();

  const menuItems: MenuItem[] = [
    { href: "/",              label: t.nav.home,        icon: "🏠" },
    { href: "/radar",         label: t.nav.radar,       icon: "📡" },
    { href: "/valuation",     label: t.nav.valuation,   icon: "📐" },
    { href: "/hunter",        label: t.nav.hunter,      icon: "🎯" },
    { href: "/screens",       label: t.nav.screens,     icon: "📋" },
    { href: "/blueprint",           label: t.nav.blueprint,     icon: "🗺️" },
    { href: "/playbook",            label: t.nav.playbook,      icon: "📖" },
    { href: "/journey",             label: t.nav.journey,       icon: "🧭" },
    { href: "/journal",             label: t.nav.journal,       icon: "📝" },
    { href: "/options",             label: t.nav.options,       icon: "📉" },
    { href: "/learn/stock-picking", label: t.nav.stockPicking,  icon: "🔭" },
    { href: "/learn/fundamental",   label: t.nav.fundamental,   icon: "📋" },
    { href: "/browse",        label: t.nav.browse,      icon: "🌐" },
    { href: "/market",        label: t.nav.market,      icon: "📈" },
    { href: "/calendar",      label: t.nav.calendar,    icon: "📅" },
    { href: "/leaderboard",   label: t.nav.leaderboard, icon: "🏆" },
    { href: "/profile",       label: t.nav.profile,     icon: "👤" },
    { href: "/discover",      label: t.nav.discover,    icon: "🔭" },
    { href: "/mail",          label: t.nav.mail,        icon: "✉️" },
    { href: "/profile/edit",  label: t.nav.editProfile, icon: "✏️" },
    { href: "/settings/id",   label: t.nav.settingsId,  icon: "🔑" },
    { href: "/dashboard",     label: "Dashboard",        icon: "📊", soon: true },
    { href: "/profile/share", label: t.nav.shareProfile,icon: "🔗" },
    { href: "/bookmarks",     label: "Bookmarks",        icon: "🔖", soon: true },
    { href: "/watchlist",     label: t.nav.watchlist,   icon: "👁" },
    { href: "/alerts",        label: "แจ้งเตือนราคา",  icon: "🔔" },
    { href: "/martin",        label: "ถาม Martin AI",  icon: "✦" },
    { href: "/exchange",      label: t.nav.exchange,    icon: "💱" },
    { href: "/history",       label: t.nav.history,     icon: "📋" },
    { href: "/learn",         label: t.nav.learn,       icon: "📚" },
    { href: "/glossary",      label: t.nav.glossary,    icon: "📖" },
    { href: "/faq",           label: t.nav.faq,         icon: "❓" },
    { href: "/about",         label: t.nav.about,       icon: "ℹ️" },
  ];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-start"
      style={{ background: "rgba(0,0,0,0.35)" }}
      onClick={onClose}
    >
      <div
        className={`${fromMobile ? "ml-2 mt-2" : "ml-14 mt-4"} w-72 border-2 border-[#1F1A14] bg-[#faedcd] max-h-[90vh] overflow-y-auto`}
        style={{ boxShadow: "4px 4px 0 #d4a373" }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="InvestMart menu"
      >
        {/* Title bar */}
        <div
          className="flex items-center justify-between px-3 py-1"
          style={{ background: "#000080" }}
        >
          <span className="text-white text-xs font-bold tracking-widest">
            InvestMart
          </span>
          <button
            onClick={onClose}
            className="text-white text-xs border border-[#8080FF] bg-[#0000C0] px-2 py-0.5 hover:bg-[#000080]"
            aria-label={t.common.close}
          >
            ×
          </button>
        </div>
        {/* Menu items */}
        <ul className="py-1">
          {menuItems.map(({ href, label, icon, soon }) => (
            <li key={href}>
              {soon ? (
                <span className="flex items-center gap-2 px-4 py-1.5 text-xs text-[#8A8378] cursor-not-allowed">
                  <span>{icon}</span>
                  <span>{label}</span>
                  <span
                    className="ml-auto text-xs px-1.5 py-0.5 font-bold"
                    style={{ background: "#FFD9E8", color: "#D6336C" }}
                  >
                    SOON
                  </span>
                </span>
              ) : (
                <Link
                  href={href}
                  onClick={onClose}
                  className="flex items-center gap-2 px-4 py-1.5 text-xs text-[#1F1A14] hover:bg-[#1F1A14] hover:text-white transition-colors"
                >
                  <span>{icon}</span>
                  <span>{label}</span>
                </Link>
              )}
            </li>
          ))}

          {/* Divider */}
          <li className="border-t border-[#D0C8B8] my-1" />

          {user ? (
            <li>
              <button
                onClick={() => { void signOut(); onClose(); }}
                className="w-full flex items-center gap-2 px-4 py-1.5 text-xs text-[#DC2626] hover:bg-[#DC2626] hover:text-white transition-colors"
              >
                <span>🚪</span>
                <span>{t.common.signOut}</span>
              </button>
            </li>
          ) : (
            <>
              <li>
                <Link href="/signin" onClick={onClose}
                  className="flex items-center gap-2 px-4 py-1.5 text-xs text-[#1F1A14] hover:bg-[#1F1A14] hover:text-white transition-colors">
                  <span>🔑</span><span>{t.common.signIn}</span>
                </Link>
              </li>
              <li>
                <Link href="/signup" onClick={onClose}
                  className="flex items-center gap-2 px-4 py-1.5 text-xs font-bold hover:bg-[#9BE15D] transition-colors"
                  style={{ color: "#5B8A2A" }}>
                  <span>✨</span><span>{t.common.signUp}</span>
                </Link>
              </li>
            </>
          )}
        </ul>
      </div>
    </div>
  );
}
