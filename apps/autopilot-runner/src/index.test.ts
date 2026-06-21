import { describe, it, expect, vi, afterEach } from 'vitest'
import { main } from './index'

afterEach(() => vi.restoreAllMocks())

describe('main (entrypoint, non-network paths)', () => {
  it('drains (returns 0) when the kill switch is off', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    expect(await main({})).toBe(0)
  })

  it('errors (returns 1) when live but handoff config is missing', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    expect(await main({ CC_LINEAR_LIVE: '1' })).toBe(1)
  })
})
