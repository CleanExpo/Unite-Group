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
