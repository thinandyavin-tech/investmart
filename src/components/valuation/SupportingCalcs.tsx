"use client";

import { useState } from "react";
import {
  computeReversePE,
  computeExpectedReturn,
  computePositionSize,
  type ConvictionTier,
} from "@/lib/rdcfMath";
import { useI18n } from "@/lib/i18n";

// ── Shared helpers ────────────────────────────────────────────────────────────

function NumField({
  label, value, onChange, unit, step = "0.1", min = "0",
}: {
  label: string; value: string; onChange: (v: string) => void;
  unit?: string; step?: string; min?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-[9px] font-bold uppercase tracking-wide text-[#8A8378]">{label}</label>
      <div className="flex items-center gap-1">
        <input
          type="number" inputMode="decimal" step={step} min={min} value={value}
          onChange={e => onChange(e.target.value)}
          className="flex-1 px-2 py-1.5 border border-[#C8BFB0] text-xs font-bold focus:outline-none focus:border-[#1A1A1A]"
          style={{ background: "#FFFDE7", fontFamily: "var(--font-mono)" }}
        />
        {unit && <span className="text-[9px] text-[#8A8378] flex-shrink-0">{unit}</span>}
      </div>
    </div>
  );
}

function ResLine({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1 border-b border-[#E4DDD2] last:border-0">
      <span className="text-[10px] text-[#6B6B6B]">{label}</span>
      <span className="text-xs font-bold" style={{ fontFamily: "var(--font-mono)", color: color ?? "#1A1A1A" }}>
        {value}
      </span>
    </div>
  );
}

// ── Reverse P/E ───────────────────────────────────────────────────────────────

function ReversePECalc({ isEn }: { isEn: boolean }) {
  const [curPE,  setCurPE]  = useState("35");
  const [exitPE, setExitPE] = useState("25");
  const [years,  setYears]  = useState("5");
  const [coe,    setCoe]    = useState("10");

  const g = computeReversePE(
    parseFloat(curPE)  || 0,
    parseFloat(exitPE) || 0,
    parseFloat(years)  || 0,
    (parseFloat(coe)   || 0) / 100,
  );
  const gColor = g !== null
    ? g > 0.30 ? "#D97706" : g > 0.10 ? "#1F9D55" : "#D64545"
    : "#8A8378";

  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-[9px] text-[#8A8378] leading-snug">
        {isEn
          ? "Answers: what EPS growth does this P/E imply over N years, assuming an exit P/E?"
          : "ตอบ: P/E นี้คาด EPS โต % ต่อปีเท่าใด ถ้าขายที่ Exit P/E หลัง N ปี?"}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <NumField label={isEn ? "Current P/E"     : "P/E ปัจจุบัน"}   value={curPE}  onChange={setCurPE}  step="0.5" />
        <NumField label={isEn ? "Exit P/E"         : "Exit P/E"}        value={exitPE} onChange={setExitPE} step="0.5" />
        <NumField label={isEn ? "Years (N)"        : "จำนวนปี (N)"}    value={years}  onChange={setYears}  step="1" min="1" />
        <NumField label={isEn ? "Cost of Equity %" : "CoE %"}           value={coe}    onChange={setCoe}    step="0.1" unit="%" />
      </div>
      <ResLine
        label={isEn ? "Implied EPS CAGR / yr" : "EPS CAGR / ปี ที่ถูกตั้งราคา"}
        value={g !== null ? `${g >= 0 ? "+" : ""}${(g * 100).toFixed(1)}%` : "N/A"}
        color={gColor}
      />
    </div>
  );
}

// ── Expected Return ───────────────────────────────────────────────────────────

function ExpReturnCalc({ isEn }: { isEn: boolean }) {
  const [price,  setPrice]  = useState("");
  const [eps,    setEps]    = useState("");
  const [growth, setGrowth] = useState("");
  const [exitPE, setExitPE] = useState("25");
  const [years,  setYears]  = useState("5");

  const res = computeExpectedReturn(
    parseFloat(price)  || 0,
    parseFloat(eps)    || 0,
    (parseFloat(growth) || 0) / 100,
    parseFloat(exitPE) || 0,
    parseFloat(years)  || 0,
  );
  const rColor = res
    ? res.annualReturn > 0.15 ? "#1F9D55"
      : res.annualReturn > 0.08 ? "#D97706"
      : "#D64545"
    : "#8A8378";

  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-[9px] text-[#8A8378] leading-snug">
        {isEn
          ? "Projects EPS forward at CAGR × exit P/E → implied annualized return from current price."
          : "นำ EPS คูณ exit P/E แล้วคำนวณ implied annualized return จากราคาปัจจุบัน"}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <NumField label={isEn ? "Current Price ($)" : "ราคาปัจจุบัน ($)"} value={price}  onChange={setPrice}  step="0.01" />
        <NumField label={isEn ? "Current EPS ($)"   : "EPS ปัจจุบัน ($)"} value={eps}    onChange={setEps}    step="0.01" />
        <NumField label={isEn ? "EPS Growth % / yr" : "EPS Growth %/ปี"}   value={growth} onChange={setGrowth} step="0.1" unit="%" />
        <NumField label={isEn ? "Exit P/E"           : "Exit P/E"}          value={exitPE} onChange={setExitPE} step="0.5" />
        <NumField label={isEn ? "Years (N)"          : "จำนวนปี (N)"}       value={years}  onChange={setYears}  step="1" min="1" />
      </div>
      {res && (
        <div>
          <ResLine
            label={isEn ? "Exit EPS" : "EPS สิ้นสุด"}
            value={`$${res.exitEPS.toFixed(2)}`}
          />
          <ResLine
            label={isEn ? "Exit Price" : "ราคาเป้า"}
            value={res.exitPrice >= 1000 ? `$${(res.exitPrice / 1000).toFixed(2)}K` : `$${res.exitPrice.toFixed(2)}`}
          />
          <ResLine
            label={isEn ? "Implied Annual Return" : "ผลตอบแทน / ปี"}
            value={`${res.annualReturn >= 0 ? "+" : ""}${(res.annualReturn * 100).toFixed(1)}%`}
            color={rColor}
          />
        </div>
      )}
    </div>
  );
}

// ── Position Sizing ───────────────────────────────────────────────────────────

const TIERS: { t: ConvictionTier; en: string; th: string }[] = [
  { t: 1, en: "Low",   th: "น้อย" },
  { t: 2, en: "Med-L", th: "ค่อนข้างน้อย" },
  { t: 3, en: "Med",   th: "ปานกลาง" },
  { t: 4, en: "Med-H", th: "ค่อนข้างมาก" },
  { t: 5, en: "High",  th: "มาก" },
];

function PositionSizeCalc({ isEn }: { isEn: boolean }) {
  const [portfolio, setPortfolio] = useState("");
  const [maxCap,    setMaxCap]    = useState("10");
  const [tier,      setTier]      = useState<ConvictionTier>(3);

  const pv  = parseFloat(portfolio) || 0;
  const cap = (parseFloat(maxCap) || 10) / 100;
  const res = pv > 0 ? computePositionSize(pv, tier, cap) : null;

  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-[9px] text-[#8A8378] leading-snug">
        {isEn
          ? "Observational sizing guide — conviction × max-per-name cap → suggested allocation."
          : "คำแนะนำ allocation เพื่อการศึกษา — conviction × วงเงินสูงสุด/ตัว → % แนะนำ"}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <NumField label={isEn ? "Portfolio ($)" : "มูลค่าพอร์ต ($)"} value={portfolio} onChange={setPortfolio} step="1000" />
        <NumField label={isEn ? "Max / stock %" : "สูงสุด / ตัว %"}   value={maxCap}    onChange={setMaxCap}    step="1" unit="%" />
      </div>
      <div>
        <p className="text-[9px] font-bold uppercase tracking-wide text-[#8A8378] mb-1">
          {isEn ? "Conviction" : "ความมั่นใจ"}
        </p>
        <div className="flex gap-1">
          {TIERS.map(({ t, en, th }) => (
            <button
              key={t}
              onClick={() => setTier(t)}
              className="flex-1 py-1.5 text-[9px] font-bold border transition-colors"
              style={{
                background: tier === t ? "#1A1A1A" : "#FDFAF4",
                color: tier === t ? "#fff" : "#1A1A1A",
                borderColor: "#C8BFB0",
              }}
            >
              {isEn ? en : th}
            </button>
          ))}
        </div>
      </div>
      {res && (
        <div>
          <ResLine
            label={isEn ? "Suggested allocation" : "% แนะนำ"}
            value={`${(res.suggestedPct * 100).toFixed(1)}%`}
            color="#8B5CF6"
          />
          <ResLine
            label={isEn ? "Dollar amount" : "จำนวนเงิน"}
            value={res.dollarAmount >= 1000 ? `$${(res.dollarAmount / 1000).toFixed(1)}K` : `$${res.dollarAmount.toFixed(0)}`}
            color="#8B5CF6"
          />
        </div>
      )}
      <p className="text-[8px] text-[#8A8378]">
        {isEn
          ? "Tier 1 = 20% of cap · Tier 3 = 60% · Tier 5 = full cap. Observational — not advice."
          : "Tier 1 = 20% ของ cap · Tier 3 = 60% · Tier 5 = เต็ม cap — เพื่อการศึกษาเท่านั้น"}
      </p>
    </div>
  );
}

// ── Container ─────────────────────────────────────────────────────────────────

type CalcTab = "reversePE" | "expectedReturn" | "positionSize";
const CALC_TABS: CalcTab[] = ["reversePE", "expectedReturn", "positionSize"];
const TAB_LABELS: Record<CalcTab, { en: string; th: string }> = {
  reversePE:      { en: "Reverse P/E",    th: "Reverse P/E" },
  expectedReturn: { en: "Expected Return", th: "Expected Return" },
  positionSize:   { en: "Position Sizing", th: "จัดสรรเงิน" },
};

export function SupportingCalcs() {
  const { lang } = useI18n();
  const isEn = lang === "en";
  const [tab, setTab] = useState<CalcTab>("reversePE");

  return (
    <div
      style={{ background: "#FDFAF4", border: "1px solid #C8BFB0", boxShadow: "2px 2px 0 #1A1A1A" }}
      className="px-4 py-3"
    >
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#8A8378] mb-0.5">
        {isEn ? "Supporting Calculators" : "เครื่องคำนวณประกอบ"}
      </p>
      <p className="text-[9px] text-[#8A8378] mb-3">
        {isEn
          ? "Quick sanity-check tools. All outputs are illustrative — not investment advice."
          : "เครื่องมือตรวจสอบเบื้องต้น — ผลลัพธ์เพื่อการศึกษา ไม่ใช่คำแนะนำ"}
      </p>
      <div className="flex border-b border-[#C8BFB0] mb-4">
        {CALC_TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 text-[10px] font-bold py-1.5 transition-colors"
            style={{
              borderBottom: tab === t ? "2px solid #1A1A1A" : "2px solid transparent",
              color: tab === t ? "#1A1A1A" : "#8A8378",
            }}
          >
            {isEn ? TAB_LABELS[t].en : TAB_LABELS[t].th}
          </button>
        ))}
      </div>
      {tab === "reversePE"      && <ReversePECalc   isEn={isEn} />}
      {tab === "expectedReturn"  && <ExpReturnCalc   isEn={isEn} />}
      {tab === "positionSize"   && <PositionSizeCalc isEn={isEn} />}
    </div>
  );
}
