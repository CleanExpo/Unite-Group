/**
 * Error Reporting Utility
 *
 * Centralised error capture for API routes, server-side code, and client error
 * boundaries. Errors are logged to the console with structured context; on Vercel
 * these surface in Vercel Logs / Observability — the project's monitoring standard
 * (no Sentry).
 */

/**
 * Capture an API / server-side error with optional structured context.
 * Logged to console.error so it lands in Vercel Logs.
 *
 * @param error - The caught error (unknown type from catch blocks)
 * @param context - Optional key-value metadata (route, userId, businessKey, etc.)
 */
export function captureApiError(
  error: unknown,
  context?: Record<string, unknown>
): void {
  const normalisedError =
    error instanceof Error ? error : new Error(String(error))
  console.error('[API Error]', normalisedError, context ?? '')
}

/**
 * Capture a client-side error (e.g. from a React error boundary) with optional
 * structured context. Logged to console.error so it lands in Vercel Logs.
 *
 * @param error - The caught error
 * @param context - Optional metadata (errorBoundary, level, digest, etc.)
 */
export function captureClientError(
  error: unknown,
  context?: Record<string, unknown>
): void {
  const normalisedError =
    error instanceof Error ? error : new Error(String(error))
  console.error('[Client Error]', normalisedError, context ?? '')
}

/**
 * Capture an error server-side and return a SAFE, generic message for the client.
 *
 * Use in API route catch blocks instead of returning `error.message` directly —
 * raw error messages can leak internal detail (stack traces, SQL, provider
 * responses) to the client. The full error is logged via captureApiError; the
 * caller-supplied `clientMessage` is what the client sees.
 *
 * @param error - The caught error (unknown type from catch blocks)
 * @param clientMessage - Safe, generic message to return to the client
 * @param context - Optional structured metadata (route, userId, etc.)
 * @returns The clientMessage, unchanged — for use in NextResponse.json({ error })
 */
export function sanitiseError(
  error: unknown,
  clientMessage: string,
  context?: Record<string, unknown>
): string {
  captureApiError(error, context)
  return clientMessage
}
