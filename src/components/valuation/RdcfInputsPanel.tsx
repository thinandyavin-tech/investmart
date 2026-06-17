"use client";

import type { LabAutoFill } from "@/app/api/stock/lab/route";
import { useI18n } from "@/lib/i18n";

export interface RdcfValues {
  evB:            string;
  revenueB:       string;
  wacc:           string;
  g:              string;
  terminalMargin: string;
  taxRate:        string;
  roic:           string;
  n:              string;
  hist3Y:         string;
  forwardCagr:    string;
  tamB:           string;
  maxPenetration: string;
  buffer:         string;
  absoluteCap:    string;
  currentPrice:   string;
  sharesB:        string;
  netDebtB:       string;
}

interface RdcfInputsPanelProps {
  values:   RdcfValues;
  onChange: (field: keyof RdcfValues, value: string) => void;
  labData:  LabAutoFill | null;
}

function Field({
  label, hint, value, onChange, unit, step = "0.1", min = "0",
  srcNote, verify, required,
}: {
  label: string; hint?: string; value: string; onChange: (v: string) => void;
  unit?: string; step?: string; min?: string;
  srcNote?: string; verify?: boolean; required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5 flex-wrap">
        <label className="text-[9px] font-bold uppercase tracking-wide text-[#1A1A1A]">{label}</label>
        {required && !value && (
          <span className="text-[8px] text-red-500 font-bold">required</span>
        )}
        {verify && value && (
          <span className="text-[8px] text-amber-600 font-bold">verify</span>
        )}
      </div>
      <div className="flex items-center gap-1">
        <input
          type="number" inputMode="decimal" step={step} min={min} value={value}
          onChange={e => onChange(e.target.value)}
          className="flex-1 px-2 py-1.5 border text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]"
          style={{
            background: "#FFFDE7",
            fontFamily: "var(--font-mono)",
            borderColor: required && !value ? "#ef4444" : "#C8BFB0",
          }}
        />
        {unit && <span className="text-[9px] text-[#8A8378] flex-shrink-0">{unit}</span>}
      </div>
      {hint    && <p className="text-[8px] text-[#8A8378] leading-tight">{hint}</p>}
      {srcNote && <p className="text-[8px] text-[#A899A8] leading-tight">{srcNote}</p>}
    </div>
  );
}

function src(f: { source: string; basis: string } | undefined): string | undefined {
  return f ? `${f.source} · ${f.basis}` : undefined;
}

export function RdcfInputsPanel({ values, onChange, labData: d }: RdcfInputsPanelProps) {
  const { lang } = useI18n();
  const isEn = lang === "en";
  const set = (field: keyof RdcfValues) => (v: string) => onChange(field, v);

  return (
    <div
      style={{ background: "#FDFAF4", border: "1px solid #C8BFB0", boxShadow: "2px 2px 0 #1A1A1A" }}
      className="px-4 py-3"
    >
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#8A8378] mb-3">
        {isEn ? "Inputs — all editable · live recompute" : "ข้อมูลนำเข้า — แก้ไขได้ทุกช่อง · คำนวณทันที"}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">

        {/* ── Core Reverse DCF inputs ── */}
        <Field label={isEn ? "Enterprise Value ($B)" : "EV ($B)"}
          value={values.evB} onChange={set("evB")} unit="$B" step="1" min="0.01"
          srcNote={src(d?.ev)} verify={d?.ev.verify} required />

        <Field label={isEn ? "Revenue TTM ($B)" : "Revenue TTM ($B)"}
          value={values.revenueB} onChange={set("revenueB")} unit="$B" step="0.1" min="0.001"
          srcNote={src(d?.r0)} required />

        <Field label="WACC"
          value={values.wacc} onChange={set("wacc")} unit="%" step="0.1"
          srcNote={src(d?.wacc)} />

        <Field label={isEn ? "Terminal Growth (g)" : "Terminal Growth (g)"}
          value={values.g} onChange={set("g")} unit="%" step="0.1"
          hint={isEn ? "Long-run GDP rate ~3%" : "อัตราเติบโตระยะยาว ~3%"} />

        <Field label={isEn ? "Terminal EBIT Margin" : "Terminal EBIT Margin"}
          value={values.terminalMargin} onChange={set("terminalMargin")} unit="%" step="0.5"
          srcNote={src(d?.terminalMargin)} verify={d?.terminalMargin.verify}
          hint={isEn ? "What margin at maturity?" : "Margin ตอน mature คือเท่าไร?"} required />

        <Field label={isEn ? "Tax Rate" : "อัตราภาษี"}
          value={values.taxRate} onChange={set("taxRate")} unit="%" step="0.5" />

        <Field label={isEn ? "Terminal ROIC" : "Terminal ROIC"}
          value={values.roic} onChange={set("roic")} unit="%" step="0.5" />

        <Field label={isEn ? "Forecast Years (N)" : "จำนวนปี (N)"}
          value={values.n} onChange={set("n")} step="1" min="5"
          hint={isEn ? "Typical 5–15" : "ปกติ 5–15 ปี"} />

        {/* ── Plausible CAGR caps ── */}
        <Field label={isEn ? "Hist. 3Y Revenue CAGR" : "Hist. 3Y CAGR"}
          value={values.hist3Y} onChange={set("hist3Y")} unit="%" step="0.1"
          srcNote={src(d?.hist3Y)}
          hint={isEn ? "Used in Cap A (Max(Hist,Fwd)×Fade)" : "ใช้ใน Cap A"} />

        <Field label={isEn ? "Forward CAGR (FY+1 est.)" : "Forward CAGR (FY+1)"}
          value={values.forwardCagr} onChange={set("forwardCagr")} unit="%" step="0.1"
          srcNote={src(d?.forwardCagr)} verify={d?.forwardCagr.verify}
          hint={isEn ? "Cap A uses MAX(Hist, Fwd) × Fade" : "Cap A = MAX(Hist, Fwd) × Fade"} />

        <Field label="TAM ($B)"
          value={values.tamB} onChange={set("tamB")} unit="$B" step="10"
          hint={isEn ? "Optional — enables Cap B (TAM penetration)" : "ไม่บังคับ — เปิดใช้งาน Cap B"} />

        <Field label={isEn ? "Max Penetration %" : "Max Penetration %"}
          value={values.maxPenetration} onChange={set("maxPenetration")} unit="%" step="1"
          hint={isEn ? "Fragmented 10–15% · Oligopoly 30–40%" : "Fragmented 10–15% · Oligopoly 30–40%"} />

        <Field label={isEn ? "Verdict Buffer" : "Buffer ผลการวิเคราะห์"}
          value={values.buffer} onChange={set("buffer")} unit="%" step="0.5"
          hint={isEn ? "Gap threshold for verdict" : "ช่วง gap ก่อนตัดสิน verdict"} />

        <Field label={isEn ? "Absolute Cap" : "Absolute Cap"}
          value={values.absoluteCap} onChange={set("absoluteCap")} unit="%" step="5"
          hint={isEn ? "Hard ceiling for Plausible CAGR (Cap C)" : "เพดานสูงสุด Plausible CAGR"} />

        {/* ── For fair-value band ── */}
        <Field label={isEn ? "Current Price ($)" : "ราคาปัจจุบัน ($)"}
          value={values.currentPrice} onChange={set("currentPrice")} unit="$" step="0.01" min="0.01"
          srcNote={src(d?.price)}
          hint={isEn ? "For price band & MoS" : "สำหรับแถบราคาและ MoS"} />

        <Field label={isEn ? "Shares Outstanding (B)" : "จำนวนหุ้น (B)"}
          value={values.sharesB} onChange={set("sharesB")} unit="B" step="0.01"
          srcNote={src(d?.shares)} verify={d?.shares.verify}
          hint={isEn ? "For price band" : "สำหรับแถบราคา"} />

        <Field label={isEn ? "Net Debt ($B)" : "Net Debt ($B)"}
          value={values.netDebtB} onChange={set("netDebtB")} unit="$B" step="0.1"
          srcNote={src(d?.netDebt)} verify={d?.netDebt.verify}
          hint={isEn ? "+ve = debt · −ve = net cash" : "+ve = หนี้สุทธิ · −ve = เงินสดสุทธิ"} />
      </div>
    </div>
  );
}
