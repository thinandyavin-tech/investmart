"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type React from "react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  isPlus?: boolean;
}

const navItems: NavItem[] = [
  { href: "/",       label: "Home",   icon: <HomeIcon /> },
  { href: "/news",   label: "ข่าว",   icon: <NewspaperIcon /> },
  { href: "/compose", label: "Plus",  icon: null, isPlus: true },
  { href: "/chat",   label: "แชท",    icon: <ChatIcon /> },
  { href: "/profile", label: "Profile", icon: <PersonIcon /> },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-[#F3EDE0] border-t border-[#1F1A14] flex items-center z-40 lg:hidden"
      aria-label="แถบนำทางล่าง"
    >
      {navItems.map(({ href, label, icon, isPlus }) => {
        const active = pathname === href;
        if (isPlus) {
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex items-center justify-center py-2"
              aria-label={label}
            >
              <span
                className="w-11 h-11 flex items-center justify-center border-2 border-[#1F1A14]"
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
            className={`flex-1 flex flex-col items-center py-2 gap-0.5 text-[10px] transition-colors ${
              active ? "text-[#1F1A14] font-bold" : "text-[#8A8378]"
            }`}
            aria-label={label}
            aria-current={active ? "page" : undefined}
          >
            <span className={active ? "text-[#1F1A14]" : "text-[#8A8378]"}>
              {icon}
            </span>
            <span>{label}</span>
          </Link>
        );
      })}
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
function PersonIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="7" r="4" />
      <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
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
function NewspaperIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
      <path d="M18 14h-8M15 18h-5M10 6h8v4h-8z" />
    </svg>
  );
}
