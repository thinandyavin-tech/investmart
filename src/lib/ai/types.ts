export interface AIMessage {
  role:    "system" | "user" | "assistant";
  content: string;
}

export interface AIRequest {
  messages:     AIMessage[];
  maxTokens?:   number;
  temperature?: number;
  jsonMode?:    boolean;
  model?:       string;  // provider-specific override; falls back to env var then default
}

/**
 * Thrown by adapters for transient failures (rate limit, overload, timeout).
 * The chain catches this to try the next adapter in the fallback sequence.
 * Non-retryable errors (bad request, auth, etc.) are thrown as plain Error.
 *
 * statusCode carries the HTTP status when known — used by the health tracker
 * to distinguish 429 (long cooldown) from 5xx/timeout (short cooldown).
 */
export class RetryableError extends Error {
  constructor(
    message: string,
    readonly provider: string,
    readonly statusCode?: number,
  ) {
    super(message);
    this.name = "RetryableError";
  }
}

export interface ProviderAdapter {
  readonly name: string;
  complete(req: AIRequest, signal?: AbortSignal): Promise<string>;
  streamChunks(req: AIRequest, signal?: AbortSignal): AsyncIterable<string>;
}
