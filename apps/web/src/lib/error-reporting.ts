/**
 * Error Reporting Utility
 *
 * Centralised error capture for API routes and server-side code.
 * Wraps Sentry.captureException with structured context and console.error fallback.
 */

import * as Sentry from '@sentry/nextjs'

/**
 * Capture an API error in Sentry with optional structured context.
 * Always logs to console.error as a fallback regardless of Sentry availability.
 *
 * @param error - The caught error (unknown type from catch blocks)
 * @param context - Optional key-value metadata (route, userId, businessKey, etc.)
 */
export function captureApiError(
  error: unknown,
  context?: Record<string, unknown>
): void {
  // Always log to console as fallback
  console.error('[API Error]', error, context ?? '')

  // Normalise to Error instance for Sentry
  const normalisedError =
    error instanceof Error ? error : new Error(String(error))

  try {
    Sentry.captureException(normalisedError, {
      tags: {
        layer: 'api',
        ...(typeof context?.route === 'string' ? { route: context.route } : {}),
      },
      extra: context,
    })
  } catch (sentryError) {
    // Sentry itself failed -- don't let monitoring break the app
    console.error('[Sentry] Failed to capture exception:', sentryError)
  }
}

/**
 * Capture an error server-side and return a SAFE, generic message for the client.
 *
 * Use in API route catch blocks instead of returning `error.message` directly —
 * raw error messages can leak internal detail (stack traces, SQL, provider
 * responses) to the client. The full error is logged to console + Sentry via
 * captureApiError; the caller-supplied `clientMessage` is what the client sees.
 *
 * @param error - The caught error (unknown type from catch blocks)
 * @param clientMessage - Safe, generic message to return to the client
 * @param context - Optional structured metadata for Sentry (route, userId, etc.)
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
