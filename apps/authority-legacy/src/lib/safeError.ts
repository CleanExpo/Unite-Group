// Tiny helper to sanitise error responses across our API routes.
//
// Per deepsec-2026-05-14: 4/4 audited routes leaked `err.message` into the
// JSON response (`detail: err.message`). Supabase / Stripe / Resend errors
// can carry schema names, key suffixes, recipient emails. Server-side
// logging is fine; client-side leakage is the P1 we close.
//
// Usage:
//   import { safeError } from '@/lib/safeError';
//   return NextResponse.json(safeError('insert_failed', error), { status: 500 });
//
// Returns `{ error: <stable code>, request_id: <ulid> }`. The full original
// error is captured to console.error with the same request_id so a server
// log line + the client-side request_id correlate uniquely.
import crypto from 'crypto';

export type SafeErrorPayload = {
  error: string;
  request_id: string;
};

export function safeError(code: string, rawError?: unknown): SafeErrorPayload {
  const request_id = crypto.randomBytes(12).toString('base64url');
  // eslint-disable-next-line no-console
  console.error(`[${request_id}] ${code}:`, rawError);
  return { error: code, request_id };
}
