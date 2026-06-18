"use client";

import { useState } from "react";
import { Link }     from "@/i18n/navigation";
import { AppShell } from "@/components/AppShell";
import { useI18n }  from "@/lib/i18n";

// ── Data ──────────────────────────────────────────────────────────────────────

interface Level {
  num:     number;
  emoji:   string;
  titleTh: string;
  titleEn: string;
  tagline: string;
  group:   "foundation" | "planning" | "assets" | "system";
  body:    string;
  keybox?: string;       // highlighted formula / key concept
  warning?: string;      // red warning box
  chatQ:   string;       // suggested Martin question
}

const LEVELS: Level[] = [
  {
    num: 0, emoji: "🫀",
    titleTh: "สุขภาพคือสินทรัพย์ที่แพงที่สุด",
    titleEn: "Health is Your Most Valuable Asset",
    tagline: "Human Capital > Portfolio",
    group: "foundation",
    body: `ร่างกายคือ Human Capital หรือมูลค่ารวมของรายได้ที่คุณจะสร้างได้ทั้งชีวิต ซึ่งมักใหญ่กว่าพอร์ตลงทุนหลายเท่า ถ้าสุขภาพพัง แผนการเงินทั้งหมดพังตาม

ดูแล 6 เสาหลัก:
• นอน 7–9 ชั่วโมง
• ออกกำลังกาย 3–5 ครั้ง/สัปดาห์
• กินอาหารดี
• จัดการความเครียด
• ตรวจสุขภาพประจำปี
• ทำประกันสุขภาพตั้งแต่ยังแข็งแรง (เบี้ยถูกกว่ามาก)`,
    keybox: "Human Capital = Σ (รายได้ต่อปี × ปีที่เหลือทำงาน)\nมักมากกว่าพอร์ตลงทุน 10–100×",
    chatQ: "ทำไม Human Capital ถึงสำคัญกว่าพอร์ตลงทุนสำหรับคนอายุน้อย?",
  },
  {
    num: 1, emoji: "🪞",
    titleTh: "รู้จักตัวเองก่อนรู้จักตลาด (KYC ตัวเอง)",
    titleEn: "Know Yourself Before the Market",
    tagline: "5 คำถามที่ต้องตอบได้",
    group: "foundation",
    body: `ก่อนลงทุนต้องตอบ 5 ข้อให้ได้:
1. รายรับ–รายจ่ายคงที่เท่าไหร่ (มีเงินเหลือไหม)
2. หนี้และดอกเบี้ยเท่าไหร่
3. ทนได้ไหมถ้าตลาดลง 40%
4. ต้องใช้เงินก้อนนี้เมื่อไหร่
5. เข้าใจสิ่งที่จะซื้อดีพอหรือยัง

จากนั้นประเมินว่าตัวเองเป็นนักลงทุนสาย Conservative, Moderate หรือ Aggressive เพราะมันกำหนดสัดส่วนสินทรัพย์ทั้งหมด`,
    keybox: "Conservative → พันธบัตร/เงินฝาก > หุ้น\nModerate → สมดุล 50/50\nAggressive → หุ้น/ETF > 80%",
    chatQ: "ช่วยประเมิน Risk Profile ของฉันแบบ Conservative/Moderate/Aggressive",
  },
  {
    num: 2, emoji: "💸",
    titleTh: "FCF > 0 คือประตูเดียวสู่การลงทุน",
    titleEn: "Positive Cash Flow: The Only Gate",
    tagline: "ลงทุนด้วยเงินที่เหลือ ไม่ใช่เงินที่ขาด",
    group: "foundation",
    body: `ถ้า FCF ติดลบแปลว่ากำลังกินต้นทุนตัวเอง ยังไม่ใช่เวลาลงทุน

ต้องสร้างรายได้เพิ่ม (Active Income) หรือลดรายจ่ายให้ FCF เป็นบวกก่อน

Active Income ต้องมาก่อน Passive Income เสมอ`,
    keybox: "FCF = รายรับ − รายจ่ายจำเป็น − ภาระหนี้\nถ้า FCF ≤ 0 → สร้างรายได้หรือลดค่าใช้จ่ายก่อน",
    warning: "ห้ามลงทุนถ้า FCF ติดลบ — คุณกำลังกินเงินต้นตัวเองอยู่",
    chatQ: "ช่วยวิเคราะห์ว่าฉันควรเพิ่มรายได้หรือลดรายจ่ายก่อนเริ่มลงทุน",
  },
  {
    num: 3, emoji: "🛡️",
    titleTh: "สร้างเกราะป้องกันก่อนลงทุน",
    titleEn: "Build Your Armor First",
    tagline: "เงินสำรอง + ประกัน = เกราะป้องพอร์ต",
    group: "foundation",
    body: `สองชั้น:

(1) เงินสำรองฉุกเฉิน 3–12 เท่าของรายจ่ายต่อเดือน เก็บในที่ถอนได้ทันทีอย่างกองทุนตลาดเงิน ห้ามเอาไปลงหุ้น

(2) ประกันที่จำเป็น:
• ประกันสุขภาพ
• โรคร้ายแรง (CI)
• ประกันชีวิตแบบ Term ถ้ามีคนต้องดูแล`,
    warning: "ถ้าไม่มีเกราะ เจอตลาดลงพร้อมเหตุฉุกเฉิน = ถูกบังคับขายหุ้นที่จุดต่ำสุด",
    chatQ: "เงินสำรองฉุกเฉินควรเก็บในกองทุนตลาดเงินไหนดี?",
  },
  {
    num: 4, emoji: "🎯",
    titleTh: "ตั้งเป้าหมายก่อนเลือกสินทรัพย์",
    titleEn: "Goals First, Assets Second",
    tagline: "เป้าหมายกำหนดสินทรัพย์ ไม่ใช่กลับกัน",
    group: "planning",
    body: `แบ่งเป็น 3 เส้นทางตามระยะเวลา:

🔵 ระยะยาว 10–30 ปี (เกษียณ/มรดก) → เน้นหุ้น/ETF
🟡 ระยะสั้น 1–3 ปี (บ้าน/รถ/แต่งงาน) → Money Market เท่านั้น ห้ามเอาไปลงหุ้น
🟢 รักษาเงินต้น → ฝากประจำ พันธบัตร ทองคำ (hedge)

เปิดบัญชีกับโบรกเกอร์ที่ได้ใบอนุญาต ก.ล.ต. เท่านั้น`,
    warning: "ห้ามเอาเงินระยะสั้น (1–3 ปี) ไปลงหุ้น — ตลาดอาจลง 40% ตอนคุณต้องการพอดี",
    chatQ: "ช่วยวางแผนสัดส่วนสินทรัพย์ตามเป้าหมายระยะ 5 ปีของฉัน",
  },
  {
    num: 5, emoji: "⚔️",
    titleTh: "ฆ่าหนี้ดอกสูงก่อน (Debt Avalanche)",
    titleEn: "Kill High-Interest Debt First",
    tagline: "ปิดหนี้ดอก 20% = ผลตอบแทน 20% ไม่มีความเสี่ยง",
    group: "planning",
    body: `วิธีทำ Debt Avalanche:
1. เรียงหนี้จากดอกเบี้ยสูง → ต่ำ
2. จ่ายขั้นต่ำทุกตัว
3. ทุ่มเงินที่เหลือใส่ตัวดอกสูงสุด
4. พอปิดได้ ส่งต่อตัวถัดไป (Snowball Effect)

ทำจนหนี้ดอกเกิน 10% หมดก่อนเริ่มลงทุน`,
    keybox: "ปิดหนี้บัตรเครดิตดอก 20% = ได้ผลตอบแทน +20%/ปี\nไม่มีหุ้นตัวไหนการันตีได้",
    chatQ: "ฉันมีหนี้บัตรเครดิต 3 ใบ ควรใช้ Debt Avalanche หรือ Snowball?",
  },
  {
    num: 6, emoji: "💰",
    titleTh: "ใช้สิทธิลดหย่อนภาษีให้เต็ม (SSF/RMF)",
    titleEn: "Maximize Tax Benefits",
    tagline: "ได้เงินคืน 20% ทันทีก่อนตลาดทำงาน",
    group: "planning",
    body: `ถ้าอยู่ฐานภาษี 20%:
• ซื้อ SSF/RMF ปีละ 100,000 บาท = ได้คืนภาษี 20,000 บาททันที

SSF: ลดหย่อนได้ถึง 30% ของรายได้ ไม่เกิน 200,000/ปี ถือ 10 ปี
RMF: เพื่อเกษียณ รวมเพดาน 500,000/ปี

กองทุน S&P 500 ผ่าน SSF/RMF มักถูกแนะนำเพราะ:
• กระจายความเสี่ยง 500+ บริษัท
• ค่าธรรมเนียมต่ำ
• ผลตอบแทนระยะยาวสูงสุดในประวัติศาสตร์`,
    keybox: "ฐานภาษี 20% + SSF 200,000 = ภาษีคืน 40,000 บาท/ปี\nก่อนตลาดจะทำงานด้วยซ้ำ",
    warning: "ตรวจสอบกฎภาษีปีล่าสุดทุกครั้ง — กฎเปลี่ยนได้",
    chatQ: "ฐานภาษีของฉัน 20% ควรซื้อ SSF หรือ RMF กองทุนไหนดี?",
  },
  {
    num: 7, emoji: "📦",
    titleTh: "รู้จักสินทรัพย์จริงๆ: ETF & Index Funds",
    titleEn: "Know Your Assets: ETF & Index Funds",
    tagline: "ก่อนกดซื้อต้องตอบได้ว่ามันคืออะไร",
    group: "assets",
    body: `ตัวหลักที่ควรรู้:

🌍 VT — หุ้นทั้งโลก (กระจายสุด)
🇺🇸 VOO — S&P 500 ค่าธรรมเนียมต่ำมาก (0.03%)
⚡ QQQ — Nasdaq-100 เน้นเทค
💾 SMH — เซมิคอนดักเตอร์ (satellite ≤10–15%)
📈 SCHG — Growth stocks
💵 SCHD — ปันผลคุณภาพสูง

ระวัง: กองทุนไทย (SSF/RMF) ที่ลงทุนใน S&P 500 มักค่าธรรมเนียม 0.5–1.5% ต่อปี ซึ่งแพงกว่า ETF ต่างประเทศ`,
    keybox: "VOO: ค่าธรรมเนียม 0.03%/ปี vs กองทุนไทย S&P 500: ~0.5–1.5%/ปี\nบน 10 ปี ต่างกัน หลักแสน–ล้านบาท",
    chatQ: "ความแตกต่างระหว่าง VOO กับกองทุน S&P 500 ไทย คืออะไร?",
  },
  {
    num: 8, emoji: "🏦",
    titleTh: "สาย Passive Income: หุ้น/กองทุนปันผล",
    titleEn: "Passive Income Path: Dividend Strategy",
    tagline: "ใช้ชีวิตจากปันผลโดยไม่แตะเงินต้น",
    group: "assets",
    body: `ตัวเลือกหลัก:

• ETF Covered Call — JEPQ, QQQI (ปันผลสูง 8–12%+ แต่จำกัด upside)
• SPHD — ปันผลสูง ผันผวนต่ำ
• SCHD — ปันผลคุณภาพ เติบโตสม่ำเสมอ
• O (Realty Income) — REIT จ่ายรายเดือน
• T (AT&T), KO (Coca-Cola) — ปันผลคลาสสิก

คำนวณ Net Yield หลังภาษี:
ปันผลหุ้นสหรัฐฯ โดนหักภาษี ณ ที่จ่าย 30% (WHT)`,
    keybox: "ต้องการรายได้ 50,000 บาท/เดือน\nNet Yield หลัง WHT 30% = 3%\nต้องมีพอร์ต = 50,000×12 / 0.03 = 20,000,000 บาท",
    warning: "WHT 30%: ปันผล 1,000 บาท → ได้จริง 700 บาท คำนวณ Net Yield ก่อนตัดสินใจ",
    chatQ: "ฉันอยากได้ Passive Income 30,000 บาท/เดือน ต้องมีพอร์ตเท่าไหร่?",
  },
  {
    num: 9, emoji: "🚀",
    titleTh: "สาย Growth: Framework 5 มิติ",
    titleEn: "Growth Path: 5-Dimension Framework",
    tagline: "โอกาสสูง ความเสี่ยงสูง ต้องถือยาว 5–15 ปี",
    group: "assets",
    body: `ก่อนซื้อต้องผ่าน 5 มิติ:

1️⃣ Valuation — P/E, P/S, PEG, EV/EBITDA เทียบกับอุตสาหกรรม
2️⃣ Financial Health — FCF บวก, gross margin, เงินสด > หนี้
3️⃣ Growth Potential — TAM ใหญ่, รายได้โต 20%+, share เพิ่ม
4️⃣ Technical — ราคาเหนือ MA200, volume ยืนยันเทรนด์
5️⃣ DEEP Moat:
   • Defensibility (กำแพงกันคู่แข่ง)
   • Earnings power (กำไรสม่ำเสมอ)
   • Execution (ทีมบริหารดี)
   • Price power (ขึ้นราคาได้ไม่สูญลูกค้า)`,
    warning: "หุ้นที่ยกมา (NVDA, AVGO, AMZN, PLTR) คือตัวอย่างสอน Framework เท่านั้น ไม่ใช่คำแนะนำซื้อ อย่าลืม Capital Gain Tax หุ้นต่างประเทศ",
    chatQ: "ช่วยวิเคราะห์ NVDA ผ่าน Framework 5 มิติให้หน่อย",
  },
  {
    num: 10, emoji: "🤖",
    titleTh: "DCA vs Lump Sum: ระบบสำคัญกว่าจังหวะ",
    titleEn: "DCA vs Lump Sum: System Over Timing",
    tagline: "ไม่มีใครจับจังหวะตลาดได้แม่นสม่ำเสมอ",
    group: "system",
    body: `DCA (Dollar-Cost Averaging):
• ลงเงินเท่ากันทุกเดือนไม่สนราคา
• ต้นทุนเฉลี่ยต่ำลงอัตโนมัติ
• คุมจิตใจ ลด Panic/FOMO

Lump Sum:
• ลงก้อนเดียว (โบนัส/มรดก/เงินออม)
• ชนะ DCA ราว 67% ของเวลา เพราะตลาดขึ้นนานกว่าลง
• เหมาะหลังมีเงินสำรองครบแล้ว

สิ่งที่ห้ามทำ:
❌ ดูพอร์ตทุกวันแล้วเปลี่ยนแผนตามอารมณ์
❌ ขายตอนตลาดลง (Panic Sell)
❌ ซื้อตอนตลาดขึ้นเพราะกลัวพลาด (FOMO Buy)`,
    keybox: "Lump Sum ชนะ DCA 67% ของเวลา\nแต่ DCA ชนะทางจิตวิทยา 100%",
    chatQ: "ฉันได้รับโบนัส 200,000 บาท ควรทำ DCA หรือ Lump Sum?",
  },
  {
    num: 11, emoji: "⬆️",
    titleTh: "ยกระดับ Human Capital: รายได้คือปั๊มน้ำ",
    titleEn: "Upgrade Human Capital: Income is the Pump",
    tagline: "ขึ้นเงินเดือน 20% มีผลมากกว่า optimize พอร์ต 2%",
    group: "system",
    body: `สำหรับคนอายุน้อย การเพิ่มรายได้ 20% มีผลต่อความมั่งคั่งมากกว่าการ optimize พอร์ต 2% หลายเท่า

3 วิธีเพิ่ม Human Capital:

💡 Upskill
• Programming / AI
• Digital Marketing
• Finance & Accounting
• Sales & Communication
• Content Creation

🤝 Network = Net Worth
• งานดีๆ มักมาจากคอนเนกชัน ไม่ใช่ Job Board

💼 Side Income
• Freelance
• Content / YouTube / Podcast
• Digital Products (ทำครั้งเดียว ขายได้เรื่อยๆ)`,
    keybox: "รายได้เพิ่ม 20,000 บาท/เดือน × 12 × 30 ปี = 7.2 ล้านบาท\nก่อน Compound จะทำงาน",
    chatQ: "ฉันเป็นโปรแกรมเมอร์ ควร Upskill ด้านไหนเพื่อเพิ่มรายได้?",
  },
  {
    num: 12, emoji: "✅",
    titleTh: "Checklist ก่อนกดซื้อ: KYC รอบสุดท้าย",
    titleEn: "Final Checklist Before You Buy",
    tagline: "ผ่านทั้ง 6 หมวดแล้วค่อยกดซื้อ",
    group: "system",
    body: `หมวด A — สุขภาพ + ประกัน
☐ มีประกันสุขภาพแล้ว
☐ ตรวจสุขภาพประจำปีแล้ว

หมวด B — เป้าหมาย + Risk
☐ กำหนด Time Horizon ชัดเจน
☐ รู้ Risk Profile ของตัวเอง

หมวด C — การเงินพื้นฐาน
☐ FCF > 0
☐ เงินสำรองฉุกเฉิน 3–6 เดือน
☐ แยกบัญชีลงทุนกับบัญชีใช้จ่าย

หมวด D — จัดการหนี้
☐ ปิดหนี้บัตรเครดิตหมดแล้ว
☐ หนี้ผ่อนต่อเดือนไม่เกิน 35% ของรายได้

หมวด E — ภาษี
☐ ใช้สิทธิ SSF/RMF แล้ว
☐ เข้าใจ WHT 30% และ Capital Gain Tax

หมวด F — ความรู้ + ความพร้อม
☐ อธิบายสินทรัพย์ที่จะซื้อได้ในแบบของตัวเอง
☐ ถือผ่านตลาดลง −40% ได้โดยไม่ขาย
☐ มีแผน DCA อัตโนมัติ
☐ โบรกเกอร์มีใบอนุญาต ก.ล.ต.
☐ ผ่าน Framework 5 มิติหรือคำนวณ Net Yield แล้ว`,
    warning: "ถ้าติดข้อไหน กลับไปทำด่านนั้นให้เสร็จก่อน — อย่าข้ามขั้น",
    chatQ: "ช่วยทำ Checklist 6 หมวดให้ฉัน พร้อมบอกว่าติดข้อไหน",
  },
];

// ── Pyramid data ──────────────────────────────────────────────────────────────

interface PyramidLayer {
  num:      number;
  nameTh:   string;
  nameEn:   string;
  color:    string;
  bgLight:  string;
  alloc:    string;
  perPos:   string;
  role:     string;
  tickers:  string[];
  criteria: string[];
}

const PYRAMID_LAYERS: PyramidLayer[] = [
  {
    num: 1,
    nameTh: "Preserve & Hedge",
    nameEn: "Preserve & Hedge",
    color: "#2563EB",
    bgLight: "#EFF6FF",
    alloc: "20–30%",
    perPos: "—",
    role: "ปกป้องเงินต้น กั้นเงินเฟ้อ/ค่าเงิน เป็นสภาพคล่องไว้สลับเข้าหุ้นตอนตลาดลง",
    tickers: ["SGOV","SHV","MINT","GLDM","USFR","JPST","VTIP","FCD"],
    criteria: [
      "Duration ต่ำ (T-Bill ระยะสั้น)",
      "สภาพคล่องสูง ถอนได้ทันที",
      "Hedge เงินเฟ้อ/ค่าเงิน (ทอง)",
      "กันความผันผวน/ภาวะสงคราม",
      "พักเงินจาก Rebalance",
    ],
  },
  {
    num: 2,
    nameTh: "Core Compound + Dividend",
    nameEn: "Core Compound + Dividend",
    color: "#1F9D55",
    bgLight: "#F0FDF4",
    alloc: "30–40%",
    perPos: "5–10%/ตัว",
    role: "เครื่องยนต์หลักของพอร์ต หุ้นพื้นฐานแข็ง ปันผลสม่ำเสมอ Compound ระยะยาว",
    tickers: ["VOO","VT","SCHD","COST","WMT","BRK.B","JNJ","O","MSFT","AAPL","KO","MCD"],
    criteria: [
      "Moat: Network effect / Switching cost ชัดเจน",
      "ROIC > WACC 3–5% ต่อเนื่อง",
      "รายได้โต 15–20%/ปี หรือ FCF ยั่งยืน",
      "ปันผลโต > 5%/ปี, Payout ≤ 70%",
      "Net Debt/EBITDA < 3×",
      "Buyback 1–3%/ปี",
      "ราคายืนเหนือ MA50",
    ],
  },
  {
    num: 3,
    nameTh: "Growth — Profitable Expansion",
    nameEn: "Growth — Profitable Expansion",
    color: "#D97706",
    bgLight: "#FFFBEB",
    alloc: "15–25%",
    perPos: "3–7%/ตัว",
    role: "หุ้นโตที่ทำกำไรแล้ว — มี FCF บวก กำไรขั้นต้นสูง ตลาดยังไม่อิ่มตัว",
    tickers: ["QQQ","SMH","NVDA","TSM","AMD","ASML","META","ARM","NFLX","PLTR"],
    criteria: [
      "FCF บวก และ Gross Margin สูง",
      "TAM ใหญ่ รายได้โต > 20%/ปี",
      "Valuation: Forward PE/PEG สมเหตุสมผล",
      "Reverse DCF ยืนยัน Margin of Safety",
      "NRR > 110% (ถ้าเป็น SaaS)",
      "Debt/EBITDA < 3×",
      "ราคายืนเหนือ MA200",
    ],
  },
  {
    num: 4,
    nameTh: "High-Risk Moon-Shots",
    nameEn: "High-Risk Moon-Shots",
    color: "#D64545",
    bgLight: "#FEF2F2",
    alloc: "≤ 10–15%",
    perPos: "< 3–5%/ตัว",
    role: "เก็งกำไรความเสี่ยงสูง S-curve ต้นๆ — สูญได้ทั้งหมด ห้ามลงเกินที่ใจรับได้",
    tickers: ["ASTS","RKLB","ACHR","OKLO","RGTI","QBTS","JOBY","RXRX","BTC"],
    criteria: [
      "เล่าเรื่องอนาคตได้ชัด (S-curve / Milestone)",
      "Cash Runway > 18–24 เดือน",
      "Milestone มีวันที่ชัดเจน",
      "Unit Margin ดีขึ้น (เส้นทาง FCF เริ่มชัด)",
      "Valuation ไม่หลุดโลก",
      "ตรวจ Financial Note ใน 10-K",
    ],
  },
];

const REBALANCE_RULES = [
  { icon: "📈", triggerTh: "ตลาด Risk-On + แพงเกิน", triggerEn: "Risk-On + Overvalued", actionTh: "Trim ชั้น 3–4 ลงฐาน 1–2 (โดยเฉพาะ Moon-Shots)", actionEn: "Trim Layers 3–4 into Foundation" },
  { icon: "📉", triggerTh: "ตลาด Risk-Off + เด้งแล้ว", triggerEn: "Risk-Off + Recovery", actionTh: "ปล่อยพันธบัตร/เงินสดไปซื้อชั้น 2–3", actionEn: "Deploy bonds/cash into Layers 2–3" },
  { icon: "📅", triggerTh: "ทุก 6–12 เดือน", triggerEn: "Every 6–12 months", actionTh: "Rebalance ตามปฏิทิน ไม่รอสัญญาณ", actionEn: "Calendar-based rebalance, no waiting" },
  { icon: "⚡", triggerTh: "Regulatory Shock (Tariff ฯลฯ)", triggerEn: "Regulatory Shock", actionTh: "Rebalance ทันทีตามผลกระทบจริง", actionEn: "Immediate rebalance on material impact" },
];

const ACTION_PLAN = [
  { period: "สัปดาห์ 1", en: "Week 1", icon: "📝", items: ["จดรายรับ–รายจ่ายทั้งหมด", "คำนวณ FCF ให้ได้ตัวเลขชัด", "ประเมิน Risk Profile ตัวเอง"] },
  { period: "สัปดาห์ 2", en: "Week 2", icon: "🛡️", items: ["ตรวจสุขภาพประจำปี (ถ้ายังไม่ได้ทำ)", "เปรียบเทียบและทำประกันสุขภาพ"] },
  { period: "สัปดาห์ 3", en: "Week 3", icon: "⚔️", items: ["เรียงหนี้ทั้งหมดจากดอกสูง–ต่ำ", "วางแผน Debt Avalanche พร้อมตัวเลข", "ตั้ง Target วันปิดหนี้แต่ละตัว"] },
  { period: "สัปดาห์ 4", en: "Week 4", icon: "🏦", items: ["เปิดบัญชีกองทุน (โบรกเกอร์ ก.ล.ต.)", "วางแผน SSF/RMF ตามฐานภาษี", "เลือก Index Fund สำหรับลงทุนระยะยาว"] },
  { period: "เดือน 2",   en: "Month 2", icon: "🤖", items: ["เริ่ม DCA อัตโนมัติ (ตั้ง Auto-Transfer)", "ตรวจสอบเงินสำรองว่าครบ 3 เดือนหรือยัง"] },
  { period: "เดือน 3+",  en: "Month 3+", icon: "📈", items: ["ทบทวนพอร์ตปีละ 1 ครั้ง (ไม่ใช่ทุกวัน)", "Upskill ด้านที่เพิ่มรายได้ได้จริง", "เพิ่ม DCA เมื่อรายได้เพิ่ม"] },
];

const GROUP_COLORS = {
  foundation: { bg: "#F0FDF4", border: "#1F9D55", badge: "#1F9D55", label: "Foundation" },
  planning:   { bg: "#FFFBEB", border: "#D97706", badge: "#D97706", label: "Planning" },
  assets:     { bg: "#F5F3FF", border: "#8B5CF6", badge: "#8B5CF6", label: "Assets" },
  system:     { bg: "#EFF6FF", border: "#2563EB", badge: "#2563EB", label: "System" },
};

// ── Components ────────────────────────────────────────────────────────────────

function LevelCard({ level, isEn }: { level: Level; isEn: boolean }) {
  const [open, setOpen] = useState(false);
  const colors = GROUP_COLORS[level.group];

  return (
    <div
      style={{ background: colors.bg, border: `1.5px solid ${colors.border}`, boxShadow: `3px 3px 0 ${colors.border}` }}
      className="flex flex-col"
    >
      {/* Header — always visible */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-start gap-3 px-4 py-3 text-left w-full"
        aria-expanded={open}
      >
        <span
          className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-xs font-black rounded-sm mt-0.5"
          style={{ background: colors.badge, color: "#fff", fontFamily: "var(--font-mono)" }}
        >
          {level.num}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm">{level.emoji}</span>
            <span className="text-sm font-bold text-[#1A1A1A]">
              {isEn ? level.titleEn : level.titleTh}
            </span>
          </div>
          <p className="text-[10px] text-[#8A8378] mt-0.5">{level.tagline}</p>
        </div>
        <span className="flex-shrink-0 text-[#8A8378] text-xs mt-1">{open ? "▲" : "▼"}</span>
      </button>

      {/* Body — expanded */}
      {open && (
        <div className="px-4 pb-4 flex flex-col gap-3 border-t" style={{ borderColor: colors.border }}>
          <div className="mt-3 text-xs text-[#1A1A1A] leading-relaxed whitespace-pre-line">
            {level.body}
          </div>

          {level.keybox && (
            <div
              className="px-3 py-2.5 text-xs font-bold leading-relaxed whitespace-pre-line"
              style={{ background: "#1A1A1A", color: "#faedcd", fontFamily: "var(--font-mono)" }}
            >
              {level.keybox}
            </div>
          )}

          {level.warning && (
            <div className="px-3 py-2 bg-red-50 border-l-4 border-red-500">
              <p className="text-xs font-bold text-red-700">⚠️ {level.warning}</p>
            </div>
          )}

          <Link
            href={`/martin?q=${encodeURIComponent(level.chatQ)}`}
            className="flex items-center gap-1.5 text-[10px] font-bold text-[#8B5CF6] hover:underline self-start mt-1"
          >
            ✦ {isEn ? "Ask Martin" : "ถาม Martin"} →
          </Link>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function BlueprintPage() {
  const { lang } = useI18n();
  const isEn     = lang === "en";
  const [filter, setFilter] = useState<"all" | Level["group"]>("all");

  const filtered = filter === "all" ? LEVELS : LEVELS.filter(l => l.group === filter);

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-6">

        {/* ── Hero header ─────────────────────────────────────────── */}
        <div style={{ background: "#1A1A1A", boxShadow: "4px 4px 0 #8B5CF6" }} className="px-5 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#8B5CF6] mb-1">
                {isEn ? "Financial Blueprint · 13 Levels" : "Blueprint การเงิน · 13 ด่าน"}
              </p>
              <h1 className="text-xl font-black text-white leading-tight">
                {isEn ? "Road to Financial Freedom" : "เส้นทางสู่อิสรภาพทางการเงิน"}
              </h1>
              <p className="text-xs text-[#8A8378] mt-1.5">
                {isEn
                  ? "Complete each level in order — skipping levels costs more than you think."
                  : "ทำให้ครบทุกด่านตามลำดับ — การข้ามขั้นแพงกว่าที่คิด"}
              </p>
            </div>
          </div>

          {/* Group legend */}
          <div className="flex flex-wrap gap-2 mt-4">
            {(Object.entries(GROUP_COLORS) as [Level["group"], typeof GROUP_COLORS.foundation][]).map(([key, c]) => (
              <button
                key={key}
                onClick={() => setFilter(filter === key ? "all" : key)}
                className="text-[10px] font-bold px-2 py-0.5 transition-colors"
                style={{
                  background: filter === key || filter === "all" ? c.badge : "#333",
                  color: "#fff",
                  opacity: filter !== "all" && filter !== key ? 0.4 : 1,
                }}
              >
                {c.label} ({LEVELS.filter(l => l.group === key).length})
              </button>
            ))}
            {filter !== "all" && (
              <button onClick={() => setFilter("all")} className="text-[10px] font-bold px-2 py-0.5 bg-[#555] text-white hover:bg-[#777] transition-colors">
                {isEn ? "Show all" : "ดูทั้งหมด"}
              </button>
            )}
          </div>
        </div>

        {/* ── Level cards ──────────────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          {filtered.map(level => (
            <LevelCard key={level.num} level={level} isEn={isEn} />
          ))}
        </div>

        {/* ── Portfolio Pyramid ───────────────────────────────────── */}
        <div style={{ border: "1.5px solid #1A1A1A", boxShadow: "3px 3px 0 #1A1A1A" }}>
          <div className="px-4 py-3 bg-[#1A1A1A]">
            <h2 className="text-sm font-bold text-white uppercase tracking-widest">
              {isEn ? "Portfolio Pyramid — 4 Layers" : "พีระมิดพอร์ต — 4 ชั้น"}
            </h2>
            <p className="text-[10px] text-[#8A8378] mt-0.5">
              {isEn ? "Safety at the base · speculation at the peak" : "ปลอดภัยล่างสุด → เก็งกำไรบนสุด"}
            </p>
          </div>

          {/* Visual pyramid */}
          <div className="px-4 pt-4 pb-2 bg-[#fefae0] flex flex-col items-center gap-0.5">
            {[...PYRAMID_LAYERS].reverse().map((layer, idx) => {
              const widths = ["w-2/12","w-5/12","w-8/12","w-full"];
              return (
                <div
                  key={layer.num}
                  className={`${widths[idx]} flex items-center justify-center py-1.5 text-white text-[10px] font-black tracking-wide`}
                  style={{ background: layer.color }}
                >
                  {isEn ? layer.nameEn : layer.nameTh} · {layer.alloc}
                </div>
              );
            })}
          </div>

          {/* Layer detail cards */}
          <div className="divide-y divide-[#e9edc9]">
            {PYRAMID_LAYERS.map((layer) => (
              <div key={layer.num} style={{ background: layer.bgLight }} className="px-4 py-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className="text-[9px] font-black px-2 py-0.5 text-white"
                    style={{ background: layer.color }}
                  >
                    L{layer.num} · {layer.alloc}
                  </span>
                  <span className="text-xs font-bold text-[#1A1A1A]">
                    {isEn ? layer.nameEn : layer.nameTh}
                  </span>
                  <span className="text-[9px] text-[#8A8378] ml-auto">{layer.perPos}</span>
                </div>
                <p className="text-[11px] text-[#6B6B6B] mb-2 leading-relaxed">{layer.role}</p>

                {/* Tickers */}
                <div className="flex flex-wrap gap-1 mb-2">
                  {layer.tickers.map(t => (
                    <Link
                      key={t}
                      href={`/stock/${t.replace("BTC","")}`}
                      className="text-[9px] font-black px-1.5 py-0.5 border transition-colors hover:bg-[#1A1A1A] hover:text-white hover:border-[#1A1A1A]"
                      style={{ borderColor: layer.color, color: layer.color, fontFamily: "var(--font-mono)" }}
                      onClick={e => { if (t === "BTC") e.preventDefault(); }}
                    >
                      {t}
                    </Link>
                  ))}
                </div>

                {/* Criteria */}
                <ul className="flex flex-col gap-0.5">
                  {layer.criteria.map((c, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[10px] text-[#1A1A1A]">
                      <span style={{ color: layer.color }} className="flex-shrink-0">▸</span>
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Rebalance rules */}
          <div className="px-4 py-3 border-t border-[#e9edc9] bg-[#fefae0]">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#8A8378] mb-2">
              {isEn ? "Rebalance Rules" : "กฎการ Rebalance"}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {REBALANCE_RULES.map((r, i) => (
                <div key={i} className="flex gap-2 px-3 py-2 bg-white border border-[#e9edc9]">
                  <span className="text-base flex-shrink-0">{r.icon}</span>
                  <div>
                    <p className="text-[10px] font-bold text-[#1A1A1A]">{isEn ? r.triggerEn : r.triggerTh}</p>
                    <p className="text-[10px] text-[#6B6B6B] mt-0.5">{isEn ? r.actionEn : r.actionTh}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-[#8A8378] mt-2">
              {isEn
                ? "Trade-off: locking gains means missing some remaining upside — you get peace of mind instead."
                : "ข้อแลกเปลี่ยน: ล็อกกำไรแล้วอาจพลาด upside ส่วนที่เหลือ แต่ได้ความสบายใจแทน"}
            </p>
          </div>
        </div>

        {/* ── 30-Day Action Plan ───────────────────────────────────── */}
        <div style={{ border: "1.5px solid #1A1A1A", boxShadow: "3px 3px 0 #1A1A1A" }}>
          <div className="px-4 py-3 bg-[#1A1A1A]">
            <h2 className="text-sm font-bold text-white uppercase tracking-widest">
              {isEn ? "30-Day Action Plan" : "Action Plan 30 วัน"}
            </h2>
            <p className="text-[10px] text-[#8A8378] mt-0.5">
              {isEn ? "Concrete steps to start this week" : "ขั้นตอนที่ลงมือทำได้เลย"}
            </p>
          </div>
          <div className="divide-y divide-[#e9edc9]">
            {ACTION_PLAN.map((item) => (
              <div key={item.period} className="flex gap-3 px-4 py-3 bg-[#fefae0]">
                <div className="flex-shrink-0 w-20 pt-0.5">
                  <span className="text-lg">{item.icon}</span>
                  <p className="text-[10px] font-black text-[#1A1A1A] mt-0.5">{isEn ? item.en : item.period}</p>
                </div>
                <ul className="flex flex-col gap-1">
                  {item.items.map((it, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-[#1A1A1A]">
                      <span className="text-[#1F9D55] flex-shrink-0 mt-0.5">→</span>
                      {it}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* ── Martin CTA ───────────────────────────────────────────── */}
        <Link
          href="/martin?q=ฉันอยากเริ่มลงทุน ช่วยประเมินว่าฉันอยู่ด่านไหนของ Blueprint และควรทำอะไรก่อน"
          style={{ border: "1.5px solid #8B5CF6", boxShadow: "2px 2px 0 #8B5CF6" }}
          className="flex items-center justify-center gap-2 py-3 text-xs font-bold text-[#8B5CF6] bg-[#fefae0] hover:bg-[#8B5CF6] hover:text-white transition-colors"
        >
          ✦ {isEn ? "Ask Martin which level you're at" : "ถาม Martin ว่าตอนนี้อยู่ด่านไหน"}
        </Link>

        {/* ── Footer disclaimer ────────────────────────────────────── */}
        <p className="text-[10px] text-[#8A8378] text-center leading-relaxed">
          {isEn
            ? "This is educational content for Thai retail investors. Not investment advice. Tax rules (SSF/RMF/WHT) apply to Thai residents — verify current rules. Tickers mentioned are teaching examples only."
            : "เนื้อหานี้เพื่อการศึกษาสำหรับนักลงทุนรายย่อยไทย ไม่ใช่คำแนะนำลงทุน กฎภาษี (SSF/RMF/WHT) ใช้สำหรับผู้มีถิ่นที่อยู่ในไทย กรุณาตรวจสอบกฎล่าสุด ชื่อหุ้นที่ยกมาเป็นตัวอย่างสอนเท่านั้น"}
        </p>

      </div>
    </AppShell>
  );
}
