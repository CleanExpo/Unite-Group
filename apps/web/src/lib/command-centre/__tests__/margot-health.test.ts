import { describe, it, expect } from 'vitest'
import { deriveMargotHealth, type MargotHealthInput } from '../margot-health'

const NOW = '2026-07-05T00:00:00.000Z'

function input(over: Partial<MargotHealthInput> = {}): MargotHealthInput {
  return {
    now: NOW,
    windowDays: 14,
    config: { elevenLabsApiKey: true, margotAgentId: true, ingestToken: true, founderConfigured: true },
    voice: { ok: true, latestSessionAt: '2026-07-04T10:00:00.000Z', sessionsInWindow: 3 },
    presence: { ok: true, latestSeenAt: '2026-07-05T00:00:00.000Z', agentCount: 2 },
    ...over,
  }
}

describe('deriveMargotHealth', () => {
  it('voiceReady is true only when API key AND agent id are present', () => {
    expect(deriveMargotHealth(input()).voiceReady).toBe(true)
    expect(deriveMargotHealth(input({ config: { elevenLabsApiKey: true, margotAgentId: false, ingestToken: true, founderConfigured: true } })).voiceReady).toBe(false)
    expect(deriveMargotHealth(input({ config: { elevenLabsApiKey: false, margotAgentId: true, ingestToken: true, founderConfigured: true } })).voiceReady).toBe(false)
  })

  it('echoes config booleans without inventing key material', () => {
    const p = deriveMargotHealth(input())
    expect(p.config).toEqual({ elevenLabsApiKey: true, margotAgentId: true, ingestToken: true, founderConfigured: true })
    expect(JSON.stringify(p)).not.toMatch(/sk-|xi-api/i)
  })

  it('marks voice source as error and surfaces the message when the read failed', () => {
    const p = deriveMargotHealth(input({ voice: { ok: false, latestSessionAt: null, sessionsInWindow: 0, error: 'voice read failed' } }))
    expect(p.voice.source).toBe('error')
    expect(p.voice.error).toBe('voice read failed')
    expect(p.voice.latestSessionAt).toBeNull()
  })

  it('marks agent source live and passes through the heartbeat + count', () => {
    const p = deriveMargotHealth(input())
    expect(p.agents.source).toBe('live')
    expect(p.agents.latestSeenAt).toBe('2026-07-05T00:00:00.000Z')
    expect(p.agents.activeCount).toBe(2)
  })

  it('is stamped with the honest cc source discriminator', () => {
    expect(deriveMargotHealth(input()).source).toBe('cc:margot-health')
  })
})
