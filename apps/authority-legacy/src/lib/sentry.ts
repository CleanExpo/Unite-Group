import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';

type RouteHandler = (
  request: NextRequest,
  context?: Record<string, unknown>,
) => Promise<NextResponse>;

/**
 * Wraps an API route handler with Sentry error capture.
 * 
 * Usage:
 *   export const POST = withSentry(async (request) => {
 *     // your handler
 *   });
 * 
 * This automatically captures any unhandled exceptions and attaches
 * request context (URL, method, query params) to the Sentry event.
 */
export function withSentry(handler: RouteHandler): RouteHandler {
  return async (request: NextRequest, context?: Record<string, unknown>) => {
    try {
      // Set Sentry context for this request
      Sentry.setContext('request', {
        method: request.method,
        url: request.url,
        queryString: request.nextUrl.search,
      });

      return await handler(request, context);
    } catch (error) {
      Sentry.captureException(error, {
        extra: {
          method: request.method,
          url: request.url,
        },
      });
      throw error; // Re-throw to let Next.js handle the response
    }
  };
}
