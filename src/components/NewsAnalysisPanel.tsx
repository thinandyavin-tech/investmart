"use client";

import { useState } from "react";
import type { AnalysisResult } from "@/app/api/news/analyze/route";

const RELIABILITY_CFG = {
  "สูง":     { label: "น่าเชื่อถือสูง",   bg: "#ECFDF5", text: "#065F46", border: "#5B8A2A" },
  "ปานกลาง": { label: "ปานกลาง",          bg: "#FFFBEB", text: "#92400E", border: "#D97706" },
  "ต่ำ":     { label: "น่าเชื่อถือต่ำ",   bg: "#FEF2F2", text: "#991B1B", border: "#DC2626" },
} as const;

const IMPACT_CFG = {
  "บวก":      { label: "บวก ▲",     bg: "#ECFDF5", text: "#065F46", border: "#5B8A2A" },
  "ลบ":       { label: "ลบ ▼",      bg: "#FEF2F2", text: "#991B1B", border: "#DC2626" },
  "เป็นกลาง": { label: "เป็นกลาง —", bg: "#F9FAFB", text: "#374151", border: "#9CA3AF" },
} as const;

const CONTENT_TYPE_CFG = {
  "รายงานข่าว":    { label: "รายงานข่าว",    bg: "#EFF6FF", text: "#1D4ED8", border: "#3B82F6" },
  "บทวิเคราะห์":   { label: "บทวิเคราะห์",   bg: "#F5F3FF", text: "#6D28D9", border: "#8B5CF6" },
  "ข่าวลือ":        { label: "ข่าวลือ",        bg: "#FFFBEB", text: "#92400E", border: "#D97706" },
  "ประชาสัมพันธ์":  { label: "ประชาสัมพันธ์",  bg: "#F9FAFB", text: "#374151", border: "#9CA3AF" },
} as const;

const CONFIDENCE_CFG = {
  "สูง":     { label: "ความมั่นใจ: สูง",    text: "#065F46" },
  "ปานกลาง": { label: "ความมั่นใจ: ปานกลาง", text: "#92400E" },
  "ต่ำ":     { label: "ความมั่นใจ: ต่ำ",    text: "#991B1B" },
} as const;

export interface NewsArticleInput {
  id:       number;
  headline: string;
  source:   string;
  url:      string;
  snippet?: string;
}

interface NewsAnalysisPanelProps {
  article:         NewsArticleInput;
  ticker?:         string;
  otherHeadlines?: string[];
}

type State =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "open";  result: AnalysisResult; cached: boolean }
  | { phase: "error"; message: string };

function Chip({
  color,
  title,
  children,
}: {
  color:    { text: string; border: string; bg: string };
  title?:   string;
  children: React.ReactNode;
}) {
  return (
    <span
      className="text-xs font-bold px-2 py-0.5 border"
      style={{ color: color.text, borderColor: color.border, background: color.bg }}
      title={title}
    >
      {children}
    </span>
  );
}

interface ResultPanelProps {
  result:      AnalysisResult;
  cached:      boolean;
  sourceLabel: string;
  sourceUrl:   string;
}

function ResultPanel({ result, cached, sourceLabel, sourceUrl }: ResultPanelProps) {
  const relCfg  = RELIABILITY_CFG[result.reliability]           ?? RELIABILITY_CFG["ปานกลาง"];
  const impCfg  = IMPACT_CFG[result.market_impact.direction]    ?? IMPACT_CFG["เป็นกลาง"];
  const ctCfg   = CONTENT_TYPE_CFG[result.content_type]         ?? CONTENT_TYPE_CFG["รายงานข่าว"];
  const confCfg = CONFIDENCE_CFG[result.confidence]             ?? CONFIDENCE_CFG["ปานกลาง"];

  return (
    <div
      className="mt-2 border-l-2 overflow-hidden"
      style={{ borderColor: relCfg.border }}
      role="region"
      aria-label="ผลการวิเคราะห์ AI"
    >
      {/* Chip row */}
      <div
        className="px-3 py-2 flex flex-wrap gap-1.5 items-center"
        style={{ background: relCfg.bg }}
      >
        <Chip color={relCfg} title={result.reliability_reason_th}>{relCfg.label}</Chip>
        <Chip color={ctCfg}>{ctCfg.label}</Chip>
        <Chip color={impCfg} title={result.market_impact.reason_th}>{impCfg.label}</Chip>
        <span className="text-xs font-bold" style={{ color: confCfg.text }}>
          · {confCfg.label}
        </span>
        {cached && <span className="text-xs text-[#8A8378]">· แคช</span>}
      </div>

      {/* Reliability reason */}
      <div
        className="px-3 py-1.5 border-b border-[#E8E2D4]"
        style={{ background: relCfg.bg }}
      >
        <p className="text-xs leading-snug" style={{ color: relCfg.text }}>
          {result.reliability_reason_th}
        </p>
      </div>

      {/* Market impact reason */}
      <div className="px-3 py-1.5 bg-[#F9F7F2] border-b border-[#E8E2D4]">
        <p className="text-xs leading-snug text-[#8A8378]">
          <span className="font-bold" style={{ color: impCfg.text }}>ผลต่อหุ้น: </span>
          {result.market_impact.reason_th}
        </p>
      </div>

      {/* Summary */}
      <div className="px-3 py-2 bg-[#F9F7F2]">
        <p className="text-xs font-bold uppercase tracking-wide text-[#8A8378] mb-1">สรุปข่าว</p>
        <p className="text-xs leading-relaxed text-[#1F1A14]">{result.summary_th}</p>
      </div>

      {/* Footer: disclaimer + source */}
      <div className="px-3 py-2 bg-[#F3EDE0] border-t border-[#E8E2D4]">
        <p className="text-xs text-[#8A8378] leading-relaxed">{result.disclaimer_th}</p>
        <p className="text-xs text-[#8A8378] mt-0.5">
          แหล่งข่าว: {sourceLabel}{" · "}
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-bold text-[#1F1A14]"
          >
            อ่านต้นฉบับ ↗
          </a>
        </p>
      </div>
    </div>
  );
}

export function NewsAnalysisPanel({ article, ticker, otherHeadlines }: NewsAnalysisPanelProps) {
  const [state, setState] = useState<State>({ phase: "idle" });

  async function analyze() {
    if (state.phase === "open") {
      setState({ phase: "idle" });
      return;
    }

    setState({ phase: "loading" });

    const payload = {
      headline:       article.headline,
      snippet:        article.snippet ?? "",
      source:         article.source,
      ticker:         ticker ?? "",
      otherHeadlines: (otherHeadlines ?? []).filter(h => h !== article.headline),
    };

    async function doFetch(): Promise<Response> {
      const r = await fetch("/api/news/analyze", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      if (r.status === 429) {
        await new Promise<void>(resolve => setTimeout(resolve, 1500));
        return fetch("/api/news/analyze", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(payload),
        });
      }
      return r;
    }

    try {
      const res = await doFetch();
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        setState({ phase: "error", message: err.error ?? "AI ไม่พร้อมใช้งาน" });
        return;
      }
      const data = (await res.json()) as AnalysisResult & { cached?: boolean };
      setState({ phase: "open", result: data, cached: data.cached ?? false });
    } catch {
      setState({ phase: "error", message: "ไม่สามารถเชื่อมต่อได้" });
    }
  }

  return (
    <div className="mt-1.5">
      <button
        onClick={() => void analyze()}
        disabled={state.phase === "loading"}
        className="text-xs font-bold px-2 py-0.5 border transition-colors disabled:opacity-50"
        style={{
          borderColor: state.phase === "open" ? "#1F1A14" : "#8A8378",
          color:       state.phase === "open" ? "#1F1A14" : "#8A8378",
          background:  state.phase === "open" ? "#F0EBE0" : "transparent",
        }}
        aria-expanded={state.phase === "open"}
        aria-label={`วิเคราะห์ข่าวด้วย AI: ${article.headline}`}
      >
        {state.phase === "loading" ? "กำลังวิเคราะห์..." : state.phase === "open" ? "ซ่อน AI" : "วิเคราะห์ข่าวด้วย AI"}
      </button>

      {state.phase === "loading" && (
        <div
          className="mt-2 space-y-1.5 px-3 py-2 border-l-2 border-[#E8E2D4] bg-[#F9F7F2]"
          aria-busy="true"
          aria-label="กำลังวิเคราะห์"
        >
          <div className="flex gap-1.5 mb-2">
            <div className="h-4 w-20 bg-[#E8E2D4] animate-pulse rounded" />
            <div className="h-4 w-16 bg-[#E8E2D4] animate-pulse rounded" />
            <div className="h-4 w-14 bg-[#E8E2D4] animate-pulse rounded" />
          </div>
          <div className="h-2.5 w-full  bg-[#E8E2D4] animate-pulse rounded" />
          <div className="h-2.5 w-4/5   bg-[#E8E2D4] animate-pulse rounded" />
          <div className="h-2.5 w-3/5   bg-[#E8E2D4] animate-pulse rounded" />
        </div>
      )}

      {state.phase === "error" && (
        <p className="mt-1.5 text-xs px-2" style={{ color: "#DC2626" }}>
          {state.message}
          {" · "}
          <button onClick={() => void analyze()} className="underline font-bold">
            ลองใหม่
          </button>
          {" · "}
          <button onClick={() => setState({ phase: "idle" })} className="underline">
            ปิด
          </button>
        </p>
      )}

      {state.phase === "open" && (
        <ResultPanel
          result={state.result}
          cached={state.cached}
          sourceLabel={article.source}
          sourceUrl={article.url}
        />
      )}
    </div>
  );
}
