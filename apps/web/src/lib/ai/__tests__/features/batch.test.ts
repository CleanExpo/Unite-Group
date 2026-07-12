import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockBatchesCreate, mockBatchesRetrieve } = vi.hoisted(() => ({
  mockBatchesCreate: vi.fn(),
  mockBatchesRetrieve: vi.fn(),
}))

vi.mock('@/lib/ai/client', () => ({
  getAIClient: vi.fn(() => ({
    messages: {
      batches: {
        create: mockBatchesCreate,
        retrieve: mockBatchesRetrieve,
      },
    },
  })),
}))

import {
  buildBatchRequest,
  checkBatchStatus,
  createBatch,
} from '../../features/batch'

beforeEach(() => {
  vi.clearAllMocks()
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

describe('Batch API metered server route', () => {
  it('builds the documented request structure', () => {
    expect(
      buildBatchRequest('custom-1', {
        model: 'claude-sonnet-4-20250514',
        maxTokens: 2048,
        system: 'You are helpful.',
        messages: [{ role: 'user', content: 'Summarise this.' }],
      }),
    ).toEqual({
      custom_id: 'custom-1',
      params: {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: 'You are helpful.',
        messages: [{ role: 'user', content: 'Summarise this.' }],
      },
    })
  })

  it('submits through the Anthropic Batches API without a consumer-token fallback', async () => {
    const requests = [
      buildBatchRequest('req-1', {
        model: 'claude-sonnet-4-20250514',
        maxTokens: 1024,
        messages: [{ role: 'user', content: 'Hello' }],
      }),
    ]

    await expect(createBatch(requests)).resolves.toEqual({
      id: 'batch_abc123',
      status: 'in_progress',
    })
    expect(mockBatchesCreate).toHaveBeenCalledWith({ requests })
  })

  it('returns the provider status and results URL', async () => {
    await expect(checkBatchStatus('batch_abc123')).resolves.toEqual({
      id: 'batch_abc123',
      status: 'ended',
      resultsUrl: 'https://api.anthropic.com/results/batch_abc123',
    })
  })
})
