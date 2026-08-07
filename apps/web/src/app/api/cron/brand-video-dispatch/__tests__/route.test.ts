import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/cron-auth', () => ({
  assertCronAuth: vi.fn(),
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(),
}))

vi.mock('@/lib/brand-video/dispatch', async () => {
  const actual = await vi.importActual<typeof import('@/lib/brand-video/dispatch')>(
    '@/lib/brand-video/dispatch',
  )
  return {
    ...actual,
    dispatchBrandVideoWorkflow: vi.fn(),
    isBrandVideoDispatchLive: vi.fn(),
  }
})

import { assertCronAuth } from '@/lib/cron-auth'
import { createServiceClient } from '@/lib/supabase/service'
import {
  dispatchBrandVideoWorkflow,
  isBrandVideoDispatchLive,
} from '@/lib/brand-video/dispatch'
import { GET } from '../route'

describe('GET /api/cron/brand-video-dispatch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('GITHUB_TOKEN', 'ghp_test_token_value')
    vi.mocked(assertCronAuth).mockReturnValue(null)
    vi.mocked(isBrandVideoDispatchLive).mockReturnValue(false)
  })

  it('returns 401/500 when cron auth denies', async () => {
    vi.mocked(assertCronAuth).mockReturnValue(
      new Response(JSON.stringify({ error: 'Unauthorised' }), { status: 401 }) as never,
    )
    const res = await GET(new Request('http://localhost/api/cron/brand-video-dispatch'))
    expect(res.status).toBe(401)
  })

  it('reports empty queue without dispatching', async () => {
    vi.mocked(createServiceClient).mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => Promise.resolve({ count: 0, error: null }),
        }),
      }),
    } as never)

    const res = await GET(new Request('http://localhost/api/cron/brand-video-dispatch'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({
      queued: 0,
      dispatched: false,
      reason: 'empty_queue',
    })
    expect(dispatchBrandVideoWorkflow).not.toHaveBeenCalled()
  })

  it('reports dispatch_disabled when queue has jobs but live flag off', async () => {
    vi.mocked(createServiceClient).mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => Promise.resolve({ count: 2, error: null }),
        }),
      }),
    } as never)

    const res = await GET(new Request('http://localhost/api/cron/brand-video-dispatch'))
    const body = await res.json()
    expect(body).toMatchObject({
      queued: 2,
      dispatched: false,
      reason: 'dispatch_disabled',
    })
    expect(dispatchBrandVideoWorkflow).not.toHaveBeenCalled()
  })

  it('dispatches when armed', async () => {
    vi.mocked(isBrandVideoDispatchLive).mockReturnValue(true)
    vi.mocked(createServiceClient).mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => Promise.resolve({ count: 1, error: null }),
        }),
      }),
    } as never)
    vi.mocked(dispatchBrandVideoWorkflow).mockResolvedValue({
      ok: true,
      status: 204,
    })

    const res = await GET(new Request('http://localhost/api/cron/brand-video-dispatch'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.dispatched).toBe(true)
    expect(dispatchBrandVideoWorkflow).toHaveBeenCalled()
  })
})
