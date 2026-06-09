"use client";

import { useEffect, useRef } from "react";

interface TradingViewHeatmapProps {
  theme?:  "light" | "dark";
  height?: number;
}

/**
 * TradingView Stock Market Heatmap widget — no API key, no Finnhub calls.
 * Shows US market sectors as colored tiles sized by market cap.
 * Color = % change today: green = up, red = down.
 */
export function TradingViewHeatmap({
  theme  = "light",
  height = 500,
}: TradingViewHeatmapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mountedRef   = useRef(false);

  useEffect(() => {
    if (!containerRef.current || mountedRef.current) return;
    mountedRef.current = true;

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-stock-heatmap.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      exchanges:     [],
      dataSource:    "SPX500",
      grouping:      "sector",
      blockSize:     "market_cap_basic",
      blockColor:    "change",
      locale:        "en",
      symbolUrl:     "",
      colorTheme:    theme,
      hasTopBar:     true,
      isDataSetEnabled: false,
      isZoomEnabled: true,
      hasSymbolTooltip: true,
      isMonoSize:    false,
      width:         "100%",
      height:        `${height}`,
    });

    containerRef.current.appendChild(script);
  }, [theme, height]);

  return (
    <div className="tradingview-widget-container" ref={containerRef} style={{ height }}>
      <div className="tradingview-widget-container__widget" style={{ height: "100%", width: "100%" }} />
    </div>
  );
}
