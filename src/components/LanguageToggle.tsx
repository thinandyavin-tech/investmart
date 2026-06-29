"use client";

import { useI18n } from "@/lib/i18n";

interface LanguageToggleProps {
  size?: "sm" | "md";
}

export function LanguageToggle({ size = "sm" }: LanguageToggleProps) {
  const { lang, toggle } = useI18n();

  const isEn = lang === "en";

  if (size === "sm") {
    return (
      <button
        onClick={toggle}
        className="inline-flex items-center gap-1 h-7 px-2 rounded-full border border-[#D0C8B8] bg-[#e9edc9] hover:border-[#1F1A14] hover:bg-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F1A14] focus-visible:ring-offset-1 select-none"
        aria-label={isEn ? "Switch to Thai" : "Switch to English"}
        title={isEn ? "เปลี่ยนเป็นภาษาไทย" : "Switch to English"}
      >
        <GlobeIcon className="w-3 h-3 text-[#8A8378] flex-shrink-0" />
        <span className="text-[10px] font-bold tracking-wide text-[#1F1A14] leading-none">
          {isEn ? "EN" : "TH"}
        </span>
        <ChevronIcon className="w-2.5 h-2.5 text-[#8A8378] flex-shrink-0" />
      </button>
    );
  }

  // md — segmented pill
  return (
    <div
      className="inline-flex items-center rounded-full border border-[#D0C8B8] bg-[#e9edc9] p-0.5 gap-0.5"
      role="group"
      aria-label="Language"
    >
      {(["en", "th"] as ("en" | "th")[]).map((locale) => {
        const active = lang === locale;
        return (
          <button
            key={locale}
            onClick={active ? undefined : toggle}
            disabled={active}
            className={`
              px-2.5 py-1 rounded-full text-xs font-bold tracking-wide transition-colors select-none
              ${active
                ? "bg-[#1F1A14] text-white cursor-default"
                : "text-[#8A8378] hover:text-[#1F1A14] hover:bg-white"}
            `}
            aria-pressed={active}
            aria-label={locale === "en" ? "English" : "ภาษาไทย"}
          >
            {locale === "en" ? "EN" : "TH"}
          </button>
        );
      })}
    </div>
  );
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" />
      <path d="M8 1.5C8 1.5 5.5 4 5.5 8s2.5 6.5 2.5 6.5M8 1.5C8 1.5 10.5 4 10.5 8S8 14.5 8 14.5" />
      <path d="M1.5 8h13" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M2.5 4L5 6.5 7.5 4" />
    </svg>
  );
}
