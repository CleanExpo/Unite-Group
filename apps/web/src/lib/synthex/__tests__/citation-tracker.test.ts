import { describe, it, expect, vi, afterEach } from 'vitest'
import { checkCitation, type CitationCheckResult } from '../citation-tracker'

const ORIGINAL_ENV = process.env.PERPLEXITY_API_KEY
const ORIGINAL_FETCH = global.fetch

afterEach(() => {
  process.env.PERPLEXITY_API_KEY = ORIGINAL_ENV
  global.fetch = ORIGINAL_FETCH
  vi.restoreAllMocks()
})

describe('checkCitation — source discriminator', () => {
  it('mock path: googleAIOSource is "inferred" and chatgptSource is "unavailable"', async () => {
    delete process.env.PERPLEXITY_API_KEY
    const result: CitationCheckResult = await checkCitation('roof restoration brisbane')
    expect(result.googleAIOSource).toBe('inferred')
    expect(result.chatgptSource).toBe('unavailable')
  })

  it('live path: googleAIOSource is "inferred" and chatgptSource is "unavailable" (no real Google AIO or ChatGPT API exists)', async () => {
    process.env.PERPLEXITY_API_KEY = 'test-key'
    global.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          choices: [{ message: { content: 'yes, found at position 1' } }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    ) as unknown as typeof fetch

    const result: CitationCheckResult = await checkCitation('water damage restoration')

    expect(result.googleAIOSource).toBe('inferred')
    expect(result.chatgptSource).toBe('unavailable')
    // Sanity: the live path did use the Perplexity signal, not mock scoring.
    expect(result.perplexityMentioned).toBe(true)
  })
})
