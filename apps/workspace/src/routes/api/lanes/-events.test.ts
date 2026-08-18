import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CONTRACT_SCHEMA_VERSION } from '../../../../../../contracts/control-plane/v1'
import { EVENT_STREAM_SOURCE } from '../../../server/lanes/event-stream'
import type { LaneStreamEvent } from '../../../server/lanes/event-stream'

const listRunEventsMock = vi.fn()
const requireLocalOrAuthMock = vi.fn(() => true)

vi.mock('../../../server/auth-middleware', () => ({
  requireLocalOrAuth: requireLocalOrAuthMock,
}))

vi.mock('../../../server/lanes', () => ({
  getLaneOrchestrator: () => ({ listRunEvents: listRunEventsMock }),
}))

function event(sequence: number, overrides: Partial<LaneStreamEvent> = {}): LaneStreamEvent {
  return {
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    source: EVENT_STREAM_SOURCE,
    occurredAt: '2026-01-01T00:00:00.000Z',
    sequence,
    runId: 'run_1',
    kind: 'output',
    message: `line ${sequence}`,
    laneId: 'lane_1',
    machineId: 'macbook',
    agent: 'claude-code',
    ...overrides,
  }
}

async function get(request: Request): Promise<Response> {
  const { Route } = await import('./events')
  const handlers = Route.options.server?.handlers as {
    GET: (ctx: { request: Request }) => Promise<Response>
  }
  return handlers.GET({ request })
}

/** Read the frames the stream produced on connect, then close it. */
async function readOpeningFrames(response: Response): Promise<string> {
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let text = ''
  // The route drains the ledger fully before its first poll interval, so
  // everything available at connect time arrives in the opening reads.
  for (let read = 0; read < 12; read += 1) {
    const next = await Promise.race([
      reader.read(),
      new Promise<{ done: true; value: undefined }>((resolve) =>
        setTimeout(() => resolve({ done: true, value: undefined }), 50),
      ),
    ])
    if (next.done) break
    text += decoder.decode(next.value, { stream: true })
  }
  await reader.cancel()
  return text
}

describe('GET /api/lanes/events', () => {
  beforeEach(() => {
    listRunEventsMock.mockReset()
    requireLocalOrAuthMock.mockReturnValue(true)
  })

  it('denies an unauthenticated remote caller before touching the ledger', async () => {
    requireLocalOrAuthMock.mockReturnValue(false)
    const response = await get(
      new Request('http://203.0.113.10/api/lanes/events?runId=run_1'),
    )
    expect(response.status).toBe(401)
    expect(listRunEventsMock).not.toHaveBeenCalled()
  })

  it('rejects a missing or malformed runId', async () => {
    expect((await get(new Request('http://localhost/api/lanes/events'))).status).toBe(400)
    expect(
      (await get(new Request('http://localhost/api/lanes/events?runId=..%2F..%2Fetc')))
        .status,
    ).toBe(400)
    expect(listRunEventsMock).not.toHaveBeenCalled()
  })

  it('opens an event-stream with the headers a proxy must not buffer', async () => {
    listRunEventsMock.mockResolvedValue([])
    const response = await get(
      new Request('http://localhost/api/lanes/events?runId=run_1'),
    )
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('text/event-stream')
    expect(response.headers.get('cache-control')).toContain('no-cache')
    // Without this, nginx buffers the stream and "live" arrives in one lump.
    expect(response.headers.get('x-accel-buffering')).toBe('no')
    await response.body?.cancel()
  })

  it('replays the run from the start for a fresh client', async () => {
    listRunEventsMock.mockResolvedValue([event(1), event(2, { kind: 'lifecycle' })])
    const response = await get(
      new Request('http://localhost/api/lanes/events?runId=run_1'),
    )
    const text = await readOpeningFrames(response)

    expect(text).toContain('event: connected')
    expect(text).toContain('id: 1\n')
    expect(text).toContain('id: 2\n')
    expect(text).toContain('event: lifecycle')
  })

  it('resumes from Last-Event-ID without replaying what the browser rendered', async () => {
    listRunEventsMock.mockResolvedValue([event(1), event(2), event(3)])
    const response = await get(
      new Request('http://localhost/api/lanes/events?runId=run_1', {
        headers: { 'last-event-id': '2' },
      }),
    )
    const text = await readOpeningFrames(response)

    expect(text).not.toContain('id: 1\n')
    expect(text).not.toContain('id: 2\n')
    expect(text).toContain('id: 3\n')
  })

  it('reports a corrupt ledger instead of ending the stream silently', async () => {
    listRunEventsMock.mockRejectedValue(
      new Error('Lane event ledger contains a malformed JSONL record'),
    )
    const response = await get(
      new Request('http://localhost/api/lanes/events?runId=run_1'),
    )
    const text = await readOpeningFrames(response)

    // An empty stream and a broken one look identical in a browser.
    expect(text).toContain('event: stream_error')
    expect(text).toContain('malformed JSONL')
  })

  it('stops reading the ledger once the client disconnects', async () => {
    listRunEventsMock.mockResolvedValue([event(1)])
    const response = await get(
      new Request('http://localhost/api/lanes/events?runId=run_1'),
    )
    await readOpeningFrames(response)
    const callsAtCancel = listRunEventsMock.mock.calls.length

    await new Promise((resolve) => setTimeout(resolve, 600))
    expect(listRunEventsMock.mock.calls.length).toBe(callsAtCancel)
  })

  it('clears both timers on disconnect rather than leaking them', async () => {
    // This is a SEPARATE assertion from the one above on purpose. The route
    // also guards every poll on a `closed` flag, so "no more ledger reads"
    // stays true even when the interval is never cleared — that test passes
    // against a leaked timer and cannot stand in for this one. Only spying on
    // clearInterval observes the leak itself.
    listRunEventsMock.mockResolvedValue([event(1)])
    const cleared = vi.spyOn(globalThis, 'clearInterval')
    try {
      const response = await get(
        new Request('http://localhost/api/lanes/events?runId=run_1'),
      )
      const reader = response.body!.getReader()
      await reader.read()
      cleared.mockClear()
      await reader.cancel()
      // One for the poll interval, one for the keepalive.
      expect(cleared).toHaveBeenCalledTimes(2)
    } finally {
      cleared.mockRestore()
    }
  })
})

describe('disconnect during the initial catch-up drain', () => {
  it('arms no timers at all when cancel arrives before they exist', async () => {
    // The sibling test above cancels AFTER the intervals are armed, so it
    // observes clearInterval. It cannot see THIS leak: `start()` awaits the
    // initial drain (real ledger I/O, possibly several catch-up pages) before
    // arming anything, so a cancel landing inside that window finds both timer
    // handles still null, clears nothing, and then start() resumes and arms
    // them anyway. Nothing ever clears them afterwards.
    //
    // Asserting on setInterval rather than clearInterval is deliberate: the
    // defect is timers being CREATED after the connection is gone, and
    // "clearInterval was not called" is equally true of a correct run that
    // never armed anything.
    let releaseLedger: (events: unknown[]) => void = () => {}
    listRunEventsMock.mockImplementation(
      () => new Promise((resolve) => {
        releaseLedger = resolve as (events: unknown[]) => void
      }),
    )
    const armed = vi.spyOn(globalThis, 'setInterval')
    try {
      const response = await get(
        new Request('http://localhost/api/lanes/events?runId=run_1'),
      )
      const reader = response.body!.getReader()
      await reader.read() // the `connected` control frame, sent before the drain
      armed.mockClear()

      // Cancel while the drain is still suspended on the ledger read.
      const cancelled = reader.cancel()
      releaseLedger([])
      await cancelled
      await new Promise((resolve) => setTimeout(resolve, 20))

      expect(armed).not.toHaveBeenCalled()
    } finally {
      armed.mockRestore()
    }
  })
})
