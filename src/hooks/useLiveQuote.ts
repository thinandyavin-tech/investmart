"use client";

import { useState, useEffect, useRef, useCallback } from "react";

import { getMarketInfo, type MarketStatus } from "@/lib/marketHours";

const FLASH_DURATION_MS   = 800;
const MARKET_CHECK_MS     = 30_000;
const FALLBACK_POLL_MS    = 15_000;
const REDUCED_MOTION_MQ   = "(prefers-reduced-motion: reduce)";

// Keep the exact same exported interface as the previous implementation
export interface LiveQuote {
  price:      number;
  prevClose:  number;
  change:     number;   // absolute $
  changePct:  number;   // percent
  high:       number;
  low:        number;
  open:       number;
  timestamp:  number;   // unix seconds from Finnhub
}

export interface LiveQuoteResult {
  quote:        LiveQuote | null;
  loading:      boolean;
  error:        boolean;
  isLive:       boolean;          // EventSource connected AND market active
  marketStatus: MarketStatus;
  lastUpdated:  Date | null;
  flash:        "up" | "down" | null;
}

interface RawQuote {
  c: number;
  pc: number;
  d: number;
  dp: number;
  h: number;
  l: number;
  o: number;
  t: number;
}

interface SseTickMessage {
  ticker:    string;
  price:     number;
  volume:    number;
  timestamp: number;
}

function isMarketActive(status: MarketStatus): boolean {
  return status === "open" || status === "pre" || status === "after";
}

function parseRawQuote(raw: RawQuote): LiveQuote {
  return {
    price:     raw.c,
    prevClose: raw.pc,
    change:    raw.d,
    changePct: raw.dp,
    high:      raw.h,
    low:       raw.l,
    open:      raw.o,
    timestamp: raw.t,
  };
}

export function useLiveQuote(ticker: string | null): LiveQuoteResult {
  const [quote, setQuote]               = useState<LiveQuote | null>(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(false);
  const [isLive, setIsLive]             = useState(false);
  const [lastUpdated, setLastUpdated]   = useState<Date | null>(null);
  const [flash, setFlash]               = useState<"up" | "down" | null>(null);
  const [marketStatus, setMarketStatus] = useState<MarketStatus>(
    () => getMarketInfo().status
  );

  const prevPriceRef      = useRef<number | null>(null);
  const flashTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const esRef             = useRef<EventSource | null>(null);
  const pollTimerRef      = useRef<ReturnType<typeof setInterval> | null>(null);

  // Read once at mount — never changes during a session
  const reducedMotion = useRef(
    typeof window !== "undefined" && window.matchMedia(REDUCED_MOTION_MQ).matches
  );

  const triggerFlash = useCallback((nextPrice: number): void => {
    if (reducedMotion.current || prevPriceRef.current === null) return;
    const direction =
      nextPrice > prevPriceRef.current ? "up" :
      nextPrice < prevPriceRef.current ? "down" : null;
    if (!direction) return;

    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    setFlash(direction);
    flashTimerRef.current = setTimeout(() => setFlash(null), FLASH_DURATION_MS);
  }, []);

  // Initial REST fetch — runs on mount and on ticker change
  const fetchQuote = useCallback(async (): Promise<void> => {
    if (!ticker) return;
    try {
      const res = await fetch(`/api/stock/quote?symbol=${encodeURIComponent(ticker)}`);
      if (!res.ok) { setError(true); return; }

      const raw = (await res.json()) as RawQuote;
      if (!raw.c || raw.c <= 0) { setError(true); return; }

      const next = parseRawQuote(raw);
      triggerFlash(next.price);
      prevPriceRef.current = next.price;
      setQuote(next);
      setError(false);
      setLastUpdated(new Date());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [ticker, triggerFlash]);

  // Fallback REST polling (used when EventSource fails)
  const startFallbackPoll = useCallback((): void => {
    if (pollTimerRef.current) return;
    pollTimerRef.current = setInterval(() => void fetchQuote(), FALLBACK_POLL_MS);
  }, [fetchQuote]);

  const stopFallbackPoll = useCallback((): void => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const closeEventSource = useCallback((): void => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    setIsLive(false);
  }, []);

  // Open SSE connection for live ticks
  const openEventSource = useCallback((): void => {
    if (!ticker || esRef.current) return;

    stopFallbackPoll();

    const es = new EventSource(
      `/api/quotes/stream?symbols=${encodeURIComponent(ticker)}`
    );
    esRef.current = es;

    es.onmessage = (event: MessageEvent<string>): void => {
      let parsed: SseTickMessage | { type: string };
      try {
        parsed = JSON.parse(event.data) as SseTickMessage | { type: string };
      } catch {
        return;
      }

      // Skip the "connected" handshake message
      if ("type" in parsed) return;

      const tick = parsed as SseTickMessage;
      if (tick.ticker !== ticker.toUpperCase()) return;

      const next: LiveQuote = {
        price:     tick.price,
        prevClose: quote?.prevClose ?? 0,
        change:    quote ? tick.price - quote.prevClose : 0,
        changePct: quote?.prevClose
          ? ((tick.price - quote.prevClose) / quote.prevClose) * 100
          : 0,
        high:      quote ? Math.max(quote.high, tick.price) : tick.price,
        low:       quote ? Math.min(quote.low, tick.price) : tick.price,
        open:      quote?.open ?? tick.price,
        timestamp: Math.floor(tick.timestamp / 1000),
      };

      triggerFlash(next.price);
      prevPriceRef.current = next.price;
      setQuote(next);
      setError(false);
      setLastUpdated(new Date());
      setIsLive(true);
    };

    es.onerror = (): void => {
      console.warn("[useLiveQuote] SSE error — closing and falling back to REST poll");
      closeEventSource();
      startFallbackPoll();
    };
  }, [ticker, quote, triggerFlash, closeEventSource, startFallbackPoll, stopFallbackPoll]);

  // Initial fetch on ticker change
  useEffect(() => {
    if (!ticker) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(false);
    setQuote(null);
    prevPriceRef.current = null;
    closeEventSource();
    stopFallbackPoll();

    void fetchQuote();
  }, [ticker]); // fetchQuote/closeEventSource/stopFallbackPoll are stable callbacks

  // Market status check every 30s
  useEffect(() => {
    const id = setInterval(() => {
      setMarketStatus(getMarketInfo().status);
    }, MARKET_CHECK_MS);
    return () => clearInterval(id);
  }, []);

  // React to market open/close: start SSE when active, stop when closed
  useEffect(() => {
    if (!ticker) return;

    const active = isMarketActive(marketStatus);

    if (active) {
      openEventSource();
    } else {
      closeEventSource();
      stopFallbackPoll();
    }

    return () => {
      // Only fully tear down on ticker change / unmount, not on every status re-eval
    };
  }, [ticker, marketStatus]); // openEventSource/closeEventSource are stable

  // Full cleanup on ticker change or unmount
  useEffect(() => {
    return () => {
      closeEventSource();
      stopFallbackPoll();
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, [ticker, closeEventSource, stopFallbackPoll]);

  return { quote, loading, error, isLive, marketStatus, lastUpdated, flash };
}
