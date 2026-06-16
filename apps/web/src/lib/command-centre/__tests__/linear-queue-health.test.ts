import { describe, it, expect } from 'vitest'
import {
  computeQueueHealth,
  buildConfigReadiness,
  type QueueConfigReadiness,
} from '@/lib/command-centre/linear-queue-health'
import { BLOCKED_LABEL_PREFIX, type ClaimCandidate } from '@/lib/command-centre/linear-claim'

const ACCEPTANCE = '## Acceptance Criteria\n* Ship it.'
const NOW = '2026-06-16T12:00:00.000Z'
const STALE_AFTER = 30 * 60 * 1000 // 30 minutes

function makeCandidate(overrides: Partial<ClaimCandidate> = {}): ClaimCandidate {
  return {
    id: 'uuid-1',
    identifier: 'UNI-1000',
    title: 'Do the autonomous thing',
    priority: 2,
    description: ACCEPTANCE,
    createdAt: '2026-06-16T07:48:00.000Z',
    url: 'https://linear.app/unite-group/issue/UNI-1000',
    stateName: 'Todo',
    stateType: 'unstarted',
    labels: ['pi-dev:autonomous'],
    blockedByOpenCount: 0,
    ...overrides,
  }
}

const READY: QueueConfigReadiness = {
  linearKeyPresent: true,
  liveSyncEnabled: true,
  teamConfigured: true,
  projectConfigured: true,
  ready: true,
}

describe('buildConfigReadiness — no secret leakage', () => {
  it('reports presence as booleans only and computes ready', () => {
    const r = buildConfigReadiness({ linearKey: 'lin_api_secret', live: '1', teamKey: 'UNI', projectName: 'Unite-Group' })
    expect(r).toEqual({
      linearKeyPresent: true,
      liveSyncEnabled: true,
      teamConfigured: true,
      projectConfigured: true,
      ready: true,
    })
    // Crucially: the secret value is nowhere in the output.
    expect(JSON.stringify(r)).not.toContain('lin_api_secret')
  })

  it('is not ready when the Linear key is missing', () => {
    const r = buildConfigReadiness({ linearKey: '', live: '0', teamKey: 'UNI', projectName: 'Unite-Group' })
    expect(r.linearKeyPresent).toBe(false)
    expect(r.liveSyncEnabled).toBe(false)
    expect(r.ready).toBe(false)
  })
})

describe('computeQueueHealth — five operator states', () => {
  it('MISCONFIGURED: not ready → unconfigured (no Linear calls implied)', () => {
    const report = computeQueueHealth({
      config: { ...READY, linearKeyPresent: false, ready: false },
      candidates: [],
      lastClaimedAt: null,
      now: NOW,
      staleAfterMs: STALE_AFTER,
    })
    expect(report.state).toBe('unconfigured')
    expect(report.summary).toMatch(/not configured/i)
  })

  it('IDLE: configured but no claimable work → idle (distinct from stale)', () => {
    const report = computeQueueHealth({
      config: READY,
      candidates: [],
      lastClaimedAt: '2026-06-16T11:55:00.000Z',
      now: NOW,
      staleAfterMs: STALE_AFTER,
    })
    expect(report.state).toBe('idle')
    expect(report.eligibleCount).toBe(0)
    expect(report.summary).toMatch(/nothing to do/i)
  })

  it('HEALTHY: eligible work present and recently claimed → healthy', () => {
    const report = computeQueueHealth({
      config: READY,
      candidates: [makeCandidate({ identifier: 'UNI-2145', priority: 1 })],
      lastClaimedAt: '2026-06-16T11:50:00.000Z', // 10m ago < 30m
      now: NOW,
      staleAfterMs: STALE_AFTER,
    })
    expect(report.state).toBe('healthy')
    expect(report.isStale).toBe(false)
    expect(report.nextClaimable?.identifier).toBe('UNI-2145')
  })

  it('STALE: eligible work waiting but last claim older than the interval', () => {
    const report = computeQueueHealth({
      config: READY,
      candidates: [makeCandidate({ identifier: 'UNI-2145' })],
      lastClaimedAt: '2026-06-16T11:00:00.000Z', // 60m ago > 30m
      now: NOW,
      staleAfterMs: STALE_AFTER,
    })
    expect(report.state).toBe('stale')
    expect(report.isStale).toBe(true)
    expect(report.summary).toMatch(/STALE/)
  })

  it('STALE: eligible work waiting and NO claim ever recorded', () => {
    const report = computeQueueHealth({
      config: READY,
      candidates: [makeCandidate()],
      lastClaimedAt: null,
      now: NOW,
      staleAfterMs: STALE_AFTER,
    })
    expect(report.state).toBe('stale')
    expect(report.msSinceLastClaim).toBeNull()
  })

  it('CREDENTIAL-BLOCKED: autonomous work present but all blocked → all-blocked', () => {
    const report = computeQueueHealth({
      config: READY,
      candidates: [
        makeCandidate({ identifier: 'UNI-2142', labels: ['pi-dev:autonomous', `${BLOCKED_LABEL_PREFIX}credentials`] }),
      ],
      lastClaimedAt: '2026-06-16T11:55:00.000Z',
      now: NOW,
      staleAfterMs: STALE_AFTER,
    })
    expect(report.state).toBe('all-blocked')
    expect(report.blockedCount).toBe(1)
    expect(report.eligibleCount).toBe(0)
    expect(report.summary).toMatch(/blocked/i)
  })

  it('distinguishes idle (no work) from stale (work not picked up)', () => {
    const idle = computeQueueHealth({ config: READY, candidates: [], lastClaimedAt: null, now: NOW, staleAfterMs: STALE_AFTER })
    const stale = computeQueueHealth({ config: READY, candidates: [makeCandidate()], lastClaimedAt: null, now: NOW, staleAfterMs: STALE_AFTER })
    expect(idle.state).toBe('idle')
    expect(stale.state).toBe('stale')
  })
})
