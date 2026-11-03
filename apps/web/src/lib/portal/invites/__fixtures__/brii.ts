// Example tenant `brii` for tests and screenshots ONLY (UNI-3167). Never applied to any database, never a real
// customer record. Emails use the reserved .test domain.
import type { InviteRow } from '../founder'

export const BRII_TENANT = 'brii'
export const BRII_OWNER_EMAIL = 'owner@brii.test'

/** A well-formed example code. It exists only in this file; no database holds its hash. */
export const BRII_EXAMPLE_CODE = 'BRZZ-2345-6789-ABCD-EFGH-JKMN'

export const BRII_INVITES: InviteRow[] = [
  { id: '11111111-1111-4111-8111-111111111111', hint: 'JKMN', tenantSlug: BRII_TENANT, boundEmail: BRII_OWNER_EMAIL, expiresAt: '2026-11-16T08:00:00.000Z', createdAt: '2026-11-02T08:00:00.000Z', status: 'active' },
  { id: '22222222-2222-4222-8222-222222222222', hint: 'QRST', tenantSlug: BRII_TENANT, boundEmail: null, expiresAt: '2026-11-10T08:00:00.000Z', createdAt: '2026-10-27T08:00:00.000Z', status: 'used' },
  { id: '33333333-3333-4333-8333-333333333333', hint: 'VWXY', tenantSlug: BRII_TENANT, boundEmail: null, expiresAt: '2026-11-05T08:00:00.000Z', createdAt: '2026-10-22T08:00:00.000Z', status: 'revoked' },
]
