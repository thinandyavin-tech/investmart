import { type NextRequest } from "next/server";

import { getWsManager } from "@/lib/finnhubWs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SYMBOLS    = 50;
const HEARTBEAT_MS   = 25_000;
const SYMBOL_RE      = /^[A-Z][A-Z.\-]{0,9}$/;

function parseSymbols(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter((s) => SYMBOL_RE.test(s))
    .slice(0, MAX_SYMBOLS);
}

export async function GET(request: NextRequest): Promise<Response> {
  const symbols = parseSymbols(request.nextUrl.searchParams.get("symbols"));

  if (symbols.length === 0) {
    return new Response(
      JSON.stringify({ error: "symbols param required (e.g. ?symbols=AAPL,NVDA)" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const manager = getWsManager();
  const cleanups: Array<() => void> = [];

  const stream = new ReadableStream({
    start(controller) {
      const enqueue = (text: string): void => {
        try {
          controller.enqueue(new TextEncoder().encode(text));
        } catch {
          // Controller may already be closed if client disconnected
        }
      };

      // Announce connected with subscribed symbol list
      enqueue(`data: ${JSON.stringify({ type: "connected", symbols })}\n\n`);

      // Subscribe to each symbol
      for (const ticker of symbols) {
        const cleanup = manager.subscribe(ticker, (update) => {
          enqueue(
            `data: ${JSON.stringify({
              ticker:    update.ticker,
              price:     update.price,
              volume:    update.volume,
              timestamp: update.timestamp,
            })}\n\n`
          );
        });
        cleanups.push(cleanup);
      }

      // Heartbeat — SSE comment keeps nginx/proxies from timing out
      // and doesn't fire a 'message' event on the browser's EventSource
      const heartbeatTimer = setInterval(() => {
        enqueue(": heartbeat\n\n");
      }, HEARTBEAT_MS);
      cleanups.push(() => clearInterval(heartbeatTimer));

      // Clean up when the client disconnects
      request.signal.addEventListener("abort", () => {
        for (const fn of cleanups) fn();
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },

    cancel() {
      for (const fn of cleanups) fn();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":      "text/event-stream",
      "Cache-Control":     "no-cache, no-transform",
      "Connection":        "keep-alive",
      // Disable nginx proxy buffering so events reach the browser immediately
      "X-Accel-Buffering": "no",
    },
  });
}
