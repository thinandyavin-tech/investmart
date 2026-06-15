/**
 * Shared AI utilities used across API routes.
 */

/**
 * Returns true when at least one AI provider is configured.
 * Covers all supported providers — update this when adding new ones.
 */
export function hasAiProvider(): boolean {
  return !!(
    process.env.CEREBRAS_API_KEY   ||
    process.env.GROQ_API_KEY       ||
    process.env.NVIDIA_NIM_API_KEY ||
    process.env.GEMINI_API_KEY     ||
    process.env.LOCAL_AI_BASE_URL
  );
}

/**
 * Robustly extracts a JSON object or array from an AI response string.
 *
 * Models sometimes wrap JSON in markdown fences (```json ... ```) or add
 * preamble text ("Here is the analysis: {...}"). This function handles all
 * common patterns so callers don't have to.
 *
 * Throws if no valid JSON can be found.
 */
export function extractJson(raw: string): string {
  // 1. Direct parse — fastest path when the model returns clean JSON
  const trimmed = raw.trim();
  try { JSON.parse(trimmed); return trimmed; } catch { /* continue */ }

  // 2. Strip markdown fences (```json ... ``` or ``` ... ```)
  const fenceStripped = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  try { JSON.parse(fenceStripped); return fenceStripped; } catch { /* continue */ }

  // 3. Extract the outermost {...} block (handles preamble text)
  const objMatch = fenceStripped.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try { JSON.parse(objMatch[0]); return objMatch[0]; } catch { /* continue */ }
  }

  // 4. Extract the outermost [...] block (array responses)
  const arrMatch = fenceStripped.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    try { JSON.parse(arrMatch[0]); return arrMatch[0]; } catch { /* continue */ }
  }

  throw new Error(`Could not extract valid JSON from AI response. Raw (first 200 chars): ${raw.slice(0, 200)}`);
}
