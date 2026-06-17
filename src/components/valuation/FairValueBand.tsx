"use client";

import { computePriceZones, type PriceZones } from "@/lib/rdcfMath";
import { useI18n } from "@/lib/i18n";

interface FairValueBandProps {
  plausibleCAGR:  number;
  r0:             number;    // raw USD
  wacc:           number;
  g:              number;
  terminalMargin: number;
  taxRate:        number;
  roic:           number;
  n:              number;
  netDebt:        number;    // raw USD, positive = net debt
  shares:         number;    // total share count
  currentPrice:   number;
}

function fmtP(v: number): string {
  if (!v || v <= 0) return "N/A";
  return v >= 1000 ? `$${(v / 1000).toFixed(2)}K` : `$${v.toFixed(2)}`;
}

export function FairValueBand({
  plausibleCAGR, r0, wacc, g, terminalMargin, taxRate, roic, n,
  netDebt, shares, currentPrice,
}: FairValueBandProps) {
  const { lang } = useI18n();
  const isEn = lang === "en";

  const needsData = !shares || !currentPrice;

  const zones: PriceZones | null = needsData ? null : computePriceZones(
    plausibleCAGR, r0, wacc, g, terminalMargin, taxRate, roic, n, netDebt, shares, currentPrice,
  );

  const mosColor = !zones ? "#8A8378"
    : zones.mosPct >= 0.25 ? "#1F9D55"
    : zones.mosPct >= 0    ? "#D97706"
    : "#D64545";

  return (
    <div
      style={{ background: "#FDFAF4", border: "1px solid #C8BFB0", boxShadow: "2px 2px 0 #1A1A1A" }}
      className="px-4 py-3"
    >
      <div className="flex items-start justify-between gap-2 mb-0.5 flex-wrap">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#8A8378]">
          {isEn ? "Fair-Value Price Band" : "แถบราคายุติธรรม"}
        </p>
        {zones && (
          <span className="text-[10px] font-bold" style={{ color: mosColor }}>
            MoS {(zones.mosPct * 100).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="text-[9px] text-[#8A8378] mb-3">
        {isEn
          ? "Back-solved from Plausible CAGR · Accumulate = ×0.8 · Fair = ×1.0 · Expensive = ×1.2"
          : "คำนวณย้อนกลับจาก Plausible CAGR · Accumulate=×0.8 · Fair=×1.0 · Expensive=×1.2"}
      </p>

      {needsData ? (
        <p className="text-[10px] text-[#8A8378]">
          {isEn
            ? "Enter shares outstanding + current price in the inputs above to unlock price zones."
            : "กรอกจำนวนหุ้นและราคาปัจจุบันในส่วน inputs เพื่อดูแถบราคา"}
        </p>
      ) : !zones ? (
        <p className="text-[10px] text-[#8A8378]">
          {isEn ? "Cannot compute — check WACC > g and Plausible CAGR > 0." : "คำนวณไม่ได้ — ตรวจสอบ WACC > g"}
        </p>
      ) : (
        <>
          {/* Visual bar */}
          <VisualBand zones={zones} currentPrice={currentPrice} isEn={isEn} />

          {/* Zone table */}
          <div className="grid grid-cols-3 gap-1.5 mt-3">
            {[
              { lEn: "Accumulate", lTh: "สะสม",   v: zones.accumulate, c: "#1F9D55", desc: isEn ? "0.8× CAGR" : "0.8× CAGR" },
              { lEn: "Fair",       lTh: "Fair",     v: zones.fair,       c: "#D97706", desc: isEn ? "1.0× CAGR" : "1.0× CAGR" },
              { lEn: "Expensive",  lTh: "แพง",      v: zones.expensive,  c: "#D64545", desc: isEn ? "1.2× CAGR" : "1.2× CAGR" },
            ].map(({ lEn, lTh, v, c, desc }) => (
              <div
                key={lEn}
                className="px-2 py-2 text-center"
                style={{ border: `1px solid ${c}44`, background: c + "14" }}
              >
                <div className="text-[9px] font-bold uppercase tracking-wide" style={{ color: c }}>
                  {isEn ? lEn : lTh}
                </div>
                <div className="text-sm font-bold mt-0.5" style={{ fontFamily: "var(--font-mono)", color: "#1A1A1A" }}>
                  {fmtP(v)}
                </div>
                <div className="text-[8px] text-[#8A8378]">{desc}</div>
              </div>
            ))}
          </div>
          <p className="text-[8px] text-[#8A8378] mt-2">
            {isEn
              ? "Model-derived zones, not price targets. Sensitive to all assumptions above. Not advice."
              : "แถบราคาจากโมเดล ไม่ใช่ราคาเป้าหมาย ขึ้นกับ assumption ทุกตัว ไม่ใช่คำแนะนำ"}
          </p>
        </>
      )}
    </div>
  );
}

function VisualBand({ zones, currentPrice, isEn }: { zones: PriceZones; currentPrice: number; isEn: boolean }) {
  const vals    = [zones.accumulate, zones.fair, zones.expensive, currentPrice].filter(v => v > 0);
  const lo      = Math.min(...vals) * 0.92;
  const hi      = Math.max(...vals) * 1.08;
  const range   = hi - lo || 1;
  const pos     = (v: number) => `${Math.max(0, Math.min(100, ((v - lo) / range) * 100)).toFixed(1)}%`;

  const ZONES = [
    { from: lo, to: zones.accumulate, bg: "#dcfce7" },
    { from: zones.accumulate, to: zones.fair, bg: "#fef9c3" },
    { from: zones.fair, to: zones.expensive, bg: "#fee2e2" },
    { from: zones.expensive, to: hi, bg: "#fecaca" },
  ];

  return (
    <div className="relative h-8 rounded overflow-hidden" style={{ background: "#E4DDD2" }}>
      {ZONES.map((z, i) => {
        const left  = parseFloat(pos(z.from));
        const right = 100 - parseFloat(pos(z.to));
        if (left >= 100 - right) return null;
        return (
          <div
            key={i}
            className="absolute top-0 bottom-0"
            style={{ left: `${left}%`, right: `${right}%`, background: z.bg, opacity: 0.8 }}
          />
        );
      })}
      {/* Label ticks */}
      {[
        { v: zones.accumulate, label: fmtP(zones.accumulate), color: "#15803d" },
        { v: zones.fair,       label: fmtP(zones.fair),       color: "#a16207" },
        { v: zones.expensive,  label: fmtP(zones.expensive),  color: "#b91c1c" },
      ].map(({ v, label, color }) => (
        <div
          key={label}
          className="absolute top-0 bottom-0 flex items-center"
          style={{ left: pos(v), transform: "translateX(-50%)" }}
        >
          <div className="w-px h-full" style={{ background: color, opacity: 0.7 }} />
        </div>
      ))}
      {/* Current price pin */}
      <div
        className="absolute top-0 bottom-0 flex items-center"
        style={{ left: pos(currentPrice), transform: "translateX(-50%)" }}
      >
        <div className="w-0.5 h-full bg-[#1A1A1A]" />
      </div>
      {/* Current price label */}
      <div
        className="absolute top-0 text-[8px] font-bold text-[#1A1A1A] whitespace-nowrap px-0.5"
        style={{ left: pos(currentPrice), transform: "translateX(-50%)", top: "50%", marginTop: "-6px" }}
      >
        {fmtP(currentPrice)} {isEn ? "(now)" : "(ปัจจุบัน)"}
      </div>
    </div>
  );
}
