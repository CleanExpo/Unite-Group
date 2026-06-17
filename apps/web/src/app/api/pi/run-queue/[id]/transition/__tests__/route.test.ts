import { describe, expect, it, beforeEach, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn(), createClient: vi.fn() }))

import { getUser, createClient } from '@/lib/supabase/server'
import { POST as enqueuePost } from '../../../route'
import { POST } from '../route'
import { makeFakeRunQueueDb } from '@/lib/founder-os/__tests__/fake-run-queue-db'

function enqueueRequest(body: unknown): Request {
  return new Request('http://localhost/api/pi/run-queue', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function transitionRequest(body: unknown): Request {
  return new Request('http://localhost/api/pi/run-queue/run_task/transition', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function enqueue(message: string, idSeed: string) {
  const response = await enqueuePost(enqueueRequest({ message, idSeed, now: '2026-06-02T00:00:00.000Z' }))
  const body = await response.json()
  return body.queueItem
}

let db: ReturnType<typeof makeFakeRunQueueDb>

describe('POST /api/pi/run-queue/[id]/transition', () => {
  beforeEach(() => {
    db = makeFakeRunQueueDb()
    vi.mocked(getUser).mockResolvedValue({ id: 'founder-1' } as never)
    vi.mocked(createClient).mockResolvedValue(db.client as never)
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)

    const response = await POST(transitionRequest({ action: 'approve', actor: 'Margot', now: '2026-06-02T00:01:00.000Z' }), { params: Promise.resolve({ id: 'run_task' }) })

    expect(response.status).toBe(401)
  })

  it('returns 404 when transitioning an unknown id (durable store has no such item)', async () => {
    const response = await POST(transitionRequest({ action: 'start', actor: 'Pi-Dev-Ops', now: '2026-06-02T00:01:00.000Z' }), { params: Promise.resolve({ id: 'run_missing' }) })
    const body = await response.json()
    expect(response.status).toBe(404)
    expect(body.error).toBe('queue item not found')
  })

  it('approves and starts an approval-gated task, persisting each transition', async () => {
    const queued = await enqueue('Connect Synthex LinkedIn for publishing.', 'approval-transition')

    const approveResponse = await POST(transitionRequest({ action: 'approve', actor: 'Margot', note: 'Approved.', now: '2026-06-02T00:01:00.000Z' }), { params: Promise.resolve({ id: queued.id }) })
    const approvedBody = await approveResponse.json()

    expect(approveResponse.status).toBe(200)
    expect(approvedBody.queueItem.status).toBe('queued')
    expect(approvedBody.queueItem.approvals[0].actor).toBe('Margot')

    const startResponse = await POST(transitionRequest({ action: 'start', actor: 'Pi-Dev-Ops', now: '2026-06-02T00:02:00.000Z' }), { params: Promise.resolve({ id: queued.id }) })
    const startedBody = await startResponse.json()

    expect(startResponse.status).toBe(200)
    expect(startedBody.queueItem.status).toBe('in_progress')
    // The transition was written back to the durable store.
    expect(db.rows.find((r) => r.queue_id === queued.id)?.status).toBe('in_progress')
  })

  it('blocks and completes with evidence', async () => {
    const queued = await enqueue('Build the Pi queue transition controls.', 'block-complete')

    const blockResponse = await POST(transitionRequest({ action: 'block', actor: 'Pi-Dev-Ops', note: 'Waiting on approval.', now: '2026-06-02T00:03:00.000Z' }), { params: Promise.resolve({ id: queued.id }) })
    const blockedBody = await blockResponse.json()

    expect(blockedBody.queueItem.status).toBe('blocked')
    expect(blockedBody.queueItem.blockers).toContain('Waiting on approval.')

    const completeResponse = await POST(transitionRequest({ action: 'complete', actor: 'Pi-Dev-Ops', evidenceLink: 'loop:3x-green', note: 'Done.', now: '2026-06-02T00:04:00.000Z' }), { params: Promise.resolve({ id: queued.id }) })
    const completedBody = await completeResponse.json()

    expect(completeResponse.status).toBe(200)
    expect(completedBody.queueItem.status).toBe('completed')
    expect(completedBody.queueItem.contextPack.evidenceLinks).toContain('loop:3x-green')
  })

  it('rejects completion without evidence', async () => {
    const queued = await enqueue('Build the Pi queue transition controls.', 'reject-no-evidence')

    const response = await POST(transitionRequest({ action: 'complete', actor: 'Pi-Dev-Ops' }), { params: Promise.resolve({ id: queued.id }) })
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe('completion requires evidenceLink')
  })
})
