import { createHash } from 'node:crypto'

import type { SupabaseClient } from '@supabase/supabase-js'

import { hashInviteCode, normaliseInviteCode } from './code'
import { isRedeemOutcome, type RedeemAppOutcome, type RedeemOutcome } from './outcomes'

// Owner-side invite work (UNI-3167).
// 1. Before sign-in: an invite holder may have no account yet. We check the code is still usable (and meant for
//    this email) before a sign-in link that can create the account is sent. This check never spends the code.
// 2. After sign-in on a second-factor (aal2) session: the database function redeems the code in one step.

const CLIENT_KEY_DOMAIN = 'unite-group:portal-invite-link:v1:'
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export type LinkCheck = 'ok' | 'not_found' | 'expired' | 'revoked' | 'used' | 'wrong_email' | 'rate_limited'

/**
 * The caller's address for the rate limit, in the same order as getClientIp in lib/middleware/rate-limit.ts.
 * Vercel sets x-vercel-forwarded-for itself; a caller can only prepend to x-forwarded-for, so that header (and
 * x-real-ip) is a fallback for non-Vercel runs only. Reading x-forwarded-for first let one caller mint a fresh
 * limit per request.
 */
export function linkClientAddress(headers: { get(name: string): string | null }): string | null {
  for (const name of ['x-vercel-forwarded-for', 'x-forwarded-for', 'x-real-ip']) {
    const first = headers.get(name)?.split(',')[0]?.trim()
    if (first) return first
  }
  return null
}

/** The rate-limit key: a hash of the caller's network address. The address itself is never stored. */
export function linkClientKey(address: string | null | undefined): string {
  const first = (address ?? '').split(',')[0]?.trim() || 'unknown'
  return createHash('sha256').update(CLIENT_KEY_DOMAIN + first).digest('hex')
}

export function normaliseEmail(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const email = input.trim().toLowerCase()
  return email.length <= 254 && EMAIL.test(email) ? email : null
}

type LookupRow = {
  expires_at: string
  revoked_at: string | null
  bound_email: string | null
  portal_invite_redemptions?: { redeemed_at: string }[] | null
}

/**
 * Service-role check before a sign-in link is sent. Counts against the caller's limit first (ten per fifteen
 * minutes), so a guesser is slowed down whether or not the code is real. Throws on a failed read.
 */
export async function checkInviteForLink(
  db: SupabaseClient,
  rawCode: unknown,
  email: string,
  clientKey: string,
  now: Date = new Date(),
): Promise<LinkCheck> {
  const { data: allowed, error: limitError } = await db.rpc('portal_invite_link_allowed', { p_client_key: clientKey })
  if (limitError) throw new Error(`portal invite link limit failed: ${limitError.message}`)
  if (allowed !== true) return 'rate_limited'

  const code = normaliseInviteCode(rawCode)
  if (!code) return 'not_found'
  const { data, error } = await db
    .from('portal_invite_codes')
    .select('expires_at, revoked_at, bound_email, portal_invite_redemptions(redeemed_at)')
    .eq('code_hash', hashInviteCode(code))
    .maybeSingle()
  if (error) throw new Error(`portal invite lookup failed: ${error.message}`)
  if (!data) return 'not_found'
  const row = data as LookupRow
  // same order as the database redeem function, so the owner sees the same answer before and after sign-in
  if (row.revoked_at) return 'revoked'
  if (row.portal_invite_redemptions && row.portal_invite_redemptions.length > 0) return 'used'
  if (new Date(row.expires_at).getTime() <= now.getTime()) return 'expired'
  if (row.bound_email && row.bound_email !== email) return 'wrong_email'
  return 'ok'
}

export type RedeemClient = {
  rpc(
    fn: 'portal_redeem_invite',
    args: { p_code_hash: string },
  ): PromiseLike<{ data: unknown; error: { message: string; code?: string } | null }>
}

/**
 * Redeems on the owner's own session. The database decides: it refuses aal1, expired, revoked, used and
 * wrong-email codes, counts failures, and links the owner and sets the comp plan in one transaction.
 */
export async function redeemInvite(client: RedeemClient, rawCode: unknown): Promise<RedeemOutcome | RedeemAppOutcome> {
  if (rawCode == null || rawCode === '') return 'no_code'
  const code = normaliseInviteCode(rawCode)
  if (!code) return 'not_found'
  const { data, error } = await client.rpc('portal_redeem_invite', { p_code_hash: hashInviteCode(code) })
  if (error) return error.code === '42501' ? 'signed_out' : 'error'
  return isRedeemOutcome(data) ? data : 'error'
}
