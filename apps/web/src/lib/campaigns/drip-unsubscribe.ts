// src/lib/campaigns/drip-unsubscribe.ts
// Drip send gates (UNI-2291): signed unsubscribe tokens, the suppression
// store, and the testing-phase recipient allowlist.
//
// Token format mirrors src/lib/oauth-state.ts:
//   base64url(JSON {f: founderId, e: email}) + "." + base64url(HMAC-SHA256)
// but signs with its own DRIP_UNSUBSCRIBE_SECRET. Unsubscribe links live in
// mail that has already been delivered and must keep verifying for as long as
// that mail exists; sharing VAULT_ENCRYPTION_KEY would mean any rotation of
// the vault key silently breaks every unsubscribe link ever sent. Tokens carry
// no expiry on purpose — the only thing a token can do is suppress the address
// it names, for the founder it names.

import { createHmac, timingSafeEqual } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

export const DRIP_SUPPRESSIONS_TABLE = 'drip_suppressions'
export const DRIP_UNSUBSCRIBE_PATH = '/api/drip/unsubscribe'

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase()
}

function unsubscribeSecret(): string | null {
  return process.env.DRIP_UNSUBSCRIBE_SECRET?.trim() || null
}

function hmac(secret: string, data: string): Buffer {
  return createHmac('sha256', secret).update(data).digest()
}

/** Verifies a token. Returns null for anything missing, malformed or tampered. */
export function verifyUnsubscribeToken(
  token: string | null | undefined
): { founderId: string; email: string } | null {
  const secret = unsubscribeSecret()
  if (!secret || !token) return null
  const dot = token.lastIndexOf('.')
  if (dot <= 0) return null

  const data = token.slice(0, dot)
  const received = Buffer.from(token.slice(dot + 1), 'base64url')
  const expected = hmac(secret, data)
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    return null
  }

  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString()) as {
      f?: unknown
      e?: unknown
    }
    if (typeof payload.f !== 'string' || typeof payload.e !== 'string') return null
    const email = normaliseEmail(payload.e)
    if (!payload.f || !email) return null
    return { founderId: payload.f, email }
  } catch {
    return null
  }
}

/**
 * Returns a function that builds the absolute unsubscribe URL for one of this
 * founder's recipients, or null when the app base URL or the signing secret is
 * unset — callers must then refuse to send.
 */
export function unsubscribeUrlBuilder(founderId: string): ((email: string) => string) | null {
  const base = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, '')
  const secret = unsubscribeSecret()
  if (!base || !secret) return null
  return (email: string) => {
    const data = Buffer.from(
      JSON.stringify({ f: founderId, e: normaliseEmail(email) })
    ).toString('base64url')
    const token = `${data}.${hmac(secret, data).toString('base64url')}`
    return `${base}${DRIP_UNSUBSCRIBE_PATH}?token=${encodeURIComponent(token)}`
  }
}

/**
 * Testing-phase allowlist. Live drip sends reach only these addresses
 * (comma-separated, case-insensitive exact match) unless
 * DRIP_ALLOWLIST_DISABLED is exactly 'true'.
 */
export function isAllowlistDisabled(): boolean {
  return process.env.DRIP_ALLOWLIST_DISABLED === 'true'
}

export function parseRecipientAllowlist(): Set<string> {
  return new Set(
    (process.env.DRIP_RECIPIENT_ALLOWLIST ?? '')
      .split(',')
      .map(normaliseEmail)
      .filter(Boolean)
  )
}

/** Idempotent: a second unsubscribe for the same (founder, email) is a no-op. */
export async function recordSuppression(
  supabase: SupabaseClient,
  founderId: string,
  email: string,
  source: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.from(DRIP_SUPPRESSIONS_TABLE).upsert(
    {
      founder_id: founderId,
      email: normaliseEmail(email),
      reason: 'unsubscribed',
      source,
    },
    { onConflict: 'founder_id,email', ignoreDuplicates: true }
  )
  return { error: error ? error.message : null }
}
