// src/app/api/nexus/prs/reject/__tests__/route.test.ts
// Regression coverage for POST /api/nexus/prs/reject — closes a PR with a reason.
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/nexus/github-prs', () => ({ closePR: vi.fn() }))

import { getUser } from '@/lib/supabase/server'
import { closePR } from '@/lib/nexus/github-prs'
import { POST } from '../route'

const req = (b: unknown) =>
  new Request('https://app.test/api/nexus/prs/reject', {
    method: 'POST',
    body: typeof b === 'string' ? b : JSON.stringify(b),
  })

describe('POST /api/nexus/prs/reject', () => {
  beforeEach(() => vi.clearAllMocks())

  it('401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)
    const res = await POST(req({ owner: 'o', repo: 'r', number: 1 }))
    expect(res.status).toBe(401)
    const body = (await res.json()) as { error: string }
    expect(body.error).toMatch(/unauthorised/i)
    expect(closePR).not.toHaveBeenCalled()
  })

  it('400 when the JSON body is invalid', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    const res = await POST(req('not json{'))
    expect(res.status).toBe(400)
    const body = (await res.json()) as { error: string }
    expect(body.error).toMatch(/invalid json/i)
    expect(closePR).not.toHaveBeenCalled()
  })

  it('400 when repo is missing', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    const res = await POST(req({ owner: 'o', number: 1 }))
    expect(res.status).toBe(400)
    expect(closePR).not.toHaveBeenCalled()
  })

  it('400 when number is missing', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    const res = await POST(req({ owner: 'o', repo: 'r' }))
    expect(res.status).toBe(400)
    expect(closePR).not.toHaveBeenCalled()
  })

  it('200 and closes with the supplied reason on the success path', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    vi.mocked(closePR).mockResolvedValue(undefined)
    const res = await POST(
      req({ owner: 'CleanExpo', repo: 'Unite-Group', number: 42, reason: 'Out of scope' }),
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { ok: boolean }
    expect(body.ok).toBe(true)
    expect(closePR).toHaveBeenCalledWith('CleanExpo', 'Unite-Group', 42, 'Out of scope')
  })

  it('falls back to the default reason when none is supplied', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    vi.mocked(closePR).mockResolvedValue(undefined)
    const res = await POST(req({ owner: 'o', repo: 'r', number: 5 }))
    expect(res.status).toBe(200)
    expect(closePR).toHaveBeenCalledWith('o', 'r', 5, 'Rejected by founder')
  })

  it('falls back to the default reason when reason is blank', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    vi.mocked(closePR).mockResolvedValue(undefined)
    const res = await POST(req({ owner: 'o', repo: 'r', number: 5, reason: '   ' }))
    expect(res.status).toBe(200)
    expect(closePR).toHaveBeenCalledWith('o', 'r', 5, 'Rejected by founder')
  })

  it('500 when closePR throws', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    vi.mocked(closePR).mockRejectedValue(new Error('GitHub close PR failed: 404'))
    const res = await POST(req({ owner: 'o', repo: 'r', number: 1 }))
    expect(res.status).toBe(500)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('Reject failed') // sanitised — raw error not leaked
    expect(body.error).not.toContain('404')
  })
})
