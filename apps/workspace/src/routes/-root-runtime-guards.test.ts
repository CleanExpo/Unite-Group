import { describe, expect, it, vi } from 'vitest'
import { APP_CSP, unregisterServiceWorkers, wrapInlineScript } from './__root'

describe('root runtime guards', () => {
  it('wraps inline scripts in a top-level try/catch', () => {
    const wrapped = wrapInlineScript('window.answer = 42;')
    expect(wrapped).toContain('try {')
    expect(wrapped).toContain('window.answer = 42;')
    expect(wrapped).toContain("console.error('Inline bootstrap script failed'")
  })

  it('does not permit the removed Monaco CDN in script or style policy', () => {
    expect(APP_CSP).not.toContain('cdn.jsdelivr.net')
    expect(APP_CSP).toContain("script-src 'self' 'unsafe-inline'")
  })

  it('swallows getRegistrations rejections', async () => {
    const getRegistrations = vi.fn().mockRejectedValue(new Error('boom'))
    const unregister = vi.fn()

    await expect(
      unregisterServiceWorkers({
        serviceWorker: { getRegistrations },
        cachesApi: {
          keys: vi.fn().mockResolvedValue(['stale']),
          delete: unregister,
        },
      }),
    ).resolves.toBeUndefined()

    expect(getRegistrations).toHaveBeenCalledTimes(1)
    expect(unregister).toHaveBeenCalledWith('stale')
  })
})
