import { describe, expect, it } from 'vitest'
import {
  CONTRACT_SCHEMA_VERSION,
  findEnvelopeViolations,
} from '../../../../../contracts/control-plane/v1'
import {
  createLaneEventStream,
  createRedactingSplitter,
  EVENT_STREAM_SOURCE,
  MAX_LINE_BYTES,
  isLaneStreamEvent,
  parseEventLedger,
  readEventsAfter,
  summariseToolArguments,
} from './event-stream'
import type { LaneStreamEvent } from './event-stream'

const IDENTITY = {
  runId: 'run_abc123',
  laneId: 'lane_1',
  machineId: 'macbook',
  agent: 'claude-code',
}

/** Collect every event a stream emits, in order. */
function recorder() {
  const events: LaneStreamEvent[] = []
  return {
    events,
    sink: (event: LaneStreamEvent) => {
      events.push(event)
    },
  }
}

function streamWith(options: Partial<Parameters<typeof createLaneEventStream>[0]> = {}) {
  const sunk = recorder()
  let tick = 0
  const stream = createLaneEventStream({
    identity: IDENTITY,
    sink: sunk.sink,
    now: () => Date.UTC(2026, 0, 1) + tick++ * 1000,
    ...options,
  })
  return { stream, ...sunk }
}

describe('redacting splitter', () => {
  it('emits only complete lines and carries the partial one forward', () => {
    const splitter = createRedactingSplitter()
    expect(splitter.push('first line\nsecond ')).toEqual(['first line'])
    expect(splitter.push('half\n')).toEqual(['second half'])
    expect(splitter.flush()).toEqual([])
  })

  it('redacts a secret that arrives split across two chunks', () => {
    const splitter = createRedactingSplitter()
    // The failure this guards: per-chunk redaction sees `sk-live_ab` and
    // `cdef...` as two harmless fragments and emits both.
    expect(splitter.push('token=sk_live_ab')).toEqual([])
    const lines = splitter.push('cdefghijklmnop123456\n')
    expect(lines).toHaveLength(1)
    expect(lines[0]).not.toContain('sk_live_abcdefghijklmnop123456')
    expect(lines[0]).toContain('[REDACTED]')
  })

  it('positive control: an unsplit redactor would have leaked that same secret', () => {
    // Proves the assertion above can fail — a canary test that cannot fail is
    // indistinguishable from one that passes for the wrong reason.
    const naive = (chunk: string) => chunk
    const leaked = `${naive('token=sk_live_ab')}${naive('cdefghijklmnop123456')}`
    expect(leaked).toContain('sk_live_abcdefghijklmnop123456')
  })

  it('suppresses a multi-line PEM private key body', () => {
    const splitter = createRedactingSplitter()
    const lines = [
      ...splitter.push('-----BEGIN RSA PRIVATE KEY-----\n'),
      ...splitter.push('MIIEowIBAAKCAQEAoRSTUVWXYZsecretbody\n'),
      ...splitter.push('MoReSeCrEtBoDyLiNeS0987654321\n'),
      ...splitter.push('-----END RSA PRIVATE KEY-----\n'),
      ...splitter.push('after the key\n'),
    ]
    expect(lines).toEqual(['[REDACTED]', 'after the key'])
    expect(lines.join('\n')).not.toContain('MIIEowIBAAKCAQEA')
    expect(lines.join('\n')).not.toContain('MoReSeCrEtBoDyLiNeS')
  })

  it('force-flushes an endless line without unbounded growth, carrying the tail', () => {
    const splitter = createRedactingSplitter(64, 16)
    const emitted = splitter.push('x'.repeat(200))
    expect(emitted.length).toBeGreaterThan(0)
    // Everything eventually comes out; nothing is silently dropped.
    const total = [...emitted, ...splitter.flush()].join('').length
    expect(total).toBe(200)
  })

  it('does not leak a secret cut by the force-flush boundary', () => {
    // Line limit chosen so the cut lands inside the token.
    const splitter = createRedactingSplitter(40, 24)
    const filler = 'y'.repeat(30)
    const out = [
      ...splitter.push(`${filler}sk_live_abcdefghijklmnop123456`),
      ...splitter.flush(),
    ]
    expect(out.join('\n')).not.toContain('sk_live_abcdefghijklmnop123456')
  })

  it('strips a home directory path before it can be persisted', () => {
    const splitter = createRedactingSplitter()
    const [line] = splitter.push('reading /Users/phill/.hermes/.env now\n')
    expect(line).not.toContain('/Users/phill')
    expect(line).toContain('[REDACTED_PATH]')
  })

  it('is reusable after an unterminated PEM block', () => {
    const splitter = createRedactingSplitter()
    splitter.push('-----BEGIN PRIVATE KEY-----\nbody-without-end\n')
    splitter.flush()
    expect(splitter.push('ordinary line\n')).toEqual(['ordinary line'])
  })
})

describe('tool argument summaries', () => {
  it('redacts and bounds structured arguments', () => {
    const summary = summariseToolArguments({
      path: '/Users/phill/secret-project/main.ts',
      token: 'sk_live_abcdefghijklmnop123456',
    })
    expect(summary).not.toContain('/Users/phill')
    expect(summary).not.toContain('sk_live_abcdefghijklmnop123456')
    expect(summary).toContain('[REDACTED')
  })

  it('bounds an oversized argument payload', () => {
    expect(summariseToolArguments('z'.repeat(5_000), 100).length).toBeLessThanOrEqual(100)
  })

  it('never throws on an unserialisable value', () => {
    const cyclic: Record<string, unknown> = {}
    cyclic.self = cyclic
    expect(() => summariseToolArguments(cyclic)).not.toThrow()
  })
})

describe('lane event stream', () => {
  it('emits contract-conforming envelopes on every kind', async () => {
    const { stream, events } = streamWith()
    await stream.lifecycle('Run started', { toState: 'running' })
    await stream.output('stdout', 'building…\n')
    await stream.toolCall({
      name: 'Bash',
      argumentSummary: 'npm test',
      status: 'succeeded',
      durationMs: 1200,
    })
    await stream.evidence('37 tests passed')
    await stream.error('exit 1')
    await stream.control('stop acknowledged')
    await stream.annotation('note')
    await stream.flush()

    expect(events).toHaveLength(7)
    for (const event of events) {
      expect(findEnvelopeViolations(event)).toEqual([])
      expect(event.schemaVersion).toBe(CONTRACT_SCHEMA_VERSION)
      expect(event.source).toBe(EVENT_STREAM_SOURCE)
      expect(event.runId).toBe(IDENTITY.runId)
      expect(event.laneId).toBe(IDENTITY.laneId)
      expect(event.machineId).toBe(IDENTITY.machineId)
      expect(event.agent).toBe(IDENTITY.agent)
    }
    expect(events.map((event) => event.kind)).toEqual([
      'lifecycle',
      'output',
      'tool_call',
      'evidence',
      'error',
      'control',
      'annotation',
    ])
  })

  it('carries machine, lane, agent, tool name, argument summary, status and duration', async () => {
    const { stream, events } = streamWith()
    await stream.toolCall({
      name: 'Edit',
      argumentSummary: 'src/index.ts',
      status: 'succeeded',
      durationMs: 42,
    })
    const [event] = events
    expect(event?.machineId).toBe('macbook')
    expect(event?.laneId).toBe('lane_1')
    expect(event?.agent).toBe('claude-code')
    expect(event?.tool).toEqual({
      name: 'Edit',
      argumentSummary: 'src/index.ts',
      status: 'succeeded',
      durationMs: 42,
    })
  })

  it('tags output events with their channel', async () => {
    const { stream, events } = streamWith()
    await stream.output('stdout', 'to stdout\n')
    await stream.output('stderr', 'to stderr\n')
    expect(events.map((event) => [event.kind, event.channel])).toEqual([
      ['output', 'stdout'],
      ['output', 'stderr'],
    ])
  })

  it('allocates a gap-free monotonic sequence', async () => {
    const { stream, events } = streamWith()
    for (let index = 0; index < 25; index += 1) {
      await stream.output('stdout', `line ${index}\n`)
    }
    await stream.flush()
    expect(events.map((event) => event.sequence)).toEqual(
      Array.from({ length: 25 }, (_, index) => index + 1),
    )
  })

  it('resumes numbering from an explicit start sequence', async () => {
    const { stream, events } = streamWith({ startSequence: 9 })
    await stream.lifecycle('resumed')
    expect(events[0]?.sequence).toBe(9)
    expect(stream.stats().nextSequence).toBe(10)
  })

  it('redacts before the sink ever sees the event', async () => {
    const { stream, events } = streamWith()
    await stream.output('stdout', 'AWS_SECRET_ACCESS_KEY=AKIAIOSFODNN7EXAMPLE\n')
    await stream.flush()
    const persisted = JSON.stringify(events)
    expect(persisted).not.toContain('AKIAIOSFODNN7EXAMPLE')
    expect(persisted).toContain('[REDACTED]')
  })

  it('refuses to emit an event that would violate the envelope', async () => {
    const { stream } = streamWith({ startSequence: 1 })
    await expect(
      stream.lifecycle('illegal', { fromState: 'done', toState: 'running' }),
    ).rejects.toThrow(/not legal/)
  })
})

describe('backpressure', () => {
  it('sheds only output events once the budget is reached, and says so', async () => {
    const { stream, events } = streamWith({ outputBudget: 10 })
    for (let index = 0; index < 100; index += 1) {
      await stream.output('stdout', `noisy line ${index}\n`)
    }
    await stream.lifecycle('Run succeeded', { toState: 'done' })
    await stream.flush()

    const outputs = events.filter((event) => event.kind === 'output')
    expect(outputs).toHaveLength(10)
    expect(stream.stats().droppedOutput).toBe(90)

    const annotations = events.filter((event) => event.kind === 'annotation')
    expect(annotations).toHaveLength(1)
    expect(annotations[0]?.message).toContain('90 output event(s) shed')

    // The lifecycle event survived the shed — that is the whole point.
    expect(events.some((event) => event.kind === 'lifecycle')).toBe(true)
  })

  it('never drops lifecycle, control, tool_call, evidence or error events', async () => {
    const { stream, events } = streamWith({ outputBudget: 0 })
    for (let index = 0; index < 50; index += 1) {
      await stream.output('stdout', `dropped ${index}\n`)
    }
    await stream.control('pause requested')
    await stream.toolCall({ name: 'Read', argumentSummary: 'a.ts', status: 'started' })
    await stream.error('boom')
    await stream.evidence('pr #1')
    await stream.flush()

    expect(events.filter((event) => event.kind === 'output')).toHaveLength(0)
    expect(events.filter((event) => event.kind === 'control')).toHaveLength(1)
    expect(events.filter((event) => event.kind === 'tool_call')).toHaveLength(1)
    expect(events.filter((event) => event.kind === 'error')).toHaveLength(1)
    expect(events.filter((event) => event.kind === 'evidence')).toHaveLength(1)
  })

  it('keeps the sequence gap-free even after shedding', async () => {
    const { stream, events } = streamWith({ outputBudget: 3 })
    for (let index = 0; index < 20; index += 1) {
      await stream.output('stdout', `line ${index}\n`)
    }
    await stream.flush()
    expect(events.map((event) => event.sequence)).toEqual(
      Array.from({ length: events.length }, (_, index) => index + 1),
    )
  })

  it('absorbs a 10,000-event run within a bounded budget and a sane time', async () => {
    const { stream, events } = streamWith({ outputBudget: 1_000 })
    const started = Date.now()
    let payload = ''
    for (let index = 0; index < 10_000; index += 1) {
      payload += `event ${index} with some realistic width of console output\n`
    }
    await stream.output('stdout', payload)
    await stream.flush()
    const elapsed = Date.now() - started

    expect(stream.stats().droppedOutput).toBe(9_000)
    expect(events.filter((event) => event.kind === 'output')).toHaveLength(1_000)
    // Bounded memory: the consumer holds the budget, not the run.
    expect(events.length).toBeLessThanOrEqual(1_001)
    expect(elapsed).toBeLessThan(10_000)
  })

  it('bounds every emitted message below the contract ceiling', async () => {
    const { stream, events } = streamWith()
    await stream.output('stdout', `${'w'.repeat(MAX_LINE_BYTES * 2)}\n`)
    await stream.flush()
    for (const event of events) {
      expect(findEnvelopeViolations(event)).toEqual([])
    }
  })
})

describe('cursor replay', () => {
  async function runWithEvents(count: number) {
    const { stream, events } = streamWith()
    await stream.lifecycle('Run started', { toState: 'running' })
    for (let index = 0; index < count; index += 1) {
      await stream.output('stdout', `line ${index}\n`)
    }
    await stream.flush()
    return events
  }

  it('returns everything after a cursor, in order', async () => {
    const events = await runWithEvents(10)
    const page = readEventsAfter(events, IDENTITY.runId, 4)
    expect(page.events.map((event) => event.sequence)).toEqual([5, 6, 7, 8, 9, 10, 11])
    expect(page.cursor).toBe(11)
    expect(page.hasMore).toBe(false)
  })

  it('reports a client that is already current without inventing a cursor', async () => {
    const events = await runWithEvents(3)
    const latest = events[events.length - 1]!.sequence
    const page = readEventsAfter(events, IDENTITY.runId, latest)
    expect(page.events).toEqual([])
    expect(page.cursor).toBe(latest)
    expect(page.hasMore).toBe(false)
  })

  it('pages a large backlog and signals more remains', async () => {
    const events = await runWithEvents(50)
    const first = readEventsAfter(events, IDENTITY.runId, 0, 20)
    expect(first.events).toHaveLength(20)
    expect(first.hasMore).toBe(true)
    const second = readEventsAfter(events, IDENTITY.runId, first.cursor, 20)
    expect(second.events[0]?.sequence).toBe(21)
  })

  it('reconnecting from the last rendered sequence loses nothing and duplicates nothing', async () => {
    const events = await runWithEvents(30)
    // Client renders the first page, then the socket drops.
    const rendered = readEventsAfter(events, IDENTITY.runId, 0, 12)
    // Six more events land while the client is away.
    const resumed = readEventsAfter(events, IDENTITY.runId, rendered.cursor)
    const seen = [...rendered.events, ...resumed.events].map((event) => event.sequence)
    expect(seen).toEqual(events.map((event) => event.sequence))
    expect(new Set(seen).size).toBe(seen.length)
  })

  it('does not bleed events from another run', async () => {
    const events = await runWithEvents(5)
    expect(readEventsAfter(events, 'run_other', 0).events).toEqual([])
  })
})

describe('ledger parsing', () => {
  it('round-trips a persisted JSONL ledger', async () => {
    const { stream, events } = streamWith()
    await stream.lifecycle('Run started', { toState: 'running' })
    await stream.output('stdout', 'hello\n')
    await stream.flush()
    const raw = events.map((event) => JSON.stringify(event)).join('\n')
    expect(parseEventLedger(raw)).toEqual(events)
  })

  it('tolerates blank lines and a trailing newline', async () => {
    const { stream, events } = streamWith()
    await stream.lifecycle('Run started')
    const raw = `${events.map((event) => JSON.stringify(event)).join('\n')}\n\n`
    expect(parseEventLedger(raw)).toHaveLength(1)
  })

  it('refuses a malformed line rather than silently shortening the replay', () => {
    expect(() => parseEventLedger('{not json')).toThrow(/line 1 is not valid JSON/)
  })

  it('refuses a well-formed line that is not a conforming event', () => {
    expect(() => parseEventLedger(JSON.stringify({ runId: 'r', sequence: 1 }))).toThrow(
      /not a conforming control-plane event/,
    )
  })

  it('rejects an event missing its lane identity', () => {
    expect(
      isLaneStreamEvent({
        schemaVersion: CONTRACT_SCHEMA_VERSION,
        source: EVENT_STREAM_SOURCE,
        occurredAt: '2026-01-01T00:00:00.000Z',
        sequence: 1,
        runId: 'run_1',
        kind: 'lifecycle',
        message: 'x',
      }),
    ).toBe(false)
  })
})
