import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/integrations/linear', () => ({ createIssue: vi.fn() }))

import { getUser } from '@/lib/supabase/server'
import { createIssue } from '@/lib/integrations/linear'
import { POST } from '../route'

const validSpec = {
  title: 'Add notifications',
  teamKey: 'UNI',
  description: 'Build a notifications system',
  acceptanceCriteria: ['Users see alerts', 'Real-time updates'],
  priority: 2,
  labels: ['feature'],
}

function req(body: object) {
  return new Request('https://app.test/api/ideas/create', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/ideas/create', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => vi.unstubAllEnvs())

  it('returns 401 when unauthorized', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await POST(req({ spec: validSpec }))
    expect(res.status).toBe(401)
  })

  it('returns 503 when LINEAR_API_KEY not set', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.stubEnv('LINEAR_API_KEY', '')
    const res = await POST(req({ spec: validSpec }))
    expect(res.status).toBe(503)
  })

  it('returns 400 when spec is invalid', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.stubEnv('LINEAR_API_KEY', 'lin_key')
    const res = await POST(req({ spec: { title: 'Missing teamKey' } }))
    expect(res.status).toBe(400)
    vi.unstubAllEnvs()
  })

  it('returns identifier on success', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.stubEnv('LINEAR_API_KEY', 'lin_key')
    vi.mocked(createIssue).mockResolvedValue({ id: 'UNI-42', url: 'https://linear.app/uni-42' } as any)
    const res = await POST(req({ spec: validSpec }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.identifier).toBe('UNI-42')
    vi.unstubAllEnvs()
  })
})
