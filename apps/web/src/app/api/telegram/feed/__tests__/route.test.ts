import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

let chainResolve: any = { data: [], error: null }
function makeChain() {
  const b: Record<string, any> = {
    select: vi.fn(), order: vi.fn(), limit: vi.fn(),
    then(onFulfilled: any, onRejected: any) {
      return Promise.resolve(chainResolve).then(onFulfilled, onRejected)
    },
  }
  b.select.mockReturnValue(b); b.order.mockReturnValue(b); b.limit.mockReturnValue(b)
  return b
}
const mockFrom = vi.fn()
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))

import { createServiceClient } from '@/lib/supabase/service'
import { GET } from '../route'

function req() {
  return new NextRequest('https://app.test/api/telegram/feed')
}

describe('GET /api/telegram/feed', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    chainResolve = { data: [], error: null }
    mockFrom.mockReturnValue(makeChain())
    vi.mocked(createServiceClient).mockReturnValue({ from: mockFrom } as any)
  })

  it('returns 200 with not_connected when table missing (42P01)', async () => {
    chainResolve = { data: null, error: { code: '42P01', message: 'relation does not exist' } }
    const res = await GET(req())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.source).toBe('not_connected')
    expect(body.messages).toHaveLength(0)
  })

  it('returns 500 on other DB errors', async () => {
    chainResolve = { data: null, error: { code: 'PGRST', message: 'DB error' } }
    const res = await GET(req())
    expect(res.status).toBe(500)
  })

  it('returns 200 with messages on success', async () => {
    chainResolve = { data: [{ id: '1', sender_name: 'Phill', is_from_bot: false, message: 'Hi', response: null, platform: 'telegram', created_at: '2026-01-01T00:00:00Z' }], error: null }
    const res = await GET(req())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.source).toBe('telegram_messages')
    expect(body.messages.length).toBeGreaterThan(0)
  })
})
