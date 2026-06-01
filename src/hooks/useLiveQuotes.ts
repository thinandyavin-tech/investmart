"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getMarketInfo } from "@/lib/marketHours";

const FALLBACK_POLL_MS  = 20_000;
const MARKET_CHECK_MS   = 30_000;

export interface LiveTickPrice {
  price:     number;
  changePct: number | null;
  prevClose: number | null;
  updatedAt: Date;
}

// Map from ticker → latest price data
export type LivePriceMap = Record<string, LiveTickPrice>;

interface SseMessage {
  type?:      string;
  ticker?:    string;
  price?:     number;
  timestamp?: number;
}

interface QuoteResponse {
  c?:  number;
  pc?: number;
  dp?: number;
}

function isMarketActive(): boolean {
  const { status } = getMarketInfo();
  return status === "open" || status === "pre" || status === "after";
}

/**
 * Returns live prices for an array of tickers.
 * Opens an SSE connection when the market is active; falls back to REST polling otherwise.
 * On SSE tick, updates price+changePct; prevClose comes from the initial REST fetch.
 */
export function useLiveQuotes(tickers: string[]): {
  prices:  LivePriceMap;
  loading: boolean;
} {
  const [prices, setPrices]   = useState<LivePriceMap>({});
  const [loading, setLoading] = useState(true);

  const esRef        = useRef<EventSource | null>(null);
  const pollRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevCloseRef = useRef<Record<string, number>>({});
  const tickersKey   = tickers.slice().sort().join(",");

  // Fetch initial REST quotes for all tickers to get prevClose + initial prices
  const fetchAll = useCallback(async (list: string[]): Promise<void> => {
    if (list.length === 0) { setLoading(false); return; }
    await Promise.all(
      list.map(async (ticker) => {
        try {
          const res  = await fetch(`/api/stock/quote?symbol=${encodeURIComponent(ticker)}`);
          const data = (await res.json()) as QuoteResponse;
          if (!data.c || data.c <= 0) return;
          prevCloseRef.current[ticker] = data.pc ?? 0;
          setPrices((prev) => ({
            ...prev,
            [ticker]: {
              price:     data.c!,
              changePct: data.dp ?? null,
              prevClose: data.pc ?? null,
              updatedAt: new Date(),
            },
          }));
        } catch {
          // leave ticker absent from prices map — callers should handle undefined
        }
      })
    );
    setLoading(false);
  }, []);

  // Open SSE stream for live ticks during market hours
  const openSse = useCallback((list: string[]): void => {
    if (list.length === 0 || esRef.current) return;
    const symbols = list.map(encodeURIComponent).join(",");
    const es      = new EventSource(`/api/quotes/stream?symbols=${symbols}`);
    esRef.current = es;

    es.onmessage = (event: MessageEvent<string>): void => {
      let msg: SseMessage;
      try { msg = JSON.parse(event.data) as SseMessage; }
      catch { return; }
      if (msg.type === "connected" || !msg.ticker || msg.price === undefined) return;

      const ticker   = msg.ticker;
      const pc       = prevCloseRef.current[ticker] ?? 0;
      const changePct = pc > 0 ? ((msg.price - pc) / pc) * 100 : null;

      setPrices((prev) => ({
        ...prev,
        [ticker]: {
          price:     msg.price!,
          changePct,
          prevClose: pc || null,
          updatedAt: new Date(),
        },
      }));
    };

    es.onerror = (): void => {
      closeSse();
      startPoll(list);
    };
  }, []); // stable — refs don't trigger re-render

  const closeSse = (): void => {
    if (esRef.current) { esRef.current.close(); esRef.current = null; }
  };

  const stopPoll = (): void => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  const startPoll = useCallback((list: string[]): void => {
    if (pollRef.current || list.length === 0) return;
    pollRef.current = setInterval(() => void fetchAll(list), FALLBACK_POLL_MS);
  }, [fetchAll]);

  // Re-initialize when tickers list changes
  useEffect(() => {
    const list = tickersKey ? tickersKey.split(",") : [];

    closeSse();
    stopPoll();
    setLoading(true);
    setPrices({});
    prevCloseRef.current = {};

    void fetchAll(list).then(() => {
      if (isMarketActive()) {
        openSse(list);
      } else {
        startPoll(list);
      }
    });

    return () => {
      closeSse();
      stopPoll();
    };
  }, [tickersKey]); // fetchAll/openSse/startPoll are stable

  // Re-evaluate market status every 30s to toggle SSE on/off
  useEffect(() => {
    const list = tickersKey ? tickersKey.split(",") : [];
    const id   = setInterval(() => {
      if (isMarketActive()) {
        stopPoll();
        openSse(list);
      } else {
        closeSse();
        startPoll(list);
      }
    }, MARKET_CHECK_MS);
    return () => clearInterval(id);
  }, [tickersKey, openSse, startPoll]);

  return { prices, loading };
}
