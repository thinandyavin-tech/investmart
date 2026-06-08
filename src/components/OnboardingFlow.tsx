"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { OffsetButton } from "@/components/OffsetButton";
import { useUser } from "@/lib/userContext";

export const ONBOARDING_DONE_KEY = "investmart_onboarded_v1";
const LEGACY_KEY  = "investmart_onboarding_v1";
const USERNAME_RE = /^[a-zA-Z0-9_]{3,30}$/;

const STARTER_TICKERS = [
  { ticker: "NVDA",  name: "NVIDIA"    },
  { ticker: "AAPL",  name: "Apple"     },
  { ticker: "TSLA",  name: "Tesla"     },
  { ticker: "MSFT",  name: "Microsoft" },
  { ticker: "META",  name: "Meta"      },
  { ticker: "AMZN",  name: "Amazon"    },
  { ticker: "GOOGL", name: "Alphabet"  },
  { ticker: "AMD",   name: "AMD"       },
  { ticker: "NFLX",  name: "Netflix"   },
  { ticker: "JPM",   name: "JPMorgan"  },
  { ticker: "V",     name: "Visa"      },
  { ticker: "DIS",   name: "Disney"    },
] as const;

type StepId = "welcome" | "username" | "watchlist" | "action";

function buildSteps(user: { isDemo: boolean; username: string | null } | null): StepId[] {
  const s: StepId[] = ["welcome"];
  if (user && !user.isDemo && !user.username) s.push("username");
  s.push("watchlist", "action");
  return s;
}

// ─── Step content components ───────────────────────────────────────────────

function WelcomeStep() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-bold text-[#1F1A14]">ยินดีต้อนรับสู่ InvestMart</h2>
        <p className="text-xs text-[#8A8378] leading-relaxed">
          แพลตฟอร์มเรียนรู้การลงทุนหุ้นสหรัฐสำหรับนักลงทุนไทย มีสามอย่างหลักที่ควรรู้ก่อน
        </p>
      </div>

      <div className="border border-dashed border-[#5B8A2A] bg-[#F8FDF2] rounded p-3 flex flex-col gap-1">
        <p className="text-xs font-bold text-[#5B8A2A] uppercase tracking-widest">พอร์ตเริ่มต้น</p>
        <p className="text-xl font-bold" style={{ fontFamily: "var(--font-mono)" }}>฿1,250,000</p>
        <p className="text-xs text-[#8A8378]">เงินจำลองทั้งหมด — ไม่มีเงินจริงเข้ามาเกี่ยวข้องเลย</p>
      </div>

      <ul className="flex flex-col gap-2 text-xs">
        {([
          ["📡", "เรดาร์ AI", "สแกนหุ้นใน S&P 500 / Nasdaq ที่มี momentum ผิดปกติ คัดมาให้ดูง่าย"],
          ["💹", "ซื้อขายจำลอง", "ราคาหุ้นเป็นข้อมูลจริงจาก API แต่เงินที่ใช้เป็นเงินสมมติทั้งสิ้น"],
          ["👥", "ชุมชนนักเรียนรู้", "โพสต์ไอเดีย ติดตามเทรดเดอร์คนอื่น และดู leaderboard"],
        ] as const).map(([icon, title, desc]) => (
          <li key={title} className="flex gap-2 items-start">
            <span className="flex-shrink-0 text-sm">{icon}</span>
            <span><span className="font-bold">{title}</span> — {desc}</span>
          </li>
        ))}
      </ul>

      <p className="text-xs text-[#8A8378] border-t border-[#E8E2D4] pt-2">
        ผลการเทรดจำลองไม่ได้รับประกันว่าจะสะท้อนผลการลงทุนจริง
        InvestMart ไม่ใช่บริษัทหลักทรัพย์และไม่ได้รับใบอนุญาต
      </p>
    </div>
  );
}

interface UsernameStepProps {
  value:    string;
  onChange: (v: string) => void;
  error:    string;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

function UsernameStep({ value, onChange, error, inputRef }: UsernameStepProps) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-bold text-[#1F1A14] mb-1">เลือก Username</h2>
        <p className="text-xs text-[#8A8378] leading-relaxed">
          ชื่อที่คนอื่นจะเห็นในชุมชน เปลี่ยนได้ในภายหลัง (มีระยะรอระหว่างการเปลี่ยน)
          ข้ามหากยังไม่แน่ใจ
        </p>
      </div>

      <div>
        <label htmlFor="ob-username" className="block text-xs text-[#8A8378] uppercase tracking-wide mb-1">
          Username (ข้ามได้)
        </label>
        <div className="flex items-center border-2 border-[#1F1A14] bg-[#FBF7ED] overflow-hidden">
          <span className="px-2 py-2 text-xs text-[#8A8378] border-r-2 border-[#1F1A14] select-none">@</span>
          <input
            ref={inputRef}
            id="ob-username"
            type="text"
            value={value}
            maxLength={30}
            onChange={(e) => onChange(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
            className="flex-1 px-2 py-2 text-xs font-bold bg-transparent focus:outline-none"
            placeholder="username"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            aria-describedby={error ? "ob-un-error" : undefined}
            aria-invalid={!!error}
          />
        </div>
        {error && (
          <p id="ob-un-error" role="alert" className="mt-1 text-xs text-[#DC2626]">{error}</p>
        )}
      </div>

      <p className="text-xs text-[#8A8378]">
        3–30 ตัวอักษร · ใช้ a-z, 0-9, _ เท่านั้น · ไม่มีช่องว่าง
      </p>
    </div>
  );
}

interface WatchlistStepProps {
  selected:  Set<string>;
  onToggle:  (ticker: string) => void;
  canSave:   boolean;
}

function WatchlistStep({ selected, onToggle, canSave }: WatchlistStepProps) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-bold text-[#1F1A14] mb-1">เพิ่มหุ้นที่สนใจ</h2>
        <p className="text-xs text-[#8A8378]">
          เลือกหุ้นที่อยากติดตาม แอปจะไม่ว่างเปล่าตั้งแต่วันแรก ข้ามได้ถ้าจะเลือกเองทีหลัง
        </p>
      </div>

      <div
        className="grid grid-cols-3 gap-1.5"
        role="group"
        aria-label="เลือกหุ้นสำหรับ Watchlist"
      >
        {STARTER_TICKERS.map(({ ticker, name }) => {
          const active = selected.has(ticker);
          return (
            <button
              key={ticker}
              type="button"
              onClick={() => onToggle(ticker)}
              aria-pressed={active}
              className={`flex flex-col items-center justify-center py-2 px-1 border-2 rounded transition-colors text-xs ${
                active
                  ? "border-[#5B8A2A] bg-[#F0FAE8] text-[#5B8A2A] font-bold"
                  : "border-[#D4CFC8] bg-white text-[#8A8378] hover:border-[#1F1A14] hover:text-[#1F1A14]"
              }`}
            >
              <span className="font-mono font-bold text-xs">{ticker}</span>
              <span className="text-xs mt-0.5 truncate max-w-full">{name}</span>
            </button>
          );
        })}
      </div>

      {!canSave && selected.size > 0 && (
        <p className="text-xs text-[#8A8378]">
          เข้าสู่ระบบเพื่อบันทึก Watchlist ของคุณ
        </p>
      )}
    </div>
  );
}

function ActionStep() {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-bold text-[#1F1A14] mb-1">พร้อมแล้ว — เริ่มได้เลย</h2>
        <p className="text-xs text-[#8A8378] leading-relaxed">
          ผลตอบแทนจำลองไม่ใช่คำแนะนำการลงทุน · ทุกอย่างในนี้เป็นเพื่อการเรียนรู้เท่านั้น
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Link href="/radar" className="block">
          <OffsetButton variant="lime" className="w-full text-center text-xs">
            📡 เปิดเรดาร์สแกนหุ้น
          </OffsetButton>
        </Link>
        <Link href="/market" className="block">
          <OffsetButton variant="black" className="w-full text-center text-xs">
            📈 ดูภาพรวมตลาดวันนี้
          </OffsetButton>
        </Link>
        <Link href="/learn" className="block">
          <OffsetButton variant="white" className="w-full text-center text-xs">
            📚 เรียนรู้คำศัพท์ก่อน
          </OffsetButton>
        </Link>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────

export function OnboardingFlow() {
  const { user, loading, refreshUser } = useUser();
  const pathname = usePathname();
  const [visible,         setVisible]  = useState(false);
  const [stepIdx,         setStepIdx]  = useState(0);
  const [dir,             setDir]      = useState<"fwd" | "back">("fwd");
  const [username,        setUsername] = useState("");
  const [usernameError,   setUnError]  = useState("");
  const [busy,            setBusy]     = useState(false);
  const [selected,        setSelected] = useState<Set<string>>(new Set());
  const inputRef  = useRef<HTMLInputElement>(null);
  const firstBtn  = useRef<HTMLButtonElement>(null);

  const steps = buildSteps(user);
  const step  = steps[stepIdx] ?? "action";
  const isLast = stepIdx === steps.length - 1;

  useEffect(() => {
    if (loading) return;
    if (pathname !== "/") return;           // only show on home page
    if (localStorage.getItem(ONBOARDING_DONE_KEY)) return;
    localStorage.removeItem(LEGACY_KEY);
    setVisible(true);
  }, [loading, pathname]);

  const dismiss = useCallback(() => {
    localStorage.setItem(ONBOARDING_DONE_KEY, "1");
    setVisible(false);
  }, []);

  useEffect(() => {
    if (!visible) return;
    setTimeout(() => {
      (inputRef.current ?? firstBtn.current)?.focus();
    }, 220);
  }, [stepIdx, visible]);

  useEffect(() => {
    if (!visible) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") dismiss();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [visible, dismiss]);

  function toggleTicker(ticker: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(ticker) ? next.delete(ticker) : next.add(ticker);
      return next;
    });
  }

  async function advance() {
    if (step === "username" && username.trim()) {
      if (!USERNAME_RE.test(username.trim())) {
        setUnError("3-30 ตัวอักษร a-z 0-9 _ เท่านั้น");
        return;
      }
      setBusy(true);
      try {
        const res = await fetch("/api/user/username", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: username.trim() }),
        });
        if (!res.ok) {
          const d = (await res.json()) as { error?: string };
          setUnError(d.error ?? "เกิดข้อผิดพลาด");
          return;
        }
        await refreshUser();
      } catch {
        setUnError("เกิดข้อผิดพลาด กรุณาลองใหม่");
        return;
      } finally {
        setBusy(false);
      }
    }

    if (step === "watchlist" && selected.size > 0 && user && !user.isDemo) {
      void Promise.all(
        Array.from(selected).map((t) =>
          fetch("/api/watchlist", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ ticker: t }),
          }),
        ),
      );
    }

    if (isLast) { dismiss(); return; }
    setDir("fwd");
    setStepIdx((i) => i + 1);
    setUnError("");
  }

  function back() {
    if (stepIdx === 0) return;
    setDir("back");
    setStepIdx((i) => i - 1);
    setUnError("");
  }

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end lg:items-center justify-center bg-black/40 px-4"
      role="presentation"
      onClick={dismiss}
    >
      <div
        className="w-full max-w-sm mb-4 lg:mb-0 border-2 border-[#1F1A14] bg-[#F3EDE0] overflow-hidden"
        style={{ boxShadow: "6px 6px 0 #1F1A14" }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="เริ่มต้นใช้งาน InvestMart"
      >
        {/* Title bar */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-[#000080]">
          <span className="text-white text-xs font-bold tracking-widest">
            INVESTMART — ขั้นตอน {stepIdx + 1}/{steps.length}
          </span>
          <button
            ref={firstBtn}
            onClick={dismiss}
            className="text-white text-xs border border-[#8080FF] bg-[#0000C0] px-2 py-0.5 hover:bg-[#000080] focus:outline-none focus:ring-1 focus:ring-white"
            aria-label="ปิดและข้าม"
          >
            ×
          </button>
        </div>

        {/* Progress dots */}
        <div className="flex gap-1.5 justify-center pt-3 pb-0.5" aria-hidden="true">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`inline-block w-1.5 h-1.5 rounded-full transition-colors ${
                i === stepIdx ? "bg-[#1F1A14]" : i < stepIdx ? "bg-[#5B8A2A]" : "bg-[#C4BFB8]"
              }`}
            />
          ))}
        </div>

        {/* Step body */}
        <div
          key={stepIdx}
          className={`px-4 pt-3 pb-2 ${dir === "fwd" ? "ob-enter-fwd" : "ob-enter-back"}`}
        >
          {step === "welcome"   && <WelcomeStep />}
          {step === "username"  && (
            <UsernameStep
              value={username}
              onChange={setUsername}
              error={usernameError}
              inputRef={inputRef}
            />
          )}
          {step === "watchlist" && (
            <WatchlistStep
              selected={selected}
              onToggle={toggleTicker}
              canSave={!!user && !user.isDemo}
            />
          )}
          {step === "action" && <ActionStep />}
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-2 px-4 pb-4 pt-2">
          {stepIdx > 0 && step !== "action" && (
            <button
              onClick={back}
              className="text-xs text-[#8A8378] hover:text-[#1F1A14] hover:underline focus:outline-none focus:underline"
            >
              ← กลับ
            </button>
          )}
          {step !== "action" && (
            <button
              onClick={dismiss}
              className="text-xs text-[#8A8378] hover:text-[#1F1A14] hover:underline focus:outline-none focus:underline ml-auto"
            >
              ข้าม
            </button>
          )}
          {step !== "action" && (
            <OffsetButton
              variant="lime"
              size="sm"
              onClick={() => void advance()}
              disabled={busy}
            >
              {busy ? "..." : isLast ? "เสร็จ" : "ถัดไป →"}
            </OffsetButton>
          )}
          {step === "action" && (
            <button
              onClick={dismiss}
              className="text-xs text-[#8A8378] hover:underline mx-auto focus:outline-none focus:underline"
            >
              ปิด · ไม่แสดงอีก
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
