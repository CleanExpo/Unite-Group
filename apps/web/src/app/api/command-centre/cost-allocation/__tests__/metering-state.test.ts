import { describe, expect, it } from 'vitest'

import { resolveMeteringState } from '../route'

// The failure this guards: /api/cron/cost-ingest IS registered in vercel.json
// and runs on schedule, but returns {dormant:true} while COST_METERING_ENABLED
// is unset and {wired:0} while COST_FETCHERS is empty. Before this state
// existed, the deck badged the tile 'live' on any successful fetch, so a
// scheduled no-op was indistinguishable from active cost collection.
describe('resolveMeteringState', () => {
  it('is dormant when the enable flag is unset', () => {
    expect(resolveMeteringState(undefined, 0)).toBe('dormant')
    expect(resolveMeteringState(undefined, 3)).toBe('dormant')
  })

  it('is dormant for any value other than the exact string "true"', () => {
    for (const value of ['false', '1', 'TRUE', 'yes', '']) {
      expect(resolveMeteringState(value, 3)).toBe('dormant')
    }
  })

  it('is a scheduled no-op when enabled with no fetcher wired', () => {
    expect(resolveMeteringState('true', 0)).toBe('scheduled_noop')
  })

  it('is collecting only when enabled AND at least one fetcher is wired', () => {
    expect(resolveMeteringState('true', 1)).toBe('collecting')
  })

  it('never reports collecting on the current repository state', () => {
    // COST_FETCHERS is [] on this branch by design — provider billing shapes
    // are not confirmed, and guessing one would write dirty data.
    expect(resolveMeteringState('true', 0)).not.toBe('collecting')
    expect(resolveMeteringState(undefined, 0)).not.toBe('collecting')
  })
})
