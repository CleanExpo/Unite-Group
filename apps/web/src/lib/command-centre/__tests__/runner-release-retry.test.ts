// UNI-2390 — the Nexus runner's release calls must be status-checked, not
// fire-and-forget. releaseTask retries non-2xx/network failures with bounded
// backoff and, when every attempt fails, logs an ERROR naming the task
// stranded in 'running' instead of pretending the release succeeded.
//
// runner.mjs guards its poll loop behind an executed-directly check, so
// importing it here runs no loop and touches no network beyond the mocked
// fetch below.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { releaseTask, RELEASE_RETRY_DELAYS } from '../../../../../../scripts/nexus-runner/runner.mjs'

const TOTAL_ATTEMPTS = RELEASE_RETRY_DELAYS.length + 1
const TOTAL_BACKOFF_MS = RELEASE_RETRY_DELAYS.reduce((sum, s) => sum + s, 0) * 1000

const response = (status: number, body: Record<string, unknown> = {}) => ({
  status,
  json: () => Promise.resolve(body),
})

const body = { taskId: 'task-1', runnerId: 'runner-a', outcome: 'done', prRef: 'https://example.test/pr/1' }

describe('nexus-runner releaseTask (UNI-2390)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('returns true on a 2xx release without retrying', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(200, { task: { id: 'task-1' } }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(releaseTask(body)).resolves.toBe(true)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toContain('/api/agents/runner/release')
    expect(JSON.parse(init.body)).toMatchObject({ taskId: 'task-1', outcome: 'done' })
  })

  it('retries a non-2xx release with backoff and succeeds on a later attempt', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(500, { error: 'transient' }))
      .mockResolvedValueOnce(response(200, { task: { id: 'task-1' } }))
    vi.stubGlobal('fetch', fetchMock)

    const promise = releaseTask(body)
    await vi.advanceTimersByTimeAsync(RELEASE_RETRY_DELAYS[0] * 1000)

    await expect(promise).resolves.toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('retries network failures too, not just HTTP errors', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('socket hang up'))
      .mockResolvedValueOnce(response(200, {}))
    vi.stubGlobal('fetch', fetchMock)

    const promise = releaseTask(body)
    await vi.advanceTimersByTimeAsync(RELEASE_RETRY_DELAYS[0] * 1000)

    await expect(promise).resolves.toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('logs an ERROR naming the stranded task when every attempt fails', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const fetchMock = vi.fn().mockResolvedValue(response(503, { error: 'down' }))
    vi.stubGlobal('fetch', fetchMock)

    const promise = releaseTask(body)
    await vi.advanceTimersByTimeAsync(TOTAL_BACKOFF_MS)

    await expect(promise).resolves.toBe(false)
    expect(fetchMock).toHaveBeenCalledTimes(TOTAL_ATTEMPTS)

    const lines = logSpy.mock.calls.map((call) => String(call[0]))
    const errorLine = lines.find((line) => line.includes('ERROR:'))
    expect(errorLine).toBeDefined()
    expect(errorLine).toContain('task-1')
    expect(errorLine).toContain("stranded in 'running'")
  })
})
