import { RetryableError } from "../types";
import type { AIRequest, ProviderAdapter } from "../types";

// Default timeout is longer for local models which may run on CPU
const TIMEOUT_MS     = 30_000;
const RETRYABLE_HTTP = new Set([429, 500, 502, 503, 504]);

interface OpenAIMessage {
  role:    "system" | "user" | "assistant";
  content: string;
}

interface OpenAIChoice {
  message?: { content?: string };
  delta?:   { content?: string };
}

interface OpenAIResponse {
  choices: OpenAIChoice[];
}

function isNetworkError(err: unknown): boolean {
  if (err instanceof Error) {
    return (
      err.name === "AbortError" ||
      err.message.includes("fetch failed") ||
      err.message.includes("ECONNREFUSED") ||
      err.message.includes("timed out")
    );
  }
  return false;
}

/**
 * Adapter for any OpenAI-compatible API endpoint.
 * Works with Ollama (http://localhost:11434/v1), LM Studio, vLLM, and similar.
 *
 * Configure via:
 *   LOCAL_AI_BASE_URL — e.g. http://localhost:11434/v1
 *   LOCAL_AI_MODEL    — e.g. llama3, mistral
 *   LOCAL_AI_API_KEY  — optional; many local servers accept any string
 */
export class OpenAICompatAdapter implements ProviderAdapter {
  readonly name: string;

  constructor(
    private readonly baseUrl: string,
    private readonly defaultModel: string,
    private readonly apiKey: string,
    name?: string,
  ) {
    this.name = name ?? `local:${defaultModel}`;
  }

  async complete(req: AIRequest, signal?: AbortSignal): Promise<string> {
    const model   = req.model ?? this.defaultModel;
    const ctrl    = new AbortController();
    const timer   = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    signal?.addEventListener("abort", () => ctrl.abort());

    const messages: OpenAIMessage[] = req.messages.map((m) => ({
      role:    m.role,
      content: m.content,
    }));

    const body = {
      model,
      messages,
      max_tokens:  req.maxTokens   ?? 800,
      temperature: req.temperature ?? 0.3,
      stream:      false,
      ...(req.jsonMode ? { response_format: { type: "json_object" } } : {}),
    };

    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          ...(this.apiKey ? { "Authorization": `Bearer ${this.apiKey}` } : {}),
        },
        body:   JSON.stringify(body),
        signal: ctrl.signal,
      });

      if (!res.ok) {
        if (RETRYABLE_HTTP.has(res.status)) {
          throw new RetryableError(`local: HTTP ${res.status}`, this.name);
        }
        throw new Error(`local: HTTP ${res.status}`);
      }

      const data = (await res.json()) as OpenAIResponse;
      return data.choices[0]?.message?.content?.trim() ?? "";
    } catch (err) {
      if (err instanceof RetryableError) throw err;
      if (isNetworkError(err)) {
        throw new RetryableError(`local: ${err instanceof Error ? err.message : String(err)}`, this.name);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  async *streamChunks(req: AIRequest, signal?: AbortSignal): AsyncIterable<string> {
    const model   = req.model ?? this.defaultModel;
    const ctrl    = new AbortController();
    const timer   = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    signal?.addEventListener("abort", () => ctrl.abort());

    const messages: OpenAIMessage[] = req.messages.map((m) => ({
      role:    m.role,
      content: m.content,
    }));

    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          ...(this.apiKey ? { "Authorization": `Bearer ${this.apiKey}` } : {}),
        },
        body:   JSON.stringify({ model, messages, stream: true,
          max_tokens: req.maxTokens ?? 1000, temperature: req.temperature ?? 0.35 }),
        signal: ctrl.signal,
      });

      if (!res.ok) {
        if (RETRYABLE_HTTP.has(res.status)) {
          throw new RetryableError(`local: HTTP ${res.status}`, this.name);
        }
        throw new Error(`local: HTTP ${res.status}`);
      }

      if (!res.body) throw new Error("local: no response body for streaming");

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let   buffer  = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";  // keep incomplete last line

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;
          const payload = trimmed.slice(6);
          if (payload === "[DONE]") return;
          try {
            const parsed = JSON.parse(payload) as OpenAIResponse;
            const token  = parsed.choices[0]?.delta?.content ?? "";
            if (token) yield token;
          } catch {
            // Malformed SSE line — skip silently
          }
        }
      }
    } catch (err) {
      if (err instanceof RetryableError) throw err;
      if (isNetworkError(err)) {
        throw new RetryableError(`local: ${err instanceof Error ? err.message : String(err)}`, this.name);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
}
