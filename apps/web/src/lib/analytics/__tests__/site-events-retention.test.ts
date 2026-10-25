import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PURGE_INTERVAL_MS, PURGE_RETRY_MS, __resetPurgeThrottleForTests, maybePurgeSiteEvents } from '../site-events-retention'

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

  it('never throws, logs, and retries after the short retry delay once a purge fails', async () => {
    const t0 = 5_000_000_000_000
    const bad = vi.fn(() => Promise.resolve({ data: null, error: { message: 'nope' } }))
    expect(await maybePurgeSiteEvents({ rpc: bad }, t0)).toBe(false)
    expect(console.error).toHaveBeenCalled()
    const thrower = vi.fn(() => {
      throw new Error('down')
    })
    expect(await maybePurgeSiteEvents({ rpc: thrower }, t0 + PURGE_RETRY_MS)).toBe(false)
    const ok = vi.fn(() => Promise.resolve({ data: 0, error: null }))
    expect(await maybePurgeSiteEvents({ rpc: ok }, t0 + 2 * PURGE_RETRY_MS)).toBe(true)
  })

  // UNI-3004: a failure used to reset the throttle to zero, so a database outage ran one purge RPC
  // and logged one error on EVERY intake request.
  it('UNI-3004 does not retry a failed purge on the next request, only after the bounded retry delay', async () => {
    const t0 = 7_000_000_000_000
    const bad = vi.fn(() => Promise.resolve({ data: null, error: { message: 'db down' } }))
    expect(await maybePurgeSiteEvents({ rpc: bad }, t0)).toBe(false)
    for (let i = 1; i <= 50; i++) await maybePurgeSiteEvents({ rpc: bad }, t0 + i * 1000)
    expect(bad).toHaveBeenCalledTimes(1)
    expect(console.error).toHaveBeenCalledTimes(1)
    expect(await maybePurgeSiteEvents({ rpc: bad }, t0 + PURGE_RETRY_MS - 1)).toBe(false)
    expect(bad).toHaveBeenCalledTimes(1)
    await maybePurgeSiteEvents({ rpc: bad }, t0 + PURGE_RETRY_MS)
    expect(bad).toHaveBeenCalledTimes(2)
  })

  it('UNI-3004 keeps the retry delay bounded: well under the six-hour interval', () => {
    expect(PURGE_RETRY_MS).toBeGreaterThanOrEqual(60_000)
    expect(PURGE_RETRY_MS).toBeLessThanOrEqual(PURGE_INTERVAL_MS / 6)
  })
})
