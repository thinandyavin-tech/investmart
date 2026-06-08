"use client";

import { useEffect, useRef } from "react";

interface TradingViewTickerTapeProps {
  theme?:    "light" | "dark";
  className?: string;
}

// Scrolling ticker tape with real-time premarket prices for major stocks
const SYMBOLS = [
  { proName: "NASDAQ:AAPL",  title: "Apple"     },
  { proName: "NASDAQ:NVDA",  title: "NVIDIA"    },
  { proName: "NASDAQ:MSFT",  title: "Microsoft" },
  { proName: "NASDAQ:TSLA",  title: "Tesla"     },
  { proName: "NASDAQ:GOOGL", title: "Alphabet"  },
  { proName: "NASDAQ:META",  title: "Meta"      },
  { proName: "NASDAQ:AMZN",  title: "Amazon"    },
  { proName: "NYSE:JPM",     title: "JPMorgan"  },
  { proName: "FOREXCOM:SPXUSD", title: "S&P 500" },
  { proName: "FOREXCOM:NSXUSD", title: "NASDAQ 100" },
  { proName: "BITSTAMP:BTCUSD", title: "Bitcoin" },
];

export function TradingViewTickerTape({
  theme     = "light",
  className = "",
}: TradingViewTickerTapeProps) {
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
    script.src   = "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbols:       SYMBOLS,
      showSymbolLogo: true,
      isTransparent:  true,
      displayMode:    "adaptive",
      colorTheme:     theme,
      locale:         "th_TH",
    });
    container.appendChild(script);

    return () => { container.innerHTML = ""; };
  }, [theme]);

  return (
    <div
      className={`tradingview-widget-container ${className}`}
      ref={containerRef}
    />
  );
}
