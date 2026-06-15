import { GroqAdapter }          from "./adapters/groq";
import { GeminiAdapter }        from "./adapters/gemini";
import { OpenAICompatAdapter }  from "./adapters/openaiCompat";
import { RetryableError }       from "./types";
import { isCoolingDown, markCoolingDown, clearCooldown } from "./health";
import type { AIRequest, ProviderAdapter } from "./types";

// Re-export so callers can import from one place
export type { AIRequest } from "./types";

// ── Provider base URLs and default models ─────────────────────────────────────

const CEREBRAS_BASE_URL      = "https://api.cerebras.ai/v1";
const CEREBRAS_DEFAULT_MODEL = "gpt-oss-120b";

const NVIDIA_NIM_BASE_URL     = "https://integrate.api.nvidia.com/v1";
const NVIDIA_NIM_DEFAULT_MODEL = "meta/llama-3.1-8b-instruct";

// ── Chain construction ────────────────────────────────────────────────────────

type BuiltInProvider = "cerebras" | "groq" | "nvidia" | "gemini" | "local";

function buildAdapter(name: BuiltInProvider): ProviderAdapter | null {
  switch (name) {
    case "cerebras": {
      const key = process.env.CEREBRAS_API_KEY;
      if (!key) return null;
      return new OpenAICompatAdapter(CEREBRAS_BASE_URL, CEREBRAS_DEFAULT_MODEL, key, "cerebras");
    }
    case "groq": {
      const key = process.env.GROQ_API_KEY;
      return key ? new GroqAdapter(key) : null;
    }
    case "nvidia": {
      const key = process.env.NVIDIA_NIM_API_KEY;
      if (!key) return null;
      return new OpenAICompatAdapter(NVIDIA_NIM_BASE_URL, NVIDIA_NIM_DEFAULT_MODEL, key, "nvidia-nim");
    }
    case "gemini": {
      const key = process.env.GEMINI_API_KEY;
      return key ? new GeminiAdapter(key) : null;
    }
    case "local": {
      // Only available outside Vercel (dev/self-hosted). Vercel cannot reach localhost.
      if (process.env.VERCEL) return null;
      const baseUrl = process.env.LOCAL_AI_BASE_URL;
      const model   = process.env.LOCAL_AI_MODEL   ?? "llama3";
      const apiKey  = process.env.LOCAL_AI_API_KEY ?? "";
      return baseUrl ? new OpenAICompatAdapter(baseUrl, model, apiKey, "local") : null;
    }
  }
}

function parseProvider(raw: string): BuiltInProvider | null {
  const v = raw.trim().toLowerCase() as BuiltInProvider;
  const valid: BuiltInProvider[] = ["cerebras", "groq", "nvidia", "gemini", "local"];
  return valid.includes(v) ? v : null;
}

/**
 * Builds the ordered provider chain from env config.
 *
 * AI_PRIMARY  — first provider (default: cerebras)
 * AI_FALLBACK — comma-separated fallbacks (default: groq,nvidia,gemini)
 *
 * Default order (highest-capacity first): Cerebras → Groq → NVIDIA NIM → Gemini
 * Any provider missing its API key is silently skipped.
 * Local/Ollama is excluded on Vercel (process.env.VERCEL is set).
 */
function buildChain(): ProviderAdapter[] {
  const primaryName = parseProvider(process.env.AI_PRIMARY ?? "cerebras") ?? "cerebras";
  const fallbackNames = (process.env.AI_FALLBACK ?? "groq,nvidia,gemini")
    .split(",")
    .map((s) => parseProvider(s))
    .filter((n): n is BuiltInProvider => n !== null);

  const seen     = new Set<BuiltInProvider>();
  const adapters: ProviderAdapter[] = [];

  const tryAdd = (name: BuiltInProvider): void => {
    if (seen.has(name)) return;
    seen.add(name);
    const adapter = buildAdapter(name);
    if (adapter) adapters.push(adapter);
  };

  tryAdd(primaryName);
  for (const name of fallbackNames) tryAdd(name);

  // Append any credentialed built-in (not local) as last resort
  for (const name of ["cerebras", "groq", "nvidia", "gemini"] as BuiltInProvider[]) {
    tryAdd(name);
  }

  // Local only in dev (already guarded in buildAdapter, but make intent explicit)
  tryAdd("local");

  if (adapters.length === 0) {
    console.warn("[ai] No providers configured — set CEREBRAS_API_KEY, GROQ_API_KEY, or GEMINI_API_KEY");
  }

  return adapters;
}

// Cached after first call; rebuilt on cold start (env vars fixed per deploy)
let _chain: ProviderAdapter[] | null = null;

function getChain(): ProviderAdapter[] {
  if (!_chain) _chain = buildChain();
  return _chain;
}

/** Log provider usage — no secrets, no prompt content. */
function logCall(provider: string, latencyMs: number, fallback: boolean): void {
  // eslint-disable-next-line no-console
  console.info(`[ai] provider=${provider} latency=${latencyMs}ms fallback=${fallback}`);
}

/**
 * Non-streaming completion through the provider chain.
 * Skips providers currently cooling down (429); marks them on rate-limit errors.
 */
export async function executeComplete(req: AIRequest): Promise<{ result: string; provider: string }> {
  const chain = getChain();
  if (chain.length === 0) throw new Error("No AI providers configured");

  const errors: string[] = [];

  for (let i = 0; i < chain.length; i++) {
    const adapter = chain[i]!;

    // Skip providers known to be rate-limited (KV-backed, 15-min cooldown)
    if (await isCoolingDown(adapter.name)) {
      errors.push(`${adapter.name}: cooling down (rate limited)`);
      continue;
    }

    const t0 = Date.now();
    try {
      const result = await adapter.complete(req);
      clearCooldown(adapter.name); // optimistic recovery
      logCall(adapter.name, Date.now() - t0, i > 0);
      return { result, provider: adapter.name };
    } catch (err) {
      if (err instanceof RetryableError) {
        if (err.statusCode === 429) markCoolingDown(adapter.name);
        errors.push(`${adapter.name}: ${err.message}`);
        continue;
      }
      throw err;
    }
  }

  throw new Error(`All AI providers failed: ${errors.join("; ")}`);
}

/**
 * Streaming text through the provider chain.
 * Falls back only before the first chunk is yielded; mid-stream errors propagate.
 * Skips providers in cooldown; marks 429s.
 */
export async function *executeStream(
  req: AIRequest,
): AsyncIterable<{ chunk: string; provider: string }> {
  const chain = getChain();
  if (chain.length === 0) throw new Error("No AI providers configured");

  const errors: string[] = [];

  for (let i = 0; i < chain.length; i++) {
    const adapter    = chain[i]!;

    if (await isCoolingDown(adapter.name)) {
      errors.push(`${adapter.name}: cooling down`);
      continue;
    }

    const t0         = Date.now();
    let   hasYielded = false;

    try {
      for await (const chunk of adapter.streamChunks(req)) {
        if (!hasYielded) {
          clearCooldown(adapter.name);
          logCall(adapter.name, Date.now() - t0, i > 0);
          hasYielded = true;
        }
        yield { chunk, provider: adapter.name };
      }
      return;
    } catch (err) {
      if (!hasYielded && err instanceof RetryableError) {
        if (err.statusCode === 429) markCoolingDown(adapter.name);
        errors.push(`${adapter.name}: ${err.message}`);
        continue;
      }
      throw err;
    }
  }

  throw new Error(`All AI providers failed (stream): ${errors.join("; ")}`);
}
