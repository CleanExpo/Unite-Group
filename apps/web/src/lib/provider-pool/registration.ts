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

import type { ProviderId } from '../command-centre/provider-usage'
import type { PlanShape } from './accounts'
import { WINDOW } from './quota'

/** A sensible default plan for a provider (editable by the founder). */
export function defaultPlanFor(provider: ProviderId): PlanShape {
  switch (provider) {
    case 'claude':
      // Max subscription: 5-hour rolling + weekly. Estimates in run units.
      return { kind: 'windowed', caps: [
        { label: '5-hour', seconds: WINDOW.fiveHour, cap: 200 },
        { label: 'weekly', seconds: WINDOW.weekly, cap: 2000 },
      ] }
    case 'openai':
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

const PROVIDERS: ReadonlySet<ProviderId> = new Set(['claude', 'openai', 'minimax', 'gemini', 'openrouter'])

export interface NewAccountInput {
  provider: ProviderId
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
}

export type ValidatedAccount = {
  provider: ProviderId
  label: string
  vaultEntryId: string | null
  plan: PlanShape
  allowMetered: boolean
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

  if (typeof v.provider !== 'string' || !PROVIDERS.has(v.provider as ProviderId)) {
    return { ok: false, error: `provider must be one of ${[...PROVIDERS].join(', ')}` }
  }
  const provider = v.provider as ProviderId
  if (typeof v.label !== 'string' || v.label.trim().length === 0) return { ok: false, error: 'label is required' }
  // vaultEntryId is optional: omit it for an env-backed account (key in a Vercel env var).
  let vaultEntryId: string | null = null
  if (v.vaultEntryId !== undefined && v.vaultEntryId !== null && v.vaultEntryId !== '') {
    if (typeof v.vaultEntryId !== 'string') return { ok: false, error: 'vaultEntryId must be a string' }
    vaultEntryId = v.vaultEntryId.trim()
  }
  if (v.plan !== undefined && !isPlanShape(v.plan)) return { ok: false, error: 'plan is malformed' }

  return {
    ok: true,
    value: {
      provider,
      label: v.label.trim(),
      vaultEntryId,
      plan: (v.plan as PlanShape | undefined) ?? defaultPlanFor(provider),
      allowMetered: v.allowMetered === true,
    },
  }
}
