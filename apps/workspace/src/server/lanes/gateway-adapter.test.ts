import { describe, expect, it, vi } from 'vitest'
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

  it('fails closed when a legacy lane has no exact model', async () => {
    const lane: Lane = {
      ...gatewayLane,
      backend: { kind: 'gateway', provider: 'openrouter', model: '' },
    }
    const adapter = createGatewayAdapter({
      baseUrl: 'http://gw',
      chat: async (a) => a.model,
    })
    await expect(adapter.run(lane, 'x')).rejects.toThrow(/exact gateway model/i)
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

  it('propagates the orchestrator abort signal to the gateway request', async () => {
    const controller = new AbortController()
    let captured: AbortSignal | undefined
    const adapter = createGatewayAdapter({
      baseUrl: 'http://gw',
      chat: async (args) => {
        captured = args.signal
        return 'ok'
      },
    })

    await adapter.run(gatewayLane, 'x', { signal: controller.signal })

    expect(captured).toBe(controller.signal)
  })

  it('uses the configured bearer token for gateway execution', async () => {
    let capturedHeaders: HeadersInit | undefined
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
        capturedHeaders = init?.headers
        return new Response(
          JSON.stringify({ choices: [{ message: { content: 'ok' } }] }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        )
      }),
    )
    const adapter = createGatewayAdapter({
      baseUrl: 'http://gw',
      bearerToken: 'test-gateway-token',
    })

    try {
      await adapter.run(gatewayLane, 'x')
    } finally {
      vi.unstubAllGlobals()
    }

    expect(capturedHeaders).toMatchObject({
      authorization: 'Bearer test-gateway-token',
    })
  })

  it.each([
    { error: { message: 'upstream failure' } },
    { choices: [] },
    { choices: [{ message: {} }] },
    { choices: [{ message: { content: 42 } }] },
  ])('fails closed for a malformed successful response: %o', async (body) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify(body), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    )
    const adapter = createGatewayAdapter({ baseUrl: 'http://gw' })

    try {
      await expect(adapter.run(gatewayLane, 'x')).rejects.toThrow(
        /malformed gateway response/i,
      )
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('sanitises gateway output and error detail before returning it', async () => {
    const secret = `sk-${'a'.repeat(48)}`
    const outputAdapter = createGatewayAdapter({
      baseUrl: 'http://gw',
      chat: async () => `result ${secret}`,
    })
    const errorAdapter = createGatewayAdapter({
      baseUrl: 'http://gw',
      chat: async () => {
        throw new Error(`gateway failed with ${secret}`)
      },
    })

    expect((await outputAdapter.run(gatewayLane, 'x')).output).not.toContain(secret)
    await expect(errorAdapter.run(gatewayLane, 'x')).rejects.not.toThrow(secret)
  })
})
