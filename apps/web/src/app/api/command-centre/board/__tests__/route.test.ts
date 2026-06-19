import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  getUser: vi.fn(),
  createClient: vi.fn(),
}))
vi.mock('@/lib/command-centre/tasks', () => ({
  appendTaskEvent: vi.fn(),
  addEvidenceRecord: vi.fn(),
  CC_TASKS_TABLE: 'cc_tasks',
}))
vi.mock('@/lib/command-centre/decisions', () => ({ createDecision: vi.fn() }))
vi.mock('@/lib/command-centre/board-review', () => ({
  runBoardReview: vi.fn(),
  verdictToEventType: vi.fn().mockReturnValue('approved'),
}))
vi.mock('@/lib/command-centre/decompose', () => ({ decomposeApprovedIdea: vi.fn() }))
vi.mock('@/lib/obsidian/evidence', () => ({ writeEvidence: vi.fn() }))

const mockSingle = vi.fn()
const mockFrom = vi.fn()
const mockClient = {
  from: mockFrom,
}

import { getUser, createClient } from '@/lib/supabase/server'
import { runBoardReview } from '@/lib/command-centre/board-review'
import { createDecision } from '@/lib/command-centre/decisions'
import { decomposeApprovedIdea } from '@/lib/command-centre/decompose'
import { POST } from '../route'

function makeTaskChain() {
  const b: Record<string, any> = {
    select: vi.fn(),
    eq: vi.fn(),
  }
  b.select.mockReturnValue(b)
  b.eq.mockReturnValue(b)
  ;(b as any).single = mockSingle
  return b
}

function postReq(body: object) {
  return new Request('https://app.test/api/command-centre/board', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

const board = {
  verdict: 'APPROVED',
  rationale: 'Solid plan.',
  personas: [{ persona: 'CFO', stance: 'approve', comment: 'Good ROI.' }],
}

const decision = { id: 'dec-1', verdict: 'APPROVED' }

describe('POST /api/command-centre/board', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFrom.mockReturnValue(makeTaskChain())
    vi.mocked(createClient).mockResolvedValue(mockClient as any)
    vi.mocked(createDecision).mockResolvedValue(decision as any)
    vi.mocked(decomposeApprovedIdea).mockResolvedValue([])
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await POST(postReq({ subject: 'X', brief: 'Y' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when neither taskId nor subject+brief provided', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await POST(postReq({}))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/subject/)
  })

  it('returns 404 when taskId not found', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    mockSingle.mockResolvedValue({ data: null, error: { message: 'not found' } })

    const res = await POST(postReq({ taskId: 'task-x' }))
    expect(res.status).toBe(404)
  })

  it('runs board review for ad-hoc subject+brief and returns 201', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(runBoardReview).mockResolvedValue(board as any)

    const res = await POST(postReq({ subject: 'New feature', brief: 'Build search capability' }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.verdict).toBe('APPROVED')
    expect(body.decision.id).toBe('dec-1')
  })

  it('returns 502 when board review throws', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(runBoardReview).mockRejectedValue(new Error('AI timeout'))

    const res = await POST(postReq({ subject: 'New feature', brief: 'Build search capability' }))
    expect(res.status).toBe(502)
    const body = await res.json()
    expect(body.error).toBe('AI timeout')
  })

  it('decomposes idea into subtasks when APPROVED with taskId', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(runBoardReview).mockResolvedValue(board as any)
    vi.mocked(decomposeApprovedIdea).mockResolvedValue([
      { id: 'sub-1', title: 'Step 1' },
    ] as any)

    const task = { id: 'task-1', title: 'Feature', objective: 'Build search', risk_level: 'low', project_key: 'CRM', project_id: 'p-1' }
    mockSingle.mockResolvedValue({ data: task, error: null })

    const res = await POST(postReq({ taskId: 'task-1' }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.subtasks).toHaveLength(1)
  })
})
