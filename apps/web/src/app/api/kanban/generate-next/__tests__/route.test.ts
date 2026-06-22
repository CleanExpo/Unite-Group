import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/ai/client', () => ({ getAIClient: vi.fn() }))
vi.mock('@/lib/integrations/linear', () => ({
  createIssue: vi.fn(),
  resolveOrCreateLabelIds: vi.fn(async () => []),
}))

import { getUser } from '@/lib/supabase/server'
import { getAIClient } from '@/lib/ai/client'
import { createIssue, resolveOrCreateLabelIds } from '@/lib/integrations/linear'
import { POST } from '../route'

const mockGetUser = vi.mocked(getUser)
const mockGetAIClient = vi.mocked(getAIClient)
const mockCreateIssue = vi.mocked(createIssue)
const mockResolve = vi.mocked(resolveOrCreateLabelIds)

function modelReturning(tasks: unknown) {
  return {
    messages: {
      create: vi.fn(async () => ({
        content: [{ type: 'text', text: JSON.stringify(tasks) }],
      })),
    },
  } as unknown as ReturnType<typeof getAIClient>
}

function req(body: unknown) {
  return new Request('https://unite.test/api/kanban/generate-next', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('POST /api/kanban/generate-next', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ id: 'founder-1' } as never)
    mockResolve.mockResolvedValue([])
    mockCreateIssue.mockResolvedValue({ id: 'UNI-9001', url: 'https://linear.app/x/UNI-9001' })
  })

  afterEach(() => vi.restoreAllMocks())

  it('401s without a user', async () => {
    mockGetUser.mockResolvedValue(null as never)
    const res = await POST(req({ column: 'today' }))
    expect(res.status).toBe(401)
  })

  it('creates each task with an "Acceptance Criteria" heading so the autopilot can claim it', async () => {
    mockGetAIClient.mockReturnValue(modelReturning([
      { title: 'Build the widget', context: 'A small widget.', acceptance: ['renders', 'has a test'] },
    ]))

    const res = await POST(req({ column: 'today' }))
    expect(res.status).toBe(200)

    expect(mockCreateIssue).toHaveBeenCalledTimes(1)
    // Must file into the Unite-Group project, or the claim loop never sees it.
    expect(mockCreateIssue.mock.calls[0][0]).toMatchObject({ projectName: 'Unite-Group', teamKey: 'UNI' })
    const desc = mockCreateIssue.mock.calls[0][0].description as string
    // The runner's claim filter (linear-claim hasAcceptanceCriteria) needs this heading.
    expect(desc).toMatch(/##\s*Acceptance Criteria/i)
    expect(desc).toContain('- renders')
    expect(desc).toContain('- has a test')
  })

  it('still emits the heading when the model omits acceptance (falls back to context)', async () => {
    mockGetAIClient.mockReturnValue(modelReturning([
      { title: 'No-AC task', context: 'Ship the smallest slice.' },
    ]))

    const res = await POST(req({ column: 'pipeline' }))
    expect(res.status).toBe(200)
    const desc = mockCreateIssue.mock.calls[0][0].description as string
    expect(desc).toMatch(/##\s*Acceptance Criteria/i)
    expect(desc).toContain('- Ship the smallest slice.')
  })
})
