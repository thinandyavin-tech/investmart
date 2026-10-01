import { executeComplete, executeStream } from "./ai/chain";
import type { AIMessage } from "./ai/types";

// Re-export for callers that reference these constants directly
export const GROQ_CHAT_MODEL     = process.env.GROQ_MODEL     ?? "openai/gpt-oss-120b";
export const GROQ_ANALYSIS_MODEL = process.env.GROQ_MODEL     ?? "openai/gpt-oss-120b";
export const GEMINI_MODEL        = process.env.GEMINI_MODEL   ?? "gemini-3.5-flash";

export type { AIMessage as ChatMessage };

/**
 * Streams a chat completion as SSE.
 * Each token: data: {"token":"..."}\n\n
 * End:        data: [DONE]\n\n
 *
 * Uses the provider chain configured via AI_PRIMARY / AI_FALLBACK env vars.
 */
export function streamChat(
  messages:     AIMessage[],
  systemPrompt: string,
  opts?: { maxTokens?: number; temperature?: number },
): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const enqueue = (s: string): void => { controller.enqueue(enc.encode(s)); };

      const req = {
        messages: [
          { role: "system" as const, content: systemPrompt },
          ...messages,
        ],
        maxTokens:   opts?.maxTokens   ?? 1000,
        temperature: opts?.temperature ?? 0.35,
      };

      try {
        for await (const { chunk } of executeStream(req)) {
          enqueue(`data: ${JSON.stringify({ token: chunk })}\n\n`);
        }
        enqueue("data: [DONE]\n\n");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "AI unavailable";
        enqueue(`data: ${JSON.stringify({ error: msg })}\n\n`);
      } finally {
        controller.close();
      }
    },
  });
}

/**
 * Non-streaming text completion.
 * @throws Error if all configured providers fail.
 */
export async function generateText(
  prompt:       string,
  systemPrompt: string,
  opts?: {
    maxTokens?:   number;
    temperature?: number;
    jsonMode?:    boolean;
    /** @deprecated Use AI_PRIMARY/AI_FALLBACK env vars to select models. */
    groqModel?:   string;
    model?:       string;
  },
): Promise<string> {
  const messages: AIMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user",   content: prompt       },
  ];

  const { result } = await executeComplete({
    messages,
    maxTokens:   opts?.maxTokens,
    temperature: opts?.temperature,
    jsonMode:    opts?.jsonMode,
    model:       opts?.model ?? opts?.groqModel,
  });

  return result;
}
