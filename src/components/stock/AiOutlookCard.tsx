"use client";

import { useState, useRef } from "react";
import { Card } from "@/components/Card";
import { OffsetButton } from "@/components/OffsetButton";
import { PERSONAS, getPersonaById } from "@/lib/personas";
import type { PersonaId } from "@/lib/personas";

const DISCLAIMER = "นี่คือการวิเคราะห์ AI เพื่อการศึกษา ไม่ใช่คำแนะนำการลงทุน ตลาดมีความไม่แน่นอนเสมอ";

interface AiOutlook {
  thesis:            string;
  conviction?:       string;
  convictionReason?: string;
  bull:              { description: string; probability: string };
  base:              { description: string; probability: string };
  bear:              { description: string; probability: string };
  drivers:           string[];
  risk:              string;
  invalidation:      string;
  disclaimer:        string;
}

interface AiOutlookCardProps {
  ticker: string;
}

const ERROR_OUTLOOK = (msg: string): AiOutlook => ({
  thesis:       msg,
  bull:         { description: "—", probability: "—" },
  base:         { description: "—", probability: "—" },
  bear:         { description: "—", probability: "—" },
  drivers:      [],
  risk:         "—",
  invalidation: "—",
  disclaimer:   DISCLAIMER,
});

export function AiOutlookCard({ ticker }: AiOutlookCardProps) {
  const [persona, setPersona]           = useState<PersonaId>(PERSONAS[0].id);
  const [aiOutlook, setAiOutlook]       = useState<AiOutlook | null>(null);
  const [loadingOutlook, setLoading]    = useState(false);
  const hasLoadedRef                    = useRef(false);

  async function doLoad(p: PersonaId, refresh = false) {
    if (loadingOutlook) return;
    setLoading(true);
    try {
      const url = `/api/ai/outlook?ticker=${encodeURIComponent(ticker)}&persona=${p}${refresh ? "&refresh=true" : ""}`;
      const res  = await fetch(url);
      const data = await res.json() as AiOutlook & { error?: string };
      setAiOutlook(data.error ? ERROR_OUTLOOK(`ไม่สามารถโหลดการวิเคราะห์: ${data.error}`) : data);
      hasLoadedRef.current = true;
    } catch {
      setAiOutlook(ERROR_OUTLOOK("ไม่สามารถโหลดการวิเคราะห์ได้ในขณะนี้"));
    } finally {
      setLoading(false);
    }
  }

  function selectPersona(p: PersonaId) {
    if (p === persona) return;
    setPersona(p);
    if (hasLoadedRef.current) {
      setAiOutlook(null);
      void doLoad(p);
    }
  }

  const activePersona = getPersonaById(persona) ?? PERSONAS[0];

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-bold uppercase tracking-widest">
          วิเคราะห์แนวโน้มด้วย AI
        </h2>
        {aiOutlook && !loadingOutlook && (
          <button
            onClick={() => { setAiOutlook(null); void doLoad(persona, true); }}
            className="text-xs text-[#8A8378] hover:text-[#1F1A14] transition-colors"
            aria-label="รีเฟรชการวิเคราะห์"
          >
            รีเฟรช ↺
          </button>
        )}
      </div>

      {/* Persona selector */}
      <div className="mb-3">
        <p className="text-xs text-[#8A8378] uppercase tracking-widest mb-1.5">
          เลือกสไตล์นักลงทุน (AI เพื่อการศึกษา)
        </p>
        <div
          className="flex gap-1.5 overflow-x-auto pb-1"
          style={{ scrollbarWidth: "none" }}
          role="group"
          aria-label="เลือกสไตล์การลงทุน"
        >
          {PERSONAS.map((p) => (
            <button
              key={p.id}
              onClick={() => selectPersona(p.id)}
              className="flex-shrink-0 px-2 py-0.5 text-xs font-bold border transition-colors"
              style={{
                background:  persona === p.id ? "#1F1A14" : "#faedcd",
                color:       persona === p.id ? "#fff"    : "#8A8378",
                borderColor: persona === p.id ? "#1F1A14" : "#e9edc9",
              }}
              aria-pressed={persona === p.id}
            >
              {p.nameTh}
            </button>
          ))}
        </div>
        <p className="text-xs text-[#8A8378] italic mt-1">{activePersona.descTh}</p>
      </div>

      {!aiOutlook && !loadingOutlook && (
        <>
          <p className="text-xs text-[#8A8378] italic mb-2">
            วิเคราะห์เชิงลึก: thesis, กรณี Bull/Base/Bear, ปัจจัยขับเคลื่อน, ความเสี่ยง
          </p>
          <OffsetButton size="sm" onClick={() => void doLoad(persona)} disabled={loadingOutlook}>
            วิเคราะห์ในมุม{activePersona.nameTh}
          </OffsetButton>
        </>
      )}

      {loadingOutlook && (
        <div className="flex flex-col gap-2">
          {[80, 60, 70, 50].map((w) => (
            <div key={w} className="h-2 bg-[#e9edc9] animate-pulse rounded" style={{ width: `${w}%` }} />
          ))}
        </div>
      )}

      {aiOutlook && !loadingOutlook && (
        <div className="flex flex-col gap-3 text-xs">
          <div className="text-xs text-[#8A8378] italic border-b border-[#e9edc9] pb-1.5">
            Martin · Licensed Financial Analyst · สไตล์{activePersona.nameTh}
          </div>

          <p className="leading-relaxed">{aiOutlook.thesis}</p>

          {aiOutlook.conviction && (
            <div className="flex flex-col gap-0.5">
              <span
                className="self-start px-2 py-0.5 text-xs font-bold uppercase tracking-wide border"
                style={{
                  background:  aiOutlook.conviction === "high" ? "#5B8A2A" : aiOutlook.conviction === "medium" ? "#D97706" : "#DC2626",
                  color:       "#fff",
                  borderColor: aiOutlook.conviction === "high" ? "#5B8A2A" : aiOutlook.conviction === "medium" ? "#D97706" : "#DC2626",
                }}
              >
                ระดับความมั่นใจ:{" "}
                {aiOutlook.conviction === "high" ? "สูง" : aiOutlook.conviction === "medium" ? "กลาง" : "ต่ำ"}
              </span>
              {aiOutlook.convictionReason && (
                <p className="text-xs text-[#8A8378] italic">{aiOutlook.convictionReason}</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { label: "Bull", data: aiOutlook.bull, color: "#5B8A2A" },
                { label: "Base", data: aiOutlook.base, color: "#1F1A14" },
                { label: "Bear", data: aiOutlook.bear, color: "#DC2626" },
              ] as const
            ).map(({ label, data, color }) => (
              <div key={label} className="border border-[#e9edc9] p-2 bg-[#e9edc9]">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs" style={{ color }}>{label}</span>
                  <span className="text-xs text-[#8A8378]">{data.probability}</span>
                </div>
                <p className="text-xs text-[#1F1A14] leading-snug">{data.description}</p>
              </div>
            ))}
          </div>

          {aiOutlook.drivers.length > 0 && (
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-[#8A8378] mb-1">
                ปัจจัยขับเคลื่อน
              </div>
              <ul className="flex flex-col gap-0.5">
                {aiOutlook.drivers.map((d, i) => (
                  <li key={i} className="text-xs flex gap-1">
                    <span className="text-[#5B8A2A] flex-shrink-0">·</span>
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div className="border border-[#e9edc9] p-2 bg-[#e9edc9]">
              <div className="text-xs font-bold text-[#DC2626] uppercase tracking-wide mb-0.5">ความเสี่ยง</div>
              <p className="text-xs">{aiOutlook.risk}</p>
            </div>
            <div className="border border-[#e9edc9] p-2 bg-[#e9edc9]">
              <div className="text-xs font-bold text-[#8A8378] uppercase tracking-wide mb-0.5">จะรู้ว่าผิดเมื่อ</div>
              <p className="text-xs">{aiOutlook.invalidation}</p>
            </div>
          </div>

          <p className="text-xs text-[#8A8378] italic border-t border-[#e9edc9] pt-2">
            {aiOutlook.disclaimer}
          </p>
          <div className="flex flex-wrap gap-1 pt-1">
            {["Finnhub · Price & Metrics", "Finnhub · News Headlines", "Finnhub · Analyst Ratings"].map(src => (
              <span key={src} className="text-[9px] px-1.5 py-0.5 border border-[#ccd5ae] text-[#8A8378] rounded">
                📊 {src}
              </span>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
