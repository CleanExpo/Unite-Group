/**
 * Lane event stream — UNI-2406.
 *
 * Turns a lane run from a final-only `lastOutput` string into an append-only,
 * resumable, redacted event stream that conforms to the `control-plane/v1`
 * envelope declared in `contracts/control-plane/v1.ts` (UNI-2403).
 *
 * This file adds NO second state machine and NO second queue. It is a producer:
 * it allocates sequence numbers for one run, redacts before anything is
 * persisted, and appends to the same JSONL ledger the orchestrator already
 * owns. Ordering and lifecycle remain the orchestrator's.
 *
 * Three properties the tests hold it to, because each is a way this class of
 * code silently leaks or lies:
 *
 *  1. Redaction happens BEFORE persistence, and survives chunk boundaries. A
 *     secret split across two `stdout` chunks is the failure mode a naive
 *     per-chunk `sanitise()` misses entirely, so the splitter holds back a tail
 *     window and never emits a partial line without carrying its remainder
 *     forward.
 *  2. Sequences are gap-free. A consumer resuming from a cursor must be able to
 *     tell "nothing since N" from "I missed something", so dropped events never
 *     consume a sequence number — the drop is reported in-band instead.
 *  3. Backpressure drops are ACCOUNTED, never silent. Under load the stream
 *     sheds `output` events only, and emits one `annotation` recording exactly
 *     how many were shed. Lifecycle, control, tool_call, evidence and error
 *     events are never dropped.
 */
import {
  CONTRACT_SCHEMA_VERSION,
  findEnvelopeViolations,
  MAX_EVENT_MESSAGE_LENGTH,
} from '../../../../../contracts/control-plane/v1'
import { sanitiseLaneOutput, truncateUtf8 } from './adapter'
import type { RunEventEnvelope, RunEventKind, RunState } from '../../../../../contracts/control-plane/v1'

/** Producing surface, recorded on every event this module emits. */
export const EVENT_STREAM_SOURCE = 'apps/workspace:lanes/event-stream'

/**
 * Bytes of already-buffered text carried forward when a line is force-flushed
 * without its newline. A secret token cannot contain a newline, so line
 * splitting alone closes the boundary hole for every token shape in
 * `sanitiseLaneOutput` — except when a single line grows past the flush limit
 * and must be cut mid-token. Carrying the tail forward closes that case too.
 * 256 comfortably exceeds the longest token any deny-list pattern matches.
 */
export const SECRET_CARRY_BYTES = 256

/** A single output line is flushed at this size even without a newline. */
export const MAX_LINE_BYTES = 8 * 1024

/** Per-event message ceiling. The contract rejects anything longer. */
export const MAX_STREAM_MESSAGE_LENGTH = MAX_EVENT_MESSAGE_LENGTH

/** Default ceiling on `output` events buffered before shedding begins. */
export const DEFAULT_OUTPUT_BUDGET = 2_000

export type OutputChannel = 'stdout' | 'stderr'

/** A tool invocation surfaced to Mission Control. Arguments are summarised, never raw. */
export interface LaneToolCall {
  name: string
  /** Redacted, bounded, human-readable summary. Never the raw argument payload. */
  argumentSummary: string
  status: 'started' | 'succeeded' | 'failed'
  /** Wall-clock duration, present once the call settles. */
  durationMs?: number
}

/**
 * The lane-scoped event. Extends the canonical envelope with the identity
 * Mission Control renders: which machine, which lane, which agent.
 */
export interface LaneStreamEvent extends RunEventEnvelope {
  laneId: string
  machineId: string
  /** The CLI tool or gateway provider driving this run, e.g. `claude-code`. */
  agent: string
  /** Present only on `kind: 'output'`. */
  channel?: OutputChannel
  /** Present only on `kind: 'tool_call'`. */
  tool?: LaneToolCall
}

export interface LaneStreamIdentity {
  runId: string
  laneId: string
  machineId: string
  agent: string
}

export interface LaneEventStreamOptions {
  identity: LaneStreamIdentity
  /** Sink for accepted events. May be async; rejections surface to `flush()`. */
  sink: (event: LaneStreamEvent) => void | Promise<void>
  /** Wall clock, injectable so duration assertions are deterministic. */
  now?: () => number
  /**
   * How many `output` events may be emitted before shedding starts. Shedding
   * protects the consumer from a runaway process; it never drops a lifecycle,
   * control, tool_call, evidence or error event.
   */
  outputBudget?: number
  /** First sequence number this stream may allocate. Defaults to 1. */
  startSequence?: number
}

/**
 * Split a byte stream into redacted lines.
 *
 * `push` returns the lines that are safe to emit now; `flush` returns whatever
 * remains. Both return already-redacted strings — no caller ever sees raw text,
 * which is what makes "redacted before persistence" structural rather than a
 * convention someone can forget.
 */
export interface RedactingSplitter {
  push: (chunk: string) => string[]
  flush: () => string[]
}

const PEM_BEGIN = /-----BEGIN(?: [A-Z0-9]+)? PRIVATE KEY-----/i
const PEM_END = /-----END(?: [A-Z0-9]+)? PRIVATE KEY-----/i

/**
 * A PEM private key is the one secret shape that legitimately spans newlines,
 * so line-wise redaction alone would emit its body a line at a time. Once a
 * BEGIN marker is seen the splitter suppresses every line until END, emitting a
 * single placeholder. Everything else is a newline-free token and is fully
 * handled by redacting each complete line.
 */
export function createRedactingSplitter(
  maxLineBytes: number = MAX_LINE_BYTES,
  carryBytes: number = SECRET_CARRY_BYTES,
): RedactingSplitter {
  let buffer = ''
  let suppressingPem = false

  function redactLine(line: string): string | null {
    if (suppressingPem) {
      if (PEM_END.test(line)) suppressingPem = false
      return null
    }
    if (PEM_BEGIN.test(line)) {
      suppressingPem = !PEM_END.test(line)
      return '[REDACTED]'
    }
    return sanitiseLaneOutput(line, MAX_STREAM_MESSAGE_LENGTH)
  }

  function drainCompleteLines(out: string[]): void {
    let newline = buffer.indexOf('\n')
    while (newline !== -1) {
      const line = buffer.slice(0, newline).replace(/\r$/, '')
      buffer = buffer.slice(newline + 1)
      const redacted = redactLine(line)
      if (redacted !== null && redacted !== '') out.push(redacted)
      newline = buffer.indexOf('\n')
    }
  }

  return {
    push(chunk: string): string[] {
      const out: string[] = []
      buffer += chunk
      drainCompleteLines(out)

      // No newline in sight and the line has outgrown the flush limit. Cut it,
      // but carry the tail forward: the cut could otherwise land mid-token and
      // hand both halves to the deny-list as harmless fragments.
      while (Buffer.byteLength(buffer, 'utf8') > maxLineBytes) {
        const keep = truncateUtf8(buffer, maxLineBytes, '')
        const carry = keep.slice(Math.max(0, keep.length - carryBytes))
        const emitted = keep.slice(0, keep.length - carry.length)
        buffer = `${carry}${buffer.slice(keep.length)}`
        if (emitted === '') break
        const redacted = redactLine(emitted)
        if (redacted !== null && redacted !== '') out.push(redacted)
      }
      return out
    },

    flush(): string[] {
      const out: string[] = []
      drainCompleteLines(out)
      if (buffer !== '') {
        const redacted = redactLine(buffer)
        if (redacted !== null && redacted !== '') out.push(redacted)
        buffer = ''
      }
      // An unterminated PEM block must not leave the splitter armed for a
      // later, unrelated stream on a reused instance.
      suppressingPem = false
      return out
    },
  }
}

/** Redact and bound a tool's arguments into something safe to render. */
export function summariseToolArguments(
  args: unknown,
  limit = 200,
): string {
  let raw: string
  if (args === undefined || args === null) raw = ''
  else if (typeof args === 'string') raw = args
  else {
    try {
      raw = JSON.stringify(args) ?? ''
    } catch {
      raw = '[unserialisable arguments]'
    }
  }
  if (raw === '') return ''
  return sanitiseLaneOutput(raw, limit)
}

export interface StreamStats {
  /** Events handed to the sink. */
  emitted: number
  /** `output` events shed under backpressure. Reported in-band as well. */
  droppedOutput: number
  /** Next sequence this stream would allocate. */
  nextSequence: number
}

export interface LaneEventStream {
  lifecycle: (
    message: string,
    states?: { fromState?: RunState; toState?: RunState },
  ) => Promise<void>
  control: (message: string) => Promise<void>
  error: (message: string) => Promise<void>
  evidence: (message: string) => Promise<void>
  annotation: (message: string) => Promise<void>
  /** Feed raw process output. Redaction and splitting happen inside. */
  output: (channel: OutputChannel, chunk: string) => Promise<void>
  /**
   * Fire-and-forget ingestion for a synchronous producer — a child process
   * `data` handler cannot await. Chunks are processed strictly in arrival order
   * on one internal chain, so a slow sink can never interleave two chunks and
   * reorder a run's output. Errors surface from `settle()`.
   */
  write: (channel: OutputChannel, chunk: string) => void
  /**
   * Fire-and-forget tool event, queued on the SAME chain as `write` so a tool
   * event can never overtake the output that produced it.
   */
  writeToolCall: (call: LaneToolCall) => void
  /** Await every queued `write`, then flush. Rethrows the first queued error. */
  settle: () => Promise<void>
  toolCall: (call: LaneToolCall) => Promise<void>
  /**
   * Drain buffered partial output and report any shed events. Safe to call
   * more than once; the drop annotation is emitted at most once per shed batch.
   */
  flush: () => Promise<void>
  stats: () => StreamStats
}

/**
 * Create the event producer for one run.
 *
 * Sequence numbers are allocated only for events that are actually emitted, so
 * a consumer resuming from a cursor sees a gap-free run. That is deliberate:
 * with gaps, "no events since N" and "I lost events after N" are
 * indistinguishable, and the reconnect guarantee this ticket exists to provide
 * would be unprovable.
 */
export function createLaneEventStream(
  options: LaneEventStreamOptions,
): LaneEventStream {
  const { identity, sink } = options
  const now = options.now ?? (() => Date.now())
  const outputBudget = options.outputBudget ?? DEFAULT_OUTPUT_BUDGET
  let sequence = Math.max(1, Math.trunc(options.startSequence ?? 1))
  let emitted = 0
  let outputEmitted = 0
  let droppedOutput = 0
  let droppedSinceReport = 0

  const splitters: Record<OutputChannel, RedactingSplitter> = {
    stdout: createRedactingSplitter(),
    stderr: createRedactingSplitter(),
  }

  // Single serialisation point for the fire-and-forget `write` path. Without
  // it, two `data` handlers firing in the same tick would race the splitter and
  // interleave their lines, reordering a run's output for every reader.
  let chain: Promise<void> = Promise.resolve()
  let queuedError: unknown

  async function emit(
    kind: RunEventKind,
    message: string,
    extra: Partial<LaneStreamEvent> = {},
  ): Promise<void> {
    const event: LaneStreamEvent = {
      schemaVersion: CONTRACT_SCHEMA_VERSION,
      source: EVENT_STREAM_SOURCE,
      occurredAt: new Date(now()).toISOString(),
      sequence,
      runId: identity.runId,
      kind,
      message: truncateUtf8(message, MAX_STREAM_MESSAGE_LENGTH, ''),
      laneId: identity.laneId,
      machineId: identity.machineId,
      agent: identity.agent,
      ...extra,
    }
    const violations = findEnvelopeViolations(event)
    if (violations.length > 0) {
      // Refusing here is the point: a malformed event must never reach the
      // ledger, because the ledger is what replay and attribution rest on.
      throw new Error(
        `Refusing to emit a non-conforming control-plane event: ${violations.join('; ')}`,
      )
    }
    sequence += 1
    emitted += 1
    await sink(event)
  }

  /** Report shed output in-band, so a quiet stream is never mistaken for a complete one. */
  async function reportDrops(): Promise<void> {
    if (droppedSinceReport === 0) return
    const shed = droppedSinceReport
    droppedSinceReport = 0
    await emit(
      'annotation',
      `${shed} output event(s) shed under backpressure after the ${outputBudget}-event budget was reached; lifecycle, control, tool and error events were not shed`,
    )
  }

  /** Emit already-split lines, shedding beyond the budget rather than growing. */
  async function emitLines(channel: OutputChannel, lines: string[]): Promise<void> {
    for (const line of lines) {
      if (outputEmitted >= outputBudget) {
        droppedOutput += 1
        droppedSinceReport += 1
        continue
      }
      outputEmitted += 1
      await emit('output', line, { channel })
    }
  }

  async function pushOutput(
    channel: OutputChannel,
    chunk: string,
  ): Promise<void> {
    await emitLines(channel, splitters[channel].push(chunk))
  }

  async function flushAll(): Promise<void> {
    for (const channel of ['stdout', 'stderr'] as const) {
      await emitLines(channel, splitters[channel].flush())
    }
    await reportDrops()
  }

  return {
    async lifecycle(message, states = {}) {
      await reportDrops()
      await emit('lifecycle', message, states)
    },
    async control(message) {
      await reportDrops()
      await emit('control', message)
    },
    async error(message) {
      await reportDrops()
      await emit('error', message)
    },
    async evidence(message) {
      await reportDrops()
      await emit('evidence', message)
    },
    async annotation(message) {
      await reportDrops()
      await emit('annotation', message)
    },
    output: pushOutput,
    write(channel, chunk) {
      chain = chain.then(async () => {
        try {
          await pushOutput(channel, chunk)
        } catch (error) {
          queuedError ??= error
        }
      })
    },
    writeToolCall(call) {
      chain = chain.then(async () => {
        try {
          await reportDrops()
          await emit('tool_call', `${call.name} ${call.status}`, { tool: call })
        } catch (error) {
          queuedError ??= error
        }
      })
    },
    async settle() {
      await chain
      await flushAll()
      if (queuedError !== undefined) {
        const error = queuedError
        queuedError = undefined
        throw error
      }
    },
    async toolCall(call) {
      await reportDrops()
      await emit('tool_call', `${call.name} ${call.status}`, { tool: call })
    },
    flush: flushAll,
    stats() {
      return { emitted, droppedOutput, nextSequence: sequence }
    },
  }
}

/** Type guard for a persisted lane stream event read back off the ledger. */
export function isLaneStreamEvent(value: unknown): value is LaneStreamEvent {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }
  const e = value as Record<string, unknown>
  if (findEnvelopeViolations(e).length > 0) return false
  return (
    typeof e.laneId === 'string' &&
    e.laneId !== '' &&
    typeof e.machineId === 'string' &&
    e.machineId !== '' &&
    typeof e.agent === 'string'
  )
}

export interface CursorPage {
  events: LaneStreamEvent[]
  /** Highest sequence in this page, or the requested cursor when empty. */
  cursor: number
  /** True when the ledger holds more events beyond this page. */
  hasMore: boolean
}

/**
 * Read a run's events after `afterSequence`, in order, bounded by `limit`.
 *
 * This is the reconnect primitive: a browser that dropped resumes by handing
 * back the last sequence it rendered. Because sequences are gap-free, a client
 * that receives `cursor` back unchanged with no events knows it is current,
 * rather than guessing.
 */
export function readEventsAfter(
  events: readonly LaneStreamEvent[],
  runId: string,
  afterSequence: number,
  limit = 500,
): CursorPage {
  const ordered = events
    .filter((event) => event.runId === runId && event.sequence > afterSequence)
    .sort((left, right) => left.sequence - right.sequence)
  const page = ordered.slice(0, Math.max(0, limit))
  return {
    events: page,
    cursor: page.length > 0 ? page[page.length - 1]!.sequence : afterSequence,
    hasMore: ordered.length > page.length,
  }
}

/** Source recorded on an event upgraded from the pre-UNI-2406 ledger shape. */
export const LEGACY_EVENT_SOURCE = 'apps/workspace:lanes/lane-orchestrator(legacy)'

const LEGACY_KIND_BY_TYPE: Readonly<Record<string, RunEventKind>> = {
  lifecycle: 'lifecycle',
  control: 'control',
  error: 'error',
  stdout: 'output',
  stderr: 'output',
}

/**
 * Upgrade a pre-UNI-2406 `LaneRunEvent` to the canonical envelope, or return
 * null when the value is not one.
 *
 * A machine that ran the previous build has `events.jsonl` files full of the
 * old shape — numeric `occurredAt`, `type` instead of `kind`, no
 * `schemaVersion` or `source`. Refusing to read them would turn a deploy into
 * data loss and would break UNI-2403 acceptance 4 (existing events remain
 * backward compatible), so they are upgraded on read. The result is marked with
 * a legacy `source`, because attributing these to the streaming producer would
 * be a fabrication.
 */
export function upgradeLegacyLaneRunEvent(value: unknown): LaneStreamEvent | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  const e = value as Record<string, unknown>
  if (
    typeof e.runId !== 'string' ||
    e.runId === '' ||
    typeof e.laneId !== 'string' ||
    e.laneId === '' ||
    typeof e.sequence !== 'number' ||
    !Number.isInteger(e.sequence) ||
    e.sequence < 1 ||
    typeof e.occurredAt !== 'number' ||
    !Number.isFinite(e.occurredAt) ||
    typeof e.type !== 'string' ||
    typeof e.message !== 'string'
  ) {
    return null
  }
  const kind = LEGACY_KIND_BY_TYPE[e.type]
  if (kind === undefined) return null
  const upgraded: LaneStreamEvent = {
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    source: LEGACY_EVENT_SOURCE,
    occurredAt: new Date(e.occurredAt).toISOString(),
    sequence: e.sequence,
    runId: e.runId,
    kind,
    message: truncateUtf8(e.message, MAX_STREAM_MESSAGE_LENGTH, ''),
    laneId: e.laneId,
    // The legacy shape carried neither. An empty string fails the guard and a
    // hostname guess would be a fabrication, so both are named as unknown.
    machineId: 'unknown',
    agent: 'unknown',
    ...(kind === 'output'
      ? { channel: e.type === 'stderr' ? ('stderr' as const) : ('stdout' as const) }
      : {}),
  }
  return isLaneStreamEvent(upgraded) ? upgraded : null
}

/**
 * Parse a JSONL ledger into lane stream events, upgrading legacy records.
 *
 * A malformed line is a corrupt ledger, not a recoverable hiccup: skipping it
 * would silently shorten a replay and make the gap-free guarantee a lie, so it
 * throws with the offending line number.
 */
export function parseEventLedger(raw: string): LaneStreamEvent[] {
  const events: LaneStreamEvent[] = []
  const lines = raw.split('\n')
  for (let index = 0; index < lines.length; index += 1) {
    const trimmed = lines[index]!.trim()
    if (trimmed === '') continue
    let parsed: unknown
    try {
      parsed = JSON.parse(trimmed)
    } catch {
      throw new Error(
        `Lane event ledger line ${index + 1} is not valid JSON`,
      )
    }
    if (isLaneStreamEvent(parsed)) {
      events.push(parsed)
      continue
    }
    const upgraded = upgradeLegacyLaneRunEvent(parsed)
    if (upgraded === null) {
      throw new Error(
        `Lane event ledger line ${index + 1} is not a conforming control-plane event`,
      )
    }
    events.push(upgraded)
  }
  return events
}
