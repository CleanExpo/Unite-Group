import { describe, expect, it, vi } from 'vitest'

vi.mock('../../server/auth-middleware', () => ({
  isAuthenticated: () => true,
}))

vi.mock('../../server/rate-limit', () => ({
  requireJsonContentType: () => null,
}))

vi.mock('../../server/local-session-store', () => ({
  deleteLocalSession: vi.fn(),
  getLocalSession: vi.fn(),
  listLocalSessions: () => [],
}))

const listSessionsMock = vi.fn()

vi.mock('../../server/claude-api', () => ({
  SESSIONS_API_UNAVAILABLE_MESSAGE: 'Sessions unavailable',
  createSession: vi.fn(),
  deleteSession: vi.fn(),
  ensureGatewayProbed: () =>
    Promise.resolve({
      sessions: true,
      dashboard: { available: false },
      enhancedChat: false,
    }),
  getGatewayCapabilities: vi.fn(),
  listSessions: (...args: Array<unknown>) => listSessionsMock(...args),
  toSessionSummary: (session: Record<string, unknown>) => session,
  updateSession: vi.fn(),
}))

describe('/api/sessions defensive shape handling', () => {
  it('returns an empty sessions array instead of crashing when backend listSessions returns undefined', async () => {
    listSessionsMock.mockResolvedValueOnce(undefined)
    const { Route } = await import('./sessions')

    const handlers = Route.options.server?.handlers as {
      GET: (ctx: { request: Request }) => Promise<Response>
    }
    const response = await handlers.GET({
      request: new Request('http://localhost/api/sessions'),
    })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ sessions: [] })
  })
})
