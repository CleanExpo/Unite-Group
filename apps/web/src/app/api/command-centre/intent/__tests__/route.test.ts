import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn(), createClient: vi.fn() }))
vi.mock('@/lib/command-centre/tasks', () => ({
  getTaskById: vi.fn(),
  mergeTaskMetadata: vi.fn(),
  appendTaskEvent: vi.fn(),
}))
vi.mock('@/lib/command-centre/intent', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/command-centre/intent')>()
  return { ...actual, generateIntent: vi.fn() }
})
vi.mock('@/lib/command-centre/intent-store', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/command-centre/intent-store')>()
  return { ...actual, saveMissionIntent: vi.fn() }
})

import { getUser } from '@/lib/supabase/server'
import { getTaskById, mergeTaskMetadata, appendTaskEvent } from '@/lib/command-centre/tasks'
import { generateIntent, renderIntentMarkdown, type IntentDoc } from '@/lib/command-centre/intent'
import { saveMissionIntent } from '@/lib/command-centre/intent-store'
import { DeliveryConflict } from '@/lib/command-centre/delivery-store'
import type { DeliveryMetadata } from '@/lib/command-centre/delivery-types'
import { POST, PUT } from '../route'

const USER = { id: 'user-1', email: 'phill@example.com' }
const DELIVERY: DeliveryMetadata = {
  schemaVersion: 1, kind: 'software_delivery', lane: 'software', revision: 2, inputHash: 'a'.repeat(64),
  originalIdea: 'Contractors keep phoning to ask if a report was sent.', projectKey: 'Unite-Group', presetIds: [],
  recipeVersions: {}, answers: { audience: 'Restoration contractors' }, questions: [{ id: 'audience', label: 'Who is it for?' }],
  phase: 'awaiting_answers', spec: null, specVersion: null, harness: [], sourceRefs: [], board: null, lease: null,
  approval: null, error: null, scope: 'branch_preview_only',
}
const MISSION = {
  id: 'mission-1', founder_id: 'user-1', external_ref: 'delivery:req', status: 'proposed', title: 'Portal',
  objective: DELIVERY.originalIdea, updated_at: '2026-09-24T00:00:00.000Z', metadata: { delivery: DELIVERY },
}
const PLAIN_TASK = {
  id: 'task-1', external_ref: null, title: 'Contractor report status page',
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
const DRAFT_MD = renderIntentMarkdown(DOC, { author: 'phill@example.com', status: 'draft', createdAt: '2026-09-24T00:00:00.000Z', taskId: 'mission-1' })

function req(method: 'POST' | 'PUT', body: object) {
  return new Request('https://app.test/api/command-centre/intent', { method, body: JSON.stringify(body) })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getUser).mockResolvedValue(USER as never)
  vi.mocked(getTaskById).mockResolvedValue(MISSION as never)
  vi.mocked(mergeTaskMetadata).mockResolvedValue(PLAIN_TASK as never)
  vi.mocked(saveMissionIntent).mockResolvedValue(MISSION as never)
  vi.mocked(appendTaskEvent).mockResolvedValue(undefined as never)
})

describe('POST /api/command-centre/intent (draft)', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await POST(req('POST', { taskId: 'mission-1' }))
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

  it('drafts a delivery mission from its contract and saves through the guarded writer only', async () => {
    vi.mocked(generateIntent).mockResolvedValue({ ok: true, doc: DOC })
    const res = await POST(req('POST', { taskId: 'mission-1' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.markdown).toContain('status: draft')
    expect(body.markdown).toContain('author: phill@example.com')
    expect(body.markdown).toContain('task: mission-1')

    const [idea, clarifications] = vi.mocked(generateIntent).mock.calls[0]
    expect(idea).toContain(DELIVERY.originalIdea)
    expect(idea).toContain('Unite-Group')
    expect(clarifications).toEqual({ questions: ['Who is it for?'], answers: { 'Who is it for?': 'Restoration contractors' } })

    expect(mergeTaskMetadata).not.toHaveBeenCalled()
    const [task, intent] = vi.mocked(saveMissionIntent).mock.calls[0]
    expect(task.id).toBe('mission-1')
    expect(intent).toEqual({ status: 'draft', markdown: body.markdown, generatedAt: body.generatedAt })
  })

  it('drafts a non-delivery task from title/objective + clarifications via mergeTaskMetadata', async () => {
    vi.mocked(getTaskById).mockResolvedValue(PLAIN_TASK as never)
    vi.mocked(generateIntent).mockResolvedValue({ ok: true, doc: DOC })
    const res = await POST(req('POST', { taskId: 'task-1' }))
    expect(res.status).toBe(200)
    expect(vi.mocked(generateIntent).mock.calls[0][1]).toEqual(PLAIN_TASK.metadata.clarifications)
    expect(saveMissionIntent).not.toHaveBeenCalled()
    const patch = vi.mocked(mergeTaskMetadata).mock.calls[0][0].patch.intent as { status: string }
    expect(patch.status).toBe('draft')
  })

  it('returns 502 with the reason and saves nothing when the model fails', async () => {
    vi.mocked(generateIntent).mockResolvedValue({ ok: false, reason: 'The model returned an incomplete intent (empty: problem)' })
    const res = await POST(req('POST', { taskId: 'mission-1' }))
    expect(res.status).toBe(502)
    expect((await res.json()).error).toContain('empty: problem')
    expect(saveMissionIntent).not.toHaveBeenCalled()
    expect(mergeTaskMetadata).not.toHaveBeenCalled()
  })

  it('returns 409 without calling the model while a preparation lease is live', async () => {
    const leased = { ...MISSION, metadata: { delivery: { ...DELIVERY, lease: { token: '00000000-0000-4000-8000-000000000000', phase: 'plan', expiresAt: '2999-01-01T00:00:00.000Z', revision: 2 } } } }
    vi.mocked(getTaskById).mockResolvedValue(leased as never)
    const res = await POST(req('POST', { taskId: 'mission-1' }))
    expect(res.status).toBe(409)
    expect(generateIntent).not.toHaveBeenCalled()
    expect(saveMissionIntent).not.toHaveBeenCalled()
  })

  it('returns 409 with a reload message when the guarded write conflicts', async () => {
    vi.mocked(generateIntent).mockResolvedValue({ ok: true, doc: DOC })
    vi.mocked(saveMissionIntent).mockRejectedValue(new DeliveryConflict())
    const res = await POST(req('POST', { taskId: 'mission-1' }))
    expect(res.status).toBe(409)
    expect((await res.json()).error).toMatch(/reload it and try again/i)
  })
})

describe('PUT /api/command-centre/intent (accept)', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await PUT(req('PUT', { taskId: 'mission-1', markdown: DRAFT_MD }))
    expect(res.status).toBe(401)
  })

  it('returns 404 for an unknown task', async () => {
    vi.mocked(getTaskById).mockResolvedValue(null)
    const res = await PUT(req('PUT', { taskId: 'nope', markdown: DRAFT_MD }))
    expect(res.status).toBe(404)
    expect(saveMissionIntent).not.toHaveBeenCalled()
  })

  it('returns 400 with the reason and saves nothing for incomplete markdown', async () => {
    const incomplete = DRAFT_MD.replace('## Open questions\n- Do insurers expose a status we can read?\n', '## Open questions\n\n')
    const res = await PUT(req('PUT', { taskId: 'mission-1', markdown: incomplete }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('Open questions')
    expect(saveMissionIntent).not.toHaveBeenCalled()
    expect(mergeTaskMetadata).not.toHaveBeenCalled()
    expect(appendTaskEvent).not.toHaveBeenCalled()
  })

  it('accepts a mission intent, rewriting status/author/created/task, via the guarded writer', async () => {
    const edited = DRAFT_MD.replace('One page shows each report status.', 'One page shows each report status, edited by the founder.')
      .replace('author: phill@example.com', 'author: someone-else@example.com')
    const res = await PUT(req('PUT', { taskId: 'mission-1', markdown: edited }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.markdown.startsWith(`---\nstatus: accepted\nauthor: phill@example.com\ncreated: ${body.acceptedAt}\ntask: mission-1\n---\n# Intent: `)).toBe(true)
    expect(body.markdown).not.toContain('someone-else')
    expect(body.markdown).toContain('edited by the founder')
    expect(mergeTaskMetadata).not.toHaveBeenCalled()
    expect(vi.mocked(saveMissionIntent).mock.calls[0][1]).toEqual({ status: 'accepted', markdown: body.markdown, acceptedAt: body.acceptedAt, author: 'phill@example.com' })
    expect(appendTaskEvent).toHaveBeenCalledWith(expect.objectContaining({ taskId: 'mission-1', type: 'comment', actor: 'founder', payload: { kind: 'intent_accepted' } }))
  })

  it('returns 409 and records no event when the guarded accept conflicts', async () => {
    vi.mocked(saveMissionIntent).mockRejectedValue(new DeliveryConflict())
    const res = await PUT(req('PUT', { taskId: 'mission-1', markdown: DRAFT_MD }))
    expect(res.status).toBe(409)
    expect(appendTaskEvent).not.toHaveBeenCalled()
  })

  it('still returns 200 when the audit event fails', async () => {
    vi.mocked(appendTaskEvent).mockRejectedValue(new Error('audit down'))
    const res = await PUT(req('PUT', { taskId: 'mission-1', markdown: DRAFT_MD }))
    expect(res.status).toBe(200)
  })
})
