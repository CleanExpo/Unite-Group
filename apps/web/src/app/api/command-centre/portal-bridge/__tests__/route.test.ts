import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/cron-auth', () => ({ isCronAuthorised: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))
vi.mock('@/lib/portal/projects/bridge', () => ({ bridgeItems: vi.fn() }))

import { isCronAuthorised } from '@/lib/cron-auth'
import { bridgeItems } from '@/lib/portal/projects/bridge'
import { getUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

import { POST } from '../route'

const FOUNDER = '00000000-0000-0000-0000-00000000f001'
const req = () => new Request('http://localhost/api/command-centre/portal-bridge', { method: 'POST' })

function service(result: { data: unknown; error: unknown }) {
  const chain = { select: () => chain, is: () => chain, order: () => chain, limit: async () => result }
  return { from: vi.fn(() => chain), rpc: vi.fn(async () => ({ error: null })) }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('FOUNDER_USER_ID', FOUNDER)
  vi.mocked(isCronAuthorised).mockReturnValue(false)
})
afterEach(() => vi.unstubAllEnvs())

describe('POST /api/command-centre/portal-bridge', () => {
  it('refuses when the founder is not configured, before any database call', async () => {
    vi.stubEnv('FOUNDER_USER_ID', '  ')
    expect((await POST(req())).status).toBe(503)
    expect(createServiceClient).not.toHaveBeenCalled()
  })

  it('refuses a signed-out caller and any signed-in account that is not the founder (a portal client)', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)
    expect((await POST(req())).status).toBe(401)
    vi.mocked(getUser).mockResolvedValue({ id: '00000000-0000-0000-0000-0000000000a1' } as never)
    expect((await POST(req())).status).toBe(403)
    expect(createServiceClient).not.toHaveBeenCalled()
  })

  it('treats a failed read as a failure, not as nothing to do', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: FOUNDER } as never)
    vi.mocked(createServiceClient).mockReturnValue(service({ data: null, error: { message: 'boom' } }) as never)
    expect((await POST(req())).status).toBe(502)
    expect(bridgeItems).not.toHaveBeenCalled()
  })

  it('runs for the founder or a cron caller and reports partial failure as 207', async () => {
    vi.mocked(isCronAuthorised).mockReturnValue(true)
    vi.mocked(createServiceClient).mockReturnValue(service({ data: [{ id: 'i1' }], error: null }) as never)
    vi.mocked(bridgeItems).mockResolvedValue({ attempted: 1, linked: 0, createdTasks: 0, failures: [{ itemId: 'i1', reason: 'x' }] })
    const res = await POST(req())
    expect(res.status).toBe(207)
    expect(vi.mocked(bridgeItems).mock.calls[0][1]).toBe(FOUNDER)
    expect(getUser).not.toHaveBeenCalled()
  })
})
