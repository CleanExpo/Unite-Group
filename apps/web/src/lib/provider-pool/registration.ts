// src/lib/provider-pool/registration.ts
//
// Registering a provider account: sensible per-provider plan presets + input
// validation. Pure + tested. The actual row write + secret live elsewhere (the
// API route inserts; the key stays in the vault, referenced by vaultEntryId).
//
// Plan caps for SUBSCRIPTIONS are estimates (Anthropic/OpenAI don't publish
// numeric token caps) — the authoritative cool-down comes from a real
// rate-limit event. They're expressed in "run units" (≈ one request) so a
// founder can reason about them. Prepaid balances are the founder's purchased
// credit, also in run units. All are editable at registration.

import {
  POOL_PROVIDERS, BILLING_KINDS, QUOTA_UNITS,
  type PoolProviderId, type BillingKind, type QuotaUnit, type PlanShape,
} from './accounts'
import { WINDOW } from './quota'

/** A sensible default plan for a provider (editable by the founder). */
export function defaultPlanFor(provider: PoolProviderId): PlanShape {
  switch (provider) {
    case 'claude':
    case 'claude_max':
      // Max subscription: 5-hour rolling + weekly. Estimates in run units.
      return { kind: 'windowed', caps: [
        { label: '5-hour', seconds: WINDOW.fiveHour, cap: 200 },
        { label: 'weekly', seconds: WINDOW.weekly, cap: 2000 },
      ] }
    case 'openai':
    case 'chatgpt_pro':
      // ChatGPT Pro: 5-hour + weekly windows.
      return { kind: 'windowed', caps: [
        { label: '5-hour', seconds: WINDOW.fiveHour, cap: 200 },
        { label: 'weekly', seconds: WINDOW.weekly, cap: 2000 },
      ] }
    case 'gemini':
      return { kind: 'windowed', caps: [
        { label: 'daily', seconds: WINDOW.daily, cap: 1000 },
      ] }
    case 'minimax':
    case 'openrouter':
    default:
      // Prepaid credit balance (run units) — the founder sets the real figure.
      return { kind: 'prepaid', purchasedUnits: 100000 }
  }
}

const PROVIDERS: ReadonlySet<string> = new Set<string>(POOL_PROVIDERS)

/**
 * Consumer subscriptions whose terms forbid pooling/rotation. They can only be
 * registered as a 'subscription' — which forces routable=false — so no request
 * can ever be load-balanced across, say, the founder's two Claude Max seats.
 * FLAGGED for founder confirmation: which other providers belong here.
 */
const SUBSCRIPTION_ONLY: ReadonlySet<PoolProviderId> = new Set<PoolProviderId>(['claude_max', 'chatgpt_pro'])

/** numeric(10,2) ceiling. */
const MAX_PRICE_AUD = 99_999_999.99

function isIsoDate(v: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false
  const d = new Date(`${v}T00:00:00.000Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v
}

function isNonNegativeNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0
}

export interface NewAccountInput {
  provider: PoolProviderId
  label: string
  /**
   * Vault entry id holding the key. Optional: when omitted, the account is
   * "env-backed" — its key is read from the provider's Vercel env var
   * (e.g. MINIMAX_API_KEY). Either path keeps the secret out of this row.
   */
  vaultEntryId?: string | null
  /** Optional plan override; defaults from defaultPlanFor. */
  plan?: PlanShape
  allowMetered?: boolean
  /** Defaults to 'subscription' for SUBSCRIPTION_ONLY providers, else 'metered'. */
  billingKind?: BillingKind
  /** Plan price in AUD per billing period (>= 0). */
  planPriceAud?: number | null
  /** Next renewal, YYYY-MM-DD. */
  renewalDate?: string | null
  quotaUnit?: QuotaUnit | null
  quotaLimit?: number | null
  /** Must not be true for a subscription; forced false there. Default true otherwise. */
  routable?: boolean
}

export type ValidatedAccount = {
  provider: PoolProviderId
  label: string
  vaultEntryId: string | null
  plan: PlanShape
  allowMetered: boolean
  billingKind: BillingKind
  planPriceAud: number | null
  renewalDate: string | null
  quotaUnit: QuotaUnit | null
  quotaLimit: number | null
  routable: boolean
}

export type ValidationResult = { ok: true; value: ValidatedAccount } | { ok: false; error: string }

function isPlanShape(p: unknown): p is PlanShape {
  if (typeof p !== 'object' || p === null) return false
  const v = p as Record<string, unknown>
  if (v.kind === 'prepaid') return typeof v.purchasedUnits === 'number' && Number.isFinite(v.purchasedUnits) && v.purchasedUnits >= 0
  if (v.kind === 'windowed') return Array.isArray(v.caps) && v.caps.every((c) => typeof c === 'object' && c !== null && typeof (c as Record<string, unknown>).seconds === 'number' && typeof (c as Record<string, unknown>).cap === 'number')
  return false
}

/** Validate a registration request; fail-closed with a clear message. */
export function validateNewAccount(input: unknown): ValidationResult {
  if (typeof input !== 'object' || input === null) return { ok: false, error: 'body must be an object' }
  const v = input as Record<string, unknown>

  if (typeof v.provider !== 'string' || !PROVIDERS.has(v.provider)) {
    return { ok: false, error: `provider must be one of ${[...PROVIDERS].join(', ')}` }
  }
  const provider = v.provider as PoolProviderId
  if (typeof v.label !== 'string' || v.label.trim().length === 0) return { ok: false, error: 'label is required' }
  // vaultEntryId is optional: omit it for an env-backed account (key in a Vercel env var).
  let vaultEntryId: string | null = null
  if (v.vaultEntryId !== undefined && v.vaultEntryId !== null && v.vaultEntryId !== '') {
    if (typeof v.vaultEntryId !== 'string') return { ok: false, error: 'vaultEntryId must be a string' }
    vaultEntryId = v.vaultEntryId.trim()
  }
  if (v.plan !== undefined && !isPlanShape(v.plan)) return { ok: false, error: 'plan is malformed' }

  // ── billing / subscription metering (UNI-2780) ──
  let billingKind: BillingKind = SUBSCRIPTION_ONLY.has(provider) ? 'subscription' : 'metered'
  if (v.billingKind !== undefined && v.billingKind !== null) {
    if (typeof v.billingKind !== 'string' || !(BILLING_KINDS as readonly string[]).includes(v.billingKind)) {
      return { ok: false, error: `billingKind must be one of ${BILLING_KINDS.join(', ')}` }
    }
    billingKind = v.billingKind as BillingKind
  }
  if (SUBSCRIPTION_ONLY.has(provider) && billingKind !== 'subscription') {
    return { ok: false, error: `${provider} can only be registered as a subscription (metered, never routed)` }
  }
  if (v.routable !== undefined && typeof v.routable !== 'boolean') return { ok: false, error: 'routable must be a boolean' }
  if (billingKind === 'subscription' && v.routable === true) {
    return { ok: false, error: 'a subscription account cannot be routable (routable must be false)' }
  }
  const routable = billingKind === 'subscription' ? false : v.routable !== false

  let planPriceAud: number | null = null
  if (v.planPriceAud !== undefined && v.planPriceAud !== null) {
    if (!isNonNegativeNumber(v.planPriceAud) || v.planPriceAud > MAX_PRICE_AUD) {
      return { ok: false, error: 'planPriceAud must be a finite number >= 0' }
    }
    planPriceAud = Math.round(v.planPriceAud * 100) / 100
  }
  let renewalDate: string | null = null
  if (v.renewalDate !== undefined && v.renewalDate !== null && v.renewalDate !== '') {
    if (typeof v.renewalDate !== 'string' || !isIsoDate(v.renewalDate)) {
      return { ok: false, error: 'renewalDate must be a valid YYYY-MM-DD date' }
    }
    renewalDate = v.renewalDate
  }
  let quotaUnit: QuotaUnit | null = null
  if (v.quotaUnit !== undefined && v.quotaUnit !== null) {
    if (typeof v.quotaUnit !== 'string' || !(QUOTA_UNITS as readonly string[]).includes(v.quotaUnit)) {
      return { ok: false, error: `quotaUnit must be one of ${QUOTA_UNITS.join(', ')}` }
    }
    quotaUnit = v.quotaUnit as QuotaUnit
  }
  let quotaLimit: number | null = null
  if (v.quotaLimit !== undefined && v.quotaLimit !== null) {
    if (!isNonNegativeNumber(v.quotaLimit)) return { ok: false, error: 'quotaLimit must be a finite number >= 0' }
    quotaLimit = v.quotaLimit
  }

  return {
    ok: true,
    value: {
      provider,
      label: v.label.trim(),
      vaultEntryId,
      plan: (v.plan as PlanShape | undefined) ?? defaultPlanFor(provider),
      allowMetered: v.allowMetered === true,
      billingKind,
      planPriceAud,
      renewalDate,
      quotaUnit,
      quotaLimit,
      routable,
    },
  }
}
