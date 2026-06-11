"use client";

import { Link } from "@/i18n/navigation";
import { usePathname } from "next/navigation";
import type React from "react";

import { useI18n } from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useI18n();

  const navItems = [
    { href: "/",        label: t.nav.home,   icon: <HomeIcon /> },
    { href: "/assets",  label: t.nav.assets, icon: <PieIcon /> },
    { href: "/compose", label: t.nav.compose, icon: null, isPlus: true },
    { href: "/radar",   label: t.nav.radar,  icon: <RadarIcon /> },
    { href: "/profile", label: t.nav.profile, icon: <PersonIcon /> },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex items-center z-40 lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label={t.nav.bottomNav}
    >
      {navItems.map(({ href, label, icon, isPlus }) => {
        const active = pathname === href;
        if (isPlus) {
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex items-center justify-center min-h-[44px]"
              aria-label={label}
            >
              <span
                className="w-11 h-11 flex items-center justify-center rounded-full border border-slate-200"
                style={{
                  background:
                    "linear-gradient(135deg, #FF3D9A 0%, #8B5CF6 50%, #06B6D4 100%)",
                }}
              >
                <span className="text-white text-2xl font-bold leading-none">+</span>
              </span>
            </Link>
          );
        }
        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center justify-center min-h-[44px] gap-0.5 text-xs transition-colors ${
              active ? "text-green-600 font-semibold" : "text-slate-400"
            }`}
            aria-label={label}
            aria-current={active ? "page" : undefined}
          >
            <span className={active ? "text-green-600" : "text-slate-400"}>
              {icon}
            </span>
            <span>{label}</span>
          </Link>
        );
      })}

      {/* Language toggle — visible in bottom nav as a subtle chip */}
      <div className="px-1 flex items-center justify-center min-h-[44px] flex-shrink-0">
        <LanguageToggle size="sm" />
      </div>
    </nav>
  );
}

function HomeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 12L12 3l9 9" />
      <path d="M5 10v11h5v-7h4v7h5V10" />
    </svg>
  );
}

function PieIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
      <path d="M22 12A10 10 0 0 0 12 2v10z" />
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

function PersonIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="7" r="4" />
      <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
    </svg>
  );
}
