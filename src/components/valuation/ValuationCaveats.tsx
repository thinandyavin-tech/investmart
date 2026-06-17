"use client";

import { useI18n } from "@/lib/i18n";

interface ValuationCaveatsProps {
  industry: string | null;
}

export function ValuationCaveats({ industry }: ValuationCaveatsProps) {
  const { lang } = useI18n();
  const isEn = lang === "en";
  const isMature = industry ? /bank|util|insurance|consumer.?def/i.test(industry) : false;

  return (
    <div
      style={{ borderLeft: "4px solid #D97706", background: "#FFFBEB" }}
      className="px-4 py-3 border border-amber-200"
    >
      <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700 mb-2">
        {isEn ? "Always-on Caveats" : "ข้อสังเกตสำคัญ — อ่านก่อนตัดสินใจ"}
      </p>
      <ul className="flex flex-col gap-1 text-[10px] text-amber-800 leading-relaxed">
        <li>
          •{" "}
          {isEn
            ? "Reverse DCF is highly assumption-sensitive — small input changes can flip the verdict."
            : "Reverse DCF ไวมากต่อ assumption — ตัวเลขเปลี่ยนนิดเดียว verdict อาจพลิก"}
        </li>
        {isMature && (
          <li className="font-bold">
            •{" "}
            {isEn
              ? `Terminal-Anchored model overstates required CAGR for ${industry} (significant near-term CF) — stress test only.`
              : `${industry} มี cashflow สูงในระยะใกล้ — โมเดลนี้ overstate required CAGR ใช้เป็น stress test เท่านั้น`}
          </li>
        )}
        <li>
          •{" "}
          {isEn
            ? "TAM and max-penetration are the squishiest inputs — verify; beware inflated TAM claims."
            : "TAM และ max-penetration เป็นตัวเลขที่ถกเถียงมากที่สุด — ตรวจสอบก่อนใช้ ระวัง TAM ที่ถูกพองเกินจริง"}
        </li>
        <li>
          •{" "}
          {isEn
            ? "WACC from Damodaran January 2025 — update annually; any placeholder is illustrative only."
            : "WACC จาก Damodaran มกราคม 2025 — ควรอัปเดตทุกปี ค่า placeholder เป็นตัวอย่างเท่านั้น"}
        </li>
        <li>
          •{" "}
          {isEn
            ? "This is an expectations gauge for education — not investment advice. Verify every number."
            : "นี่คือ expectations gauge เพื่อการศึกษา — ไม่ใช่คำแนะนำลงทุน ตรวจสอบทุกตัวเลข"}
        </li>
        <li>
          •{" "}
          {isEn
            ? '"Expensive" ≠ sell · "Cheap" ≠ buy — this describes what\'s priced in, not what to do.'
            : '"แพง" ≠ ขาย · "ถูก" ≠ ซื้อ — บอกแค่ว่าราคาต้องการอะไร ไม่ใช่คำแนะนำ'}
        </li>
      </ul>
    </div>
  );
}
