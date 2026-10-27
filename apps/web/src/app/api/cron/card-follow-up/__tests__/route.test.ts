import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn(() => ({})) }))
vi.mock('@/lib/cards/follow-up', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/cards/follow-up')>()
  return { isFollowUpSendEnabled: actual.isFollowUpSendEnabled, processCardFollowUps: vi.fn() }
})

import { processCardFollowUps } from '@/lib/cards/follow-up'
import { createServiceClient } from '@/lib/supabase/service'
import { GET } from '../route'

const req = (auth = 'Bearer test-secret') =>
  new Request('https://app.test/api/cron/card-follow-up', { headers: { authorization: auth } }) as never

describe('GET /api/cron/card-follow-up', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    vi.stubEnv('CRON_SECRET', 'test-secret')
    vi.stubEnv('FOUNDER_USER_ID', 'founder-1')
    vi.stubEnv('CARD_FOLLOWUP_EMAILS_ENABLED', 'true')
    vi.stubEnv('MAILTRAP_API_KEY', 'k')
  })

  it('refuses a bad secret', async () => {
    expect((await GET(req('Bearer wrong'))).status).toBe(401)
  })

  it('is held without the flag or the key: touches nothing', async () => {
    vi.stubEnv('MAILTRAP_API_KEY', '')
    const res = await GET(req())
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ status: 'held', dormant: true })
    vi.stubEnv('MAILTRAP_API_KEY', 'k')
    vi.stubEnv('CARD_FOLLOWUP_EMAILS_ENABLED', 'TRUE')
    expect(await (await GET(req())).json()).toMatchObject({ status: 'held' })
    expect(createServiceClient).not.toHaveBeenCalled()
    expect(processCardFollowUps).not.toHaveBeenCalled()
  })

  it('runs when enabled and reports partial on failures', async () => {
    vi.mocked(processCardFollowUps).mockResolvedValue({ checked: 2, sent: 1, skipped: 0, failed: 1 })
    expect(await (await GET(req())).json()).toMatchObject({ status: 'partial', sent: 1 })
  })

  it('answers 500 when orders cannot be read', async () => {
    vi.mocked(processCardFollowUps).mockRejectedValue(new Error('relation does not exist'))
    expect((await GET(req())).status).toBe(500)
  })
})
