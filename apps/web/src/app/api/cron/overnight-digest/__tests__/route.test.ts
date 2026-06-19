import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))
vi.mock('@/lib/command-centre/overnight-summary', () => ({
  gatherOvernightDigest: vi.fn(),
  digestToMarkdown: vi.fn().mockReturnValue('# Digest'),
}))
vi.mock('@/lib/obsidian/evidence', () => ({ writeEvidence: vi.fn().mockResolvedValue({ relativePath: 'vault/note.md' }) }))

import { createServiceClient } from '@/lib/supabase/service'
import { gatherOvernightDigest } from '@/lib/command-centre/overnight-summary'
import { GET } from '../route'

vi.stubEnv('CRON_SECRET', 'test-secret')
vi.stubEnv('FOUNDER_USER_ID', 'founder-1')

function req(auth = 'Bearer test-secret') {
  return new Request('https://app.test', { headers: { authorization: auth } })
}

describe('GET /api/cron/overnight-digest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createServiceClient).mockReturnValue({} as any)
  })

  it('returns 401 when unauthorized', async () => {
    const res = await GET(req('bad'))
    expect(res.status).toBe(401)
  })

  it('returns digest summary on success', async () => {
    vi.mocked(gatherOvernightDigest).mockResolvedValue({ summary: 'Quiet night.', tasks: [], sessions: [] } as any)

    const res = await GET(req())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  it('returns 500 when digest fails', async () => {
    vi.mocked(gatherOvernightDigest).mockRejectedValue(new Error('DB down'))
    const res = await GET(req())
    expect(res.status).toBe(500)
  })
})
