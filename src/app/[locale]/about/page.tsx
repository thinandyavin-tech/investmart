import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";

import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/Card";

export const metadata: Metadata = {
  title:       "เกี่ยวกับ InvestMart",
  description: "InvestMart คืออะไร สร้างมาเพื่ออะไร และข้อมูลมาจากไหน",
};

export default function AboutPage() {
  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-5">
        <div>
          <h1 className="text-sm font-bold uppercase tracking-widest mb-1">เกี่ยวกับ InvestMart</h1>
          <p className="text-xs text-[#8A8378]">แพลตฟอร์มเรียนรู้การลงทุนสำหรับนักลงทุนไทย</p>
        </div>

        <Card className="p-4 flex flex-col gap-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#8A8378]">
            เราทำอะไร และทำเพื่ออะไร
          </h2>
          <p className="text-xs leading-relaxed">
            InvestMart เกิดมาจากคำถามที่ว่า "จะเรียนรู้ตลาดหุ้นสหรัฐได้อย่างไรโดยไม่ต้องเสียเงินจริง?"
            คำตอบคือแพลตฟอร์มที่รวมสามสิ่งไว้ด้วยกัน: เครื่องมือสแกนหุ้น (เรดาร์), พอร์ตจำลอง
            และชุมชนเพื่อแลกเปลี่ยนความคิดเห็น — ทุกอย่างเป็นภาษาไทย
          </p>
          <p className="text-xs leading-relaxed text-[#8A8378]">
            เราเชื่อว่าการ "ลองเล่น" ด้วยเงินสมมติก่อนตัดสินใจจริงนั้นสำคัญ
            ตลาดหุ้นมีความซับซ้อนมากกว่าที่หลายแหล่งข้อมูลพูดถึง
            InvestMart พยายามแสดงความจริงทั้งสองด้าน — โอกาสและความเสี่ยง
          </p>
        </Card>

        <Card className="p-4 flex flex-col gap-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#8A8378]">
            ฟีเจอร์หลัก
          </h2>
          <ul className="flex flex-col gap-2 text-xs">
            {([
              ["📡", "Momentum Radar",   "สแกนหุ้นใน S&P 500, Nasdaq 100 และ SET 100 หาสัญญาณที่ผิดปกติ คำนวณจาก breakout score + quality score + volume"],
              ["💹", "พอร์ตจำลอง",       "ซื้อขายหุ้นด้วยราคาจริง (อาจล่าช้า) ด้วยเงินสมมติ ฝึกกลยุทธ์ก่อนใช้เงินจริง"],
              ["🤖", "AI วิเคราะห์",     "Groq (Llama) และ Google Gemini ช่วยอธิบายการเคลื่อนไหวของหุ้น bull/base/bear cases และสรุปข่าวเป็นภาษาไทย"],
              ["👥", "ชุมชน",            "โพสต์ไอเดีย ติดตามเทรดเดอร์ แชร์ความคิดเห็น และดู leaderboard เพื่อเรียนรู้จากคนอื่น"],
              ["📰", "ข่าวตลาด",         "ข่าวหุ้นจาก Finnhub พร้อม AI สรุปภาษาไทย และหน้าภาพรวมตลาดรายวัน"],
            ] as const).map(([icon, title, desc]) => (
              <li key={title} className="flex gap-2 items-start">
                <span className="text-lg flex-shrink-0">{icon}</span>
                <div>
                  <span className="font-bold">{title}</span>
                  <span className="text-[#8A8378]"> — {desc}</span>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-4 flex flex-col gap-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#8A8378]">
            แหล่งข้อมูลและเครื่องมือที่ใช้
          </h2>
          <div className="flex flex-col gap-2 text-xs">
            {([
              ["Finnhub API",       "ราคาหุ้น ข้อมูลบริษัท ปริมาณซื้อขาย และข่าวสำหรับตลาดสหรัฐและ SET ไทย"],
              ["Stooq",             "ข้อมูลราคาย้อนหลังสำหรับกราฟระยะยาว (ฟรี ไม่ต้อง API key)"],
              ["Groq / Llama",      "โมเดลภาษา (LLM) หลักสำหรับการวิเคราะห์ภาษาไทย"],
              ["Google Gemini",     "LLM สำรองเมื่อ Groq ไม่พร้อมใช้งาน"],
              ["Neon Postgres",     "ฐานข้อมูล cloud สำหรับบัญชีผู้ใช้ พอร์ต และโพสต์"],
              ["Vercel",            "Hosting และ serverless functions"],
              ["Next.js / Tailwind","Framework หลักของเว็บไซต์"],
            ] as const).map(([source, desc]) => (
              <div key={source} className="flex gap-3">
                <span className="font-bold text-[#1F1A14] dark:text-slate-200 w-32 flex-shrink-0">{source}</span>
                <span className="text-[#8A8378]">{desc}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-3 flex flex-col gap-1.5">
          <p className="text-xs font-bold text-[#DC2626]">ข้อความสำคัญ</p>
          <p className="text-xs text-[#8A8378] leading-relaxed">
            ข้อมูลและการวิเคราะห์ทั้งหมดบน InvestMart มีวัตถุประสงค์เพื่อการศึกษาเท่านั้น
            ไม่ใช่คำแนะนำในการซื้อหรือขายหลักทรัพย์ ราคาหุ้นที่แสดงอาจมีความล่าช้าและไม่ใช่ราคาซื้อขายจริง
            InvestMart ไม่ใช่บริษัทหลักทรัพย์หรือที่ปรึกษาทางการเงิน
          </p>
        </Card>

        <div className="flex flex-wrap gap-4 text-xs pt-2 border-t border-[#E8E2D4]">
          <Link href="/learn"   className="text-[#5B8A2A] hover:underline">ส่วนเรียนรู้</Link>
          <Link href="/faq"     className="text-[#5B8A2A] hover:underline">คำถามที่พบบ่อย</Link>
          <Link href="/privacy" className="text-[#5B8A2A] hover:underline">นโยบายความเป็นส่วนตัว</Link>
          <Link href="/terms"   className="text-[#5B8A2A] hover:underline">ข้อกำหนดการใช้งาน</Link>
          <Link href="/"        className="text-[#8A8378] hover:underline">กลับหน้าหลัก</Link>
        </div>
      </div>
    </AppShell>
  );
}
