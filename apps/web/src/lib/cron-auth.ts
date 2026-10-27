// src/lib/cron-auth.ts
// Single source of truth for CRON_SECRET bearer authentication on cron and
// machine-caller routes.
//
// The bug this closes: `if (auth !== `Bearer ${process.env.CRON_SECRET?.trim()}`)`
// WITHOUT first rejecting an unset/blank secret. When CRON_SECRET is unset the
// template renders `Bearer undefined`, and a caller sending exactly that header
// (or `Bearer ` for an empty secret) matches and bypasses auth. Every cron route
// must reject the unconfigured-secret case BEFORE comparing the header.

import { createHash, timingSafeEqual } from 'node:crypto'

import { NextResponse } from 'next/server'

// Compare the presented header with the expected bearer in constant time. A plain
// === stops at the first differing byte, so response time would leak how much of
// a guessed secret is right. Hashing both sides first gives equal-length buffers,
// so timingSafeEqual never throws and the secret's length is not leaked either.
function bearerMatches(received: string | null, cronSecret: string): boolean {
  if (received === null) return false
  const digest = (value: string) => createHash('sha256').update(value).digest()
  return timingSafeEqual(digest(received), digest(`Bearer ${cronSecret}`))
}

/**
 * True only when the request bears the correct `Bearer <CRON_SECRET>` header.
 * Returns false when the secret is unset/blank (so `Bearer undefined` and
 * `Bearer ` never authenticate) or when the header does not match.
 *
 * For routes that accept a founder session as an alternative to the cron secret
 * (e.g. command-centre/signals/ingest), use this boolean and fall through to the
 * session check on false — do NOT use assertCronAuth, which short-circuits.
 */
export function isCronAuthorised(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim()
  if (!cronSecret) return false
  return bearerMatches(request.headers.get('authorization'), cronSecret)
}

/**
 * Strict guard for cron-only routes. Returns a response to short-circuit with,
 * or null when authentication passes:
 *   500 { error: 'CRON_SECRET not configured' } — secret unset/blank
 *   401 { error: 'Unauthorised' }               — header does not match
 *   null                                        — authenticated
 *
 * Usage: `const denied = assertCronAuth(request); if (denied) return denied`
 */
export function assertCronAuth(request: Request): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET?.trim()
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }
  if (!bearerMatches(request.headers.get('authorization'), cronSecret)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }
  return null
}
