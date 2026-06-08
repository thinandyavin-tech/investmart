import type { Metadata } from "next";
import Link from "next/link";

import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/Card";

export const metadata: Metadata = {
  title:       "เรียนรู้ — InvestMart",
  description: "คู่มือการลงทุนภาษาไทย คำศัพท์หุ้น เรดาร์ทำงานอย่างไร และบทเรียนสั้น",
};

const SECTIONS = [
  {
    href:  "/glossary",
    icon:  "📖",
    title: "คำศัพท์การลงทุน",
    desc:  "คำนิยามสั้นชัดของคำศัพท์ที่แอปนี้ใช้จริง เช่น RSI, P/E, Momentum Score, Breakout — อธิบายภาษาไทยพร้อมตัวอย่าง ค้นหาได้",
    tag:   "ค้นหาได้",
  },
  {
    href:  "/learn/radar",
    icon:  "📡",
    title: "เรดาร์ทำงานอย่างไร — และข้อจำกัด",
    desc:  "อธิบายวิธีคิดคะแนน Momentum, Breakout, Quality โดยใช้ข้อมูลจริง พร้อมตั้งใจบอกสิ่งที่เรดาร์ทำไม่ได้ เป็น transparency page ที่สำคัญที่สุด",
    tag:   "สำคัญมาก",
    tagColor: "#DC2626",
  },
  {
    href:  "/learn/lessons",
    icon:  "📚",
    title: "บทเรียนสั้น",
    desc:  "3 บทสั้น: Paper trading คืออะไร · อ่านกราฟหุ้นอย่างไร · AI วิเคราะห์ได้แค่ไหน ใช้เวลาอ่านบทละ 2–3 นาที",
    tag:   "3 บท",
  },
] as const;

export default function LearnPage() {
  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-6">
        <div>
          <h1 className="text-sm font-bold uppercase tracking-widest mb-1">เรียนรู้</h1>
          <p className="text-xs text-[#8A8378] leading-relaxed max-w-prose">
            ทุกอย่างในนี้เขียนขึ้นโดยตรงจากวิธีที่ InvestMart ทำงาน ไม่ใช่คัดลอกมาจากที่อื่น
            เป้าหมายคือให้คุณเข้าใจว่าแอปทำอะไร ทำไม่ได้อะไร และควรระวังอะไร
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {SECTIONS.map((s) => (
            <Link key={s.href} href={s.href} className="block group">
              <Card className="p-4 flex gap-3 items-start group-hover:shadow-md transition-shadow">
                <span className="text-2xl flex-shrink-0">{s.icon}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <h2 className="text-xs font-bold text-[#1F1A14] dark:text-slate-100">
                      {s.title}
                    </h2>
                    <span
                      className="text-xs font-bold px-1.5 py-0.5 rounded"
                      style={{
                        background: (s as { tagColor?: string }).tagColor ? "#FEE2E2" : "#F0FAE8",
                        color:      (s as { tagColor?: string }).tagColor ?? "#5B8A2A",
                      }}
                    >
                      {s.tag}
                    </span>
                  </div>
                  <p className="text-xs text-[#8A8378] leading-relaxed">{s.desc}</p>
                </div>
                <span className="text-[#8A8378] flex-shrink-0 group-hover:text-[#1F1A14] transition-colors" aria-hidden="true">→</span>
              </Card>
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap gap-4 text-xs pt-2 border-t border-[#E8E2D4]">
          <Link href="/faq"     className="text-[#5B8A2A] hover:underline">คำถามที่พบบ่อย (FAQ)</Link>
          <Link href="/about"   className="text-[#8A8378] hover:underline">เกี่ยวกับ InvestMart</Link>
          <Link href="/"        className="text-[#8A8378] hover:underline">กลับหน้าหลัก</Link>
        </div>
      </div>
    </AppShell>
  );
}
