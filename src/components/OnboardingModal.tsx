"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useUser } from "@/lib/userContext";
import { OffsetButton } from "@/components/OffsetButton";

const STORAGE_KEY = "investmart_onboarding_v1";

export function OnboardingModal() {
  const { user, loading } = useUser();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    // Show for demo users or users with no trades who haven't dismissed
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed) return;
    if (user.isDemo || user.tradeCount === 0) {
      setVisible(true);
    }
  }, [user, loading]);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end lg:items-center justify-center bg-black/40"
      onClick={dismiss}
    >
      <div
        className="w-full max-w-sm mx-4 mb-4 lg:mb-0 border-2 border-[#1F1A14] bg-[#F3EDE0]"
        style={{ boxShadow: "6px 6px 0 #1F1A14" }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="ยินดีต้อนรับสู่ InvestMart"
      >
        {/* Title bar */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-[#000080]">
          <span className="text-white text-xs font-bold tracking-widest">INVESTMART SIMULATOR</span>
          <button
            onClick={dismiss}
            className="text-white text-xs border border-[#8080FF] bg-[#0000C0] px-2 py-0.5 hover:bg-[#000080]"
            aria-label="ปิด"
          >
            ×
          </button>
        </div>

        <div className="p-4 flex flex-col gap-3">
          <div>
            <h2 className="text-sm font-bold mb-1">ยินดีต้อนรับสู่ InvestMart</h2>
            <p className="text-[10px] text-[#8A8378] leading-relaxed">
              โซเชียลมีเดียหุ้นอเมริกา พร้อม simulator ฝึกเทรดโดยไม่ใช้เงินจริง
            </p>
          </div>

          <div className="border border-dashed border-[#5B8A2A] bg-[#F8FDF2] p-3 flex flex-col gap-1.5">
            <p className="text-[10px] font-bold text-[#5B8A2A] uppercase tracking-widest">พอร์ตเริ่มต้นของคุณ</p>
            <p className="text-2xl font-bold" style={{ fontFamily: "var(--font-mono)" }}>฿1,250,000</p>
            <p className="text-[9px] text-[#8A8378]">เงินจำลอง · ไม่ใช่เงินจริง · ใช้ฝึกกลยุทธ์ได้เต็มที่</p>
          </div>

          <div className="flex flex-col gap-1.5 text-[10px]">
            {[
              { icon: "📡", text: "สแกนหุ้น momentum สูงจาก S&P 500 และ NASDAQ ด้วยเรดาร์" },
              { icon: "🤖", text: "วิเคราะห์หุ้นด้วย AI ใน 30 สไตล์การลงทุน" },
              { icon: "🏆", text: "แข่งขันกับนักลงทุนคนอื่นบน Leaderboard" },
              { icon: "📖", text: "เรียนรู้คำศัพท์การลงทุนภาษาไทยใน Glossary" },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-start gap-2">
                <span>{icon}</span>
                <span className="text-[#8A8378] leading-relaxed">{text}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-1">
            <Link href="/radar" onClick={dismiss} className="flex-1">
              <OffsetButton variant="lime" className="w-full text-center text-[11px]">
                📡 เริ่มสแกนหุ้น
              </OffsetButton>
            </Link>
            <Link href="/glossary" onClick={dismiss} className="flex-1">
              <OffsetButton variant="black" className="w-full text-center text-[11px]">
                📖 คำศัพท์
              </OffsetButton>
            </Link>
          </div>

          <button
            onClick={dismiss}
            className="text-[9px] text-[#8A8378] underline text-center"
          >
            ปิด · ไม่แสดงอีก
          </button>
        </div>
      </div>
    </div>
  );
}
