"use client";

import { useState } from "react";
import { Link }     from "@/i18n/navigation";
import { AppShell } from "@/components/AppShell";
import { useI18n }  from "@/lib/i18n";

// ── Helpers ───────────────────────────────────────────────────────────────────

function Box({ children, color = "#1A1A1A" }: { children: React.ReactNode; color?: string }) {
  return (
    <div className="my-2 px-3 py-2.5 text-xs font-black leading-relaxed whitespace-pre-line text-[#faedcd]"
      style={{ background: color, fontFamily: "var(--font-mono)" }}>
      {children}
    </div>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-1.5 px-3 py-2 bg-[#F0FDF4] border-l-4 border-[#1F9D55]">
      <p className="text-xs text-[#1F9D55] font-bold">✅ {children}</p>
    </div>
  );
}

function Warn({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-1.5 px-3 py-2 bg-[#FEF2F2] border-l-4 border-[#D64545]">
      <p className="text-xs text-[#D64545] font-bold">⚠️ {children}</p>
    </div>
  );
}

interface Chapter { id: string; emoji: string; title: string; tag: string; body: React.ReactNode; chatQ: string; }

function ChapterCard({ ch }: { ch: Chapter }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ border: "1.5px solid #ccd5ae", background: "#fefae0", boxShadow: "2px 2px 0 #ccd5ae" }}>
      <button className="flex items-start gap-3 px-4 py-3 text-left w-full" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span className="text-xl flex-shrink-0 mt-0.5">{ch.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-[#1A1A1A]">{ch.title}</span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 bg-[#e9edc9] text-[#6B6B6B]">{ch.tag}</span>
          </div>
        </div>
        <span className="flex-shrink-0 text-[#8A8378] text-xs mt-1">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-[#e9edc9]">
          <div className="mt-3 text-xs text-[#1A1A1A] leading-relaxed flex flex-col gap-2">{ch.body}</div>
          <Link href={`/martin?q=${encodeURIComponent(ch.chatQ)}`}
            className="mt-3 flex items-center gap-1.5 text-[10px] font-bold text-[#8B5CF6] hover:underline">
            ✦ Ask Martin →
          </Link>
        </div>
      )}
    </div>
  );
}

export default function FundamentalPage() {
  const { lang } = useI18n();
  const isEn = lang === "en";

  const chapters: Chapter[] = [
    {
      id: "c0", emoji: "💡", tag: isEn ? "Core" : "แก่น",
      title: isEn ? "Price vs Value — The Core Principle" : "ราคา vs มูลค่า — แก่นของ FA",
      chatQ: "อธิบายความแตกต่างระหว่างราคาหุ้นกับมูลค่าที่แท้จริงของธุรกิจ",
      body: (
        <>
          <Box color="#8B5CF6">
            {isEn
              ? `"Price is what you pay. Value is what you get." — Buffett\nFA = separating price from intrinsic value`
              : `"ราคาคือสิ่งที่คุณจ่าย มูลค่าคือสิ่งที่คุณได้รับ" — Buffett\nวิเคราะห์พื้นฐาน = แยกราคาออกจากมูลค่าจริง`}
          </Box>
          <p>{isEn
            ? "Sources: 10-K annual report, Earnings Calls, SEC Filings, Investor Relations (IR) website."
            : "แหล่งข้อมูล: 10-K / Earnings Call / SEC Filings / เว็บ IR ของบริษัท"}
          </p>
        </>
      ),
    },
    {
      id: "c1", emoji: "🏭", tag: isEn ? "Chapter 1" : "บทที่ 1",
      title: isEn ? "Business Model" : "โมเดลธุรกิจ",
      chatQ: "อธิบายวิธีวิเคราะห์ Business Model ของหุ้น พร้อมตัวอย่าง Amazon",
      body: (
        <>
          <p>{isEn ? "How does it make money?" : "หาเงินจากอะไร?"}</p>
          <div className="grid grid-cols-2 gap-1 text-[10px]">
            {[
              isEn ? "Products / Services" : "สินค้า / บริการ",
              isEn ? "Transaction Fees" : "ค่าธรรมเนียม",
              isEn ? "Advertising" : "โฆษณา",
              isEn ? "Subscription (SaaS)" : "Subscription",
              isEn ? "Licensing / Royalties" : "ค่าลิขสิทธิ์",
              isEn ? "Platform / Marketplace" : "Platform / Marketplace",
            ].map((m, i) => (
              <div key={i} className="px-2 py-1 border border-[#e9edc9] bg-[#e9edc9] font-bold">{m}</div>
            ))}
          </div>
          <div className="p-3 bg-[#F5F3FF] border border-[#8B5CF6] mt-2">
            <p className="text-[10px] font-bold text-[#8B5CF6] mb-1">{isEn ? "Case: Amazon" : "เคส Amazon"}</p>
            <p className="text-[11px] text-[#4B4569]">
              {isEn
                ? "Revenue: mostly E-commerce. Profit: mostly AWS. Revenue ≠ Profit source."
                : "รายได้หลัก = E-commerce แต่กำไรหลัก = AWS — รายได้ไม่ใช่ที่มาของกำไรเสมอ"}
            </p>
          </div>
          <Tip>{isEn ? "Circle of Competence test: can you explain the business in 2 sentences to a non-investor?" : "ทดสอบ Circle of Competence: อธิบายธุรกิจให้คนทั่วไปเข้าใจใน 2 ประโยคได้ไหม?"}</Tip>
        </>
      ),
    },
    {
      id: "c2", emoji: "👥", tag: isEn ? "Chapter 2" : "บทที่ 2",
      title: isEn ? "Customer Analysis" : "วิเคราะห์ลูกค้า",
      chatQ: "วิธีวิเคราะห์ฐานลูกค้าของหุ้น Customer Concentration และ Switching Cost",
      body: (
        <>
          <div className="grid grid-cols-4 gap-1 text-[10px] text-center font-bold">
            {["B2C","B2B","B2G","Platform"].map(t => (
              <div key={t} className="py-1.5 border border-[#ccd5ae] bg-[#faedcd]">{t}</div>
            ))}
          </div>
          <Warn>{isEn ? "Customer Concentration: if one customer > 10–20% of revenue = high risk. Check Risk Factors in 10-K." : "Customer Concentration: ลูกค้ารายใดรายหนึ่ง > 10–20% ของรายได้ = เสี่ยงสูง ดูใน Risk Factors ของ 10-K"}</Warn>
          <p className="font-bold">{isEn ? "Retention Drivers" : "ปัจจัยดึงลูกค้าให้อยู่"}</p>
          <ul className="flex flex-col gap-1">
            {[
              isEn ? "Ecosystem lock-in (Apple)" : "Ecosystem lock-in (Apple)",
              isEn ? "Accumulated data (more usage = more value)" : "ข้อมูลสะสม (ใช้มากขึ้น = มีค่ามากขึ้น)",
              isEn ? "Long-term contracts" : "สัญญาระยะยาว",
              isEn ? "Network effect (more users = more value)" : "Network effect (คนใช้มาก = มีค่ามาก)",
            ].map((d, i) => (
              <li key={i} className="flex gap-1.5 text-[11px]"><span className="text-[#8B5CF6]">▸</span>{d}</li>
            ))}
          </ul>
        </>
      ),
    },
    {
      id: "c3", emoji: "💰", tag: isEn ? "Chapter 3" : "บทที่ 3",
      title: isEn ? "Revenue Quality" : "คุณภาพรายได้",
      chatQ: "Recurring Revenue กับ One-Time Revenue ต่างกันอย่างไร และมีผลต่อ Valuation ยังไง",
      body: (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[11px]" style={{ minWidth: 280 }}>
              <thead>
                <tr className="bg-[#1A1A1A] text-white text-[9px] font-bold">
                  <th className="px-2 py-1.5 text-left">{isEn ? "Type" : "ประเภท"}</th>
                  <th className="px-2 py-1.5 text-center">{isEn ? "Quality" : "คุณภาพ"}</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { t: isEn ? "Recurring + High Margin + High Retention" : "Recurring + Margin สูง + Retention สูง", q: "⭐⭐⭐" },
                  { t: isEn ? "Recurring + Low Margin" : "Recurring + Margin ต่ำ", q: "⭐⭐" },
                  { t: isEn ? "One-Time + High Margin" : "One-Time + Margin สูง", q: "⭐" },
                  { t: isEn ? "One-Time + Low Margin" : "One-Time + Margin ต่ำ", q: "—" },
                ].map(({ t, q }, i) => (
                  <tr key={i} style={{ background: i % 2 ? "#fefae0" : "#e9edc9", borderBottom: "1px solid #e9edc9" }}>
                    <td className="px-2 py-1.5">{t}</td>
                    <td className="px-2 py-1.5 text-center">{q}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-3 bg-[#F5F3FF] border border-[#8B5CF6] mt-2">
            <p className="text-[10px] font-bold text-[#8B5CF6] mb-1">{isEn ? "Case: Adobe" : "เคส Adobe"}</p>
            <p className="text-[11px] text-[#4B4569]">
              {isEn
                ? "Switched from one-time license to subscription → Revenue $4B → $19B in 10 years. Stock +10×."
                : "เปลี่ยนจาก License ครั้งเดียวเป็น Subscription → รายได้ $4B→$19B ใน 10 ปี หุ้นขึ้น 10 เท่า"}
            </p>
          </div>
        </>
      ),
    },
    {
      id: "c4", emoji: "📈", tag: isEn ? "Chapter 4" : "บทที่ 4",
      title: isEn ? "Financial Snapshot" : "งบการเงิน (Financial Snapshot)",
      chatQ: "วิธีอ่านงบการเงิน 3 ประเภทแบบเร็วเพื่อประเมินคุณภาพบริษัท",
      body: (
        <>
          <div className="grid grid-cols-3 gap-1 text-[10px] font-bold text-center">
            {[
              [isEn ? "Income Statement" : "งบ P&L", "#2563EB"],
              [isEn ? "Balance Sheet" : "งบดุล", "#1F9D55"],
              [isEn ? "Cash Flow" : "กระแสเงินสด", "#D97706"],
            ].map(([l, c]) => (
              <div key={String(l)} className="py-1.5 text-white" style={{ background: c }}>{l}</div>
            ))}
          </div>

          <p className="font-bold mt-1">{isEn ? "Revenue Growth Tiers" : "ระดับการเติบโตของรายได้"}</p>
          <div className="grid grid-cols-2 gap-1 text-[10px]">
            {[
              { l: isEn ? "Hyper Growth" : "Hyper Growth", v: "> 50%/yr", c: "#8B5CF6" },
              { l: isEn ? "High Growth" : "High Growth",   v: "20–50%/yr", c: "#1F9D55" },
              { l: isEn ? "Steady Growth" : "Steady Growth", v: "10–20%/yr", c: "#2563EB" },
              { l: isEn ? "Slow Growth" : "Slow Growth",   v: "5–10%/yr", c: "#D97706" },
            ].map(({ l, v, c }) => (
              <div key={l} className="flex justify-between px-2 py-1 border" style={{ borderColor: c }}>
                <span className="font-bold" style={{ color: c }}>{l}</span>
                <span style={{ fontFamily: "var(--font-mono)" }}>{v}</span>
              </div>
            ))}
          </div>

          <p className="font-bold mt-1">{isEn ? "Gross Margin Benchmarks" : "Gross Margin เปรียบเทียบ"}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px] border-collapse" style={{ minWidth: 260 }}>
              <tbody>
                {[
                  { t: "NVDA", gm: "~75%", nm: "~55%" },
                  { t: "MSFT", gm: "~70%", nm: "~36%" },
                  { t: "AAPL", gm: "~45%", nm: "~26%" },
                  { t: "AMZN", gm: "~47%", nm: "~5%" },
                ].map((r, i) => (
                  <tr key={r.t} style={{ background: i % 2 ? "#fefae0" : "#e9edc9", borderBottom: "1px solid #e9edc9" }}>
                    <td className="px-2 py-1 font-black" style={{ fontFamily: "var(--font-mono)" }}>{r.t}</td>
                    <td className="px-2 py-1 text-[#1F9D55] font-bold">Gross {r.gm}</td>
                    <td className="px-2 py-1 text-[#2563EB] font-bold">Net {r.nm}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Tip>{isEn ? "Cash Flow doesn't lie — check 3 years of FCF trend before trusting earnings." : "Cash Flow โกหกยาก — ดู FCF ย้อน 3 ปีก่อนเชื่อตัวเลขกำไร"}</Tip>
        </>
      ),
    },
    {
      id: "c5", emoji: "🔬", tag: isEn ? "Chapter 5" : "บทที่ 5",
      title: isEn ? "Quality Check — Return Metrics" : "เช็คคุณภาพ — Return Metrics",
      chatQ: "ROIC กับ WACC ใช้ดูอะไร และ ROE ควรเป็นเท่าไหร่ถึงถือว่าดี",
      body: (
        <>
          <Box color="#1F9D55">
            {isEn
              ? "ROIC > WACC = company creates value\nROIC < WACC = destroys value despite profit"
              : "ROIC > WACC = บริษัทสร้างมูลค่า\nROIC < WACC = ทำลายมูลค่าแม้มีกำไร"}
          </Box>
          <div className="p-3 bg-[#F5F3FF] border border-[#8B5CF6]">
            <p className="text-[10px] font-bold text-[#8B5CF6] mb-1">{isEn ? "Case: NVDA" : "เคส NVDA"}</p>
            <p className="text-[11px] text-[#4B4569]">
              {isEn
                ? "ROIC ~50–60% vs WACC ~10% → every $1 invested creates $5–6 in value."
                : "ROIC ~50–60% vs WACC ~10% → ทุก $1 ที่ลงทุน สร้างมูลค่า $5–6"}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-1.5 mt-1 text-[11px]">
            {[
              { l: "ROE", good: isEn ? "> 15% Good · > 20% Great" : "> 15% ดี · > 20% ดีมาก", warn: isEn ? "Check debt — high ROE from leverage ≠ quality" : "ดูหนี้ด้วย ROE สูงจากหนี้ไม่นับว่าดี" },
              { l: isEn ? "Share Count" : "Share Count", good: isEn ? "Buybacks = shareholder-friendly" : "Buyback = ดีต่อผู้ถือหุ้น", warn: isEn ? "Dilution = extra shares issued, reduces your %" : "Dilution = ออกหุ้นใหม่ สัดส่วนเราลดลง" },
            ].map(({ l, good, warn }) => (
              <div key={l} className="p-2 border border-[#ccd5ae] bg-[#fefae0]">
                <p className="font-bold text-[#1A1A1A] mb-1">{l}</p>
                <p className="text-[9px] text-[#1F9D55]">✅ {good}</p>
                <p className="text-[9px] text-[#D64545] mt-0.5">⚠️ {warn}</p>
              </div>
            ))}
          </div>
        </>
      ),
    },
    {
      id: "c6", emoji: "🏰", tag: isEn ? "Chapter 6" : "บทที่ 6",
      title: isEn ? "Competitive Moat (Detailed)" : "จุดแข็ง (Moat ลึก)",
      chatQ: "อธิบาย Moat 5 ประเภทละเอียด และวิธีทดสอบว่า Moat จริงหรือแค่เรื่องเล่า",
      body: (
        <>
          <div className="flex flex-col gap-1.5">
            {[
              { type: "Network Effect",     icon: "🌐", desc: isEn ? "More users → more value. Example: Visa, Meta, Airbnb" : "คนใช้มากขึ้น = มีค่ามากขึ้น เช่น Visa, Meta, Airbnb", test: isEn ? "Does value grow without proportional cost increase?" : "มูลค่าโตโดยไม่ต้องเพิ่มต้นทุนตามสัดส่วนไหม?" },
              { type: "Cost Advantage",     icon: "💰", desc: isEn ? "Produces cheaper than rivals. Example: Costco, Amazon fulfillment" : "ผลิตได้ถูกกว่าคู่แข่ง เช่น Costco, Amazon Fulfillment", test: isEn ? "Can it sustainably undercut competitors on price?" : "ลดราคาแข่งได้อย่างยั่งยืนไหม?" },
              { type: "Switching Cost",     icon: "🔒", desc: isEn ? "Painful to leave. Example: Salesforce, Oracle ERP" : "ย้ายออกแพงหรือยุ่งยาก เช่น Salesforce, Oracle ERP", test: isEn ? "What % of customers renew vs leave?" : "อัตราต่ออายุ (Renewal Rate) เป็นเท่าไหร่?" },
              { type: "Intangible Assets", icon: "™️",  desc: isEn ? "Brand, patents, licenses. Example: Apple, ASML" : "แบรนด์, สิทธิบัตร, ใบอนุญาต เช่น Apple, ASML", test: isEn ? "Would customers pay premium for the brand alone?" : "ลูกค้ายอมจ่ายแพงกว่าเพราะแบรนด์อย่างเดียวไหม?" },
              { type: "Efficient Scale",    icon: "📐", desc: isEn ? "Market too small for 2nd entrant to profit. Example: Waste Management" : "ตลาดเล็กเกินจนเข้ามาแข่งแล้วไม่คุ้ม เช่น Waste Management", test: isEn ? "Would a new entrant destroy their own margin trying to compete?" : "คู่แข่งใหม่เข้ามาแล้วจะเจ็บตัวเองไหม?" },
            ].map(({ type, icon, desc, test }) => (
              <div key={type} className="p-3 border border-[#ccd5ae] bg-[#fefae0]">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">{icon}</span>
                  <span className="text-xs font-bold">{type}</span>
                </div>
                <p className="text-[11px] text-[#6B6B6B]">{desc}</p>
                <p className="text-[10px] text-[#8B5CF6] mt-0.5">→ {test}</p>
              </div>
            ))}
          </div>
          <Box color="#1A1A1A">
            {isEn
              ? "Real Moat test: ROIC > 15% consistently over 5+ years\n(Story without numbers is just story)"
              : "ทดสอบ Moat จริง: ROIC > 15% ต่อเนื่อง 5+ ปี\n(เรื่องเล่าที่ไม่มีตัวเลขยืนยัน = แค่เรื่องเล่า)"}
          </Box>
        </>
      ),
    },
    {
      id: "c7", emoji: "🚀", tag: isEn ? "Chapter 7" : "บทที่ 7",
      title: isEn ? "Growth Optionality" : "โอกาสเติบโต (Optionality)",
      chatQ: "อธิบาย Hidden Optionality คืออะไร และแตกต่างจาก Growth ธรรมดาอย่างไร",
      body: (
        <>
          <p>{isEn ? "Beyond the current business — what adjacent markets can it enter?" : "นอกจากธุรกิจปัจจุบัน — บริษัทเข้าตลาดอื่นได้ไหม?"}</p>
          <div className="flex flex-col gap-1">
            {[
              { l: isEn ? "New Products / Services" : "สินค้า/บริการใหม่",       d: isEn ? "Core biz extending into adjacent markets" : "ต่อยอดจาก Core ไปตลาดข้างเคียง" },
              { l: isEn ? "Geographic Expansion" : "ขยายภูมิภาค",               d: isEn ? "Same model, new markets" : "Model เดิม ตลาดใหม่" },
              { l: isEn ? "Hidden Optionality" : "Hidden Optionality",           d: isEn ? "Upside the market hasn't priced in yet" : "Upside ที่ตลาดยังไม่ price in" },
            ].map(({ l, d }) => (
              <div key={l} className="flex gap-2 px-3 py-2 bg-[#fefae0] border border-[#ccd5ae]">
                <div>
                  <p className="text-[11px] font-bold">{l}</p>
                  <p className="text-[10px] text-[#6B6B6B]">{d}</p>
                </div>
              </div>
            ))}
          </div>
          <Warn>{isEn ? "Reality Check: is it truly near-term or just a hope? Separate 'possible in 10 years' from 'likely in 2 years'." : "Reality Check: ใกล้เกิดจริงหรือแค่ความหวัง? แยก 'เป็นไปได้ใน 10 ปี' กับ 'น่าจะเกิดใน 2 ปี'"}</Warn>
        </>
      ),
    },
    {
      id: "c8", emoji: "⚠️", tag: isEn ? "Chapter 8" : "บทที่ 8",
      title: isEn ? "Risk Assessment" : "ความเสี่ยง",
      chatQ: "Risk ประเภทไหนที่อันตรายที่สุดในการวิเคราะห์หุ้น?",
      body: (
        <>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { r: isEn ? "Competition Risk" : "Competition Risk", d: isEn ? "New entrants or existing rivals improving" : "คู่แข่งใหม่หรือคู่แข่งเดิมพัฒนาเร็ว" },
              { r: isEn ? "Customer Concentration" : "Customer Concentration", d: isEn ? "Too dependent on few customers" : "พึ่งลูกค้าน้อยรายเกินไป" },
              { r: isEn ? "Regulatory Risk" : "Regulatory Risk", d: isEn ? "Government action, antitrust, compliance" : "กฎหมาย, antitrust, การกำกับดูแล" },
              { r: isEn ? "Macro / Economic" : "Macro / Economic", d: isEn ? "Recession, rate hikes, FX, commodity" : "เศรษฐกิจถดถอย ดอกเบี้ยขึ้น ค่าเงิน" },
            ].map(({ r, d }) => (
              <div key={r} className="p-2 bg-[#FEF2F2] border border-[#FECACA]">
                <p className="text-[11px] font-bold text-[#D64545]">{r}</p>
                <p className="text-[10px] text-[#6B6B6B] mt-0.5">{d}</p>
              </div>
            ))}
          </div>
          <Box color="#D64545">
            {isEn
              ? `"The most dangerous risk is the one you don't know exists."\nAlways read Risk Factors section in 10-K`
              : `"ความเสี่ยงที่อันตรายที่สุดคือความเสี่ยงที่ไม่รู้ว่ามี"\nอ่าน Risk Factors ใน 10-K ทุกครั้ง`}
          </Box>
        </>
      ),
    },
    {
      id: "c9", emoji: "🏁", tag: isEn ? "Summary" : "สรุปผล",
      title: isEn ? "Conclusion — What to Do Next" : "สรุปผล — ทำอะไรต่อ",
      chatQ: "หลังวิเคราะห์พื้นฐานเสร็จแล้ว ขั้นตอนต่อไปคืออะไร?",
      body: (
        <>
          <div className="flex flex-col gap-1.5">
            {[
              { status: isEn ? "Passed all chapters" : "ผ่านทุกข้อ", next: isEn ? "→ Study Valuation + find entry point" : "→ ศึกษา Valuation + Entry Point ต่อ", color: "#1F9D55" },
              { status: isEn ? "Passed most, some risks" : "ผ่านส่วนใหญ่ มีจุดเสี่ยงบ้าง", next: isEn ? "→ Monitor risk points closely before entering" : "→ ติดตามจุดเสี่ยงก่อนเข้าซื้อ", color: "#D97706" },
              { status: isEn ? "Failed multiple chapters" : "ไม่ผ่านหลายข้อ", next: isEn ? "→ Avoid or wait until fundamentals improve" : "→ หลีกเลี่ยงหรือรอจนพื้นฐานดีขึ้น", color: "#D64545" },
            ].map(({ status, next, color }) => (
              <div key={status} className="flex gap-3 px-3 py-2.5 border" style={{ borderColor: color, background: `${color}10` }}>
                <span className="flex-shrink-0 w-2 h-2 rounded-full mt-1.5" style={{ background: color }} />
                <div>
                  <p className="text-[11px] font-bold" style={{ color }}>{status}</p>
                  <p className="text-[11px] text-[#1A1A1A]">{next}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <Link href="/valuation" className="flex-1 text-center py-2 text-[10px] font-bold border border-[#8B5CF6] text-[#8B5CF6] hover:bg-[#8B5CF6] hover:text-white transition-colors">
              {isEn ? "→ Valuation Model" : "→ โมเดลประเมินมูลค่า"}
            </Link>
            <Link href="/hunter" className="flex-1 text-center py-2 text-[10px] font-bold border border-[#1A1A1A] text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-colors">
              {isEn ? "→ SWOT & Risk" : "→ SWOT & ความเสี่ยง"}
            </Link>
          </div>
        </>
      ),
    },
  ];

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-5">

        <div style={{ background: "#1A1A1A", boxShadow: "4px 4px 0 #1F9D55" }} className="px-5 py-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#1F9D55] mb-1">
            {isEn ? "Fundamental Analysis" : "วิเคราะห์พื้นฐาน"}
          </p>
          <h1 className="text-xl font-black text-white leading-tight">
            {isEn ? "FA Framework — 8 Chapters" : "FA Framework — 8 บท"}
          </h1>
          <p className="text-xs text-[#8A8378] mt-1.5">
            {isEn
              ? "Business model → customers → revenue → financials → moat → risks"
              : "โมเดลธุรกิจ → ลูกค้า → รายได้ → งบการเงิน → Moat → ความเสี่ยง"}
          </p>
          <Box color="#1F9D55">
            {isEn
              ? `"Price is what you pay. Value is what you get." — Buffett`
              : `"ราคาคือสิ่งที่คุณจ่าย มูลค่าคือสิ่งที่คุณได้รับ" — Buffett`}
          </Box>
        </div>

        <div className="flex flex-col gap-3">
          {chapters.map(ch => <ChapterCard key={ch.id} ch={ch} />)}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {[
            { href: "/learn/stock-picking", icon: "🔭", label: isEn ? "Top-Down Framework" : "Top-Down Framework" },
            { href: "/valuation",           icon: "📐", label: isEn ? "Valuation Model"    : "ประเมินมูลค่า" },
            { href: "/hunter",              icon: "🎯", label: isEn ? "SWOT & Risk"         : "SWOT & ความเสี่ยง" },
            { href: "/screener",            icon: "🔬", label: isEn ? "Screener"            : "Screener" },
          ].map(({ href, icon, label }) => (
            <Link key={href} href={href}
              className="flex items-center gap-2 px-3 py-2.5 border border-[#ccd5ae] bg-[#fefae0] hover:bg-[#faedcd] hover:border-[#1A1A1A] transition-colors">
              <span>{icon}</span><span className="text-xs font-bold text-[#1A1A1A]">{label}</span>
            </Link>
          ))}
        </div>

        <p className="text-[10px] text-[#8A8378] text-center">
          {isEn
            ? "Educational content only — not investment advice."
            : "เนื้อหาเพื่อการศึกษา ไม่ใช่คำแนะนำลงทุน"}
        </p>
      </div>
    </AppShell>
  );
}
