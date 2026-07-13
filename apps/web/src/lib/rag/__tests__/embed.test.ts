import { describe, it, expect, vi, afterEach } from 'vitest'
import { embed, embedBatch } from '../embed'

const ORIGINAL_KEY = process.env.OPENAI_API_KEY
const ORIGINAL_FETCH = global.fetch

afterEach(() => {
  if (ORIGINAL_KEY === undefined) {
    delete process.env.OPENAI_API_KEY
  } else {
    process.env.OPENAI_API_KEY = ORIGINAL_KEY
  }
  global.fetch = ORIGINAL_FETCH
  vi.restoreAllMocks()
})

describe('embed', () => {
  it('happy path: posts to the OpenAI embeddings API and returns the vector', async () => {
    process.env.OPENAI_API_KEY = 'test-key'
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({ data: [{ index: 0, embedding: [0.1, 0.2, 0.3] }] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    global.fetch = fetchMock as unknown as typeof fetch

    const vector = await embed('what services does this business offer?')

    expect(vector).toEqual([0.1, 0.2, 0.3])
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://api.openai.com/v1/embeddings')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer test-key')
    const body = JSON.parse(init.body as string)
    expect(body.model).toBe('text-embedding-3-small')
    expect(body.dimensions).toBe(1536)
    expect(body.input).toEqual(['what services does this business offer?'])
  })

  it('throws a clear error when OPENAI_API_KEY is not configured', async () => {
    delete process.env.OPENAI_API_KEY
    const fetchMock = vi.fn()
    global.fetch = fetchMock as unknown as typeof fetch

    await expect(embed('anything')).rejects.toThrow('[rag] OPENAI_API_KEY not configured')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('throws on a non-2xx OpenAI response', async () => {
    process.env.OPENAI_API_KEY = 'test-key'
    global.fetch = vi.fn(async () =>
      new Response('rate limited', { status: 429 }),
    ) as unknown as typeof fetch

    await expect(embed('anything')).rejects.toThrow(
      '[rag] OpenAI embeddings request failed (429)',
    )
  })
})

describe('embedBatch', () => {
  it('returns vectors re-sorted by index and skips the network for empty input', async () => {
    process.env.OPENAI_API_KEY = 'test-key'
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: [
            { index: 1, embedding: [0.2] },
            { index: 0, embedding: [0.1] },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    global.fetch = fetchMock as unknown as typeof fetch

    await expect(embedBatch([])).resolves.toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()

    const vectors = await embedBatch(['a', 'b'])
    expect(vectors).toEqual([[0.1], [0.2]])
  })

  it('throws when the response is missing a vector per input', async () => {
    process.env.OPENAI_API_KEY = 'test-key'
    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ data: [{ index: 0, embedding: [0.1] }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ) as unknown as typeof fetch

    await expect(embedBatch(['a', 'b'])).rejects.toThrow(
      '[rag] OpenAI embeddings response shape mismatch',
    )
  })
})
