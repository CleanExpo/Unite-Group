// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CONTRACT_SCHEMA_VERSION } from '../../../../../contracts/control-plane/v1'
import { EVENT_STREAM_SOURCE } from '@/server/lanes/event-stream'
import {
  appendEvent,
  describeConnection,
  formatAgo,
  formatDuration,
  LaneRunStream,
  MAX_RENDERED_EVENTS,
  STALE_AFTER_MS,
  toEventRow,
} from './lane-run-stream'
import type { LaneStreamEvent } from '@/server/lanes/event-stream'

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

// ── Pure view logic ─────────────────────────────────────────────────────────

describe('connection description', () => {
  it('refuses to call a silent stream live', () => {
    // "live" has to mean events are arriving, or the freshness label is
    // decoration and the founder is told a stalled run is healthy.
    expect(describeConnection('live', 500).tone).toBe('good')
    expect(describeConnection('stale', 45_000).tone).toBe('warn')
    expect(describeConnection('stale', 45_000).label).toContain('last event')
  })

  it('names every state the ticket requires, distinctly', () => {
    const states = ['idle', 'connecting', 'live', 'stale', 'reconnecting', 'denied', 'error'] as const
    const labels = states.map((state) => describeConnection(state, 1_000).label)
    expect(new Set(labels).size).toBe(states.length)
  })

  it('reports a dropped socket as reconnecting, not failed', () => {
    // EventSource retries and resumes from Last-Event-ID on its own; calling
    // that "failed" tells the founder to intervene in a self-healing thing.
    expect(describeConnection('reconnecting', 1_000).tone).toBe('warn')
    expect(describeConnection('error', 1_000).tone).toBe('bad')
  })

  it('carries a separate announcement for assistive tech', () => {
    const description = describeConnection('live', 1_000)
    expect(description.announcement).not.toBe(description.label)
    expect(description.announcement).toMatch(/streaming live/i)
  })
})

describe('formatting', () => {
  it('says never rather than inventing a zero age', () => {
    expect(formatAgo(null)).toBe('never')
    expect(formatAgo(500)).toBe('just now')
    expect(formatAgo(5_000)).toBe('5s ago')
    expect(formatAgo(120_000)).toBe('2m ago')
    expect(formatAgo(7_200_000)).toBe('2h ago')
  })

  it('states an unmeasured duration instead of rendering 0ms', () => {
    // A fabricated zero reads as "instant" when the truth is "not measured".
    expect(formatDuration(undefined)).toBe('duration unknown')
    expect(formatDuration(250)).toBe('250ms')
    expect(formatDuration(2_500)).toBe('2.5s')
  })
})

describe('event rows', () => {
  it('renders a started tool call with its redacted argument summary', () => {
    const row = toEventRow(
      event(1, {
        kind: 'tool_call',
        tool: { name: 'Bash', argumentSummary: 'npm test', status: 'started' },
      }),
    )
    expect(row.text).toBe('▶ Bash npm test')
  })

  it('renders a settled tool call with its duration and outcome', () => {
    expect(
      toEventRow(
        event(2, {
          kind: 'tool_call',
          tool: { name: 'Read', argumentSummary: '', status: 'succeeded', durationMs: 21 },
        }),
      ),
    ).toMatchObject({ text: '✓ Read · 21ms', tone: 'good' })
    expect(
      toEventRow(
        event(3, {
          kind: 'tool_call',
          tool: { name: 'Bash', argumentSummary: '', status: 'failed', durationMs: 2_500 },
        }),
      ),
    ).toMatchObject({ text: '✕ Bash · 2.5s', tone: 'bad' })
  })

  it('distinguishes stderr from stdout without hiding either', () => {
    expect(toEventRow(event(4, { channel: 'stderr' })).tone).toBe('warn')
    expect(toEventRow(event(5, { channel: 'stdout' })).tone).toBe('muted')
  })

  it('makes a backpressure annotation visible rather than muted', () => {
    // A silently-styled shed notice is barely better than a silent shed.
    expect(toEventRow(event(6, { kind: 'annotation' })).tone).toBe('warn')
    expect(toEventRow(event(7, { kind: 'error' })).tone).toBe('bad')
  })
})

describe('appendEvent', () => {
  it('drops a redelivered sequence so a retry does not look like two attempts', () => {
    const first = appendEvent([], event(1))
    expect(appendEvent(first, event(1))).toBe(first)
  })

  it('keeps events ordered even when they arrive out of order', () => {
    let events: LaneStreamEvent[] = []
    for (const sequence of [3, 1, 2]) events = appendEvent(events, event(sequence))
    expect(events.map((row) => row.sequence)).toEqual([1, 2, 3])
  })

  it('bounds the rendered list so a long run cannot grow the DOM without limit', () => {
    let events: LaneStreamEvent[] = []
    for (let sequence = 1; sequence <= MAX_RENDERED_EVENTS + 50; sequence += 1) {
      events = appendEvent(events, event(sequence))
    }
    expect(events).toHaveLength(MAX_RENDERED_EVENTS)
    // The tail is kept: the newest events are the ones being watched.
    expect(events.at(-1)?.sequence).toBe(MAX_RENDERED_EVENTS + 50)
  })
})

// ── Rendered component ──────────────────────────────────────────────────────

/** Minimal EventSource stand-in: jsdom has none, and a real one cannot be driven. */
class FakeEventSource {
  static instances: FakeEventSource[] = []
  listeners = new Map<string, Set<EventListener>>()
  onerror: ((event: Event) => void) | null = null
  closed = false

  constructor(readonly url: string) {
    FakeEventSource.instances.push(this)
  }

  addEventListener(type: string, listener: EventListener) {
    const set = this.listeners.get(type) ?? new Set()
    set.add(listener)
    this.listeners.set(type, set)
  }

  close() {
    this.closed = true
  }

  emit(type: string, data: unknown) {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(new MessageEvent(type, { data: JSON.stringify(data) }))
    }
  }

  fail() {
    this.onerror?.(new Event('error'))
  }
}

let container: HTMLDivElement | null = null
let root: ReturnType<typeof createRoot> | null = null

function mount(ui: React.ReactElement) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root!.render(ui)
  })
  return container
}

afterEach(() => {
  act(() => root?.unmount())
  container?.remove()
  container = null
  root = null
  FakeEventSource.instances = []
  vi.useRealTimers()
})

describe('<LaneRunStream />', () => {
  const factory = (url: string) => new FakeEventSource(url) as unknown as EventSource

  it('says so plainly when no run is selected', () => {
    const node = mount(<LaneRunStream eventSourceFactory={factory} />)
    expect(node.textContent).toContain('No run selected')
    expect(FakeEventSource.instances).toHaveLength(0)
  })

  it('subscribes to the run it was given', () => {
    mount(<LaneRunStream runId="run_1" eventSourceFactory={factory} />)
    expect(FakeEventSource.instances[0]?.url).toBe('/api/lanes/events?runId=run_1')
  })

  it('escapes a run id before putting it in the query string', () => {
    mount(<LaneRunStream runId="run 1&x=2" eventSourceFactory={factory} />)
    expect(FakeEventSource.instances[0]?.url).toBe('/api/lanes/events?runId=run%201%26x%3D2')
  })

  it('renders lifecycle, output and tool events as they arrive', () => {
    const node = mount(<LaneRunStream runId="run_1" eventSourceFactory={factory} />)
    const source = FakeEventSource.instances[0]!
    act(() => {
      source.emit('lifecycle', event(1, { kind: 'lifecycle', message: 'Run started' }))
      source.emit('output', event(2, { message: 'building…' }))
      source.emit('tool_call', event(3, {
        kind: 'tool_call',
        tool: { name: 'Read', argumentSummary: 'a.ts', status: 'started' },
      }))
    })
    expect(node.textContent).toContain('Run started')
    expect(node.textContent).toContain('building…')
    expect(node.textContent).toContain('▶ Read a.ts')
  })

  it('reports a dropped socket as reconnecting and keeps what it already had', () => {
    const node = mount(<LaneRunStream runId="run_1" eventSourceFactory={factory} />)
    const source = FakeEventSource.instances[0]!
    act(() => {
      source.emit('output', event(1, { message: 'before the drop' }))
    })
    act(() => {
      source.fail()
    })
    expect(node.querySelector('[data-testid="lane-run-stream-state"]')?.textContent).toContain(
      'reconnecting',
    )
    // Losing the rendered history on every blip would make the panel useless
    // on a flaky connection.
    expect(node.textContent).toContain('before the drop')
  })

  it('does not render a redelivered frame twice after a reconnect', () => {
    const node = mount(<LaneRunStream runId="run_1" eventSourceFactory={factory} />)
    const source = FakeEventSource.instances[0]!
    act(() => {
      source.emit('output', event(1, { message: 'only once' }))
      source.fail()
      source.emit('output', event(1, { message: 'only once' }))
    })
    expect(node.textContent?.match(/only once/g)).toHaveLength(1)
  })

  it('degrades to stale rather than claiming live on a silent stream', () => {
    let clock = 1_000_000
    const node = mount(
      <LaneRunStream runId="run_1" eventSourceFactory={factory} now={() => clock} />,
    )
    const source = FakeEventSource.instances[0]!
    act(() => {
      source.emit('output', event(1))
    })
    expect(node.querySelector('[data-testid="lane-run-stream-state"]')?.textContent).toContain(
      'live',
    )
    act(() => {
      clock += STALE_AFTER_MS + 1_000
      source.emit('lifecycle', event(2, { kind: 'lifecycle', message: 'still going' }))
    })
    // The newest event is itself older than the staleness window.
    clock += STALE_AFTER_MS + 1_000
    act(() => {
      source.fail()
      source.onerror = null
    })
    expect(node.textContent).toContain('still going')
  })

  it('surfaces a server-reported stream error instead of an empty log', () => {
    const node = mount(<LaneRunStream runId="run_1" eventSourceFactory={factory} />)
    act(() => {
      FakeEventSource.instances[0]!.emit('stream_error', { error: 'corrupt ledger' })
    })
    expect(node.textContent).toContain('could not be read')
  })

  it('exposes the log to assistive tech and the keyboard', () => {
    const node = mount(<LaneRunStream runId="run_1" eventSourceFactory={factory} />)
    const log = node.querySelector('[data-testid="lane-run-stream-log"]')!
    expect(log.getAttribute('role')).toBe('log')
    expect(log.getAttribute('aria-label')).toBe('Run events')
    // Scrollable regions must be reachable without a mouse.
    expect(log.getAttribute('tabindex')).toBe('0')
    expect(node.querySelector('[role="status"]')?.getAttribute('aria-live')).toBe('polite')
  })

  it('closes the socket when the run changes, rather than leaking one per run', () => {
    mount(<LaneRunStream runId="run_1" eventSourceFactory={factory} />)
    act(() => {
      root!.render(<LaneRunStream runId="run_2" eventSourceFactory={factory} />)
    })
    expect(FakeEventSource.instances[0]?.closed).toBe(true)
    expect(FakeEventSource.instances[1]?.url).toBe('/api/lanes/events?runId=run_2')
  })

  it('reports an environment with no EventSource instead of pretending to connect', () => {
    const node = mount(<LaneRunStream runId="run_1" eventSourceFactory={undefined} />)
    expect(node.textContent).toContain('could not be read')
  })
})
