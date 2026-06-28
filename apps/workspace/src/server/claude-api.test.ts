import { describe, expect, it, vi } from 'vitest'

vi.mock('./gateway-capabilities', () => ({
  BEARER_TOKEN: '',
  CLAUDE_API: 'http://127.0.0.1:8642',
  SESSIONS_API_UNAVAILABLE_MESSAGE: 'Sessions API unavailable',
  dashboardFetch: vi.fn(),
  ensureGatewayProbed: vi.fn(),
  getCapabilities: vi.fn(() => ({ dashboard: { available: true } })),
  probeGateway: vi.fn(),
}))

vi.mock('./claude-dashboard-api', () => ({
  createSession: vi.fn(),
  deleteSession: vi.fn(),
  forkSession: vi.fn(),
  getSession: vi.fn(),
  getSessionMessages: vi.fn(),
  listSessions: vi.fn(),
  searchSessions: vi.fn(),
  updateSession: vi.fn(),
}))

describe('claude-api listSessions dashboard shape normalization', () => {
  it('accepts dashboard payloads shaped as {sessions: [...]}', async () => {
    const dashboard = await import('./claude-dashboard-api')
    vi.mocked(dashboard.listSessions).mockResolvedValueOnce({
      sessions: [{ id: 'session-a', title: 'A' }],
      total: 1,
      limit: 50,
      offset: 0,
    })

    const { listSessions } = await import('./claude-api')
    await expect(listSessions()).resolves.toEqual([
      { id: 'session-a', title: 'A' },
    ])
  })

  it('accepts dashboard payloads shaped as {items: [...]}', async () => {
    const dashboard = await import('./claude-dashboard-api')
    vi.mocked(dashboard.listSessions).mockResolvedValueOnce({
      items: [{ id: 'session-b', title: 'B' }],
      total: 1,
      limit: 50,
      offset: 0,
    } as never)

    const { listSessions } = await import('./claude-api')
    await expect(listSessions()).resolves.toEqual([
      { id: 'session-b', title: 'B' },
    ])
  })

  it('returns an empty list instead of leaking a .map crash for unknown dashboard payloads', async () => {
    const dashboard = await import('./claude-dashboard-api')
    vi.mocked(dashboard.listSessions).mockResolvedValueOnce({
      ok: true,
      sessions: undefined,
    } as never)

    const { listSessions } = await import('./claude-api')
    await expect(listSessions()).resolves.toEqual([])
  })
})
