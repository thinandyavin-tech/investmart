"use client";

import { useState }              from "react";
import { Link, usePathname }     from "@/i18n/navigation";
import type React                from "react";

import { useI18n }               from "@/lib/i18n";
import { LanguageToggle }        from "@/components/LanguageToggle";
import { RetroMenu }             from "@/components/RetroMenu";

const AUTH_PATHS = new Set(["/signin", "/signup"]);

export function BottomNav() {
  const pathname  = usePathname();
  const { t }     = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);

  if (AUTH_PATHS.has(pathname)) return null;

  const navItems = [
    { href: "/",          label: t.nav.home,    icon: <HomeIcon /> },
    { href: "/radar",     label: t.nav.radar,   icon: <RadarIcon /> },
    { href: "/compose",   label: t.nav.compose, icon: null, isPlus: true },
    { href: "/chat",      label: t.nav.chat,    icon: <ChatIcon /> },
    { href: "/profile",   label: t.nav.profile, icon: <PersonIcon /> },
  ];

  return (
    <>
      {menuOpen && <RetroMenu onClose={() => setMenuOpen(false)} fromMobile />}

      <nav
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        aria-label={t.nav.bottomNav}
      >
        <div className="flex items-center">
          {navItems.map(({ href, label, icon, isPlus }) => {
            const active = pathname === href || (href !== "/" && pathname.startsWith(href));
            if (isPlus) {
              return (
                <Link
                  key={href}
                  href={href}
                  className="flex-1 flex items-center justify-center min-h-[48px]"
                  aria-label={label}
                >
                  <span
                    className="w-10 h-10 flex items-center justify-center rounded-full"
                    style={{
                      background: "linear-gradient(135deg, #FF3D9A 0%, #8B5CF6 50%, #06B6D4 100%)",
                    }}
                  >
                    <span className="text-white text-xl font-bold leading-none">+</span>
                  </span>
                </Link>
              );
            }
            return (
              <Link
                key={href}
                href={href}
                className={`flex-1 flex flex-col items-center justify-center min-h-[48px] gap-0.5 text-[10px] font-medium transition-colors ${
                  active ? "text-green-600" : "text-slate-400"
                }`}
                aria-label={label}
                aria-current={active ? "page" : undefined}
              >
                <span className={active ? "text-green-600" : "text-slate-400"}>{icon}</span>
                <span className="truncate max-w-[44px] text-center">{label}</span>
              </Link>
            );
          })}

          {/* More — opens RetroMenu with all pages */}
          <button
            onClick={() => setMenuOpen(true)}
            className={`flex-1 flex flex-col items-center justify-center min-h-[48px] gap-0.5 text-[10px] font-medium transition-colors ${
              menuOpen ? "text-green-600" : "text-slate-400"
            }`}
            aria-label={t.nav.openMenu}
            aria-expanded={menuOpen}
          >
            <GridIcon />
            <span>{t.nav.more ?? "More"}</span>
          </button>

          {/* Language toggle — compact */}
          <div className="px-1 flex items-center justify-center min-h-[48px] flex-shrink-0">
            <LanguageToggle size="sm" />
          </div>
        </div>
      </nav>
    </>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function HomeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 12L12 3l9 9" />
      <path d="M5 10v11h5v-7h4v7h5V10" />
    </svg>
  );
}

function RadarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="2" />
      <path d="M12 2a10 10 0 1 0 10 10" />
      <path d="M12 6a6 6 0 1 0 6 6" />
      <path d="M22 12h-2M12 2v2" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="7" r="4" />
      <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}
