// src/lib/command-centre/provider-usage.ts
//
// UNI-2146 — Mission Control provider usage cockpit.
//
// Surfaces AI-provider plan readiness/usage for Claude, MiniMax, Gemini, OpenAI
// and OpenRouter so the operator can see what's available, watching, near limit,
// blocked, or unknown — and how routing should fall back.
//
// SAFETY: this module handles **metadata only**. It reads provider *presence*
// (is a key configured) as booleans — never the key values — and never returns
// API keys, tokens, cookies, account IDs, or billing identifiers.

export type ProviderId = 'claude' | 'minimax' | 'gemini' | 'openai' | 'openrouter'
export type ProviderState = 'available' | 'watching' | 'near_limit' | 'blocked' | 'unknown'
/** How a provider's usage figure is known. */
export type TruthLevel = 'live' | 'estimated' | 'manual' | 'unavailable'
export type UseLane =
  | 'deep_reasoning'
  | 'coding'
  | 'video_media'
  | 'fast_drafting'
  | 'fallback_aggregator'

export interface ProviderConfig {
  id: ProviderId
  label: string
  planType: string
  resetCadence: string
  bestUseLane: UseLane
  /** Where routing falls back to when this provider is near-limit/blocked. */
  fallback: ProviderId | null
  /** Env var names whose *presence* (not value) marks the provider configured. */
  envKeys: string[]
}

/** Static catalogue — identity + routing role only. No secrets. */
export const PROVIDERS: ProviderConfig[] = [
  { id: 'claude', label: 'Claude Max', planType: 'Max subscription', resetCadence: '5h rolling', bestUseLane: 'deep_reasoning', fallback: 'openai', envKeys: ['ANTHROPIC_API_KEY', 'CLAUDE_API_KEY'] },
  { id: 'openai', label: 'OpenAI Max', planType: 'Max plan', resetCadence: 'monthly', bestUseLane: 'coding', fallback: 'claude', envKeys: ['OPENAI_API_KEY'] },
  { id: 'minimax', label: 'MiniMax Max', planType: 'Max subscription', resetCadence: 'daily', bestUseLane: 'video_media', fallback: 'gemini', envKeys: ['MINIMAX_API_KEY'] },
  { id: 'gemini', label: 'Google Gemini', planType: 'Plan', resetCadence: 'per-minute + daily', bestUseLane: 'fast_drafting', fallback: 'openrouter', envKeys: ['GEMINI_API_KEY', 'GOOGLE_API_KEY', 'GOOGLE_GENERATIVE_AI_API_KEY'] },
  { id: 'openrouter', label: 'OpenRouter', planType: 'Credits', resetCadence: 'credit balance', bestUseLane: 'fallback_aggregator', fallback: null, envKeys: ['OPENROUTER_API_KEY'] },
]

/** Per-provider input. `configured` is presence-only; never pass a key value. */
export interface ProviderSignal {
  configured: boolean
  /** Optional usage pressure 0..1 (1 = at limit). Undefined = unknown. */
  usagePressure?: number
  /** Override the derived truth level. */
  truth?: TruthLevel
  /** Explicit block reason (e.g. plan suspended). */
  blockedReason?: string
}

export interface ProviderCockpitEntry {
  id: ProviderId
  label: string
  planType: string
  resetCadence: string
  state: ProviderState
  truthLevel: TruthLevel
  bestUseLane: UseLane
  fallbackProvider: ProviderId | null
  missingSetupReason: string | null
  /** 0..100 when known, else null. */
  usagePct: number | null
  lastChecked: string
}

export interface RoutingHint {
  lane: UseLane
  recommended: ProviderId | null
  reason: string
}

export interface ProviderCockpitPayload {
  source: 'cc:provider-usage'
  generatedAt: string
  summary: { total: number; available: number; watching: number; nearLimit: number; blocked: number; unknown: number }
  providers: ProviderCockpitEntry[]
  routing: RoutingHint[]
}

const USABLE_STATES: ReadonlySet<ProviderState> = new Set(['available', 'watching', 'unknown'])

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0
  return Math.max(0, Math.min(1, n))
}

interface Derived {
  state: ProviderState
  truthLevel: TruthLevel
  usagePct: number | null
  missingSetupReason: string | null
}

export function deriveProviderState(signal: ProviderSignal): Derived {
  if (!signal.configured) {
    return {
      state: 'blocked',
      truthLevel: signal.truth ?? 'unavailable',
      usagePct: null,
      missingSetupReason: signal.blockedReason ?? 'Plan/API key not configured',
    }
  }
  if (signal.blockedReason) {
    return { state: 'blocked', truthLevel: signal.truth ?? 'manual', usagePct: null, missingSetupReason: signal.blockedReason }
  }
  if (signal.usagePressure === undefined) {
    // Configured, but no usage telemetry available.
    return { state: 'unknown', truthLevel: signal.truth ?? 'unavailable', usagePct: null, missingSetupReason: null }
  }
  const p = clamp01(signal.usagePressure)
  const usagePct = Math.round(p * 100)
  let state: ProviderState
  if (p >= 0.95) state = 'blocked'
  else if (p >= 0.8) state = 'near_limit'
  else if (p >= 0.5) state = 'watching'
  else state = 'available'
  return { state, truthLevel: signal.truth ?? 'estimated', usagePct, missingSetupReason: null }
}

function recommendForLane(lane: UseLane, entries: Map<ProviderId, ProviderCockpitEntry>): RoutingHint {
  const primary = PROVIDERS.find((p) => p.bestUseLane === lane)
  if (!primary) return { lane, recommended: null, reason: 'no provider assigned to this lane' }

  let cursor: ProviderId | null = primary.id
  const visited = new Set<ProviderId>()
  while (cursor && !visited.has(cursor)) {
    visited.add(cursor)
    const entry = entries.get(cursor)
    if (entry && USABLE_STATES.has(entry.state)) {
      return {
        lane,
        recommended: cursor,
        reason: cursor === primary.id ? 'primary' : `fallback from ${primary.id} (${entries.get(primary.id)?.state})`,
      }
    }
    cursor = PROVIDERS.find((p) => p.id === cursor)?.fallback ?? null
  }
  return { lane, recommended: null, reason: 'all candidates near-limit or blocked' }
}

export interface BuildProviderCockpitInput {
  signals: Partial<Record<ProviderId, ProviderSignal>>
  now: string
}

export function buildProviderCockpit(input: BuildProviderCockpitInput): ProviderCockpitPayload {
  const providers: ProviderCockpitEntry[] = PROVIDERS.map((p) => {
    const signal = input.signals[p.id] ?? { configured: false }
    const d = deriveProviderState(signal)
    return {
      id: p.id,
      label: p.label,
      planType: p.planType,
      resetCadence: p.resetCadence,
      state: d.state,
      truthLevel: d.truthLevel,
      bestUseLane: p.bestUseLane,
      fallbackProvider: p.fallback,
      missingSetupReason: d.missingSetupReason,
      usagePct: d.usagePct,
      lastChecked: input.now,
    }
  })

  const byId = new Map(providers.map((e) => [e.id, e]))
  const lanes: UseLane[] = ['deep_reasoning', 'coding', 'video_media', 'fast_drafting', 'fallback_aggregator']
  const routing = lanes.map((l) => recommendForLane(l, byId))

  return {
    source: 'cc:provider-usage',
    generatedAt: input.now,
    summary: {
      total: providers.length,
      available: providers.filter((e) => e.state === 'available').length,
      watching: providers.filter((e) => e.state === 'watching').length,
      nearLimit: providers.filter((e) => e.state === 'near_limit').length,
      blocked: providers.filter((e) => e.state === 'blocked').length,
      unknown: providers.filter((e) => e.state === 'unknown').length,
    },
    providers,
    routing,
  }
}

/**
 * Build per-provider signals from env *presence* only — reads whether a key is
 * set, never its value. Safe to call with process.env.
 */
export function readProviderSignalsFromEnv(
  env: Record<string, string | undefined>,
): Record<ProviderId, ProviderSignal> {
  const present = (keys: string[]): boolean => keys.some((k) => typeof env[k] === 'string' && env[k]!.length > 0)
  const signals = {} as Record<ProviderId, ProviderSignal>
  for (const p of PROVIDERS) {
    signals[p.id] = { configured: present(p.envKeys) }
  }
  return signals
}
