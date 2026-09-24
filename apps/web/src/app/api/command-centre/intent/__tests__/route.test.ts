import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/command-centre/tasks', () => ({
  getTaskById: vi.fn(),
  mergeTaskMetadata: vi.fn(),
  appendTaskEvent: vi.fn(),
}))
vi.mock('@/lib/command-centre/intent', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/command-centre/intent')>()
  return { ...actual, generateIntent: vi.fn() }
})

import { getUser } from '@/lib/supabase/server'
import { getTaskById, mergeTaskMetadata, appendTaskEvent } from '@/lib/command-centre/tasks'
import { generateIntent, renderIntentMarkdown, type IntentDoc } from '@/lib/command-centre/intent'
import { POST, PUT } from '../route'

const USER = { id: 'user-1', email: 'phill@example.com' }
const TASK = {
  id: 'task-1',
  title: 'Contractor report status page',
  objective: 'Contractors keep phoning to ask if a report was sent.',
  metadata: { clarifications: { questions: ['Who is it for?'], answers: { 'Who is it for?': 'Contractors' } } },
}
const DOC: IntentDoc = {
  title: 'Contractors see claim report status',
  problem: 'Contractors phone the office to ask whether a report was sent.',
  proposedOutcome: 'One page shows each report status.',
  affectedUsersAndSystems: 'Contractors, office staff, the reports module.',
  constraints: ['No new login system'],
  openQuestions: ['Do insurers expose a status we can read?'],
}
const DRAFT_MD = renderIntentMarkdown(DOC, { author: 'phill@example.com', status: 'draft', createdAt: '2026-09-24T00:00:00.000Z', taskId: 'task-1' })

function req(method: 'POST' | 'PUT', body: object) {
  return new Request('https://app.test/api/command-centre/intent', { method, body: JSON.stringify(body) })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getUser).mockResolvedValue(USER as never)
  vi.mocked(getTaskById).mockResolvedValue(TASK as never)
  vi.mocked(mergeTaskMetadata).mockResolvedValue(TASK as never)
  vi.mocked(appendTaskEvent).mockResolvedValue(undefined as never)
})

describe('POST /api/command-centre/intent (draft)', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await POST(req('POST', { taskId: 'task-1' }))
    expect(res.status).toBe(401)
    expect(generateIntent).not.toHaveBeenCalled()
  })

  it('returns 400 when taskId is missing', async () => {
    const res = await POST(req('POST', {}))
    expect(res.status).toBe(400)
  })

  it('returns 404 for an unknown task', async () => {
    vi.mocked(getTaskById).mockResolvedValue(null)
    const res = await POST(req('POST', { taskId: 'nope' }))
    expect(res.status).toBe(404)
    expect(generateIntent).not.toHaveBeenCalled()
  })

  it('drafts from the idea + clarifications and saves metadata.intent as a draft', async () => {
    vi.mocked(generateIntent).mockResolvedValue({ ok: true, doc: DOC })
    const res = await POST(req('POST', { taskId: 'task-1' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.markdown).toContain('status: draft')
    expect(body.markdown).toContain('author: phill@example.com')
    expect(body.markdown).toContain('task: task-1')
    expect(body.markdown).toContain('# Intent: Contractors see claim report status')

    expect(vi.mocked(generateIntent).mock.calls[0][0]).toContain('Contractors keep phoning')
    expect(vi.mocked(generateIntent).mock.calls[0][1]).toEqual(TASK.metadata.clarifications)

    const call = vi.mocked(mergeTaskMetadata).mock.calls[0][0]
    expect(call.founderId).toBe('user-1')
    const intent = call.patch.intent as { status: string; markdown: string; generatedAt: string }
    expect(intent.status).toBe('draft')
    expect(intent.markdown).toBe(body.markdown)
    expect(typeof intent.generatedAt).toBe('string')
  })

  it('returns 502 with the reason and saves nothing when the model fails', async () => {
    vi.mocked(generateIntent).mockResolvedValue({ ok: false, reason: 'The model returned an incomplete intent (empty: problem)' })
    const res = await POST(req('POST', { taskId: 'task-1' }))
    expect(res.status).toBe(502)
    const body = await res.json()
    expect(body.error).toContain('empty: problem')
    expect(mergeTaskMetadata).not.toHaveBeenCalled()
  })
})

describe('PUT /api/command-centre/intent (accept)', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await PUT(req('PUT', { taskId: 'task-1', markdown: DRAFT_MD }))
    expect(res.status).toBe(401)
  })

  it('returns 404 for an unknown task', async () => {
    vi.mocked(getTaskById).mockResolvedValue(null)
    const res = await PUT(req('PUT', { taskId: 'nope', markdown: DRAFT_MD }))
    expect(res.status).toBe(404)
    expect(mergeTaskMetadata).not.toHaveBeenCalled()
  })

  it('returns 400 with the reason and saves nothing for incomplete markdown', async () => {
    const incomplete = DRAFT_MD.replace('## Open questions\n- Do insurers expose a status we can read?\n', '## Open questions\n\n')
    const res = await PUT(req('PUT', { taskId: 'task-1', markdown: incomplete }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('Open questions')
    expect(mergeTaskMetadata).not.toHaveBeenCalled()
    expect(appendTaskEvent).not.toHaveBeenCalled()
  })

  it('accepts valid markdown, rewriting status/author/created/task, and records the event', async () => {
    const edited = DRAFT_MD.replace('One page shows each report status.', 'One page shows each report status, edited by the founder.')
      .replace('author: phill@example.com', 'author: someone-else@example.com')
    const res = await PUT(req('PUT', { taskId: 'task-1', markdown: edited }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.markdown.startsWith(`---\nstatus: accepted\nauthor: phill@example.com\ncreated: ${body.acceptedAt}\ntask: task-1\n---\n# Intent: `)).toBe(true)
    expect(body.markdown).not.toContain('status: draft')
    expect(body.markdown).not.toContain('someone-else')
    expect(body.markdown).toContain('edited by the founder')

    const call = vi.mocked(mergeTaskMetadata).mock.calls[0][0]
    expect(call.patch.intent).toEqual({ status: 'accepted', markdown: body.markdown, acceptedAt: body.acceptedAt, author: 'phill@example.com' })
    expect(appendTaskEvent).toHaveBeenCalledWith(expect.objectContaining({ taskId: 'task-1', type: 'comment', actor: 'founder', payload: { kind: 'intent_accepted' } }))
  })

  it('still returns 200 when the audit event fails', async () => {
    vi.mocked(appendTaskEvent).mockRejectedValue(new Error('audit down'))
    const res = await PUT(req('PUT', { taskId: 'task-1', markdown: DRAFT_MD }))
    expect(res.status).toBe(200)
  })
})
