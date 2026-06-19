import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/integrations/google-drive', () => ({ getVaultFileContent: vi.fn() }))

import { getUser } from '@/lib/supabase/server'
import { getVaultFileContent } from '@/lib/integrations/google-drive'
import { GET } from '../route'

function req(qs = '') {
  return new Request(`https://app.test/api/notes/content${qs}`)
}

describe('GET /api/notes/content', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthorized', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET(req())
    expect(res.status).toBe(401)
  })

  it('returns 400 when fileId missing', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await GET(req())
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/fileId/)
  })

  it('returns content when found', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(getVaultFileContent).mockResolvedValue('# Note content')
    const res = await GET(req('?fileId=file-1'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.content).toBe('# Note content')
  })

  it('returns 500 when fetch throws', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(getVaultFileContent).mockRejectedValue(new Error('Drive error'))
    const res = await GET(req('?fileId=file-1'))
    expect(res.status).toBe(500)
  })
})
