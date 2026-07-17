import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))
vi.mock('@/lib/integrations/google', () => ({
  getConnectedGoogleAccounts: vi.fn(),
  fetchThreadsPaginated: vi.fn(),
  archiveThread: vi.fn(),
}))
vi.mock('@/lib/ai/capabilities/email-triage', () => ({ triageThreadBatch: vi.fn() }))
vi.mock('@/lib/integrations/linear', () => ({ createIssue: vi.fn() }))
vi.mock('@/lib/notifications', () => ({ notify: vi.fn().mockResolvedValue(undefined) }))

import { getConnectedGoogleAccounts } from '@/lib/integrations/google'
import { GET } from '../route'

vi.stubEnv('CRON_SECRET', 'test-secret')
vi.stubEnv('FOUNDER_USER_ID', 'founder-1')

function req(auth = 'Bearer test-secret') {
  return new Request('https://app.test', { headers: { authorization: auth } })
}

describe('GET /api/cron/email-triage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthorized', async () => {
    const res = await GET(req('bad'))
    expect(res.status).toBe(401)
  })

  it('rejects `Bearer undefined` when CRON_SECRET is unset (no bypass)', async () => {
    vi.stubEnv('CRON_SECRET', undefined)
    const res = await GET(req('Bearer undefined'))
    expect(res.status).not.toBe(200)
    expect(res.status).toBe(500)
    expect(getConnectedGoogleAccounts).not.toHaveBeenCalled()
    vi.stubEnv('CRON_SECRET', 'test-secret')
  })

  it('returns 200 when no connected accounts', async () => {
    vi.mocked(getConnectedGoogleAccounts).mockResolvedValue([])
    const res = await GET(req())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.totalTriaged).toBe(0)
    expect(body.accounts).toBe(0)
  })

  it('returns 200 with success=true when no accounts processed', async () => {
    vi.mocked(getConnectedGoogleAccounts).mockResolvedValue([])
    const res = await GET(req())
    const body = await res.json()
    expect(body.success).toBe(true)
  })
})
