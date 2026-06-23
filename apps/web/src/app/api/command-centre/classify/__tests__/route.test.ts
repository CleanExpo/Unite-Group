// src/app/api/command-centre/classify/__tests__/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/command-centre/tasks', () => ({ getTaskById: vi.fn(), mergeTaskMetadata: vi.fn(), appendTaskEvent: vi.fn() }))
vi.mock('@/lib/command-centre/classify-idea', () => ({ classifyIdea: vi.fn() }))
import { getUser } from '@/lib/supabase/server'
import { getTaskById, mergeTaskMetadata } from '@/lib/command-centre/tasks'
import { classifyIdea } from '@/lib/command-centre/classify-idea'
import { POST } from '../route'
const req = (b: object) => new Request('https://app.test/x', { method: 'POST', body: JSON.stringify(b) })

describe('POST /api/command-centre/classify', () => {
  beforeEach(() => vi.clearAllMocks())
  it('401 unauth', async () => { vi.mocked(getUser).mockResolvedValue(null); expect((await POST(req({ taskId: 't' }))).status).toBe(401) })
  it('404 missing task', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never); vi.mocked(getTaskById).mockResolvedValue(null)
    expect((await POST(req({ taskId: 't' }))).status).toBe(404)
  })
  it('classifies, persists routing, returns it', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    vi.mocked(getTaskById).mockResolvedValue({ id: 't', objective: 'Promo', metadata: { clarifications: { questions: [], answers: {} } } } as never)
    const routing = { lane: 'marketing', confidence: 0.8, rationale: 'promo', planBuild: [{ title: 'x', detail: 'y', risk: 'low', reversible: true }], planDistribute: [] }
    vi.mocked(classifyIdea).mockResolvedValue(routing as never)
    vi.mocked(mergeTaskMetadata).mockResolvedValue({} as never)
    const res = await POST(req({ taskId: 't' }))
    expect(res.status).toBe(200)
    expect((await res.json()).routing.lane).toBe('marketing')
    expect(mergeTaskMetadata).toHaveBeenCalled()
  })
})
