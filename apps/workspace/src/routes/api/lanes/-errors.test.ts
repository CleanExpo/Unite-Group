import { describe, expect, it, vi } from 'vitest'
import { StopNotAcknowledgedError } from '../../../server/lanes/adapter'
import { LaneConflictError } from '../../../server/lanes/lane-orchestrator'

const createMock = vi.fn()
const listMock = vi.fn()
const stopMock = vi.fn()

vi.mock('../../../server/auth-middleware', () => ({
  isAuthenticated: () => true,
}))

vi.mock('../../../server/rate-limit', () => ({
  requireJsonContentType: () => null,
}))

vi.mock('../../../server/lanes', () => ({
  getLaneOrchestrator: () => ({
    create: createMock,
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
})
