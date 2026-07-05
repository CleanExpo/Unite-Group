// Regression coverage for UNI-2282 — the ElevenLabs voice add-on seed must
// never claim 'live' by default. It should reflect actual ElevenLabs config
// (ELEVENLABS_API_KEY + ELEVENLABS_MARGOT_AGENT_ID, the same pair the
// margot-voice signed-url route reads) rather than a hardcoded 'live'
// state the control-panel API only overrides when a matching cc_tasks row
// exists.
import { describe, it, expect, afterEach, vi } from 'vitest'

describe('ADD_ON_GATES — voice add-on seed state', () => {
  const savedApiKey = process.env.ELEVENLABS_API_KEY
  const savedAgentId = process.env.ELEVENLABS_MARGOT_AGENT_ID

  afterEach(() => {
    if (savedApiKey === undefined) delete process.env.ELEVENLABS_API_KEY
    else process.env.ELEVENLABS_API_KEY = savedApiKey
    if (savedAgentId === undefined) delete process.env.ELEVENLABS_MARGOT_AGENT_ID
    else process.env.ELEVENLABS_MARGOT_AGENT_ID = savedAgentId
    vi.resetModules()
  })

  it('never claims live by default — planned when ElevenLabs is unconfigured', async () => {
    delete process.env.ELEVENLABS_API_KEY
    delete process.env.ELEVENLABS_MARGOT_AGENT_ID
    vi.resetModules()
    const { ADD_ON_GATES } = await import('./control-panel-data')
    const voice = ADD_ON_GATES.find((a) => a.id === 'voice')
    expect(voice?.state).toBe('planned')
    expect(voice?.state).not.toBe('live')
  })

  it('promotes to building (still not live) once ElevenLabs config is present', async () => {
    process.env.ELEVENLABS_API_KEY = 'test-key'
    process.env.ELEVENLABS_MARGOT_AGENT_ID = 'test-agent'
    vi.resetModules()
    const { ADD_ON_GATES } = await import('./control-panel-data')
    const voice = ADD_ON_GATES.find((a) => a.id === 'voice')
    expect(voice?.state).toBe('building')
    expect(voice?.state).not.toBe('live')
  })

  it('treats a partially-configured pair as unconfigured', async () => {
    process.env.ELEVENLABS_API_KEY = 'test-key'
    delete process.env.ELEVENLABS_MARGOT_AGENT_ID
    vi.resetModules()
    const { ADD_ON_GATES } = await import('./control-panel-data')
    const voice = ADD_ON_GATES.find((a) => a.id === 'voice')
    expect(voice?.state).toBe('planned')
  })

  it('leaves the other static seed values untouched', async () => {
    vi.resetModules()
    const { ADD_ON_GATES, CONTROL_WORKSTREAMS } = await import('./control-panel-data')
    expect(ADD_ON_GATES.find((a) => a.id === 'computer-use')?.state).toBe('gated')
    expect(ADD_ON_GATES.find((a) => a.id === 'qwen-workers')?.state).toBe('planned')
    expect(ADD_ON_GATES.find((a) => a.id === 'crm-kanban-sync')?.state).toBe('planned')
    expect(CONTROL_WORKSTREAMS).toHaveLength(7)
  })
})
