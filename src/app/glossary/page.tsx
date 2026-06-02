import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/Card";

export const metadata: Metadata = { title: "คำศัพท์การลงทุน — InvestMart" };

const TERMS = [
  {
    category: "พื้นฐาน",
    items: [
      { th: "หุ้น (Stock)", en: "Stock / Share", desc: "ส่วนความเป็นเจ้าของในบริษัท เมื่อซื้อหุ้น คุณกลายเป็นผู้ถือหุ้น (shareholder) ของบริษัทนั้น" },
      { th: "ตลาดหุ้น (Stock Market)", en: "Stock Market", desc: "ตลาดที่นักลงทุนซื้อและขายหุ้น ตลาดหลักในอเมริกาคือ NYSE และ NASDAQ" },
      { th: "ราคาเปิด/ปิด (Open/Close)", en: "Open / Close Price", desc: "ราคาแรกของวัน (Open) และราคาสุดท้ายก่อนตลาดปิด (Close)" },
      { th: "ปริมาณซื้อขาย (Volume)", en: "Volume", desc: "จำนวนหุ้นที่มีการซื้อขายในช่วงเวลาที่กำหนด Volume สูง = นักลงทุนสนใจมาก" },
      { th: "กำไร/ขาดทุน (P&L)", en: "Profit & Loss (P&L)", desc: "ผลต่างระหว่างราคาขายกับต้นทุน ถ้าบวกคือกำไร (Profit) ถ้าลบคือขาดทุน (Loss)" },
    ],
  },
  {
    category: "การวิเคราะห์",
    items: [
      { th: "P/E Ratio", en: "Price-to-Earnings Ratio", desc: "อัตราส่วนราคาต่อกำไรต่อหุ้น เช่น P/E = 20 หมายความว่าจ่าย $20 เพื่อกำไร $1 ค่าสูง = แพง, ค่าต่ำ = ถูก" },
      { th: "Market Cap", en: "Market Capitalization", desc: "มูลค่าตลาดรวมของบริษัท คำนวณจาก ราคาหุ้น × จำนวนหุ้นทั้งหมด" },
      { th: "EPS", en: "Earnings Per Share", desc: "กำไรต่อหุ้น คือกำไรสุทธิหารด้วยจำนวนหุ้น ยิ่งสูงยิ่งดี" },
      { th: "Beta", en: "Beta", desc: "วัดความผันผวนเทียบกับตลาด Beta > 1 = ผันผวนกว่าตลาด, Beta < 1 = เสถียรกว่า" },
      { th: "RSI", en: "Relative Strength Index", desc: "อินดิเคเตอร์โมเมนตัม 0-100: RSI > 70 = Overbought (แพงเกิน), RSI < 30 = Oversold (ถูกเกิน)" },
      { th: "Moving Average (MA)", en: "Moving Average", desc: "ค่าเฉลี่ยราคาในช่วงเวลา เช่น MA50 = ค่าเฉลี่ย 50 วัน ใช้ดูเทรนด์" },
    ],
  },
  {
    category: "กลยุทธ์",
    items: [
      { th: "Bull Market", en: "Bull Market", desc: "ตลาดกระทิง — ตลาดขาขึ้น ราคาโดยรวมสูงขึ้นต่อเนื่อง" },
      { th: "Bear Market", en: "Bear Market", desc: "ตลาดหมี — ตลาดขาลง ราคาตกลงมากกว่า 20% จากจุดสูงสุด" },
      { th: "Dollar-Cost Averaging (DCA)", en: "Dollar-Cost Averaging", desc: "ซื้อหุ้นสม่ำเสมอในจำนวนเงินเท่ากันทุกเดือน ลดความเสี่ยงจากเวลาเข้า" },
      { th: "Diversification", en: "Diversification", desc: "การกระจายความเสี่ยง — ไม่ใส่เงินทั้งหมดในหุ้นตัวเดียว" },
      { th: "Stop Loss", en: "Stop Loss", desc: "คำสั่งขายอัตโนมัติเมื่อราคาตกถึงระดับที่กำหนด เพื่อจำกัดการขาดทุน" },
      { th: "Buy the Dip", en: "Buy the Dip", desc: "กลยุทธ์ซื้อเพิ่มเมื่อราคาตก เชื่อว่าราคาจะฟื้นในระยะยาว" },
    ],
  },
  {
    category: "เครื่องมือ InvestMart",
    items: [
      { th: "Radar", en: "Momentum Radar", desc: "เครื่องมือสแกนหุ้นโมเมนตัมสูงจาก S&P 500 และ NASDAQ คัดหุ้นที่มีแนวโน้มน่าสนใจในระยะสั้น" },
      { th: "Momentum Score", en: "Momentum Score", desc: "คะแนน 0-100 ที่ InvestMart คำนวณจากราคา ปริมาณ และความแข็งแกร่งของเทรนด์" },
      { th: "AI Outlook", en: "AI Analysis", desc: "การวิเคราะห์หุ้นด้วย AI ในมุมมอง 30 สไตล์การลงทุน เช่น Value, Growth, Momentum" },
      { th: "Paper Trading", en: "Paper Trading / Simulator", desc: "การซื้อขายจำลองโดยไม่ใช้เงินจริง เพื่อฝึกฝนและทดสอบกลยุทธ์ InvestMart ให้ ฿1,250,000 เริ่มต้น" },
    ],
  },
];

export default function GlossaryPage() {
  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-6">
        <div>
          <h1 className="text-sm font-bold uppercase tracking-widest mb-1">
            คำศัพท์การลงทุน
          </h1>
          <p className="text-[10px] text-[#8A8378]">
            คำศัพท์ที่ใช้บ่อยในตลาดหุ้นอเมริกา อธิบายเป็นภาษาไทย
          </p>
        </div>

        {TERMS.map(({ category, items }) => (
          <section key={category}>
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-[#8A8378] mb-2">
              {category}
            </h2>
            <div className="flex flex-col gap-2">
              {items.map(({ th, en, desc }) => (
                <Card key={en} className="p-3">
                  <div className="flex items-start gap-2 mb-1">
                    <span className="font-bold text-[11px] text-[#1F1A14]">{th}</span>
                    <span className="text-[9px] text-[#8A8378] mt-0.5 flex-shrink-0">{en}</span>
                  </div>
                  <p className="text-[10px] text-[#8A8378] leading-relaxed">{desc}</p>
                </Card>
              ))}
            </div>
          </section>
        ))}

        <p className="text-[9px] text-[#8A8378] text-center">
          คำศัพท์เพื่อการศึกษา · ไม่ใช่คำแนะนำการลงทุน
        </p>
      </div>
    </AppShell>
  );
}
