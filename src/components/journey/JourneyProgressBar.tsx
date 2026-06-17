"use client";

import { useState, useEffect, useCallback } from "react";
import { Link }    from "@/i18n/navigation";
import { useUser } from "@/lib/userContext";
import { useI18n } from "@/lib/i18n";
import {
  JOURNEY_STEPS,
  loadLocalJourney,
  saveLocalJourney,
  mergeJourneyState,
  getNextStep,
  getCompletionCount,
  type LocalJourneyState,
} from "@/lib/journey";
import { GuidedFirstTrade } from "@/components/journey/GuidedFirstTrade";

export function JourneyProgressBar() {
  const { user } = useUser();
  const { lang }  = useI18n();
  const isEn = lang === "en";

  const [state,         setState]         = useState<LocalJourneyState | null>(null);
  const [showGuided,    setShowGuided]    = useState(false);
  const [dismissed,     setDismissed]     = useState(false);

  // Load from localStorage on mount, then sync from DB if authed
  useEffect(() => {
    const local = loadLocalJourney();
    setState(local);

    if (user && !user.isDemo) {
      fetch("/api/journey/progress")
        .then(r => r.ok ? r.json() : null)
        .then(remote => {
          if (!remote) return;
          setState(prev => {
            if (!prev) return remote as LocalJourneyState;
            const merged = mergeJourneyState(prev, remote as LocalJourneyState);
            saveLocalJourney(merged);
            return merged;
          });
        })
        .catch(() => {});
    }
  }, [user]);

  const syncToDb = useCallback((update: Partial<LocalJourneyState>) => {
    if (!user || user.isDemo) return;
    fetch("/api/journey/progress", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update),
    }).catch(() => {});
  }, [user]);

  if (!state || dismissed) return null;

  const tradeCount = user?.tradeCount ?? 0;
  const completed  = getCompletionCount(state.completedSteps, tradeCount);
  const total      = JOURNEY_STEPS.length;
  const allDone    = completed >= total;

  // Hide the bar once all steps are done
  if (allDone) return null;

  const nextStep = getNextStep(state.completedSteps, tradeCount);

  function handleStepAction() {
    if (!nextStep) return;
    if (nextStep.id === "first-trade") {
      setShowGuided(true);
      return;
    }
    // Mark step complete optimistically (for link-based steps, user marks it on the journey page)
    // Don't auto-complete here — user confirms on /journey page
  }

  function handleDismiss() {
    setDismissed(true);
  }

  const progressPct = Math.round((completed / total) * 100);

  return (
    <>
      <div
        className="mx-3 mb-3 px-3 py-2.5"
        style={{ background: "#F5F3FF", border: "1px solid #8B5CF6", boxShadow: "2px 2px 0 #1A1A1A" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#8B5CF6]">
              {isEn ? "Your Learning Journey" : "เส้นทางการเรียนรู้"}
            </span>
            <span className="text-[9px] text-[#8A8378]">{completed}/{total}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/journey" className="text-[9px] font-bold text-[#8B5CF6] hover:underline">
              {isEn ? "View all →" : "ดูทั้งหมด →"}
            </Link>
            <button
              onClick={handleDismiss}
              className="text-[#8A8378] hover:text-[#1A1A1A] text-xs"
              aria-label={isEn ? "Dismiss" : "ปิด"}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-[#E4DDD2] mb-2.5 overflow-hidden">
          <div
            className="h-full bg-[#8B5CF6] transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Step dots */}
        <div className="flex gap-1.5 mb-2.5">
          {JOURNEY_STEPS.map(step => {
            const done = step.isAutoDetected
              ? tradeCount > 0
              : state.completedSteps.includes(step.id);
            const isCurrent = nextStep?.id === step.id;
            return (
              <div
                key={step.id}
                className="flex-1 flex flex-col items-center gap-0.5"
                title={isEn ? step.titleEn : step.titleTh}
              >
                <div
                  className="w-full h-1 transition-colors"
                  style={{
                    background: done ? "#8B5CF6" : isCurrent ? "#C4B5FD" : "#E4DDD2",
                  }}
                />
                <span className="text-[7px] text-[#8A8378] hidden sm:block truncate max-w-full text-center leading-tight">
                  {step.icon}
                </span>
              </div>
            );
          })}
        </div>

        {/* Next step CTA */}
        {nextStep && (
          nextStep.href ? (
            <Link
              href={nextStep.href}
              className="flex items-center gap-2 text-[10px] font-bold text-[#8B5CF6]"
            >
              <span>{nextStep.icon}</span>
              <span>{isEn ? `Next: ${nextStep.titleEn}` : `ถัดไป: ${nextStep.titleTh}`}</span>
              <span className="ml-auto text-[8px] bg-[#8B5CF6] text-white px-1.5 py-0.5">
                {isEn ? nextStep.actionEn : nextStep.actionTh}
              </span>
            </Link>
          ) : (
            <button
              onClick={handleStepAction}
              className="flex items-center gap-2 text-[10px] font-bold text-[#8B5CF6] w-full text-left"
            >
              <span>{nextStep.icon}</span>
              <span>{isEn ? `Next: ${nextStep.titleEn}` : `ถัดไป: ${nextStep.titleTh}`}</span>
              <span className="ml-auto text-[8px] bg-[#8B5CF6] text-white px-1.5 py-0.5">
                {isEn ? nextStep.actionEn : nextStep.actionTh}
              </span>
            </button>
          )
        )}
      </div>

      {showGuided && (
        <GuidedFirstTrade
          onClose={() => setShowGuided(false)}
          onComplete={() => {
            setShowGuided(false);
            // First trade auto-detects via tradeCount — no manual mark needed
          }}
        />
      )}
    </>
  );
}
