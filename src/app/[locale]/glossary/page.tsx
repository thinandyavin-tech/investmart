import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";

import { AppShell } from "@/components/AppShell";
import { GlossaryClient } from "./GlossaryClient";

export const metadata: Metadata = {
  title:       "คำศัพท์การลงทุน — InvestMart",
  description: "คำศัพท์หุ้นและการลงทุนอธิบายเป็นภาษาไทย สำหรับนักลงทุนที่เริ่มต้นศึกษาตลาดหุ้นสหรัฐ",
};

export default function GlossaryPage() {
  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/learn" className="text-xs text-[#8A8378] hover:underline">
              ← เรียนรู้
            </Link>
          </div>
          <h1 className="text-sm font-bold uppercase tracking-widest">คำศัพท์การลงทุน</h1>
          <p className="text-xs text-[#8A8378] mt-0.5">
            คำศัพท์ที่ใช้บ่อยในตลาดหุ้น อธิบายเป็นภาษาไทยพร้อมตัวอย่าง
          </p>
        </div>

        <GlossaryClient />
      </div>
    </AppShell>
  );
}
