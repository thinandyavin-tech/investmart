"use client";

import { useI18n }                from "@/lib/i18n";
import { useRouter, usePathname } from "@/i18n/navigation";
import type { AppLocale }         from "@/i18n/routing";

interface LanguageToggleProps {
  size?: "sm" | "md";
}

export function LanguageToggle({ size = "sm" }: LanguageToggleProps) {
  const { lang } = useI18n();
  const router   = useRouter();
  const pathname = usePathname();

  const base = size === "sm"
    ? "text-[10px] px-1.5 py-0.5 min-h-[24px]"
    : "text-xs px-2 py-1 min-h-[28px]";

  function toggle() {
    const nextLocale: AppLocale = lang === "en" ? "th" : "en";
    router.replace(pathname, { locale: nextLocale });
  }

  return (
    <button
      onClick={toggle}
      className={`
        inline-flex items-center gap-0.5 font-bold tracking-widest uppercase
        border border-[#D0C8B8] bg-[#F8F5EF] text-[#5A4E42]
        hover:border-[#1F1A14] hover:text-[#1F1A14]
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F1A14] focus-visible:ring-offset-1
        transition-colors select-none
        ${base}
      `}
      aria-label={lang === "en" ? "Switch to Thai" : "เปลี่ยนเป็นภาษาอังกฤษ"}
      title={lang === "en" ? "Switch to Thai / เปลี่ยนภาษา" : "Switch to English / เปลี่ยนภาษา"}
    >
      {lang === "en" ? (
        <>
          <span aria-hidden="true">TH</span>
          <span className="opacity-40">|</span>
          <span className="opacity-40">EN</span>
        </>
      ) : (
        <>
          <span className="opacity-40">TH</span>
          <span className="opacity-40">|</span>
          <span aria-hidden="true">EN</span>
        </>
      )}
    </button>
  );
}
