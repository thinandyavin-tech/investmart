import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";

import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/Card";

export const metadata: Metadata = {
  title:       "Options Basics — InvestMart",
  description: "Learn how options contracts work: calls, puts, strike price, expiration, and what happens when options expire worthless.",
};

const LESSONS = [
  {
    id: "contract-leverage",
    icon: "📦",
    title: "1 Contract = 100 Shares (Leverage)",
    titleTh: "1 สัญญา = 100 หุ้น (Leverage)",
    body: [
      {
        heading: "How contracts multiply exposure",
        headingTh: "สัญญาขยาย exposure อย่างไร",
        text: `When you buy 1 options contract, you control 100 shares of the underlying stock.
So 25 contracts = 2,500 shares of exposure.

Example: ASTS Call option costs $1.56 per share
→ 25 contracts × 100 shares × $1.56 = $3,900 total cost
→ But you control 2,500 shares worth ~$197,500 (at $79/share)

This is leverage — you pay $3,900 to control $197,500 worth of stock.`,
        textTh: `เมื่อคุณซื้อ 1 สัญญาออปชัน คุณควบคุมหุ้น 100 หุ้นของหุ้นอ้างอิง
ดังนั้น 25 สัญญา = 2,500 หุ้น exposure

ตัวอย่าง: ASTS Call option ราคา $1.56 ต่อหุ้น
→ 25 สัญญา × 100 หุ้น × $1.56 = $3,900 ต้นทุนรวม
→ แต่คุณควบคุมหุ้นมูลค่า ~$197,500 (ที่ $79/หุ้น)

นี่คือ leverage — จ่าย $3,900 เพื่อควบคุมหุ้นมูลค่า $197,500`,
      },
      {
        heading: "Both gains AND losses are amplified",
        headingTh: "ทั้งกำไรและขาดทุนถูกขยาย",
        text: `If the stock goes up $5 → your call might gain $2.50/share = $6,250 (160% gain)
If the stock goes down $5 → your call might lose $2.00/share = $5,000 (128% loss)
If the option expires worthless → you lose 100% of the $3,900 premium`,
        textTh: `ถ้าหุ้นขึ้น $5 → call อาจได้ $2.50/หุ้น = $6,250 (กำไร 160%)
ถ้าหุ้นลง $5 → call อาจเสีย $2.00/หุ้น = $5,000 (ขาดทุน 128%)
ถ้าออปชันหมดอายุโดยไม่มีมูลค่า → เสีย 100% ของ premium $3,900`,
      },
    ],
  },
  {
    id: "breakeven-explained",
    icon: "⚖️",
    title: "How Breakeven Works",
    titleTh: "จุดคุ้มทุนทำงานอย่างไร",
    body: [
      {
        heading: "Call breakeven = Strike + Premium",
        headingTh: "จุดคุ้มทุน Call = Strike + Premium",
        text: `You bought a $90 Call for $1.56
→ Breakeven = $90.00 + $1.56 = $91.56

At expiry:
Stock at $91.56 → you break even (no profit, no loss beyond premium)
Stock at $95.00 → profit = ($95 - $91.56) × 100 shares = $344 per contract
Stock at $89.00 → option expires worthless, lose entire $156 per contract`,
        textTh: `คุณซื้อ Call $90 ที่ราคา $1.56
→ จุดคุ้มทุน = $90.00 + $1.56 = $91.56

เมื่อหมดอายุ:
หุ้นที่ $91.56 → คุ้มทุนพอดี (ไม่ได้กำไร ไม่ขาดทุนเพิ่ม)
หุ้นที่ $95.00 → กำไร = ($95 - $91.56) × 100 หุ้น = $344 ต่อสัญญา
หุ้นที่ $89.00 → ออปชันหมดอายุไร้มูลค่า เสีย $156 ต่อสัญญา`,
      },
    ],
  },
  {
    id: "itm-otm-live",
    icon: "🎯",
    title: "ITM vs OTM with the Live Price",
    titleTh: "ITM vs OTM กับราคาจริง",
    body: [
      {
        heading: "In The Money (ITM) — has real value",
        headingTh: "In The Money (ITM) — มีมูลค่าจริง",
        text: `A call is ITM when: Stock Price > Strike Price
Example: ASTS stock at $95, Call strike $90 → ITM ($5 intrinsic value per share)

Being ITM means the option has intrinsic value that can be exercised.`,
        textTh: `Call เป็น ITM เมื่อ: ราคาหุ้น > ราคา Strike
ตัวอย่าง: ASTS ราคา $95, Call strike $90 → ITM (มูลค่าที่แท้จริง $5 ต่อหุ้น)

การเป็น ITM หมายถึงออปชันมีมูลค่าจริงที่สามารถใช้สิทธิได้`,
      },
      {
        heading: "Out of The Money (OTM) — no intrinsic value",
        headingTh: "Out of The Money (OTM) — ไม่มีมูลค่าจริง",
        text: `A call is OTM when: Stock Price < Strike Price
Example: ASTS stock at $79, Call strike $90 → OTM (no intrinsic value)

The entire premium is "time value" — it only has value because time remains before expiry.
As expiry approaches, this time value shrinks (theta decay), eventually reaching $0.`,
        textTh: `Call เป็น OTM เมื่อ: ราคาหุ้น < ราคา Strike
ตัวอย่าง: ASTS ราคา $79, Call strike $90 → OTM (ไม่มีมูลค่าที่แท้จริง)

premium ทั้งหมดเป็น "time value" — มีมูลค่าเพราะยังเหลือเวลาก่อนหมดอายุ
เมื่อใกล้หมดอายุ time value จะลดลง (theta decay) จนกระทั่งเป็น $0`,
      },
    ],
  },
  {
    id: "expiration",
    icon: "⏰",
    title: "What Happens at Expiration",
    titleTh: "เกิดอะไรขึ้นเมื่อออปชันหมดอายุ",
    body: [
      {
        heading: "ITM at expiry → has value",
        headingTh: "ITM เมื่อหมดอายุ → มีมูลค่า",
        text: `If your call expires ITM (stock > strike), the option has intrinsic value.
It can be exercised to buy shares at the strike price, or sold before expiry for its market value.

Example: $90 Call, stock at $95 at expiry → option worth $5/share = $500/contract`,
        textTh: `ถ้า call หมดอายุขณะเป็น ITM (หุ้น > strike) ออปชันมีมูลค่าที่แท้จริง
สามารถใช้สิทธิซื้อหุ้นที่ราคา strike หรือขายก่อนหมดอายุเพื่อรับมูลค่าตลาด

ตัวอย่าง: Call $90, หุ้นที่ $95 เมื่อหมดอายุ → ออปชันมูลค่า $5/หุ้น = $500/สัญญา`,
      },
      {
        heading: "OTM at expiry → expires worthless ($0)",
        headingTh: "OTM เมื่อหมดอายุ → หมดมูลค่า ($0)",
        text: `This is the case many beginners hit: a $90 Call with the stock at ~$79 at expiry.

The stock never reached the strike price. There's no intrinsic value.
The option expires at $0. The holder loses 100% of the premium paid.

For 25 contracts at $1.56: total loss = $3,900 (the entire investment).

This is why OTM options near expiry are so risky — theta decay accelerates,
and the option needs a large, fast move in the stock to have any value.`,
        textTh: `นี่คือกรณีที่มือใหม่มักเจอ: Call $90 กับหุ้นที่ ~$79 เมื่อหมดอายุ

หุ้นไม่ถึง strike price ไม่มีมูลค่าจริง
ออปชันหมดอายุที่ $0 ผู้ถือเสีย premium ทั้งหมด 100%

สำหรับ 25 สัญญาที่ $1.56: ขาดทุนรวม = $3,900 (ทั้งหมดที่ลงทุน)

นี่คือเหตุผลว่าทำไมออปชัน OTM ใกล้หมดอายุจึงเสี่ยงมาก — theta decay เร่งตัว
และออปชันต้องการการเคลื่อนไหวของหุ้นที่ใหญ่และเร็วเพื่อจะมีมูลค่า`,
      },
    ],
  },
  {
    id: "theta-decay",
    icon: "📉",
    title: "Theta Decay — Why OTM Options Bleed",
    titleTh: "Theta Decay — ทำไมออปชัน OTM ถึงเสื่อมค่า",
    body: [
      {
        heading: "Time is the enemy of option buyers",
        headingTh: "เวลาคือศัตรูของผู้ซื้อออปชัน",
        text: `Every day that passes, your option loses some value — this is theta decay.
An OTM option with 30 days left might lose $0.02/share/day.
The same option with 5 days left might lose $0.10/share/day.
With 1 day left, it could lose most of its remaining value.

Theta decay accelerates exponentially as expiry approaches. This is why
holding a far-OTM option to expiry is almost always a losing strategy.`,
        textTh: `ทุกวันที่ผ่านไป ออปชันของคุณเสียมูลค่าบางส่วน — นี่คือ theta decay
ออปชัน OTM ที่เหลือ 30 วันอาจเสีย $0.02/หุ้น/วัน
ออปชันเดียวกันเหลือ 5 วันอาจเสีย $0.10/หุ้น/วัน
เหลือ 1 วัน อาจเสียมูลค่าที่เหลือเกือบทั้งหมด

Theta decay เร่งตัวแบบเอกซ์โพเนนเชียลเมื่อใกล้หมดอายุ นี่คือเหตุผลว่าทำไม
การถือออปชัน OTM จนหมดอายุแทบจะเป็นกลยุทธ์ที่ขาดทุนเสมอ`,
      },
    ],
  },
];

export default function OptionsLessonsPage() {
  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/learn" className="text-xs text-[#8A8378] hover:underline">
              ← Learn
            </Link>
          </div>
          <h1 className="text-sm font-bold uppercase tracking-widest">Options Basics</h1>
          <p className="text-xs text-[#8A8378] mt-0.5">
            5 interactive lessons with real examples — understand contracts, leverage, and expiration
          </p>
        </div>

        {LESSONS.map((lesson) => (
          <section key={lesson.id} id={lesson.id} className="flex flex-col gap-3 scroll-mt-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{lesson.icon}</span>
              <div>
                <h2 className="text-xs font-bold text-[#1F1A14]">
                  {lesson.title}
                </h2>
                <p className="text-[10px] text-[#8A8378]">{lesson.titleTh}</p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {lesson.body.map((section) => (
                <Card key={section.heading} className="p-3">
                  <h3 className="text-xs font-bold mb-0.5">{section.heading}</h3>
                  <p className="text-[10px] text-[#5B8A2A] mb-1.5">{section.headingTh}</p>
                  {section.text.split("\n").map((line, i) => (
                    line.trim()
                      ? <p key={i} className="text-xs text-[#8A8378] leading-relaxed">{line}</p>
                      : <div key={i} className="h-1.5" />
                  ))}
                </Card>
              ))}
            </div>
          </section>
        ))}

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 leading-relaxed">
          Options trading involves significant risk. This content is for educational purposes only — not investment advice. Paper trading lets you learn these concepts without real money.
        </div>

        <div className="flex flex-wrap gap-4 text-xs pt-2 border-t border-[#e9edc9]">
          <Link href="/glossary" className="text-[#5B8A2A] hover:underline">Glossary</Link>
          <Link href="/assets"   className="text-[#5B8A2A] hover:underline">Portfolio</Link>
          <Link href="/learn"    className="text-[#8A8378] hover:underline">← Back to Learn</Link>
        </div>
      </div>
    </AppShell>
  );
}
