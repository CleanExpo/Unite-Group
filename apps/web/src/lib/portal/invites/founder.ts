import type { SupabaseClient } from '@supabase/supabase-js'

import { generateInviteCode, hashInviteCode, inviteCodeHint, normaliseInviteCode } from './code'
import { DEFAULT_EXPIRY_DAYS, MAX_EXPIRY_DAYS } from './limits'

// Founder-side invite work (UNI-3167): make a code, list codes, cancel a code. Runs with the service-role client,
// only after the caller passed the founder allow-list (the page's actions check that). The plaintext code is
// returned once from createInvite and never written anywhere.

const TENANT_SLUG = /^[a-z0-9-]{1,64}$/
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export type NewInviteInput = { tenantSlug: string; boundEmail?: string | null; expiryDays?: number | null }
export type NewInvite = { tenantSlug: string; boundEmail: string | null; expiryDays: number }

export type InviteStatus = 'active' | 'used' | 'revoked' | 'expired'
export type InviteRow = {
  id: string
  hint: string
  tenantSlug: string
  boundEmail: string | null
  expiresAt: string
  createdAt: string
  status: InviteStatus
}

export type CreateInviteResult =
  | { ok: true; code: string; invite: InviteRow }
  | { ok: false; error: string }

/** Checks and tidies the founder's form. The tenant is the business's short name, for example `brii`. */
export function parseNewInvite(input: NewInviteInput): { ok: true; value: NewInvite } | { ok: false; error: string } {
  const tenantSlug = typeof input.tenantSlug === 'string' ? input.tenantSlug.trim().toLowerCase() : ''
  if (!TENANT_SLUG.test(tenantSlug)) {
    return { ok: false, error: 'Business short name: lower-case letters, numbers and dashes only, for example brii.' }
  }
  const rawEmail = typeof input.boundEmail === 'string' ? input.boundEmail.trim().toLowerCase() : ''
  if (rawEmail && (rawEmail.length > 254 || !EMAIL.test(rawEmail))) {
    return { ok: false, error: 'That email address does not look right.' }
  }
  const days = input.expiryDays == null ? DEFAULT_EXPIRY_DAYS : Number(input.expiryDays)
  if (!Number.isInteger(days) || days < 1 || days > MAX_EXPIRY_DAYS) {
    return { ok: false, error: `Days until it expires: a whole number from 1 to ${MAX_EXPIRY_DAYS}.` }
  }
  return { ok: true, value: { tenantSlug, boundEmail: rawEmail || null, expiryDays: days } }
}

type CodeRow = {
  id: string
  code_hint: string
  tenant_slug: string
  bound_email: string | null
  expires_at: string
  revoked_at: string | null
  created_at: string
  portal_invite_redemptions?: { redeemed_at: string }[] | null
}

export function inviteStatus(row: Pick<CodeRow, 'expires_at' | 'revoked_at' | 'portal_invite_redemptions'>, now: Date): InviteStatus {
  if (row.portal_invite_redemptions && row.portal_invite_redemptions.length > 0) return 'used'
  if (row.revoked_at) return 'revoked'
  if (new Date(row.expires_at).getTime() <= now.getTime()) return 'expired'
  return 'active'
}

function toInviteRow(row: CodeRow, now: Date): InviteRow {
  return {
    id: row.id,
    hint: row.code_hint,
    tenantSlug: row.tenant_slug,
    boundEmail: row.bound_email,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    status: inviteStatus(row, now),
  }
}

const LIST_COLUMNS = 'id, code_hint, tenant_slug, bound_email, expires_at, revoked_at, created_at, portal_invite_redemptions(redeemed_at)'

/** Makes one single-use code. Returns the plaintext once; the database keeps only its hash and last four characters. */
export async function createInvite(
  db: SupabaseClient,
  input: NewInviteInput,
  createdBy: string,
  now: Date = new Date(),
  generate: () => string = generateInviteCode,
): Promise<CreateInviteResult> {
  const parsed = parseNewInvite(input)
  if (!parsed.ok) return parsed
  const code = generate()
  const normalised = normaliseInviteCode(code)
  if (!normalised) return { ok: false, error: 'Could not make a code. Nothing was saved.' }
  const expiresAt = new Date(now.getTime() + parsed.value.expiryDays * 86_400_000).toISOString()
  const { data, error } = await db
    .from('portal_invite_codes')
    .insert({
      code_hash: hashInviteCode(normalised),
      code_hint: inviteCodeHint(normalised),
      tenant_slug: parsed.value.tenantSlug,
      bound_email: parsed.value.boundEmail,
      expires_at: expiresAt,
      created_by: createdBy,
    })
    .select(LIST_COLUMNS)
    .single()
  if (error || !data) return { ok: false, error: 'Could not save the code. Nothing was created.' }
  return { ok: true, code, invite: toInviteRow(data as CodeRow, now) }
}

/** Newest first. A failed read throws, so it never looks like "no codes yet". */
export async function listInvites(db: SupabaseClient, now: Date = new Date(), limit = 100): Promise<InviteRow[]> {
  const { data, error } = await db
    .from('portal_invite_codes')
    .select(LIST_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(`portal invites read failed: ${error.message}`)
  return ((data ?? []) as CodeRow[]).map((row) => toInviteRow(row, now))
}

/** Cancels a code that has not been cancelled yet. A code already used stays used; cancelling it changes nothing. */
export async function revokeInvite(
  db: SupabaseClient,
  id: string,
  now: Date = new Date(),
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, error: 'Unknown code.' }
  const { error } = await db
    .from('portal_invite_codes')
    .update({ revoked_at: now.toISOString() })
    .eq('id', id)
    .is('revoked_at', null)
  if (error) return { ok: false, error: 'Could not cancel the code. Try again.' }
  return { ok: true }
}
