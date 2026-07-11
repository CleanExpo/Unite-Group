// src/lib/integrations/onepassword-grants.ts
//
// UNI-2310 — the gated authorization lane for 1Password access. Agent reads of
// the nexus-audit vault are refused UNLESS the founder has an active, unexpired
// grant. The founder creates a grant through the CRM (POST the grant route) —
// this replaces ad-hoc terminal `op` sign-in. Grants are short-TTL and audited
// by the row itself (founder_id + reason + created_at).
//
// This module is pure grant bookkeeping (no 1Password SDK) so it unit-tests
// without any secret material. The SDK read that consults hasActiveOpGrant()
// lives in ./onepassword.ts.

import { createServiceClient } from '@/lib/supabase/service'

export const OP_ACCESS_GRANTS_TABLE = 'op_access_grants'

/** Default grant lifetime. Short by design — re-approve rather than long-live. */
export const DEFAULT_GRANT_TTL_MINUTES = 15
export const MAX_GRANT_TTL_MINUTES = 60

export interface OpAccessGrant {
  id: string
  founder_id: string
  reason: string | null
  created_at: string
  expires_at: string
  revoked_at: string | null
}

/** Clamp a requested TTL into [1, MAX] minutes, defaulting when absent. */
export function clampTtlMinutes(requested?: number): number {
  if (!requested || !Number.isFinite(requested) || requested <= 0) return DEFAULT_GRANT_TTL_MINUTES
  return Math.min(Math.floor(requested), MAX_GRANT_TTL_MINUTES)
}

/**
 * Create an OP access grant for the founder. The caller must have already
 * authenticated the founder (this is the "Approve" action). Returns the grant.
 */
export async function grantOpAccess(
  founderId: string,
  opts: { reason?: string; ttlMinutes?: number } = {},
): Promise<OpAccessGrant> {
  const supabase = createServiceClient()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + clampTtlMinutes(opts.ttlMinutes) * 60_000)

  const { data, error } = await supabase
    .from(OP_ACCESS_GRANTS_TABLE)
    .insert({
      founder_id: founderId,
      reason: opts.reason ?? null,
      created_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    })
    .select('*')
    .single()

  if (error || !data) {
    throw new Error(`Failed to create OP access grant: ${error?.message ?? 'unknown error'}`)
  }
  return data as OpAccessGrant
}

/** True if the founder has a non-revoked grant that has not yet expired. */
export async function hasActiveOpGrant(founderId: string): Promise<boolean> {
  const supabase = createServiceClient()
  const nowIso = new Date().toISOString()

  const { data, error } = await supabase
    .from(OP_ACCESS_GRANTS_TABLE)
    .select('id')
    .eq('founder_id', founderId)
    .is('revoked_at', null)
    .gt('expires_at', nowIso)
    .limit(1)

  if (error) throw new Error(`Failed to check OP access grant: ${error.message}`)
  return (data?.length ?? 0) > 0
}

/** Revoke all of the founder's active grants immediately. */
export async function revokeOpAccess(founderId: string): Promise<void> {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from(OP_ACCESS_GRANTS_TABLE)
    .update({ revoked_at: new Date().toISOString() })
    .eq('founder_id', founderId)
    .is('revoked_at', null)

  if (error) throw new Error(`Failed to revoke OP access: ${error.message}`)
}
