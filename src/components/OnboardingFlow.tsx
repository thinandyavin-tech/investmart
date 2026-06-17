"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "@/i18n/navigation";
import { usePathname } from "next/navigation";

import { OffsetButton } from "@/components/OffsetButton";
import { useUser } from "@/lib/userContext";
import { useI18n } from "@/lib/i18n";

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
  const { t } = useI18n();
  const ob = t.onboarding;
  const features = [ob.featureRadar, ob.featureTrade, ob.featureSocial] as [string, string, string][];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-bold text-[#1F1A14]">{ob.welcome}</h2>
        <p className="text-xs text-[#8A8378] leading-relaxed">{ob.welcomeDesc}</p>
      </div>

      <div className="border border-dashed border-[#5B8A2A] bg-[#F8FDF2] rounded p-3 flex flex-col gap-1">
        <p className="text-xs font-bold text-[#5B8A2A] uppercase tracking-widest">{ob.portfolioLabel}</p>
        <p className="text-xl font-bold" style={{ fontFamily: "var(--font-mono)" }}>฿1,250,000</p>
        <p className="text-xs text-[#8A8378]">{ob.portfolioNote}</p>
      </div>

      <ul className="flex flex-col gap-2 text-xs">
        {features.map(([icon, title, desc]) => (
          <li key={title} className="flex gap-2 items-start">
            <span className="flex-shrink-0 text-sm">{icon}</span>
            <span><span className="font-bold">{title}</span> — {desc}</span>
          </li>
        ))}
      </ul>

      <p className="text-xs text-[#8A8378] border-t border-[#e9edc9] pt-2">
        {ob.disclaimer}
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
  const { t } = useI18n();
  const ob = t.onboarding;

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-bold text-[#1F1A14] mb-1">{ob.usernameTitle}</h2>
        <p className="text-xs text-[#8A8378] leading-relaxed">{ob.usernameDesc}</p>
      </div>

      <div>
        <label htmlFor="ob-username" className="block text-xs text-[#8A8378] uppercase tracking-wide mb-1">
          {ob.usernameLabel}
        </label>
        <div className="flex items-center border-2 border-[#1F1A14] bg-[#fefae0] overflow-hidden">
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

      <p className="text-xs text-[#8A8378]">{ob.usernameFormat}</p>
    </div>
  );
}

interface WatchlistStepProps {
  selected:  Set<string>;
  onToggle:  (ticker: string) => void;
  canSave:   boolean;
}

function WatchlistStep({ selected, onToggle, canSave }: WatchlistStepProps) {
  const { t } = useI18n();
  const ob = t.onboarding;

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-bold text-[#1F1A14] mb-1">{ob.watchlistTitle}</h2>
        <p className="text-xs text-[#8A8378]">{ob.watchlistDesc}</p>
      </div>

      <div
        className="grid grid-cols-3 gap-1.5"
        role="group"
        aria-label={ob.watchlistAria}
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
        <p className="text-xs text-[#8A8378]">{ob.watchlistLogin}</p>
      )}
    </div>
  );
}

function ActionStep() {
  const { t } = useI18n();
  const ob = t.onboarding;

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-bold text-[#1F1A14] mb-1">{ob.actionTitle}</h2>
        <p className="text-xs text-[#8A8378] leading-relaxed">{ob.actionDesc}</p>
      </div>

      <div className="flex flex-col gap-2">
        <Link href="/radar" className="block">
          <OffsetButton variant="lime" className="w-full text-center text-xs">
            {ob.radarBtn}
          </OffsetButton>
        </Link>
        <Link href="/market" className="block">
          <OffsetButton variant="black" className="w-full text-center text-xs">
            {ob.marketBtn}
          </OffsetButton>
        </Link>
        <Link href="/learn" className="block">
          <OffsetButton variant="white" className="w-full text-center text-xs">
            {ob.learnBtn}
          </OffsetButton>
        </Link>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────

export function OnboardingFlow() {
  const { user, loading, refreshUser } = useUser();
  const { t } = useI18n();
  const ob = t.onboarding;
  const pathname = usePathname();
  const [visible,       setVisible]  = useState(false);
  const [stepIdx,       setStepIdx]  = useState(0);
  const [dir,           setDir]      = useState<"fwd" | "back">("fwd");
  const [username,      setUsername] = useState("");
  const [usernameError, setUnError]  = useState("");
  const [busy,          setBusy]     = useState(false);
  const [selected,      setSelected] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);
  const firstBtn = useRef<HTMLButtonElement>(null);

  const steps = buildSteps(user);
  const step  = steps[stepIdx] ?? "action";
  const isLast = stepIdx === steps.length - 1;

  useEffect(() => {
    if (loading) return;
    if (pathname !== "/") return;
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
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") dismiss();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [visible, dismiss]);

  useEffect(() => {
    if (!visible) return;
    setTimeout(() => {
      (inputRef.current ?? firstBtn.current)?.focus();
    }, 220);
  }, [stepIdx, visible]);

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
        setUnError(ob.usernameError);
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
          setUnError(d.error ?? ob.usernameApiError);
          return;
        }
        await refreshUser();
      } catch {
        setUnError(ob.usernameNetError);
        return;
      } finally {
        setBusy(false);
      }
    }

    if (step === "watchlist" && selected.size > 0 && user && !user.isDemo) {
      void Promise.all(
        Array.from(selected).map((ticker) =>
          fetch("/api/watchlist", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ ticker }),
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
        className="w-full max-w-sm mb-4 lg:mb-0 border-2 border-[#1F1A14] bg-[#faedcd] overflow-hidden"
        style={{ boxShadow: "6px 6px 0 #d4a373" }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={ob.welcome}
      >
        {/* Title bar */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-[#000080]">
          <span className="text-white text-xs font-bold tracking-widest">
            {ob.step(stepIdx + 1, steps.length)}
          </span>
          <button
            ref={firstBtn}
            onClick={dismiss}
            className="text-white text-xs border border-[#8080FF] bg-[#0000C0] px-2 py-0.5 hover:bg-[#000080] focus:outline-none focus:ring-1 focus:ring-white"
            aria-label={ob.closeSkip}
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
              {ob.back}
            </button>
          )}
          {step !== "action" && (
            <button
              onClick={dismiss}
              className="text-xs text-[#8A8378] hover:text-[#1F1A14] hover:underline focus:outline-none focus:underline ml-auto"
            >
              {ob.skip}
            </button>
          )}
          {step !== "action" && (
            <OffsetButton
              variant="lime"
              size="sm"
              onClick={() => void advance()}
              disabled={busy}
            >
              {busy ? "..." : isLast ? ob.done : ob.next}
            </OffsetButton>
          )}
          {step === "action" && (
            <button
              onClick={dismiss}
              className="text-xs text-[#8A8378] hover:underline mx-auto focus:outline-none focus:underline"
            >
              {ob.dismissFinal}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
