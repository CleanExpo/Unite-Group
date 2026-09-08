import { beforeEach, describe, expect, it, vi } from 'vitest'

const { create } = vi.hoisted(() => ({ create: vi.fn() }))
vi.mock('@/lib/ai/client', () => ({ getAIClient: vi.fn(() => ({ messages: { create } })) }))

import { extractFromTranscript } from '../extract'

function modelResult(extractions: unknown[]) {
  return {
    content: [{ type: 'tool_use', input: { extractions } }],
    usage: { input_tokens: 10, output_tokens: 20 },
    stop_reason: 'tool_use',
  }
}

describe('extractFromTranscript grounding', () => {
  beforeEach(() => vi.clearAllMocks())

  it('keeps only non-empty quotes that occur verbatim in the transcript', async () => {
    create.mockResolvedValue(modelResult([
      { kind: 'commitment', body: 'Do the thing', transcript_quote: 'I will do the thing', confidence: 0.9 },
      { kind: 'want', body: 'Empty evidence', transcript_quote: '  ', confidence: 0.8 },
      { kind: 'metric', body: 'Invented evidence', transcript_quote: 'I never said this', confidence: 0.7 },
    ]))

    const result = await extractFromTranscript('Client says: I will do the thing.')
    expect(result.extractions).toHaveLength(1)
    expect(result.extractions[0].transcript_quote).toBe('I will do the thing')
    expect(result.dropped).toBe(2)
  })

  it('fails closed when every model row lacks grounded evidence', async () => {
    create.mockResolvedValue(modelResult([
      { kind: 'commitment', body: 'Unsupported', transcript_quote: 'not present', confidence: 0.2 },
    ]))

    await expect(extractFromTranscript('A transcript with no matching quote.'))
      .rejects.toThrow(/all 1 returned row\(s\) were malformed/)
  })
})
