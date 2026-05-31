// Server-side only — never import in client components.
// Manages a single Finnhub WebSocket connection shared across all SSE subscribers,
// using reference-counted symbol subscriptions so we only hold sockets we need.

export interface TickUpdate {
  ticker:    string;
  price:     number;
  volume:    number;
  timestamp: number;
}

type UpdateListener = (update: TickUpdate) => void;

const MAX_SYMBOLS        = 50;
const PING_INTERVAL_MS   = 20_000;
const RECONNECT_BASE_MS  = 1_000;
const RECONNECT_MAX_MS   = 30_000;
const FINNHUB_WS_BASE    = "wss://ws.finnhub.io";

interface SymbolEntry {
  listeners: Set<UpdateListener>;
}

interface FinnhubTradeMessage {
  type: "trade";
  data: Array<{ p: number; s: string; t: number; v: number }>;
}

interface FinnhubPongMessage {
  type: "ping" | "pong" | string;
}

type FinnhubMessage = FinnhubTradeMessage | FinnhubPongMessage;

class FinnhubWsManager {
  private ws:               WebSocket | null = null;
  private symbols:          Map<string, SymbolEntry> = new Map();
  private reconnectDelay:   number = RECONNECT_BASE_MS;
  private pingTimer:        ReturnType<typeof setInterval> | null = null;
  private reconnectTimer:   ReturnType<typeof setTimeout> | null = null;
  private isShuttingDown:   boolean = false;

  subscribe(ticker: string, cb: UpdateListener): () => void {
    const upper = ticker.toUpperCase();

    if (!this.symbols.has(upper)) {
      if (this.symbols.size >= MAX_SYMBOLS) {
        console.warn(`[finnhubWs] Max symbol cap (${MAX_SYMBOLS}) reached — skipping ${upper}`);
        // Return a no-op cleanup so callers don't need to handle this specially
        return () => {};
      }
      this.symbols.set(upper, { listeners: new Set() });
      this.sendSubscribe(upper);
    }

    const entry = this.symbols.get(upper)!; // safe: we just set it if absent
    entry.listeners.add(cb);

    this.ensureConnected();

    return () => this.unsubscribeListener(upper, cb);
  }

  activeCount(): number {
    return this.symbols.size;
  }

  private unsubscribeListener(ticker: string, cb: UpdateListener): void {
    const entry = this.symbols.get(ticker);
    if (!entry) return;

    entry.listeners.delete(cb);

    if (entry.listeners.size === 0) {
      this.symbols.delete(ticker);
      this.sendUnsubscribe(ticker);
    }
  }

  private ensureConnected(): void {
    if (this.isShuttingDown) return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    this.connect();
  }

  private connect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) {
      console.error("[finnhubWs] FINNHUB_API_KEY not set — WebSocket disabled");
      return;
    }

    const url = `${FINNHUB_WS_BASE}?token=${apiKey}`;

    try {
      this.ws = new WebSocket(url);
    } catch (err) {
      console.error("[finnhubWs] Failed to create WebSocket:", err);
      this.scheduleReconnect();
      return;
    }

    this.ws.addEventListener("open", () => {
      console.info(`[finnhubWs] Connected — resubscribing ${this.symbols.size} symbols`);
      this.reconnectDelay = RECONNECT_BASE_MS;
      this.startPing();
      // Re-subscribe all active symbols after reconnect
      for (const ticker of this.symbols.keys()) {
        this.sendSubscribe(ticker);
      }
    });

    this.ws.addEventListener("message", (event: MessageEvent) => {
      this.handleMessage(event.data as string);
    });

    this.ws.addEventListener("error", (event) => {
      console.error("[finnhubWs] WebSocket error:", event);
    });

    this.ws.addEventListener("close", (event: CloseEvent) => {
      console.warn(`[finnhubWs] Connection closed (code ${event.code}) — reconnecting in ${this.reconnectDelay}ms`);
      this.stopPing();
      if (!this.isShuttingDown && this.symbols.size > 0) {
        this.scheduleReconnect();
      }
    });
  }

  private handleMessage(raw: string): void {
    let msg: FinnhubMessage;
    try {
      msg = JSON.parse(raw) as FinnhubMessage;
    } catch {
      console.warn("[finnhubWs] Received unparseable message");
      return;
    }

    if (msg.type !== "trade") return;

    const trades = (msg as FinnhubTradeMessage).data;
    if (!Array.isArray(trades)) return;

    for (const trade of trades) {
      const entry = this.symbols.get(trade.s);
      if (!entry) continue;

      const update: TickUpdate = {
        ticker:    trade.s,
        price:     trade.p,
        volume:    trade.v,
        timestamp: trade.t,
      };

      for (const cb of entry.listeners) {
        try {
          cb(update);
        } catch (err) {
          console.error(`[finnhubWs] Listener error for ${trade.s}:`, err);
        }
      }
    }
  }

  private sendSubscribe(ticker: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ type: "subscribe", symbol: ticker }));
  }

  private sendUnsubscribe(ticker: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ type: "unsubscribe", symbol: ticker }));
  }

  private startPing(): void {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "ping" }));
      }
    }, PING_INTERVAL_MS);
  }

  private stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private scheduleReconnect(): void {
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, this.reconnectDelay);

    // Exponential backoff capped at max
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, RECONNECT_MAX_MS);
  }
}

// Singleton persisted across hot-reloads in development
declare global {
  // eslint-disable-next-line no-var
  var __finnhubWsManager: FinnhubWsManager | undefined;
}

function getWsManagerInstance(): FinnhubWsManager {
  if (!global.__finnhubWsManager) {
    global.__finnhubWsManager = new FinnhubWsManager();
  }
  return global.__finnhubWsManager;
}

export function getWsManager(): {
  subscribe(ticker: string, cb: UpdateListener): () => void;
  activeCount(): number;
} {
  return getWsManagerInstance();
}
