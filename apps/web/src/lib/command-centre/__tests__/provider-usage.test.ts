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
  it('reports presence as booleans only, never the key value', () => {
    const env = { ANTHROPIC_API_KEY: 'sk-ant-SECRET', OPENAI_API_KEY: '', OPENROUTER_API_KEY: 'or-SECRET' }
    const signals = readProviderSignalsFromEnv(env)
    expect(signals.claude.configured).toBe(true)
    expect(signals.openai.configured).toBe(false) // empty string = not configured
    expect(signals.openrouter.configured).toBe(true)
    expect(signals.minimax.configured).toBe(false)
    // The secret values appear nowhere in the produced signals.
    expect(JSON.stringify(signals)).not.toContain('SECRET')
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
    expect(fast?.reason).toMatch(/blocked/)
  })
})

describe('UNI-2338 — plan seats (honest per-seat bars)', () => {
  it('claude declares 3 seats, openai 1, others none', () => {
    const payload = buildProviderCockpit({ signals: allConfigured(), now: NOW })
    const byId = new Map(payload.providers.map((p) => [p.id, p]))
    expect(byId.get('claude')?.plans).toHaveLength(3)
    expect(byId.get('openai')?.plans).toHaveLength(1)
    expect(byId.get('gemini')?.plans).toBeUndefined()
    expect(byId.get('openrouter')?.plans).toBeUndefined()
  })

  it('unconfigured provider → seats blocked with null pct (never fabricated)', () => {
    const payload = buildProviderCockpit({
      signals: allConfigured({ claude: { configured: false } }),
      now: NOW,
    })
    const claude = payload.providers.find((p) => p.id === 'claude')!
    for (const seat of claude.plans!) {
      expect(seat.state).toBe('blocked')
      expect(seat.usagePct).toBeNull()
      expect(seat.truthLevel).toBe('unavailable')
    }
  })

  it('configured but no per-seat telemetry → unknown with null pct', () => {
    const payload = buildProviderCockpit({
      signals: allConfigured({ claude: { configured: true } }),
      now: NOW,
    })
    const claude = payload.providers.find((p) => p.id === 'claude')!
    for (const seat of claude.plans!) {
      expect(seat.state).toBe('unknown')
      expect(seat.usagePct).toBeNull()
    }
  })

  it('seatPressures drive per-seat state/pct at truth=manual', () => {
    const payload = buildProviderCockpit({
      signals: allConfigured({
        claude: { configured: true, seatPressures: { claude_max_1: 0.6, claude_max_3: 0.97 } },
      }),
      now: NOW,
    })
    const seats = new Map(payload.providers.find((p) => p.id === 'claude')!.plans!.map((s) => [s.id, s]))
    expect(seats.get('claude_max_1')).toMatchObject({ state: 'watching', usagePct: 60, truthLevel: 'manual' })
    expect(seats.get('claude_max_2')).toMatchObject({ state: 'unknown', usagePct: null })
    expect(seats.get('claude_max_3')).toMatchObject({ state: 'blocked', usagePct: 97, truthLevel: 'manual' })
  })

  it('readProviderSignalsFromEnv parses pressure envs and ignores junk', () => {
    const signals = readProviderSignalsFromEnv({
      ANTHROPIC_API_KEY: 'x',
      PROVIDER_USAGE_PRESSURE_CLAUDE: '0.7',
      PLAN_SEAT_PRESSURE_CLAUDE_MAX_1: '0.4',
      PLAN_SEAT_PRESSURE_CLAUDE_MAX_2: 'not-a-number',
      PLAN_SEAT_PRESSURE_CODEX_MAX_1: '1.7',
      OPENAI_API_KEY: 'y',
    })
    expect(signals.claude).toMatchObject({ configured: true, usagePressure: 0.7, truth: 'manual' })
    expect(signals.claude.seatPressures).toEqual({ claude_max_1: 0.4 })
    expect(signals.openai.seatPressures).toEqual({ codex_max_1: 1 }) // clamped
  })
})
