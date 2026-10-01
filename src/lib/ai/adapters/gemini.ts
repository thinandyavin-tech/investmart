import { GoogleGenerativeAI } from "@google/generative-ai";

import { RetryableError } from "../types";
import type { AIMessage, AIRequest, ProviderAdapter } from "../types";

const DEFAULT_MODEL = "gemini-3.5-flash";  // gemini-2.0-flash was retired by Google
const TIMEOUT_MS    = 15_000;
// Gemini 3.x thinks by default and the thinking counts against maxOutputTokens,
// which cut answers off mid-sentence. Not in this SDK's types, but it is sent as-is.
const MINIMAL_THINKING = { thinkingConfig: { thinkingLevel: "minimal" } } as Record<string, unknown>;

function isRetryable(err: unknown): boolean {
  if (err instanceof Error) {
    return /429|quota|Resource has been exhausted|overloaded|limit:\s*0|too many requests/i.test(err.message);
  }
  return false;
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function splitMessages(messages: AIMessage[]): {
  systemInstruction: string | undefined;
  contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }>;
} {
  const systemInstruction = messages.find((m) => m.role === "system")?.content;
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role:  m.role === "assistant" ? ("model" as const) : ("user" as const),
      parts: [{ text: m.content }],
    }));
  return { systemInstruction, contents };
}

export class GeminiAdapter implements ProviderAdapter {
  readonly name = "gemini";
  private readonly client: GoogleGenerativeAI;
  private readonly defaultModel: string;

  constructor(apiKey: string) {
    this.client       = new GoogleGenerativeAI(apiKey);
    this.defaultModel = process.env.GEMINI_MODEL ?? DEFAULT_MODEL;
  }

  async complete(req: AIRequest, signal?: AbortSignal): Promise<string> {
    const modelName = req.model ?? this.defaultModel;
    const { systemInstruction, contents } = splitMessages(req.messages);

    const model = this.client.getGenerativeModel({
      model:             modelName,
      systemInstruction: systemInstruction,
      generationConfig:  {
        ...(req.jsonMode ? { responseMimeType: "application/json" } : { responseMimeType: "text/plain" }),
        maxOutputTokens: req.maxTokens   ?? 800,
        temperature:     req.temperature ?? 0.3,
        ...MINIMAL_THINKING,
      },
    });

    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    signal?.addEventListener("abort", () => ctrl.abort());

    try {
      const result = await model.generateContent({ contents }, { signal: ctrl.signal });
      return result.response.text().trim();
    } catch (err) {
      if (isRetryable(err)) throw new RetryableError(`gemini: ${errMsg(err)}`, "gemini");
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  async *streamChunks(req: AIRequest, signal?: AbortSignal): AsyncIterable<string> {
    const modelName = req.model ?? this.defaultModel;
    const { systemInstruction, contents } = splitMessages(req.messages);

    const model = this.client.getGenerativeModel({
      model:             modelName,
      systemInstruction: systemInstruction,
      generationConfig:  {
        maxOutputTokens: req.maxTokens   ?? 1000,
        temperature:     req.temperature ?? 0.35,
        ...MINIMAL_THINKING,
      },
    });

    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    signal?.addEventListener("abort", () => ctrl.abort());

    try {
      const result = await model.generateContentStream({ contents }, { signal: ctrl.signal });
      for await (const chunk of result.stream) {
        const token = chunk.text();
        if (token) yield token;
      }
    } catch (err) {
      if (isRetryable(err)) throw new RetryableError(`gemini: ${errMsg(err)}`, "gemini");
      throw err;
    } finally {
      clearTimeout(timer);
      ctrl.abort(); // clean up if stream completes normally
    }
  }
}
