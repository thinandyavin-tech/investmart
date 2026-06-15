/**
 * KV-backed provider health tracker.
 *
 * When a provider returns HTTP 429 (rate-limit exhausted), we mark it as
 * "cooling down" in Upstash Redis for 15 minutes.  Subsequent requests skip
 * that provider immediately, instead of wasting a call that will fail again.
 *
 * Two-level read path to keep latency low:
 *   L1 — in-process Map, 60-second TTL (avoids KV round-trips on warm instances)
 *   L2 — Upstash Redis, 15-minute TTL (survives cold starts and redeploys)
 *
 * Writes are fire-and-forget; a KV failure never blocks the AI call.
 */

import { Redis } from "@upstash/redis";

const RATE_LIMIT_COOLDOWN_S = 15 * 60; // 15 min for 429
const MEM_TTL_MS            = 60_000;  // 1-min in-process cache
const KEY_PREFIX            = "ai_health:";

function getRedis(): Redis | null {
  const url   = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

// L1 in-process cache: provider → { cooling, readAt }
const _mem = new Map<string, { cooling: boolean; readAt: number }>();

function memGet(provider: string): boolean | null {
  const e = _mem.get(provider);
  if (!e) return null;
  if (Date.now() - e.readAt > MEM_TTL_MS) { _mem.delete(provider); return null; }
  return e.cooling;
}

function memSet(provider: string, cooling: boolean): void {
  _mem.set(provider, { cooling, readAt: Date.now() });
}

/**
 * Returns true when the provider is known to be rate-limited and should be
 * skipped.  Falls back to `false` if Upstash is unavailable.
 */
export async function isCoolingDown(provider: string): Promise<boolean> {
  const mem = memGet(provider);
  if (mem !== null) return mem;

  const kv = getRedis();
  if (!kv) return false;

  try {
    const val = await kv.get<string>(`${KEY_PREFIX}${provider}`);
    const cooling = val === "1";
    memSet(provider, cooling);
    return cooling;
  } catch {
    return false; // KV unavailable — don't block the call
  }
}

/**
 * Mark a provider as cooling down after a 429.
 * Fire-and-forget — never throws.
 */
export function markCoolingDown(provider: string): void {
  memSet(provider, true);
  const kv = getRedis();
  if (!kv) return;
  kv.set(`${KEY_PREFIX}${provider}`, "1", { ex: RATE_LIMIT_COOLDOWN_S })
    .catch(() => { /* non-fatal */ });
}

/**
 * Clear cooldown after a successful call (optimistic recovery).
 * Only writes to memory — KV TTL handles the rest.
 */
export function clearCooldown(provider: string): void {
  memSet(provider, false);
}
