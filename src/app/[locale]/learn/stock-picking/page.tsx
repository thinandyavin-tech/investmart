"use client";

import { useState } from "react";
import { Link }     from "@/i18n/navigation";
import { AppShell } from "@/components/AppShell";
import { useI18n }  from "@/lib/i18n";

// ── Helpers ───────────────────────────────────────────────────────────────────

function Box({ children, color = "#1A1A1A" }: { children: React.ReactNode; color?: string }) {
  return (
    <div className="my-2 px-3 py-2.5 text-xs font-black leading-relaxed whitespace-pre-line text-[#F3EDE0]"
      style={{ background: color, fontFamily: "var(--font-mono)" }}>
      {children}
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-2 px-3 py-2 bg-[#FFFBEB] border-l-4 border-[#D97706]">
      <p className="text-xs text-[#D97706] font-bold">⚠️ {children}</p>
    </div>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-2 px-3 py-2 bg-[#F0FDF4] border-l-4 border-[#1F9D55]">
      <p className="text-xs text-[#1F9D55] font-bold">✅ {children}</p>
    </div>
  );
}

interface Module {
  id:    string;
  emoji: string;
  title: string;
  tag:   string;
  body:  React.ReactNode;
  chatQ: string;
}

function ModuleCard({ mod }: { mod: Module }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ border: "1.5px solid #C8BFB0", background: "#FDFAF4", boxShadow: "2px 2px 0 #C8BFB0" }}>
      <button
        className="flex items-start gap-3 px-4 py-3 text-left w-full"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <span className="text-xl flex-shrink-0 mt-0.5">{mod.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-[#1A1A1A]">{mod.title}</span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 bg-[#E4DDD2] text-[#6B6B6B]">{mod.tag}</span>
          </div>
        </div>
        <span className="flex-shrink-0 text-[#8A8378] text-xs mt-1">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-[#E4DDD2]">
          <div className="mt-3 text-xs text-[#1A1A1A] leading-relaxed flex flex-col gap-2">{mod.body}</div>
          <Link
            href={`/chat?q=${encodeURIComponent(mod.chatQ)}`}
            className="mt-3 flex items-center gap-1.5 text-[10px] font-bold text-[#8B5CF6] hover:underline"
          >
            ✦ Ask Martin →
          </Link>
        </div>
      )}
    </div>
  );
}

export default function StockPickingPage() {
  const { lang } = useI18n();
  const isEn = lang === "en";

  const modules: Module[] = [
    {
      id: "m0", emoji: "🌍", tag: "Core Concept",
      title: isEn ? "Top-Down vs Bottom-Up" : "Top-Down vs Bottom-Up",
      chatQ: "อธิบาย Top-Down stock picking framework ให้เข้าใจง่าย",
      body: (
        <>
          <p>{isEn
            ? "Most beginners pick stocks first, then find reasons to justify the choice. Top-Down reverses this: start with the big picture, let it filter down to individual stocks."
            : "มือใหม่ส่วนใหญ่เลือกหุ้นก่อนแล้วค่อยหาเหตุผล Top-Down ทำย้อนกัน: มองภาพใหญ่ก่อน แล้วกรองลงมาจนถึงหุ้นรายตัว"}
          </p>
          <Box color="#8B5CF6">
            {isEn
              ? "Global Macro → Mega Theme → Sector → Index → Stock"
              : "Macro โลก → Mega Theme → Sector → Index → หุ้นรายตัว"}
          </Box>
          <Note>{isEn ? "Survivorship Bias: indices only include companies that already survived. Don't assume inclusion = safe." : "Survivorship Bias: ดัชนีมีแค่บริษัทที่รอดมาแล้ว ไม่ได้แปลว่าปลอดภัยเสมอ"}</Note>
        </>
      ),
    },
    {
      id: "m1", emoji: "📊", tag: "Module 1",
      title: isEn ? "Why Start with Indices" : "ทำไมต้องเริ่มจากดัชนี",
      chatQ: "ทำไมควรเริ่มดูหุ้นจากดัชนีก่อน เช่น S&P500 แทนที่จะเลือกเองตั้งแต่แรก",
      body: (
        <>
          <p>{isEn
            ? "An index is a rules-based basket of stocks (S&P 500, NASDAQ 100, Dow, MSCI World). The top 30 of S&P 500 have already passed rigorous filters:"
            : "ดัชนีคือตะกร้าหุ้นตามกฎ (S&P500, NASDAQ100, Dow, MSCI World) Top 30 ของ S&P500 ผ่านการกรองมาแล้ว:"}
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              isEn ? "Market cap > $14.5B" : "มูลค่าตลาด > $14.5B",
              isEn ? "Profitable 4 consecutive quarters" : "กำไรต่อเนื่อง 4 ไตรมาส",
              isEn ? "High liquidity & float" : "สภาพคล่องสูง",
              isEn ? "Committee review every quarter" : "คณะกรรมการตรวจทุกไตรมาส",
            ].map((f, i) => (
              <div key={i} className="flex gap-1.5 px-2 py-1.5 bg-[#F0FDF4] border border-[#1F9D55] text-[11px]">
                <span className="text-[#1F9D55] flex-shrink-0">▸</span>{f}
              </div>
            ))}
          </div>
          <Tip>{isEn ? "Start with 30 pre-vetted stocks, not 8,000. Free tools: slickcharts.com · etf.com · ishares.com" : "เริ่มจาก 30 ตัวที่พิสูจน์แล้ว ไม่ใช่ 8,000 ตัว — ดู Top Holdings ฟรีที่ slickcharts / etf.com / ishares"}</Tip>
        </>
      ),
    },
    {
      id: "m2", emoji: "🔭", tag: "Module 2",
      title: isEn ? "Top-Down Framework" : "Top-Down Framework",
      chatQ: "อธิบาย Top-Down Framework จาก Macro ไปจนถึงเลือกหุ้นรายตัว พร้อมตัวอย่าง",
      body: (
        <>
          <Box>
            {isEn
              ? "Interest rates ↓  → Tech / Growth / Real Estate ✅\nInterest rates ↑  → Banks / Energy ✅"
              : "ดอกเบี้ยลง → Tech/Growth/Real Estate ดี\nดอกเบี้ยขึ้น → Banks/Energy ดี"}
          </Box>
          <p className="font-bold">{isEn ? "Business Cycle" : "Business Cycle"}</p>
          <div className="grid grid-cols-4 gap-1 text-[10px] text-center">
            {[
              { l: isEn ? "Recovery" : "ฟื้นตัว",    c: "#1F9D55" },
              { l: isEn ? "Expansion" : "เติบโต",     c: "#2563EB" },
              { l: isEn ? "Late Cycle" : "ปลายวัฏ",  c: "#D97706" },
              { l: isEn ? "Recession" : "ถดถอย",      c: "#D64545" },
            ].map(({ l, c }) => (
              <div key={l} className="py-1.5 font-bold text-white" style={{ background: c }}>{l}</div>
            ))}
          </div>
          <p className="font-bold mt-1">{isEn ? "Mega Themes (5–15 years)" : "Mega Theme 5–15 ปี"}</p>
          <ul className="flex flex-col gap-1">
            {[
              isEn ? "🤖 AI & Automation" : "🤖 AI & Automation",
              isEn ? "👴 Aging Population" : "👴 ประชากรสูงอายุ",
              isEn ? "⚡ Energy Transition" : "⚡ Energy Transition",
              isEn ? "🌐 Deglobalization" : "🌐 Deglobalization",
              isEn ? "💳 Digital Payments" : "💳 Digital Payments",
            ].map((t, i) => (
              <li key={i} className="flex gap-1.5 text-[11px]"><span className="text-[#8B5CF6]">→</span>{t}</li>
            ))}
          </ul>
          <div className="p-3 bg-[#F5F3FF] border border-[#8B5CF6] mt-2">
            <p className="text-[10px] font-bold text-[#8B5CF6] mb-1">{isEn ? "Case: NVDA vs AMD — same theme, different position" : "เคส NVDA vs AMD — theme เดียวกัน ผลต่างกันมาก"}</p>
            <p className="text-[11px] text-[#4B4569]">
              {isEn
                ? "NVDA = Core Enabler (CUDA ecosystem 15+ years, no substitute). AMD = hardware only. Same AI theme, massively different moat."
                : "NVDA = Core Enabler (CUDA ecosystem 15+ ปี ไม่มีตัวแทน) AMD = มีแค่ hardware ธีมเดียวกัน แต่ Moat ต่างกันมาก"}
            </p>
          </div>
        </>
      ),
    },
    {
      id: "m3", emoji: "🔍", tag: "Module 3",
      title: isEn ? "Business Quality Filter (5 Questions)" : "Business Quality Filter (5 คำถาม)",
      chatQ: "5 คำถามทดสอบคุณภาพธุรกิจก่อนวิเคราะห์งบการเงิน",
      body: (
        <>
          <p>{isEn ? "Read the business without reading financial statements first:" : "อ่านธุรกิจโดยไม่ต้องอ่านงบก่อน:"}</p>
          {[
            { n: 1, q: isEn ? "If the company disappeared tomorrow, would customers suffer?" : "ถ้าบริษัทหายไปพรุ่งนี้ ลูกค้าเดือดร้อนไหม?" },
            { n: 2, q: isEn ? "How hard is it for competitors to copy?" : "คู่แข่งทำตามง่ายไหม?" },
            { n: 3, q: isEn ? "How hard is it for customers to switch?" : "ลูกค้าเปลี่ยนเจ้ายากไหม? (Switching Cost)" },
            { n: 4, q: isEn ? "Does it require heavy reinvestment? (Capital Intensity)" : "ต้องลงทุนซ้ำเยอะไหม? (Capital Intensity)" },
            { n: 5, q: isEn ? "Is revenue recurring or one-time?" : "รายได้ซ้ำหรือครั้งเดียว? (Recurring Revenue)" },
          ].map(({ n, q }) => (
            <div key={n} className="flex gap-2.5 px-3 py-2 bg-[#FDFAF4] border border-[#C8BFB0]">
              <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-[9px] font-black text-white" style={{ background: "#1A1A1A" }}>{n}</span>
              <p className="text-[11px]">{q}</p>
            </div>
          ))}
          <p className="font-bold mt-1">{isEn ? "5 Types of Moat" : "Moat 5 ประเภท"}</p>
          <div className="grid grid-cols-2 gap-1 text-[10px]">
            {[
              ["🌐", isEn ? "Network Effect" : "Network Effect"],
              ["💰", isEn ? "Cost Advantage" : "Cost Advantage"],
              ["🔒", isEn ? "Switching Cost" : "Switching Cost"],
              ["™️", isEn ? "Intangible Assets" : "Intangible Assets"],
              ["📐", isEn ? "Efficient Scale" : "Efficient Scale"],
            ].map(([icon, label]) => (
              <div key={String(label)} className="flex gap-1.5 px-2 py-1.5 border border-[#E4DDD2] bg-[#F8F5EF]">
                <span>{icon}</span><span className="font-bold">{label}</span>
              </div>
            ))}
          </div>
        </>
      ),
    },
    {
      id: "m4", emoji: "✅", tag: "Module 4",
      title: isEn ? "Screening Checklist (6 Steps)" : "Screening Checklist (6 ขั้นตอน)",
      chatQ: "ขั้นตอน 6 ข้อ Screening หุ้นจาก Macro ไปจนถึงตัดสินใจลงทุน",
      body: (
        <>
          {[
            { n: 1, l: isEn ? "Define Macro / Mega Theme first" : "กำหนด Macro/Theme ก่อน" },
            { n: 2, l: isEn ? "Choose Index Universe (S&P500, NASDAQ100…)" : "เลือก Index Universe" },
            { n: 3, l: isEn ? "Business Quality Filter (5 questions above)" : "Business Quality Filter (5 คำถาม)" },
            { n: 4, l: isEn ? "Sanity-check numbers vs Sector Benchmark (not one-size-fits-all)" : "Sanity-check ตัวเลขเทียบ Sector Benchmark" },
            { n: 5, l: isEn ? "Valuation Gut Check + Expected Return (how much growth is already priced in?)" : "Valuation Gut Check + Expected Return (ราคาสะท้อน growth ไปแล้วแค่ไหน?)" },
            { n: 6, l: isEn ? "Decide" : "ตัดสินใจ" },
          ].map(({ n, l }) => (
            <div key={n} className="flex gap-2.5 px-3 py-2 border-b border-[#E4DDD2] last:border-0 bg-[#FDFAF4]">
              <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-[9px] font-black text-white" style={{ background: "#8B5CF6" }}>{n}</span>
              <span className="text-[11px]">{l}</span>
            </div>
          ))}
        </>
      ),
    },
    {
      id: "m5", emoji: "⚖️", tag: "Module 5",
      title: isEn ? "Position Sizing" : "Position Sizing",
      chatQ: "ควรใส่เงินเท่าไหร่ในหุ้นแต่ละตัว กฎ Position Sizing คืออะไร",
      body: (
        <>
          <p>{isEn
            ? "How much to allocate depends on 4 factors — not just 'I like it a lot = put in a lot':"
            : "ใส่เงินเท่าไหร่ขึ้นกับ 4 ปัจจัย ไม่ใช่ 'ชอบมาก = ใส่เยอะ':"}
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              isEn ? "Conviction level" : "ความมั่นใจใน thesis",
              isEn ? "Business quality" : "คุณภาพธุรกิจ",
              isEn ? "Valuation margin of safety" : "Valuation (MoS เยอะแค่ไหน)",
              isEn ? "Portfolio risk / correlation" : "ความเสี่ยงพอร์ตรวม",
            ].map((f, i) => (
              <div key={i} className="px-2 py-1.5 bg-[#F3EDE0] border border-[#C8BFB0] text-[11px] font-bold">{f}</div>
            ))}
          </div>
          <Note>{isEn ? "Refer to Portfolio Pyramid for allocation bands by layer (Core 5–10% / Growth 3–7% / Moon-Shots <3–5%)" : "อ้างอิง Portfolio Pyramid — Core 5–10% / Growth 3–7% / Moon-Shots <3–5% ต่อตัว"}</Note>
          <Link href="/blueprint" className="text-[10px] font-bold text-[#8B5CF6] hover:underline">→ {isEn ? "View Portfolio Pyramid in Blueprint" : "ดู Portfolio Pyramid ใน Blueprint"}</Link>
        </>
      ),
    },
    {
      id: "m6", emoji: "🔄", tag: "Module 6",
      title: isEn ? "Portfolio & DCA" : "Portfolio & DCA",
      chatQ: "DCA 3 แบบคืออะไร และเมื่อไหร่ควรขายหุ้น Sell Discipline",
      body: (
        <>
          <p className="font-bold">{isEn ? "3 DCA Approaches" : "DCA 3 แบบ"}</p>
          <div className="flex flex-col gap-1">
            {[
              { name: isEn ? "Fixed-amount DCA" : "Fixed-amount DCA", desc: isEn ? "Same $ every month regardless of price" : "ซื้อจำนวนเงินเท่ากันทุกเดือน ไม่สนราคา" },
              { name: isEn ? "Valuation-band DCA" : "Valuation-band DCA", desc: isEn ? "Buy more when cheap (low P/E band), less when expensive" : "ซื้อมากขึ้นตอนถูก (P/E ต่ำ) ซื้อน้อยลงตอนแพง" },
              { name: isEn ? "Event-triggered DCA" : "Event-triggered DCA", desc: isEn ? "Deploy extra at market drops (-10%, -20%, -30%)" : "ทุ่มเพิ่มตอนตลาดลงแรง (-10%/-20%/-30%)" },
            ].map(({ name, desc }) => (
              <div key={name} className="px-3 py-2 bg-[#FDFAF4] border border-[#C8BFB0]">
                <p className="text-[11px] font-bold">{name}</p>
                <p className="text-[10px] text-[#6B6B6B]">{desc}</p>
              </div>
            ))}
          </div>
          <p className="font-bold mt-2">{isEn ? "Sell Discipline — 3 Valid Reasons to Sell" : "Sell Discipline — 3 เหตุผลที่ถูกต้องในการขาย"}</p>
          <div className="flex flex-col gap-1">
            {[
              isEn ? "Fundamentals changed (thesis broken)" : "พื้นฐานธุรกิจเปลี่ยน (thesis พัง)",
              isEn ? "Position too large (>10-15% of portfolio)" : "สัดส่วนในพอร์ตเกิน (>10–15%)",
              isEn ? "Valuation far exceeds expected return" : "ราคาแพงเกินจนผลตอบแทนไม่คุ้ม",
            ].map((r, i) => (
              <div key={i} className="flex gap-2 items-start text-[11px] px-3 py-1.5 bg-[#FEF2F2] border border-[#FECACA]">
                <span className="text-[#D64545] flex-shrink-0 font-bold">{i+1}.</span><span>{r}</span>
              </div>
            ))}
          </div>
          <Note>{isEn ? "Don't sell just because the price dropped. Ask: has the thesis changed?" : "ห้ามขายเพราะราคาลง ถามก่อนว่า thesis เปลี่ยนหรือยัง?"}</Note>
        </>
      ),
    },
    {
      id: "m7", emoji: "🎓", tag: "Module 7",
      title: isEn ? "Full Walkthrough — Case Study" : "Full Walkthrough — Case Study จริง",
      chatQ: "ทำ Full Walkthrough คัดหุ้น 1 ตัวตั้งแต่ Macro ไปจนถึง Position Size ให้ดูเป็นตัวอย่าง",
      body: (
        <>
          <p>{isEn
            ? "This module ties all 6 together with a real-stock walkthrough:"
            : "Module นี้ร้อยทุก Module เข้าด้วยกันผ่านการคัดหุ้นจริงตั้งแต่ต้นจนจบ:"}
          </p>
          <Box color="#2563EB">
            {`M1 Index → M2 Macro+Theme → M3 Business Quality\n→ M4 Screening → M5 Position Size → M6 DCA Plan`}
          </Box>
          <p className="text-[11px] text-[#6B6B6B]">{isEn
            ? "Ask Martin to walk through any stock using this full framework — from macro context to position sizing."
            : "ถาม Martin ให้ทำ Full Walkthrough กับหุ้นใดก็ได้ ตั้งแต่ Macro จนถึง Position Size"}
          </p>
          <Link
            href="/chat?q=ทำ Full Top-Down Walkthrough สำหรับ NVDA ตั้งแต่ Macro Theme ไปจนถึง Position Sizing"
            className="inline-flex items-center gap-1.5 mt-1 text-[10px] font-bold text-[#8B5CF6] hover:underline"
          >
            ✦ {isEn ? "Try with NVDA →" : "ลองกับ NVDA →"}
          </Link>
        </>
      ),
    },
  ];

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-5">

        {/* Header */}
        <div style={{ background: "#1A1A1A", boxShadow: "4px 4px 0 #8B5CF6" }} className="px-5 py-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#8B5CF6] mb-1">
            {isEn ? "Stock Picking Framework" : "Stock Picking Framework"}
          </p>
          <h1 className="text-xl font-black text-white leading-tight">
            {isEn ? "Top-Down Stock Selection" : "คัดหุ้นแบบ Top-Down"}
          </h1>
          <p className="text-xs text-[#8A8378] mt-1.5">
            {isEn
              ? "7 modules · Start big picture, filter down to individual stocks"
              : "7 modules · มองภาพใหญ่ก่อน แล้วกรองลงมาถึงหุ้นรายตัว"}
          </p>
          <Box color="#8B5CF6">{isEn
            ? "Global Macro → Mega Theme → Sector → Index → Stock"
            : "Macro โลก → Mega Theme → Sector → Index → หุ้น"}
          </Box>
        </div>

        {/* Modules */}
        <div className="flex flex-col gap-3">
          {modules.map(m => <ModuleCard key={m.id} mod={m} />)}
        </div>

        {/* Related */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { href: "/learn/fundamental", icon: "📋", label: isEn ? "Fundamental Analysis" : "วิเคราะห์พื้นฐาน" },
            { href: "/valuation",         icon: "📐", label: isEn ? "Valuation Model"      : "ประเมินมูลค่า" },
            { href: "/hunter",            icon: "🎯", label: isEn ? "SWOT & Risk"           : "SWOT & ความเสี่ยง" },
            { href: "/blueprint",         icon: "🗺️", label: isEn ? "Blueprint"             : "Blueprint" },
          ].map(({ href, icon, label }) => (
            <Link key={href} href={href}
              className="flex items-center gap-2 px-3 py-2.5 border border-[#C8BFB0] bg-[#FDFAF4] hover:bg-[#F3EDE0] hover:border-[#1A1A1A] transition-colors">
              <span>{icon}</span>
              <span className="text-xs font-bold text-[#1A1A1A]">{label}</span>
            </Link>
          ))}
        </div>

        <p className="text-[10px] text-[#8A8378] text-center">
          {isEn
            ? "Educational framework — not investment advice. Examples are for illustration only."
            : "เนื้อหาเพื่อการศึกษา ไม่ใช่คำแนะนำลงทุน ตัวอย่างใช้เพื่ออธิบายเท่านั้น"}
        </p>
      </div>
    </AppShell>
  );
}
