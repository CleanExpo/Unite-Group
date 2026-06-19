import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/ai/features/files', () => ({
  uploadAndCacheFile: vi.fn().mockResolvedValue({ fileId: 'file-1', cacheKey: 'key-1', filename: 'test.pdf', sizeBytes: 1024 }),
  listCachedFiles: vi.fn().mockResolvedValue([]),
}))

import { getUser } from '@/lib/supabase/server'
import { listCachedFiles } from '@/lib/ai/features/files'
import { GET, POST } from '../route'

describe('/api/files', () => {
  beforeEach(() => vi.clearAllMocks())

  it('POST returns 401 when unauthorized', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await POST(new Request('https://app.test/api/files', { method: 'POST' }))
    expect(res.status).toBe(401)
  })

  it('POST returns 400 when not multipart', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await POST(new Request('https://app.test/api/files', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/multipart/)
  })

  it('GET returns 401 when unauthorized', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET(new Request('https://app.test/api/files'))
    expect(res.status).toBe(401)
  })

  it('GET returns file list', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(listCachedFiles).mockResolvedValue([{ fileId: 'f1', cacheKey: 'k1', filename: 'doc.pdf' }] as any)
    const res = await GET(new Request('https://app.test/api/files'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.files).toHaveLength(1)
  })
})
