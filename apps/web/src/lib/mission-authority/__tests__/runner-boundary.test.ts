import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/command-centre/delivery-store', async (orig) => {
  const actual = await orig<typeof import('@/lib/command-centre/delivery-store')>()
  return { ...actual, getApprovedDelivery: vi.fn() }
})

import policy from '../../../../../../scripts/nexus-runner/mission-authority.json'
import { getApprovedDelivery } from '@/lib/command-centre/delivery-store'
import type { CommandCentreTask } from '@/lib/command-centre/tasks'
import { taskPrompt } from '../../../../../../scripts/nexus-runner/runner.mjs'
import { missionClaimVerdict } from '../runner-boundary'

// UNI-2779 — the claim side of the service boundary: a mission is claimable only
// when may() continues its first build step against the authority the row
// holds, and its persisted next step travels with the claim.

const INTENT_HASH = 'b'.repeat(64)
const NOW = Date.parse('2026-09-27T02:00:00.000Z')

function row(metadata: Record<string, unknown>, external_ref: string | null = 'delivery:request-1'): CommandCentreTask {
  return {
    id: 'task-1', founder_id: 'founder-1', external_ref, queue_id: null, project_id: null, project_key: 'unite-group',
    title: 'Mission', objective: 'Do the thing', priority: 'P2', status: 'queued', agent_owner: null, risk_level: 'low',
    execution_mode: 'branch-preview', origin: 'idea', dependencies: [], human_approval_required: true, evidence_path: null,
    validation_required: [], linear_id: null, preview_url: null, metadata,
    created_at: '2026-09-27T00:00:00.000Z', updated_at: '2026-09-27T00:00:00.000Z',
  }
}

const continuation = (next_action: string, phase = 'BUILD_CONTINUE') => ({
  mission_id: 'task-1', intent_hash: INTENT_HASH, authority_version: policy.schema, phase, status: 'active',
  candidate_sha: 'c'.repeat(40), last_verified_sha: null, next_action, blocked_reason: null, attempt_count: 2,
  receipts: [], updated_at: '2026-09-27T01:00:00.000Z',
})

const approvedWithIntent = { approval: { id: 'approval-1', intent: { hash: INTENT_HASH, version: 1, acceptedAt: null } } }

describe('missionClaimVerdict', () => {
  beforeEach(() => vi.mocked(getApprovedDelivery).mockReturnValue(approvedWithIntent as never))

  it('leaves a legacy row on its old contract', () => {
    expect(missionClaimVerdict(row({}, null), NOW)).toEqual({ claimable: true, mission: null })
  })

  it('refuses a delivery whose approval resolves no authority (never bound to an accepted intent)', () => {
    vi.mocked(getApprovedDelivery).mockReturnValue({ approval: { id: 'approval-1' } } as never)
    const verdict = missionClaimVerdict(row({ delivery: { kind: 'software_delivery' } }), NOW)
    expect(verdict).toMatchObject({ claimable: false, reason: expect.stringMatching(/no persisted mission authority/) })
  })

  it('refuses a continuation planted on a row with no delivery approval', () => {
    vi.mocked(getApprovedDelivery).mockReturnValue(null)
    expect(missionClaimVerdict(row({ mission: continuation('repair') }, null), NOW).claimable).toBe(false)
  })

  it('refuses a damaged continuation instead of treating it as none', () => {
    expect(missionClaimVerdict(row({ delivery: {}, mission: { next_action: 'repair' } }), NOW)).toMatchObject({
      claimable: false, reason: expect.stringMatching(/continuation unreadable/),
    })
  })

  it('carries the binding, the stored continuation and an execute verdict on a build next_action', () => {
    const verdict = missionClaimVerdict(row({ delivery: {}, mission: continuation('repair') }), NOW)
    expect(verdict).toMatchObject({
      claimable: true,
      mission: {
        binding: { mission_id: 'task-1', intent_hash: INTENT_HASH, authority_version: policy.schema },
        continuation: { next_action: 'repair', attempt_count: 2 },
        nextStep: { execute: true, action: 'repair' },
      },
    })
  })

  it.each(['merge', 'promote_production'])('a saved %s boundary is claimable but never executed', (action) => {
    const verdict = missionClaimVerdict(row({ delivery: {}, mission: continuation(action, 'RELEASE_CANDIDATE') }), NOW)
    expect(verdict).toMatchObject({ claimable: true, mission: { nextStep: { execute: false, boundary: 'PROTECTED_RELEASE' } } })
    // …and the runner is never told to do it.
    const prompt = taskPrompt({ title: 'Mission', objective: 'x', mission: verdict.claimable ? verdict.mission : null })
    expect(prompt).not.toContain('DO THIS NOW')
  })
})

describe('runner resume prompt', () => {
  beforeEach(() => vi.mocked(getApprovedDelivery).mockReturnValue(approvedWithIntent as never))

  it('states the authorised next_action as the thing to do now, with no ask-to-continue framing', () => {
    const verdict = missionClaimVerdict(row({ delivery: {}, mission: continuation('repair') }), NOW)
    const prompt = taskPrompt({ title: 'Mission', objective: 'x', mission: verdict.claimable ? verdict.mission : null })
    expect(prompt).toContain(`DO THIS NOW: repair — ${policy.build.repair}.`)
    expect(prompt).toContain('ATTEMPT: 2')
    const resume = prompt.slice(prompt.indexOf('MISSION STATE'), prompt.indexOf('AUTHORITY ('))
    expect(resume).toContain('DO THIS NOW')
    expect(resume).not.toMatch(/should I|shall I|would you like|do you want me|ask the founder/i)
    expect(prompt).not.toContain('RUNNER_REQUEUE')
  })
})
