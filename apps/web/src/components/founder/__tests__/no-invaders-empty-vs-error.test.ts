import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// Source guards for the No-Invaders empty-vs-error fixes in components that are
// awkward to render-test (internal panels / click-gated fetches). They lock the
// invariant: a failed fetch shows an honest error, never an empty-as-real state.
const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8')

describe('founder components — failed load is not rendered as empty', () => {
  it('SocialPageClient surfaces a load error instead of zero experiments', () => {
    const src = read('src/components/founder/social/SocialPageClient.tsx')
    expect(src).toContain('Analytics unavailable')
    expect(src).toContain('Experiments unavailable')
    // The old swallow (catch -> empty list) must be gone.
    expect(src).not.toContain('.catch(() => setExperiments([]))')
  })

  it('BASTab surfaces a load error instead of an empty quarter', () => {
    const src = read('src/components/founder/bookkeeper/tabs/BASTab.tsx')
    expect(src).toContain('setTransactionsError')
    expect(src).toContain('load transactions for this quarter')
  })
})
