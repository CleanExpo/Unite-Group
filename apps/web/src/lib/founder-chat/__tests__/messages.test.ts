// src/lib/founder-chat/__tests__/messages.test.ts
// Unit tests for the pure founder-chat helpers (no IO).

import { describe, it, expect } from 'vitest'
import {
  MAX_MESSAGES,
  MAX_CONTENT_CHARS,
  parseFounderChatBody,
  trimToLeadingUserTurn,
  buildFounderSystemPrompt,
  extractSseEvents,
} from '../messages'

describe('parseFounderChatBody', () => {
  const userMessage = { role: 'user', content: 'What shipped this week?' }

  it('accepts a valid body without businessKey', () => {
    const parsed = parseFounderChatBody({ messages: [userMessage] })
    expect(parsed).toEqual({ ok: true, messages: [userMessage], businessKey: null })
  })

  it('accepts a valid body with a businessKey and trims it', () => {
    const parsed = parseFounderChatBody({ messages: [userMessage], businessKey: '  synthex  ' })
    expect(parsed).toEqual({ ok: true, messages: [userMessage], businessKey: 'synthex' })
  })

  it('treats an empty businessKey as null (no grounding)', () => {
    const parsed = parseFounderChatBody({ messages: [userMessage], businessKey: '   ' })
    expect(parsed).toEqual({ ok: true, messages: [userMessage], businessKey: null })
  })

  it('rejects a non-string businessKey', () => {
    const parsed = parseFounderChatBody({ messages: [userMessage], businessKey: 42 })
    expect(parsed).toEqual({ ok: false, error: 'businessKey must be a string' })
  })

  it('rejects a non-object body', () => {
    expect(parseFounderChatBody(null).ok).toBe(false)
    expect(parseFounderChatBody([userMessage]).ok).toBe(false)
    expect(parseFounderChatBody('hello').ok).toBe(false)
  })

  it('rejects empty or missing messages', () => {
    expect(parseFounderChatBody({}).ok).toBe(false)
    expect(parseFounderChatBody({ messages: [] }).ok).toBe(false)
  })

  it('rejects more than MAX_MESSAGES entries', () => {
    const messages = Array.from({ length: MAX_MESSAGES + 1 }, () => ({ ...userMessage }))
    const parsed = parseFounderChatBody({ messages })
    expect(parsed).toEqual({
      ok: false,
      error: `messages must contain at most ${MAX_MESSAGES} entries`,
    })
  })

  it('rejects an invalid role', () => {
    const parsed = parseFounderChatBody({ messages: [{ role: 'system', content: 'x' }] })
    expect(parsed).toEqual({ ok: false, error: 'message role must be "user" or "assistant"' })
  })

  it('rejects empty content and over-long content', () => {
    expect(parseFounderChatBody({ messages: [{ role: 'user', content: '   ' }] }).ok).toBe(false)
    const long = 'a'.repeat(MAX_CONTENT_CHARS + 1)
    expect(parseFounderChatBody({ messages: [{ role: 'user', content: long }] })).toEqual({
      ok: false,
      error: `message content must be at most ${MAX_CONTENT_CHARS} characters`,
    })
  })

  it('rejects a thread whose last message is not from the user', () => {
    const parsed = parseFounderChatBody({
      messages: [userMessage, { role: 'assistant', content: 'Done.' }],
    })
    expect(parsed).toEqual({ ok: false, error: 'the last message must be from the user' })
  })
})

describe('trimToLeadingUserTurn', () => {
  it('drops leading assistant messages left by a client-side window', () => {
    const trimmed = trimToLeadingUserTurn([
      { role: 'assistant', content: 'orphaned' },
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'hello' },
      { role: 'user', content: 'again' },
    ])
    expect(trimmed[0]).toEqual({ role: 'user', content: 'hi' })
    expect(trimmed).toHaveLength(3)
  })

  it('leaves a user-first thread untouched', () => {
    const thread = [{ role: 'user' as const, content: 'hi' }]
    expect(trimToLeadingUserTurn(thread)).toEqual(thread)
  })
})

describe('buildFounderSystemPrompt', () => {
  it('always carries the operator identity and en-AU locale', () => {
    const prompt = buildFounderSystemPrompt(null, '')
    expect(prompt).toContain('Unite-Group Nexus operator assistant')
    expect(prompt).toContain('en-AU')
    expect(prompt).toContain('never fabricate')
    expect(prompt).not.toContain('grounded this conversation')
  })

  it('includes the business name and context block when grounded', () => {
    const prompt = buildFounderSystemPrompt('Synthex', '[1] (business_profile) Synthex: marketing platform')
    expect(prompt).toContain('"Synthex"')
    expect(prompt).toContain('[1] (business_profile) Synthex: marketing platform')
  })

  it('is honest when a business is selected but no context was retrieved', () => {
    const prompt = buildFounderSystemPrompt('Synthex', '')
    expect(prompt).toContain('No business context was retrieved')
  })
})

describe('extractSseEvents', () => {
  it('parses delta events and keeps the trailing partial frame', () => {
    const { events, done, rest } = extractSseEvents(
      'data: {"delta":"Hel"}\n\ndata: {"delta":"lo"}\n\ndata: {"del',
    )
    expect(events).toEqual([{ delta: 'Hel' }, { delta: 'lo' }])
    expect(done).toBe(false)
    expect(rest).toBe('data: {"del')
  })

  it('completes a frame split across chunks', () => {
    const first = extractSseEvents('data: {"delta":"Hel')
    expect(first.events).toEqual([])
    const second = extractSseEvents(first.rest + 'lo"}\n\ndata: [DONE]\n\n')
    expect(second.events).toEqual([{ delta: 'Hello' }])
    expect(second.done).toBe(true)
    expect(second.rest).toBe('')
  })

  it('surfaces error events and detects [DONE]', () => {
    const { events, done } = extractSseEvents('data: {"error":"overloaded_error"}\n\ndata: [DONE]\n\n')
    expect(events).toEqual([{ error: 'overloaded_error' }])
    expect(done).toBe(true)
  })

  it('skips malformed and irrelevant frames without aborting', () => {
    const { events, done } = extractSseEvents('data: {broken\n\n: comment\n\ndata: {"delta":"ok"}\n\n')
    expect(events).toEqual([{ delta: 'ok' }])
    expect(done).toBe(false)
  })
})
