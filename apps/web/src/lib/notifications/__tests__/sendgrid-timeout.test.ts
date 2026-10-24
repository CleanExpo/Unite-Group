import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  singletonSend: vi.fn(), singletonKey: vi.fn(), singletonTimeout: vi.fn(),
  isolatedSend: vi.fn(), isolatedKey: vi.fn(), isolatedTimeout: vi.fn(), construct: vi.fn(),
}))
vi.mock('@sendgrid/mail', () => {
  class MailService {
    constructor() { mocks.construct() }
    setApiKey = mocks.isolatedKey
    setTimeout = mocks.isolatedTimeout
    send = mocks.isolatedSend
  }
  return {
    MailService,
    default: { setApiKey: mocks.singletonKey, setTimeout: mocks.singletonTimeout, send: mocks.singletonSend },
  }
})
import { sendEmail } from '@/lib/integrations/sendgrid'

const input = { to: { email: 'recipient@example.invalid' }, from: { email: 'sender@example.invalid' },
  subject: 'Test', html: '<p>Test</p>', text: 'Test' }
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('SENDGRID_API_KEY', 'test-placeholder')
  mocks.singletonSend.mockResolvedValue([{ headers: {}, statusCode: 202 }])
  mocks.isolatedSend.mockResolvedValue([{ headers: {}, statusCode: 202 }])
})
afterEach(() => vi.unstubAllEnvs())

describe('SendGrid alert timeout isolation', () => {
  it('sets a five-second timeout only on the alert instance', async () => {
    expect(await sendEmail({ ...input, timeoutMs: 5000 })).toBe('202')
    expect(mocks.construct).toHaveBeenCalledTimes(1)
    expect(mocks.isolatedKey).toHaveBeenCalledWith('test-placeholder')
    expect(mocks.isolatedTimeout).toHaveBeenCalledWith(5000)
    expect(mocks.isolatedSend).toHaveBeenCalledTimes(1)
    expect(mocks.singletonTimeout).not.toHaveBeenCalled()
    expect(mocks.singletonSend).not.toHaveBeenCalled()
    await sendEmail(input)
    expect(mocks.singletonSend).toHaveBeenCalledTimes(1)
    expect(mocks.isolatedSend).toHaveBeenCalledTimes(1)
    expect(mocks.singletonTimeout).not.toHaveBeenCalled()
  })
})
