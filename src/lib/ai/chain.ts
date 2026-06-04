import { GroqAdapter }          from "./adapters/groq";
import { GeminiAdapter }        from "./adapters/gemini";
import { OpenAICompatAdapter }  from "./adapters/openaiCompat";
import { RetryableError }       from "./types";
import type { AIRequest, ProviderAdapter } from "./types";

// Re-export so callers can import from one place
export type { AIRequest } from "./types";

type BuiltInProvider = "groq" | "gemini" | "local";

function buildAdapter(name: BuiltInProvider): ProviderAdapter | null {
  switch (name) {
    case "groq": {
      const key = process.env.GROQ_API_KEY;
      return key ? new GroqAdapter(key) : null;
    }
    case "gemini": {
      const key = process.env.GEMINI_API_KEY;
      return key ? new GeminiAdapter(key) : null;
    }
    case "local": {
      const baseUrl = process.env.LOCAL_AI_BASE_URL;
      const model   = process.env.LOCAL_AI_MODEL   ?? "llama3";
      const apiKey  = process.env.LOCAL_AI_API_KEY ?? "";
      return baseUrl ? new OpenAICompatAdapter(baseUrl, model, apiKey) : null;
    }
  }
}

function parseProvider(raw: string): BuiltInProvider | null {
  const v = raw.trim().toLowerCase();
  if (v === "groq" || v === "gemini" || v === "local") return v;
  return null;
}

/**
 * Builds the ordered list of provider adapters from env config.
 *
 * AI_PRIMARY  — first provider to try (default: groq)
 * AI_FALLBACK — comma-separated fallback providers (default: gemini)
 *
 * Any provider that is missing its API key/URL is silently skipped.
 * The two built-in providers (groq + gemini) are always appended as last-resort
 * fallbacks if they have credentials and haven't already been included.
 */
function buildChain(): ProviderAdapter[] {
  const primaryName  = parseProvider(process.env.AI_PRIMARY  ?? "groq")   ?? "groq";
  const fallbackNames = (process.env.AI_FALLBACK ?? "gemini")
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

  // Append any credentialed built-in provider not yet in the chain as last resort
  for (const name of ["groq", "gemini", "local"] as BuiltInProvider[]) {
    tryAdd(name);
  }

  return adapters;
}

// Cached after first call; rebuilt on cold start (env vars are fixed per deploy)
let _chain: ProviderAdapter[] | null = null;

function getChain(): ProviderAdapter[] {
  if (!_chain) _chain = buildChain();
  return _chain;
}

/** Log which provider handled a call — no secrets, no prompt content. */
function logCall(provider: string, latencyMs: number, fallback: boolean): void {
  // eslint-disable-next-line no-console
  console.info(`[ai] provider=${provider} latency=${latencyMs}ms fallback=${fallback}`);
}

/**
 * Runs a non-streaming completion through the provider chain.
 * Tries each adapter in order; moves to the next on RetryableError.
 */
export async function executeComplete(req: AIRequest): Promise<{ result: string; provider: string }> {
  const chain = getChain();
  if (chain.length === 0) throw new Error("No AI providers configured — set GROQ_API_KEY or GEMINI_API_KEY");

  const errors: string[] = [];

  for (let i = 0; i < chain.length; i++) {
    const adapter = chain[i]!;
    const t0      = Date.now();

    try {
      const result = await adapter.complete(req);
      logCall(adapter.name, Date.now() - t0, i > 0);
      return { result, provider: adapter.name };
    } catch (err) {
      if (err instanceof RetryableError) {
        errors.push(err.message);
        continue;
      }
      throw err;
    }
  }

  throw new Error(`All AI providers failed: ${errors.join("; ")}`);
}

/**
 * Streams text chunks through the provider chain.
 * Falls back to the next adapter only if the failure occurs before any chunk is yielded.
 * Mid-stream errors are propagated as-is.
 */
export async function *executeStream(
  req: AIRequest,
): AsyncIterable<{ chunk: string; provider: string }> {
  const chain = getChain();
  if (chain.length === 0) throw new Error("No AI providers configured");

  const errors: string[] = [];

  for (let i = 0; i < chain.length; i++) {
    const adapter    = chain[i]!;
    const t0         = Date.now();
    let   hasYielded = false;

    try {
      for await (const chunk of adapter.streamChunks(req)) {
        if (!hasYielded) {
          logCall(adapter.name, Date.now() - t0, i > 0);
          hasYielded = true;
        }
        yield { chunk, provider: adapter.name };
      }
      return; // stream completed successfully
    } catch (err) {
      if (!hasYielded && err instanceof RetryableError) {
        errors.push(err.message);
        continue; // try next adapter before any output was sent
      }
      throw err; // non-retryable or mid-stream error
    }
  }

  throw new Error(`All AI providers failed (stream): ${errors.join("; ")}`);
}
