// src/lib/ai/__tests__/features/batch.test.ts
// Unit tests for the Batch API queue and status management, including the
// sequential OAuth-mode fallback (Max-plan OAuth tokens lack the `user:batch`
// scope the Batches API requires).

import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockBatchesCreate, mockBatchesRetrieve, mockMessagesCreate, mockGetAIClientMode } = vi.hoisted(() => ({
  mockBatchesCreate: vi.fn(),
  mockBatchesRetrieve: vi.fn(),
  mockMessagesCreate: vi.fn(),
  mockGetAIClientMode: vi.fn(),
}))

vi.mock('@/lib/ai/client', () => ({
  getAIClient: vi.fn(() => ({
    messages: {
      create: mockMessagesCreate,
      batches: {
        create: mockBatchesCreate,
        retrieve: mockBatchesRetrieve,
      },
    },
  })),
  getAIClientMode: mockGetAIClientMode,
}))

import { createBatch, checkBatchStatus, retrieveBatchResults, buildBatchRequest } from '../../features/batch'

beforeEach(() => {
  vi.clearAllMocks()
  mockGetAIClientMode.mockReturnValue('apikey')
  mockBatchesCreate.mockResolvedValue({
    id: 'batch_abc123',
    processing_status: 'in_progress',
  })
  mockBatchesRetrieve.mockResolvedValue({
    id: 'batch_abc123',
    processing_status: 'ended',
    results_url: 'https://api.anthropic.com/results/batch_abc123',
  })
})

describe('Batch API', () => {
  it('createBatch returns id and status', async () => {
    const requests = [
      buildBatchRequest('req-1', {
        model: 'claude-sonnet-4-20250514',
        maxTokens: 1024,
        messages: [{ role: 'user', content: 'Hello' }],
      }),
    ]
    const result = await createBatch(requests)
    expect(result.id).toBe('batch_abc123')
    expect(result.status).toBe('in_progress')
  })

  it('checkBatchStatus returns status and resultsUrl', async () => {
    const result = await checkBatchStatus('batch_abc123')
    expect(result.id).toBe('batch_abc123')
    expect(result.status).toBe('ended')
    expect(result.resultsUrl).toBe('https://api.anthropic.com/results/batch_abc123')
  })

  it('buildBatchRequest produces correct structure', () => {
    const req = buildBatchRequest('custom-1', {
      model: 'claude-sonnet-4-20250514',
      maxTokens: 2048,
      system: 'You are helpful.',
      messages: [{ role: 'user', content: 'Summarise this.' }],
    })
    expect(req.custom_id).toBe('custom-1')
    expect(req.params.model).toBe('claude-sonnet-4-20250514')
    expect(req.params.max_tokens).toBe(2048)
    expect(req.params.system).toBe('You are helpful.')
    expect(req.params.messages).toHaveLength(1)
  })

  it('api-key mode uses the Batches API unchanged', async () => {
    mockGetAIClientMode.mockReturnValue('apikey')
    const requests = [
      buildBatchRequest('req-1', {
        model: 'claude-sonnet-4-20250514',
        maxTokens: 1024,
        messages: [{ role: 'user', content: 'Hello' }],
      }),
    ]

    const result = await createBatch(requests)

    expect(mockBatchesCreate).toHaveBeenCalledTimes(1)
    expect(mockBatchesCreate).toHaveBeenCalledWith({ requests })
    expect(mockMessagesCreate).not.toHaveBeenCalled()
    expect(result.status).toBe('in_progress')
  })

  describe('OAuth mode fallback', () => {
    it('runs requests sequentially via messages.create and never calls batches.create', async () => {
      mockGetAIClientMode.mockReturnValue('oauth')
      mockMessagesCreate
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: 'first' }],
          usage: { input_tokens: 10, output_tokens: 20 },
          model: 'claude-sonnet-4-20250514',
        })
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: 'second' }],
          usage: { input_tokens: 5, output_tokens: 8 },
          model: 'claude-sonnet-4-20250514',
        })

      const requests = [
        buildBatchRequest('req-a', {
          model: 'claude-sonnet-4-20250514',
          maxTokens: 1024,
          messages: [{ role: 'user', content: 'A' }],
        }),
        buildBatchRequest('req-b', {
          model: 'claude-sonnet-4-20250514',
          maxTokens: 1024,
          messages: [{ role: 'user', content: 'B' }],
        }),
      ]

      const batch = await createBatch(requests)

      expect(mockMessagesCreate).toHaveBeenCalledTimes(2)
      expect(mockBatchesCreate).not.toHaveBeenCalled()
      expect(batch.status).toBe('ended')

      const status = await checkBatchStatus(batch.id)
      expect(status.status).toBe('ended')
      expect(mockBatchesRetrieve).not.toHaveBeenCalled()

      const results = await retrieveBatchResults(batch.id)
      expect(results).toHaveLength(2)
      expect(results[0]).toMatchObject({
        customId: 'req-a',
        status: 'succeeded',
        message: { usage: { input_tokens: 10, output_tokens: 20 }, model: 'claude-sonnet-4-20250514' },
      })
      expect(results[1]).toMatchObject({ customId: 'req-b', status: 'succeeded' })
    })

    it('carries the error per-item when a sequential call fails, without fabricating success', async () => {
      mockGetAIClientMode.mockReturnValue('oauth')
      mockMessagesCreate
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: 'ok' }],
          usage: { input_tokens: 1, output_tokens: 2 },
          model: 'claude-sonnet-4-20250514',
        })
        .mockRejectedValueOnce(new Error('rate limited'))

      const requests = [
        buildBatchRequest('req-ok', {
          model: 'claude-sonnet-4-20250514',
          maxTokens: 1024,
          messages: [{ role: 'user', content: 'ok' }],
        }),
        buildBatchRequest('req-fail', {
          model: 'claude-sonnet-4-20250514',
          maxTokens: 1024,
          messages: [{ role: 'user', content: 'fail' }],
        }),
      ]

      const batch = await createBatch(requests)
      const results = await retrieveBatchResults(batch.id)

      expect(results[0]).toMatchObject({ customId: 'req-ok', status: 'succeeded' })
      expect(results[1].customId).toBe('req-fail')
      expect(results[1].status).toBe('errored')
      expect(results[1].message).toBeUndefined()
      expect(results[1].error?.message).toBe('rate limited')
    })

    it('preserves request order under bounded concurrency (slowest first)', async () => {
      mockGetAIClientMode.mockReturnValue('oauth')
      let call = 0
      mockMessagesCreate.mockImplementation(async () => {
        const n = call++
        await new Promise((r) => setTimeout(r, n === 0 ? 30 : 5))
        return {
          content: [{ type: 'text', text: `resp-${n}` }],
          usage: { input_tokens: 1, output_tokens: 1 },
          model: 'claude-sonnet-4-20250514',
        }
      })
      const requests = ['a', 'b', 'c'].map((id) =>
        buildBatchRequest(id, {
          model: 'claude-sonnet-4-20250514',
          maxTokens: 1024,
          messages: [{ role: 'user', content: id }],
        })
      )
      const batch = await createBatch(requests)
      const items = await retrieveBatchResults(batch.id)
      expect(items.map((i) => i.customId)).toEqual(['a', 'b', 'c'])
      expect(mockMessagesCreate).toHaveBeenCalledTimes(3)
    })
  })
})
