import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { retrieve } from '../retrieve'
import { embed } from '../embed'

vi.mock('../embed', () => ({
  embed: vi.fn(async () => [0.1, 0.2, 0.3]),
}))

const BUSINESS_ID = '4dfe66b6-2b0f-4b21-9f5a-000000000001'

function mockSupabase(rpcResult: { data?: unknown; error?: { message: string } | null }) {
  const rpc = vi.fn(async () => ({ data: rpcResult.data ?? null, error: rpcResult.error ?? null }))
  return { client: { rpc } as unknown as SupabaseClient, rpc }
}

beforeEach(() => {
  vi.mocked(embed).mockClear()
})

describe('retrieve', () => {
  it('embeds the query, calls match_business_docs, and maps rows to RetrievedChunk', async () => {
    const body = JSON.stringify({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Open 7 days.' }] }],
    })
    const { client, rpc } = mockSupabase({
      data: [
        { id: 'p1', title: 'Trading hours', content: body, similarity: 0.91 },
        { id: 'p2', title: null, content: 'plain notes', similarity: 0.82 },
      ],
    })

    const chunks = await retrieve(client, BUSINESS_ID, 'when are you open?')

    expect(embed).toHaveBeenCalledWith('when are you open?')
    expect(rpc).toHaveBeenCalledWith('match_business_docs', {
      p_business_id: BUSINESS_ID,
      query_embedding: [0.1, 0.2, 0.3],
      match_count: 5,
    })
    expect(chunks).toEqual([
      { content: 'Open 7 days.', source: 'Trading hours', similarity: 0.91 },
      { content: 'plain notes', source: null, similarity: 0.82 },
    ])
  })

  it('passes a custom k through as match_count', async () => {
    const { client, rpc } = mockSupabase({ data: [] })

    await expect(retrieve(client, BUSINESS_ID, 'query', 2)).resolves.toEqual([])
    expect(rpc).toHaveBeenCalledWith(
      'match_business_docs',
      expect.objectContaining({ match_count: 2 }),
    )
  })

  it('falls back to the page title when the body has no extractable text', async () => {
    const { client } = mockSupabase({
      data: [{ id: 'p1', title: 'Pricing', content: JSON.stringify({ type: 'doc', content: [] }), similarity: 0.7 }],
    })

    const chunks = await retrieve(client, BUSINESS_ID, 'pricing')
    expect(chunks).toEqual([{ content: 'Pricing', source: 'Pricing', similarity: 0.7 }])
  })

  it('throws loudly when the RPC errors', async () => {
    const { client } = mockSupabase({ error: { message: 'function does not exist' } })

    await expect(retrieve(client, BUSINESS_ID, 'query')).rejects.toThrow(
      '[rag] match_business_docs failed: function does not exist',
    )
  })
})
