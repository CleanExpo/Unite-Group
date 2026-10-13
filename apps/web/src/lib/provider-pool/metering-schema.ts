// src/lib/provider-pool/metering-schema.ts
//
// UNI-2780 runtime guard: the provider-accounts write path must behave
// correctly whether or not migration 20261013090000_ai_subscription_metering
// has been applied, so merge order and apply order stop mattering.
//
// Before the migration: legacy registrations (one of the five original
// providers, metered, routable, no billing metadata) are written with the
// legacy column set; anything that needs the new columns — subscriptions,
// metering-only accounts, widened providers, billing metadata — is REFUSED with
// a clear error rather than silently dropped. A subscription can therefore never
// be stored as a routable row because its routable=false had nowhere to go.
//
// The probe is not cached: registration is rare, and a cached "absent" would
// keep refusing after the migration lands.

import type { Database, Json } from '@/types/database'
import type { ValidatedAccount } from './registration'

export type MeteringSchemaState = 'present' | 'absent'

type ProviderAccountInsert = Database['public']['Tables']['provider_accounts']['Insert']

const LEGACY_PROVIDERS: ReadonlySet<string> = new Set(['claude', 'openai', 'minimax', 'gemini', 'openrouter'])
const METERING_COLUMNS = 'billing_kind, plan_price_aud, renewal_date, quota_unit, quota_limit, routable'

export const MIGRATION_NOT_APPLIED =
  'migration 20261013090000_ai_subscription_metering is not yet applied — subscription / metering-only registrations ' +
  '(and billing metadata or new providers) are refused until it is'

/** Postgres undefined_column (42703) or PostgREST's schema-cache column miss (PGRST204). */
export function isMissingColumnError(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false
  const e = err as { code?: unknown; message?: unknown }
  if (e.code === '42703' || e.code === 'PGRST204') return true
  return typeof e.message === 'string' && /column .* does not exist/i.test(e.message)
}

/** Ask the database whether the metering columns exist. Throws on any other failure. */
export async function probeMeteringColumns(supabase: {
  from: (table: string) => any // eslint-disable-line @typescript-eslint/no-explicit-any
}): Promise<MeteringSchemaState> {
  const { error } = await supabase.from('provider_accounts').select(METERING_COLUMNS).limit(1)
  if (!error) return 'present'
  if (isMissingColumnError(error)) return 'absent'
  throw new Error(`metering schema probe failed: ${String((error as { message?: string }).message ?? error)}`)
}

/** True when the registration loses nothing if written with the legacy column set. */
function legacyCompatible(v: ValidatedAccount): boolean {
  return LEGACY_PROVIDERS.has(v.provider) && v.billingKind === 'metered' && v.routable
    && v.planPriceAud === null && v.renewalDate === null && v.quotaUnit === null && v.quotaLimit === null
}

export type InsertBuild = { ok: true; row: ProviderAccountInsert } | { ok: false; error: string }

/** The provider_accounts row for a validated registration, given the schema state. */
export function buildProviderAccountInsert(founderId: string, v: ValidatedAccount, schema: MeteringSchemaState): InsertBuild {
  const legacy: ProviderAccountInsert = {
    founder_id: founderId,
    provider: v.provider,
    label: v.label,
    vault_entry_id: v.vaultEntryId,
    enabled: true,
    plan: v.plan as unknown as Json,
    allow_metered: v.allowMetered,
  }
  if (schema === 'absent') {
    return legacyCompatible(v) ? { ok: true, row: legacy } : { ok: false, error: MIGRATION_NOT_APPLIED }
  }
  return {
    ok: true,
    row: {
      ...legacy,
      // routable is persisted explicitly so a subscription never falls back to the column default.
      billing_kind: v.billingKind,
      plan_price_aud: v.planPriceAud,
      renewal_date: v.renewalDate,
      quota_unit: v.quotaUnit,
      quota_limit: v.quotaLimit,
      routable: v.routable,
    },
  }
}
