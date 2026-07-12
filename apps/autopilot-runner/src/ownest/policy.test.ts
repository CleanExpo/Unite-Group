import { describe, expect, it } from 'vitest'
import {
  evaluateEligibility,
  extractOwnestState,
  idempotencyKey,
  mapHermesStatus,
  redactMissionText,
} from './policy.js'
import type { CcTask, OwnestStateV1 } from './types.js'

function task(overrides: Partial<CcTask> = {}): CcTask {
  return {
    id: 'task-1',
    founder_id: 'founder-1',
    title: 'Research customer retention patterns',
    objective: 'Prepare an internal advisory brief with cited evidence.',
    priority: 'P2',
    status: 'queued',
    agent_owner: 'Hermes',
    risk_level: 'low',
    execution_mode: 'advisory',
    dependencies: [],
    human_approval_required: false,
    validation_required: ['Cite the source data'],
    metadata: {},
    created_at: '2026-07-12T00:00:00.000Z',
    updated_at: '2026-07-12T00:00:00.000Z',
    ...overrides,
  }
}

const ownestState: OwnestStateV1 = {
  version: 1,
  crmTaskId: 'task-1',
  idempotencyKey: 'cc-task:task-1:v1',
  hermesTaskId: null,
  attemptId: 'attempt-1',
  leaseOwner: 'worker-1',
  leaseExpiresAt: '2026-07-12T00:05:00.000Z',
  lastHeartbeatAt: '2026-07-12T00:00:00.000Z',
  dispatchedAt: null,
  reconciledAt: null,
  evidenceUri: null,
  gateState: 'eligible',
  lastError: null,
}

describe('evaluateEligibility', () => {
  it.each([
    ['Hermes', 'low'],
    ['Nexus', 'medium'],
    ['Empire', 'low'],
  ] as const)('allows queued approval-free advisory work owned by %s at %s risk', (owner, risk) => {
    expect(evaluateEligibility(task({ agent_owner: owner, risk_level: risk }))).toEqual({ eligible: true })
  })

  it('matches allowed owners case-insensitively', () => {
    expect(evaluateEligibility(task({ agent_owner: 'hErMeS' }))).toEqual({ eligible: true })
    expect(evaluateEligibility(task({ agent_owner: 'NEXUS' }))).toEqual({ eligible: true })
    expect(evaluateEligibility(task({ agent_owner: 'empire' }))).toEqual({ eligible: true })
  })

  it('rejects missing and unrecognised owners', () => {
    expect(evaluateEligibility(task({ agent_owner: null }))).toMatchObject({ eligible: false })
    expect(evaluateEligibility(task({ agent_owner: 'OpenClaw' }))).toMatchObject({ eligible: false })
  })

  it('rejects work requiring human approval', () => {
    expect(evaluateEligibility(task({ human_approval_required: true }))).toMatchObject({ eligible: false })
  })

  it.each(['high', 'critical'] as const)('rejects %s-risk work', (risk) => {
    expect(evaluateEligibility(task({ risk_level: risk }))).toMatchObject({ eligible: false })
  })

  it.each(['local-code', 'branch-preview', 'overnight'] as const)('rejects %s execution mode', (mode) => {
    expect(evaluateEligibility(task({ execution_mode: mode }))).toMatchObject({ eligible: false })
  })

  it('rejects unresolved dependencies', () => {
    expect(evaluateEligibility(task({ dependencies: ['task-prerequisite'] }))).toMatchObject({ eligible: false })
  })

  it.each(['done', 'failed'] as const)('rejects terminal CRM status %s', (status) => {
    expect(evaluateEligibility(task({ status }))).toMatchObject({ eligible: false })
  })

  it('rejects an existing OWNEST dead letter', () => {
    expect(
      evaluateEligibility(
        task({ metadata: { ownest: { ...ownestState, gateState: 'dead_letter', lastError: 'retry limit' } } }),
      ),
    ).toMatchObject({ eligible: false })
  })

  it('rejects an existing Hermes mirror', () => {
    expect(
      evaluateEligibility(task({ metadata: { ownest: { ...ownestState, hermesTaskId: 'hermes-1' } } })),
    ).toMatchObject({ eligible: false })
  })

  it('fails closed when metadata.ownest exists but is malformed', () => {
    expect(evaluateEligibility(task({ metadata: { ownest: { version: 1, gateState: 'eligible' } } }))).toMatchObject({
      eligible: false,
    })
  })

  const dangerousTextCases = [
    ['production deploy', 'Deploy the application to production'],
    ['production mutation', 'Mutate the production database records'],
    ['payment', 'Pay the supplier invoice'],
    ['purchase', 'Purchase a new analytics subscription'],
    ['spend', 'Spend AUD 500 on advertising'],
    ['outbound publication', 'Publish the announcement publicly'],
    ['outbound message', 'Send an email to every customer'],
    ['credential access', 'Read the service role credentials'],
    ['privilege change', 'Grant administrator privileges'],
    ['destructive deletion', 'Delete the customer database'],
    ['access control', 'Change access control permissions'],
    ['branch protection', 'Disable branch protection on main'],
    ['merge action', 'Merge pull request 42 into main'],
  ] as const

  it.each(dangerousTextCases)('rejects dangerous title language: %s', (_category, title) => {
    expect(evaluateEligibility(task({ title }))).toMatchObject({ eligible: false })
  })

  const dangerousPhraseRegressions = [
    ['production migration', 'Run the database migration in production'],
    ['production migration reversed', 'Apply the database migration in production'],
    ['production migration target first', 'In production, execute the database migration'],
    ['outbound blog publication', 'Publish the company blog post'],
    ['outbound blog publication passive', 'The company blog post must be published'],
    ['outbound direct email', 'Email Phill the report'],
    ['outbound direct email passive', 'The report should be emailed to Phill'],
    ['credential rotation', 'API key rotation for production'],
    ['credential rotation reversed', 'Production rotation of the API key'],
    ['privilege escalation', 'Privilege escalation for the service account'],
    ['privilege escalation imperative', 'Escalate privileges for the service account'],
    ['protected branches', 'Disable protected branches on main'],
    ['protected branches reversed', 'Turn off protection for the main branch'],
    ['merge approved changes', 'Merge the approved changes'],
    ['merge approved changes passive', 'The approved changes must be merged'],
  ] as const

  it.each(dangerousPhraseRegressions)('rejects dangerous phrase regression: %s', (_category, title) => {
    expect(evaluateEligibility(task({ title }))).toEqual({ eligible: false, reason: 'dangerous-language' })
  })

  it.each([
    'Research production deployment best practices',
    'Analyse company blog publishing trends',
    'Review API key rotation policy options',
    'Compare protected branch strategies',
    'Research merge strategies for linear history',
  ])('preserves clearly advisory research: %s', (title) => {
    expect(evaluateEligibility(task({ title }))).toEqual({ eligible: true })
  })

  it('rejects dangerous objective language case-insensitively', () => {
    expect(evaluateEligibility(task({ objective: 'ROTATE THE API KEY and share it with the contractor' }))).toMatchObject({
      eligible: false,
    })
  })
})

describe('idempotencyKey', () => {
  it('builds the deterministic versioned CRM task key', () => {
    expect(idempotencyKey('task-1')).toBe('cc-task:task-1:v1')
  })
})

describe('redactMissionText', () => {
  it('redacts emails, bearer values, assignments, and common credential labels', () => {
    const input = [
      'Contact jane.ops+canary@example.com for the diagnostic.',
      'Authorization: Bearer bearer-value-123',
      'token=tok_123',
      'OPENAI_API_KEY: sk-live-456',
      'Password: hunter2',
      'Keep the diagnostic notes and evidence request.',
    ].join('\n')

    const redacted = redactMissionText(input)

    for (const secret of [
      'jane.ops+canary@example.com',
      'bearer-value-123',
      'tok_123',
      'sk-live-456',
      'hunter2',
    ]) {
      expect(redacted).not.toContain(secret)
    }
    expect(redacted).toContain('[REDACTED]')
    expect(redacted).toContain('Keep the diagnostic notes and evidence request.')
  })

  it('redacts quoted and human-readable credential-label values without discarding surrounding text', () => {
    const input =
      'Run a safe check with client_secret="quoted-value", API token: labelled-value, and service role key = role-value; then cite results.'

    const redacted = redactMissionText(input)

    expect(redacted).not.toContain('quoted-value')
    expect(redacted).not.toContain('labelled-value')
    expect(redacted).not.toContain('role-value')
    expect(redacted).toContain('Run a safe check')
    expect(redacted).toContain('then cite results.')
  })
})

describe('mapHermesStatus', () => {
  it('maps only Hermes done to CRM done', () => {
    expect(mapHermesStatus('done')).toBe('done')
  })

  it.each(['blocked', 'review'] as const)('maps Hermes %s to CRM blocked', (status) => {
    expect(mapHermesStatus(status)).toBe('blocked')
  })

  it.each(['archived', 'ready', 'running', 'scheduled', 'todo', 'triage', 'unknown-state'])(
    'keeps Hermes live and unknown state %s non-terminal',
    (status) => {
      expect(mapHermesStatus(status)).toBeNull()
    },
  )
})

describe('extractOwnestState', () => {
  it('returns a fully validated OWNEST v1 state', () => {
    expect(extractOwnestState({ ownest: ownestState })).toEqual(ownestState)
  })

  it('returns null when metadata has no OWNEST state', () => {
    expect(extractOwnestState({})).toBeNull()
  })

  it.each([
    null,
    [],
    { ...ownestState, version: 2 },
    { ...ownestState, crmTaskId: 42 },
    { ...ownestState, gateState: 'executing' },
    { ...ownestState, evidenceUri: 42 },
    { version: 1, crmTaskId: 'task-1' },
  ])('does not trust malformed metadata.ownest %#', (malformedOwnest) => {
    expect(extractOwnestState({ ownest: malformedOwnest })).toBeNull()
  })

  it('does not trust a non-record metadata container', () => {
    expect(extractOwnestState('not-metadata')).toBeNull()
  })
})
