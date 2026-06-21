// src/lib/provider-pool/credentials.ts
//
// Credential resolution for the provider pool. A provider account's key can live
// in EITHER the vault (referenced by vaultEntryId) OR a Vercel environment
// variable (the convention for this single-user CRM, e.g. MINIMAX_API_KEY).
//
// This module owns the env-var side: the candidate env names per provider and a
// pure presence/resolve check. Pure + tested; reads only the env object passed in
// (never logs or returns it anywhere it shouldn't).

import type { ProviderId } from '../command-centre/provider-usage'

/** Env var names checked (in order) for each provider's key. */
export const PROVIDER_ENV_CANDIDATES: Record<ProviderId, string[]> = {
  claude: ['ANTHROPIC_API_KEY', 'CLAUDE_API_KEY'],
  openai: ['OPENAI_API_KEY'],
  minimax: ['MINIMAX_API_KEY', 'MINIMAX_PREPAID'],
  gemini: ['GEMINI_API_KEY', 'GOOGLE_API_KEY', 'GOOGLE_GENERATIVE_AI_API_KEY'],
  openrouter: ['OPENROUTER_API_KEY'],
}

type Env = Record<string, string | undefined>

/** The key value for a provider from env, or null if no candidate is set. */
export function resolveEnvKey(provider: ProviderId, env: Env): string | null {
  for (const name of PROVIDER_ENV_CANDIDATES[provider] ?? []) {
    const v = env[name]
    if (typeof v === 'string' && v.length > 0) return v
  }
  return null
}

/** Whether a provider's key is present in env (presence only — never the value). */
export function hasEnvKey(provider: ProviderId, env: Env): boolean {
  return resolveEnvKey(provider, env) !== null
}
