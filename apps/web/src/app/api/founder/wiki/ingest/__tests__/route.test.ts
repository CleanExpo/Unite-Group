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
import { ingestWikiPages, resolveWikiIngestPath } from '@/lib/wiki/ingest'
import { POST } from '../route'

describe('POST /api/founder/wiki/ingest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // clearAllMocks() clears call history but NOT an implementation set with
    // mockReturnValue, so a test that points the resolver at '' would otherwise
    // leak that into every test after it. Re-establish the resolved default
    // explicitly rather than relying on the factory's initial implementation.
    vi.mocked(resolveWikiIngestPath).mockReturnValue('/tmp/wiki')
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await POST(new Request('http://localhost/api/founder/wiki/ingest', { method: 'POST' }))
    expect(res.status).toBe(401)
  })

  // A vault we could not LOCATE is not an empty vault.
  //
  // resolveWikiIngestPath returns '' when neither WIKI_PATH nor BRAIN1_WIKI_DIR
  // is set and hostHome() is unreadable. readdir('') then rejects, and
  // collectMarkdownFiles swallows that with `catch { return }`, so the ingest
  // reports scanned: 0, failed: 0 — which `ok: result.failed === 0` turns into a
  // successful ingest of an apparently empty vault. That fail-open was reachable
  // on this branch only: origin/main returns path.join(home, ...) unconditionally.
  it('fails loudly when the vault root is unresolved, rather than reporting a clean zero-page ingest', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'founder-1' } as never)
    vi.mocked(createServiceClient).mockReturnValue({ from: vi.fn() } as never)
    vi.mocked(resolveWikiIngestPath).mockReturnValue('')

    const res = await POST(
      new Request('http://localhost/api/founder/wiki/ingest', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      }),
    )

    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.ok).not.toBe(true)
    expect(body.error).toBeTruthy()
    // Abort BEFORE the scan, not after: an unresolved root must never reach the
    // ingest at all, or the failure is discovered only by inspecting a summary
    // that already claims success.
    expect(ingestWikiPages).not.toHaveBeenCalled()
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
