"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useUser } from "@/lib/userContext";

interface RetroMenuProps {
  onClose: () => void;
}

interface MenuItem {
  href: string;
  label: string;
  icon: string;
  soon?: boolean;
}

const menuItems: MenuItem[] = [
  { href: "/",              label: "หน้าหลัก",           icon: "🏠" },
  { href: "/radar",         label: "เรดาร์แสกนหุ้น",    icon: "📡" },
  { href: "/market",        label: "ภาพรวมตลาด",         icon: "📈" },
  { href: "/leaderboard",   label: "Leaderboard",          icon: "🏆" },
  { href: "/profile",       label: "โปรไฟล์",            icon: "👤" },
  { href: "/discover",      label: "Discover",             icon: "🔭" },
  { href: "/mail",          label: "จดหมาย / แจ้งเตือน", icon: "✉️" },
  { href: "/profile/edit",  label: "แก้ไขโปรไฟล์",      icon: "✏️" },
  { href: "/settings/id",   label: "ตั้งค่าไอดี",        icon: "🔑" },
  { href: "/dashboard",     label: "แดชบอร์ด",           icon: "📊", soon: true },
  { href: "/profile/share", label: "แชร์โปรไฟล์",        icon: "🔗" },
  { href: "/bookmarks",     label: "บันทึกโพสต์",        icon: "🔖", soon: true },
  { href: "/watchlist",     label: "Watchlist",             icon: "👁" },
  { href: "/exchange",      label: "Exchange",             icon: "💱" },
  { href: "/history",       label: "ประวัติซื้อขาย",     icon: "📋" },
  { href: "/learn",         label: "เรียนรู้",            icon: "📚" },
  { href: "/glossary",      label: "คำศัพท์หุ้น",        icon: "📖" },
  { href: "/faq",           label: "คำถามที่พบบ่อย",     icon: "❓" },
  { href: "/about",         label: "เกี่ยวกับ",          icon: "ℹ️" },
];

export function RetroMenu({ onClose }: RetroMenuProps) {
  const { user, signOut } = useUser();

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
      onClick={onClose}
    >
      <div
        className="ml-14 mt-4 w-72 border-2 border-[#1F1A14] bg-[#F3EDE0]"
        style={{ boxShadow: "4px 4px 0 #1F1A14" }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="เมนูหลัก InvestMart"
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
            aria-label="ปิดเมนู"
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
                    className="ml-auto text-[10px] px-1.5 py-0.5 font-bold"
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
                <span>ออกจากระบบ</span>
              </button>
            </li>
          ) : (
            <>
              <li>
                <Link href="/signin" onClick={onClose}
                  className="flex items-center gap-2 px-4 py-1.5 text-xs text-[#1F1A14] hover:bg-[#1F1A14] hover:text-white transition-colors">
                  <span>🔑</span><span>เข้าสู่ระบบ</span>
                </Link>
              </li>
              <li>
                <Link href="/signup" onClick={onClose}
                  className="flex items-center gap-2 px-4 py-1.5 text-xs font-bold hover:bg-[#9BE15D] transition-colors"
                  style={{ color: "#5B8A2A" }}>
                  <span>✨</span><span>สมัครสมาชิก</span>
                </Link>
              </li>
            </>
          )}
        </ul>
      </div>
    </div>
  );
}
