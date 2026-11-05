import { decrypt, encrypt, type VaultPayload } from '@/lib/vault'

// The emailed-code factor's TOTP secret, encrypted with the vault key, kept in
// app_metadata so the next visit can step up again. The plaintext secret is never
// returned to the browser. app_metadata is visible on the user object, so only
// the ciphertext is stored.

export const EMAIL_FACTOR_META_KEY = 'portal_email_factor'

export type PackedEmailFactor = {
  factor_id: string
  secret: VaultPayload
}

export function packEmailFactor(factorId: string, secret: string): PackedEmailFactor {
  if (!factorId || !secret) throw new Error('portal email factor is incomplete')
  return { factor_id: factorId, secret: encrypt(secret) }
}

function isPayload(value: unknown): value is VaultPayload {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return typeof record.encryptedValue === 'string'
    && typeof record.iv === 'string'
    && typeof record.salt === 'string'
}

/** Returns null when the shape is absent. Throws when the ciphertext will not decrypt. */
export function unpackEmailFactor(raw: unknown): { factorId: string; secret: string } | null {
  if (!raw || typeof raw !== 'object') return null
  const record = raw as { factor_id?: unknown; secret?: unknown }
  if (typeof record.factor_id !== 'string' || !isPayload(record.secret)) return null
  return { factorId: record.factor_id, secret: decrypt(record.secret) }
}

export function withEmailFactorMetadata(
  prev: Record<string, unknown> | null | undefined,
  packed: PackedEmailFactor,
): Record<string, unknown> {
  return { ...(prev ?? {}), [EMAIL_FACTOR_META_KEY]: packed }
}

export function withoutEmailFactorMetadata(
  prev: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  const next = { ...(prev ?? {}) }
  delete next[EMAIL_FACTOR_META_KEY]
  return next
}
