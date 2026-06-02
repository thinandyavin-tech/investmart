import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ─── Model constants ──────────────────────────────────────────────────────────
// Change models here only; not scattered across routes.
export const GROQ_CHAT_MODEL     = "llama-3.1-8b-instant";    // 500k TPD free tier
export const GROQ_ANALYSIS_MODEL = "llama-3.1-8b-instant";    // 500k TPD — 70b hits 100k limit too fast
export const GEMINI_MODEL        = "gemini-2.0-flash";        // Fallback for all operations

// ─── Retry / timeout config ───────────────────────────────────────────────────
const GROQ_TIMEOUT_MS    = 12_000;
const GEMINI_TIMEOUT_MS  = 15_000;

// HTTP status codes that trigger a provider fallback (quota, overload, server error)
const FALLBACK_STATUSES  = new Set([429, 500, 502, 503, 504]);

// ─── Lazy singletons ──────────────────────────────────────────────────────────

let _groq: Groq | null = null;
function getGroq(): Groq {
  if (!_groq) _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return _groq;
}

let _gemini: GoogleGenerativeAI | null = null;
function getGemini(): GoogleGenerativeAI {
  if (!_gemini) _gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  return _gemini;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** True when an error from Groq SDK should trigger the fallback provider. */
function isGroqFallbackError(err: unknown): boolean {
  if (err instanceof Groq.APIError) {
    return FALLBACK_STATUSES.has(err.status);
  }
  // Timeout / abort
  if (err instanceof Error && (err.name === "AbortError" || err.message.includes("timed out"))) {
    return true;
  }
  return false;
}

/** True when an error from the Gemini SDK should be reported as quota/overload. */
function isGeminiOverloadError(err: unknown): boolean {
  if (err instanceof Error) {
    return /429|quota|Resource has been exhausted|overloaded/i.test(err.message);
  }
  return false;
}

// ─── Public API: streamChat ───────────────────────────────────────────────────

export interface ChatMessage {
  role:    "user" | "assistant";
  content: string;
}

/**
 * Streams a chat completion as SSE.
 * Each token arrives as:  data: {"token":"..."}\n\n
 * End of stream signals:  data: [DONE]\n\n
 *
 * Falls back from Groq (llama-3.1-8b-instant) to Gemini on 429/503/timeout.
 */
export function streamChat(
  messages:     ChatMessage[],
  systemPrompt: string,
): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const enqueue = (s: string): void => { controller.enqueue(enc.encode(s)); };

      // ── Try Groq first ────────────────────────────────────────────────────
      if (process.env.GROQ_API_KEY) {
        try {
          const abortCtrl = new AbortController();
          const timer     = setTimeout(() => abortCtrl.abort(), GROQ_TIMEOUT_MS);

          const groqStream = await getGroq().chat.completions.create(
            {
              model:       GROQ_CHAT_MODEL,
              messages:    [{ role: "system", content: systemPrompt }, ...messages],
              stream:      true,
              max_tokens:  1000,
              temperature: 0.35,
            },
            { signal: abortCtrl.signal },
          );

          try {
            for await (const chunk of groqStream) {
              const token = chunk.choices[0]?.delta?.content ?? "";
              if (token) enqueue(`data: ${JSON.stringify({ token })}\n\n`);
            }
            enqueue("data: [DONE]\n\n");
            return;
          } finally {
            clearTimeout(timer);
          }
        } catch (err) {
          if (!isGroqFallbackError(err)) {
            const msg = err instanceof Error ? err.message : "Groq stream error";
            enqueue(`data: ${JSON.stringify({ error: msg })}\n\n`);
            controller.close();
            return;
          }
          // Fall through to Gemini fallback
          enqueue(`data: ${JSON.stringify({ token: "" })}\n\n`); // keep stream alive
        }
      }

      // ── Gemini fallback ───────────────────────────────────────────────────
      if (!process.env.GEMINI_API_KEY) {
        enqueue(`data: ${JSON.stringify({ error: "Both AI providers unavailable" })}\n\n`);
        controller.close();
        return;
      }

      try {
        const model  = getGemini().getGenerativeModel({
          model:            GEMINI_MODEL,
          systemInstruction: systemPrompt,
          generationConfig: { maxOutputTokens: 1000, temperature: 0.35 },
        });

        const abortCtrl = new AbortController();
        const timer     = setTimeout(() => abortCtrl.abort(), GEMINI_TIMEOUT_MS);

        try {
          // GenerateContentRequest shape required by SDK v0.24+
          const result = await model.generateContentStream(
            {
              contents: messages.map(m => ({
                role:  m.role === "assistant" ? "model" : "user",
                parts: [{ text: m.content }],
              })),
            },
            { signal: abortCtrl.signal },
          );

          for await (const chunk of result.stream) {
            const token = chunk.text();
            if (token) enqueue(`data: ${JSON.stringify({ token })}\n\n`);
          }
          enqueue("data: [DONE]\n\n");
        } finally {
          clearTimeout(timer);
          abortCtrl.abort(); // no-op if already done
        }
      } catch (err) {
        const msg = isGeminiOverloadError(err) ? "Gemini quota exceeded" : "Both AI providers unavailable";
        enqueue(`data: ${JSON.stringify({ error: msg })}\n\n`);
      } finally {
        controller.close();
      }
    },
  });
}

// ─── Public API: generateText ─────────────────────────────────────────────────

/**
 * Generates a full text completion (non-streaming).
 * Falls back from Groq (llama-3.3-70b-versatile) to Gemini on 429/503/timeout.
 *
 * @throws Error with a descriptive message if both providers fail.
 */
export async function generateText(
  prompt:       string,
  systemPrompt: string,
  opts?: {
    maxTokens?:      number;
    temperature?:    number;
    jsonMode?:       boolean;  // request JSON-formatted output from the provider
    groqModel?:      string;   // override; defaults to GROQ_ANALYSIS_MODEL
  },
): Promise<string> {
  const maxTokens   = opts?.maxTokens   ?? 800;
  const temperature = opts?.temperature ?? 0.3;
  const jsonMode    = opts?.jsonMode    ?? false;
  const groqModel   = opts?.groqModel   ?? GROQ_ANALYSIS_MODEL;

  // ── Try Groq first ──────────────────────────────────────────────────────────
  if (process.env.GROQ_API_KEY) {
    try {
      const completion = await getGroq().chat.completions.create({
        model:           groqModel,
        messages:        [
          { role: "system", content: systemPrompt },
          { role: "user",   content: prompt       },
        ],
        ...(jsonMode ? { response_format: { type: "json_object" as const } } : {}),
        max_tokens:      maxTokens,
        temperature,
      });

      const text = completion.choices[0]?.message?.content?.trim() ?? "";
      if (!text) throw new Error("Groq returned empty response");
      return text;
    } catch (err) {
      if (!isGroqFallbackError(err)) {
        // Non-retriable Groq error (bad request, auth, etc.)
        const msg = err instanceof Error ? err.message : "Groq error";
        if (err instanceof Groq.APIError && err.status === 429) {
          throw new Error(`Groq quota exceeded: ${msg}`);
        }
        throw new Error(msg);
      }
      // Transient Groq error — fall through to Gemini
    }
  }

  // ── Gemini fallback ─────────────────────────────────────────────────────────
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Both AI providers unavailable: no API keys configured");
  }

  try {
    const mimeType = jsonMode ? "application/json" : "text/plain";
    const model    = getGemini().getGenerativeModel({
      model:            GEMINI_MODEL,
      systemInstruction: systemPrompt,
      generationConfig: {
        responseMimeType: mimeType,
        maxOutputTokens:  maxTokens,
        temperature,
      },
    });

    const abortCtrl = new AbortController();
    const timer     = setTimeout(() => abortCtrl.abort(), GEMINI_TIMEOUT_MS);

    try {
      const result = await model.generateContent(prompt, { signal: abortCtrl.signal });
      return result.response.text().trim();
    } finally {
      clearTimeout(timer);
    }
  } catch (err) {
    if (isGeminiOverloadError(err)) {
      throw new Error("Groq quota exceeded — Gemini also unavailable (quota)");
    }
    const msg = err instanceof Error ? err.message : "Gemini error";
    throw new Error(`Both AI providers unavailable: ${msg}`);
  }
}
