import { describe, expect, it, vi, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({
  getUser: vi.fn(),
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(),
}))

vi.mock('@/lib/wiki/ingest', async () => {
  const actual = await vi.importActual<typeof import('@/lib/wiki/ingest')>(
    '@/lib/wiki/ingest',
  )
  return {
    ...actual,
    ingestWikiPages: vi.fn(),
    resolveWikiIngestPath: vi.fn(() => '/tmp/wiki'),
  }
})

import { getUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { ingestWikiPages } from '@/lib/wiki/ingest'
import { POST } from '../route'

describe('POST /api/founder/wiki/ingest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await POST(new Request('http://localhost/api/founder/wiki/ingest', { method: 'POST' }))
    expect(res.status).toBe(401)
  })

  it('runs ingest for founder and returns summary', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'founder-1' } as never)
    vi.mocked(createServiceClient).mockReturnValue({ from: vi.fn() } as never)
    vi.mocked(ingestWikiPages).mockResolvedValue({
      wikiRoot: '/tmp/wiki',
      scanned: 3,
      upserted: 3,
      failed: 0,
      dryRun: false,
      errors: [],
      sampleIds: ['a', 'b'],
    })

    const res = await POST(
      new Request('http://localhost/api/founder/wiki/ingest', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ limit: 10 }),
      }),
    )
    expect(res).toBeInstanceOf(NextResponse)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.upserted).toBe(3)
    expect(body.source).toBe('vault→wiki_pages')
    expect(ingestWikiPages).toHaveBeenCalled()
  })
})
