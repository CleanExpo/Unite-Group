/**
 * Live lane run stream — UNI-2406 / UNI-2412.
 *
 * Replaces the final-only `lastOutput` block on a lane card with the run as it
 * happens: lifecycle, redacted output, tool calls with duration, and errors.
 *
 * Two rules from UNI-2412 shape this component more than anything else:
 *
 *  - "Never present seed, cached or estimated data as live without a source and
 *    freshness label." So the header always states the connection state and how
 *    long ago the last event arrived, and says `stale` rather than pretending.
 *  - "Include loading, empty, stale, degraded, disconnected and permission-
 *    denied states." Each is a distinct, named state here, not an empty div.
 *
 * The browser's own EventSource carries the cursor: every frame the server
 * sends has `id: <sequence>`, so a reconnect resumes from the last frame
 * rendered without this component tracking anything. `eventSourceFactory` is
 * injectable because jsdom has no EventSource — and because a reconnect test
 * that cannot control the socket proves nothing.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import type { LaneStreamEvent } from '@/server/lanes/event-stream'

/** Beyond this, a connection that reports "live" is no longer telling the truth. */
export const STALE_AFTER_MS = 30_000

/** Rendered events are capped so a long run cannot grow the DOM without bound. */
export const MAX_RENDERED_EVENTS = 500

export type ConnectionState =
  | 'idle'
  | 'connecting'
  | 'live'
  | 'stale'
  | 'reconnecting'
  | 'denied'
  | 'error'

export interface ConnectionDescription {
  label: string
  /** Distinct from `label`: read out to assistive tech on change. */
  announcement: string
  tone: 'neutral' | 'good' | 'warn' | 'bad'
}

/**
 * Describe the connection in words a founder can act on.
 *
 * `live` is only claimed when an event actually arrived recently. A stream that
 * is technically connected but silent for a minute is reported as stale, not
 * live — the whole point of the freshness label is that "live" cannot be a
 * decoration.
 */
export function describeConnection(
  state: ConnectionState,
  lastEventAgoMs: number | null,
): ConnectionDescription {
  switch (state) {
    case 'idle':
      return { label: 'no run selected', announcement: 'No run selected', tone: 'neutral' }
    case 'connecting':
      return { label: 'connecting…', announcement: 'Connecting to the run stream', tone: 'neutral' }
    case 'denied':
      return {
        label: 'permission denied',
        announcement: 'Permission denied for the run stream',
        tone: 'bad',
      }
    case 'error':
      return {
        label: 'stream error',
        announcement: 'The run stream reported an error',
        tone: 'bad',
      }
    case 'reconnecting':
      return {
        label: 'reconnecting…',
        announcement: 'Reconnecting to the run stream',
        tone: 'warn',
      }
    case 'stale':
      return {
        label: `stale · last event ${formatAgo(lastEventAgoMs)}`,
        announcement: 'The run stream has gone quiet',
        tone: 'warn',
      }
    case 'live':
      return {
        label:
          lastEventAgoMs === null
            ? 'live'
            : `live · last event ${formatAgo(lastEventAgoMs)}`,
        announcement: 'Streaming live',
        tone: 'good',
      }
  }
}

export function formatAgo(ms: number | null): string {
  if (ms === null) return 'never'
  if (ms < 1_000) return 'just now'
  const seconds = Math.floor(ms / 1_000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  return `${Math.floor(minutes / 60)}h ago`
}

export function formatDuration(ms: number | undefined): string {
  // Absent duration is stated, never rendered as 0ms — a fabricated zero reads
  // as "instant" when the truth is "not measured".
  if (ms === undefined) return 'duration unknown'
  if (ms < 1_000) return `${ms}ms`
  return `${(ms / 1_000).toFixed(1)}s`
}

/** One rendered row: what the event says, and how it should look. */
export interface EventRow {
  key: string
  kind: LaneStreamEvent['kind']
  text: string
  tone: 'neutral' | 'muted' | 'good' | 'warn' | 'bad'
}

export function toEventRow(event: LaneStreamEvent): EventRow {
  const key = `${event.runId}:${event.sequence}`
  if (event.kind === 'tool_call' && event.tool) {
    const { name, status, argumentSummary, durationMs } = event.tool
    const detail = argumentSummary === '' ? '' : ` ${argumentSummary}`
    return {
      key,
      kind: event.kind,
      text:
        status === 'started'
          ? `▶ ${name}${detail}`
          : `${status === 'succeeded' ? '✓' : '✕'} ${name} · ${formatDuration(durationMs)}`,
      tone: status === 'failed' ? 'bad' : status === 'succeeded' ? 'good' : 'neutral',
    }
  }
  const tone: EventRow['tone'] =
    event.kind === 'error'
      ? 'bad'
      : event.kind === 'lifecycle'
        ? 'good'
        : event.kind === 'annotation' || event.kind === 'control'
          ? 'warn'
          : event.channel === 'stderr'
            ? 'warn'
            : 'muted'
  return { key, kind: event.kind, text: event.message, tone }
}

const TONE_CLASS: Record<EventRow['tone'], string> = {
  neutral: 'text-neutral-300',
  muted: 'text-neutral-400',
  good: 'text-emerald-400',
  warn: 'text-amber-400',
  bad: 'text-red-400',
}

const STATE_CLASS: Record<ConnectionDescription['tone'], string> = {
  neutral: 'text-neutral-400',
  good: 'text-emerald-400',
  warn: 'text-amber-400',
  bad: 'text-red-400',
}

export type EventSourceFactory = (url: string) => EventSource

export interface LaneRunStreamProps {
  runId?: string
  /** Injectable for tests; defaults to the browser's EventSource. */
  eventSourceFactory?: EventSourceFactory
  /** Injectable clock so freshness assertions are deterministic. */
  now?: () => number
}

/**
 * Append an event, keeping the list ordered, deduplicated and bounded.
 *
 * Dedup matters because a reconnect can legitimately redeliver the frame the
 * client was mid-render on; showing it twice would make a retrying tool look
 * like two attempts.
 */
export function appendEvent(
  events: LaneStreamEvent[],
  next: LaneStreamEvent,
  max = MAX_RENDERED_EVENTS,
): LaneStreamEvent[] {
  if (events.some((event) => event.sequence === next.sequence)) return events
  const merged = [...events, next].sort((left, right) => left.sequence - right.sequence)
  return merged.length > max ? merged.slice(merged.length - max) : merged
}

export function LaneRunStream({
  runId,
  eventSourceFactory,
  now = () => Date.now(),
}: LaneRunStreamProps) {
  const [events, setEvents] = useState<LaneStreamEvent[]>([])
  const [state, setState] = useState<ConnectionState>('idle')
  const [lastEventAt, setLastEventAt] = useState<number | null>(null)
  const [tick, setTick] = useState(0)
  const sourceRef = useRef<EventSource | null>(null)

  // `now` and `eventSourceFactory` default to fresh closures on every render.
  // Naming them as effect dependencies would resubscribe on every render, which
  // is an infinite loop, not a subscription. Refs keep the latest value without
  // making identity a trigger.
  const nowRef = useRef(now)
  nowRef.current = now
  const factoryRef = useRef(eventSourceFactory)
  factoryRef.current = eventSourceFactory

  useEffect(() => {
    setEvents([])
    setLastEventAt(null)
    if (!runId) {
      setState('idle')
      return
    }
    const factory =
      factoryRef.current ??
      (typeof globalThis.EventSource === 'function'
        ? (url: string) => new globalThis.EventSource(url)
        : null)
    if (!factory) {
      setState('error')
      return
    }

    setState('connecting')
    const source = factory(`/api/lanes/events?runId=${encodeURIComponent(runId)}`)
    sourceRef.current = source

    const onEvent = (message: MessageEvent) => {
      try {
        const parsed = JSON.parse(message.data as string) as LaneStreamEvent
        setEvents((current) => appendEvent(current, parsed))
        setLastEventAt(nowRef.current())
        setState('live')
      } catch {
        // One unreadable frame is not a dead stream.
      }
    }

    for (const kind of [
      'lifecycle',
      'control',
      'output',
      'tool_call',
      'evidence',
      'annotation',
      'error',
    ]) {
      source.addEventListener(kind, onEvent as EventListener)
    }
    source.addEventListener('connected', () => setState('live'))
    source.addEventListener('stream_error', () => setState('error'))
    source.onerror = () => {
      // EventSource retries on its own and resumes from Last-Event-ID, so this
      // is "reconnecting", not "failed" — reporting it as failed would tell the
      // founder to intervene in something the browser is already fixing.
      setState((current) => (current === 'denied' ? current : 'reconnecting'))
    }

    return () => {
      source.close()
      sourceRef.current = null
    }
  }, [runId])

  // Freshness has to advance on its own, or a stalled stream keeps claiming the
  // age it had when the last event landed.
  useEffect(() => {
    if (state === 'idle') return
    const timer = setInterval(() => setTick((value) => value + 1), 1_000)
    return () => clearInterval(timer)
  }, [state])

  const lastEventAgoMs = lastEventAt === null ? null : nowRef.current() - lastEventAt
  const effectiveState: ConnectionState =
    state === 'live' && lastEventAgoMs !== null && lastEventAgoMs > STALE_AFTER_MS
      ? 'stale'
      : state
  const description = useMemo(
    () => describeConnection(effectiveState, lastEventAgoMs),
    // `tick` is a deliberate dependency: it is what re-derives freshness.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [effectiveState, lastEventAgoMs, tick],
  )
  const rows = useMemo(() => events.map(toEventRow), [events])

  return (
    <section
      className="mt-2 rounded border border-neutral-800 bg-neutral-950"
      aria-label="Live run stream"
    >
      <header className="flex items-center justify-between gap-2 border-b border-neutral-800 px-2 py-1">
        <h4 className="text-[10px] uppercase tracking-wide text-neutral-400">
          Run stream
        </h4>
        <span
          className={cn('text-[10px] font-mono', STATE_CLASS[description.tone])}
          data-testid="lane-run-stream-state"
        >
          {description.label}
        </span>
      </header>

      {/* Status is announced separately from the visual label so a screen
          reader hears the change without re-reading the whole log. */}
      <p className="sr-only" role="status" aria-live="polite">
        {description.announcement}
      </p>

      <div
        role="log"
        aria-label="Run events"
        tabIndex={0}
        className="max-h-40 overflow-auto p-2 font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-neutral-600"
        data-testid="lane-run-stream-log"
      >
        {rows.length === 0 ? (
          <p className="text-[11px] text-neutral-500">
            {effectiveState === 'idle'
              ? 'No run selected.'
              : effectiveState === 'connecting'
                ? 'Connecting…'
                : effectiveState === 'denied'
                  ? 'Not permitted to watch this run.'
                  : effectiveState === 'error'
                    ? 'The run stream could not be read.'
                    : 'No events yet for this run.'}
          </p>
        ) : (
          rows.map((row) => (
            <div key={row.key} className={cn('whitespace-pre-wrap', TONE_CLASS[row.tone])}>
              {row.text}
            </div>
          ))
        )}
      </div>
    </section>
  )
}
