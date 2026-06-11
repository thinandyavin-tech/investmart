"use client";

import { useState } from "react";
import { Link }     from "@/i18n/navigation";
import { useUser }  from "@/lib/userContext";
import { useI18n }  from "@/lib/i18n";

export function GuestUpgradeBanner() {
  const { user }    = useUser();
  const { t }       = useI18n();
  const [dismissed, setDismissed] = useState(false);

  if (!user?.isDemo || dismissed) return null;

  return (
    <div className="w-full bg-[#0A0F1A] border-b border-[#1E2A3A] px-4 py-2.5 flex items-center justify-between gap-3 text-xs">
      <p className="text-[#8A9EB8] flex-1">{t.welcome.upgradePrompt}</p>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Link
          href="/signup"
          className="font-bold text-[#4ADE80] hover:underline whitespace-nowrap"
        >
          {t.welcome.upgradeBtn}
        </Link>
        <button
          onClick={() => setDismissed(true)}
          className="text-[#4A5A70] hover:text-white transition-colors"
          aria-label={t.common.close}
        >
          ×
        </button>
      </div>
    </div>
  );
}
