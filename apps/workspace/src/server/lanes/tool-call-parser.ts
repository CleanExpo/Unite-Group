/**
 * Claude Code `stream-json` → canonical tool-call events — UNI-2406.
 *
 * UNI-2406 requires Mission Control to show "tool name, safe argument summary,
 * status and duration". `claude -p` in its default prose mode carries none of
 * that, so the structured shape has to come from `--output-format stream-json`.
 *
 * The shapes below were captured from a real `claude -p --output-format
 * stream-json --verbose` run on 2026-08-17, not inferred from documentation —
 * see `__fixtures__/claude-stream-json.jsonl`. A parser written against a
 * remembered format is a parser that passes its own tests and fails on the
 * first real run.
 *
 * Observed envelope (only the parts this reads):
 *   {"type":"assistant","timestamp":"…Z","message":{"content":[
 *      {"type":"tool_use","id":"toolu_…","name":"Read","input":{…}}]}}
 *   {"type":"user","timestamp":"…Z","message":{"content":[
 *      {"type":"tool_result","tool_use_id":"toolu_…","content":"…","is_error":true?}]}}
 *   {"type":"result","subtype":"success","duration_ms":…,"total_cost_usd":…}
 *
 * Everything else the CLI emits — `system/init`, `system/thinking_tokens`,
 * hook chatter, `rate_limit_event` — is deliberately ignored rather than
 * rejected: a new event type in a CLI upgrade must not break a running lane.
 */
import { summariseToolArguments } from './event-stream'
import type { LaneToolCall } from './event-stream'

/** Bytes of a single JSONL line beyond which the line is abandoned. */
export const MAX_STREAM_JSON_LINE_BYTES = 2 * 1024 * 1024

/** What the parser produces alongside tool calls: the run's final prose. */
export interface StreamJsonOutcome {
  /** The `result` event's prose, if the run reached one. */
  finalText?: string
  /** Wall-clock duration the CLI itself reported. */
  durationMs?: number
  /** True when the CLI reported the run as failed. */
  isError?: boolean
}

export interface ToolCallParserResult {
  /** Tool lifecycle events, in the order they were observed. */
  toolCalls: LaneToolCall[]
  /** Human-readable assistant text, ready to stream as `output`. */
  text: string[]
  /** Present once the CLI emits its terminal `result` event. */
  outcome?: StreamJsonOutcome
}

export interface ToolCallParser {
  /** Feed a raw chunk. Returns whatever became complete because of it. */
  push: (chunk: string) => ToolCallParserResult
  /** Feed the final partial line, if any. */
  flush: () => ToolCallParserResult
  /**
   * Tool calls that were started but never settled — the CLI died mid-tool.
   * Reported so Mission Control can show them as failed rather than leaving a
   * spinner running forever.
   */
  unsettled: () => LaneToolCall[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

/** Milliseconds between two ISO instants, or undefined if either is unusable. */
export function durationBetween(
  startedAt: string | undefined,
  endedAt: string | undefined,
): number | undefined {
  if (!startedAt || !endedAt) return undefined
  const start = Date.parse(startedAt)
  const end = Date.parse(endedAt)
  if (!Number.isFinite(start) || !Number.isFinite(end)) return undefined
  const delta = end - start
  // A negative duration means the clocks disagree. Reporting it would be worse
  // than reporting nothing, because a negative number renders as a real value.
  return delta >= 0 ? delta : undefined
}

const EMPTY: ToolCallParserResult = Object.freeze({
  toolCalls: [] as LaneToolCall[],
  text: [] as string[],
})

export function createToolCallParser(): ToolCallParser {
  let buffer = ''
  /** toolCallId → what we knew when it started. */
  const pending = new Map<string, { name: string; startedAt?: string }>()

  function handleAssistant(
    event: Record<string, unknown>,
    out: ToolCallParserResult,
  ): void {
    const message = isRecord(event.message) ? event.message : undefined
    const content = message?.content
    if (!Array.isArray(content)) return
    const timestamp = asString(event.timestamp) || undefined
    for (const block of content) {
      if (!isRecord(block)) continue
      if (block.type === 'text') {
        const text = asString(block.text)
        if (text !== '') out.text.push(text)
        continue
      }
      if (block.type !== 'tool_use') continue
      const id = asString(block.id)
      const name = asString(block.name) || 'tool'
      if (id !== '') pending.set(id, { name, startedAt: timestamp })
      out.toolCalls.push({
        name,
        argumentSummary: summariseToolArguments(block.input),
        status: 'started',
      })
    }
  }

  function handleUser(
    event: Record<string, unknown>,
    out: ToolCallParserResult,
  ): void {
    const message = isRecord(event.message) ? event.message : undefined
    const content = message?.content
    if (!Array.isArray(content)) return
    const timestamp = asString(event.timestamp) || undefined
    for (const block of content) {
      if (!isRecord(block) || block.type !== 'tool_result') continue
      const id = asString(block.tool_use_id)
      const started = id === '' ? undefined : pending.get(id)
      if (id !== '') pending.delete(id)
      out.toolCalls.push({
        // A result with no matching start means the stream was joined late;
        // naming it `tool` is honest, inventing a name would not be.
        name: started?.name ?? 'tool',
        argumentSummary: '',
        status: block.is_error === true ? 'failed' : 'succeeded',
        ...(durationBetween(started?.startedAt, timestamp) !== undefined
          ? { durationMs: durationBetween(started?.startedAt, timestamp) }
          : {}),
      })
    }
  }

  function handleLine(line: string, out: ToolCallParserResult): void {
    const trimmed = line.trim()
    if (trimmed === '' || !trimmed.startsWith('{')) return
    let event: unknown
    try {
      event = JSON.parse(trimmed)
    } catch {
      // A malformed line is one unreadable event, not a dead run. The CLI is a
      // third party; killing the lane because it printed something unexpected
      // would make Mission Control less reliable than the CLI it watches.
      return
    }
    if (!isRecord(event)) return
    switch (event.type) {
      case 'assistant':
        handleAssistant(event, out)
        break
      case 'user':
        handleUser(event, out)
        break
      case 'result': {
        const durationMs =
          typeof event.duration_ms === 'number' && Number.isFinite(event.duration_ms)
            ? event.duration_ms
            : undefined
        out.outcome = {
          ...(asString(event.result) !== '' ? { finalText: asString(event.result) } : {}),
          ...(durationMs !== undefined ? { durationMs } : {}),
          isError: event.is_error === true || event.subtype !== 'success',
        }
        break
      }
      default:
        // system/init, system/thinking_tokens, hook chatter, rate_limit_event:
        // ignored on purpose so a CLI upgrade cannot break a running lane.
        break
    }
  }

  function drain(chunk: string, final: boolean): ToolCallParserResult {
    const out: ToolCallParserResult = { toolCalls: [], text: [] }
    buffer += chunk
    let newline = buffer.indexOf('\n')
    while (newline !== -1) {
      handleLine(buffer.slice(0, newline), out)
      buffer = buffer.slice(newline + 1)
      newline = buffer.indexOf('\n')
    }
    if (final) {
      handleLine(buffer, out)
      buffer = ''
    } else if (Buffer.byteLength(buffer, 'utf8') > MAX_STREAM_JSON_LINE_BYTES) {
      // One event grew past any plausible size. Abandoning the line loses that
      // event; growing the buffer without limit loses the whole process.
      buffer = ''
    }
    return out
  }

  return {
    push: (chunk) => (chunk === '' ? { ...EMPTY, toolCalls: [], text: [] } : drain(chunk, false)),
    flush: () => drain('', true),
    unsettled: () =>
      [...pending.values()].map((entry) => ({
        name: entry.name,
        argumentSummary: '',
        status: 'failed' as const,
      })),
  }
}
