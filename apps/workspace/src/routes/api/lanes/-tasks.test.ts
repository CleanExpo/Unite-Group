import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createBoundedTaskAuthority } from '../../../server/lanes/task-queue'
import { summariseNexusTasks } from './tasks'

const authority = createBoundedTaskAuthority(1)

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  enqueue: vi.fn(),
  list: vi.fn(),
  requireLocalOrAuth: vi.fn(() => true),
}))

vi.mock('../../../server/auth-middleware', () => ({
  requireLocalOrAuth: mocks.requireLocalOrAuth,
}))
vi.mock('../../../server/rate-limit', () => ({
  requireJsonContentType: () => null,
}))
vi.mock('../../../server/lanes', () => ({
  ensureNexusTaskQueueRecovered: vi.fn(),
  getLaneOrchestrator: () => ({ get: mocks.get }),
  getNexusTaskQueue: () => ({ enqueue: mocks.enqueue, list: mocks.list }),
  getNexusWorkers: vi.fn(() => Promise.resolve([])),
}))

describe('Nexus task API', () => {
  beforeEach(() => {
    mocks.get.mockReset()
    mocks.enqueue.mockReset()
    mocks.list.mockReset()
    mocks.requireLocalOrAuth.mockReturnValue(true)
  })

  it('summarises dashboard states without treating failures as completed', () => {
    expect(
      summariseNexusTasks([
        {
          id: '1',
          idempotencyKey: 'idem-task-0001',
          laneId: 'l',
          workerId: 'codex-cli',
          status: 'pending',
          createdAt: 1,
          updatedAt: 1,
          authority,
        },
        {
          id: '2',
          idempotencyKey: 'idem-task-0002',
          laneId: 'l',
          workerId: 'codex-cli',
          status: 'running',
          createdAt: 1,
          updatedAt: 1,
          authority,
        },
        {
          id: '3',
          idempotencyKey: 'idem-task-0003',
          laneId: 'l',
          workerId: 'codex-cli',
          status: 'completed',
          createdAt: 1,
          updatedAt: 1,
          authority,
        },
        {
          id: '4',
          idempotencyKey: 'idem-task-0004',
          laneId: 'l',
          workerId: 'codex-cli',
          status: 'failed',
          createdAt: 1,
          updatedAt: 1,
          authority,
        },
      ]),
    ).toEqual({ pending: 1, running: 1, completed: 1, blocked: 1 })
  })

  it('queues a task against the existing lane without exposing its mission', async () => {
    mocks.get.mockResolvedValueOnce({
      id: 'lane-1',
      status: 'idle',
      backend: { kind: 'cli', tool: 'codex', account: 'openai-pro' },
    })
    mocks.enqueue.mockResolvedValueOnce({
      id: 'task-1',
      idempotencyKey: 'idem-task-0005',
      laneId: 'lane-1',
      workerId: 'codex-cli',
      status: 'pending',
      createdAt: 1,
      updatedAt: 1,
      authority,
    })
    const handlers = Route.options.server?.handlers as {
      POST: (ctx: { request: Request }) => Promise<Response>
    }
    const response = await handlers.POST({
      request: new Request('http://localhost/api/lanes/tasks', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          id: 'lane-1',
          mission: ' bounded build ',
          approved: true,
          idempotencyKey: 'idem-task-0005',
        }),
      }),
    })

    expect(response.status).toBe(202)
    expect(mocks.enqueue).toHaveBeenCalledWith({
      idempotencyKey: 'idem-task-0005',
      laneId: 'lane-1',
      workerId: 'codex-cli',
      mission: 'bounded build',
      authority: expect.objectContaining({
        mode: 'bounded-non-production',
        approval: 'explicit-authenticated-operator',
      }),
    })
    expect(JSON.stringify(await response.json())).not.toContain('bounded build')
  })

  it('refuses to queue a task without explicit approval', async () => {
    const handlers = Route.options.server?.handlers as {
      POST: (ctx: { request: Request }) => Promise<Response>
    }
    const response = await handlers.POST({
      request: new Request('http://localhost/api/lanes/tasks', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: 'lane-1', mission: 'bounded build' }),
      }),
    })

    expect(response.status).toBe(400)
    expect(mocks.get).not.toHaveBeenCalled()
    expect(mocks.enqueue).not.toHaveBeenCalled()
  })

  it('denies unauthenticated task reads', async () => {
    mocks.requireLocalOrAuth.mockReturnValue(false)
    const handlers = Route.options.server?.handlers as {
      GET: (ctx: { request: Request }) => Promise<Response>
    }
    const response = await handlers.GET({
      request: new Request('http://203.0.113.10/api/lanes/tasks'),
    })

    expect(response.status).toBe(401)
    expect(mocks.list).not.toHaveBeenCalled()
  })
})

const { Route } = await import('./tasks')
