import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn(), createClient: vi.fn() }))
vi.mock('@/lib/command-centre/agent-events', async (orig) => {
  const actual = await orig<typeof import('@/lib/command-centre/agent-events')>()
  return { ...actual, listAgentEvents: vi.fn() }
})

import { listAgentEvents } from '@/lib/command-centre/agent-events'
import { createClient, getUser } from '@/lib/supabase/server'
import { GET } from '../route'

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getUser).mockResolvedValue({ id: 'founder-1' } as never)
  vi.mocked(createClient).mockResolvedValue({} as never)
  vi.mocked(listAgentEvents).mockResolvedValue([])
})

describe('GET /api/command-centre/machine-activity', () => {
  it('requires founder authentication before database access', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const response = await GET()
    expect(response.status).toBe(401)
    expect(createClient).not.toHaveBeenCalled()
  })

  it('returns the fixed three-machine, six-screen projection', async () => {
    const response = await GET()
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(body.source).toBe('connected')
    expect(body.machines).toHaveLength(3)
    expect(body.machines.flatMap((machine: { screens: unknown[] }) => machine.screens)).toHaveLength(6)
  })

  it('returns an honest not-connected topology when the ledger migration is absent', async () => {
    vi.mocked(listAgentEvents).mockRejectedValue(new Error('relation "cc_agent_events" does not exist'))
    const response = await GET()
    const body = await response.json()
    expect(body.source).toBe('not_connected')
    expect(body.reason).toBe('migration_not_applied')
    expect(body.machines).toHaveLength(3)
  })

  it('returns an honest error topology without exposing database text', async () => {
    vi.mocked(listAgentEvents).mockRejectedValue(new Error('private database host connection failed'))
    const response = await GET()
    const bodyText = await response.text()
    const body = JSON.parse(bodyText)
    expect(body.source).toBe('error')
    expect(body.reason).toBe('query_failed')
    expect(bodyText).not.toContain('private database host')
  })
})
