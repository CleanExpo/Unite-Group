// src/lib/founder-chat/__tests__/persist.test.ts
import { describe, expect, it } from 'vitest'
import { normaliseStoredMessages, parsePersistBody } from '../persist'

describe('normaliseStoredMessages', () => {
  it('keeps valid turns and drops junk', () => {
    expect(
      normaliseStoredMessages([
        { role: 'user', content: 'hello' },
        { role: 'assistant', content: 'hi' },
        { role: 'system', content: 'nope' },
        { role: 'user', content: '   ' },
        null,
      ]),
    ).toEqual([
      { role: 'user', content: 'hello' },
      { role: 'assistant', content: 'hi' },
    ])
  })
})

describe('parsePersistBody', () => {
  it('accepts an empty thread', () => {
    expect(parsePersistBody({ messages: [], businessKey: null })).toEqual({
      ok: true,
      messages: [],
      businessKey: null,
    })
  })

  it('rejects oversized business keys', () => {
    const parsed = parsePersistBody({
      messages: [],
      businessKey: 'x'.repeat(121),
    })
    expect(parsed.ok).toBe(false)
  })
})

describe('Mission Control chat W1a — turnId on stored user messages', () => {
  const TURN = '7b0c2f1e-3a4d-4c5e-8f60-1a2b3c4d5e6f'

  it('AC-19 keeps a valid user turnId and drops forged status, title and mission fields', () => {
    const forged = [
      { role: 'user', content: 'Build a dashboard for Synthex', turnId: TURN, status: 'running', title: 'x', mission: { kind: 'recorded', status: 'running' } },
      { role: 'assistant', content: 'Done.', turnId: TURN, status: 'done' },
    ]
    const expected = [
      { role: 'user', content: 'Build a dashboard for Synthex', turnId: TURN },
      { role: 'assistant', content: 'Done.' },
    ]
    expect(parsePersistBody({ messages: forged, businessKey: null })).toEqual({ ok: true, messages: expected, businessKey: null })
    expect(normaliseStoredMessages(forged)).toEqual(expected)
  })

  it('AC-19 drops a malformed turnId without rejecting the thread, and old threads still load', () => {
    const thread = [
      { role: 'user', content: 'one', turnId: 'not-a-uuid' },
      { role: 'user', content: 'two', turnId: 7 },
      { role: 'user', content: 'three' },
    ]
    const expected = [
      { role: 'user', content: 'one' },
      { role: 'user', content: 'two' },
      { role: 'user', content: 'three' },
    ]
    expect(parsePersistBody({ messages: thread })).toEqual({ ok: true, messages: expected, businessKey: null })
    expect(normaliseStoredMessages(thread)).toEqual(expected)
  })
})
