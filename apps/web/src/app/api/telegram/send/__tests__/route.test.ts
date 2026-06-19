import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))

import { getUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { POST } from '../route'

function req(body: object) {
  return new NextRequest('https://app.test/api/telegram/send', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  })
}

describe('POST /api/telegram/send', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createServiceClient).mockReturnValue({ from: vi.fn() } as any)
  })

  it('returns 401 when unauthorized', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await POST(req({ text: 'Hello' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when text missing', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await POST(req({}))
    expect(res.status).toBe(400)
  })

  it('returns 503 when Telegram not configured', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.stubEnv('TELEGRAM_BOT_TOKEN', '')
    vi.stubEnv('TELEGRAM_CHAT_ID', '')
    const res = await POST(req({ text: 'Hello' }))
    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.error).toBe('not_connected')
  })
})
