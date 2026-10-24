import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PURGE_INTERVAL_MS, __resetPurgeThrottleForTests, maybePurgeSiteEvents } from '../site-events-retention'

beforeEach(() => {
  __resetPurgeThrottleForTests()
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

describe('maybePurgeSiteEvents', () => {
  it('calls site_events_purge once, then not again inside the interval, then again after it', async () => {
    const rpc = vi.fn(() => Promise.resolve({ data: 3, error: null }))
    const t0 = 1_000_000_000_000
    expect(await maybePurgeSiteEvents({ rpc }, t0)).toBe(true)
    expect(await maybePurgeSiteEvents({ rpc }, t0 + 1000)).toBe(false)
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(rpc).toHaveBeenCalledWith('site_events_purge')
    expect(await maybePurgeSiteEvents({ rpc }, t0 + PURGE_INTERVAL_MS + 1)).toBe(true)
    expect(rpc).toHaveBeenCalledTimes(2)
  })

  it('never throws, logs, and retries at the next opportunity after a failure', async () => {
    const bad = vi.fn(() => Promise.resolve({ data: null, error: { message: 'nope' } }))
    expect(await maybePurgeSiteEvents({ rpc: bad }, 5_000_000_000_000)).toBe(false)
    expect(console.error).toHaveBeenCalled()
    const thrower = vi.fn(() => {
      throw new Error('down')
    })
    expect(await maybePurgeSiteEvents({ rpc: thrower }, 5_000_000_000_001)).toBe(false)
    const ok = vi.fn(() => Promise.resolve({ data: 0, error: null }))
    expect(await maybePurgeSiteEvents({ rpc: ok }, 5_000_000_000_002)).toBe(true)
  })
})
