import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))
vi.mock('@/lib/integrations/google', () => ({
  getConnectedGoogleAccounts: vi.fn(),
  fetchThreadsPaginated: vi.fn(),
  archiveThread: vi.fn(),
}))
vi.mock('@/lib/ai/capabilities/email-triage', () => ({ triageThreadBatch: vi.fn() }))
vi.mock('@/lib/integrations/linear', () => ({ createIssue: vi.fn() }))
vi.mock('@/lib/notifications', () => ({ notify: vi.fn().mockResolvedValue(undefined) }))

import { createServiceClient } from '@/lib/supabase/service'
import { getConnectedGoogleAccounts, fetchThreadsPaginated, archiveThread } from '@/lib/integrations/google'
import { triageThreadBatch } from '@/lib/ai/capabilities/email-triage'
import { createIssue } from '@/lib/integrations/linear'
import { GET } from '../route'

function req(auth = 'Bearer test-secret') {
  return new Request('https://app.test', { headers: { authorization: auth } })
}

function expectNothingTouched() {
  expect(createServiceClient).not.toHaveBeenCalled()
  expect(getConnectedGoogleAccounts).not.toHaveBeenCalled()
  expect(fetchThreadsPaginated).not.toHaveBeenCalled()
  expect(triageThreadBatch).not.toHaveBeenCalled()
  expect(archiveThread).not.toHaveBeenCalled()
  expect(createIssue).not.toHaveBeenCalled()
}

// Every value that must leave the cron OFF (UNI-3052). Only exactly 'true' arms it.
const OFF_VALUES: Array<[string, string | undefined]> = [
  ['unset', undefined],
  ['"false"', 'false'],
  ['"TRUE"', 'TRUE'],
  ['" true " (padded)', ' true '],
]

describe('GET /api/cron/email-triage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('CRON_SECRET', 'test-secret')
    vi.stubEnv('FOUNDER_USER_ID', 'founder-1')
    vi.stubEnv('EMAIL_TRIAGE_ENABLED', 'true')
  })
  afterEach(() => vi.unstubAllEnvs())

  describe('off-switch EMAIL_TRIAGE_ENABLED (UNI-3052)', () => {
    it.each(OFF_VALUES)(
      'is dormant when EMAIL_TRIAGE_ENABLED is %s: 200 skipped, no mailbox, model or Linear call',
      async (_label, value) => {
        vi.stubEnv('EMAIL_TRIAGE_ENABLED', value)
        vi.mocked(getConnectedGoogleAccounts).mockResolvedValue([
          { email: 'a@example.test' } as never,
        ])
        const res = await GET(req())
        expect(res.status).toBe(200)
        expect(await res.json()).toEqual({
          dormant: true,
          skipped: 'EMAIL_TRIAGE_ENABLED is not true',
        })
        expectNothingTouched()
      },
    )

    it('runs the existing flow when EMAIL_TRIAGE_ENABLED is exactly "true"', async () => {
      vi.mocked(createServiceClient).mockReturnValue({} as never)
      vi.mocked(getConnectedGoogleAccounts).mockResolvedValue([
        { email: 'a@example.test' } as never,
      ])
      vi.mocked(fetchThreadsPaginated).mockResolvedValue({ threads: [] } as never)
      const res = await GET(req())
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.dormant).toBeUndefined()
      expect(body.accounts).toBe(1)
      expect(getConnectedGoogleAccounts).toHaveBeenCalledWith('founder-1')
      expect(fetchThreadsPaginated).toHaveBeenCalledTimes(1)
      expect(fetchThreadsPaginated).toHaveBeenCalledWith('founder-1', 'a@example.test', {
        query: 'in:inbox is:unread',
        maxResults: 50,
      })
    })
  })

  describe('CRON_SECRET auth stays first, whatever EMAIL_TRIAGE_ENABLED is', () => {
    it.each([...OFF_VALUES, ['"true"', 'true'] as [string, string]])(
      'returns 401 Unauthorised for a bad bearer when EMAIL_TRIAGE_ENABLED is %s',
      async (_label, value) => {
        vi.stubEnv('EMAIL_TRIAGE_ENABLED', value)
        const res = await GET(req('bad'))
        expect(res.status).toBe(401)
        expect(await res.json()).toEqual({ error: 'Unauthorised' })
        expectNothingTouched()
      },
    )

    it.each([...OFF_VALUES, ['"true"', 'true'] as [string, string]])(
      'rejects `Bearer undefined` with 500 when CRON_SECRET is unset and EMAIL_TRIAGE_ENABLED is %s',
      async (_label, value) => {
        vi.stubEnv('EMAIL_TRIAGE_ENABLED', value)
        vi.stubEnv('CRON_SECRET', undefined)
        const res = await GET(req('Bearer undefined'))
        expect(res.status).toBe(500)
        expect(await res.json()).toEqual({ error: 'CRON_SECRET not configured' })
        expectNothingTouched()
      },
    )
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
