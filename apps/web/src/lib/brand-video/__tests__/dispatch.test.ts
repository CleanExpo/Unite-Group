import { describe, expect, it, vi } from 'vitest'
import {
  decideBrandVideoDispatch,
  dispatchBrandVideoWorkflow,
  isBrandVideoDispatchLive,
} from '../dispatch'

describe('decideBrandVideoDispatch', () => {
  it('skips empty queue', () => {
    expect(
      decideBrandVideoDispatch({
        queued: 0,
        githubTokenConfigured: true,
        dispatchEnabled: true,
      }),
    ).toEqual({ action: 'skip', reason: 'empty_queue', queued: 0 })
  })

  it('skips when GitHub token missing', () => {
    expect(
      decideBrandVideoDispatch({
        queued: 2,
        githubTokenConfigured: false,
        dispatchEnabled: true,
      }),
    ).toEqual({ action: 'skip', reason: 'github_not_configured', queued: 2 })
  })

  it('skips when dispatch not armed', () => {
    expect(
      decideBrandVideoDispatch({
        queued: 1,
        githubTokenConfigured: true,
        dispatchEnabled: false,
      }),
    ).toEqual({ action: 'skip', reason: 'dispatch_disabled', queued: 1 })
  })

  it('dispatches when armed with queue + token', () => {
    expect(
      decideBrandVideoDispatch({
        queued: 3,
        githubTokenConfigured: true,
        dispatchEnabled: true,
      }),
    ).toEqual({ action: 'dispatch', queued: 3 })
  })
})

describe('isBrandVideoDispatchLive', () => {
  it('requires explicit BRAND_VIDEO_DISPATCH_LIVE=1', () => {
    expect(isBrandVideoDispatchLive({})).toBe(false)
    expect(isBrandVideoDispatchLive({ BRAND_VIDEO_DISPATCH_LIVE: '0' })).toBe(
      false,
    )
    expect(isBrandVideoDispatchLive({ BRAND_VIDEO_DISPATCH_LIVE: '1' })).toBe(
      true,
    )
  })
})

describe('dispatchBrandVideoWorkflow', () => {
  it('POSTs workflow_dispatch and treats 204 as success', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      json: async () => ({}),
    })
    const result = await dispatchBrandVideoWorkflow({
      token: 'ghp_test',
      fetchImpl: fetchImpl as never,
    })
    expect(result).toEqual({ ok: true, status: 204 })
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining(
        '/actions/workflows/brand-video-render.yml/dispatches',
      ),
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('surfaces GitHub error messages', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ message: 'Resource not accessible by integration' }),
    })
    const result = await dispatchBrandVideoWorkflow({
      token: 'ghp_test',
      fetchImpl: fetchImpl as never,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.status).toBe(403)
      expect(result.message).toMatch(/Resource not accessible/)
    }
  })
})
