"use client";

import { useState, useEffect, useCallback } from "react";
import { Link }     from "@/i18n/navigation";
import { AppShell } from "@/components/AppShell";
import { useI18n }  from "@/lib/i18n";
import { useUser }  from "@/lib/userContext";
import {
  JOURNEY_STEPS,
  loadLocalJourney,
  saveLocalJourney,
  mergeJourneyState,
  getNextStep,
  getCompletionCount,
  evaluateReadiness,
  type LocalJourneyState,
  type ReadinessAnswer,
} from "@/lib/journey";
import { GuidedFirstTrade } from "@/components/journey/GuidedFirstTrade";

// ── Readiness Check ────────────────────────────────────────────────────────────

interface ReadinessCheckProps {
  isEn:     boolean;
  onDone:   (skipped: boolean) => void;
}

function ReadinessCheck({ isEn, onDone }: ReadinessCheckProps) {
  const [answers, setAnswers] = useState<ReadinessAnswer>({
    positiveCashFlow: null, emergencyFund: null, highInterestDebt: null,
    timeHorizon: null, drawdownTolerance: null,
  });
  const [result, setResult] = useState<ReturnType<typeof evaluateReadiness> | null>(null);

  function set<K extends keyof ReadinessAnswer>(key: K, val: ReadinessAnswer[K]) {
    setAnswers(prev => ({ ...prev, [key]: val }));
    setResult(null);
  }

  const allAnswered = Object.values(answers).every(v => v !== null);

  function handleEvaluate() {
    setResult(evaluateReadiness(answers));
  }

  return (
    <div style={{ background: "#FDFAF4", border: "1px solid #C8BFB0", boxShadow: "2px 2px 0 #1A1A1A" }} className="px-4 py-4 flex flex-col gap-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#8A8378] mb-1">
          {isEn ? "Financial Readiness Check" : "ตรวจสอบความพร้อมทางการเงิน"}
        </p>
        <p className="text-[10px] text-[#6B6B6B]">
          {isEn
            ? "5 quick questions to find the right starting point for you. Observational — nothing here blocks you from using the app."
            : "5 คำถามสั้นเพื่อหาจุดเริ่มต้นที่เหมาะสมสำหรับคุณ — ไม่มีอะไรที่นี่บล็อกการใช้งานแอป"}
        </p>
      </div>

      {/* Q1 */}
      <QuestionBlock
        label={isEn ? "1. After all monthly expenses, do you have money left over each month?" : "1. หลังจ่ายค่าใช้จ่ายทุกอย่าง คุณมีเงินเหลือทุกเดือนไหม?"}
        options={[
          { value: true,  labelEn: "Yes, I have positive cash flow",    labelTh: "ใช่ มีเงินเหลือ" },
          { value: false, labelEn: "No / Not sure",                      labelTh: "ไม่ / ไม่แน่ใจ" },
        ]}
        selected={answers.positiveCashFlow}
        onSelect={v => set("positiveCashFlow", v as boolean)}
        isEn={isEn}
      />

      {/* Q2 */}
      <QuestionBlock
        label={isEn ? "2. Do you have 3–6 months of expenses saved as an emergency fund?" : "2. คุณมีเงินฉุกเฉิน 3–6 เดือนเก็บไว้ไหม?"}
        options={[
          { value: true,  labelEn: "Yes, my emergency fund is set",     labelTh: "ใช่ มีกองทุนฉุกเฉินแล้ว" },
          { value: false, labelEn: "Not yet",                             labelTh: "ยังไม่มี" },
        ]}
        selected={answers.emergencyFund}
        onSelect={v => set("emergencyFund", v as boolean)}
        isEn={isEn}
      />

      {/* Q3 */}
      <QuestionBlock
        label={isEn ? "3. Do you have high-interest debt (credit cards or loans >10%/year)?" : "3. คุณมีหนี้ดอกเบี้ยสูง (บัตรเครดิต หรือกู้ >10%/ปี) ไหม?"}
        options={[
          { value: false, labelEn: "No high-interest debt",             labelTh: "ไม่มีหนี้ดอกเบี้ยสูง" },
          { value: true,  labelEn: "Yes, I'm working on paying it off", labelTh: "มี กำลังทยอยจ่าย" },
        ]}
        selected={answers.highInterestDebt}
        onSelect={v => set("highInterestDebt", v as boolean)}
        isEn={isEn}
      />

      {/* Q4 */}
      <QuestionBlock
        label={isEn ? "4. When do you plan to need this investment money?" : "4. คุณวางแผนจะใช้เงินลงทุนนี้เมื่อไหร่?"}
        options={[
          { value: "short",    labelEn: "Within 1 year",  labelTh: "ภายใน 1 ปี" },
          { value: "medium",   labelEn: "1–3 years",      labelTh: "1–3 ปี" },
          { value: "long",     labelEn: "3–10 years",     labelTh: "3–10 ปี" },
          { value: "veryLong", labelEn: "10+ years",      labelTh: "10 ปีขึ้นไป" },
        ]}
        selected={answers.timeHorizon}
        onSelect={v => set("timeHorizon", v as ReadinessAnswer["timeHorizon"])}
        isEn={isEn}
      />

      {/* Q5 */}
      <QuestionBlock
        label={isEn ? "5. If your portfolio dropped 30% in a month, you would:" : "5. ถ้าพอร์ตลด 30% ในหนึ่งเดือน คุณจะ:"}
        options={[
          { value: "panic",       labelEn: "Panic and sell",                 labelTh: "ตื่นตกใจและขาย" },
          { value: "hold",        labelEn: "Be worried but hold",            labelTh: "กังวลแต่ถือไว้" },
          { value: "opportunity", labelEn: "See it as a buying opportunity", labelTh: "มองว่าเป็นโอกาสซื้อ" },
        ]}
        selected={answers.drawdownTolerance}
        onSelect={v => set("drawdownTolerance", v as ReadinessAnswer["drawdownTolerance"])}
        isEn={isEn}
      />

      {/* Result */}
      {result && (
        <div
          className="px-4 py-3"
          style={{ background: result.ready ? "#F0FDF4" : "#FFFBEB", border: `1px solid ${result.ready ? "#86EFAC" : "#FCD34D"}`, borderLeft: `4px solid ${result.ready ? "#16A34A" : "#D97706"}` }}
        >
          <p className="text-xs font-bold mb-1" style={{ color: result.ready ? "#16A34A" : "#D97706" }}>
            {result.ready
              ? (isEn ? "You're ready to start investing!" : "คุณพร้อมเริ่มลงทุนแล้ว!")
              : (isEn ? "A few things to consider first" : "มีบางอย่างที่ควรจัดการก่อน")}
          </p>
          <p className="text-[10px] text-[#3D3730]">{isEn ? result.summaryEn : result.summaryTh}</p>
          {result.caution.includes("positiveCashFlow") && (
            <p className="text-[9px] text-amber-700 mt-1">• {isEn ? "Work on positive monthly cash flow first — see Blueprint Level 2." : "สร้าง cash flow บวกก่อน — ดู Blueprint Level 2"}</p>
          )}
          {result.caution.includes("emergencyFund") && (
            <p className="text-[9px] text-amber-700 mt-1">• {isEn ? "Build a 3–6 month emergency fund before investing — Blueprint Level 3." : "สร้างกองทุนฉุกเฉิน 3–6 เดือนก่อน — Blueprint Level 3"}</p>
          )}
          {result.caution.includes("highInterestDebt") && (
            <p className="text-[9px] text-amber-700 mt-1">• {isEn ? "High-interest debt costs more than most investments earn — pay it first." : "หนี้ดอกเบี้ยสูงกินกำไรมากกว่าการลงทุน — ควรจ่ายก่อน"}</p>
          )}
          {result.caution.includes("timeHorizon") && (
            <p className="text-[9px] text-amber-700 mt-1">• {isEn ? "Money needed in <1 year shouldn't be in stocks — too volatile." : "เงินที่ต้องใช้ภายใน 1 ปีไม่ควรอยู่ในหุ้น — ผันผวนเกินไป"}</p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onDone(true)}
          className="flex-1 py-2 text-xs font-bold border border-[#C8BFB0] text-[#8A8378] hover:text-[#1A1A1A] transition-colors"
        >
          {isEn ? "Skip — go to journey" : "ข้าม — ไปที่ journey"}
        </button>
        {allAnswered && !result && (
          <button
            onClick={handleEvaluate}
            className="flex-1 py-2 text-xs font-bold text-white bg-[#8B5CF6] hover:bg-[#7C3AED] transition-colors"
          >
            {isEn ? "See my result →" : "ดูผลลัพธ์ →"}
          </button>
        )}
        {result && (
          <button
            onClick={() => onDone(false)}
            className="flex-1 py-2 text-xs font-bold text-white bg-[#1A1A1A] hover:bg-[#333] transition-colors"
          >
            {isEn ? "Start my journey →" : "เริ่มเส้นทาง →"}
          </button>
        )}
      </div>
    </div>
  );
}

interface QuestionOption { value: unknown; labelEn: string; labelTh: string; }

function QuestionBlock({ label, options, selected, onSelect, isEn }: {
  label: string; options: QuestionOption[]; selected: unknown; onSelect: (v: unknown) => void; isEn: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-bold text-[#1A1A1A]">{label}</p>
      <div className={`grid gap-1.5 ${options.length > 3 ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2"}`}>
        {options.map(opt => (
          <button
            key={String(opt.value)}
            onClick={() => onSelect(opt.value)}
            className="px-3 py-2 text-[10px] font-bold border transition-colors text-left"
            style={{
              background: selected === opt.value ? "#8B5CF6" : "#FDFAF4",
              color: selected === opt.value ? "#fff" : "#1A1A1A",
              borderColor: selected === opt.value ? "#8B5CF6" : "#C8BFB0",
            }}
          >
            {isEn ? opt.labelEn : opt.labelTh}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Journey Map ────────────────────────────────────────────────────────────────

interface JourneyMapProps {
  state:      LocalJourneyState;
  tradeCount: number;
  isEn:       boolean;
  onMark:     (stepId: string) => void;
  onTrade:    () => void;
}

function JourneyMap({ state, tradeCount, isEn, onMark, onTrade }: JourneyMapProps) {
  const completed = getCompletionCount(state.completedSteps, tradeCount);
  const total     = JOURNEY_STEPS.length;
  const pct       = Math.round((completed / total) * 100);
  const allDone   = completed >= total;

  return (
    <div className="flex flex-col gap-3">
      {/* Progress header */}
      <div style={{ background: "#FDFAF4", border: "1px solid #C8BFB0", boxShadow: "2px 2px 0 #1A1A1A" }} className="px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#8A8378]">
            {isEn ? "Your Learning Journey" : "เส้นทางการเรียนรู้"}
          </p>
          <span className="text-xs font-bold" style={{ color: allDone ? "#16A34A" : "#8B5CF6" }}>
            {completed}/{total} {isEn ? "complete" : "สำเร็จ"}
          </span>
        </div>
        <div className="w-full h-2 bg-[#E4DDD2] overflow-hidden mb-1">
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${pct}%`, background: allDone ? "#16A34A" : "#8B5CF6" }}
          />
        </div>
        {allDone && (
          <p className="text-[10px] text-[#16A34A] font-bold">
            🎉 {isEn ? "Journey complete! You've built a solid foundation." : "เสร็จสมบูรณ์! คุณสร้างรากฐานที่แข็งแกร่งแล้ว"}
          </p>
        )}
      </div>

      {/* Step cards */}
      {JOURNEY_STEPS.map((step, idx) => {
        const isDone = step.isAutoDetected
          ? tradeCount > 0
          : state.completedSteps.includes(step.id);
        const isNext = !isDone && getNextStep(state.completedSteps, tradeCount)?.id === step.id;
        const isLocked = !isDone && !isNext;

        return (
          <div
            key={step.id}
            className="px-4 py-3 flex gap-3 items-start"
            style={{
              background: isDone ? "#F0FDF4" : isNext ? "#F5F3FF" : "#F8F5EF",
              border: `1px solid ${isDone ? "#86EFAC" : isNext ? "#8B5CF6" : "#E4DDD2"}`,
              opacity: isLocked ? 0.6 : 1,
            }}
          >
            {/* Icon + status */}
            <div className="flex-shrink-0 flex flex-col items-center gap-1 pt-0.5">
              <div
                className="w-8 h-8 flex items-center justify-center text-lg border-2"
                style={{ borderColor: isDone ? "#16A34A" : isNext ? "#8B5CF6" : "#C8BFB0", background: isDone ? "#dcfce7" : isNext ? "#ede9fe" : "#FDFAF4" }}
              >
                {isDone ? "✓" : step.icon}
              </div>
              {idx < JOURNEY_STEPS.length - 1 && (
                <div className="w-px h-4 bg-[#E4DDD2]" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[8px] font-bold text-[#8A8378]">STEP {idx + 1}</span>
                {isDone && <span className="text-[8px] font-bold text-[#16A34A] bg-green-50 px-1.5 py-0.5 border border-green-200">DONE</span>}
                {isNext && <span className="text-[8px] font-bold text-[#8B5CF6] bg-purple-50 px-1.5 py-0.5 border border-purple-200">UP NEXT</span>}
              </div>
              <p className="text-xs font-bold text-[#1A1A1A] mt-0.5">{isEn ? step.titleEn : step.titleTh}</p>
              <p className="text-[10px] text-[#6B6B6B] mt-0.5 leading-relaxed">{isEn ? step.descEn : step.descTh}</p>

              {/* Action button */}
              {!isDone && !isLocked && (
                <div className="flex gap-2 mt-2">
                  {step.href ? (
                    <>
                      <Link
                        href={step.href}
                        className="text-[10px] font-bold px-3 py-1.5 text-white transition-colors"
                        style={{ background: "#8B5CF6" }}
                      >
                        {isEn ? step.actionEn : step.actionTh}
                      </Link>
                      <button
                        onClick={() => onMark(step.id)}
                        className="text-[10px] font-bold px-3 py-1.5 border border-[#C8BFB0] text-[#8A8378] hover:text-[#1A1A1A] hover:border-[#1A1A1A] transition-colors"
                      >
                        {isEn ? "Mark as done ✓" : "ทำแล้ว ✓"}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={onTrade}
                      className="text-[10px] font-bold px-3 py-1.5 text-white transition-colors"
                      style={{ background: "#1A1A1A", boxShadow: "2px 2px 0 #8B5CF6" }}
                    >
                      {isEn ? step.actionEn : step.actionTh}
                    </button>
                  )}
                </div>
              )}

              {isDone && step.href && (
                <Link href={step.href} className="text-[9px] text-[#16A34A] hover:underline mt-1 inline-block">
                  {isEn ? "Revisit →" : "ทบทวน →"}
                </Link>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function JourneyPage() {
  const { lang }   = useI18n();
  const { user }   = useUser();
  const isEn = lang === "en";

  const [journeyState,  setJourneyState]  = useState<LocalJourneyState | null>(null);
  const [showReadiness, setShowReadiness] = useState(false);
  const [showGuided,    setShowGuided]    = useState(false);

  // Load journey state
  useEffect(() => {
    const local = loadLocalJourney();
    setJourneyState(local);
    setShowReadiness(!local.readinessDone && !local.readinessSkipped);

    // Sync from DB if authed
    if (user && !user.isDemo) {
      fetch("/api/journey/progress")
        .then(r => r.ok ? r.json() : null)
        .then(remote => {
          if (!remote) return;
          setJourneyState(prev => {
            if (!prev) return remote as LocalJourneyState;
            const merged = mergeJourneyState(prev, remote as LocalJourneyState);
            saveLocalJourney(merged);
            return merged;
          });
        })
        .catch(() => {});
    }
  }, [user]);

  const syncToDb = useCallback((patch: Partial<LocalJourneyState>) => {
    if (!user || user.isDemo) return;
    fetch("/api/journey/progress", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).catch(() => {});
  }, [user]);

  function handleReadinessDone(skipped: boolean) {
    setShowReadiness(false);
    setJourneyState(prev => {
      const next: LocalJourneyState = {
        ...(prev ?? { completedSteps: [], readinessDone: false, readinessSkipped: false }),
        readinessDone:    !skipped,
        readinessSkipped: skipped,
      };
      saveLocalJourney(next);
      syncToDb({ readinessDone: !skipped, readinessSkipped: skipped });
      return next;
    });
  }

  function handleMarkStep(stepId: string) {
    setJourneyState(prev => {
      const completedSteps = Array.from(new Set([...(prev?.completedSteps ?? []), stepId]));
      const next: LocalJourneyState = {
        ...(prev ?? { completedSteps: [], readinessDone: true, readinessSkipped: false }),
        completedSteps,
      };
      saveLocalJourney(next);
      syncToDb({ completedSteps });
      return next;
    });
  }

  const tradeCount = user?.tradeCount ?? 0;

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-5">

        {/* Header */}
        <div>
          <h1 className="text-sm font-bold uppercase tracking-widest text-[#1A1A1A]">
            {isEn ? "Learning Journey" : "เส้นทางการเรียนรู้"}
          </h1>
          <p className="text-xs text-[#8A8378] mt-0.5">
            {isEn
              ? "A sequential learning path from financial foundations to thematic growth investing."
              : "เส้นทางการเรียนรู้ตั้งแต่พื้นฐานการเงินจนถึงการลงทุนหุ้นเติบโตเชิงธีม"}
          </p>
        </div>

        {/* Readiness check */}
        {showReadiness && journeyState && (
          <ReadinessCheck isEn={isEn} onDone={handleReadinessDone} />
        )}

        {/* Journey map */}
        {journeyState && !showReadiness && (
          <JourneyMap
            state={journeyState}
            tradeCount={tradeCount}
            isEn={isEn}
            onMark={handleMarkStep}
            onTrade={() => setShowGuided(true)}
          />
        )}

        {!journeyState && (
          <div className="flex items-center justify-center py-10">
            <div className="w-6 h-6 border-2 border-[#8B5CF6] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Reset option */}
        {journeyState && !showReadiness && (
          <button
            onClick={() => setShowReadiness(true)}
            className="self-start text-[9px] text-[#8A8378] hover:text-[#1A1A1A] underline"
          >
            {isEn ? "Re-take readiness check" : "ทำแบบประเมินความพร้อมอีกครั้ง"}
          </button>
        )}

        {/* Learning path context */}
        <div style={{ background: "#F8F5EF", border: "1px solid #C8BFB0" }} className="px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#8A8378] mb-2">
            {isEn ? "Full learning path" : "เส้นทางการเรียนรู้ทั้งหมด"}
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              { label: isEn ? "Glossary" : "คำศัพท์", href: "/glossary" },
              { label: "Blueprint", href: "/blueprint" },
              { label: isEn ? "Fundamental Analysis" : "วิเคราะห์พื้นฐาน", href: "/learn/fundamental" },
              { label: isEn ? "Stock Picking" : "คัดหุ้น", href: "/learn/stock-picking" },
              { label: "Playbook", href: "/playbook" },
              { label: "Valuation Lab", href: "/valuation" },
            ].map(({ label, href }) => (
              <Link key={href} href={href}
                className="text-[10px] font-bold px-2.5 py-1 border border-[#C8BFB0] text-[#8A8378] hover:border-[#1A1A1A] hover:text-[#1A1A1A] transition-colors bg-[#FDFAF4]">
                {label} ↗
              </Link>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-[9px] text-[#8A8378]">
          {isEn
            ? "All investing activities on InvestMart are paper trading simulations. No real money is involved. This is an educational platform, not a licensed broker."
            : "กิจกรรมการลงทุนทั้งหมดบน InvestMart เป็นการจำลอง ไม่ใช้เงินจริง นี่คือแพลตฟอร์มเพื่อการศึกษา ไม่ใช่โบรกเกอร์"}
        </p>
      </div>

      {showGuided && (
        <GuidedFirstTrade
          onClose={() => setShowGuided(false)}
          onComplete={() => setShowGuided(false)}
        />
      )}
    </AppShell>
  );
}
