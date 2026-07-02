// src/app/api/nexus/branches/__tests__/route.test.ts
// Regression coverage for POST /api/nexus/branches — creates a feature branch
// for a routed work item. The orchestrator is mocked; no real branches are created.
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/nexus/branch-orchestrator', () => ({ createWorkBranch: vi.fn() }))

import { getUser } from '@/lib/supabase/server'
import { createWorkBranch } from '@/lib/nexus/branch-orchestrator'
import { POST } from '../route'

const req = (b: unknown) =>
  new Request('https://app.test/api/nexus/branches', {
    method: 'POST',
    body: typeof b === 'string' ? b : JSON.stringify(b),
  })

describe('POST /api/nexus/branches', () => {
  beforeEach(() => vi.clearAllMocks())

  it('401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)
    const res = await POST(req({ repoId: 'UNI-2203', title: 'x' }))
    expect(res.status).toBe(401)
    expect(createWorkBranch).not.toHaveBeenCalled()
  })

  it('400 when the JSON body is invalid', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    const res = await POST(req('not json{'))
    expect(res.status).toBe(400)
    const body = (await res.json()) as { error: string }
    expect(body.error).toMatch(/invalid json/i)
    expect(createWorkBranch).not.toHaveBeenCalled()
  })

  it('400 when repoId is missing', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    const res = await POST(req({ title: 'x' }))
    expect(res.status).toBe(400)
    expect(createWorkBranch).not.toHaveBeenCalled()
  })

  it('200 and returns the branch url on the success path', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    vi.mocked(createWorkBranch).mockResolvedValue({
      branch: 'feature/uni-2203-branch-creation-orchestrator',
      repo: 'CleanExpo/Unite-Group',
      url: 'https://github.com/CleanExpo/Unite-Group/tree/feature/uni-2203-branch-creation-orchestrator',
    })
    const res = await POST(req({ repoId: 'UNI-2203', title: 'Branch creation orchestrator' }))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { url: string }
    expect(body.url).toContain('/tree/feature/uni-2203-branch-creation-orchestrator')
    expect(createWorkBranch).toHaveBeenCalledWith('UNI-2203', 'Branch creation orchestrator')
  })

  it('trims whitespace from repoId/title before delegating', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    vi.mocked(createWorkBranch).mockResolvedValue({
      branch: 'feature/ra-9-x',
      repo: 'CleanExpo/RestoreAssist',
      url: 'https://github.com/CleanExpo/RestoreAssist/tree/feature/ra-9-x',
    })
    const res = await POST(req({ repoId: '  RA-9  ', title: '  x  ' }))
    expect(res.status).toBe(200)
    expect(createWorkBranch).toHaveBeenCalledWith('RA-9', 'x')
  })

  it('500 with a sanitised message when the orchestrator throws', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    vi.mocked(createWorkBranch).mockRejectedValue(new Error('Cannot access CleanExpo/RestoreAssist (HTTP 404)'))
    const res = await POST(req({ repoId: 'RA-9', title: 'x' }))
    expect(res.status).toBe(500)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('Branch creation failed') // sanitised — raw error not leaked
    expect(body.error).not.toContain('404')
  })
})
