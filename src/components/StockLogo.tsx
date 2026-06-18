"use client";

import { useState } from "react";

// Deterministic avatar color from ticker string
const AVATAR_PALETTE = [
  { bg: "#d4a373", fg: "#fff"     },
  { bg: "#8B5CF6", fg: "#fff"     },
  { bg: "#16A34A", fg: "#fff"     },
  { bg: "#ccd5ae", fg: "#1A1A1A" },
  { bg: "#D97706", fg: "#fff"     },
  { bg: "#2563EB", fg: "#fff"     },
  { bg: "#DC2626", fg: "#fff"     },
  { bg: "#0891B2", fg: "#fff"     },
] as const;

function avatarColor(ticker: string) {
  let h = 0;
  for (let i = 0; i < ticker.length; i++) h = h * 31 + ticker.charCodeAt(i);
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
}

interface StockLogoProps {
  ticker:     string;
  name?:      string;
  /** Optional pre-fetched logo URL (e.g. from Finnhub profile). Tried first. */
  logoUrl?:   string | null;
  size?:      number;
  radius?:    number;
  className?: string;
}

type Stage = "provided" | "parqet" | "avatar";

function parqetUrl(ticker: string) {
  return `https://assets.parqet.com/logos/symbol/${encodeURIComponent(ticker)}?format=svg`;
}

/**
 * Company logo with three-tier fallback:
 *   1. logoUrl prop (Finnhub/other pre-fetched URL)
 *   2. Parqet free CDN (by ticker symbol)
 *   3. Coloured letter-avatar (deterministic per ticker)
 */
export function StockLogo({ ticker, name, logoUrl, size = 32, radius = 6, className = "" }: StockLogoProps) {
  const [stage, setStage] = useState<Stage>(logoUrl ? "provided" : "parqet");
  const col    = avatarColor(ticker);
  const label  = name ?? ticker;
  const initial = ticker.replace(/[^A-Z]/g, "").slice(0, 2) || ticker.slice(0, 2).toUpperCase();

  function advance() {
    setStage(s => s === "provided" ? "parqet" : "avatar");
  }

  if (stage === "avatar") {
    return (
      <div
        className={`flex-shrink-0 flex items-center justify-center font-bold select-none ${className}`}
        style={{ width: size, height: size, borderRadius: radius, background: col.bg, color: col.fg, fontSize: size * 0.38 }}
        aria-label={label}
        role="img"
      >
        {initial}
      </div>
    );
  }

  const src = stage === "provided" && logoUrl ? logoUrl : parqetUrl(ticker);

  return (
    <img
      src={src}
      alt={label}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      onError={advance}
      className={`flex-shrink-0 object-contain ${className}`}
      style={{ borderRadius: radius, background: "#fefae0" }}
    />
  );
}
