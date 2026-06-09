import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Tier definitions — requests per window
// ---------------------------------------------------------------------------

const TIERS = {
  ai:      { requests: 20, window: 60 },  // Martin chat + chart analysis — cached responses don't count
  news:    { requests: 40, window: 60 },  // news summaries/analysis — higher limit, cached by content hash
  scan:    { requests: 3,  window: 60 },  // expensive: full-universe scan
  quote:   { requests: 30, window: 60 },  // moderate: market data
  write:   { requests: 20, window: 60 },  // mutations: trades, posts
  default: { requests: 60, window: 60 },  // everything else
} as const;

export type RateLimitTier = keyof typeof TIERS;

// ---------------------------------------------------------------------------
// Key builder — prefer user ID, fall back to IP
// ---------------------------------------------------------------------------

function buildKey(req: NextRequest, tier: RateLimitTier): string {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  // Extract user from JWT stored in session cookie — we only need identity,
  // not full validation, so a best-effort header check is fine here.
  const userId = req.headers.get("x-user-id") ?? null;
  const identity = userId ? `u:${userId}` : `ip:${ip}`;
  return `rl:${tier}:${identity}`;
}

// ---------------------------------------------------------------------------
// 429 response helper
// ---------------------------------------------------------------------------

function tooMany(retryAfter: number): NextResponse {
  return NextResponse.json(
    {
      error: "คุณส่งคำขอมากเกินไป กรุณารอแล้วลองใหม่",
      retryAfter,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
        "X-RateLimit-Limit": "0",
      },
    },
  );
}

// ---------------------------------------------------------------------------
// Upstash strategy
// ---------------------------------------------------------------------------

let _upstashLimiter: UpstashLimiter | null = null;

async function getUpstashLimiter(): Promise<UpstashLimiter | null> {
  if (_upstashLimiter !== null) return _upstashLimiter;

  // Accept both Vercel Marketplace naming (KV_REST_API_*) and standalone Upstash naming.
  const url   = process.env.KV_REST_API_URL   ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  try {
    const { Redis }      = await import("@upstash/redis");
    const { Ratelimit }  = await import("@upstash/ratelimit");
    const redis = new Redis({ url, token });

    const limiters = Object.fromEntries(
      Object.entries(TIERS).map(([tier, { requests, window: win }]) => [
        tier,
        new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(requests, `${win} s`),
          prefix: `investmart`,
        }),
      ]),
    ) as Record<RateLimitTier, InstanceType<typeof Ratelimit>>;

    _upstashLimiter = { limiters };
    return _upstashLimiter;
  } catch {
    return null;
  }
}

interface UpstashLimiter {
  limiters: Record<RateLimitTier, { limit(id: string): Promise<{ success: boolean; reset: number }> }>;
}

// ---------------------------------------------------------------------------
// In-memory fallback (sliding window via Map + timestamps)
// ---------------------------------------------------------------------------

interface WindowEntry {
  timestamps: number[];
}

const memoryStore = new Map<string, WindowEntry>();

// Evict keys older than 2 windows to prevent unbounded growth.
function evictStale(now: number, windowMs: number): void {
  for (const [key, entry] of memoryStore) {
    const cutoff = now - windowMs * 2;
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    if (entry.timestamps.length === 0) memoryStore.delete(key);
  }
}

let lastEvict = 0;

function memoryLimit(
  key: string,
  tier: RateLimitTier,
): { success: boolean; retryAfter: number } {
  const { requests, window: windowSec } = TIERS[tier];
  const windowMs = windowSec * 1000;
  const now = Date.now();

  // Periodic eviction — at most once every 30 seconds.
  if (now - lastEvict > 30_000) {
    evictStale(now, windowMs);
    lastEvict = now;
  }

  const entry = memoryStore.get(key) ?? { timestamps: [] };
  const cutoff = now - windowMs;
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

  if (entry.timestamps.length >= requests) {
    const oldest = entry.timestamps[0]!;
    const retryAfter = Math.ceil((oldest + windowMs - now) / 1000);
    memoryStore.set(key, entry);
    return { success: false, retryAfter: Math.max(1, retryAfter) };
  }

  entry.timestamps.push(now);
  memoryStore.set(key, entry);
  return { success: true, retryAfter: 0 };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Apply rate limiting to a Next.js route handler.
 * Returns a 429 NextResponse if the limit is exceeded, otherwise null.
 *
 * Usage:
 *   const limited = await applyRateLimit(request, "ai");
 *   if (limited) return limited;
 */
export async function applyRateLimit(
  req: NextRequest,
  tier: RateLimitTier = "default",
): Promise<NextResponse | null> {
  const key = buildKey(req, tier);

  const upstash = await getUpstashLimiter();
  if (upstash) {
    try {
      const { success, reset } = await upstash.limiters[tier].limit(key);
      if (!success) {
        const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
        return tooMany(retryAfter);
      }
      return null;
    } catch {
      // Fall through to in-memory on Upstash error.
    }
  }

  const { success, retryAfter } = memoryLimit(key, tier);
  if (!success) return tooMany(retryAfter);
  return null;
}
