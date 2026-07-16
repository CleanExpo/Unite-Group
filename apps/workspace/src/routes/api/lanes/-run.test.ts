import { describe, expect, it, vi } from 'vitest'
import { LaneConflictError } from '../../../server/lanes/lane-orchestrator'

const runMissionMock = vi.fn()
const getRunMock = vi.fn()

vi.mock('../../../server/auth-middleware', () => ({
  isAuthenticated: () => true,
}))

vi.mock('../../../server/rate-limit', () => ({
  requireJsonContentType: () => null,
}))

vi.mock('../../../server/lanes', () => ({
  getLaneOrchestrator: () => ({
    runMission: runMissionMock,
    getRun: getRunMock,
  }),
}))

describe('POST /api/lanes/run', () => {
  it('returns 409 for a concurrent lane-run conflict', async () => {
    runMissionMock.mockRejectedValueOnce(
      new LaneConflictError('Lane "l1" is already running'),
    )
    const { Route } = await import('./run')
    const handlers = Route.options.server?.handlers as {
      POST: (ctx: { request: Request }) => Promise<Response>
    }

    const response = await handlers.POST({
      request: new Request('http://localhost/api/lanes/run', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: 'l1', mission: 'build' }),
      }),
    })

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: 'Lane "l1" is already running',
    })
  })

  it('does not expose unknown run internals', async () => {
    runMissionMock.mockRejectedValueOnce(
      new Error('EACCES /Users/operator/.config/provider-secret'),
    )
    const { Route } = await import('./run')
    const handlers = Route.options.server?.handlers as {
      POST: (ctx: { request: Request }) => Promise<Response>
    }

    const response = await handlers.POST({
      request: new Request('http://localhost/api/lanes/run', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: 'l1', mission: 'build' }),
      }),
    })

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: 'Failed to run mission',
    })
  })

  it('returns the durable terminal run correlated to the lane', async () => {
    const lane = { id: 'l1', status: 'idle', lastRunId: 'run-1' }
    const run = {
      id: 'run-1',
      laneId: 'l1',
      machineId: 'mac-1',
      status: 'succeeded',
      attempt: 1,
      startedAt: 1,
      finishedAt: 2,
    }
    runMissionMock.mockResolvedValueOnce(lane)
    getRunMock.mockResolvedValueOnce(run)
    const { Route } = await import('./run')
    const handlers = Route.options.server?.handlers as {
      POST: (ctx: { request: Request }) => Promise<Response>
    }

    const response = await handlers.POST({
      request: new Request('http://localhost/api/lanes/run', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: 'l1', mission: 'build' }),
      }),
    })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ ok: true, lane, run })
    expect(getRunMock).toHaveBeenCalledWith('run-1')
  })
})
