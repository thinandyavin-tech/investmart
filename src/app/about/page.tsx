import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/Card";

export const metadata: Metadata = { title: "เกี่ยวกับ InvestMart" };

export default function AboutPage() {
  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-6">
        <div>
          <h1 className="text-sm font-bold uppercase tracking-widest mb-1">เกี่ยวกับ InvestMart</h1>
          <p className="text-[10px] text-[#8A8378]">แพลตฟอร์มเรียนรู้การลงทุนหุ้นอเมริกาสำหรับนักลงทุนไทย</p>
        </div>

        <Card className="p-4 flex flex-col gap-3">
          <h2 className="text-[11px] font-bold uppercase tracking-widest">InvestMart คืออะไร?</h2>
          <p className="text-[11px] leading-relaxed text-[#1F1A14]">
            InvestMart เป็นแพลตฟอร์มโซเชียลมีเดียและจำลองการลงทุนหุ้นอเมริกา
            ออกแบบมาสำหรับนักลงทุนไทยที่ต้องการเรียนรู้และฝึกฝนทักษะการลงทุน
            โดยไม่ต้องใช้เงินจริง
          </p>
          <p className="text-[11px] leading-relaxed text-[#1F1A14]">
            คุณสามารถซื้อขายหุ้นจำลองด้วยพอร์ตเงินสมมติ ติดตามผู้เทรดคนอื่น
            แชร์ไอเดียการลงทุน และวิเคราะห์หุ้นด้วย AI ที่ช่วยอธิบายในภาษาไทย
          </p>
        </Card>

        <Card className="p-4 flex flex-col gap-3">
          <h2 className="text-[11px] font-bold uppercase tracking-widest">ฟีเจอร์หลัก</h2>
          <ul className="flex flex-col gap-2 text-[11px]">
            {[
              { icon: "📊", title: "พอร์ตจำลอง", desc: "ซื้อขายหุ้นจำลองด้วย Cash เริ่มต้น ฝึกฝนก่อนลงทุนจริง" },
              { icon: "🤖", title: "AI วิเคราะห์", desc: "วิเคราะห์หุ้นด้วย AI ในมุมมอง 30 สไตล์การลงทุน ภาษาไทย" },
              { icon: "📡", title: "Radar สแกน", desc: "สแกนหุ้นโมเมนตัมสูงจาก S&P 500 และ NASDAQ 100 แบบเรียลไทม์" },
              { icon: "🌐", title: "โซเชียล", desc: "โพสต์ไอเดีย ติดตามเทรดเดอร์ และแชร์ข้อมูลในชุมชน" },
              { icon: "📰", title: "ข่าวหุ้น", desc: "ข่าวตลาดหุ้นอเมริกาพร้อม AI สรุปภาษาไทย" },
              { icon: "🏆", title: "Leaderboard", desc: "อันดับนักลงทุนที่พอร์ตเติบโตสูงสุดในชุมชน" },
            ].map(({ icon, title, desc }) => (
              <li key={title} className="flex gap-2">
                <span className="text-base flex-shrink-0">{icon}</span>
                <div>
                  <span className="font-bold">{title}</span>
                  <span className="text-[#8A8378]"> — {desc}</span>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-4 flex flex-col gap-2">
          <h2 className="text-[11px] font-bold uppercase tracking-widest">ข้อมูลและแหล่งที่มา</h2>
          <p className="text-[10px] text-[#8A8378] leading-relaxed">
            ราคาหุ้นและข้อมูลตลาดจาก{" "}
            <span className="font-bold text-[#1F1A14]">Finnhub</span>{" "}
            · ข่าวจาก Finnhub News API
            · AI วิเคราะห์จาก Groq (Llama) และ Google Gemini
            · ข้อมูลประวัติราคาจาก Stooq
          </p>
          <p className="text-[10px] text-[#DC2626] font-bold">
            ข้อมูลทั้งหมดมีความล่าช้าและเพื่อการศึกษาเท่านั้น ไม่ใช่คำแนะนำการลงทุน
          </p>
        </Card>

        <div className="flex gap-4 text-[10px]">
          <Link href="/privacy" className="text-[#5B8A2A] hover:underline">นโยบายความเป็นส่วนตัว</Link>
          <Link href="/terms"   className="text-[#5B8A2A] hover:underline">ข้อกำหนดการใช้งาน</Link>
          <Link href="/"        className="text-[#8A8378] hover:underline">กลับหน้าหลัก</Link>
        </div>
      </div>
    </AppShell>
  );
}
