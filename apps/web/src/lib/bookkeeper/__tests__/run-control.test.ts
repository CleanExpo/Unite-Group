import { describe, expect, it, vi } from 'vitest'
import {
  BOOKKEEPER_STALE_RUN_MS,
  createSupabaseBookkeeperRunStore,
  prepareBookkeeperRun,
  type BookkeeperRunStore,
  type RunningBookkeeperRun,
} from '@/lib/bookkeeper/run-control'

function makeStore(
  rows: RunningBookkeeperRun[],
  recoveredIds?: string[],
): BookkeeperRunStore {
  return {
    listRunning: vi.fn().mockResolvedValue(rows),
    markFailed: vi.fn().mockImplementation(({ runs }) =>
      Promise.resolve(recoveredIds ?? runs.map((run: RunningBookkeeperRun) => run.id)),
    ),
  }
}

describe('createSupabaseBookkeeperRunStore', () => {
  it('preserves prior errors, founder-scopes updates, and reports only transitioned ids', async () => {
    const listChain = {
      eq: vi.fn(),
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'stale-1',
            started_at: '2026-07-10T05:00:00.000Z',
            error_log: [{ code: 'prior_failure' }],
          },
        ],
        error: null,
      }),
    }
    listChain.eq.mockReturnValue(listChain)
    const listSelect = vi.fn().mockReturnValue(listChain)

    const maybeSingle = vi.fn().mockResolvedValue({
      data: { id: 'stale-1' },
      error: null,
    })
    const updateChain = {
      eq: vi.fn(),
      select: vi.fn().mockReturnValue({ maybeSingle }),
    }
    updateChain.eq.mockReturnValue(updateChain)
    const update = vi.fn().mockReturnValue(updateChain)
    const from = vi
      .fn()
      .mockReturnValueOnce({ select: listSelect })
      .mockReturnValueOnce({ update })

    const store = createSupabaseBookkeeperRunStore({ from } as never)
    const runs = await store.listRunning('founder-123')
    const recovered = await store.markFailed({
      founderId: 'founder-123',
      runs,
      completedAt: '2026-07-10T06:00:00.000Z',
      reason: 'stale_timeout',
    })

    expect(listSelect).toHaveBeenCalledWith('id, started_at, error_log')
    expect(listChain.eq).toHaveBeenCalledWith('founder_id', 'founder-123')
    expect(listChain.eq).toHaveBeenCalledWith('status', 'running')
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'failed',
        error_log: [
          { code: 'prior_failure' },
          expect.objectContaining({ code: 'stale_timeout' }),
        ],
      }),
    )
    expect(updateChain.eq).toHaveBeenCalledWith('founder_id', 'founder-123')
    expect(updateChain.eq).toHaveBeenCalledWith('status', 'running')
    expect(updateChain.eq).toHaveBeenCalledWith('id', 'stale-1')
    expect(recovered).toEqual(['stale-1'])
  })
})

describe('prepareBookkeeperRun', () => {
  const now = new Date('2026-07-10T06:00:00.000Z')

  it('marks founder-scoped stale running rows failed before returning', async () => {
    const staleRuns: RunningBookkeeperRun[] = [
      { id: 'stale-1', startedAt: '2026-07-10T05:30:00.000Z' },
      {
        id: 'stale-2',
        startedAt: '2026-07-09T06:00:00.000Z',
        errorLog: [{ code: 'prior_failure' }],
      },
    ]
    const store = makeStore(staleRuns)

    const result = await prepareBookkeeperRun('founder-123', { now, store })

    expect(store.markFailed).toHaveBeenCalledWith({
      founderId: 'founder-123',
      runs: staleRuns,
      completedAt: now.toISOString(),
      reason: 'stale_timeout',
    })
    expect(result).toEqual({
      activeRun: null,
      recoveredStaleRunIds: ['stale-1', 'stale-2'],
    })
  })

  it('reports only stale rows actually transitioned by the store', async () => {
    const store = makeStore(
      [
        { id: 'stale-1', startedAt: '2026-07-10T05:30:00.000Z' },
        { id: 'stale-2', startedAt: '2026-07-10T05:20:00.000Z' },
      ],
      ['stale-2'],
    )

    const result = await prepareBookkeeperRun('founder-123', { now, store })

    expect(result.recoveredStaleRunIds).toEqual(['stale-2'])
  })

  it('returns a fresh active run without marking it failed', async () => {
    const freshStartedAt = new Date(
      now.getTime() - BOOKKEEPER_STALE_RUN_MS + 1,
    ).toISOString()
    const store = makeStore([{ id: 'fresh-1', startedAt: freshStartedAt }])

    const result = await prepareBookkeeperRun('founder-123', { now, store })

    expect(store.markFailed).not.toHaveBeenCalled()
    expect(result).toEqual({
      activeRun: { id: 'fresh-1', startedAt: freshStartedAt },
      recoveredStaleRunIds: [],
    })
  })

  it('recovers stale rows but still reports a separate fresh active run', async () => {
    const store = makeStore([
      { id: 'stale-1', startedAt: '2026-07-10T05:00:00.000Z' },
      { id: 'fresh-1', startedAt: '2026-07-10T05:55:00.000Z' },
    ])

    const result = await prepareBookkeeperRun('founder-123', { now, store })

    expect(store.markFailed).toHaveBeenCalledOnce()
    expect(result).toEqual({
      activeRun: {
        id: 'fresh-1',
        startedAt: '2026-07-10T05:55:00.000Z',
      },
      recoveredStaleRunIds: ['stale-1'],
    })
  })
})
