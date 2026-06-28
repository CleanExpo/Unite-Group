import { describe, expect, it } from 'vitest'
import { createGatewayAdapter } from './gateway-adapter'
import type { Lane } from './types'

const gatewayLane: Lane = {
  id: 'l1',
  kind: 'gateway',
  backend: { kind: 'gateway', provider: 'minimax', model: 'abab6.5' },
  role: 'builder',
  repo: '/r',
  worktree: '/w',
  branch: 'lane/l1',
  status: 'idle',
}

describe('GatewayLaneAdapter', () => {
  it('runs a mission via the injected chat fn and returns its output', async () => {
    const adapter = createGatewayAdapter({
      baseUrl: 'http://gw',
      chat: async (a) => `echo:${a.model}:${a.message}`,
    })
    const res = await adapter.run(gatewayLane, 'hello')
    expect(res.output).toBe('echo:abab6.5:hello')
  })

  it('falls back to the provider name when no model is set', async () => {
    const lane: Lane = {
      ...gatewayLane,
      backend: { kind: 'gateway', provider: 'openrouter', model: '' },
    }
    const adapter = createGatewayAdapter({
      baseUrl: 'http://gw',
      chat: async (a) => a.model,
    })
    expect((await adapter.run(lane, 'x')).output).toBe('openrouter')
  })

  it('rejects non-gateway lanes', async () => {
    const cliLane: Lane = {
      ...gatewayLane,
      kind: 'cli',
      backend: { kind: 'cli', tool: 'claude-code', account: 'max-1' },
    }
    const adapter = createGatewayAdapter({
      baseUrl: 'http://gw',
      chat: async () => '',
    })
    await expect(adapter.run(cliLane, 'x')).rejects.toThrow(/only runs gateway/)
  })

  it('propagates chat errors', async () => {
    const adapter = createGatewayAdapter({
      baseUrl: 'http://gw',
      chat: async () => {
        throw new Error('boom')
      },
    })
    await expect(adapter.run(gatewayLane, 'x')).rejects.toThrow('boom')
  })
})
