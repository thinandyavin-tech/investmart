import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";

import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/Card";

export const metadata: Metadata = {
  title:       "เรดาร์ทำงานอย่างไร — InvestMart",
  description: "อธิบายวิธีคำนวณ Momentum Score และข้อจำกัดของเรดาร์ InvestMart ที่ต้องรู้ก่อนใช้",
};

export default function RadarTransparencyPage() {
  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/learn" className="text-xs text-[#8A8378] hover:underline">
              ← เรียนรู้
            </Link>
          </div>
          <h1 className="text-sm font-bold uppercase tracking-widest">เรดาร์ทำงานอย่างไร</h1>
          <p className="text-xs text-[#8A8378] mt-0.5">และข้อจำกัดที่ควรรู้ก่อนตัดสินใจ</p>
        </div>

        {/* Disclaimer first — most important */}
        <Card className="p-3 border-l-4" style={{ borderLeftColor: "#DC2626" }}>
          <p className="text-xs font-bold text-[#DC2626] leading-relaxed">
            เรดาร์เป็นเครื่องมือคัดกรองไอเดีย ไม่ใช่สัญญาณซื้อ
            หุ้นที่ติดเรดาร์วันนี้ไม่ได้หมายความว่าจะขึ้นต่อพรุ่งนี้
          </p>
        </Card>

        {/* What it does */}
        <Card className="p-4 flex flex-col gap-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#8A8378]">
            เรดาร์ทำอะไร
          </h2>
          <p className="text-xs leading-relaxed">
            เรดาร์สแกนหุ้นใน S&P 500, Nasdaq 100 และ SET 100 ทุกวัน โดยดึงข้อมูลราคาและปริมาณซื้อขาย
            จาก Finnhub API แล้วคำนวณคะแนนให้หุ้นแต่ละตัว จากนั้นเรียงลำดับและแสดงหุ้นที่มีสัญญาณ
            momentum ผิดปกติไว้ที่หน้าต้น ๆ
          </p>
          <p className="text-xs leading-relaxed text-[#8A8378]">
            เครื่องมือนี้ช่วยย่นเวลาในการสแกนหาหุ้นที่กำลัง "เคลื่อนไหว" จากรายชื่อหลายร้อยตัว
            แทนที่จะต้องไล่ดูทีละตัวด้วยตัวเอง
          </p>
        </Card>

        {/* Score breakdown */}
        <Card className="p-4 flex flex-col gap-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#8A8378]">
            วิธีคิดคะแนน (0–100)
          </h2>
          <p className="text-xs text-[#8A8378]">
            Momentum Score รวมสามส่วน คำนวณจากข้อมูลจริง ไม่มี AI หรือ black box เข้ามาเกี่ยวข้องในขั้นตอนนี้
          </p>

          <div className="flex flex-col gap-3">
            {([
              {
                name:    "Breakout Score (50%)",
                formula: "การเปลี่ยนแปลงราคา 1 วัน × 3 + Volume Surge × 10 (สูงสุด 50) + RSI ส่วนเกิน 60",
                explain: "วัดว่าหุ้นกำลัง breakout แค่ไหนในวันนั้น คะแนนสูงหมายถึงราคาขึ้นแรง + ปริมาณพุ่ง",
                color: "#5B8A2A",
              },
              {
                name:    "Quality Score (30%)",
                formula: "RSI ในช่วง 45–75 = 40pt · Market Cap ใหญ่ = 30pt · Volume Surge ≥ 1.5× = 30pt",
                explain: "กรองหุ้น junk ออก หุ้นที่ขึ้นเพราะถูกปั่นจะได้คะแนนคุณภาพต่ำ RSI > 75 ก็ลดคะแนนเพราะ overbought",
                color: "#2563EB",
              },
              {
                name:    "Volume Factor (20%)",
                formula: "min(20, Volume Surge × 2)",
                explain: "ให้น้ำหนักเพิ่มอีกครั้งกับปริมาณซื้อขาย เพราะ momentum ที่มาพร้อม volume สูงน่าเชื่อถือกว่า",
                color: "#9333EA",
              },
            ] as const).map((s) => (
              <div key={s.name} className="border-l-2 pl-3" style={{ borderLeftColor: s.color }}>
                <p className="text-xs font-bold mb-0.5">{s.name}</p>
                <p className="text-xs font-mono text-[#8A8378] mb-1 break-words">{s.formula}</p>
                <p className="text-xs text-[#8A8378] leading-relaxed">{s.explain}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Categories */}
        <Card className="p-4 flex flex-col gap-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#8A8378]">
            หมวดหมู่ของเรดาร์
          </h2>
          <div className="flex flex-col gap-2 text-xs">
            {([
              ["TOP100",     "หุ้นใน S&P 500 / Nasdaq 100 ที่ผ่านเกณฑ์ momentum"],
              ["STRONG",     "Quality Score ≥ 70 และราคาขึ้น — สัญญาณที่สม่ำเสมอกว่า"],
              ["DARK HORSE", "หุ้น small-cap ที่ volume พุ่งมากกว่า 2× — ความเสี่ยงสูง โอกาสสูง"],
              ["REVIVED",    "หุ้นที่ตกหนักสัปดาห์ก่อน (> -10%) แต่วันนี้ฟื้นตัวมา > 3%"],
            ] as const).map(([cat, desc]) => (
              <div key={cat} className="flex gap-2">
                <span className="font-mono font-bold text-xs bg-[#E8E2D4] px-1.5 py-0.5 rounded flex-shrink-0 h-fit">{cat}</span>
                <span className="text-[#8A8378]">{desc}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Limits — the honest part */}
        <Card className="p-4 flex flex-col gap-3 border-2 border-amber-200 bg-amber-50">
          <h2 className="text-xs font-bold uppercase tracking-widest text-amber-700">
            ⚠️ ข้อจำกัดที่ต้องรู้
          </h2>
          <ul className="flex flex-col gap-2.5 text-xs">
            {([
              "เรดาร์หาหุ้นที่กำลังขึ้น ไม่ใช่หาหุ้นที่จะขึ้นต่อ momentum สามารถพลิกกลับได้ทันทีโดยไม่มีสัญญาณเตือน",
              "หุ้นที่มี RSI สูง (overbought) บนเรดาร์หมายความว่ามันขึ้นมามากแล้ว — ความเสี่ยงขาลงสูงกว่าปกติ",
              "คะแนนคำนวณจากข้อมูล 1 วัน ไม่ได้บอกอะไรเกี่ยวกับปัจจัยพื้นฐาน กำไรบริษัท หรือแนวโน้มระยะยาว",
              "ข้อมูลอาจล่าช้าได้ถึง 15 นาทีขึ้นอยู่กับ API quota และเวลาที่แสแกนครั้งล่าสุด",
              "ผลการสแกนในอดีตไม่ได้รับประกันผลในอนาคต นี่คือหลักสถิติพื้นฐาน",
            ] as const).map((line) => (
              <li key={line} className="flex gap-2 items-start">
                <span className="flex-shrink-0 text-amber-600 font-bold">·</span>
                <span className="text-[#1F1A14] leading-relaxed">{line}</span>
              </li>
            ))}
          </ul>
        </Card>

        {/* AI analysis note */}
        <Card className="p-4 flex flex-col gap-2">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#8A8378]">
            AI วิเคราะห์คืออะไร
          </h2>
          <p className="text-xs leading-relaxed">
            เมื่อเลือกหุ้นในเรดาร์ AI จะอธิบายว่าทำไมหุ้นนั้นถึงติดเรดาร์ โดยอ้างอิงจากข้อมูลตัวเลข
            และข่าวล่าสุด เนื้อหา AI เป็นการ<strong>ประเมินความน่าจะเป็น</strong> ไม่ใช่การยืนยัน
            และไม่ใช่คำแนะนำให้ซื้อหรือขาย
          </p>
          <p className="text-xs text-[#8A8378] leading-relaxed">
            AI สามารถผิดพลาดได้ สร้างข้อความที่ฟังดูน่าเชื่อแต่ไม่ถูกต้อง (hallucination) และไม่รู้ข้อมูล
            insider หรือ event ที่ยังไม่เกิดขึ้น ให้ถือว่าเป็นจุดเริ่มต้นในการค้นคว้าต่อ ไม่ใช่คำตอบสุดท้าย
          </p>
        </Card>

        <div className="flex flex-wrap gap-4 text-xs pt-2 border-t border-[#E8E2D4]">
          <Link href="/glossary#momentum-score" className="text-[#5B8A2A] hover:underline">
            อ่านนิยาม Momentum Score →
          </Link>
          <Link href="/radar"   className="text-[#5B8A2A] hover:underline">เปิดเรดาร์</Link>
          <Link href="/learn"   className="text-[#8A8378] hover:underline">← กลับหน้าเรียนรู้</Link>
        </div>
      </div>
    </AppShell>
  );
}
