import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn(), createClient: vi.fn() }))

import { getUser, createClient } from '@/lib/supabase/server'
import { GET, POST } from '../route'
import { makeFakeRunQueueDb } from '@/lib/founder-os/__tests__/fake-run-queue-db'

function request(body: unknown): Request {
  return new Request('http://localhost/api/pi/run-queue', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

let db: ReturnType<typeof makeFakeRunQueueDb>

beforeEach(() => {
  db = makeFakeRunQueueDb()
  vi.mocked(getUser).mockResolvedValue({ id: 'founder-1' } as never)
  vi.mocked(createClient).mockResolvedValue(db.client as never)
})

describe('GET /api/pi/run-queue', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)
    const response = await GET()
    expect(response.status).toBe(401)
  })
})

describe('POST /api/pi/run-queue', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)
    const response = await POST(request({ message: 'Whatever.' }))
    expect(response.status).toBe(401)
  })

  it('routes and enqueues a founder message in one call', async () => {
    const response = await POST(
      request({
        message: 'Build the next Pi queue control panel.',
        now: '2026-06-02T00:00:00.000Z',
        idSeed: 'queue-panel',
      }),
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.queueItem.status).toBe('queued')
    expect(body.queueItem.taskPacket.portfolioTarget).toBe('pi_dev_ops')
    expect(body.queueItem.machineAssignment.assignedDeviceId).toBe('windows-desktop')
    expect(body.enforcement.mode).toBe('continue_until_complete')
    expect(body.enforcement.canOpenNextLane).toBe(false)
    expect(body.receipt.status).toBe('queued')
  })

  it('persists the enqueued item to the founder-scoped durable store', async () => {
    await POST(request({ message: 'Persist me.', idSeed: 'persist', now: '2026-06-02T00:00:00.000Z' }))

    // Written through to pi_run_queue, fenced by the authenticated founder id.
    expect(db.rows).toHaveLength(1)
    expect(db.rows[0].founder_id).toBe('founder-1')
    expect(db.rows[0].queue_id).toMatch(/^run_/)
    expect(db.rows[0].status).toBe('queued')
  })

  it('returns queued items through GET (durable across calls, not in-memory)', async () => {
    await POST(request({ message: 'Research Kimi model routing.', idSeed: 'kimi-route', now: '2026-06-02T00:00:00.000Z' }))

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.items.length).toBeGreaterThan(0)
    expect(body.summary.total).toBe(body.items.length)
    expect(body.enforcement.openWorkCount).toBeGreaterThan(0)
    expect(body.enforcement.requiredAction).toContain('before opening the next build lane')
  })

  it('isolates the queue per founder — a different founder sees none of it', async () => {
    await POST(request({ message: 'Founder one work.', idSeed: 'iso', now: '2026-06-02T00:00:00.000Z' }))

    // Same durable store, different authenticated founder.
    vi.mocked(getUser).mockResolvedValue({ id: 'founder-2' } as never)
    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.items).toHaveLength(0)
    expect(body.summary.total).toBe(0)
  })
})
