"use client";

import { useState, useRef, useEffect } from "react";
import { Link } from "@/i18n/navigation";
import { useI18n } from "@/lib/i18n";
import { getTermById } from "@/lib/learnTerms";

interface InfoTooltipProps {
  termId: string;
  size?: number;
}

export function InfoTooltip({ termId, size = 14 }: InfoTooltipProps) {
  const { lang } = useI18n();
  const term = getTermById(termId);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function close(e: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("touchstart", close);
    };
  }, [open]);

  if (!term) return null;

  const tip = lang === "en" ? term.tipEn : term.tipTh;

  return (
    <span ref={ref} className="relative inline-flex align-middle">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center justify-center rounded-full text-[#8A8378] hover:text-[#5B8A2A] hover:bg-[#e9edc9] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B8A2A]"
        style={{ width: size, height: size, fontSize: size * 0.7 }}
        aria-label={lang === "en" ? `What is ${term.en}?` : `${term.th} คืออะไร?`}
        aria-expanded={open}
      >
        ⓘ
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 px-3 py-2.5 text-xs leading-relaxed bg-[#1F1A14] text-white rounded-lg shadow-lg"
        >
          <span className="font-bold block mb-0.5">
            {lang === "en" ? term.en : term.th}
          </span>
          {tip}
          <Link
            href={`/glossary#${term.id}`}
            className="block mt-1.5 text-[10px] font-semibold text-[#a3d977] hover:underline"
            onClick={() => setOpen(false)}
          >
            {lang === "en" ? "Learn more →" : "เรียนรู้เพิ่ม →"}
          </Link>
          <span className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-[#1F1A14]" />
        </span>
      )}
    </span>
  );
}
