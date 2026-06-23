import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/command-centre/tasks', () => ({
  getTaskById: vi.fn(), mergeTaskMetadata: vi.fn(), appendTaskEvent: vi.fn(),
}))
vi.mock('@/lib/command-centre/clarify', () => ({ generateClarifyingQuestions: vi.fn() }))

import { getUser } from '@/lib/supabase/server'
import { getTaskById, mergeTaskMetadata, appendTaskEvent } from '@/lib/command-centre/tasks'
import { generateClarifyingQuestions } from '@/lib/command-centre/clarify'
import { POST } from '../route'

const req = (b: object) => new Request('https://app.test/api/command-centre/clarify', { method: 'POST', body: JSON.stringify(b) })

describe('POST /api/command-centre/clarify', () => {
  beforeEach(() => vi.clearAllMocks())

  it('401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    expect((await POST(req({ taskId: 't1' }))).status).toBe(401)
  })

  it('404 when the task is not the founder\'s', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    vi.mocked(getTaskById).mockResolvedValue(null)
    expect((await POST(req({ taskId: 'nope' }))).status).toBe(404)
  })

  it('returns questions and persists them', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    vi.mocked(getTaskById).mockResolvedValue({ id: 't1', objective: 'Build a thing' } as never)
    vi.mocked(generateClarifyingQuestions).mockResolvedValue(['Who is the audience?'])
    vi.mocked(mergeTaskMetadata).mockResolvedValue({} as never)
    vi.mocked(appendTaskEvent).mockResolvedValue({} as never)
    const res = await POST(req({ taskId: 't1' }))
    expect(res.status).toBe(200)
    expect((await res.json()).questions).toEqual(['Who is the audience?'])
    expect(mergeTaskMetadata).toHaveBeenCalledWith(
      expect.objectContaining({
        founderId: 'u1',
        taskId: 't1',
        patch: expect.objectContaining({
          clarifications: expect.objectContaining({ questions: ['Who is the audience?'], answers: {} }),
        }),
      }),
    )
  })

  it('500 when persistence fails (mergeTaskMetadata returns null)', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    vi.mocked(getTaskById).mockResolvedValue({ id: 't1', objective: 'Build a thing' } as never)
    vi.mocked(generateClarifyingQuestions).mockResolvedValue(['Q?'])
    vi.mocked(mergeTaskMetadata).mockResolvedValue(null)
    const res = await POST(req({ taskId: 't1' }))
    expect(res.status).toBe(500)
    expect((await res.json()).error).toBe('Failed to persist questions')
  })
})
