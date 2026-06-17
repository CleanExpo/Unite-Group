import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  getUser: vi.fn(),
}))

import { getUser } from '@/lib/supabase/server'
import { POST } from '../route'

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/research/external-sources', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('POST /api/research/external-sources', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // No GitHub token in the test env → github degrades to not_configured;
    // HF works tokenless. We stub fetch so no real network is hit.
    delete process.env.GITHUB_TOKEN
    delete process.env.HF_API_TOKEN
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, status: 200, json: async () => [] }) as unknown as Response)
    )
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)

    const res = await POST(makeRequest({ query: 'whisper' }))
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error).toBe('Unauthorised')
  })

  it('returns 400 when query is empty', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-123' } as never)

    const res = await POST(makeRequest({ query: '   ' }))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toBe('query is required')
  })

  it('returns 200 with a report and no-store cache header', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-123' } as never)

    const res = await POST(makeRequest({ query: 'embeddings' }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(res.headers.get('Cache-Control')).toBe('no-store')
    expect(body.query).toBe('embeddings')
    expect(typeof body.generatedAt).toBe('string')
    expect(body.sources.map((s: { source: string }) => s.source)).toEqual([
      'github',
      'huggingface',
    ])
    // GitHub has no token in this env → honest not_configured.
    const gh = body.sources.find((s: { source: string }) => s.source === 'github')
    expect(gh.status).toBe('not_configured')
  })
})
