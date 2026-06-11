"use client";

import { useEffect, useRef } from "react";

interface TradingViewChartProps {
  ticker:    string;
  height?:   number;
  theme?:    "light" | "dark";
  locale?:   string;
  className?: string;
}

// TradingView Advanced Chart widget — shows real premarket/afterhours data,
// full technical indicators, and volume. Loaded via the free embed script.
export function TradingViewChart({
  ticker,
  height    = 400,
  theme     = "light",
  locale    = "en",
  className = "",
}: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptRef    = useRef<HTMLScriptElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Clear previous widget
    container.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.className = "tradingview-widget-container__widget";
    container.appendChild(wrapper);

    const script = document.createElement("script");
    script.type  = "text/javascript";
    script.src   = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize:              true,
      symbol:                ticker,
      interval:              "D",
      timezone:              "America/New_York",
      theme:                 theme,
      style:                 "1",
      locale:                locale === "th" ? "th_TH" : "en",
      enable_publishing:     false,
      hide_top_toolbar:      false,
      hide_legend:           false,
      save_image:            false,
      calendar:              true,
      hide_volume:           false,
      support_host:          "https://www.tradingview.com",
      container_id:          `tv_chart_${ticker}`,
      // Show premarket/afterhours
      extended_hours:        true,
      show_popup_button:     true,
      popup_width:           "1000",
      popup_height:          "650",
    });
    scriptRef.current = script;
    container.appendChild(script);

    return () => {
      container.innerHTML = "";
      scriptRef.current = null;
    };
  }, [ticker, theme, locale]);

  return (
    <div
      className={`tradingview-widget-container ${className}`}
      ref={containerRef}
      style={{ height, width: "100%" }}
    />
  );
}
