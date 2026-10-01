import Groq from "groq-sdk";

import { RetryableError } from "../types";
import type { AIRequest, ProviderAdapter } from "../types";

const DEFAULT_MODEL  = "openai/gpt-oss-120b";  // llama-3.3-70b-versatile was retired by Groq
const TIMEOUT_MS     = 12_000;
const RETRYABLE_HTTP = new Set([429, 500, 502, 503, 504]);

function isRetryable(err: unknown): boolean {
  if (err instanceof Groq.APIError) return RETRYABLE_HTTP.has(err.status);
  if (err instanceof Error) return err.name === "AbortError" || err.message.includes("timed out");
  return false;
}

// gpt-oss models think before answering; keep that short so answers stay fast and fit max_tokens.
function reasoning(model: string): { reasoning_effort?: "low" } {
  return model.startsWith("openai/gpt-oss") ? { reasoning_effort: "low" } : {};
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export class GroqAdapter implements ProviderAdapter {
  readonly name = "groq";
  private readonly client: Groq;
  private readonly defaultModel: string;

  constructor(apiKey: string) {
    this.client       = new Groq({ apiKey });
    this.defaultModel = process.env.GROQ_MODEL ?? DEFAULT_MODEL;
  }

  async complete(req: AIRequest, signal?: AbortSignal): Promise<string> {
    const model = req.model ?? this.defaultModel;
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    signal?.addEventListener("abort", () => ctrl.abort());

    try {
      const res = await this.client.chat.completions.create(
        {
          model,
          messages:    req.messages.map((m) => ({ role: m.role, content: m.content })),
          max_tokens:  req.maxTokens   ?? 800,
          temperature: req.temperature ?? 0.3,
          ...reasoning(model),
          ...(req.jsonMode ? { response_format: { type: "json_object" as const } } : {}),
        },
        { signal: ctrl.signal },
      );

      const text = res.choices[0]?.message?.content?.trim() ?? "";
      if (!text) throw new Error("Groq returned empty response");
      return text;
    } catch (err) {
      if (err instanceof Groq.APIError && RETRYABLE_HTTP.has(err.status)) {
        throw new RetryableError(`groq: ${errMsg(err)}`, "groq", err.status);
      }
      if (isRetryable(err)) throw new RetryableError(`groq: ${errMsg(err)}`, "groq");
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  async *streamChunks(req: AIRequest, signal?: AbortSignal): AsyncIterable<string> {
    const model = req.model ?? this.defaultModel;
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    signal?.addEventListener("abort", () => ctrl.abort());

    try {
      const stream = await this.client.chat.completions.create(
        {
          model,
          messages:    req.messages.map((m) => ({ role: m.role, content: m.content })),
          stream:      true,
          max_tokens:  req.maxTokens   ?? 1000,
          temperature: req.temperature ?? 0.35,
          ...reasoning(model),
        },
        { signal: ctrl.signal },
      );

      for await (const chunk of stream) {
        const token = chunk.choices[0]?.delta?.content ?? "";
        if (token) yield token;
      }
    } catch (err) {
      if (isRetryable(err)) throw new RetryableError(`groq: ${errMsg(err)}`, "groq");
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
}
