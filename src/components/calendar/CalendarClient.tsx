"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Link } from "@/i18n/navigation";
import { useI18n } from "@/lib/i18n";

const TradingViewEconomicCalendar = dynamic(
  () => import("@/components/tradingview/TradingViewEconomicCalendar")
       .then(m => m.TradingViewEconomicCalendar),
  { ssr: false, loading: () => <div className="h-[600px] bg-white/40 animate-pulse rounded-2xl" /> },
);

export function CalendarClient() {
  const { t, lang } = useI18n();
  const [highImpactOnly, setHighImpactOnly] = useState(false);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-sm font-bold uppercase tracking-widest text-slate-800 mb-1">
            {t.calendar.title}
          </h1>
          <p className="text-xs text-slate-500">
            {t.calendar.subtitle}
          </p>
        </div>
        <Link
          href="/market"
          className="text-xs font-semibold text-violet-600 hover:text-violet-800 transition-colors"
        >
          ← {t.nav.market}
        </Link>
      </div>

      <div className="rounded-xl bg-blue-50/60 border border-blue-200 px-4 py-2.5 text-xs text-blue-700">
        {t.calendar.sourceNote}
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-600 font-medium">{t.calendar.show}:</span>
        <button
          onClick={() => setHighImpactOnly(false)}
          className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
            !highImpactOnly
              ? "bg-violet-600 text-white border-violet-600"
              : "border-slate-200 text-slate-600 hover:border-violet-300"
          }`}
        >
          {t.calendar.allEvents}
        </button>
        <button
          onClick={() => setHighImpactOnly(true)}
          className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
            highImpactOnly
              ? "bg-red-600 text-white border-red-600"
              : "border-slate-200 text-slate-600 hover:border-slate-400"
          }`}
        >
          {t.calendar.highImpact}
        </button>
      </div>

      <div className="rounded-2xl bg-white/60 backdrop-blur-md border border-white/40 shadow-sm overflow-hidden">
        <TradingViewEconomicCalendar
          height={650}
          locale={lang}
          highImpactOnly={highImpactOnly}
        />
      </div>

      <p className="text-xs text-slate-400 text-center">
        {t.calendar.disclaimer}
      </p>
    </div>
  );
}
