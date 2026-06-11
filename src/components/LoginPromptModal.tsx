"use client";

import { useRef } from "react";
import Link from "next/link";
import { useUser } from "@/lib/userContext";
import { useI18n } from "@/lib/i18n";
import { useFocusTrap } from "@/lib/useFocusTrap";

interface LoginPromptModalProps {
  message:   string;
  onClose:   () => void;
  withDemo?: boolean;
}

export function LoginPromptModal({ message, onClose, withDemo = true }: LoginPromptModalProps) {
  const { initDemo } = useUser();
  const { t } = useI18n();
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, true, onClose);

  async function handleDemo() {
    onClose();
    await initDemo();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t.loginModal.aria}
    >
      <div
        ref={dialogRef}
        className="mx-4 w-full max-w-sm border-2 border-[#1F1A14] bg-[#FBF7ED]"
        style={{ boxShadow: "4px 4px 0 #1F1A14" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-3 py-1.5"
          style={{ background: "#000080" }}
        >
          <span className="text-white text-xs font-bold tracking-widest">
            InvestMart
          </span>
          <button
            onClick={onClose}
            className="text-white text-xs border border-[#8080FF] bg-[#0000C0] px-2 py-0.5 hover:bg-[#000080]"
            aria-label={t.loginModal.closeAria}
          >
            ×
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <p className="text-xs text-[#1F1A14] leading-relaxed">{message}</p>

          <div className="flex flex-col gap-2">
            <Link href="/signin" onClick={onClose} className="block">
              <span
                className="block w-full border-2 border-[#1F1A14] bg-[#1F1A14] text-white text-xs font-bold px-4 py-2.5 text-center hover:bg-[#2F2A24] transition-colors"
                style={{ boxShadow: "2px 2px 0 #5B8A2A" }}
              >
                {t.loginModal.signIn}
              </span>
            </Link>
            <Link href="/signup" onClick={onClose} className="block">
              <span
                className="block w-full border-2 border-[#5B8A2A] text-[#5B8A2A] text-xs font-bold px-4 py-2.5 text-center hover:bg-[#9BE15D] transition-colors"
                style={{ boxShadow: "2px 2px 0 #5B8A2A" }}
              >
                {t.loginModal.signUp}
              </span>
            </Link>
          </div>

          {withDemo && (
            <p className="text-xs text-[#8A8378] text-center">
              {t.loginModal.notReady}{" "}
              <button
                onClick={() => void handleDemo()}
                className="underline text-[#5B8A2A] font-bold"
              >
                {t.loginModal.tryDemo}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
