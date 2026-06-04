import Groq from "groq-sdk";

import { RetryableError } from "../types";
import type { AIRequest, ProviderAdapter } from "../types";

const DEFAULT_MODEL  = "llama-3.3-70b-versatile";
const TIMEOUT_MS     = 12_000;
const RETRYABLE_HTTP = new Set([429, 500, 502, 503, 504]);

function isRetryable(err: unknown): boolean {
  if (err instanceof Groq.APIError) return RETRYABLE_HTTP.has(err.status);
  if (err instanceof Error) return err.name === "AbortError" || err.message.includes("timed out");
  return false;
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
          ...(req.jsonMode ? { response_format: { type: "json_object" as const } } : {}),
        },
        { signal: ctrl.signal },
      );

      const text = res.choices[0]?.message?.content?.trim() ?? "";
      if (!text) throw new Error("Groq returned empty response");
      return text;
    } catch (err) {
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
