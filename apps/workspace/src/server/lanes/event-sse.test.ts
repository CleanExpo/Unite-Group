import { describe, expect, it } from 'vitest'
import { CONTRACT_SCHEMA_VERSION } from '../../../../../contracts/control-plane/v1'
import { EVENT_STREAM_SOURCE } from './event-stream'
import {
  createLaneEventPump,
  formatControlFrame,
  formatSseFrame,
  resolveCursor,
  resolveRunId,
} from './event-sse'
import type { LaneStreamEvent } from './event-stream'

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

describe('sse framing', () => {
  it('carries the sequence as the event id so the browser can resume itself', () => {
    const frame = formatSseFrame(event(7))
    // `id:` is what EventSource echoes back as Last-Event-ID. Without it the
    // page would have to track its own cursor, and would lose it on refresh.
    expect(frame.startsWith('id: 7\n')).toBe(true)
    expect(frame).toContain('event: output\n')
    expect(frame.endsWith('\n\n')).toBe(true)
  })

  it('names the frame by canonical kind so a client can subscribe selectively', () => {
    expect(formatSseFrame(event(1, { kind: 'tool_call' }))).toContain('event: tool_call\n')
    expect(formatSseFrame(event(2, { kind: 'lifecycle' }))).toContain('event: lifecycle\n')
  })

  it('round-trips the event payload', () => {
    const original = event(3, { kind: 'tool_call', tool: { name: 'Bash', argumentSummary: 'npm test', status: 'succeeded', durationMs: 12 } })
    const data = formatSseFrame(original).match(/data: (.*)\n\n$/)?.[1]
    expect(JSON.parse(data ?? '')).toEqual(original)
  })

  it('emits a control frame with no id, so it cannot move the client cursor', () => {
    const frame = formatControlFrame('connected', { runId: 'run_1' })
    expect(frame).not.toContain('id:')
    expect(frame).toContain('event: connected\n')
  })

  it('keeps a payload containing a newline on one data line', () => {
    // A raw newline inside `data:` would terminate the frame early and the
    // remainder would be parsed as a new field.
    const frame = formatSseFrame(event(1, { message: 'line one\nline two' }))
    expect(frame.split('\n').filter((line) => line.startsWith('data: '))).toHaveLength(1)
    expect(frame).not.toContain('line one\nline two')
  })
})

describe('cursor resolution', () => {
  const url = 'http://localhost:3000/api/lanes/events?runId=run_1'

  it('prefers Last-Event-ID over a stale cursor parameter', () => {
    // The header is what the browser sets from the frame it actually received.
    // Trusting the URL over it would replay events already rendered.
    const request = new Request(`${url}&cursor=2`, {
      headers: { 'last-event-id': '9' },
    })
    expect(resolveCursor(request)).toBe(9)
  })

  it('falls back to the cursor parameter for a non-browser client', () => {
    expect(resolveCursor(new Request(`${url}&cursor=4`))).toBe(4)
  })

  it('replays from the start rather than skipping ahead on a bad value', () => {
    // A full replay is recoverable; silently skipping loses events unnoticed.
    expect(resolveCursor(new Request(`${url}&cursor=-1`))).toBe(0)
    expect(resolveCursor(new Request(`${url}&cursor=abc`))).toBe(0)
    expect(resolveCursor(new Request(`${url}&cursor=1.5`))).toBe(0)
    expect(resolveCursor(new Request(url))).toBe(0)
    expect(resolveCursor(new Request(url, { headers: { 'last-event-id': '' } }))).toBe(0)
  })
})

describe('run id resolution', () => {
  it('accepts the shape the orchestrator generates', () => {
    expect(
      resolveRunId(new Request('http://localhost/api/lanes/events?runId=run_ab12-cd.34')),
    ).toBe('run_ab12-cd.34')
  })

  it('rejects anything that could reach the ledger as a path', () => {
    for (const candidate of ['../../etc/passwd', 'run 1', 'run/1', '', 'a'.repeat(129)]) {
      expect(
        resolveRunId(
          new Request(`http://localhost/api/lanes/events?runId=${encodeURIComponent(candidate)}`),
        ),
      ).toBeNull()
    }
    expect(resolveRunId(new Request('http://localhost/api/lanes/events'))).toBeNull()
  })
})

describe('lane event pump', () => {
  function pumpOver(events: LaneStreamEvent[], pageLimit?: number) {
    let current = events
    const pump = createLaneEventPump({
      runId: 'run_1',
      listRunEvents: async () => current,
      ...(pageLimit !== undefined ? { pageLimit } : {}),
    })
    return {
      pump,
      append(...more: LaneStreamEvent[]) {
        current = [...current, ...more]
      },
    }
  }

  it('emits everything on a first poll and advances the cursor', async () => {
    const { pump } = pumpOver([event(1), event(2), event(3)])
    const page = await pump.poll()
    expect(page.frames).toHaveLength(3)
    expect(page.cursor).toBe(3)
    expect(page.hasMore).toBe(false)
  })

  it('emits nothing when the client is already current', async () => {
    const { pump } = pumpOver([event(1), event(2)])
    await pump.poll()
    const second = await pump.poll()
    expect(second.frames).toEqual([])
    expect(second.cursor).toBe(2)
  })

  it('emits only what arrived since the last poll', async () => {
    const { pump, append } = pumpOver([event(1)])
    await pump.poll()
    append(event(2), event(3))
    const page = await pump.poll()
    expect(page.frames.map((frame) => frame.split('\n')[0])).toEqual(['id: 2', 'id: 3'])
  })

  it('resumes from a seek without replaying what the client already has', async () => {
    const { pump } = pumpOver([event(1), event(2), event(3), event(4)])
    pump.seek(2)
    const page = await pump.poll()
    expect(page.frames.map((frame) => frame.split('\n')[0])).toEqual(['id: 3', 'id: 4'])
  })

  it('signals more remains rather than flushing an unbounded page', async () => {
    const { pump } = pumpOver(
      Array.from({ length: 12 }, (_, index) => event(index + 1)),
      5,
    )
    const first = await pump.poll()
    expect(first.frames).toHaveLength(5)
    expect(first.hasMore).toBe(true)
    const second = await pump.poll()
    expect(second.frames).toHaveLength(5)
    const third = await pump.poll()
    expect(third.frames).toHaveLength(2)
    expect(third.hasMore).toBe(false)
  })

  it('a drop and reconnect loses nothing and duplicates nothing', async () => {
    const all = Array.from({ length: 30 }, (_, index) => event(index + 1))
    const { pump } = pumpOver(all, 12)

    // Client renders one page, then the socket drops.
    const rendered = await pump.poll()
    const lastRendered = Number(rendered.frames.at(-1)?.match(/^id: (\d+)/)?.[1])

    // Reconnect: a fresh pump seeded from the browser's Last-Event-ID.
    const { pump: resumed } = pumpOver(all)
    resumed.seek(lastRendered)
    const after = await resumed.poll()

    const seen = [
      ...rendered.frames.map((frame) => Number(frame.match(/^id: (\d+)/)?.[1])),
      ...after.frames.map((frame) => Number(frame.match(/^id: (\d+)/)?.[1])),
    ]
    expect(seen).toEqual(all.map((row) => row.sequence))
    expect(new Set(seen).size).toBe(seen.length)
  })

  it('a negative seek replays from the start instead of going backwards', async () => {
    const { pump } = pumpOver([event(1), event(2)])
    pump.seek(-5)
    expect(pump.cursor).toBe(0)
    expect((await pump.poll()).frames).toHaveLength(2)
  })

  it('surfaces a ledger read failure rather than reporting an empty run', async () => {
    const pump = createLaneEventPump({
      runId: 'run_1',
      listRunEvents: async () => {
        throw new Error('Lane event ledger contains a malformed JSONL record')
      },
    })
    // An empty stream and a broken one are indistinguishable to a client, so
    // the failure has to propagate for the route to report it.
    await expect(pump.poll()).rejects.toThrow(/malformed JSONL/)
  })
})
