"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import type { AnalysisResult } from "@/app/api/news/analyze/route";

// Color configs keyed by Thai AI output values — locale-independent
const RELIABILITY_COLORS = {
  "สูง":     { bg: "#ECFDF5", text: "#065F46", border: "#5B8A2A" },
  "ปานกลาง": { bg: "#FFFBEB", text: "#92400E", border: "#D97706" },
  "ต่ำ":     { bg: "#FEF2F2", text: "#991B1B", border: "#DC2626" },
} as const;

const IMPACT_COLORS = {
  "บวก":      { bg: "#ECFDF5", text: "#065F46", border: "#5B8A2A" },
  "ลบ":       { bg: "#FEF2F2", text: "#991B1B", border: "#DC2626" },
  "เป็นกลาง": { bg: "#F9FAFB", text: "#374151", border: "#9CA3AF" },
} as const;

const CONTENT_TYPE_COLORS = {
  "รายงานข่าว":    { bg: "#EFF6FF", text: "#1D4ED8", border: "#3B82F6" },
  "บทวิเคราะห์":   { bg: "#F5F3FF", text: "#6D28D9", border: "#8B5CF6" },
  "ข่าวลือ":        { bg: "#FFFBEB", text: "#92400E", border: "#D97706" },
  "ประชาสัมพันธ์":  { bg: "#F9FAFB", text: "#374151", border: "#9CA3AF" },
} as const;

// Locale-dependent display labels
const RELIABILITY_LABELS = {
  en: { "สูง": "High · Reliable", "ปานกลาง": "Medium", "ต่ำ": "Low · Less Reliable" },
  th: { "สูง": "น่าเชื่อถือสูง",  "ปานกลาง": "ปานกลาง", "ต่ำ": "น่าเชื่อถือต่ำ" },
} as const;

const IMPACT_LABELS = {
  en: { "บวก": "Positive ▲", "ลบ": "Negative ▼", "เป็นกลาง": "Neutral —" },
  th: { "บวก": "บวก ▲",      "ลบ": "ลบ ▼",       "เป็นกลาง": "เป็นกลาง —" },
} as const;

const CONTENT_TYPE_LABELS = {
  en: {
    "รายงานข่าว":    "News Report",
    "บทวิเคราะห์":   "Analysis",
    "ข่าวลือ":        "Rumor",
    "ประชาสัมพันธ์":  "PR",
  },
  th: {
    "รายงานข่าว":    "รายงานข่าว",
    "บทวิเคราะห์":   "บทวิเคราะห์",
    "ข่าวลือ":        "ข่าวลือ",
    "ประชาสัมพันธ์":  "ประชาสัมพันธ์",
  },
} as const;

const CONFIDENCE_LABELS = {
  en: { "สูง": "Confidence: High", "ปานกลาง": "Confidence: Medium", "ต่ำ": "Confidence: Low" },
  th: { "สูง": "ความมั่นใจ: สูง",  "ปานกลาง": "ความมั่นใจ: ปานกลาง", "ต่ำ": "ความมั่นใจ: ต่ำ" },
} as const;

const CONFIDENCE_COLORS = {
  "สูง":     "#065F46",
  "ปานกลาง": "#92400E",
  "ต่ำ":     "#991B1B",
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
  const { lang } = useI18n();

  const relColors  = RELIABILITY_COLORS[result.reliability]           ?? RELIABILITY_COLORS["ปานกลาง"];
  const impColors  = IMPACT_COLORS[result.market_impact.direction]    ?? IMPACT_COLORS["เป็นกลาง"];
  const ctColors   = CONTENT_TYPE_COLORS[result.content_type]         ?? CONTENT_TYPE_COLORS["รายงานข่าว"];
  const confColor  = CONFIDENCE_COLORS[result.confidence]             ?? CONFIDENCE_COLORS["ปานกลาง"];

  const relLabel  = RELIABILITY_LABELS[lang][result.reliability]           ?? result.reliability;
  const impLabel  = IMPACT_LABELS[lang][result.market_impact.direction]    ?? result.market_impact.direction;
  const ctLabel   = CONTENT_TYPE_LABELS[lang][result.content_type]         ?? result.content_type;
  const confLabel = CONFIDENCE_LABELS[lang][result.confidence]             ?? result.confidence;

  const summaryLabel    = lang === "en" ? "Summary"     : "สรุปข่าว";
  const stockImpactLabel = lang === "en" ? "Stock impact:" : "ผลต่อหุ้น:";
  const sourceText      = lang === "en" ? "Source:"     : "แหล่งข่าว:";
  const readOriginal    = lang === "en" ? "Read original ↗" : "อ่านต้นฉบับ ↗";
  const cachedLabel     = lang === "en" ? "· cached"    : "· แคช";
  const ariaLabel       = lang === "en" ? "AI analysis result" : "ผลการวิเคราะห์ AI";

  return (
    <div
      className="mt-2 border-l-2 overflow-hidden"
      style={{ borderColor: relColors.border }}
      role="region"
      aria-label={ariaLabel}
    >
      {/* Chip row */}
      <div
        className="px-3 py-2 flex flex-wrap gap-1.5 items-center"
        style={{ background: relColors.bg }}
      >
        <Chip color={relColors} title={result.reliability_reason_th}>{relLabel}</Chip>
        <Chip color={ctColors}>{ctLabel}</Chip>
        <Chip color={impColors} title={result.market_impact.reason_th}>{impLabel}</Chip>
        <span className="text-xs font-bold" style={{ color: confColor }}>
          · {confLabel}
        </span>
        {cached && <span className="text-xs text-[#8A8378]">{cachedLabel}</span>}
      </div>

      {/* Reliability reason */}
      <div
        className="px-3 py-1.5 border-b border-[#e9edc9]"
        style={{ background: relColors.bg }}
      >
        <p className="text-xs leading-snug" style={{ color: relColors.text }}>
          {result.reliability_reason_th}
        </p>
      </div>

      {/* Market impact reason */}
      <div className="px-3 py-1.5 bg-[#F9F7F2] border-b border-[#e9edc9]">
        <p className="text-xs leading-snug text-[#8A8378]">
          <span className="font-bold" style={{ color: impColors.text }}>{stockImpactLabel} </span>
          {result.market_impact.reason_th}
        </p>
      </div>

      {/* Summary */}
      <div className="px-3 py-2 bg-[#F9F7F2]">
        <p className="text-xs font-bold uppercase tracking-wide text-[#8A8378] mb-1">{summaryLabel}</p>
        <p className="text-xs leading-relaxed text-[#1F1A14]">{result.summary_th}</p>
      </div>

      {/* Footer: disclaimer + source */}
      <div className="px-3 py-2 bg-[#faedcd] border-t border-[#e9edc9]">
        <p className="text-xs text-[#8A8378] leading-relaxed">{result.disclaimer_th}</p>
        <p className="text-xs text-[#8A8378] mt-0.5">
          {sourceText} {sourceLabel}{" · "}
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-bold text-[#1F1A14]"
          >
            {readOriginal}
          </a>
        </p>
      </div>
    </div>
  );
}

export function NewsAnalysisPanel({ article, ticker, otherHeadlines }: NewsAnalysisPanelProps) {
  const { lang } = useI18n();
  const [state, setState] = useState<State>({ phase: "idle" });

  const analyzing = lang === "en" ? "Analysing…" : "กำลังวิเคราะห์...";
  const hideAi    = lang === "en" ? "✦ Hide AI"  : "✦ ซ่อน AI";
  const showAi    = lang === "en" ? "✦ AI Analysis" : "✦ วิเคราะห์ข่าวด้วย AI";
  const retryBtn  = lang === "en" ? "Retry" : "ลองใหม่";
  const closeBtn  = lang === "en" ? "Close" : "ปิด";
  const ariaLabel = lang === "en"
    ? `AI analysis: ${article.headline}`
    : `วิเคราะห์ข่าวด้วย AI: ${article.headline}`;

  async function analyze() {
    if (state.phase === "open") { setState({ phase: "idle" }); return; }
    if (state.phase === "loading") return;

    setState({ phase: "loading" });

    const payload = {
      headline:       article.headline,
      snippet:        article.snippet ?? "",
      source:         article.source,
      ticker:         ticker ?? "",
      locale:         lang,
      otherHeadlines: (otherHeadlines ?? []).filter(h => h !== article.headline),
    };

    try {
      const res = await fetch("/api/news/analyze", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string; retryAfter?: number };
        const msg = res.status === 429
          ? lang === "en"
            ? `AI is busy 🙏 Wait ${err.retryAfter ?? 60}s then try again`
            : `ระบบ AI กำลังใช้งานหนัก 🙏 รอ ${err.retryAfter ?? 60} วินาที แล้วลองใหม่`
          : (err.error ?? (lang === "en" ? "AI unavailable" : "AI ไม่พร้อมใช้งาน"));
        setState({ phase: "error", message: msg });
        return;
      }
      const data = (await res.json()) as AnalysisResult & { cached?: boolean };
      setState({ phase: "open", result: data, cached: data.cached ?? false });
    } catch {
      setState({
        phase: "error",
        message: lang === "en" ? "Connection failed" : "ไม่สามารถเชื่อมต่อได้",
      });
    }
  }

  return (
    <div className="mt-1.5">
      <button
        onClick={() => void analyze()}
        disabled={state.phase === "loading"}
        className={`text-xs font-semibold px-2 py-1 rounded-lg border transition-colors disabled:opacity-50 ${
          state.phase === "open"
            ? "border-violet-400 bg-violet-50 text-violet-700"
            : "border-slate-300 text-slate-500 hover:border-violet-300 hover:text-violet-600"
        }`}
        aria-expanded={state.phase === "open"}
        aria-label={ariaLabel}
      >
        {state.phase === "loading" ? analyzing : state.phase === "open" ? hideAi : showAi}
      </button>

      {state.phase === "loading" && (
        <div className="mt-2 space-y-1.5 px-3 py-2 border-l-2 border-violet-200 bg-white/30 rounded-r-lg" aria-busy="true">
          <div className="flex gap-1.5 mb-2">
            {[20, 16, 14].map(w => (
              <div key={w} className={`h-4 w-${w} bg-white/50 animate-pulse rounded`} />
            ))}
          </div>
          <div className="h-2.5 w-full  bg-white/50 animate-pulse rounded" />
          <div className="h-2.5 w-4/5   bg-white/50 animate-pulse rounded" />
          <div className="h-2.5 w-3/5   bg-white/50 animate-pulse rounded" />
        </div>
      )}

      {state.phase === "error" && (
        <div className="mt-1.5 flex items-center gap-2 flex-wrap">
          <p className="text-xs text-red-600">{state.message}</p>
          <button onClick={() => void analyze()} className="text-xs text-red-700 underline font-semibold">{retryBtn}</button>
          <button onClick={() => setState({ phase: "idle" })} className="text-xs text-slate-500 underline">{closeBtn}</button>
        </div>
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
