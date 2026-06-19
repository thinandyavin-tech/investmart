"use client";

import { useState, useId } from "react";
import { Card } from "@/components/Card";
import { useI18n } from "@/lib/i18n";
import { LEARN_TERMS, CATEGORIES } from "@/lib/learnTerms";

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9ก-๙ ]/g, "");
}

export function GlossaryClient() {
  const { lang } = useI18n();
  const [q, setQ] = useState("");
  const searchId  = useId();

  const filtered = q.trim()
    ? LEARN_TERMS.filter((t) => {
        const n = normalize(q);
        return (
          normalize(t.th).includes(n) ||
          normalize(t.en).includes(n) ||
          normalize(lang === "en" ? t.bodyEn : t.bodyTh).includes(n)
        );
      })
    : [...LEARN_TERMS];

  const categoryOrder = Object.keys(CATEGORIES);
  const categories = Array.from(new Set(filtered.map((t) => t.category)))
    .sort((a, b) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b));

  const catLabel = (key: string): string => {
    const c = CATEGORIES[key as keyof typeof CATEGORIES];
    return c ? (lang === "en" ? c.en : c.th) : key;
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <label htmlFor={searchId} className="sr-only">
          {lang === "en" ? "Search terms" : "ค้นหาคำศัพท์"}
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A8378] text-xs select-none" aria-hidden="true">🔍</span>
          <input
            id={searchId}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={lang === "en" ? "Search terms… e.g. RSI, momentum, breakeven" : "ค้นหาคำศัพท์ เช่น RSI, โมเมนตัม, breakeven..."}
            className="w-full pl-8 pr-3 py-2 text-xs border-2 border-[#1F1A14] bg-[#fefae0] focus:outline-none focus:ring-2 focus:ring-[#5B8A2A] rounded"
          />
        </div>
        {q.trim() && (
          <p className="mt-1 text-xs text-[#8A8378]">
            {lang === "en" ? `${filtered.length} results` : `พบ ${filtered.length} รายการ`}
          </p>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="text-xs text-[#8A8378] text-center py-6">
          {lang === "en" ? "No matching terms found" : "ไม่พบคำที่ค้นหา"}
        </p>
      ) : (
        categories.map((cat) => (
          <section key={cat}>
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#8A8378] mb-2 border-b border-[#e9edc9] pb-1">
              {catLabel(cat)}
            </h2>
            <div className="flex flex-col gap-2">
              {filtered.filter((t) => t.category === cat).map((term) => (
                <Card
                  key={term.id}
                  id={term.id}
                  className="p-3 scroll-mt-4"
                >
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 mb-1">
                    <span className="font-bold text-xs text-[#1F1A14]">
                      {lang === "en" ? term.en : term.th}
                    </span>
                    <span className="text-xs text-[#8A8378]">
                      {lang === "en" ? term.th : term.en}
                    </span>
                  </div>
                  <p className="text-xs text-[#8A8378] leading-relaxed">
                    {lang === "en" ? term.bodyEn : term.bodyTh}
                  </p>
                  {term.example && (
                    <p className="mt-1.5 text-xs text-[#5B8A2A] leading-relaxed border-l-2 border-[#5B8A2A] pl-2">
                      {term.example}
                    </p>
                  )}
                </Card>
              ))}
            </div>
          </section>
        ))
      )}

      <p className="text-xs text-[#8A8378] text-center pt-2 border-t border-[#e9edc9]">
        {lang === "en"
          ? "For educational purposes only · Not investment advice"
          : "คำศัพท์เพื่อการศึกษา · ไม่ใช่คำแนะนำการลงทุน"}
      </p>
    </div>
  );
}
