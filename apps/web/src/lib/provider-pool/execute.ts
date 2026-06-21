// src/lib/provider-pool/execute.ts
//
// The execution facade: ties the router decision → credential (vault) → provider
// call → usage log into one call. Handles the OpenAI-compatible chat providers
// (MiniMax, OpenRouter, Gemini, OpenAI) — the bulk-text / fast-draft / scout
// lanes. Claude routes are reported back so the caller uses the existing
// Anthropic path instead (the autopilot / ai/router already cover premium lanes).
//
// Everything is dependency-injected (accounts, credential resolver, client
// factory, usage logger) so the orchestration is unit-tested without network,
// secrets, or a DB. Honest + fail-closed: a queue decision or a missing
// credential never silently spends — it returns a typed non-call result.

import { decideRoute, type WorkKind, type AccountRuntimeState } from './router'
import type { ProviderId } from '../command-centre/provider-usage'
import { makeOpenAICompatibleClient, type ChatRequest, type ChatResult } from './adapters/openai-compatible'

/** Base URLs for the OpenAI-compatible chat endpoint of each provider. */
export const OPENAI_COMPATIBLE_BASE: Partial<Record<ProviderId, string>> = {
  openai: 'https://api.openai.com/v1',
  minimax: 'https://api.minimax.io/v1',
  openrouter: 'https://openrouter.ai/api/v1',
  gemini: 'https://generativelanguage.googleapis.com/v1beta/openai',
}

/**
 * A sensible default chat model per provider, used when the caller doesn't pin
 * one (the model must match whichever provider routing picks). Adjustable; the
 * exact ids are verified against each provider at call time.
 */
export const DEFAULT_MODEL: Partial<Record<ProviderId, string>> = {
  openai: 'gpt-4o-mini',
  minimax: 'MiniMax-Text-01',
  openrouter: 'openai/gpt-4o-mini',
  gemini: 'gemini-1.5-flash',
}

export type ExecuteChatResult =
  | { status: 'ok'; provider: ProviderId; accountId: string; text: string; usage: { inputTokens: number; outputTokens: number } }
  | { status: 'queued'; reason: string }
  | { status: 'needs_anthropic_path'; provider: ProviderId; accountId: string }
  | { status: 'error'; provider?: ProviderId; reason: string; rateLimited?: boolean; resetAt?: string | null }

export interface ExecuteChatDeps {
  /** Live account states (from loadAccounts). */
  accounts: AccountRuntimeState[]
  /**
   * Resolve an account's API key — from its Vercel env var (env-backed) or by
   * decrypting its vault entry. Returns null when neither is available (→ a
   * clean error, never a silent uncredentialed call).
   */
  resolveKey: (accountId: string) => Promise<string | null>
  now: string
  /** Optional override of the chat client factory (for tests). */
  makeClient?: (baseUrl: string, apiKey: string | undefined) => (req: ChatRequest) => Promise<ChatResult>
  /** Record the usage event (and rate-limit cool-downs). */
  logUsage?: (e: { accountId: string; lane: WorkKind; inputTokens: number; outputTokens: number; outcome: 'ok' | 'rate_limited' | 'error'; resetAt?: string | null }) => Promise<void>
}

/**
 * Route + run one chat unit of work. Pure orchestration over injected deps.
 */
export async function executeChat(kind: WorkKind, req: ChatRequest, deps: ExecuteChatDeps): Promise<ExecuteChatResult> {
  const decision = decideRoute({ kind, accounts: deps.accounts, now: deps.now })
  if (decision.action === 'queue') return { status: 'queued', reason: decision.reason }

  const { provider, accountId } = decision
  const base = OPENAI_COMPATIBLE_BASE[provider]
  if (!base) {
    // claude (Anthropic API shape) — caller should use the existing Anthropic path.
    return { status: 'needs_anthropic_path', provider, accountId }
  }

  const key = await deps.resolveKey(accountId)
  if (!key) return { status: 'error', provider, reason: 'credential not resolvable (no env var or vault entry)' }

  // Pin a provider-appropriate model when the caller didn't specify one.
  const reqForProvider = { ...req, model: req.model || DEFAULT_MODEL[provider] || req.model }
  const client = (deps.makeClient ?? ((b, k) => makeOpenAICompatibleClient({ baseUrl: b, apiKey: k })))(base, key)
  const result = await client(reqForProvider)

  if (!result.ok) {
    const rateLimited = result.reason === 'rate_limited'
    await deps.logUsage?.({ accountId, lane: kind, inputTokens: 0, outputTokens: 0, outcome: rateLimited ? 'rate_limited' : 'error', resetAt: result.resetAt ?? null })
    return { status: 'error', provider, reason: result.detail ?? result.reason, rateLimited, resetAt: result.resetAt ?? null }
  }

  await deps.logUsage?.({ accountId, lane: kind, inputTokens: result.usage.inputTokens, outputTokens: result.usage.outputTokens, outcome: 'ok' })
  return { status: 'ok', provider, accountId, text: result.text, usage: result.usage }
}
