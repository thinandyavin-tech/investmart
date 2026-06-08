"use client";

import { useEffect, useRef } from "react";

interface TradingViewMiniChartProps {
  ticker:    string;
  height?:   number;
  theme?:    "light" | "dark";
  className?: string;
}

export function TradingViewMiniChart({
  ticker,
  height    = 220,
  theme     = "light",
  className = "",
}: TradingViewMiniChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.className = "tradingview-widget-container__widget";
    container.appendChild(wrapper);

    const script = document.createElement("script");
    script.type  = "text/javascript";
    script.src   = "https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbol:            ticker,
      width:             "100%",
      height:            height,
      locale:            "th_TH",
      dateRange:         "3M",
      colorTheme:        theme,
      isTransparent:     true,
      autosize:          true,
      largeChartUrl:     "",
    });
    container.appendChild(script);

    return () => { container.innerHTML = ""; };
  }, [ticker, theme, height]);

  return (
    <div
      className={`tradingview-widget-container ${className}`}
      ref={containerRef}
      style={{ height, width: "100%" }}
    />
  );
}
