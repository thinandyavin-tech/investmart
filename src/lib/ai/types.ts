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
 */
export class RetryableError extends Error {
  constructor(message: string, readonly provider: string) {
    super(message);
    this.name = "RetryableError";
  }
}

export interface ProviderAdapter {
  readonly name: string;
  complete(req: AIRequest, signal?: AbortSignal): Promise<string>;
  streamChunks(req: AIRequest, signal?: AbortSignal): AsyncIterable<string>;
}
