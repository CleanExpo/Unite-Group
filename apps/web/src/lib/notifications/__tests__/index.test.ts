import { beforeEach, describe, expect, it, vi } from 'vitest'

const serviceMocks = vi.hoisted(() => ({
  hasSupabaseServiceConfig: vi.fn(),
  createServiceClient: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  single: vi.fn(),
}))

vi.mock('@/lib/supabase/service', () => ({
  hasSupabaseServiceConfig: serviceMocks.hasSupabaseServiceConfig,
  createServiceClient: serviceMocks.createServiceClient,
}))

vi.mock('../slack', () => ({
  formatSlackNotification: vi.fn(),
  sendSlack: vi.fn(),
}))

import { notify, type NotificationPayload } from '../index'

const payload: NotificationPayload = {
  type: 'cron_complete',
  title: 'Daily run complete',
  body: 'The daily run completed.',
  severity: 'info',
}

describe('notify founder identity', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    serviceMocks.hasSupabaseServiceConfig.mockReturnValue(true)
    serviceMocks.single.mockResolvedValue({
      data: {
        notification_slack: false,
        notification_digest: false,
        slack_webhook_url: null,
        slack_channel: null,
      },
      error: null,
    })
    serviceMocks.eq.mockReturnValue({ single: serviceMocks.single })
    serviceMocks.select.mockReturnValue({ eq: serviceMocks.eq })
    serviceMocks.from.mockReturnValue({ select: serviceMocks.select })
    serviceMocks.createServiceClient.mockReturnValue({ from: serviceMocks.from })
  })

  it('trims the founder ID before querying user_settings', async () => {
    vi.stubEnv('FOUNDER_USER_ID', '  founder-uuid\r\n')

    await notify(payload)

    expect(serviceMocks.from).toHaveBeenCalledWith('user_settings')
    expect(serviceMocks.eq).toHaveBeenCalledWith('user_id', 'founder-uuid')
  })

  it.each([
    ['missing', undefined],
    ['whitespace-only', ' \n\t'],
  ])('fails closed for a %s founder ID before DB-backed channel work', async (_label, founderId) => {
    vi.stubEnv('FOUNDER_USER_ID', founderId)

    await notify(payload)

    expect(serviceMocks.hasSupabaseServiceConfig).not.toHaveBeenCalled()
    expect(serviceMocks.createServiceClient).not.toHaveBeenCalled()
    expect(serviceMocks.from).not.toHaveBeenCalled()
  })
})
