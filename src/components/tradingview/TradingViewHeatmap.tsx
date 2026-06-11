"use client";

import { useEffect, useRef } from "react";

interface TradingViewHeatmapProps {
  theme?:  "light" | "dark";
  height?: number;
  locale?: string;
}

/**
 * TradingView Stock Market Heatmap widget — no API key, no Finnhub calls.
 * Shows US market sectors as colored tiles sized by market cap.
 * Color = % change today: green = up, red = down.
 */
export function TradingViewHeatmap({
  theme  = "light",
  height = 500,
  locale = "en",
}: TradingViewHeatmapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-stock-heatmap.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      exchanges:           [],
      dataSource:          "SPX500",
      grouping:            "sector",
      blockSize:           "market_cap_basic",
      blockColor:          "change",
      locale:              locale === "th" ? "th" : "en",
      symbolUrl:           "",
      colorTheme:          theme,
      hasTopBar:           true,
      isDataSetEnabled:    false,
      isZoomEnabled:       true,
      hasSymbolTooltip:    true,
      isMonoSize:          false,
      width:               "100%",
      height:              `${height}`,
    });

    container.appendChild(script);

    return () => { container.innerHTML = ""; };
  }, [theme, height, locale]);

  return (
    <div className="tradingview-widget-container" ref={containerRef} style={{ height }}>
      <div className="tradingview-widget-container__widget" style={{ height: "100%", width: "100%" }} />
    </div>
  );
}
