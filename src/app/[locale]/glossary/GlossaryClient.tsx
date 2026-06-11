"use client";

import { useState, useId } from "react";
import { Card } from "@/components/Card";

export interface GlossaryTerm {
  id:       string;   // URL-safe slug for deep-linking e.g. #rsi
  th:       string;   // Thai name
  en:       string;   // English name
  category: string;
  body:     string;   // 1–3 sentences
  example?: string;   // optional example
}

const TERMS: GlossaryTerm[] = [
  // ─── ราคาและตลาด ──────────────────────────────────────────────────────────
  {
    id: "market-cap", th: "มูลค่าตลาด (Market Cap)", en: "Market Capitalization",
    category: "ราคาและตลาด",
    body: "มูลค่ารวมของบริษัทในตลาดหุ้น คำนวณจาก ราคาหุ้น × จำนวนหุ้นทั้งหมด บริษัทที่มี market cap สูงมักเรียกว่า Large-cap",
    example: "Apple ราคา $175 × หุ้น 15 พันล้านหุ้น = market cap ~$2.6 ล้านล้าน",
  },
  {
    id: "float", th: "หุ้นหมุนเวียน (Float)", en: "Float / Free Float",
    category: "ราคาและตลาด",
    body: "จำนวนหุ้นที่ซื้อขายได้จริงในตลาด ไม่นับหุ้นที่ผู้บริหารหรือกองทุนถือระยะยาว Float ต่ำหมายความว่าราคาเคลื่อนไหวได้ง่ายกว่าเมื่อมีปริมาณซื้อขายมาก",
  },
  {
    id: "52w-range", th: "ช่วงราคา 52 สัปดาห์", en: "52-Week Range",
    category: "ราคาและตลาด",
    body: "ราคาสูงสุดและต่ำสุดในรอบหนึ่งปีที่ผ่านมา ใช้ดูว่าราคาปัจจุบันอยู่ตรงไหนของช่วงนั้น ราคาใกล้ high อาจเป็นสัญญาณ breakout หรือ overbought ก็ได้",
    example: "ราคาปัจจุบัน $180 · 52W High $195 · 52W Low $130 → ราคาอยู่ที่ 77% ของช่วง",
  },
  {
    id: "volume", th: "ปริมาณซื้อขาย (Volume)", en: "Volume",
    category: "ราคาและตลาด",
    body: "จำนวนหุ้นที่มีการซื้อขายในช่วงเวลาหนึ่ง ปริมาณสูงกว่าปกติมักหมายความว่ามีข่าวสำคัญหรือนักลงทุนรายใหญ่เข้ามาเกี่ยวข้อง",
  },
  {
    id: "volume-surge", th: "การพุ่งขึ้นของปริมาณ (Volume Surge)", en: "Volume Surge",
    category: "ราคาและตลาด",
    body: "ปริมาณซื้อขายวันนี้เทียบกับค่าเฉลี่ย เช่น volume surge 3x หมายความว่าซื้อขายหนักเป็นสามเท่าปกติ InvestMart ใช้ตัวเลขนี้เป็นหนึ่งในสัญญาณเรดาร์",
    example: "ปกติ 5 ล้านหุ้น/วัน · วันนี้ 15 ล้านหุ้น = volume surge 3x",
  },
  // ─── การวิเคราะห์เชิงพื้นฐาน ──────────────────────────────────────────────
  {
    id: "pe", th: "P/E Ratio", en: "Price-to-Earnings Ratio",
    category: "การวิเคราะห์เชิงพื้นฐาน",
    body: "อัตราส่วนราคาต่อกำไรต่อหุ้น บอกว่านักลงทุนยอมจ่ายกี่บาทต่อกำไร 1 บาท P/E สูงมักหมายถึงนักลงทุนคาดหวังการเติบโต ในขณะที่ P/E ต่ำอาจหมายความว่าหุ้นถูกหรือธุรกิจกำลังมีปัญหา",
    example: "ราคา $100 · EPS $5 → P/E = 20 (จ่าย $20 ต่อกำไร $1)",
  },
  {
    id: "peg", th: "PEG Ratio", en: "Price/Earnings-to-Growth",
    category: "การวิเคราะห์เชิงพื้นฐาน",
    body: "P/E หารด้วยอัตราการเติบโตของกำไร ช่วยเปรียบเทียบหุ้นที่เติบโตต่างกัน PEG < 1 มักถือว่ายังถูกเมื่อเทียบกับการเติบโต PEG > 2 อาจแพงเกินไป",
    example: "P/E = 30 · อัตราเติบโต 20% → PEG = 1.5",
  },
  {
    id: "eps", th: "กำไรต่อหุ้น (EPS)", en: "Earnings Per Share",
    category: "การวิเคราะห์เชิงพื้นฐาน",
    body: "กำไรสุทธิของบริษัทหารด้วยจำนวนหุ้นที่ออกจำหน่าย EPS ที่เพิ่มขึ้นต่อเนื่องมักเป็นสัญญาณธุรกิจที่แข็งแกร่ง",
  },
  {
    id: "dividend-yield", th: "อัตราเงินปันผล (Dividend Yield)", en: "Dividend Yield",
    category: "การวิเคราะห์เชิงพื้นฐาน",
    body: "เงินปันผลต่อปีหารด้วยราคาหุ้น แสดงเป็นเปอร์เซ็นต์ หุ้นปันผลสูงให้กระแสเงินสดสม่ำเสมอ แต่บริษัทที่เติบโตเร็วมักไม่จ่ายปันผลเพื่อนำเงินไปลงทุนต่อ",
    example: "ปันผล $2/ปี · ราคาหุ้น $50 → Dividend Yield = 4%",
  },
  {
    id: "beta", th: "Beta", en: "Beta",
    category: "การวิเคราะห์เชิงพื้นฐาน",
    body: "วัดความผันผวนของหุ้นเทียบกับดัชนีตลาด Beta 1.0 = เคลื่อนไหวเหมือนตลาด · Beta > 1 = ผันผวนมากกว่า · Beta < 1 = เสถียรกว่า",
    example: "หุ้น Beta 1.5: ตลาดขึ้น 10% → หุ้นมีแนวโน้มขึ้น ~15%",
  },
  // ─── เทคนิคอล ─────────────────────────────────────────────────────────────
  {
    id: "rsi", th: "RSI — ดัชนีความแข็งแกร่งสัมพัทธ์", en: "Relative Strength Index",
    category: "การวิเคราะห์เชิงเทคนิคอล",
    body: "ตัวชี้วัด momentum ที่ค่าอยู่ระหว่าง 0–100 RSI > 70 บ่งชี้ว่าหุ้น overbought (ราคาอาจพุ่งเกินจริง) RSI < 30 บ่งชี้ว่า oversold (ราคาอาจตกเกินจริง) InvestMart คำนวณ RSI-14 (14 วัน)",
    example: "RSI 78 = overbought · ระวังการย่อตัว แต่ไม่ใช่สัญญาณขายเสมอไป",
  },
  {
    id: "momentum", th: "โมเมนตัม (Momentum)", en: "Momentum",
    category: "การวิเคราะห์เชิงเทคนิคอล",
    body: "แนวโน้มว่าหุ้นที่กำลังขึ้นจะขึ้นต่อ และหุ้นที่กำลังลงจะลงต่อ ในระยะสั้นถึงกลาง เรดาร์ InvestMart คัดหุ้นที่มี momentum สูงผิดปกติ แต่ momentum สามารถพลิกกลับได้เสมอ",
  },
  {
    id: "breakout", th: "Breakout", en: "Breakout",
    category: "การวิเคราะห์เชิงเทคนิคอล",
    body: "การที่ราคาหุ้นทะลุผ่านระดับแนวต้านสำคัญขึ้นไป มักมาพร้อมปริมาณซื้อขายที่เพิ่มขึ้น เป็นหนึ่งในสัญญาณที่เรดาร์ InvestMart มองหา แต่ breakout ปลอมก็เกิดขึ้นบ่อย",
  },
  // ─── พอร์ตและการเทรด ──────────────────────────────────────────────────────
  {
    id: "unrealized-pnl", th: "กำไร/ขาดทุนที่ยังไม่รับรู้ (Unrealized P&L)", en: "Unrealized P&L",
    category: "พอร์ตและการเทรด",
    body: "ผลต่างระหว่างมูลค่าตลาดปัจจุบันกับต้นทุนที่ซื้อมา ยังไม่ได้ขายจริง ถือเป็นแค่ตัวเลขบนกระดาษ จะกลายเป็น realized เมื่อขายหุ้นออกไปแล้ว",
    example: "ซื้อ 100 หุ้น @ $50 · ราคาตอนนี้ $65 → Unrealized P&L = +$1,500",
  },
  {
    id: "realized-pnl", th: "กำไร/ขาดทุนที่รับรู้แล้ว (Realized P&L)", en: "Realized P&L",
    category: "พอร์ตและการเทรด",
    body: "กำไรหรือขาดทุนจริงที่เกิดขึ้นหลังจากขายหุ้นออกไปแล้ว ต่างจาก unrealized ที่ยังอาจเปลี่ยนแปลงได้ ใน InvestMart ตัวเลขนี้คำนวณเมื่อ Sell order ถูก execute",
  },
  {
    id: "cps", th: "ต้นทุนเฉลี่ยต่อหุ้น (CPS / Avg Cost)", en: "Cost Per Share (Average Cost)",
    category: "พอร์ตและการเทรด",
    body: "ราคาเฉลี่ยที่ซื้อหุ้นมาทั้งหมด คำนวณจากต้นทุนรวมหารด้วยจำนวนหุ้นที่ถือ ถ้าซื้อหลายครั้งในราคาต่างกัน ตัวเลขนี้ช่วยบอกว่าราคาปัจจุบันต้องสูงกว่าเท่าไรจึงจะมีกำไร",
    example: "ซื้อ 50 หุ้น @ $40 แล้วซื้อเพิ่ม 50 หุ้น @ $60 → CPS = $50",
  },
  // ─── กลยุทธ์การลงทุน ──────────────────────────────────────────────────────
  {
    id: "bull-bear", th: "Bull / Base / Bear Scenarios", en: "Bull / Base / Bear Cases",
    category: "กลยุทธ์การลงทุน",
    body: "วิธีวิเคราะห์ที่มอง 3 สถานการณ์: Bull (กรณีดีที่สุด), Base (กรณีที่น่าจะเป็น), Bear (กรณีเลวร้าย) ช่วยประเมินความเสี่ยงและโอกาสในมุมต่าง ๆ ก่อนตัดสินใจลงทุน",
  },
  // ─── InvestMart Radar ──────────────────────────────────────────────────────
  {
    id: "momentum-score", th: "Momentum Score", en: "Momentum Score",
    category: "เครื่องมือ InvestMart",
    body: "คะแนน 0–100 ที่ InvestMart คำนวณจาก breakout score (50%), quality score (30%) และ volume factor (20%) คะแนนสูงหมายถึงหุ้นมีการเคลื่อนไหวที่ผิดปกติ ไม่ใช่การรับประกันว่าจะขึ้นต่อ",
  },
  {
    id: "breakout-score", th: "Breakout Score", en: "Breakout Score",
    category: "เครื่องมือ InvestMart",
    body: "ส่วนหนึ่งของ momentum score คำนวณจากการเปลี่ยนแปลงราคา 1 วัน, volume surge, และ RSI มีค่า 0–100 คะแนนสูงหมายถึงหุ้นมีสัญญาณ breakout ในวันนั้น",
  },
  {
    id: "quality-score", th: "Quality Score", en: "Quality Score",
    category: "เครื่องมือ InvestMart",
    body: "ตัวกรองความน่าเชื่อถือของสัญญาณ ให้คะแนนหุ้นที่มี RSI ในช่วงสุขภาพดี (45–75), market cap สูง, และ volume surge เหมาะสม เพื่อคัดกรองหุ้นเล็กที่ volume พุ่งเพราะการปั่นราคา",
  },
];

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9ก-๙ ]/g, "");
}

export function GlossaryClient() {
  const [q, setQ] = useState("");
  const searchId  = useId();

  const filtered = q.trim()
    ? TERMS.filter((t) => {
        const n = normalize(q);
        return (
          normalize(t.th).includes(n) ||
          normalize(t.en).includes(n) ||
          normalize(t.body).includes(n)
        );
      })
    : TERMS;

  const categories = Array.from(new Set(filtered.map((t) => t.category)));

  return (
    <div className="flex flex-col gap-5">
      {/* Search */}
      <div>
        <label htmlFor={searchId} className="sr-only">ค้นหาคำศัพท์</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A8378] text-xs select-none" aria-hidden="true">🔍</span>
          <input
            id={searchId}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ค้นหาคำศัพท์ เช่น RSI, โมเมนตัม, EPS..."
            className="w-full pl-8 pr-3 py-2 text-xs border-2 border-[#1F1A14] bg-[#FBF7ED] dark:bg-slate-800 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#5B8A2A] rounded"
          />
        </div>
        {q.trim() && (
          <p className="mt-1 text-xs text-[#8A8378]">
            พบ {filtered.length} รายการ
          </p>
        )}
      </div>

      {/* Term list */}
      {filtered.length === 0 ? (
        <p className="text-xs text-[#8A8378] text-center py-6">ไม่พบคำที่ค้นหา</p>
      ) : (
        categories.map((cat) => (
          <section key={cat}>
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#8A8378] mb-2 border-b border-[#E8E2D4] pb-1">
              {cat}
            </h2>
            <div className="flex flex-col gap-2">
              {filtered.filter((t) => t.category === cat).map((term) => (
                <Card
                  key={term.id}
                  id={term.id}
                  className="p-3 scroll-mt-4"
                >
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 mb-1">
                    <span className="font-bold text-xs text-[#1F1A14] dark:text-slate-100">{term.th}</span>
                    <span className="text-xs text-[#8A8378]">{term.en}</span>
                  </div>
                  <p className="text-xs text-[#8A8378] dark:text-slate-400 leading-relaxed">{term.body}</p>
                  {term.example && (
                    <p className="mt-1.5 text-xs text-[#5B8A2A] dark:text-emerald-400 leading-relaxed border-l-2 border-[#5B8A2A] dark:border-emerald-600 pl-2">
                      {term.example}
                    </p>
                  )}
                </Card>
              ))}
            </div>
          </section>
        ))
      )}

      <p className="text-xs text-[#8A8378] text-center pt-2 border-t border-[#E8E2D4]">
        คำศัพท์เพื่อการศึกษา · ไม่ใช่คำแนะนำการลงทุน
      </p>
    </div>
  );
}
