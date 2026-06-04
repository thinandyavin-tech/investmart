"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

interface GlobalErrorProps {
  error:  Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="th">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          background: "#FBF7ED",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          padding: "1.5rem",
        }}
      >
        <div
          style={{
            maxWidth: 360,
            width: "100%",
            background: "#F3EDE0",
            border: "1px solid #1F1A14",
            boxShadow: "4px 4px 0 #1F1A14",
            padding: "2rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1.25rem",
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            InvestMart — เกิดข้อผิดพลาดร้ายแรง
          </p>
          <p style={{ fontSize: 10, color: "#8A8378", lineHeight: 1.6 }}>
            แอปพลิเคชันหยุดทำงานชั่วคราว — กดปุ่ม &quot;ลองใหม่&quot; หรือรีเฟรชหน้าเว็บ
          </p>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              onClick={reset}
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "#fff",
                background: "#1F1A14",
                border: "1px solid #1F1A14",
                padding: "0.375rem 1rem",
                cursor: "pointer",
              }}
            >
              ลองใหม่
            </button>
            <a
              href="/"
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "#1F1A14",
                border: "1px solid #1F1A14",
                padding: "0.375rem 1rem",
                textDecoration: "none",
              }}
            >
              ← หน้าหลัก
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
