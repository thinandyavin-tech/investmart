"use client";

import { useState } from "react";
import { Link }     from "@/i18n/navigation";
import { AppShell } from "@/components/AppShell";
import { useI18n }  from "@/lib/i18n";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Section {
  id:      string;
  emoji:   string;
  titleTh: string;
  titleEn: string;
  tag:     string;
  body:    React.ReactNode;
  chatQ:   string;
}

// ── Visual helpers ─────────────────────────────────────────────────────────────

function Formula({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="my-2 px-3 py-2 text-xs font-black leading-relaxed whitespace-pre-line"
      style={{ background: "#1A1A1A", color: "#faedcd", fontFamily: "var(--font-mono)" }}
    >
      {children}
    </div>
  );
}

function Warn({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-2 px-3 py-2 bg-red-50 border-l-4 border-red-500">
      <p className="text-xs font-bold text-red-700">⚠️ {children}</p>
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

function Tag({ label, color }: { label: string; color: string }) {
  return (
    <span className="text-[9px] font-black px-1.5 py-0.5 text-white" style={{ background: color }}>
      {label}
    </span>
  );
}

// ── Section content ────────────────────────────────────────────────────────────

const GREEKS = [
  { sym: "Δ", name: "Delta",   color: "#2563EB", desc: "ความเร็ว — หุ้นขยับ $1 → option ขยับเท่าไหร่  |  Call: 0→1 · Put: 0→−1  |  ATM ≈ 0.5" },
  { sym: "Γ", name: "Gamma",   color: "#7C3AED", desc: "ความเร่งของ Delta — สูงใกล้ Expiry · ATM Gamma พุ่งแรง ทำกำไรเร็วหรือเสียเร็ว" },
  { sym: "Θ", name: "Theta",   color: "#D64545", desc: "ค่าเช่าเวลา — เสียทุกวันแม้หุ้นนิ่ง · ยิ่งใกล้ Expiry ยิ่งเสียเร็ว (decay ไม่เป็น linear)" },
  { sym: "V", name: "Vega",    color: "#D97706", desc: "ความไวต่อ IV — IV เพิ่ม 1% → option ขยับ Vega บาท/dollar · ซื้อก่อนข่าว IV สูง = เสียหลัง IV Crush" },
  { sym: "ρ", name: "Rho",     color: "#6B6B6B", desc: "ดอกเบี้ย — สำคัญเฉพาะสัญญายาว LEAPS · มือใหม่ไม่ต้องกังวลก่อน" },
];

const MISTAKES = [
  { n: 1, th: "ซื้อเพราะ Premium ถูก",              en: "Buying cheap premium",           why: "OTM ถูกเพราะโอกาสน้อย ไม่ใช่เพราะ deal ดี" },
  { n: 2, th: "ซื้อสัญญาสั้นเกิน thesis",           en: "Too short expiry for thesis",     why: "Theta กินทุกวัน ให้เวลา trade มากกว่าที่คิด 2×" },
  { n: 3, th: "ไม่ดู IV / Theta ก่อนซื้อ",         en: "Ignoring IV & Theta",             why: "ซื้อก่อนงบ IV สูง ทายถูกแต่ยังขาดทุนได้เพราะ IV Crush" },
  { n: 4, th: "คิดว่าหุ้นขึ้น = Call กำไรเสมอ",    en: "Stock up = Call profit always",   why: "ต้องขึ้นจริง + ขึ้นเร็วพอ + ขึ้นมากพอ พร้อมกัน" },
  { n: 5, th: "ไม่วางแผน Exit ก่อนเปิด trade",     en: "No exit plan before entering",   why: "กำหนด target ก่อน: กำไร 50% หรือขาดทุน 100% ตัดทิ้ง" },
  { n: 6, th: "ไม่ดู Bid-Ask Spread / Open Interest", en: "Ignoring spread & OI",        why: "Spread มากกว่า 10% ของ premium = เสียทันทีที่กด order" },
  { n: 7, th: "ใส่เงินเยอะเกินใน trade เดียว",     en: "Over-sizing one trade",           why: "ไม่เกิน 2–5% ของพอร์ตต่อ trade — option หมดค่าได้ 100%" },
];

const PUT_STRATEGIES = [
  { name: "Protective Put",      th: "ซื้อ Put คู่กับหุ้นที่ถือ — เหมือนซื้อประกัน downside", use: "ถือหุ้นระยะยาว กังวลระยะสั้น" },
  { name: "Married Put",         th: "ซื้อหุ้นและ Put พร้อมกันตั้งแต่แรก — กำหนด max loss ได้ชัด", use: "ซื้อหุ้นครั้งแรกแต่ไม่แน่ใจจังหวะ" },
  { name: "Tactical Event Hedge",th: "ซื้อ Put ก่อน Earnings / Fed / FDA — ป้องกัน gap down", use: "ถือหุ้น high-beta ก่อนงบใหญ่" },
  { name: "Profit Lock",         th: "เอากำไรบางส่วนซื้อ Put — กันกำไรใหญ่หาย (เคส NVDA $100→$200 ซื้อ Put ป้องกัน)", use: "พอร์ตกำไรมากแล้ว ไม่อยากขาย" },
  { name: "Disaster Hedge",      th: "ซื้อ Put ไกล OTM ราคาถูก กัน tail risk แบบ black swan", use: "ถือพอร์ตใหญ่ กังวลความเสี่ยงระดับวิกฤต" },
];

// ── Sections ──────────────────────────────────────────────────────────────────

function buildSections(isEn: boolean): Section[] {
  return [
    {
      id: "core", emoji: "💡",
      titleTh: "แก่นหลัก: ซื้อ Option คืออะไร",
      titleEn: "Core Concept: What Is Buying an Option",
      tag: isEn ? "Foundation" : "พื้นฐาน",
      chatQ: "อธิบายความหมายของ Option ให้เข้าใจง่ายๆ",
      body: (
        <div className="flex flex-col gap-2 text-xs text-[#1A1A1A] leading-relaxed">
          <p>ซื้อ Option คือซื้อ <strong>สิทธิ์</strong> ไม่ใช่ซื้อหุ้นจริง ขาดทุนสูงสุดจำกัดแค่ค่า <strong>Premium</strong> ที่จ่ายไป</p>
          <Formula>
{`ซื้อ Option = ซื้อทิศทาง
            + ซื้อเวลา
            + ซื้อความผันผวน (IV)
            ━━━━━━━━━━━━━━━━━━━━━━
            พร้อมกันเสมอ ทั้ง 3 ต้องถูก`}
          </Formula>
          <p>นี่คือเหตุผลว่าทำไม <strong>หุ้นขึ้นแต่ Call ยังติดลบได้</strong> — เพราะอาจขึ้นช้าเกินไป หรือ IV ยุบหลังข่าว</p>
          <Tip>ขาดทุนสูงสุดของผู้ซื้อ Option = Premium ที่จ่าย (ไม่ใช่ราคาหุ้น)</Tip>
        </div>
      ),
    },
    {
      id: "longcall-put", emoji: "📊",
      titleTh: "Long Call & Long Put พื้นฐาน",
      titleEn: "Long Call & Long Put Basics",
      tag: isEn ? "Basics" : "พื้นฐาน",
      chatQ: "Long Call กับ Long Put ต่างกันอย่างไร พร้อมตัวอย่างตัวเลข",
      body: (
        <div className="flex flex-col gap-3 text-xs text-[#1A1A1A] leading-relaxed">
          {/* Long Call */}
          <div className="p-3 border border-[#2563EB] bg-[#EFF6FF]">
            <div className="flex items-center gap-2 mb-1.5">
              <Tag label="CALL" color="#2563EB" />
              <span className="font-bold text-[#2563EB]">Long Call — เล่นฝั่งขึ้น</span>
            </div>
            <p className="mb-1.5">ต้อง <strong>ถูก 3 เรื่องพร้อมกัน</strong>: ขึ้นจริง + ขึ้นเร็วพอ + ขึ้นมากพอ</p>
            <Formula>Break-even = Strike + Premium{"\n"}กำไร = ราคาหุ้น − Strike − Premium{"\n"}ขาดทุนสูงสุด = Premium ที่จ่าย</Formula>
            <p className="text-[10px] text-[#6B6B6B]">ตัวอย่าง: ซื้อ Call Strike $200, Premium $5 {"→"} ต้องการหุ้น {">"} $205</p>
          </div>

          {/* Long Put */}
          <div className="p-3 border border-[#D64545] bg-[#FEF2F2]">
            <div className="flex items-center gap-2 mb-1.5">
              <Tag label="PUT" color="#D64545" />
              <span className="font-bold text-[#D64545]">Long Put — เล่นฝั่งลง / ซื้อประกัน</span>
            </div>
            <p className="mb-1.5">ใช้เล่นฝั่งลง <strong>หรือ</strong> ซื้อประกัน downside ให้หุ้นที่ถืออยู่ (เหมือนซื้อร่มก่อนฝนตก)</p>
            <Formula>Break-even = Strike − Premium{"\n"}กำไร = Strike − ราคาหุ้น − Premium{"\n"}ขาดทุนสูงสุด = Premium ที่จ่าย</Formula>
          </div>

          {/* Key terms */}
          <div className="grid grid-cols-2 gap-1.5 text-[10px]">
            {[
              ["Strike",  "ราคาใช้สิทธิ์"],
              ["Premium", "ราคา option = ขาดทุนสูงสุด"],
              ["Expiry",  "วันหมดอายุ"],
              ["ITM",     "In the Money — มีมูลค่าแท้จริง"],
              ["ATM",     "At the Money — strike ≈ ราคาหุ้น"],
              ["OTM",     "Out of the Money — ไม่มีมูลค่าแท้จริงเลย"],
            ].map(([term, def]) => (
              <div key={term} className="flex gap-1.5 px-2 py-1.5 bg-[#faedcd] border border-[#e9edc9]">
                <span className="font-black text-[#1A1A1A] flex-shrink-0" style={{ fontFamily: "var(--font-mono)" }}>{term}</span>
                <span className="text-[#6B6B6B]">{def}</span>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: "why-call-down", emoji: "🤔",
      titleTh: "ทำไมหุ้นขึ้นแต่ Call ติดลบ",
      titleEn: "Why Stock Up But Call Loses",
      tag: isEn ? "Critical" : "สำคัญมาก",
      chatQ: "อธิบาย 4 สาเหตุที่ทำให้ Call option ติดลบแม้หุ้นขึ้น พร้อมตัวอย่าง",
      body: (
        <div className="flex flex-col gap-2 text-xs text-[#1A1A1A] leading-relaxed">
          <p className="font-bold text-[#D64545]">4 สาเหตุที่มือใหม่สงสัยที่สุด:</p>
          {[
            { n: 1, th: "ขึ้นไม่พอ",        en: "Not enough move",    desc: "ขึ้น $2 แต่ Premium $5 → ยังติดลบอยู่ ต้องขึ้นเกิน Break-even" },
            { n: 2, th: "Theta กัดกร่อน",   en: "Theta decay",        desc: "เวลาเดินทุกวัน option หมดมูลค่าทุกวัน แม้หุ้นนิ่ง OTM เสียเร็วกว่า ITM" },
            { n: 3, th: "IV Crush",          en: "IV Crush",           desc: "ซื้อก่อน Earnings IV สูง หลังงบออกแม้ขึ้น IV ยุบทำให้ Vega กินกำไร" },
            { n: 4, th: "Strike ไกลเกิน",   en: "Strike too far OTM", desc: "Delta ต่ำมาก หุ้นขึ้น $5 แต่ option ขยับแค่ $0.50" },
          ].map(({ n, th, en, desc }) => (
            <div key={n} className="flex gap-2 px-3 py-2 bg-[#fefae0] border border-[#e9edc9]">
              <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-[9px] font-black text-white rounded-sm" style={{ background: "#D64545" }}>{n}</span>
              <div>
                <span className="font-bold">{th}</span>
                {isEn && <span className="text-[#8A8378] ml-1">({en})</span>}
                <p className="text-[10px] text-[#6B6B6B] mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
          <Formula>
{`Implied Move ≈ ATM Straddle Price ÷ Stock Price
ถ้าหุ้นขยับน้อยกว่า Implied Move
→ คนซื้อ option เจ็บได้แม้ทายทิศถูก`}
          </Formula>
          <Warn>ซื้อก่อน Earnings IV พุ่งสูง — แม้ราคาหุ้นขึ้นตามคาด IV Crush ทำให้ Vega ลบกำไรที่ได้จาก Delta</Warn>
        </div>
      ),
    },
    {
      id: "greeks", emoji: "🔢",
      titleTh: "Greeks แบบภาษาคน",
      titleEn: "The Greeks in Plain Language",
      tag: isEn ? "Greeks" : "Greeks",
      chatQ: "อธิบาย Option Greeks ทั้ง 5 ตัว พร้อมตัวอย่างว่าแต่ละตัวส่งผลอย่างไรกับ P&L",
      body: (
        <div className="flex flex-col gap-2 text-xs">
          {GREEKS.map(g => (
            <div key={g.name} className="flex gap-3 px-3 py-2.5 bg-[#fefae0] border border-[#e9edc9]">
              <div
                className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-lg font-black text-white rounded-sm"
                style={{ background: g.color, fontFamily: "var(--font-mono)" }}
              >
                {g.sym}
              </div>
              <div>
                <span className="font-bold text-[#1A1A1A]" style={{ color: g.color }}>{g.name}</span>
                <p className="text-[11px] text-[#6B6B6B] mt-0.5 leading-relaxed">{g.desc}</p>
              </div>
            </div>
          ))}
          <Tip>Priority ของมือใหม่: Theta (ทุกวัน) → Delta (ทิศ) → Vega (ก่อนงบ) → Gamma / Rho (ขั้นสูง)</Tip>
        </div>
      ),
    },
    {
      id: "strike-maturity", emoji: "⏱️",
      titleTh: "เลือก Strike & Maturity",
      titleEn: "Choosing Strike & Expiry",
      tag: isEn ? "Strategy" : "กลยุทธ์",
      chatQ: "ควรเลือก Strike ITM/ATM/OTM และ Expiry นานแค่ไหนสำหรับมือใหม่?",
      body: (
        <div className="flex flex-col gap-2 text-xs text-[#1A1A1A] leading-relaxed">
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { label: "ITM",  color: "#1F9D55", pros: "ขยับคล้ายหุ้น Delta สูง", cons: "Premium แพง" },
              { label: "ATM",  color: "#D97706", pros: "สมดุล Delta ≈ 0.5",       cons: "Theta สูง" },
              { label: "OTM",  color: "#D64545", pros: "Premium ถูก leverage สูง", cons: "หมดค่าง่ายมาก" },
            ].map(({ label, color, pros, cons }) => (
              <div key={label} className="p-2 border flex flex-col gap-1" style={{ borderColor: color, background: `${color}10` }}>
                <span className="text-xs font-black" style={{ color }}>{label}</span>
                <p className="text-[9px] text-[#1F9D55]">+ {pros}</p>
                <p className="text-[9px] text-[#D64545]">− {cons}</p>
              </div>
            ))}
          </div>
          <Formula>
{`กฎทอง Expiry:
ให้เวลา trade มากกว่าที่คิด เสมอ
คิดว่า 2 สัปดาห์ → ซื้อ 4–6 สัปดาห์
คิดว่า 1 เดือน → ซื้อ 2–3 เดือน`}
          </Formula>
          <Warn>อย่าซื้อ Weekly option เพราะ premium ดูถูก — มันถูกเพราะ Theta กินเร็วมาก เหมาะแค่คนมีประสบการณ์</Warn>
          <p className="text-[10px] text-[#8A8378]">สำหรับมือใหม่: ATM หรือ Slight ITM + Expiry อย่างน้อย 30–60 วัน (หรือ LEAPS ถ้า bullish ระยะยาว)</p>
        </div>
      ),
    },
    {
      id: "chain", emoji: "📋",
      titleTh: "อ่าน Option Chain",
      titleEn: "Reading the Option Chain",
      tag: isEn ? "Execution" : "การเปิด order",
      chatQ: "อธิบายวิธีอ่าน Option Chain ว่าดูอะไรก่อนตัดสินใจซื้อ",
      body: (
        <div className="flex flex-col gap-2 text-xs text-[#1A1A1A] leading-relaxed">
          <div className="grid grid-cols-2 gap-1.5 text-[10px]">
            {[
              { label: "Bid / Ask",       desc: "ราคาซื้อ/ขาย — ยิ่ง Spread กว้างยิ่งเสียเปรียบ" },
              { label: "Volume",          desc: "จำนวน contract ซื้อขายวันนี้ — ยิ่งสูงยิ่งดี" },
              { label: "Open Interest",   desc: "สัญญาที่เปิดค้างอยู่ — OI ต่ำ = สภาพคล่องต่ำ" },
              { label: "IV (Imp. Vol.)",  desc: "ความผันผวน implied — สูงแปลว่า option แพงอยู่" },
            ].map(({ label, desc }) => (
              <div key={label} className="px-2 py-1.5 bg-[#faedcd] border border-[#e9edc9] flex flex-col gap-0.5">
                <span className="font-black text-[#1A1A1A]" style={{ fontFamily: "var(--font-mono)" }}>{label}</span>
                <span className="text-[#6B6B6B]">{desc}</span>
              </div>
            ))}
          </div>
          <Formula>
{`กฎเหล็ก Bid-Ask Spread:
Spread &gt; 10% ของ Premium = หลีกเลี่ยง
เช่น Premium $1.00, Spread $0.15 (15%) → แพงเกิน
ราคา Mid = (Bid + Ask) ÷ 2 ใช้เป็น reference`}
          </Formula>
          <Tip>OI ต่ำ + Volume ต่ำ = ออกจาก position ยาก อาจโดน fill ราคาแย่ เลือก option ที่ OI เกิน 100 contracts</Tip>
        </div>
      ),
    },
    {
      id: "put-strategies", emoji: "🛡️",
      titleTh: "กลยุทธ์ Long Put (ป้องกันพอร์ต)",
      titleEn: "Long Put Strategies for Portfolio Protection",
      tag: isEn ? "Strategies" : "กลยุทธ์",
      chatQ: "ถ้าฉันถือหุ้น NVDA ควรใช้ Put strategy ไหนป้องกันพอร์ต?",
      body: (
        <div className="flex flex-col gap-2 text-xs text-[#1A1A1A] leading-relaxed">
          {PUT_STRATEGIES.map(s => (
            <div key={s.name} className="p-3 border border-[#ccd5ae] bg-[#fefae0]">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-black text-[#1A1A1A]">{s.name}</span>
                <span className="text-[9px] px-1.5 py-0.5 bg-[#e9edc9] text-[#6B6B6B]">{s.use}</span>
              </div>
              <p className="text-[11px] text-[#6B6B6B] leading-relaxed">{s.th}</p>
            </div>
          ))}
          <div className="p-3 bg-[#F5F3FF] border border-[#8B5CF6]">
            <p className="text-[11px] text-[#4B4569] font-bold mb-1">ตัวอย่าง Profit Lock (NVDA)</p>
            <p className="text-[11px] text-[#4B4569]">ซื้อ NVDA ที่ $100 → ขึ้นมา $200 (กำไร $100/หุ้น) เอาเงิน $5–10/หุ้น ซื้อ Put $190 ป้องกัน downside โดยไม่ต้องขายหุ้น</p>
          </div>
          <Tip>ไม่จำเป็นต้อง hedge เต็ม 100% เสมอ — hedge แค่ส่วนที่คุณ "ทนขาดทุนไม่ได้"</Tip>
        </div>
      ),
    },
    {
      id: "sizing-rolling", emoji: "⚖️",
      titleTh: "Position Sizing & Rolling",
      titleEn: "Position Sizing & Rolling",
      tag: isEn ? "Risk Mgmt" : "ควบคุมความเสี่ยง",
      chatQ: "กฎ Position Sizing สำหรับ Option trading คืออะไร และเมื่อไหร่ควร Roll?",
      body: (
        <div className="flex flex-col gap-2 text-xs text-[#1A1A1A] leading-relaxed">
          <Formula>
{`Position Size สำหรับ Option:
ไม่เกิน 2–5% ของพอร์ตต่อ trade
ไม่ all-in option เด็ดขาด (หมดค่าได้ 100%)

Portfolio $100,000 → ต่อ trade ≤ $2,000–5,000`}
          </Formula>

          <div className="p-3 border border-[#D97706] bg-[#FFFBEB]">
            <p className="font-bold text-[#D97706] mb-1.5">Rolling — เมื่อไหร่ใช้?</p>
            <div className="flex flex-col gap-1.5">
              {[
                { t: "Roll Out",   d: "ขยาย Expiry ออกไป — ใช้เมื่อ thesis ยังถูกแต่เวลาไม่พอ" },
                { t: "Roll Up/Down", d: "ย้าย Strike — ใช้เมื่อราคาหุ้นขยับจาก OTM เข้า ATM/ITM" },
              ].map(({ t, d }) => (
                <div key={t} className="flex gap-2">
                  <span className="font-black text-[#D97706] w-24 flex-shrink-0">{t}</span>
                  <span className="text-[#6B6B6B]">{d}</span>
                </div>
              ))}
            </div>
          </div>
          <Warn>Roll ไม่ใช่การ "แก้แค้นตลาด" — ถ้า thesis เปลี่ยนแล้ว ตัดขาดทุนดีกว่า Roll ต่อ</Warn>
          <div className="p-3 border border-[#1F9D55] bg-[#F0FDF4]">
            <p className="font-bold text-[#1F9D55] mb-1">Exit Plan ก่อนเปิด Trade เสมอ</p>
            <ul className="flex flex-col gap-1 text-[11px] text-[#1A1A1A]">
              <li>→ กำไร 30–50% ในสัญญาสั้น (ล็อกบางส่วนได้)</li>
              <li>→ กำไร 80–100% ใน LEAPS (พิจารณาเก็บต่อ)</li>
              <li>→ ขาดทุน 50% ของ Premium → review หรือตัดทิ้ง</li>
              <li>→ เหลือเวลา &lt; 21 วัน → ออก ไม่ gamble</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: "checklist", emoji: "✅",
      titleTh: "Checklist ก่อนกด Order",
      titleEn: "Pre-Trade Checklist",
      tag: isEn ? "Checklist" : "Checklist",
      chatQ: "ช่วยทำ Checklist 7 ข้อก่อนซื้อ Option ให้หน่อย",
      body: (
        <div className="flex flex-col gap-2 text-xs text-[#1A1A1A] leading-relaxed">
          {[
            { q: "Thesis ชัดไหม?",                        d: "บอกได้ว่าทำไมถึงขึ้น/ลง ภายในกี่วัน?" },
            { q: "IV สูงหรือต่ำเมื่อเทียบกับ IV Rank?",  d: "IV Rank < 30 = ซื้อ option ถูก · > 70 = แพงเกิน" },
            { q: "Theta เสียวันละเท่าไหร่?",              d: "ต้องไม่เกิน 1–2% ของ Premium ต่อวัน" },
            { q: "Break-even อยู่ที่ไหน?",                d: "คำนวณก่อนกด ไม่ใช่หลังขาดทุน" },
            { q: "Bid-Ask Spread < 10% ของ Premium?",    d: "ถ้าเกิน หา strike/expiry อื่น" },
            { q: "Position Size ≤ 5% ของพอร์ต?",         d: "ไม่ all-in อ้างอิงกฎเสมอ" },
            { q: "มี Exit Plan ชัดแล้ว?",                d: "Target กำไร + Stop loss + วัน exit ก่อนหมดอายุ" },
          ].map(({ q, d }, i) => (
            <div key={i} className="flex gap-2.5 px-3 py-2 bg-[#fefae0] border border-[#e9edc9]">
              <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-[9px] font-black text-white rounded-sm" style={{ background: "#1F9D55" }}>{i+1}</span>
              <div>
                <p className="font-bold">{q}</p>
                <p className="text-[10px] text-[#6B6B6B] mt-0.5">{d}</p>
              </div>
            </div>
          ))}

          <div className="p-3 border border-[#ccd5ae] bg-[#faedcd]">
            <p className="font-bold text-[#1A1A1A] mb-2">เมื่อไหร่ควรซื้อหุ้นตรงแทน Option?</p>
            <ul className="flex flex-col gap-1 text-[11px] text-[#6B6B6B]">
              <li>→ ไม่แน่ใจ timing แต่มั่นใจระยะยาว → ซื้อหุ้น / ETF DCA</li>
              <li>→ IV สูงมาก (Premium แพงมาก) → ซื้อหุ้นตรงประหยัดกว่า</li>
              <li>→ ไม่ต้องการ leverage → ซื้อหุ้นไม่มีความเสี่ยงหมดค่า</li>
              <li>→ ยังไม่เข้าใจ Greeks ดีพอ → ซื้อหุ้นตรงก่อนเสมอ</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: "mistakes", emoji: "⚠️",
      titleTh: "7 ข้อผิดพลาดมือใหม่ที่พบบ่อยที่สุด",
      titleEn: "7 Most Common Beginner Mistakes",
      tag: isEn ? "Mistakes" : "ข้อผิดพลาด",
      chatQ: "อธิบาย 7 ข้อผิดพลาดที่มือใหม่ทำบ่อยที่สุดใน Option trading",
      body: (
        <div className="flex flex-col gap-2 text-xs text-[#1A1A1A]">
          {MISTAKES.map(m => (
            <div key={m.n} className="flex gap-2.5 px-3 py-2 bg-[#FEF2F2] border border-[#FECACA]">
              <span
                className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-[9px] font-black text-white rounded-sm"
                style={{ background: "#D64545" }}
              >
                {m.n}
              </span>
              <div>
                <p className="font-bold text-[#D64545]">{m.th}</p>
                {isEn && <p className="text-[9px] text-[#8A8378]">{m.en}</p>}
                <p className="text-[10px] text-[#6B6B6B] mt-0.5">{m.why}</p>
              </div>
            </div>
          ))}
        </div>
      ),
    },
  ];
}

// ── Beginner sections ─────────────────────────────────────────────────────────

function buildBeginnerSections(isEn: boolean): Section[] {
  return [
    {
      id: "b-what", emoji: "💡",
      titleTh: "Option คืออะไร? (เริ่มจากศูนย์)",
      titleEn: "What is an Option? (Start from zero)",
      tag: isEn ? "Intro" : "บทนำ",
      chatQ: "อธิบาย Option ให้เข้าใจง่ายที่สุด เหมือนอธิบายให้คนไม่รู้เรื่องหุ้นเลย",
      body: (
        <div className="flex flex-col gap-2 text-xs text-[#1A1A1A] leading-relaxed">
          <p>ปกติถ้าเราอยากได้ของ เราก็ <strong>ซื้อของเลย</strong> ใช่ไหม?</p>
          <p>แต่ Option ต่างออกไป — เราจ่าย <strong>เงินก้อนเล็กๆ (Premium)</strong> เพื่อซื้อ <strong>&quot;สิทธิ์&quot;</strong> ที่จะซื้อหรือขายหุ้นในอนาคต ที่ราคาที่ตกลงกันไว้ตั้งแต่ตอนนี้</p>
          <div className="my-1 px-3 py-2.5 bg-[#F5F3FF] border border-[#8B5CF6]">
            <p className="text-[11px] font-bold text-[#8B5CF6]">พูดง่ายๆ:</p>
            <p className="text-[11px] text-[#4B4569] mt-1">เราไม่ได้เป็นเจ้าของหุ้นจริง เราถือแค่ <strong>&quot;สิทธิ์&quot;</strong></p>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <div className="px-3 py-2 bg-[#F0FDF4] border border-[#1F9D55]">
              <p className="text-[10px] font-bold text-[#1F9D55]">ถ้าสิทธิ์มีค่า</p>
              <p className="text-[11px] text-[#1A1A1A] mt-0.5">→ เราได้กำไร</p>
            </div>
            <div className="px-3 py-2 bg-[#FEF2F2] border border-[#D64545]">
              <p className="text-[10px] font-bold text-[#D64545]">ถ้าสิทธิ์ไม่มีค่า</p>
              <p className="text-[11px] text-[#1A1A1A] mt-0.5">→ เสียแค่ Premium ก้อนเล็กๆ ไม่มากกว่านั้น</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "b-two", emoji: "📊",
      titleTh: "สองท่าพื้นฐาน: Call & Put",
      titleEn: "Two Basic Positions: Call & Put",
      tag: isEn ? "Basics" : "พื้นฐาน",
      chatQ: "อธิบาย Long Call และ Long Put ด้วยอุปมาที่เข้าใจง่าย",
      body: (
        <div className="flex flex-col gap-3 text-xs text-[#1A1A1A] leading-relaxed">
          {/* Call */}
          <div className="p-3 border-2 border-[#2563EB] bg-[#EFF6FF]">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-base font-black text-white px-2 py-0.5" style={{ background: "#2563EB" }}>CALL</span>
              <span className="font-bold text-[#2563EB]">เดิมพันว่าหุ้นจะ &quot;ขึ้น&quot;</span>
            </div>
            <p className="text-[11px] font-bold text-[#8A8378] mb-1.5">นึกถึง... คูปองล็อกราคา</p>
            <div className="px-3 py-2 bg-white border border-[#BFDBFE] text-[11px]">
              <p>จ่าย 100 บาท ซื้อคูปองที่ให้สิทธิ์ซื้อมือถือราคา 1,000 บาท ได้ภายในเดือนนี้</p>
              <p className="mt-1 text-[#1F9D55]">✅ มือถือขึ้น 1,500 → คูปองมีค่า! ซื้อได้แค่ 1,000</p>
              <p className="mt-0.5 text-[#D64545]">❌ ราคาไม่ขึ้น → คูปองหมดอายุ เสียแค่ 100 บาท</p>
            </div>
            <p className="text-[10px] text-[#6B6B6B] mt-1.5">หุ้นก็เหมือนกัน — Call = เดิมพันว่าหุ้นขึ้นแรงพอ ภายในเวลาที่กำหนด</p>
          </div>

          {/* Put */}
          <div className="p-3 border-2 border-[#D64545] bg-[#FEF2F2]">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-base font-black text-white px-2 py-0.5" style={{ background: "#D64545" }}>PUT</span>
              <span className="font-bold text-[#D64545]">&quot;ประกัน&quot; หรือเดิมพันว่าหุ้นจะ &quot;ลง&quot;</span>
            </div>
            <p className="text-[11px] font-bold text-[#8A8378] mb-1.5">นึกถึง... การซื้อประกันบ้าน/รถ</p>
            <div className="px-3 py-2 bg-white border border-[#FECACA] text-[11px]">
              <p>จ่ายเบี้ยประกัน → ถ้าเกิดเรื่องร้าย (หุ้นร่วง) ประกันจ่ายคืน</p>
              <p className="mt-1 text-[#8A8378]">ถ้าไม่เกิดอะไร เราเสียแค่เบี้ย</p>
            </div>
            <p className="text-[11px] font-bold text-[#1A1A1A] mt-2">ใช้ได้ 2 แบบ:</p>
            <ul className="mt-1 flex flex-col gap-1 text-[11px]">
              <li className="flex gap-1.5"><span className="text-[#D64545]">▸</span>เดิมพันว่าหุ้นจะลง (ไม่ต้อง short หุ้น)</li>
              <li className="flex gap-1.5"><span className="text-[#D64545]">▸</span>มีหุ้นอยู่แล้ว กลัวลง → ซื้อ Put ไว้กันเหนียว เหมือน <strong>ซื้อร่มก่อนฝนตก</strong></li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: "b-math", emoji: "🔢",
      titleTh: "ลองคิดเลขง่ายๆ สัก 1 รอบ",
      titleEn: "Simple Math — One Round",
      tag: isEn ? "Example" : "ตัวอย่าง",
      chatQ: "คำนวณ Break-even และ P&L ของ Long Call ให้ดูพร้อมตัวอย่างตัวเลข",
      body: (
        <div className="flex flex-col gap-3 text-xs text-[#1A1A1A] leading-relaxed">
          <div className="px-3 py-2.5 bg-[#faedcd] border border-[#ccd5ae] text-[11px]">
            <p>หุ้นราคา <strong>100 บาท</strong> → ซื้อ Call ที่ Strike = <strong>105</strong> จ่าย Premium = <strong>3 บาท</strong></p>
          </div>
          <Formula>จุดคุ้มทุน = Strike + Premium = 105 + 3 = 108 บาท{"\n"}(หุ้นต้องเกิน 108 เราถึงเริ่มกำไร)</Formula>
          <div className="flex flex-col gap-1.5">
            {[
              { price: "112 บาท", result: "✅ กำไร", detail: "112 − 108 = +4 บาท/หุ้น",  bg: "#F0FDF4", color: "#1F9D55" },
              { price: "103 บาท", result: "❌ ขาดทุน", detail: "ขึ้นแต่ไม่ถึง 108 → เสีย Premium ทั้งก้อน", bg: "#FEF2F2", color: "#D64545" },
              { price: "99 บาท",  result: "❌ เสีย Premium", detail: "เสียแค่ 3 บาท — ไม่มากกว่านั้นเลย", bg: "#FEF2F2", color: "#D64545" },
            ].map(({ price, result, detail, bg, color }) => (
              <div key={price} className="flex items-start gap-3 px-3 py-2 border" style={{ background: bg, borderColor: color }}>
                <span className="font-bold w-16 flex-shrink-0" style={{ fontFamily: "var(--font-mono)" }}>{price}</span>
                <span className="font-bold flex-shrink-0" style={{ color }}>{result}</span>
                <span className="text-[10px] text-[#6B6B6B]">{detail}</span>
              </div>
            ))}
          </div>
          <Tip>ไม่ว่าหุ้นจะร่วงหนักแค่ไหน เราเสียมากสุดแค่ 3 บาท (ค่า Premium) — นี่คือข้อดีของ Long Option: <strong>ขาดทุนจำกัด</strong></Tip>
        </div>
      ),
    },
    {
      id: "b-traps", emoji: "🪤",
      titleTh: "3 กับดักที่ต้องรู้ (ทำไม Option ยากกว่าซื้อหุ้น)",
      titleEn: "3 Traps — Why Options Are Harder Than Stocks",
      tag: isEn ? "Traps" : "กับดัก",
      chatQ: "อธิบาย 3 กับดักหลักของ Option ที่มือใหม่มักโดน",
      body: (
        <div className="flex flex-col gap-3 text-xs text-[#1A1A1A] leading-relaxed">
          <p className="text-[11px] text-[#8A8378]">หุ้นจริงถือได้ตลอดไป แต่ Option มี 3 อย่างที่ต่างออกไป:</p>
          {[
            {
              n: 1, emoji: "⏳", color: "#D64545",
              titleTh: "มันมีวันหมดอายุ",
              titleEn: "It has an expiry date",
              desc: "Option เหมือน ของสด หรือตั๋วที่ค่อยๆ หมดค่าเมื่อใกล้วันหมดอายุ ทุกวันที่ผ่านไปมันเสียค่าไปนิดนึง แม้หุ้นไม่ขยับเลย",
              note: "ยิ่งใกล้วันหมดอายุ ยิ่งเสียค่าเร็ว (เรียกว่า Time Decay / Theta)",
            },
            {
              n: 2, emoji: "🏃", color: "#D97706",
              titleTh: "ต้องขึ้น &quot;เร็วพอ&quot; และ &quot;มากพอ&quot;",
              titleEn: "Must move fast enough AND far enough",
              desc: "ทายถูกว่าหุ้นขึ้น... ยังไม่พอ ถ้าหุ้นขึ้นช้าไป หรือขึ้นนิดเดียว เราก็ยังขาดทุนได้ เพราะเวลาหมดก่อนที่หุ้นจะไปถึงเป้า",
              note: "ต้องถูก 3 เรื่องพร้อมกัน: ทิศ + ความเร็ว + ระยะทาง",
            },
            {
              n: 3, emoji: "🎢", color: "#8B5CF6",
              titleTh: "ค่าความตื่นเต้น (IV)",
              titleEn: "Excitement value — IV",
              desc: "ก่อนข่าวใหญ่/งบ ทุกคนคาดว่าหุ้นจะแกว่งแรง → Option แพงขึ้น เหมือนตั๋วคอนเสิร์ตที่คนแย่งซื้อ ราคาพุ่ง พอข่าวออกจริง ความตื่นเต้นหาย → ราคา Option ตกฮวบ (IV Crush)",
              note: "เลยขาดทุนได้แม้ทายทิศถูก ถ้าจ่ายแพงไปตอนตื่นเต้นสุดๆ",
            },
          ].map(({ n, emoji, color, titleTh, titleEn, desc, note }) => (
            <div key={n} className="p-3 border-l-4" style={{ borderColor: color, background: `${color}10` }}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-lg">{emoji}</span>
                <span className="text-xs font-bold" style={{ color }}>
                  กับดักที่ {n}: {isEn ? titleEn : titleTh}
                </span>
              </div>
              <p className="text-[11px] text-[#1A1A1A]" dangerouslySetInnerHTML={{ __html: desc }} />
              <p className="text-[10px] text-[#8A8378] mt-1">→ {note}</p>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: "b-why-red", emoji: "🤔",
      titleTh: "&quot;หุ้นขึ้น แต่ทำไม Call ฉันยังแดง?!&quot;",
      titleEn: "\"Stock up — so why is my Call still red?!\"",
      tag: isEn ? "Most Asked" : "ถามบ่อยสุด",
      chatQ: "ทำไมหุ้นขึ้นแต่ Call option ยังติดลบ อธิบายให้เข้าใจง่ายๆ",
      body: (
        <div className="flex flex-col gap-2 text-xs text-[#1A1A1A] leading-relaxed">
          <p>นี่คือคำถามที่มือใหม่งงที่สุด และคิดว่า <strong>&quot;แอปโกงรึเปล่า&quot;</strong></p>
          <div className="px-3 py-2.5 bg-[#1A1A1A] text-[#faedcd] text-[11px] font-bold" style={{ fontFamily: "var(--font-mono)" }}>
            ราคา Option ไม่ได้ขึ้นกับทิศทางอย่างเดียว<br/>
            แต่ขึ้นกับ 3 อย่างพร้อมกัน:<br/>
            ทิศทาง + เวลา + ความเร็ว
          </div>
          <div className="px-3 py-2.5 bg-[#FFFBEB] border border-[#D97706]">
            <p className="text-[11px] text-[#D97706] font-bold mb-1">สถานการณ์ที่เกิดขึ้นจริง:</p>
            <p className="text-[11px]">หุ้นขึ้น (ทิศถูก) แต่ขึ้นช้า/นิดเดียว + เวลาเหลือน้อย + ค่าความตื่นเต้นหายไป</p>
            <p className="text-[11px] font-bold text-[#D64545] mt-1">= Call ยังแดงได้</p>
          </div>
          <Tip>ระบบไม่ได้โกง — มันทำงานตามกติกาของมันเป๊ะๆ แค่เราต้องเข้าใจกติกาก่อน</Tip>
        </div>
      ),
    },
    {
      id: "b-rules", emoji: "🛡️",
      titleTh: "กฎความปลอดภัย 5 ข้อ สำหรับมือใหม่",
      titleEn: "5 Safety Rules for Beginners",
      tag: isEn ? "Safety" : "ความปลอดภัย",
      chatQ: "กฎความปลอดภัย 5 ข้อสำหรับมือใหม่ที่เพิ่งเริ่มเล่น Option",
      body: (
        <div className="flex flex-col gap-2 text-xs text-[#1A1A1A] leading-relaxed">
          {[
            { n: 1, rule: "ใส่เงินเท่าที่ &quot;หายหมดแล้วยังไหว&quot;", why: "Option เสียได้ 100% ของ Premium — ไม่ใช่เรื่องเล่นๆ" },
            { n: 2, rule: "อย่าซื้อสัญญาสั้นเพราะดูถูก", why: "ให้เวลาตัวเองมากกว่าที่คิดเสมอ ตลาดไม่วิ่งตามปฏิทินเรา" },
            { n: 3, rule: "ระวังซื้อก่อนประกาศงบ", why: "ช่วงนั้น &quot;ค่าความตื่นเต้น&quot; แพงมาก IV Crush ทำให้ขาดทุนแม้ทายถูก" },
            { n: 4, rule: "ไม่เกิน 2–5% ของพอร์ตต่อ trade", why: "อย่าทุ่มก้อนใหญ่ใน trade เดียว — มือใหม่โดน Theta กินทุกวัน" },
            { n: 5, rule: "วางแผนขายล่วงหน้าก่อนกดซื้อ", why: "กำไรเท่าไหร่ออก ขาดทุนเท่าไหร่ออก ตัดสินใจตอนหัวเย็น ไม่ใช่ตอนตื่นตระหนก" },
          ].map(({ n, rule, why }) => (
            <div key={n} className="flex gap-2.5 px-3 py-2 bg-[#fefae0] border border-[#ccd5ae]">
              <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-[9px] font-black text-white rounded-sm" style={{ background: "#1A1A1A" }}>{n}</span>
              <div>
                <p className="font-bold" dangerouslySetInnerHTML={{ __html: rule }} />
                <p className="text-[10px] text-[#6B6B6B] mt-0.5">{why}</p>
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: "b-summary", emoji: "🎯",
      titleTh: "สรุปง่ายๆ: ใช้ตัวไหนเมื่อไหร่",
      titleEn: "Summary: Which to Use When",
      tag: isEn ? "Summary" : "สรุป",
      chatQ: "สรุปว่าควรใช้ Long Call หรือ Long Put ในสถานการณ์ไหน",
      body: (
        <div className="flex flex-col gap-3 text-xs text-[#1A1A1A]">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[11px]" style={{ minWidth: 300 }}>
              <thead>
                <tr className="bg-[#1A1A1A] text-white text-[10px] font-bold">
                  <th className="px-3 py-2 text-left">สถานการณ์ของคุณ</th>
                  <th className="px-3 py-2 text-center">ใช้ตัวไหน</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { sit: "คิดว่าหุ้นจะ ขึ้น + อยากเสี่ยงแบบจำกัด", ans: "🟢 Long Call", color: "#2563EB" },
                  { sit: "มีหุ้นอยู่แล้ว + กลัวมันร่วง", ans: "🔴 Long Put (ประกัน)", color: "#D64545" },
                  { sit: "คิดว่าหุ้นจะ ลง", ans: "🔴 Long Put", color: "#D64545" },
                ].map(({ sit, ans, color }, i) => (
                  <tr key={i} style={{ background: i % 2 ? "#fefae0" : "#e9edc9", borderBottom: "1px solid #e9edc9" }}>
                    <td className="px-3 py-2">{sit}</td>
                    <td className="px-3 py-2 text-center font-bold" style={{ color }}>{ans}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 text-center" style={{ background: "#1A1A1A", boxShadow: "3px 3px 0 #D64545" }}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#D64545] mb-1">จำประโยคเดียวนี้</p>
            <p className="text-sm font-black text-white leading-relaxed">
              &ldquo;ซื้อ Option = เดิมพันทั้ง ทิศทาง + เวลา + ความเร็ว พร้อมกัน&rdquo;
            </p>
          </div>
        </div>
      ),
    },
  ];
}

// ── Section card component ────────────────────────────────────────────────────

function SectionCard({ section, isEn }: { section: Section; isEn: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ border: "1.5px solid #ccd5ae", background: "#fefae0", boxShadow: "2px 2px 0 #ccd5ae" }}>
      <button
        className="flex items-start gap-3 px-4 py-3 text-left w-full"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <span className="text-xl flex-shrink-0 mt-0.5">{section.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-[#1A1A1A]">
              {isEn ? section.titleEn : section.titleTh}
            </span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 bg-[#e9edc9] text-[#6B6B6B]">{section.tag}</span>
          </div>
        </div>
        <span className="flex-shrink-0 text-[#8A8378] text-xs mt-1">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-[#e9edc9]">
          <div className="mt-3">{section.body}</div>
          <Link
            href={`/chat?q=${encodeURIComponent(section.chatQ)}`}
            className="mt-3 flex items-center gap-1.5 text-[10px] font-bold text-[#8B5CF6] hover:underline self-start"
          >
            ✦ {isEn ? "Ask Martin" : "ถาม Martin"} →
          </Link>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function OptionsPage() {
  const { lang }    = useI18n();
  const isEn        = lang === "en";
  const [mode, setMode] = useState<"beginner" | "advanced">("beginner");
  const sections    = mode === "beginner" ? buildBeginnerSections(isEn) : buildSections(isEn);

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-5">

        {/* Header */}
        <div style={{ background: "#1A1A1A", boxShadow: "4px 4px 0 #D64545" }} className="px-5 py-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#D64545] mb-1">
            Options 101
          </p>
          <h1 className="text-xl font-black text-white leading-tight">
            {isEn ? "Options Trading — Foundations" : "Options Trading — ฉบับภาษาคน"}
          </h1>
          <p className="text-xs text-[#8A8378] mt-1.5">
            {isEn
              ? "Buying direction + time + volatility simultaneously — tap each section to expand."
              : "ซื้อ Option = ซื้อทิศทาง + เวลา + IV พร้อมกัน — กดแต่ละหัวข้อเพื่อขยาย"}
          </p>

          {/* Key mantra always visible */}
          <div className="mt-4 px-3 py-2.5 text-xs font-black leading-relaxed" style={{ background: "#D64545", color: "#fff", fontFamily: "var(--font-mono)" }}>
            {isEn
              ? "Long Option = Direction × Time × IV · Max loss = Premium paid"
              : "ซื้อ Option = ทิศทาง × เวลา × IV · ขาดทุนสูงสุด = Premium"}
          </div>
        </div>

        {/* Level toggle */}
        <div className="flex border border-[#ccd5ae]" style={{ boxShadow: "2px 2px 0 #d4a373" }}>
          {(["beginner", "advanced"] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="flex-1 py-2.5 text-xs font-bold transition-colors"
              style={{
                background: mode === m ? "#1A1A1A" : "#fefae0",
                color:      mode === m ? "#fff"    : "#8A8378",
                borderRight: m === "beginner" ? "1px solid #ccd5ae" : undefined,
              }}
            >
              {m === "beginner"
                ? (isEn ? "🟢 Beginner — Easy mode" : "🟢 มือใหม่ — ฉบับง่าย")
                : (isEn ? "🔴 Advanced — Full guide" : "🔴 ขั้นสูง — ฉบับครบ")}
            </button>
          ))}
        </div>

        {/* Navigation pills */}
        <div className="flex flex-wrap gap-1.5">
          {sections.map(s => (
            <button
              key={s.id}
              onClick={() => {
                const el = document.getElementById(`section-${s.id}`);
                el?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="text-[10px] font-bold px-2.5 py-1 border border-[#ccd5ae] bg-[#faedcd] text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white hover:border-[#1A1A1A] transition-colors"
            >
              {s.emoji} {s.tag}
            </button>
          ))}
        </div>

        {/* Sections */}
        <div className="flex flex-col gap-3">
          {sections.map(s => (
            <div key={s.id} id={`section-${s.id}`}>
              <SectionCard section={s} isEn={isEn} />
            </div>
          ))}
        </div>

        {/* Ask Martin CTA */}
        <Link
          href="/chat?q=ฉันอยากเรียนรู้ Options trading ช่วยแนะนำว่าควรเริ่มจากตรงไหน และ Long Call vs Long Put ต่างกันอย่างไร"
          style={{ border: "1.5px solid #D64545", boxShadow: "2px 2px 0 #D64545" }}
          className="flex items-center justify-center gap-2 py-3 text-xs font-bold text-[#D64545] bg-[#fefae0] hover:bg-[#D64545] hover:text-white transition-colors"
        >
          ✦ {isEn ? "Ask Martin to teach you Options step by step" : "ให้ Martin สอน Options ทีละขั้นตอน"}
        </Link>

        {/* Links to related tools */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { href: "/blueprint",  icon: "🗺️", label: isEn ? "Investment Blueprint" : "Blueprint การเงิน" },
            { href: "/valuation",  icon: "📐", label: isEn ? "Stock Valuation" : "ประเมินมูลค่าหุ้น" },
            { href: "/hunter",     icon: "🎯", label: isEn ? "SWOT & Risk" : "SWOT & ความเสี่ยง" },
            { href: "/screener",   icon: "🔬", label: isEn ? "Stock Screener" : "Stock Screener" },
          ].map(({ href, icon, label }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 px-3 py-2.5 border border-[#ccd5ae] bg-[#fefae0] hover:bg-[#faedcd] hover:border-[#1A1A1A] transition-colors"
            >
              <span>{icon}</span>
              <span className="text-xs font-bold text-[#1A1A1A]">{label}</span>
            </Link>
          ))}
        </div>

        {/* Disclaimer */}
        <p className="text-[10px] text-[#8A8378] text-center leading-relaxed">
          {isEn
            ? "Educational content only — not trading advice. Options involve risk of total loss of premium. Past examples are for illustration only."
            : "เนื้อหานี้เพื่อการศึกษาเท่านั้น ไม่ใช่คำแนะนำเทรด Options มีความเสี่ยงสูญเสีย Premium ทั้งหมด ตัวอย่างใช้เพื่ออธิบายเท่านั้น"}
        </p>

      </div>
    </AppShell>
  );
}
