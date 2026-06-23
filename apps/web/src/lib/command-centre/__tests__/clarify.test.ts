import { describe, it, expect, vi } from 'vitest'
import { filterQuestions, generateClarifyingQuestions } from '../clarify'

function modelReturning(text: string) {
  return { messages: { create: vi.fn().mockResolvedValue({ content: [{ type: 'text', text }] }) } }
}

describe('filterQuestions', () => {
  it('keeps only genuine questions, trims, caps at 4', () => {
    const out = filterQuestions(['Who is the audience?', 'not a question', '  What is the budget?  ', 'A?', 'B?', 'C?', 'D?', 'E?'])
    expect(out).toEqual(['Who is the audience?', 'What is the budget?', 'A?', 'B?'])
  })
})

describe('generateClarifyingQuestions', () => {
  it('parses a JSON array of questions from the model', async () => {
    const client = modelReturning('["What is the finish line?", "Who is the audience?"]')
    const out = await generateClarifyingQuestions('Build a thing', client as never)
    expect(out).toEqual(['What is the finish line?', 'Who is the audience?'])
  })

  it('returns [] when the model call throws (best-effort)', async () => {
    const client = { messages: { create: vi.fn().mockRejectedValue(new Error('429')) } }
    expect(await generateClarifyingQuestions('Build a thing', client as never)).toEqual([])
  })

  it('returns [] when output is unparseable', async () => {
    const client = modelReturning('not json at all')
    expect(await generateClarifyingQuestions('Build a thing', client as never)).toEqual([])
  })
})
