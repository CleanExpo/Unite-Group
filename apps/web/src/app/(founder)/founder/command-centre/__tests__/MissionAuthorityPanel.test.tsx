import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import policy from '../../../../../../../../scripts/nexus-runner/mission-authority.json'
import type { CommandCentreTask } from '@/lib/command-centre/tasks'
import type { MissionAuthority } from '@/lib/mission-authority/may'
import { buildMissionAuthorityView } from '@/lib/mission-authority/authority-view'
import { interruptionMetric } from '@/lib/mission-authority/interruptions'
import { MissionAuthorityPanelView } from '../MissionAuthorityPanel'

// UNI-2779 — the panel shows the runner's own verdict: continue inside the
// mission authority, or stop at a named action for the founder.

const INTENT_HASH = 'b'.repeat(64)
const AUTHORITY: MissionAuthority = {
  missionId: 'task-1', intentHash: INTENT_HASH, intentVersion: 1, admissionReceipt: 'approval-1',
  authorityVersion: policy.schema, allowedActions: Object.keys(policy.build),
  releaseMandate: { classes: [], maxRisk: 'low' }, expiresAt: null, revokedAt: null,
}

function task(mission?: Record<string, unknown>): Pick<CommandCentreTask, 'id' | 'linear_id' | 'external_ref' | 'risk_level' | 'metadata'> {
  return {
    id: 'task-1', linear_id: 'UNI-2779', external_ref: null, risk_level: 'low',
    metadata: mission ? { mission: {
      mission_id: 'task-1', intent_hash: INTENT_HASH, authority_version: policy.schema, status: 'active',
      candidate_sha: 'c'.repeat(40), last_verified_sha: null, blocked_reason: null, attempt_count: 1, receipts: [],
      updated_at: '2026-09-27T01:00:00.000Z', ...mission,
    } } : {},
  }
}

const NOW = Date.parse('2026-09-27T02:00:00.000Z')
function renderFor(t: ReturnType<typeof task>, metric = interruptionMetric([], [])) {
  const view = buildMissionAuthorityView(t, AUTHORITY, NOW)
  render(<MissionAuthorityPanelView data={{ view, interruptions: { metric, truncated: false } }} />)
}
const field = (name: string) => screen.getByText(name, { selector: 'dt' }).nextElementSibling as HTMLElement

describe('MissionAuthorityPanelView', () => {
  it('shows a build step continuing inside the accepted mission authority', () => {
    renderFor(task({ phase: 'BUILD_CONTINUE', next_action: 'test' }))
    expect(field('Mission')).toHaveTextContent('UNI-2779 · task-1')
    expect(field('Authority')).toHaveTextContent('BUILD_CONTINUE')
    expect(field('Current')).toHaveTextContent('BUILD_CONTINUE')
    expect(field('Next')).toHaveTextContent('test')
    expect(field('Why continuing')).toHaveTextContent('Inside accepted mission authority')
    expect(screen.queryByText('Stopped at')).not.toBeInTheDocument()
  })

  it('stops promote_production at the protected release boundary and shows the founder packet', () => {
    renderFor(task({ phase: 'RELEASE_CANDIDATE', next_action: 'promote_production' }))
    expect(field('Authority')).toHaveTextContent('PROTECTED_RELEASE')
    expect(field('Stopped at')).toHaveTextContent('promote_production')
    expect(field('Why')).toHaveTextContent('protected action')
    expect(field('Why')).toHaveTextContent('Approve this one action')
    expect(screen.queryByText('Why continuing')).not.toBeInTheDocument()
  })

  it('says honestly when no continuation is recorded, with no placeholder mission', () => {
    renderFor(task())
    expect(screen.getByText(/No mission continuation is recorded/)).toBeInTheDocument()
    expect(screen.queryByText('Mission', { selector: 'dt' })).not.toBeInTheDocument()
    expect(screen.queryByText('Authority', { selector: 'dt' })).not.toBeInTheDocument()
  })

  it('sets the protected boundary class apart and shows no rate without a verified outcome', () => {
    const metric = interruptionMetric([
      { id: '1', task_id: 'task-1', type: 'comment', at: '2026-09-27T00:00:00.000Z', payload: { kind: 'interruption', class: 'LEGITIMATE_PROTECTED_BOUNDARY', source: 'runner', reason: 'r' } },
      { id: '2', task_id: 'task-1', type: 'comment', at: '2026-09-27T00:00:00.000Z', payload: { kind: 'interruption', class: 'BROKEN_TOOL', source: 'runner', reason: 'r' } },
    ], [])
    renderFor(task(), metric)
    const summary = screen.getByRole('region', { name: 'Founder interruptions' })
    expect(summary).toHaveTextContent('2 interruptions recorded; no verified outcome yet')
    const items = within(summary).getAllByRole('listitem')
    const protectedItems = items.filter(item => item.dataset.protected === 'true')
    expect(protectedItems).toHaveLength(1)
    expect(protectedItems[0]).toHaveTextContent('LEGITIMATE_PROTECTED_BOUNDARY')
    expect(protectedItems[0]).toHaveTextContent('1')
  })
})
