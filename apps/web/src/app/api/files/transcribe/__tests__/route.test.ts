import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockMaybeSingle = vi.fn()
function makeChain() {
  const b: Record<string, any> = { select: vi.fn(), eq: vi.fn() }
  b.select.mockReturnValue(b); b.eq.mockReturnValue(b)
  b.maybeSingle = mockMaybeSingle
  return b
}
const mockFrom = vi.fn()
vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn(), createClient: vi.fn() }))

import { getUser, createClient } from '@/lib/supabase/server'
import { POST } from '../route'

function req(body: object) {
  return new Request('https://app.test/api/files/transcribe', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  })
}

describe('POST /api/files/transcribe', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFrom.mockReturnValue(makeChain())
    vi.mocked(createClient).mockResolvedValue({ from: mockFrom } as any)
  })

  it('returns 401 when unauthorized', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await POST(req({ cacheKey: 'test-key' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when cacheKey missing', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await POST(req({}))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/cacheKey/)
  })

  it('returns 404 when cached file not found', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })
    const res = await POST(req({ cacheKey: 'missing-key' }))
    expect(res.status).toBe(404)
  })

  it('returns 503 when live transcription provider not configured', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    mockMaybeSingle.mockResolvedValue({ data: { id: 'f1', cache_key: 'real-key', file_id: 'fid', filename: 'test.mp3', expires_at: null }, error: null })
    const res = await POST(req({ cacheKey: 'real-key' }))
    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.code).toBe('provider_not_configured')
  })
})
