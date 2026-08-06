import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/cron-auth', () => ({
  assertCronAuth: vi.fn(),
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(),
}))

import { assertCronAuth } from '@/lib/cron-auth'
import { createServiceClient } from '@/lib/supabase/service'
import { GET } from '../route'

type TableResult = { data: unknown; error: unknown }

function mockClient(handlers: Record<string, () => TableResult | Promise<TableResult>>) {
  return {
    from: (table: string) => {
      const run = async () => {
        const handler = handlers[table]
        if (!handler) return { data: null, error: { message: `unexpected table ${table}` } }
        return handler()
      }
      const chain: Record<string, unknown> = {}
      const self = () => chain
      chain.select = self
      chain.eq = self
      chain.in = self
      chain.upsert = vi.fn(async () => ({ data: null, error: null }))
      // terminal
      Object.assign(chain, {
        then: (resolve: (v: TableResult) => unknown, reject?: (e: unknown) => unknown) =>
          Promise.resolve(run()).then(resolve, reject),
      })
      return chain
    },
  }
}

describe('GET /api/cron/experiment-results-ingest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(assertCronAuth).mockReturnValue(null)
  })

  it('returns 401/500 when cron auth denies', async () => {
    vi.mocked(assertCronAuth).mockReturnValue(
      new Response(JSON.stringify({ error: 'Unauthorised' }), { status: 401 }) as never,
    )
    const res = await GET(new Request('http://localhost/api/cron/experiment-results-ingest'))
    expect(res.status).toBe(401)
  })

  it('reports zero when no running experiments', async () => {
    vi.mocked(createServiceClient).mockReturnValue(
      mockClient({
        experiments: () => ({ data: [], error: null }),
      }) as never,
    )

    const res = await GET(new Request('http://localhost/api/cron/experiment-results-ingest'))
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      experiments: 0,
      upserted: 0,
      message: 'No running experiments',
    })
  })

  it('upserts aggregated results from platform_analytics', async () => {
    const upsert = vi.fn(async () => ({ data: null, error: null }))

    vi.mocked(createServiceClient).mockReturnValue({
      from: (table: string) => {
        if (table === 'experiments') {
          return {
            select: () => ({
              eq: () => Promise.resolve({ data: [{ id: 'exp-1' }], error: null }),
            }),
          }
        }
        if (table === 'experiment_variants') {
          return {
            select: () => ({
              in: () =>
                Promise.resolve({
                  data: [
                    { id: 'var-a', experiment_id: 'exp-1', founder_id: 'f1' },
                  ],
                  error: null,
                }),
            }),
          }
        }
        if (table === 'social_posts') {
          return {
            select: () => ({
              in: () =>
                Promise.resolve({
                  data: [
                    {
                      id: 'sp-1',
                      founder_id: 'f1',
                      experiment_variant_id: 'var-a',
                      platform_post_ids: { facebook: 'fb-1' },
                    },
                  ],
                  error: null,
                }),
            }),
          }
        }
        if (table === 'platform_analytics') {
          return {
            select: () => ({
              in: () =>
                Promise.resolve({
                  data: [
                    {
                      social_post_id: 'sp-1',
                      post_external_id: 'fb-1',
                      metric_date: '2026-08-01',
                      platform: 'facebook',
                      impressions: 42,
                      reach: 30,
                      clicks: 4,
                      likes: 2,
                      comments: 1,
                      shares: 0,
                      saves: 0,
                    },
                  ],
                  error: null,
                }),
            }),
          }
        }
        if (table === 'experiment_results') {
          return { upsert }
        }
        throw new Error(`unexpected ${table}`)
      },
    } as never)

    const res = await GET(new Request('http://localhost/api/cron/experiment-results-ingest'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({
      experiments: 1,
      linkedPosts: 1,
      upserted: 1,
      source: 'api_sync',
    })
    expect(upsert).toHaveBeenCalledTimes(1)
    const [rows, opts] = upsert.mock.calls[0] as [unknown[], { onConflict: string }]
    expect(opts.onConflict).toBe('variant_id,period_date')
    expect(rows[0]).toMatchObject({
      variant_id: 'var-a',
      experiment_id: 'exp-1',
      impressions: 42,
      source: 'api_sync',
    })
  })
})
