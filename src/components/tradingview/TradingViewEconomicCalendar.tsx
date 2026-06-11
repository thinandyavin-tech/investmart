"use client";

import { useEffect, useRef } from "react";

interface TradingViewEconomicCalendarProps {
  theme?:          "light" | "dark";
  height?:         number;
  locale?:         string;
  highImpactOnly?: boolean;
}

/**
 * TradingView Economic Calendar widget.
 * Covers: CPI, Fed decisions, NFP, GDP, PMI, ECB, BoE, BoJ, and 100+ more.
 * No API key — free TradingView embed. No Finnhub calls.
 */
export function TradingViewEconomicCalendar({
  theme          = "light",
  height         = 600,
  locale         = "en",
  highImpactOnly = false,
}: TradingViewEconomicCalendarProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-events.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      colorTheme:       theme,
      isTransparent:    true,
      width:            "100%",
      height:           `${height}`,
      locale:           locale === "th" ? "th" : "en",
      importanceFilter: highImpactOnly ? "1,2" : "-1,0,1",
      countryFilter:    "us,eu,gb,jp,cn,ca,au,ch,nz,th",
    });

    container.appendChild(script);

    return () => { container.innerHTML = ""; };
  }, [theme, height, locale, highImpactOnly]);

  return (
    <div className="tradingview-widget-container" ref={containerRef} style={{ minHeight: height }}>
      <div className="tradingview-widget-container__widget" style={{ height: "100%", width: "100%" }} />
    </div>
  );
}
