import { beforeEach, describe, expect, it, vi } from 'vitest'

const dispatchNextMock = vi.fn()
const getWorkersMock = vi.fn()
const requireLocalOrAuthMock = vi.fn(() => true)

vi.mock('../../../server/auth-middleware', () => ({
  requireLocalOrAuth: requireLocalOrAuthMock,
}))
vi.mock('../../../server/rate-limit', () => ({
  requireJsonContentType: () => null,
}))
vi.mock('../../../server/lanes', () => ({
  getNexusDispatcher: () => ({ dispatchNext: dispatchNextMock }),
  getNexusWorkers: getWorkersMock,
}))

describe('Nexus dispatch API', () => {
  beforeEach(() => {
    dispatchNextMock.mockReset()
    getWorkersMock.mockReset()
    requireLocalOrAuthMock.mockReturnValue(true)
  })

  it('refuses the dormant Mac Mini Tailscale interface', async () => {
    getWorkersMock.mockResolvedValueOnce([
      {
        id: 'mac-mini-tailscale',
        enabled: false,
        reason: 'Interface only — remote identity is not verified',
      },
    ])
    const handlers = Route.options.server?.handlers as {
      POST: (ctx: { request: Request }) => Promise<Response>
    }
    const response = await handlers.POST({
      request: new Request('http://localhost/api/lanes/dispatch', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ workerId: 'mac-mini-tailscale' }),
      }),
    })

    expect(response.status).toBe(409)
    expect(dispatchNextMock).not.toHaveBeenCalled()
  })

  it('dispatches one task only through an admitted worker', async () => {
    getWorkersMock.mockResolvedValueOnce([{ id: 'codex-cli', enabled: true }])
    dispatchNextMock.mockResolvedValueOnce({ outcome: 'idle', task: null })
    const handlers = Route.options.server?.handlers as {
      POST: (ctx: { request: Request }) => Promise<Response>
    }
    const response = await handlers.POST({
      request: new Request('http://localhost/api/lanes/dispatch', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ workerId: 'codex-cli' }),
      }),
    })

    expect(response.status).toBe(200)
    expect(dispatchNextMock).toHaveBeenCalledWith('codex-cli')
  })
})

const { Route } = await import('./dispatch')
