"use client";

import { useState, useCallback } from "react";
import type { AnalysisResult, CredibilityRating } from "@/app/api/news/analyze/route";

// Well-known reputable sources — UI hint only, not used for the AI rating
const REPUTABLE_SOURCES = new Set([
  "reuters", "bloomberg", "associated press", "ap", "wsj",
  "wall street journal", "cnbc", "financial times", "ft",
  "marketwatch", "barron's", "barrons", "fortune", "the economist",
  "yahoo finance", "bbc", "nytimes", "new york times",
  "washington post", "abc news", "cbs news", "nbc news",
  "the guardian", "business insider", "benzinga",
]);

function isReputableSource(source: string): boolean {
  return REPUTABLE_SOURCES.has(source.toLowerCase().trim());
}

const RATING_CONFIG: Record<CredibilityRating["rating"], { label: string; bg: string; text: string; border: string }> = {
  "สูง":     { label: "น่าเชื่อถือสูง",   bg: "#ECFDF5", text: "#065F46", border: "#5B8A2A" },
  "ปานกลาง": { label: "น่าเชื่อถือปานกลาง", bg: "#FFFBEB", text: "#92400E", border: "#D97706" },
  "ต่ำ":     { label: "น่าเชื่อถือต่ำ",   bg: "#FEF2F2", text: "#991B1B", border: "#DC2626" },
};

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
  | { phase: "open";   result: AnalysisResult; cached: boolean }
  | { phase: "error";  message: string };

export function NewsAnalysisPanel({ article, ticker, otherHeadlines }: NewsAnalysisPanelProps) {
  const [state, setState] = useState<State>({ phase: "idle" });
  const reputable = isReputableSource(article.source);

  const analyze = useCallback(async () => {
    // Toggle closed if already open
    if (state.phase === "open") {
      setState({ phase: "idle" });
      return;
    }

    setState({ phase: "loading" });

    try {
      const res = await fetch("/api/news/analyze", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          headline:        article.headline,
          snippet:         article.snippet ?? "",
          source:          article.source,
          ticker:          ticker ?? "",
          otherHeadlines:  (otherHeadlines ?? []).filter(h => h !== article.headline),
        }),
      });

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
  }, [article, ticker, otherHeadlines, state.phase]);

  const cfg = state.phase === "open" ? RATING_CONFIG[state.result.credibility.rating] : null;

  return (
    <div className="mt-1.5">
      {/* Source badge + analyze button row */}
      <div className="flex items-center gap-2 flex-wrap">
        {reputable && (
          <span
            className="text-[8px] font-bold px-1.5 py-0.5 border"
            style={{ background: "#ECFDF5", color: "#065F46", borderColor: "#5B8A2A" }}
            title="แหล่งข่าวที่รู้จักและน่าเชื่อถือ"
          >
            ✓ แหล่งข่าวรู้จัก
          </span>
        )}

        <button
          onClick={() => void analyze()}
          disabled={state.phase === "loading"}
          className="text-[9px] font-bold px-2 py-0.5 border transition-colors disabled:opacity-50"
          style={{
            borderColor: state.phase === "open" ? "#1F1A14" : "#8A8378",
            color:       state.phase === "open" ? "#1F1A14" : "#8A8378",
            background:  state.phase === "open" ? "#F0EBE0" : "transparent",
          }}
          aria-expanded={state.phase === "open"}
          aria-label={`ตรวจสอบความน่าเชื่อถือและสรุปข่าว: ${article.headline}`}
        >
          {state.phase === "loading"
            ? "กำลังวิเคราะห์..."
            : state.phase === "open"
            ? "ซ่อน AI"
            : "ตรวจสอบ + สรุปด้วย AI"}
        </button>
      </div>

      {/* Loading skeleton */}
      {state.phase === "loading" && (
        <div className="mt-2 space-y-1.5 px-3 py-2 border-l-2 border-[#E8E2D4] bg-[#F9F7F2]" aria-busy="true" aria-label="กำลังวิเคราะห์">
          <div className="h-3 w-28 bg-[#E8E2D4] animate-pulse rounded" />
          <div className="h-2.5 w-full bg-[#E8E2D4] animate-pulse rounded" />
          <div className="h-2.5 w-4/5 bg-[#E8E2D4] animate-pulse rounded" />
          <div className="h-2.5 w-3/5 bg-[#E8E2D4] animate-pulse rounded" />
        </div>
      )}

      {/* Error state */}
      {state.phase === "error" && (
        <p className="mt-1.5 text-[9px] text-[#DC2626] px-2">
          {state.message} ·{" "}
          <button
            onClick={() => setState({ phase: "idle" })}
            className="underline"
          >
            ปิด
          </button>
        </p>
      )}

      {/* Result panel */}
      {state.phase === "open" && cfg && (
        <div
          className="mt-2 border-l-2 overflow-hidden"
          style={{ borderColor: cfg.border }}
          role="region"
          aria-label="ผลการวิเคราะห์ AI"
        >
          {/* Credibility header */}
          <div
            className="px-3 py-2 flex items-start gap-2"
            style={{ background: cfg.bg }}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="text-[9px] font-bold px-2 py-0.5 border"
                  style={{ color: cfg.text, borderColor: cfg.border, background: "white" }}
                >
                  {cfg.label}
                </span>
                <span className="text-[9px]" style={{ color: cfg.text }}>
                  {state.result.credibility.rating === "สูง" ? "●" : state.result.credibility.rating === "ปานกลาง" ? "◑" : "○"}
                  {" "}ความน่าเชื่อถือ: {state.result.credibility.rating}
                </span>
              </div>
              <p className="text-[10px] mt-1 leading-relaxed" style={{ color: cfg.text }}>
                {state.result.credibility.reason}
              </p>
              {state.result.credibility.caveats.length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {state.result.credibility.caveats.map((c, i) => (
                    <li key={i} className="text-[9px] flex gap-1" style={{ color: cfg.text }}>
                      <span aria-hidden="true">▸</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Summary */}
          <div className="px-3 py-2 bg-[#F9F7F2]">
            <p className="text-[9px] font-bold uppercase tracking-wide text-[#8A8378] mb-1">สรุปข่าว</p>
            <p className="text-[11px] leading-relaxed text-[#1F1A14]">
              {state.result.summary}
            </p>
          </div>

          {/* Footer: disclaimer + source link */}
          <div className="px-3 py-2 bg-[#F3EDE0] border-t border-[#E8E2D4]">
            <p className="text-[9px] text-[#8A8378] leading-relaxed">
              AI ประเมินความน่าเชื่อถือของแหล่งข่าว ไม่ใช่การยืนยันว่าข่าวจริงหรือเท็จ ·{" "}
              ไม่ใช่คำแนะนำการลงทุน
            </p>
            <p className="text-[9px] text-[#8A8378] mt-0.5">
              แหล่งข่าว: {article.source}
              {state.cached && " · จากแคช"}
              {" · "}
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-bold text-[#1F1A14]"
              >
                อ่านต้นฉบับ ↗
              </a>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
