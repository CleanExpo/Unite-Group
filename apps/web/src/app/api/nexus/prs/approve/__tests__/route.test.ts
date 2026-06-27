// src/app/api/nexus/prs/approve/__tests__/route.test.ts
// Regression coverage for POST /api/nexus/prs/approve — squash-merges a PR.
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/nexus/github-prs', () => ({ mergePR: vi.fn() }))

import { getUser } from '@/lib/supabase/server'
import { mergePR } from '@/lib/nexus/github-prs'
import { POST } from '../route'

const req = (b: unknown) =>
  new Request('https://app.test/api/nexus/prs/approve', {
    method: 'POST',
    body: typeof b === 'string' ? b : JSON.stringify(b),
  })

describe('POST /api/nexus/prs/approve', () => {
  beforeEach(() => vi.clearAllMocks())

  it('401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)
    const res = await POST(req({ owner: 'o', repo: 'r', number: 1 }))
    expect(res.status).toBe(401)
    const body = (await res.json()) as { error: string }
    expect(body.error).toMatch(/unauthorised/i)
    expect(mergePR).not.toHaveBeenCalled()
  })

  it('400 when the JSON body is invalid', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    const res = await POST(req('not json{'))
    expect(res.status).toBe(400)
    const body = (await res.json()) as { error: string }
    expect(body.error).toMatch(/invalid json/i)
    expect(mergePR).not.toHaveBeenCalled()
  })

  it('400 when owner is missing', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    const res = await POST(req({ repo: 'r', number: 1 }))
    expect(res.status).toBe(400)
    expect(mergePR).not.toHaveBeenCalled()
  })

  it('400 when number is not a number', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    const res = await POST(req({ owner: 'o', repo: 'r', number: '5' }))
    expect(res.status).toBe(400)
    expect(mergePR).not.toHaveBeenCalled()
  })

  it('200 and merges on the success path', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    vi.mocked(mergePR).mockResolvedValue(undefined)
    const res = await POST(req({ owner: 'CleanExpo', repo: 'Unite-Group', number: 42 }))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { ok: boolean }
    expect(body.ok).toBe(true)
    expect(mergePR).toHaveBeenCalledWith('CleanExpo', 'Unite-Group', 42)
  })

  it('trims whitespace from owner/repo before merging', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    vi.mocked(mergePR).mockResolvedValue(undefined)
    const res = await POST(req({ owner: '  CleanExpo  ', repo: ' Unite-Group ', number: 7 }))
    expect(res.status).toBe(200)
    expect(mergePR).toHaveBeenCalledWith('CleanExpo', 'Unite-Group', 7)
  })

  it('500 when mergePR throws', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    vi.mocked(mergePR).mockRejectedValue(new Error('GitHub merge failed: 405'))
    const res = await POST(req({ owner: 'o', repo: 'r', number: 1 }))
    expect(res.status).toBe(500)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('Merge failed') // sanitised — raw error not leaked
    expect(body.error).not.toContain('405')
  })
})
