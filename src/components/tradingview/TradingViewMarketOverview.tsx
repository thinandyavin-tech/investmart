"use client";

import { useEffect, useRef } from "react";

interface TradingViewMarketOverviewProps {
  theme?:  "light" | "dark";
  height?: number;
  locale?: string;
}

/**
 * TradingView Market Overview widget — no API key, no Finnhub calls.
 * Provides global coverage: Indices, Stocks, Commodities, Currencies, Bonds, Crypto.
 * Free, client-side only — just embed the script.
 */
export function TradingViewMarketOverview({
  theme  = "light",
  height = 400,
  locale = "en",
}: TradingViewMarketOverviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      colorTheme:          theme,
      dateRange:           "12M",
      showChart:           true,
      locale:              locale === "th" ? "th" : "en",
      largeChartUrl:       "",
      isTransparent:       true,
      showSymbolLogo:      true,
      showFloatingTooltip: false,
      width:               "100%",
      height:              `${height}`,
      tabs: [
        {
          title: "Indices",
          symbols: [
            { s: "FOREXCOM:SPXUSD", d: "S&P 500 Index" },
            { s: "FOREXCOM:NSXUSD", d: "US 100 Cash CFD" },
            { s: "FOREXCOM:DJI",    d: "Dow Jones Industrial Average Index" },
            { s: "INDEX:NKY",       d: "Nikkei 225" },
            { s: "INDEX:DEU40",     d: "DAX Index" },
            { s: "FOREXCOM:UKXGBP", d: "FTSE 100 Index" },
            { s: "NASDAQ:TSEC",     d: "Taiwan TAIEX" },
          ],
          originalTitle: "Indices",
        },
        {
          title: "Futures",
          symbols: [
            { s: "CME_MINI:ES1!",  d: "S&P 500" },
            { s: "CME:6E1!",       d: "Euro" },
            { s: "COMEX:GC1!",     d: "Gold" },
            { s: "NYMEX:CL1!",     d: "Oil" },
            { s: "CBOT:ZB1!",      d: "T-Bond" },
          ],
          originalTitle: "Futures",
        },
        {
          title: "Bonds",
          symbols: [
            { s: "CBOT:ZN1!",      d: "10-Year T-Note" },
            { s: "CBOT:ZB1!",      d: "T-Bond" },
            { s: "EUREX:FGBL1!",   d: "Euro Bund" },
            { s: "EUREX:FBTP1!",   d: "Euro BTP" },
            { s: "EUREX:FGBM1!",   d: "Euro BOBL" },
          ],
          originalTitle: "Bonds",
        },
        {
          title: "Forex",
          symbols: [
            { s: "FX:EURUSD" },
            { s: "FX:USDJPY" },
            { s: "FX:GBPUSD" },
            { s: "FX:USDCHF" },
            { s: "FX:AUDUSD" },
            { s: "FX:USDCAD" },
            { s: "FX:USDTHB", d: "USD/THB" },
          ],
          originalTitle: "Forex",
        },
        {
          title: "Crypto",
          symbols: [
            { s: "BITSTAMP:BTCUSD", d: "Bitcoin" },
            { s: "BITSTAMP:ETHUSD", d: "Ethereum" },
            { s: "BINANCE:SOLUSDT", d: "Solana" },
            { s: "BINANCE:BNBUSDT", d: "BNB" },
            { s: "COINBASE:XRPUSD", d: "XRP" },
          ],
          originalTitle: "Crypto",
        },
        {
          title: "Commodities",
          symbols: [
            { s: "COMEX:GC1!",  d: "Gold" },
            { s: "COMEX:SI1!",  d: "Silver" },
            { s: "NYMEX:CL1!",  d: "Crude Oil (WTI)" },
            { s: "NYMEX:NG1!",  d: "Natural Gas" },
            { s: "CBOT:ZW1!",   d: "Wheat" },
            { s: "CBOT:ZC1!",   d: "Corn" },
          ],
          originalTitle: "Commodities",
        },
      ],
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
