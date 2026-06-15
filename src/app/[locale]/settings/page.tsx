"use client";

import { Link } from "@/i18n/navigation";
import { useUser } from "@/lib/userContext";
import { useI18n } from "@/lib/i18n";
import { AppShell } from "@/components/AppShell";

export default function SettingsPage() {
  const { user, loading } = useUser();
  const { lang, toggle } = useI18n();

  const sections = [
    {
      title: lang === "th" ? "บัญชีและโปรไฟล์" : "Account & Profile",
      items: [
        {
          href:  "/settings/id",
          label: lang === "th" ? "เปลี่ยนชื่อผู้ใช้" : "Change username",
          desc:  user?.username ? `@${user.username}` : (lang === "th" ? "ยังไม่ได้ตั้ง" : "Not set"),
          icon:  "👤",
        },
        {
          href:  "/profile/edit",
          label: lang === "th" ? "แก้ไขโปรไฟล์" : "Edit profile",
          desc:  lang === "th" ? "รูปภาพ ชีวประวัติ" : "Avatar, bio",
          icon:  "✏️",
        },
        {
          href:  "/profile/share",
          label: lang === "th" ? "แชร์โปรไฟล์" : "Share profile",
          desc:  lang === "th" ? "สร้างการ์ดโปรไฟล์" : "Generate profile card",
          icon:  "📤",
        },
      ],
    },
    {
      title: lang === "th" ? "ภาษาและการแสดงผล" : "Language & Display",
      items: [
        {
          action: toggle,
          label:  lang === "th" ? "เปลี่ยนภาษา" : "Switch language",
          desc:   lang === "th" ? "ปัจจุบัน: ภาษาไทย" : "Current: English",
          icon:   "🌐",
        },
      ],
    },
    {
      title: lang === "th" ? "พอร์ตจำลอง" : "Paper Portfolio",
      items: [
        {
          href:  "/exchange",
          label: lang === "th" ? "แลกเงิน THB/USD" : "Exchange THB/USD",
          desc:  user
            ? `฿${user.cashThb.toLocaleString("th-TH", { maximumFractionDigits: 0 })} · $${user.cashUsd.toFixed(2)}`
            : "—",
          icon:  "💱",
        },
        {
          href:  "/history",
          label: lang === "th" ? "ประวัติการซื้อขาย" : "Trade history",
          desc:  lang === "th" ? "รายการซื้อขายทั้งหมด" : "All your trades",
          icon:  "📋",
        },
      ],
    },
    {
      title: lang === "th" ? "การแจ้งเตือน" : "Notifications",
      items: [
        {
          href:  "/mail",
          label: lang === "th" ? "กล่องข้อความ" : "Inbox",
          desc:  lang === "th" ? "การแจ้งเตือนและข่าวสาร" : "Alerts and messages",
          icon:  "📬",
        },
      ],
    },
    {
      title: lang === "th" ? "เกี่ยวกับ" : "About",
      items: [
        {
          href:  "/about",
          label: lang === "th" ? "เกี่ยวกับ InvestMart" : "About InvestMart",
          desc:  lang === "th" ? "รุ่น ทีม ภารกิจ" : "Version, team, mission",
          icon:  "ℹ️",
        },
        {
          href:  "/privacy",
          label: lang === "th" ? "นโยบายความเป็นส่วนตัว" : "Privacy policy",
          icon:  "🔒",
        },
        {
          href:  "/terms",
          label: lang === "th" ? "ข้อกำหนดการใช้งาน" : "Terms of service",
          icon:  "📄",
        },
      ],
    },
  ];

  return (
    <AppShell>
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-sm font-bold uppercase tracking-widest text-[#1F1A14]">
            {lang === "th" ? "การตั้งค่า" : "Settings"}
          </h1>
          {!loading && user && (
            <p className="text-xs text-[#8A8378] mt-0.5">
              {user.email}
            </p>
          )}
        </div>

        {/* Sections */}
        <div className="flex flex-col gap-5">
          {sections.map(section => (
            <div key={section.title}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#8A8378] mb-2 px-1">
                {section.title}
              </p>
              <div
                className="flex flex-col"
                style={{ border: "1px solid #C8BFB0", boxShadow: "2px 2px 0 #1F1A14" }}
              >
                {section.items.map((item, idx) => {
                  const isLast = idx === section.items.length - 1;
                  const inner = (
                    <div className="flex items-center gap-3 px-4 py-3 bg-[#FDFAF4] hover:bg-[#F3EDE0] transition-colors">
                      <span className="text-base w-6 text-center flex-shrink-0" aria-hidden="true">
                        {item.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-[#1F1A14]">{item.label}</p>
                        {"desc" in item && item.desc && (
                          <p className="text-[10px] text-[#8A8378] truncate">{item.desc}</p>
                        )}
                      </div>
                      <span className="text-[#8A8378] text-xs flex-shrink-0">›</span>
                    </div>
                  );

                  const wrapperCls = !isLast ? "border-b border-[#E0D9CC]" : "";

                  if ("action" in item && item.action) {
                    return (
                      <button key={item.label} onClick={item.action} className={`w-full text-left ${wrapperCls}`}>
                        {inner}
                      </button>
                    );
                  }
                  if ("href" in item && item.href) {
                    return (
                      <Link key={item.label} href={item.href} className={wrapperCls}>
                        {inner}
                      </Link>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          ))}
        </div>

        {/* App info footer */}
        <p className="text-[10px] text-[#8A8378] text-center mt-8">
          InvestMart · พอร์ตจำลองหุ้น US · ไม่ใช้เงินจริง
        </p>
      </div>
    </AppShell>
  );
}
