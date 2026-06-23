// src/app/api/command-centre/clarify/answers/__tests__/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/command-centre/tasks', () => ({ getTaskById: vi.fn(), mergeTaskMetadata: vi.fn(), appendTaskEvent: vi.fn() }))
import { getUser } from '@/lib/supabase/server'
import { getTaskById, mergeTaskMetadata } from '@/lib/command-centre/tasks'
import { POST } from '../route'
const req = (b: object) => new Request('https://app.test/x', { method: 'POST', body: JSON.stringify(b) })

describe('POST /api/command-centre/clarify/answers', () => {
  beforeEach(() => vi.clearAllMocks())
  it('401 unauth', async () => { vi.mocked(getUser).mockResolvedValue(null); expect((await POST(req({ taskId: 't', answers: {} }))).status).toBe(401) })
  it('400 when answers missing', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    expect((await POST(req({ taskId: 't' }))).status).toBe(400)
  })
  it('persists answers and returns ok', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    vi.mocked(getTaskById).mockResolvedValue({ id: 't', metadata: { clarifications: { questions: ['Q?'], answers: {}, generatedAt: 'x', answeredAt: null } } } as never)
    vi.mocked(mergeTaskMetadata).mockResolvedValue({} as never)
    const res = await POST(req({ taskId: 't', answers: { 'Q?': 'A' } }))
    expect(res.status).toBe(200)
    expect(mergeTaskMetadata).toHaveBeenCalledWith(
      expect.objectContaining({
        founderId: 'u1',
        taskId: 't',
        patch: expect.objectContaining({
          clarifications: expect.objectContaining({
            questions: ['Q?'],
            generatedAt: 'x',
            answers: { 'Q?': 'A' },
          }),
        }),
      }),
    )
    const callArg = vi.mocked(mergeTaskMetadata).mock.calls[0][0] as { patch: { clarifications: { answeredAt: unknown } } }
    expect(typeof callArg.patch.clarifications.answeredAt).toBe('string')
  })

  it('500 when persistence fails (mergeTaskMetadata returns null)', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    vi.mocked(getTaskById).mockResolvedValue({ id: 't', metadata: { clarifications: { questions: ['Q?'], answers: {}, generatedAt: 'x', answeredAt: null } } } as never)
    vi.mocked(mergeTaskMetadata).mockResolvedValue(null)
    const res = await POST(req({ taskId: 't', answers: { 'Q?': 'A' } }))
    expect(res.status).toBe(500)
    expect((await res.json()).error).toBe('Failed to persist answers')
  })
})
