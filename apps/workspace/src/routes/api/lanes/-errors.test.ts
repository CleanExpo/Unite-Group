import { beforeEach, describe, expect, it, vi } from 'vitest'
import { StopNotAcknowledgedError } from '../../../server/lanes/adapter'
import { LaneConflictError } from '../../../server/lanes/lane-orchestrator'

const createMock = vi.fn()
const getMock = vi.fn()
const listMock = vi.fn()
const stopMock = vi.fn()
const requireLocalOrAuthMock = vi.fn(() => true)

vi.mock('../../../server/auth-middleware', () => ({
  requireLocalOrAuth: requireLocalOrAuthMock,
}))

vi.mock('../../../server/rate-limit', () => ({
  requireJsonContentType: () => null,
}))

vi.mock('../../../server/gateway-capabilities', () => ({
  BEARER_TOKEN: 'test-token',
  CLAUDE_API: 'http://127.0.0.1:1',
}))

vi.mock('../../../server/lanes', () => ({
  getLaneOrchestrator: () => ({
    create: createMock,
    get: getMock,
    list: listMock,
    stop: stopMock,
  }),
}))

type PostHandler = (ctx: { request: Request }) => Promise<Response>
type GetHandler = (ctx: { request: Request }) => Promise<Response>

function jsonRequest(path: string, body: unknown) {
  return new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('lane API error boundaries', () => {
  beforeEach(() => {
    requireLocalOrAuthMock.mockReturnValue(true)
  })

  it('denies every lane control route to unauthenticated remote callers', async () => {
    requireLocalOrAuthMock.mockReturnValue(false)
    const [
      { Route: createRoute },
      { Route: detailRoute },
      { Route: listRoute },
      { Route: stopRoute },
      { Route: backendsRoute },
    ] =
      await Promise.all([
        import('./create'),
        import('./$laneId'),
        import('./list'),
        import('./stop'),
        import('./backends'),
      ])
    const createHandlers = createRoute.options.server?.handlers as {
      POST: PostHandler
    }
    const detailHandlers = detailRoute.options.server?.handlers as {
      GET: (ctx: {
        request: Request
        params: { laneId: string }
      }) => Promise<Response>
    }
    const listHandlers = listRoute.options.server?.handlers as { GET: GetHandler }
    const stopHandlers = stopRoute.options.server?.handlers as { POST: PostHandler }
    const backendsHandlers = backendsRoute.options.server?.handlers as {
      GET: GetHandler
    }
    const remote = 'http://203.0.113.10/api/lanes'

    const responses = await Promise.all([
      createHandlers.POST({ request: jsonRequest('/api/lanes/create', {}) }),
      detailHandlers.GET({
        request: new Request(`${remote}/l1`),
        params: { laneId: 'l1' },
      }),
      listHandlers.GET({ request: new Request(`${remote}/list`) }),
      stopHandlers.POST({ request: jsonRequest('/api/lanes/stop', { id: 'l1' }) }),
      backendsHandlers.GET({ request: new Request(`${remote}/backends`) }),
    ])

    expect(responses.map((response) => response.status)).toEqual([
      401, 401, 401, 401, 401,
    ])
    expect(createMock).not.toHaveBeenCalled()
    expect(getMock).not.toHaveBeenCalled()
    expect(listMock).not.toHaveBeenCalled()
    expect(stopMock).not.toHaveBeenCalled()
  })

  it('does not expose create internals', async () => {
    createMock.mockRejectedValueOnce(
      new Error('EACCES /Users/operator/.config/provider-secret'),
    )
    const { Route } = await import('./create')
    const handlers = Route.options.server?.handlers as { POST: PostHandler }

    const response = await handlers.POST({
      request: jsonRequest('/api/lanes/create', {
        kind: 'cli',
        backend: { kind: 'cli', tool: 'codex', account: 'max-1' },
        role: 'builder',
        repo: '/repo',
      }),
    })

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: 'Failed to create lane',
    })
  })

  it('rejects a traversing CLI account before orchestration', async () => {
    const { Route } = await import('./create')
    const handlers = Route.options.server?.handlers as { POST: PostHandler }
    const callsBefore = createMock.mock.calls.length

    const response = await handlers.POST({
      request: jsonRequest('/api/lanes/create', {
        kind: 'cli',
        backend: {
          kind: 'cli',
          tool: 'codex',
          account: '../../outside',
        },
        role: 'builder',
        repo: '/repo',
      }),
    })

    expect(response.status).toBe(400)
    expect(createMock.mock.calls).toHaveLength(callsBefore)
  })

  it('rejects a blank gateway model before orchestration', async () => {
    const { Route } = await import('./create')
    const handlers = Route.options.server?.handlers as { POST: PostHandler }
    const callsBefore = createMock.mock.calls.length

    const response = await handlers.POST({
      request: jsonRequest('/api/lanes/create', {
        kind: 'gateway',
        backend: { kind: 'gateway', provider: 'minimax', model: '   ' },
        role: 'builder',
        repo: '/repo',
      }),
    })

    expect(response.status).toBe(400)
    expect(createMock.mock.calls).toHaveLength(callsBefore)
  })

  it('does not expose list internals', async () => {
    listMock.mockRejectedValueOnce(new Error('database password=synthetic-secret'))
    const { Route } = await import('./list')
    const handlers = Route.options.server?.handlers as { GET: GetHandler }

    const response = await handlers.GET({
      request: new Request('http://localhost/api/lanes/list'),
    })

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: 'Failed to list lanes',
    })
  })

  it.each([
    new LaneConflictError('Lane "l1" is stopping'),
    new StopNotAcknowledgedError('CLI stop was not acknowledged'),
  ])('maps a known stop conflict to 409', async (error) => {
    stopMock.mockRejectedValueOnce(error)
    const { Route } = await import('./stop')
    const handlers = Route.options.server?.handlers as { POST: PostHandler }

    const response = await handlers.POST({
      request: jsonRequest('/api/lanes/stop', { id: 'l1' }),
    })

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: error.message,
    })
  })

  it('does not expose unknown stop internals', async () => {
    stopMock.mockRejectedValueOnce(new Error('EISDIR /private/var/secret-ledger'))
    const { Route } = await import('./stop')
    const handlers = Route.options.server?.handlers as { POST: PostHandler }

    const response = await handlers.POST({
      request: jsonRequest('/api/lanes/stop', { id: 'l1' }),
    })

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: 'Failed to stop lane',
    })
  })

  it.each([null, {}, { id: {} }, { id: '   ' }, { id: 'x'.repeat(201) }])(
    'rejects malformed stop input before orchestration: %o',
    async (body) => {
      const { Route } = await import('./stop')
      const handlers = Route.options.server?.handlers as { POST: PostHandler }
      const callsBefore = stopMock.mock.calls.length

      const response = await handlers.POST({
        request: jsonRequest('/api/lanes/stop', body),
      })

      expect(response.status).toBe(400)
      expect(stopMock.mock.calls).toHaveLength(callsBefore)
    },
  )
})
