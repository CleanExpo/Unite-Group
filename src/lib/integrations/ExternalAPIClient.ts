/**
 * ExternalAPIClient — Typed interface for all external API integrations
 * SYN-538: Every external API integration (GBP, Yelp, GSC, Meta Graph) must implement this.
 *
 * This interface establishes the standard contract for:
 * - Fetch with timeout
 * - Retry with exponential backoff
 * - Normalised error response
 * - Quota/rate-limit guard
 *
 * Usage: implement this interface in each integration's client module.
 * Example: src/lib/integrations/gbp/GbpAPIClient.ts implements ExternalAPIClient
 */

// ─── Core types ───────────────────────────────────────────────────────────────

/** Standardised error from any external API call */
export interface ExternalAPIError {
  code: ExternalAPIErrorCode
  message: string
  statusCode?: number
  retryAfterMs?: number
  raw?: unknown // original platform error payload for debugging
}

export type ExternalAPIErrorCode =
  | "AUTH_EXPIRED"       // 401/403 — credentials need refresh
  | "RATE_LIMITED"       // 429 — honour Retry-After
  | "NOT_FOUND"          // 404 — resource doesn't exist
  | "VALIDATION_ERROR"   // 422 — request malformed
  | "SERVER_ERROR"       // 5xx — platform-side failure
  | "TIMEOUT"            // request timed out
  | "NETWORK_ERROR"      // no response received
  | "QUOTA_EXHAUSTED"    // daily/monthly quota hit
  | "PARTIAL_FAILURE"    // 200 with error field in body (common in Meta/GBP)
  | "UNKNOWN"            // unmapped error

/** Result discriminated union — eliminates null checks */
export type ExternalAPIResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ExternalAPIError }

// ─── Request options ──────────────────────────────────────────────────────────

export interface FetchOptions {
  /** Timeout in ms. Default: 10_000 */
  timeoutMs?: number
  /** Max retry attempts on 5xx/429. Default: 3 */
  maxRetries?: number
  /** Base delay for exponential backoff in ms. Default: 1_000 */
  baseRetryDelayMs?: number
  /** Additional headers merged with client defaults */
  headers?: Record<string, string>
}

// ─── Quota guard ──────────────────────────────────────────────────────────────

export interface QuotaGuard {
  /** Unique key for this quota bucket (e.g. "gbp-places-api-daily") */
  key: string
  /** Max calls allowed per window */
  limit: number
  /** Window duration in ms */
  windowMs: number
  /** Current call count in the window */
  remaining(): Promise<number>
  /** Record a call. Returns false if quota exhausted. */
  consume(): Promise<boolean>
  /** Reset the quota (admin use) */
  reset(): Promise<void>
}

// ─── The interface ────────────────────────────────────────────────────────────

export interface ExternalAPIClient<TConfig = Record<string, unknown>> {
  /**
   * Client identifier — used in cost tracking and logs.
   * Example: "gbp-places-api", "yelp-fusion-api"
   */
  readonly name: string

  /**
   * Platform configuration (API keys, base URLs, etc.)
   * Loaded from environment variables — never hardcoded.
   */
  readonly config: TConfig

  /**
   * Performs an authenticated GET request.
   * Handles timeout, retry, and error normalisation automatically.
   */
  get<T>(path: string, options?: FetchOptions): Promise<ExternalAPIResult<T>>

  /**
   * Performs an authenticated POST request.
   */
  post<T>(path: string, body: unknown, options?: FetchOptions): Promise<ExternalAPIResult<T>>

  /**
   * Performs an authenticated PATCH request.
   */
  patch<T>(path: string, body: unknown, options?: FetchOptions): Promise<ExternalAPIResult<T>>

  /**
   * Performs an authenticated DELETE request.
   */
  delete<T>(path: string, options?: FetchOptions): Promise<ExternalAPIResult<T>>

  /**
   * Normalises any platform-specific error response into ExternalAPIError.
   * Each integration implements this to map platform-specific error codes.
   */
  normaliseError(raw: unknown, statusCode: number): ExternalAPIError

  /**
   * Returns true if the client's credentials are valid and not expired.
   * Called before any publish operation.
   */
  isAuthenticated(): Promise<boolean>

  /**
   * Refreshes credentials if possible (e.g. OAuth token refresh).
   * Returns false if refresh fails (requires human re-auth).
   */
  refreshCredentials(): Promise<boolean>

  /**
   * Returns the quota guard for this client.
   * Used to check remaining quota before batch operations.
   */
  quotaGuard(): QuotaGuard
}

// ─── Base implementation helper ───────────────────────────────────────────────

/**
 * Retry helper with exponential backoff.
 * Call this from your ExternalAPIClient.get/post/patch/delete implementations.
 */
export async function withRetry<T>(
  fn: () => Promise<ExternalAPIResult<T>>,
  maxRetries: number = 3,
  baseDelayMs: number = 1_000
): Promise<ExternalAPIResult<T>> {
  let lastResult: ExternalAPIResult<T> = { ok: false, error: { code: "UNKNOWN", message: "No attempts made" } }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    lastResult = await fn()

    if (lastResult.ok) return lastResult

    const { code, retryAfterMs } = lastResult.error
    const shouldRetry = code === "SERVER_ERROR" || code === "RATE_LIMITED" || code === "TIMEOUT"

    if (!shouldRetry || attempt >= maxRetries) break

    const delay = retryAfterMs ?? baseDelayMs * Math.pow(2, attempt)
    await new Promise((resolve) => setTimeout(resolve, delay))
  }

  return lastResult
}

/**
 * Wraps a fetch call with a timeout.
 */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number = 10_000
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Type guard: checks if a value is an ExternalAPIError
 */
export function isExternalAPIError(val: unknown): val is ExternalAPIError {
  return (
    typeof val === "object" &&
    val !== null &&
    "code" in val &&
    "message" in val &&
    typeof (val as ExternalAPIError).message === "string"
  )
}
