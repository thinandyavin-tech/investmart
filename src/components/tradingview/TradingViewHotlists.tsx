"use client";

import { useEffect, useRef } from "react";

interface TradingViewHotlistsProps {
  theme?:  "light" | "dark";
  height?: number;
  locale?: string;
}

export function TradingViewHotlists({
  theme  = "light",
  height = 400,
  locale = "en",
}: TradingViewHotlistsProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = "";

    const script = document.createElement("script");
    script.src   = "https://s3.tradingview.com/external-embedding/embed-widget-hotlists.js";
    script.type  = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      colorTheme:          theme,
      dateRange:           "1D",
      exchange:            "US",
      showChart:           true,
      locale:              locale === "th" ? "th" : "en",
      largeChartUrl:       "",
      isTransparent:       true,
      showSymbolLogo:      false,
      showFloatingTooltip: false,
      plotLineColorGrowing:"rgba(41,191,99,1)",
      plotLineColorFalling:"rgba(255,74,104,1)",
      gridLineColor:       "rgba(240,243,250,0)",
      scaleFontColor:      "rgba(120,123,134,1)",
      belowLineFillColorGrowing:      "rgba(41,191,99,0.12)",
      belowLineFillColorFalling:      "rgba(255,74,104,0.12)",
      belowLineFillColorGrowingBottom:"rgba(41,191,99,0)",
      belowLineFillColorFallingBottom:"rgba(255,74,104,0)",
      symbolActiveColor:   "rgba(41,191,99,0.12)",
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
