import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";

import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/Card";

export const metadata: Metadata = {
  title:       "บทเรียนสั้น — InvestMart",
  description: "บทเรียนการลงทุนสั้น ๆ ภาษาไทย: paper trading คืออะไร อ่านกราฟหุ้น AI วิเคราะห์ได้แค่ไหน",
};

const LESSONS = [
  {
    id: "paper-trading",
    icon: "💸",
    title: "Paper Trading คืออะไร และทำไมต้องฝึกก่อน",
    readTime: "2 นาที",
    body: [
      {
        heading: "เงินจำลองไม่ใช่เงินจริง",
        text: `Paper trading คือการซื้อขายหุ้นโดยไม่ใช้เงินจริง ราคาหุ้นเป็นข้อมูลจากตลาดจริง แต่เงินในบัญชีเป็นเงินสมมติ
InvestMart ให้เงินเริ่มต้น ฿1,250,000 เพื่อจำลองการบริหารพอร์ต ไม่มีการโอนเงินจริงเกิดขึ้น`,
      },
      {
        heading: "ประโยชน์ของ Paper Trading",
        text: `ช่วยให้เรียนรู้กลไกตลาด: เวลาซื้อขาย, การคำนวณกำไร/ขาดทุน, ผลของ market cap ต่อการเคลื่อนไหวของราคา
สามารถลองกลยุทธ์ต่าง ๆ เช่น buy the dip, momentum หรือ value investing โดยไม่เสียเงินจริง
เห็นผลการตัดสินใจในเวลาสั้น เปรียบเทียบกับนักลงทุนคนอื่นใน leaderboard`,
      },
      {
        heading: "ข้อจำกัดที่ต้องเข้าใจ",
        text: `Paper trading ไม่มีแรงกดดันทางจิตใจเหมือนเงินจริง ในชีวิตจริง นักลงทุนหลายคนเทรดได้ดีตอน "ฝึก" แต่พลาดเมื่อใช้เงินจริงเพราะอารมณ์เข้ามาเกี่ยวข้อง
ผล leaderboard หรือกำไรจำลองไม่ได้รับประกันผลในตลาดจริง ใช้เป็นเครื่องมือเรียนรู้ ไม่ใช่ตัดสินความสามารถ`,
      },
    ],
  },
  {
    id: "reading-charts",
    icon: "📊",
    title: "อ่านกราฟหุ้นเบื้องต้น",
    readTime: "3 นาที",
    body: [
      {
        heading: "กราฟแบบ Area Chart",
        text: `InvestMart แสดงกราฟ area chart (พื้นที่ใต้เส้น) สำหรับดูราคาย้อนหลัง แกน X คือเวลา (1D, 1W, 1M, 3M, 1Y, 5Y) แกน Y คือราคา
เส้นสีเขียว = ราคาปิดปัจจุบันสูงกว่าราคาเปิด · เส้นสีแดง = ต่ำกว่า`,
      },
      {
        heading: "OHLC — สี่ตัวเลขที่สำคัญ",
        text: `O = Open (ราคาเปิดตลาด) · H = High (ราคาสูงสุดในวัน) · L = Low (ราคาต่ำสุด) · C = Close (ราคาปิด)
ช่องว่างระหว่าง High และ Low คือ "daily range" บอกว่าวันนั้นตลาดผันผวนมากแค่ไหน`,
      },
      {
        heading: "ปริมาณซื้อขาย (Volume)",
        text: `แท่ง volume ใต้กราฟแสดงว่ามีหุ้นถูกซื้อขายมากแค่ไหน ราคาขึ้น + volume สูง = สัญญาณที่น่าเชื่อถือกว่า
ราคาขึ้น + volume ต่ำอาจหมายความว่าแรงซื้อจำกัด อาจย่อตัวได้ง่าย`,
      },
      {
        heading: "ไม่มีกราฟไหนบอกอนาคตได้แน่นอน",
        text: `กราฟบอกสิ่งที่เกิดขึ้นแล้ว ไม่ใช่สิ่งที่จะเกิดขึ้น การวิเคราะห์เทคนิคอลใช้รูปแบบในอดีตเพื่อประเมินความน่าจะเป็น — แต่ตลาดสามารถทำสิ่งที่ผิดคาดได้เสมอ`,
      },
    ],
  },
  {
    id: "ai-analysis",
    icon: "🤖",
    title: "AI วิเคราะห์หุ้น — ทำได้และทำไม่ได้อะไร",
    readTime: "2 นาที",
    body: [
      {
        heading: "AI ทำอะไรได้",
        text: `สรุปข้อมูลตัวเลขจำนวนมากให้อ่านเข้าใจง่ายในภาษาไทย อธิบายกรณี bull/base/bear ด้วยภาษาที่เป็นกลาง
ย่อข่าวที่เกี่ยวข้องและบอกว่าผลกระทบอาจเป็นอะไร ตั้งคำถามที่ควรคิดต่อก่อนตัดสินใจ`,
      },
      {
        heading: "AI ทำไม่ได้",
        text: `AI ไม่รู้ข้อมูล insider ข่าว earnings ที่ยังไม่ประกาศ หรือเหตุการณ์ที่จะเกิดในอนาคต
AI ไม่รับผิดชอบผลการลงทุน และบางครั้งอาจ "hallucinate" คือสร้างประโยคที่ฟังดูน่าเชื่อแต่ผิดข้อเท็จจริง
AI ไม่สามารถรู้ว่าหุ้นจะขึ้นหรือลงพรุ่งนี้ ใครที่บอกว่า AI ทำได้กำลังพูดเกินจริง`,
      },
      {
        heading: "ใช้ AI ให้เกิดประโยชน์",
        text: `ถามคำถามเพื่อเรียนรู้ เช่น "อธิบาย beta ของ TSLA ให้ฟัง" หรือ "ความเสี่ยงหลักของ NVDA ในปีนี้คืออะไร"
ใช้การวิเคราะห์ AI เป็นจุดเริ่มต้นในการค้นคว้าเพิ่ม ไม่ใช่บทสรุปสุดท้าย
ตรวจสอบตัวเลขและข่าวที่ AI อ้างกับแหล่งต้นฉบับเสมอ`,
      },
    ],
  },
];

export default function LessonsPage() {
  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/learn" className="text-xs text-[#8A8378] hover:underline">
              ← เรียนรู้
            </Link>
          </div>
          <h1 className="text-sm font-bold uppercase tracking-widest">บทเรียนสั้น</h1>
          <p className="text-xs text-[#8A8378] mt-0.5">3 บทสั้น เขียนเฉพาะสำหรับ InvestMart</p>
        </div>

        {LESSONS.map((lesson) => (
          <section key={lesson.id} id={lesson.id} className="flex flex-col gap-3 scroll-mt-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{lesson.icon}</span>
              <div>
                <h2 className="text-xs font-bold text-[#1F1A14]">
                  {lesson.title}
                </h2>
                <span className="text-xs text-[#8A8378]">อ่าน ~{lesson.readTime}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {lesson.body.map((section) => (
                <Card key={section.heading} className="p-3">
                  <h3 className="text-xs font-bold mb-1.5">{section.heading}</h3>
                  {section.text.split("\n").map((line, i) => (
                    line.trim()
                      ? <p key={i} className="text-xs text-[#8A8378] leading-relaxed">{line}</p>
                      : <div key={i} className="h-1" />
                  ))}
                </Card>
              ))}
            </div>
          </section>
        ))}

        <div className="flex flex-wrap gap-4 text-xs pt-2 border-t border-[#e9edc9]">
          <Link href="/radar"  className="text-[#5B8A2A] hover:underline">เปิดเรดาร์</Link>
          <Link href="/glossary" className="text-[#5B8A2A] hover:underline">คำศัพท์</Link>
          <Link href="/learn"  className="text-[#8A8378] hover:underline">← กลับหน้าเรียนรู้</Link>
        </div>
      </div>
    </AppShell>
  );
}
