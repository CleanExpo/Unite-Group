import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createHmac } from 'crypto'

const TEST_KEY = 'test-xero-webhook-key'
process.env.XERO_WEBHOOK_KEY = TEST_KEY

vi.mock('@/lib/webhooks/xero', () => ({
  verifyXeroWebhookSignature: vi.fn(),
}))

import { POST } from '../route'
import { verifyXeroWebhookSignature } from '@/lib/webhooks/xero'

function makePostReq(body: string, sig: string | null = validSig(body)): Request {
  const headers: HeadersInit = sig !== null ? { 'x-xero-signature': sig } : {}
  return new Request('https://app.test/api/webhooks/xero', {
    method: 'POST',
    headers,
    body,
  })
}

function validSig(body: string): string {
  return createHmac('sha256', TEST_KEY).update(body).digest('base64')
}

const VALID_PAYLOAD = JSON.stringify({
  events: [{ eventType: 'UPDATE', eventCategory: 'INVOICE', resourceId: 'inv-1', tenantId: 'tenant-1' }],
  firstEventSequence: 1,
  lastEventSequence: 1,
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(verifyXeroWebhookSignature).mockReturnValue(true)
})

describe('POST /api/webhooks/xero', () => {
  it('rejects missing signature with 401', async () => {
    vi.mocked(verifyXeroWebhookSignature).mockReturnValue(false)
    const res = await POST(makePostReq(VALID_PAYLOAD, null))
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Invalid signature')
  })

  it('rejects invalid signature with 401', async () => {
    vi.mocked(verifyXeroWebhookSignature).mockReturnValue(false)
    const res = await POST(makePostReq(VALID_PAYLOAD, 'bad-sig'))
    expect(res.status).toBe(401)
  })

  it('accepts valid signature and returns event count', async () => {
    const res = await POST(makePostReq(VALID_PAYLOAD))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.events).toBe(1)
  })

  it('returns 0 events for empty events array', async () => {
    const body = JSON.stringify({ events: [], firstEventSequence: 5, lastEventSequence: 5 })
    const res = await POST(makePostReq(body))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.events).toBe(0)
  })

  it('returns 0 events when payload has no events field', async () => {
    const body = JSON.stringify({ entropy: 'abc' })
    const res = await POST(makePostReq(body))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.events).toBe(0)
  })

  it('returns 400 for invalid JSON body', async () => {
    const body = 'not-json'
    // verifyXeroWebhookSignature is mocked to return true — parse error is what we test
    const res = await POST(makePostReq(body))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Invalid JSON')
  })
})
