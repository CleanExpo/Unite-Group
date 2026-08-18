import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  createToolCallParser,
  durationBetween,
  MAX_STREAM_JSON_LINE_BYTES,
} from './tool-call-parser'

// Captured from a real `claude -p --output-format stream-json --verbose` run on
// 2026-08-17 and trimmed. The point of testing against a captured stream rather
// than a hand-written one is that a hand-written fixture encodes what the author
// BELIEVES the CLI emits, and passes even when that belief is wrong.
const FIXTURE = readFileSync(
  path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    '__fixtures__',
    'claude-stream-json.jsonl',
  ),
  'utf8',
)

function parseAll(chunks: string[]) {
  const parser = createToolCallParser()
  const toolCalls = []
  const text = []
  let outcome
  for (const chunk of chunks) {
    const result = parser.push(chunk)
    toolCalls.push(...result.toolCalls)
    text.push(...result.text)
    outcome ??= result.outcome
  }
  const final = parser.flush()
  toolCalls.push(...final.toolCalls)
  text.push(...final.text)
  outcome ??= final.outcome
  return { toolCalls, text, outcome, unsettled: parser.unsettled() }
}

describe('claude stream-json tool-call parser', () => {
  it('reads the real captured stream end to end', () => {
    const { toolCalls, text, outcome, unsettled } = parseAll([FIXTURE])

    expect(toolCalls).toEqual([
      {
        name: 'Read',
        argumentSummary: expect.stringContaining('a.txt'),
        status: 'started',
      },
      {
        name: 'Read',
        argumentSummary: '',
        status: 'succeeded',
        durationMs: 21,
      },
    ])
    expect(text.join('\n')).toContain('hello world')
    expect(outcome?.isError).toBe(false)
    expect(outcome?.durationMs).toBeGreaterThan(0)
    expect(outcome?.finalText).toContain('hello world')
    expect(unsettled).toEqual([])
  })

  it('derives duration from the CLI timestamps, not the wall clock', () => {
    // 16:20:59.934Z → 16:20:59.955Z in the captured run.
    const { toolCalls } = parseAll([FIXTURE])
    expect(toolCalls[1]?.durationMs).toBe(21)
  })

  it('survives the stream arriving in arbitrary chunks', () => {
    // A child process splits writes wherever it likes; a parser that only works
    // on whole lines works only in tests.
    const chunked = FIXTURE.match(/[\s\S]{1,7}/g) ?? []
    const whole = parseAll([FIXTURE])
    const split = parseAll(chunked)
    expect(split.toolCalls).toEqual(whole.toolCalls)
    expect(split.text).toEqual(whole.text)
    expect(split.outcome).toEqual(whole.outcome)
  })

  it('ignores the CLI event types it does not consume', () => {
    // system/init, system/thinking_tokens and rate_limit_event are all in the
    // fixture. A CLI upgrade adding another must not break a running lane.
    const { toolCalls } = parseAll([FIXTURE])
    expect(toolCalls).toHaveLength(2)
  })

  it('redacts a home directory out of the argument summary', () => {
    const line = JSON.stringify({
      type: 'assistant',
      timestamp: '2026-01-01T00:00:00.000Z',
      message: {
        content: [
          {
            type: 'tool_use',
            id: 'toolu_1',
            name: 'Read',
            input: { file_path: '/Users/phill/secrets/prod.env' },
          },
        ],
      },
    })
    const { toolCalls } = parseAll([`${line}\n`])
    expect(toolCalls[0]?.argumentSummary).not.toContain('/Users/phill')
    expect(toolCalls[0]?.argumentSummary).toContain('[REDACTED_PATH]')
  })

  it('marks a tool_result carrying is_error as failed', () => {
    const lines = [
      {
        type: 'assistant',
        timestamp: '2026-01-01T00:00:00.000Z',
        message: {
          content: [{ type: 'tool_use', id: 'toolu_1', name: 'Bash', input: { command: 'false' } }],
        },
      },
      {
        type: 'user',
        timestamp: '2026-01-01T00:00:02.500Z',
        message: {
          content: [{ type: 'tool_result', tool_use_id: 'toolu_1', is_error: true, content: 'boom' }],
        },
      },
    ]
      .map((row) => JSON.stringify(row))
      .join('\n')
    const { toolCalls } = parseAll([`${lines}\n`])
    expect(toolCalls[1]).toEqual({
      name: 'Bash',
      argumentSummary: '',
      status: 'failed',
      durationMs: 2_500,
    })
  })

  it('reports a tool that never settled rather than leaving it spinning', () => {
    const line = JSON.stringify({
      type: 'assistant',
      timestamp: '2026-01-01T00:00:00.000Z',
      message: {
        content: [{ type: 'tool_use', id: 'toolu_1', name: 'Bash', input: { command: 'sleep 999' } }],
      },
    })
    const { unsettled } = parseAll([`${line}\n`])
    expect(unsettled).toEqual([{ name: 'Bash', argumentSummary: '', status: 'failed' }])
  })

  it('names an orphan tool_result honestly instead of inventing one', () => {
    const line = JSON.stringify({
      type: 'user',
      timestamp: '2026-01-01T00:00:00.000Z',
      message: { content: [{ type: 'tool_result', tool_use_id: 'toolu_unknown', content: 'ok' }] },
    })
    const { toolCalls } = parseAll([`${line}\n`])
    expect(toolCalls[0]?.name).toBe('tool')
    expect(toolCalls[0]?.durationMs).toBeUndefined()
  })

  it('skips a malformed line without killing the run', () => {
    const good = JSON.stringify({
      type: 'assistant',
      timestamp: '2026-01-01T00:00:00.000Z',
      message: { content: [{ type: 'text', text: 'still here' }] },
    })
    const { text } = parseAll([`{"type":"assistant"  truncated\n${good}\n`])
    expect(text).toEqual(['still here'])
  })

  it('abandons a single line that outgrows the ceiling instead of the process', () => {
    const parser = createToolCallParser()
    // No newline: a runaway line must not be buffered without bound.
    parser.push('x'.repeat(MAX_STREAM_JSON_LINE_BYTES + 1))
    const after = parser.flush()
    expect(after.text).toEqual([])
    expect(after.toolCalls).toEqual([])
  })

  it('treats a non-success result subtype as an error', () => {
    const line = JSON.stringify({
      type: 'result',
      subtype: 'error_max_turns',
      is_error: false,
      duration_ms: 10,
    })
    const { outcome } = parseAll([`${line}\n`])
    expect(outcome?.isError).toBe(true)
  })
})

describe('durationBetween', () => {
  it('measures forward time', () => {
    expect(
      durationBetween('2026-01-01T00:00:00.000Z', '2026-01-01T00:00:01.250Z'),
    ).toBe(1_250)
  })

  it('returns undefined rather than a negative duration', () => {
    // A negative number renders as a real value and would be believed.
    expect(
      durationBetween('2026-01-01T00:00:01.000Z', '2026-01-01T00:00:00.000Z'),
    ).toBeUndefined()
  })

  it('returns undefined for missing or unparseable instants', () => {
    expect(durationBetween(undefined, '2026-01-01T00:00:00.000Z')).toBeUndefined()
    expect(durationBetween('not a date', '2026-01-01T00:00:00.000Z')).toBeUndefined()
  })
})
