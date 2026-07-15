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

  it('AnalyticsDashboard surfaces a load error instead of the empty state (H7)', () => {
    const src = read('src/components/founder/analytics/AnalyticsDashboard.tsx')
    expect(src).toContain('setLoadError')
    expect(src).toContain('Analytics unavailable')
    // The empty state must be gated on the absence of a load error.
    expect(src).toContain('!loading && !loadError && analytics.length === 0')
    // The old swallow (failed fetch -> empty-as-real) must be gone.
    expect(src).toContain('if (!res.ok) throw new Error')
  })
})

// Wave A part 2 honesty invariants (UNI-2373 register H1/H4/H8, P2/P7) — source
// guards in the same style as above for surfaces that are awkward to render-test.
describe('command-centre — honest states over theatre', () => {
  it('QueueBoard renders running sessions as waiting for a runner (H1)', () => {
    const src = read('src/app/(founder)/founder/command-centre/QueueBoard.tsx')
    expect(src).toContain('waiting for runner — none connected')
  })

  it('QueueBoard cold-load never claims 0 TASKS · OFFLINE while the first fetch is in flight (H4)', () => {
    const src = read('src/app/(founder)/founder/command-centre/QueueBoard.tsx')
    expect(src).toContain("'connecting' | 'live' | 'offline'")
    expect(src).toContain('Loading tasks…')
    expect(src).toContain('Connecting…')
  })

  it('DeckThemeShell renders the server default until the persisted store hydrates (H8 / React #418)', () => {
    const src = read('src/app/(founder)/founder/command-centre/DeckThemeShell.tsx')
    expect(src).toContain('const [hydrated, setHydrated] = useState(false)')
    expect(src).toContain("hydrated ? deckTheme === 'daylight' : true")
  })

  it('the approvals page decision surface is wired, not decorative (P2)', () => {
    const src = read('src/components/founder/approvals/ApprovalQueue.tsx')
    expect(src).toContain('/api/approvals/')
    expect(src).toContain("decide(item.id, 'approve')")
    expect(src).toContain("decide(item.id, 'reject')")
  })

  it('the skill_health producer the dashboard references actually exists (P7)', () => {
    // SkillHealthDashboard tells the founder to run this script; it must exist.
    const dashboard = read('src/components/founder/skills/SkillHealthDashboard.tsx')
    expect(dashboard).toContain('node scripts/skill-eval-runner.mjs --all')
    const script = read('scripts/skill-eval-runner.mjs')
    expect(script).toContain('skill_health')
    expect(script).toContain('--dry-run')
  })
})
