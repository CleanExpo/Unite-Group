import { describe, it, expect, vi, beforeEach } from 'vitest'

// recordAiUsage lazily imports the service client; capture every insert payload.
const inserts: Array<Record<string, unknown>> = []
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({
    from: (table: string) => ({
      insert: async (row: Record<string, unknown>) => {
        inserts.push({ __table: table, ...row })
        return { error: null }
      },
    }),
  }),
}))

import { recordAiUsage } from '../usage-recorder'

/** The exact column set the recorder wrote before UNI-2780. */
const LEGACY_KEYS = [
  '__table',
  'cost_per_input_mtok',
  'cost_per_output_mtok',
  'cost_usd',
  'latency_ms',
  'metadata',
  'model_id',
  'provider',
  'request_id',
  'success',
  'task_type',
  'tokens_cached',
  'tokens_input',
  'tokens_output',
]

beforeEach(() => {
  inserts.length = 0
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
})

describe('recordAiUsage — default path (existing callers) is unchanged', () => {
  it('writes provider anthropic, a computed cost, and no new metering columns', async () => {
    await recordAiUsage({
      taskType: 'strategy-daily',
      model: 'claude-haiku-4-5',
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
      requestId: 'msg_1',
    })
    expect(inserts).toHaveLength(1)
    const row = inserts[0]
    expect(row.__table).toBe('ai_usage_logs')
    expect(row.provider).toBe('anthropic')
    // haiku-4-5: $1/MTok in + $5/MTok out
    expect(row.cost_usd).toBeCloseTo(6, 6)
    // Columns that do not exist in prod until the migration is applied must be
    // ABSENT (not null) on the default path, or every existing insert breaks.
    expect(Object.keys(row).sort()).toEqual(LEGACY_KEYS)
    expect(row.metadata).toEqual({})
  })
})

describe('recordAiUsage — subscription/multi-provider metering', () => {
  it('writes provider, account, founder, source, project and the reported cost as given', async () => {
    await recordAiUsage({
      taskType: 'review-swarm',
      model: 'some-openrouter-model',
      inputTokens: 10,
      outputTokens: 20,
      requestId: 'gen-42',
      provider: 'openrouter',
      providerAccountId: '11111111-1111-1111-1111-111111111111',
      founderId: '22222222-2222-2222-2222-222222222222',
      source: 'swarm',
      project: 'unite-group',
      reportedCostUsd: 0.4231,
    })
    expect(inserts).toHaveLength(1)
    const row = inserts[0]
    expect(row.provider).toBe('openrouter')
    expect(row.provider_account_id).toBe('11111111-1111-1111-1111-111111111111')
    expect(row.founder_id).toBe('22222222-2222-2222-2222-222222222222')
    expect(row.source).toBe('swarm')
    expect(row.project).toBe('unite-group')
    expect(row.cost_usd).toBe(0.4231)
    expect(row.metadata).toMatchObject({ cost_basis: 'reported' })
    expect(row.metadata).not.toHaveProperty('unpriced_model')
  })

  it('reported cost wins over the computed Anthropic price', async () => {
    await recordAiUsage({
      taskType: 't',
      model: 'claude-haiku-4-5',
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
      reportedCostUsd: 0.01,
    })
    expect(inserts[0].cost_usd).toBe(0.01)
    expect(inserts[0].provider).toBe('anthropic')
  })

  it('never prices a non-Anthropic provider with Anthropic rates; unreported cost is flagged, not invented', async () => {
    await recordAiUsage({
      taskType: 't',
      model: 'claude-haiku-4-5',
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
      provider: 'openrouter',
    })
    expect(inserts[0].cost_usd).toBe(0)
    expect(inserts[0].cost_per_input_mtok).toBeNull()
    expect(inserts[0].metadata).toMatchObject({ unpriced_model: 'claude-haiku-4-5' })
  })

  it('ignores a negative or non-finite reported cost and falls back to computed pricing', async () => {
    await recordAiUsage({ taskType: 't', model: 'claude-haiku-4-5', inputTokens: 1_000_000, outputTokens: 0, reportedCostUsd: -5 })
    await recordAiUsage({ taskType: 't', model: 'claude-haiku-4-5', inputTokens: 1_000_000, outputTokens: 0, reportedCostUsd: Number.NaN })
    expect(inserts[0].cost_usd).toBeCloseTo(1, 6)
    expect(inserts[1].cost_usd).toBeCloseTo(1, 6)
  })
})
