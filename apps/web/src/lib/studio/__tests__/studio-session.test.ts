import { describe, it, expect } from 'vitest'
import { applyConceptTurn, type StudioSession } from '../studio-session'

const concepts = [{ id: 'c1', url: 'u1', prompt: 'p1' }]

describe('applyConceptTurn', () => {
  it('seeds a session from undefined', () => {
    const s = applyConceptTurn(undefined, {
      founderMessage: 'hi', agentMessage: 'here you go', newConcepts: concepts, provider: 'gemini', at: '2026-06-23',
    })
    expect(s.phase).toBe('concept')
    expect(s.provider).toBe('gemini')
    expect(s.messages.map((m) => m.role)).toEqual(['founder', 'agent'])
    expect(s.messages[0].text).toBe('hi')
    expect(s.messages[1].text).toBe('here you go')
    expect(s.concepts).toEqual(concepts)
    expect(s.chosenConceptId).toBeNull()
  })

  it('appends messages, swaps concepts, preserves chosenConceptId + concept phase', () => {
    const prev: StudioSession = {
      phase: 'concept', provider: 'gemini',
      messages: [{ role: 'founder', text: 'old', at: '1' }],
      concepts: [{ id: 'old', url: 'o', prompt: 'o' }], chosenConceptId: 'old',
    }
    const s = applyConceptTurn(prev, {
      founderMessage: 'more', agentMessage: 'ok', newConcepts: concepts, provider: 'openai', at: '2026-06-23',
    })
    expect(s.messages.map((m) => m.text)).toEqual(['old', 'more', 'ok'])
    expect(s.concepts).toEqual(concepts)
    expect(s.chosenConceptId).toBe('old')
    expect(s.provider).toBe('openai')
    expect(s.phase).toBe('concept')
  })
})
