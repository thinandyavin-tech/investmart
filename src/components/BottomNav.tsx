"use client";

import { useState }          from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { Home, Radio, MessageCircle, User, LayoutGrid } from "lucide-react";

import { useI18n }     from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";
import { RetroMenu }   from "@/components/RetroMenu";

const AUTH_PATHS = new Set(["/signin", "/signup"]);
const SZ = 20;

export function BottomNav() {
  const pathname   = usePathname();
  const { t }      = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);

  if (AUTH_PATHS.has(pathname)) return null;

  const navItems = [
    { href: "/",       label: t.nav.home,    icon: <Home size={SZ} /> },
    { href: "/radar",  label: t.nav.radar,   icon: <Radio size={SZ} /> },
    { href: "/compose", label: t.nav.compose, icon: null, isPlus: true },
    { href: "/chat",   label: t.nav.chat,    icon: <MessageCircle size={SZ} /> },
    { href: "/profile",label: t.nav.profile, icon: <User size={SZ} /> },
  ];

  return (
    <>
      {menuOpen && <RetroMenu onClose={() => setMenuOpen(false)} fromMobile />}

      <nav
        className="fixed bottom-0 left-0 right-0 z-40 lg:hidden"
        style={{
          background:   "#faedcd",
          borderTop:    "1px solid #ccd5ae",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
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
                    style={{ background: "linear-gradient(135deg, #FF3D9A 0%, #8B5CF6 50%, #06B6D4 100%)" }}
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
                className="flex-1 flex flex-col items-center justify-center min-h-[48px] gap-0.5 text-[10px] font-medium transition-colors"
                style={{ color: active ? "#8B5CF6" : "#8A8378" }}
                aria-label={label}
                aria-current={active ? "page" : undefined}
              >
                {icon}
                <span className="truncate max-w-[44px] text-center">{label}</span>
              </Link>
            );
          })}

          {/* More button — opens RetroMenu */}
          <button
            onClick={() => setMenuOpen(true)}
            className="flex-1 flex flex-col items-center justify-center min-h-[48px] gap-0.5 text-[10px] font-medium transition-colors"
            style={{ color: menuOpen ? "#8B5CF6" : "#8A8378" }}
            aria-label={t.nav.openMenu}
            aria-expanded={menuOpen}
          >
            <LayoutGrid size={SZ} />
            <span>{t.nav.more ?? "More"}</span>
          </button>

          {/* Language toggle */}
          <div className="px-1 flex items-center justify-center min-h-[48px] flex-shrink-0">
            <LanguageToggle size="sm" />
          </div>
        </div>
      </nav>
    </>
  );
}
