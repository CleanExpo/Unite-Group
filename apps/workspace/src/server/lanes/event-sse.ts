/**
 * Server-sent-event framing for the lane run stream — UNI-2406.
 *
 * Reconnect rides on the SSE standard rather than a bespoke query parameter:
 * every frame carries `id: <sequence>`, so a browser that drops re-opens the
 * connection with `Last-Event-ID` set to the last sequence it actually
 * rendered, without the page having to track anything. `?cursor=` stays
 * available for a non-browser client or a deliberate replay-from-zero.
 *
 * That choice is what makes "a dropped browser reconnects without losing the
 * authoritative run state" a property of the transport instead of a promise
 * about the client, and it is only sound because sequences are gap-free (see
 * `event-stream.ts`): the client can tell "nothing since N" from "I missed
 * something".
 */
import type { LaneStreamEvent } from './event-stream'

/** Frames per poll. Bounds a single flush when a client resumes far behind. */
export const SSE_PAGE_LIMIT = 500

/** How often the ledger is re-read for new events. */
export const SSE_POLL_INTERVAL_MS = 500

/** Comment frames keep intermediaries from closing an idle connection. */
export const SSE_KEEPALIVE_MS = 15_000

/**
 * Render one event as an SSE frame.
 *
 * `id` is the sequence, which is what the browser echoes back as
 * `Last-Event-ID`. `event` is the canonical `kind`, so a client can subscribe
 * to `tool_call` without parsing every payload.
 */
export function formatSseFrame(event: LaneStreamEvent): string {
  return `id: ${event.sequence}\nevent: ${event.kind}\ndata: ${JSON.stringify(event)}\n\n`
}

/** A named frame carrying no run event — connection lifecycle, errors, keepalive. */
export function formatControlFrame(name: string, data: unknown): string {
  return `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`
}

/**
 * Resolve the sequence a client wants to resume after.
 *
 * `Last-Event-ID` wins over `?cursor=`: the header is what the browser sets
 * automatically from the last frame it actually received, so trusting a stale
 * URL over it would replay events the client already rendered. An unparseable
 * or negative value resolves to 0 — a full replay is recoverable, whereas
 * silently skipping ahead loses events with no way to notice.
 */
export function resolveCursor(request: Request): number {
  const header = request.headers.get('last-event-id')
  const fromHeader = toSequence(header)
  if (fromHeader !== null) return fromHeader

  const param = new URL(request.url).searchParams.get('cursor')
  return toSequence(param) ?? 0
}

function toSequence(value: string | null): number | null {
  if (value === null || value.trim() === '') return null
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 0) return null
  return parsed
}

/** Extract and validate the requested run id, or null when it is unusable. */
export function resolveRunId(request: Request): string | null {
  const runId = new URL(request.url).searchParams.get('runId')?.trim()
  if (!runId) return null
  // The id reaches a ledger lookup, so keep it to the shape the orchestrator
  // generates rather than trusting an arbitrary string from a query string.
  return /^[A-Za-z0-9._-]{1,128}$/.test(runId) ? runId : null
}

export interface LaneEventPumpDeps {
  runId: string
  listRunEvents: (runId: string) => Promise<LaneStreamEvent[]>
  pageLimit?: number
}

export interface PumpPage {
  frames: string[]
  cursor: number
  /** True when more events are already available beyond this page. */
  hasMore: boolean
}

/**
 * Cursor-advancing reader over the run ledger.
 *
 * Kept separate from the route so the reconnect guarantee can be tested without
 * an HTTP server: the interesting behaviour is entirely in how the cursor moves,
 * and a test that needs a socket to prove it usually proves less.
 */
export function createLaneEventPump(deps: LaneEventPumpDeps) {
  const pageLimit = deps.pageLimit ?? SSE_PAGE_LIMIT
  let cursor = 0

  return {
    seek(from: number): void {
      cursor = Math.max(0, Math.trunc(from))
    },
    get cursor(): number {
      return cursor
    },
    async poll(): Promise<PumpPage> {
      const all = await deps.listRunEvents(deps.runId)
      const pending = all
        .filter((event) => event.sequence > cursor)
        .sort((left, right) => left.sequence - right.sequence)
      const page = pending.slice(0, pageLimit)
      if (page.length > 0) cursor = page[page.length - 1]!.sequence
      return {
        frames: page.map(formatSseFrame),
        cursor,
        hasMore: pending.length > page.length,
      }
    },
  }
}
