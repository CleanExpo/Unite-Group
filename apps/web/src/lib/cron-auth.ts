// src/lib/cron-auth.ts
// Single source of truth for CRON_SECRET bearer authentication on cron and
// machine-caller routes.
//
// The bug this closes: `if (auth !== `Bearer ${process.env.CRON_SECRET?.trim()}`)`
// WITHOUT first rejecting an unset/blank secret. When CRON_SECRET is unset the
// template renders `Bearer undefined`, and a caller sending exactly that header
// (or `Bearer ` for an empty secret) matches and bypasses auth. Every cron route
// must reject the unconfigured-secret case BEFORE comparing the header.

import { NextResponse } from 'next/server'

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
  return request.headers.get('authorization') === `Bearer ${cronSecret}`
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
  if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }
  return null
}
