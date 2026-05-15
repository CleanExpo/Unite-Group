// Constant-time string comparison helpers for bearer / token auth.
//
// Per deepsec-scan-batch2-2026-05-14 P0 finding repeated across 14 routes:
// JS's `===` short-circuits on length mismatch and prefix divergence, leaking
// information about the secret via response-time. With CRON_SECRET, PI_CEO_API_KEY,
// or INTERNAL_API_SECRET as the secret, an attacker can brute-force the value via
// timing if they get enough samples. `crypto.timingSafeEqual` runs in time
// proportional to the BUFFER LENGTH and ignores actual content — that's the fix.
//
// Two surfaces:
//   * timingSafeBearerMatch — for `authorization: Bearer <secret>` headers
//   * timingSafeTokenMatch  — for plain `<secret>` values (e.g. an admin-token
//                             body field or a custom x-internal-secret header)
//
// Both fail-closed on missing / empty inputs. Both pre-check length to skip
// the timingSafeEqual call when buffers don't match length (timingSafeEqual
// throws on mismatched buffer lengths — that throw is itself a side-channel,
// so we short-circuit explicitly).

import crypto from 'crypto';

/**
 * Constant-time compare of a `Bearer X` authorization header against a known
 * secret. Returns false if either side is empty or the secret env var was
 * never set (fail-closed). Returns true only when the bearer value exactly
 * matches the secret, verified via crypto.timingSafeEqual.
 */
export function timingSafeBearerMatch(
  authorizationHeader: string | null | undefined,
  expectedSecret: string | undefined,
): boolean {
  if (!authorizationHeader || !expectedSecret) return false;
  const prefix = 'Bearer ';
  if (!authorizationHeader.startsWith(prefix)) return false;
  const provided = authorizationHeader.slice(prefix.length);
  return timingSafeTokenMatch(provided, expectedSecret);
}

/**
 * Constant-time compare of a plain token (no `Bearer ` prefix) against a known
 * secret. Same fail-closed semantics as timingSafeBearerMatch.
 */
export function timingSafeTokenMatch(
  provided: string | null | undefined,
  expected: string | undefined,
): boolean {
  if (!provided || !expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(new Uint8Array(a), new Uint8Array(b));
}
