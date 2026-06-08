"use client";

import { useState, useEffect, useMemo } from "react";
import { PERSONAS, DESIGN_THEMES, FEATURES, type DesignTheme, type Feature } from "@/lib/personasData";
import { PersonaCard } from "@/components/personas/PersonaCard";

const STORAGE_KEY = "investmart_persona_vote_v1";

interface UserVote {
  design:  DesignTheme;
  feature: Feature;
}

function VoteBar({
  label, sublabel, count, total, color, icon, isUser,
}: {
  label: string; sublabel: string; count: number; total: number;
  color: string; icon?: string; isUser?: boolean;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2 py-1">
      <div className="w-32 flex-shrink-0">
        <div className="flex items-center gap-1">
          {icon && <span className="text-[10px]">{icon}</span>}
          <span className="text-[10px] font-semibold text-slate-900 leading-tight">{label}</span>
          {isUser && (
            <span className="text-[8px] font-bold px-1 py-px rounded bg-green-100 text-green-700 ml-1">คุณ</span>
          )}
        </div>
        <div className="text-[8px] text-slate-400">{sublabel}</div>
      </div>
      <div className="flex-1 bg-slate-100 rounded-full h-2 relative overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
          style={{ width: `${pct.toFixed(1)}%`, background: color }}
        />
      </div>
      <div className="w-14 text-right flex-shrink-0">
        <span className="text-[11px] font-bold" style={{ color }}>{count}</span>
        <span className="text-[9px] text-slate-400">/{total}</span>
      </div>
    </div>
  );
}

function WinnerBadge({ theme }: { theme: DesignTheme }) {
  const t = DESIGN_THEMES[theme];
  const isCurrent = theme === "clean";
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-xl border"
      style={{ background: t.bg, borderColor: t.color + "33" }}
    >
      <span className="text-lg">🏆</span>
      <div>
        <div className="text-[11px] font-bold" style={{ color: t.color }}>{t.label}</div>
        <div className="text-[9px] text-slate-500">
          {isCurrent ? "Design ที่ใช้อยู่ตอนนี้ ✓" : t.desc}
        </div>
      </div>
    </div>
  );
}

export function PersonasPage() {
  const [userVote, setUserVote] = useState<UserVote | null>(null);
  const [draftDesign, setDraftDesign]   = useState<DesignTheme>("clean");
  const [draftFeature, setDraftFeature] = useState<Feature>("charts");
  const [submitted, setSubmitted] = useState(false);
  const [hydrated, setHydrated]   = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as UserVote;
        setUserVote(parsed);
        setDraftDesign(parsed.design);
        setDraftFeature(parsed.feature);
        setSubmitted(true);
      } catch { /* ignore */ }
    }
    setHydrated(true);
  }, []);

  const designTally = useMemo(() => {
    const counts: Record<DesignTheme, number> = { clean: 0, dense: 0, dark: 0, visual: 0 };
    PERSONAS.forEach(p => { counts[p.designVote]++; });
    if (userVote) counts[userVote.design]++;
    return counts;
  }, [userVote]);

  const featureTally = useMemo(() => {
    const counts: Record<Feature, number> = { charts: 0, alerts: 0, social: 0, "ai-portfolio": 0, screener: 0 };
    PERSONAS.forEach(p => { counts[p.featureVote]++; });
    if (userVote) counts[userVote.feature]++;
    return counts;
  }, [userVote]);

  const totalDesign  = PERSONAS.length + (userVote ? 1 : 0);
  const totalFeature = PERSONAS.length + (userVote ? 1 : 0);

  const winningDesign  = (Object.entries(designTally) as [DesignTheme, number][])
    .reduce((a, b) => b[1] > a[1] ? b : a)[0];
  const winningFeature = (Object.entries(featureTally) as [Feature, number][])
    .reduce((a, b) => b[1] > a[1] ? b : a)[0];

  function handleVote() {
    const vote: UserVote = { design: draftDesign, feature: draftFeature };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(vote));
    setUserVote(vote);
    setSubmitted(true);
  }

  function handleChangeVote() {
    setSubmitted(false);
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 py-4 max-w-5xl mx-auto w-full">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900">ชุมชน InvestMart</h1>
            <p className="text-[11px] text-slate-500 mt-0.5">
              20 Personas โหวต Design และ Feature ที่อยากเห็น — เสียงคุณมีผล
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-[9px] text-slate-400 uppercase tracking-widest">ผู้เข้าร่วม</div>
            <div className="text-xl font-bold text-slate-900">{totalDesign}</div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto w-full px-4 py-4 flex flex-col gap-6">

        {/* Vote results */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Design tally */}
          <div className="bg-white rounded-xl border border-slate-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-900">Design Preference</h2>
              <WinnerBadge theme={winningDesign} />
            </div>
            <div className="flex flex-col gap-0.5">
              {(Object.entries(DESIGN_THEMES) as [DesignTheme, typeof DESIGN_THEMES[DesignTheme]][]).map(([key, t]) => (
                <VoteBar
                  key={key}
                  label={t.label}
                  sublabel={t.desc}
                  count={designTally[key]}
                  total={totalDesign}
                  color={t.color}
                  isUser={hydrated && userVote?.design === key}
                />
              ))}
            </div>
          </div>

          {/* Feature tally */}
          <div className="bg-white rounded-xl border border-slate-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-900">Feature Priority</h2>
              <div className="text-right">
                <div className="text-[9px] text-slate-400">อยากเห็นมากสุด</div>
                <div className="text-[10px] font-bold text-slate-900">
                  {FEATURES[winningFeature].icon} {FEATURES[winningFeature].label}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-0.5">
              {(Object.entries(FEATURES) as [Feature, typeof FEATURES[Feature]][]).map(([key, f]) => (
                <VoteBar
                  key={key}
                  label={f.label}
                  sublabel={f.desc}
                  count={featureTally[key]}
                  total={totalFeature}
                  color="#16A34A"
                  icon={f.icon}
                  isUser={hydrated && userVote?.feature === key}
                />
              ))}
            </div>
          </div>
        </div>

        {/* User vote form */}
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-900 mb-3">โหวตของคุณ</h2>
          {submitted && hydrated ? (
            <div className="flex items-center justify-between gap-4">
              <div className="flex gap-2 flex-wrap">
                <span className="text-[10px] text-slate-600">คุณโหวต:</span>
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-white text-[9px] font-bold"
                  style={{ background: DESIGN_THEMES[userVote!.design].color }}
                >
                  🎨 {DESIGN_THEMES[userVote!.design].label}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-green-100 text-green-700 text-[9px] font-bold">
                  {FEATURES[userVote!.feature].icon} {FEATURES[userVote!.feature].label}
                </span>
              </div>
              <button
                onClick={handleChangeVote}
                className="text-[9px] text-slate-400 hover:text-slate-700 underline flex-shrink-0"
              >
                เปลี่ยนโหวต
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-[10px] font-semibold text-slate-700 mb-2">Design ที่คุณชอบ</p>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.entries(DESIGN_THEMES) as [DesignTheme, typeof DESIGN_THEMES[DesignTheme]][]).map(([key, t]) => (
                    <button
                      key={key}
                      onClick={() => setDraftDesign(key)}
                      className={`text-left p-2.5 rounded-lg border transition-all ${
                        draftDesign === key
                          ? "border-2"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                      style={draftDesign === key ? { borderColor: t.color, background: t.bg } : {}}
                    >
                      <div className="text-[10px] font-bold" style={draftDesign === key ? { color: t.color } : { color: "#0F172A" }}>
                        {t.label}
                      </div>
                      <div className="text-[8px] text-slate-500 mt-0.5">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-semibold text-slate-700 mb-2">Feature ที่อยากเห็นมากสุด</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(Object.entries(FEATURES) as [Feature, typeof FEATURES[Feature]][]).map(([key, f]) => (
                    <button
                      key={key}
                      onClick={() => setDraftFeature(key)}
                      className={`text-left p-2.5 rounded-lg border transition-all ${
                        draftFeature === key
                          ? "border-2 border-green-500 bg-green-50"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="text-[11px]">{f.icon}</div>
                      <div className={`text-[10px] font-bold mt-0.5 ${draftFeature === key ? "text-green-700" : "text-slate-900"}`}>
                        {f.label}
                      </div>
                      <div className="text-[8px] text-slate-500 mt-0.5 leading-tight">{f.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleVote}
                className="self-start px-5 py-2 bg-[#16A34A] hover:bg-[#15803D] text-white text-[11px] font-bold rounded-lg transition-colors"
              >
                ส่งโหวต
              </button>
            </div>
          )}
        </div>

        {/* Personas grid */}
        <div>
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">
            20 Personas
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {PERSONAS.map((persona) => (
              <PersonaCard
                key={persona.id}
                persona={persona}
                isHighlighted={hydrated && (
                  userVote?.design === persona.designVote &&
                  userVote?.feature === persona.featureVote
                )}
              />
            ))}
          </div>
          {hydrated && userVote && (
            <p className="text-[9px] text-slate-400 text-center mt-3">
              ✨ บุคลิกที่ตรงกับโหวตของคุณทั้งคู่จะถูก highlight
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
