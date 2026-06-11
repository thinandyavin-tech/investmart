"use client";

import { useState, useEffect } from "react";
import { Link }                 from "@/i18n/navigation";
import { useI18n }              from "@/lib/i18n";

const STORAGE_KEY = "investmart_cookies_accepted";

export function CookieConsentBanner() {
  const { t }       = useI18n();
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setShow(true);
    } catch { /* SSR / private */ }
  }, []);

  function accept() {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignore */ }
    setShow(false);
  }

  if (!show) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[200] bg-[#0A0F1A] border-t border-[#1E2A3A] px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center gap-3"
      role="dialog"
      aria-label="Cookie consent"
    >
      <p className="text-xs text-[#8A9EB8] flex-1 leading-relaxed">
        {t.cookie.message}{" "}
        <span className="block text-[10px] text-[#4A5A70] mt-0.5">{t.cookie.essentialNote}</span>
      </p>
      <div className="flex items-center gap-3 flex-shrink-0">
        <Link href="/privacy" className="text-xs text-[#4A5A70] hover:text-[#8A9EB8] transition-colors whitespace-nowrap">
          {t.cookie.learnMore}
        </Link>
        <button
          onClick={accept}
          className="text-xs font-bold px-4 py-2 bg-[#4ADE80] text-[#0A0F1A] hover:bg-[#22C55E] transition-colors whitespace-nowrap"
        >
          {t.cookie.accept}
        </button>
      </div>
    </div>
  );
}
