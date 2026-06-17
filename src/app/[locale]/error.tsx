"use client";

import { useEffect } from "react";
import { Link } from "@/i18n/navigation";
import * as Sentry from "@sentry/nextjs";
import { Logo } from "@/components/Logo";

interface ErrorProps {
  error:  Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div
        className="w-full max-w-sm bg-[#faedcd] border border-[#1F1A14] p-8 flex flex-col items-center gap-5"
        style={{ boxShadow: "4px 4px 0 #d4a373" }}
      >
        <Logo size={32} className="text-[#1F1A14]" />

        <div className="text-center">
          <h1 className="text-xs font-bold uppercase tracking-widest text-[#1F1A14] mb-1">
            เกิดข้อผิดพลาด
          </h1>
          <p className="text-xs text-[#8A8378] leading-relaxed">
            บางอย่างไม่ทำงานตามปกติ — ลองใหม่อีกครั้งหรือกลับหน้าหลัก
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={reset}
            className="text-xs font-bold text-white bg-[#1F1A14] border border-[#1F1A14] px-4 py-1.5 hover:opacity-80 transition-opacity"
          >
            ลองใหม่
          </button>
          <Link
            href="/"
            className="text-xs font-bold text-[#1F1A14] border border-[#1F1A14] px-4 py-1.5 hover:bg-[#1F1A14] hover:text-white transition-colors"
          >
            ← หน้าหลัก
          </Link>
        </div>
      </div>
    </div>
  );
}
