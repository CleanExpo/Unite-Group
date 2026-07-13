import { describe, it, expect } from 'vitest'
import {
  buildProviderCockpit,
  deriveProviderState,
  readProviderSignalsFromEnv,
  PROVIDERS,
  type ProviderId,
  type ProviderSignal,
} from '@/lib/command-centre/provider-usage'

const NOW = '2026-06-16T12:00:00.000Z'

function allConfigured(overrides: Partial<Record<ProviderId, ProviderSignal>> = {}) {
  const signals = {} as Record<ProviderId, ProviderSignal>
  for (const p of PROVIDERS) signals[p.id] = { configured: true, usagePressure: 0.1 }
  return { ...signals, ...overrides }
}

describe('deriveProviderState — state mapping', () => {
  it('not configured → blocked + missing setup reason', () => {
    const d = deriveProviderState({ configured: false })
    expect(d.state).toBe('blocked')
    expect(d.truthLevel).toBe('unavailable')
    expect(d.missingSetupReason).toMatch(/not configured/i)
    expect(d.usagePct).toBeNull()
  })

  it('configured but no usage telemetry → unknown', () => {
    const d = deriveProviderState({ configured: true })
    expect(d.state).toBe('unknown')
    expect(d.truthLevel).toBe('unavailable')
    expect(d.usagePct).toBeNull()
  })

  it('maps usage pressure to available/watching/near_limit/blocked', () => {
    expect(deriveProviderState({ configured: true, usagePressure: 0.1 }).state).toBe('available')
    expect(deriveProviderState({ configured: true, usagePressure: 0.6 }).state).toBe('watching')
    expect(deriveProviderState({ configured: true, usagePressure: 0.85 }).state).toBe('near_limit')
    expect(deriveProviderState({ configured: true, usagePressure: 0.97 }).state).toBe('blocked')
    expect(deriveProviderState({ configured: true, usagePressure: 0.85 }).usagePct).toBe(85)
  })

  it('honours an explicit block reason on a configured provider', () => {
    const d = deriveProviderState({ configured: true, usagePressure: 0.2, blockedReason: 'plan suspended' })
    expect(d.state).toBe('blocked')
    expect(d.missingSetupReason).toBe('plan suspended')
  })
})

describe('readProviderSignalsFromEnv — no secret leakage', () => {
  it('reports API-key presence without mislabelling it as a Max plan', () => {
    const env = { ANTHROPIC_API_KEY: 'sk-ant-SECRET', OPENAI_API_KEY: '', OPENROUTER_API_KEY: 'or-SECRET' }
    const signals = readProviderSignalsFromEnv(env)
    expect(signals.claude.configured).toBe(true)
    expect(signals.openai.configured).toBe(false) // empty string = not configured
    expect(signals.openrouter.configured).toBe(true)
    expect(signals.minimax.configured).toBe(false)
    // The secret values appear nowhere in the produced signals.
    expect(JSON.stringify(signals)).not.toContain('SECRET')
    expect(PROVIDERS.find((provider) => provider.id === 'claude')).toMatchObject({
      label: 'Anthropic API',
      planType: 'Metered API route',
    })
    expect(PROVIDERS.find((provider) => provider.id === 'openai')?.label).toBe('OpenAI API')
    expect(JSON.stringify(PROVIDERS)).not.toMatch(/Max subscription|OpenAI Max|Claude Max/)
  })
})

describe('buildProviderCockpit', () => {
  it('returns all five providers with a no-secret payload shape', () => {
    const payload = buildProviderCockpit({ signals: allConfigured(), now: NOW })
    expect(payload.providers).toHaveLength(5)
    expect(payload.providers.map((p) => p.id).sort()).toEqual(['claude', 'gemini', 'minimax', 'openai', 'openrouter'])
    expect(payload.summary.total).toBe(5)
    // Each provider declares a truth level.
    for (const p of payload.providers) expect(['live', 'estimated', 'manual', 'unavailable']).toContain(p.truthLevel)
    // No key-ish fields leak into the payload.
    const json = JSON.stringify(payload)
    expect(json).not.toMatch(/api[_-]?key|secret|token|sk-ant|or-/i)
  })

  it('routes each lane to its primary when all are available', () => {
    const payload = buildProviderCockpit({ signals: allConfigured(), now: NOW })
    const deep = payload.routing.find((r) => r.lane === 'deep_reasoning')
    expect(deep?.recommended).toBe('claude')
    expect(deep?.reason).toBe('primary')
  })

  it('shifts routing to the fallback when the primary is blocked', () => {
    // Claude blocked (deep_reasoning primary) → falls back to openai.
    const payload = buildProviderCockpit({
      signals: allConfigured({ claude: { configured: true, usagePressure: 0.99 } }),
      now: NOW,
    })
    const deep = payload.routing.find((r) => r.lane === 'deep_reasoning')
    expect(deep?.recommended).toBe('openai')
    expect(deep?.reason).toMatch(/fallback from claude/)
    expect(payload.providers.find((p) => p.id === 'claude')?.state).toBe('blocked')
  })

  it('reports a lane as unroutable when the whole fallback chain is blocked', () => {
    // openrouter (fast_drafting → gemini → openrouter chain end) all blocked.
    const blocked: Partial<Record<ProviderId, ProviderSignal>> = {
      gemini: { configured: false },
      openrouter: { configured: false },
    }
    const payload = buildProviderCockpit({ signals: allConfigured(blocked), now: NOW })
    const fast = payload.routing.find((r) => r.lane === 'fast_drafting')
    expect(fast?.recommended).toBeNull()
    expect(fast?.reason).toMatch(/usable runtime telemetry/)
  })

  it('does not recommend a configured provider whose runtime telemetry is unknown', () => {
    const signals = allConfigured({
      claude: { configured: true },
      openai: { configured: true },
    })
    const payload = buildProviderCockpit({ signals, now: NOW })
    const deep = payload.routing.find((route) => route.lane === 'deep_reasoning')

    expect(deep).toMatchObject({
      recommended: null,
      reason: 'no candidate has usable runtime telemetry',
    })
  })
})
