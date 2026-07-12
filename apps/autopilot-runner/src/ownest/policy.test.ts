import { performance } from 'node:perf_hooks'
import { describe, expect, it } from 'vitest'
import {
  buildMissionContract,
  buildValidationRequirements,
  computeMissionDigest,
  deterministicUuid,
  evaluateEligibility,
  extractHardenedOwnestState,
  extractOwnestState,
  idempotencyKey,
  integrityNonceFromBytes,
  mapHermesStatus,
  redactMissionText,
  sha256Digest,
} from './policy.js'
import type {
  CcTask,
  HardenedOwnestStateV1,
  HmacSha256Digest,
  OwnestMissionContractV1,
  OwnestStateV1,
  Sha256Digest,
} from './types.js'

const MISSION_TEXT_LIMIT = 16 * 1024
const integrityNonce = '0123456789abcdef'.repeat(4)
const differentIntegrityNonce = 'fedcba9876543210'.repeat(4)

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

const hardenedOwnestState: HardenedOwnestStateV1 = {
  ...ownestState,
  claimedAt: '2026-07-12T00:00:00.000Z',
  rolloutId: 'ownest-canary-20260712',
  integrityNonce,
  missionDigest: computeMissionDigest(task(), integrityNonce),
  failureCount: 0,
  failureClass: null,
  failureCode: null,
  nextRetryAt: null,
  completionPhase: 'claimed',
  receiptSha256: null,
}

const hardeningFieldNames = [
  'claimedAt',
  'rolloutId',
  'integrityNonce',
  'missionDigest',
  'failureCount',
  'failureClass',
  'failureCode',
  'nextRetryAt',
  'completionPhase',
  'receiptSha256',
] as const

function assertIntegrityContractTypes(contract: OwnestMissionContractV1): void {
  const digest: Sha256Digest = sha256Digest('typed')
  const hmacDigest: HmacSha256Digest = computeMissionDigest(task(), integrityNonce)
  void digest
  void hmacDigest

  // @ts-expect-error SHA digests must come from a validating factory or runtime guard.
  const forged: Sha256Digest = 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
  void forged

  // @ts-expect-error Raw SHA-256 and HMAC-SHA-256 digests are not interchangeable.
  const hmacFromSha: HmacSha256Digest = digest
  // @ts-expect-error HMAC-SHA-256 is not an evidence/receipt SHA-256 digest.
  const shaFromHmac: Sha256Digest = hmacDigest
  void hmacFromSha
  void shaFromHmac

  // @ts-expect-error Mission contract fields are immutable after construction.
  contract.crmTaskId = 'other-task'
  // @ts-expect-error Validation requirements are immutable after construction.
  contract.validationRequirements.push(contract.validationRequirements[0])
  // @ts-expect-error Validation requirement fields are immutable after construction.
  if (contract.validationRequirements[0]) contract.validationRequirements[0].text = 'changed'
}
void assertIntegrityContractTypes

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

  it.each([
    ['gated', 'ownest-gated'],
    ['dead_letter', 'dead-letter'],
  ] as const)('rejects an existing OWNEST %s state', (gateState, reason) => {
    expect(
      evaluateEligibility(
        task({ metadata: { ownest: { ...ownestState, gateState, lastError: 'policy gate' } } }),
      ),
    ).toEqual({ eligible: false, reason })
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

  const nominalActionRegressions = [
    ['production deployment', 'Production deployment'],
    ['production deployment reversed', 'Deployment to production'],
    ['production database mutation', 'Production database mutation'],
    ['production database mutation reversed', 'Mutation of production database records'],
    ['outbound publication', 'Outbound publication of the weekly newsletter'],
    ['newsletter publication reversed', 'Weekly newsletter publication to customers'],
    ['credential disclosure', 'Credential disclosure to a contractor'],
    ['credential exposure', 'Exposure of credentials to a vendor'],
    ['RBAC update', 'Update RBAC rules'],
    ['access-control modification', 'Modify access control rules'],
    ['RLS update', 'Update row-level security policy'],
    ['branch-protection update', 'Update branch protection rules'],
    ['branch-protection modification', 'Modify the branch protection settings'],
    ['merge feature', 'Merge the feature'],
    ['merge without object', 'Merge it now'],
    ['merge question', 'Can you merge this?'],
    ['merge passive request', 'The feature must be merged'],
  ] as const

  it.each(nominalActionRegressions)('rejects nominal/action regression: %s', (_category, title) => {
    expect(evaluateEligibility(task({ title }))).toEqual({ eligible: false, reason: 'dangerous-language' })
  })

  it.each([
    ['production database action', 'Perform a production database migration'],
    ['outbound notification', 'Notify Jane about the delay'],
    ['credential copy', 'Copy the API key into the report'],
    ['privilege grant', 'Make Alice an admin'],
    ['destructive record removal', 'Remove all customer records'],
    ['branch unprotection', 'Unprotect the main branch'],
    ['pull-request landing', 'Land pull request 42'],
  ] as const)('rejects reviewed fail-open phrase: %s', (_category, title) => {
    expect(evaluateEligibility(task({ title }))).toEqual({ eligible: false, reason: 'dangerous-language' })
  })

  it.each([
    'Research payment trends',
    'Research how to deploy safely to production',
    'Research production deployment best practices',
    'Analyse company blog publishing trends',
    'Review API key rotation policy options',
    'Compare protected branch strategies',
    'Research merge strategies for linear history',
    'Review production database mutation risks',
    'Research outbound publication patterns',
    'Document credential disclosure controls',
    'Document the branch protection policy',
    'Document the RBAC policy',
    'Review a merge strategy',
  ])('preserves clearly advisory research: %s', (title) => {
    expect(evaluateEligibility(task({ title }))).toEqual({ eligible: true })
  })

  it.each([
    'Research payment and billing trends',
    'Review invoices and billing controls',
    'Research outbound publication and payment trends',
    'Research payment trends. Billing forecasts for next year',
  ])('preserves advisory context across noun-only clauses: %s', (title) => {
    expect(evaluateEligibility(task({ title }))).toEqual({ eligible: true })
  })

  it.each([
    'Research performance. The local benchmark should be run',
    'Review the evidence. The analysis should be performed against cited sources',
    'Research deployment policy. The strategy should be updated with current guidance',
  ])('allows target-free passive advisory work: %s', (title) => {
    expect(evaluateEligibility(task({ title }))).toEqual({ eligible: true })
  })

  it.each([
    'Research trends. Payment to the supplier',
    'Research merge options. The approved changes must be merged',
    'Research payment options. The supplier should be paid',
    'Research publication options. The report needs to be published',
    'Research outbound options. The report must be sent',
    'Research deployment options. The release should be deployed to production',
    'Research cleanup options. The records need to be deleted',
  ])('gates actionable clauses after an advisory introduction: %s', (title) => {
    expect(evaluateEligibility(task({ title }))).toEqual({
      eligible: false,
      reason: 'dangerous-language',
    })
  })

  it('rejects a mixed advisory and production action request', () => {
    expect(evaluateEligibility(task({ title: 'Research deployment options, then deploy to production' }))).toEqual({
      eligible: false,
      reason: 'dangerous-language',
    })
  })

  it.each([
    'Research payment options, then pay the supplier invoice',
    'Research credential storage, then retrieve the API key',
    'Research user roles, then elevate Alice to admin',
    'Research access-control options, then revoke permissions',
    'Research branch protection, then enable the main branch',
    'Research release options, then release to production',
    'Research announcements, then broadcast to customers',
    'Research cleanup options, then truncate the database',
    'Research payment options; charge the supplier account',
    'Research the release path, deploy to production',
    'Research review options and then land pull request 42',
  ])('rejects an advisory-prefixed hard-boundary sequence: %s', (title) => {
    expect(evaluateEligibility(task({ title }))).toEqual({
      eligible: false,
      reason: 'dangerous-language',
    })
  })

  it.each([
    'Research deployment options and deploy to production',
    'Review cleanup plan and delete all customer records',
    'Research options. Deploy to production',
  ])('limits advisory exemption to the advisory clause: %s', (title) => {
    expect(evaluateEligibility(task({ title }))).toEqual({
      eligible: false,
      reason: 'dangerous-language',
    })
  })

  it.each([
    {
      title: 'Perform the scheduled operation',
      objective: 'Production database migration',
    },
    {
      title: 'Copy the requested value',
      objective: 'API key for the service',
    },
  ])('gates action and target split across title and objective: $title', ({ title, objective }) => {
    expect(evaluateEligibility(task({ title, objective }))).toEqual({
      eligible: false,
      reason: 'dangerous-language',
    })
  })

  it('gates an unambiguous destructive action with a pronoun target', () => {
    expect(evaluateEligibility(task({ title: 'Delete it now' }))).toEqual({
      eligible: false,
      reason: 'dangerous-language',
    })
  })

  it('gates mission text over the explicit input bound before matching', () => {
    expect(evaluateEligibility(task({ title: 'a'.repeat(MISSION_TEXT_LIMIT + 1), objective: '' }))).toEqual({
      eligible: false,
      reason: 'mission-text-too-long',
    })
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

  it('redacts JSON credential values while preserving surrounding JSON and prose', () => {
    const input =
      'Keep context {"token":"tok_json_123","OPENAI_API_KEY":"sk-json-456"} and retain this explanation.'

    const redacted = redactMissionText(input)

    expect(redacted).not.toContain('tok_json_123')
    expect(redacted).not.toContain('sk-json-456')
    expect(redacted).toContain('{"token":"[REDACTED]","OPENAI_API_KEY":"[REDACTED]"}')
    expect(redacted).toContain('Keep context')
    expect(redacted).toContain('retain this explanation.')
  })

  it('redacts ApiKey authorization and common CLI credential values', () => {
    const input =
      'Run check --api-key cli-key-123 --client-secret="cli secret 456" with Authorization: ApiKey auth-key-789; keep the report.'

    const redacted = redactMissionText(input)

    expect(redacted).not.toContain('cli-key-123')
    expect(redacted).not.toContain('cli secret 456')
    expect(redacted).not.toContain('auth-key-789')
    expect(redacted).toContain('--api-key [REDACTED]')
    expect(redacted).toContain('--client-secret="[REDACTED]"')
    expect(redacted).toContain('keep the report.')
  })

  it('redacts standard prefixed credential labels in assignments, JSON, and CLI flags', () => {
    const input =
      'AWS_SECRET_ACCESS_KEY=aws-secret-123 {"AWS_SECRET_ACCESS_KEY":"aws-json-456"} --github-token gh-token-789; keep context.'

    const redacted = redactMissionText(input)

    expect(redacted).not.toContain('aws-secret-123')
    expect(redacted).not.toContain('aws-json-456')
    expect(redacted).not.toContain('gh-token-789')
    expect(redacted).toContain('AWS_SECRET_ACCESS_KEY=[REDACTED]')
    expect(redacted).toContain('{"AWS_SECRET_ACCESS_KEY":"[REDACTED]"}')
    expect(redacted).toContain('--github-token [REDACTED]')
    expect(redacted).toContain('keep context.')
  })

  it('handles hostile word-boundary email input at the cap in bounded time', () => {
    const hostile = 'A-'.repeat(MISSION_TEXT_LIMIT / 2)
    const started = performance.now()

    let redacted = ''
    for (let iteration = 0; iteration < 4; iteration += 1) redacted = redactMissionText(hostile)

    expect(performance.now() - started).toBeLessThan(250)
    expect(redacted).toBe(hostile)
  })

  it('caps hostile redaction input and output before applying patterns', () => {
    const hostile = `Useful prefix token=secret-value ${'x'.repeat(MISSION_TEXT_LIMIT * 4)}`
    const redacted = redactMissionText(hostile)

    expect(redacted.length).toBeLessThanOrEqual(MISSION_TEXT_LIMIT)
    expect(redacted).not.toContain('secret-value')
    expect(redacted).toContain('Useful prefix token=[REDACTED]')
  })

  it('caps the fully redacted output when many short emails expand to markers', () => {
    const input = 'a@b.co '.repeat(2_000).trimEnd()
    expect(input.length).toBeLessThanOrEqual(MISSION_TEXT_LIMIT)

    const redacted = redactMissionText(input)

    expect(redacted).not.toContain('a@b.co')
    expect(redacted.length).toBeLessThanOrEqual(MISSION_TEXT_LIMIT)
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

  it.each(['DONE', ' done ', 'BLOCKED', ' review ', null, { status: 'done' }])(
    'keeps drifted or non-string Hermes state %# non-terminal',
    (status) => {
      expect(mapHermesStatus(status)).toBeNull()
    },
  )
})

describe('extractOwnestState', () => {
  it('returns a fully validated OWNEST v1 state', () => {
    expect(extractOwnestState({ ownest: ownestState }, 'task-1')).toEqual(ownestState)
  })

  it('returns null when metadata has no OWNEST state', () => {
    expect(extractOwnestState({}, 'task-1')).toBeNull()
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
    expect(extractOwnestState({ ownest: malformedOwnest }, 'task-1')).toBeNull()
  })

  it('does not trust a non-record metadata container', () => {
    expect(extractOwnestState('not-metadata', 'task-1')).toBeNull()
  })

  const semanticCorruptions: Array<[string, Record<string, unknown>]> = [
    ['wrong CRM task ID', { ...ownestState, crmTaskId: 'task-2' }],
    ['non-canonical idempotency key', { ...ownestState, idempotencyKey: 'cc-task:task-1:v2' }],
    ['blank CRM task ID', { ...ownestState, crmTaskId: '  ' }],
    ['blank idempotency key', { ...ownestState, idempotencyKey: '' }],
    ['blank attempt ID', { ...ownestState, attemptId: '' }],
    ['blank lease owner', { ...ownestState, leaseOwner: ' ' }],
    ['invalid lease expiry', { ...ownestState, leaseExpiresAt: 'tomorrow' }],
    ['invalid heartbeat', { ...ownestState, lastHeartbeatAt: 'recently' }],
    ['invalid calendar date', { ...ownestState, leaseExpiresAt: '2026-02-30T00:00:00Z' }],
    ['invalid dispatch timestamp', { ...ownestState, dispatchedAt: 'not-iso' }],
    ['invalid reconciliation timestamp', { ...ownestState, reconciledAt: '12/07/2026' }],
    ['blank Hermes task ID', { ...ownestState, hermesTaskId: '' }],
    ['blank evidence URI', { ...ownestState, evidenceUri: ' ' }],
    ['blank last error', { ...ownestState, lastError: '' }],
  ]

  it.each(semanticCorruptions)('rejects semantic OWNEST corruption: %s', (_label, malformedOwnest) => {
    expect(extractOwnestState({ ownest: malformedOwnest }, 'task-1')).toBeNull()
  })

  it.each(semanticCorruptions)('gates a task carrying semantic OWNEST corruption: %s', (_label, malformedOwnest) => {
    expect(evaluateEligibility(task({ metadata: { ownest: malformedOwnest } }))).toEqual({
      eligible: false,
      reason: 'invalid-ownest-state',
    })
  })

  it('accepts parseable non-null timestamps and non-empty nullable strings', () => {
    const completeState: OwnestStateV1 = {
      ...ownestState,
      hermesTaskId: 'hermes-1',
      dispatchedAt: '2026-07-12T00:01:00.000Z',
      reconciledAt: '2026-07-12T00:02:00+00:00',
      evidenceUri: 'wiki://evidence/task-1',
      lastError: 'previous recoverable error',
    }

    expect(extractOwnestState({ ownest: completeState }, 'task-1')).toEqual(completeState)
  })

  it('preserves exact legacy equality without adding absent hardening fields', () => {
    const extracted = extractOwnestState({ ownest: ownestState }, 'task-1')

    expect(extracted).toEqual(ownestState)
    expect(Object.keys(extracted ?? {})).toEqual(Object.keys(ownestState))
  })

  it('returns every valid optional hardening field without normalising it', () => {
    expect(extractOwnestState({ ownest: hardenedOwnestState }, 'task-1')).toEqual(
      hardenedOwnestState,
    )
  })

  it.each(hardeningFieldNames)(
    'rejects a nonempty partial hardening shape containing only %s',
    (field) => {
      const partial = { ...ownestState, [field]: hardenedOwnestState[field] }

      expect(extractOwnestState({ ownest: partial }, 'task-1')).toBeNull()
      expect(evaluateEligibility(task({ metadata: { ownest: partial } }))).toEqual({
        eligible: false,
        reason: 'invalid-ownest-state',
      })
    },
  )

  it.each(hardeningFieldNames)(
    'rejects a near-complete hardening shape missing %s',
    (field) => {
      const partial = { ...hardenedOwnestState } as Record<string, unknown>
      delete partial[field]

      expect(extractOwnestState({ ownest: partial }, 'task-1')).toBeNull()
      expect(evaluateEligibility(task({ metadata: { ownest: partial } }))).toEqual({
        eligible: false,
        reason: 'invalid-ownest-state',
      })
    },
  )

  it.each([
    ['claimedAt', null],
    ['claimedAt', '2026-02-30T00:00:00Z'],
    ['rolloutId', 'bad rollout'],
    ['rolloutId', `r${'x'.repeat(128)}`],
    ['integrityNonce', 'a'.repeat(62)],
    ['integrityNonce', 'A'.repeat(64)],
    ['integrityNonce', 'g'.repeat(64)],
    ['integrityNonce', 'integrity-nonce-canary-20260712'],
    ['missionDigest', 'sha256:ABCDEF'],
    ['missionDigest', `sha256:${'a'.repeat(63)}`],
    ['failureCount', -1],
    ['failureCount', 4],
    ['failureCount', 1.5],
    ['failureClass', 'unknown'],
    ['failureCode', 'Not-Kebab'],
    ['failureCode', 'x'.repeat(65)],
    ['nextRetryAt', 'tomorrow'],
    ['completionPhase', 'complete'],
    ['receiptSha256', `sha256:${'A'.repeat(64)}`],
  ])('rejects malformed present optional hardening field %s=%#', (field, value) => {
    expect(
      extractOwnestState(
        { ownest: { ...hardenedOwnestState, [field]: value } },
        'task-1',
      ),
    ).toBeNull()
  })
})

describe('extractHardenedOwnestState', () => {
  it('requires and returns the complete canonical hardened state', () => {
    expect(extractHardenedOwnestState({ ownest: hardenedOwnestState }, 'task-1')).toEqual(
      hardenedOwnestState,
    )
  })

  it.each(hardeningFieldNames)('rejects a hardened state missing %s', (field) => {
    const incomplete = { ...hardenedOwnestState } as Record<string, unknown>
    delete incomplete[field]

    expect(extractHardenedOwnestState({ ownest: incomplete }, 'task-1')).toBeNull()
  })

  it('allows canonical nullable retry, failure, and receipt fields', () => {
    const state: HardenedOwnestStateV1 = {
      ...hardenedOwnestState,
      failureCount: 2,
      failureClass: 'transient',
      failureCode: 'hermes-timeout',
      nextRetryAt: '2026-07-12T00:05:00+00:00',
      completionPhase: 'receipt_validated',
      receiptSha256: sha256Digest('receipt'),
    }

    expect(extractHardenedOwnestState({ ownest: state }, 'task-1')).toEqual(state)
  })
})

describe('sha256Digest', () => {
  it('returns a lowercase prefixed SHA-256 digest of exact UTF-8 input', () => {
    expect(sha256Digest('abc')).toBe(
      'sha256:ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    )
    expect(sha256Digest('🪐')).toBe(sha256Digest('🪐'))
  })

  it('rejects non-string runtime input', () => {
    expect(() => sha256Digest(42 as never)).toThrow(/string/i)
  })
})

describe('integrityNonceFromBytes', () => {
  it('encodes exactly 32 bytes as canonical lowercase hex without mutating the source', () => {
    const bytes = Uint8Array.from({ length: 32 }, (_, index) => index)
    const before = bytes.slice()

    expect(integrityNonceFromBytes(bytes)).toBe(
      '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f',
    )
    expect(bytes).toEqual(before)
  })

  it.each([0, 31, 33])('rejects a %i-byte nonce source', (length) => {
    expect(() => integrityNonceFromBytes(new Uint8Array(length))).toThrow(/32 bytes/i)
  })

  it('rejects a non-Uint8Array runtime value', () => {
    expect(() => integrityNonceFromBytes(Array(32).fill(0) as never)).toThrow(/Uint8Array/i)
  })
})

describe('buildValidationRequirements', () => {
  it('numbers requirements deterministically and digests the untrimmed raw text', () => {
    expect(
      buildValidationRequirements(['Cite the source data', ' Cite the source data '], integrityNonce),
    ).toEqual([
      {
        id: 'vr-001',
        text: 'Cite the source data',
        digest: 'hmac-sha256:456eb72c0787fd8ba3d92ed528da658bc626f19dbb03f4d8e46f15921452794f',
      },
      {
        id: 'vr-002',
        text: ' Cite the source data ',
        digest: 'hmac-sha256:0f89653eda2a2aa0fab9c3a9a46f2ca4f60ae2c5d0139d9cca9444c275b387bc',
      },
    ])
  })

  it.each([
    ['empty list', []],
    ['blank entry', ['   ']],
    ['more than 64 entries', Array.from({ length: 65 }, (_, index) => `check-${index}`)],
    ['aggregate over 16 KiB', ['x'.repeat(MISSION_TEXT_LIMIT + 1)]],
    ['non-string entry', [42]],
  ])('rejects %s', (_label, input) => {
    expect(() => buildValidationRequirements(input as string[], integrityNonce)).toThrow()
  })

  it('redacts contract text while binding the exact raw secret-bearing text and nonce', () => {
    const rawOne = 'Email jane.private@example.com with API_TOKEN=secret-one'
    const rawTwo = 'Email jane.private@example.com with API_TOKEN=secret-two'
    const first = buildValidationRequirements([rawOne], integrityNonce)[0]
    const repeated = buildValidationRequirements([rawOne], integrityNonce)[0]
    const changedRaw = buildValidationRequirements([rawTwo], integrityNonce)[0]
    const changedNonce = buildValidationRequirements([rawOne], differentIntegrityNonce)[0]

    expect(first).toEqual(repeated)
    expect(first?.text).toContain('[REDACTED]')
    expect(JSON.stringify(first)).not.toContain('jane.private@example.com')
    expect(JSON.stringify(first)).not.toContain('secret-one')
    expect(first?.text).toBe(changedRaw?.text)
    expect(first?.digest).not.toBe(changedRaw?.digest)
    expect(first?.digest).not.toBe(changedNonce?.digest)
    expect(JSON.stringify(first)).not.toContain(integrityNonce)
  })

  it.each([
    ['short', 'a'.repeat(63)],
    ['uppercase', 'A'.repeat(64)],
    ['non-hex pattern', 'g'.repeat(64)],
    ['token-style', 'integrity-nonce-canary-20260712'],
  ])('rejects a %s integrity nonce across every digest and contract helper', (_label, nonce) => {
    expect(() => buildValidationRequirements(['Cite the source data'], nonce)).toThrow(/nonce/i)
    expect(() => computeMissionDigest(task(), nonce)).toThrow(/nonce/i)
    expect(() => buildMissionContract(task(), 'attempt-1', 'rollout-1', nonce)).toThrow(/nonce/i)
  })
})

describe('computeMissionDigest', () => {
  it('hashes the fixed-key canonical authoritative mission with a normalised owner', () => {
    expect(computeMissionDigest(task({ agent_owner: '  HeRmEs  ' }), integrityNonce)).toBe(
      'hmac-sha256:c879d14357c2823ce75cca315e1c34f176a675a6d140feca4bb4878225655e2f',
    )
  })

  it('excludes founder, status, metadata, and timestamps from mission authority', () => {
    const baseline = computeMissionDigest(task(), integrityNonce)
    expect(
      computeMissionDigest(
        task({
          founder_id: 'different-founder',
          status: 'blocked',
          metadata: { ignored: true },
          created_at: '2030-01-01T00:00:00.000Z',
          updated_at: '2030-01-02T00:00:00.000Z',
        }),
        integrityNonce,
      ),
    ).toBe(baseline)
  })

  it.each([
    ['title', { title: 'Research 🪐 retention patterns' }],
    ['objective', { objective: 'Different raw objective' }],
    ['priority', { priority: 'P1' }],
    ['owner', { agent_owner: 'Nexus' }],
    ['risk', { risk_level: 'medium' }],
    ['mode', { execution_mode: 'overnight' }],
    ['dependency order', { dependencies: ['b', 'a'] }],
    ['approval', { human_approval_required: true }],
    ['validation order', { validation_required: ['second', 'first'] }],
  ] as Array<[string, Partial<CcTask>]>)('changes when authoritative %s changes', (_field, overrides) => {
    expect(computeMissionDigest(task(overrides), integrityNonce)).not.toBe(
      computeMissionDigest(task(), integrityNonce),
    )
  })

  it('rejects malformed authoritative fields at runtime', () => {
    expect(() => computeMissionDigest(task({ agent_owner: null }), integrityNonce)).toThrow(/owner/i)
    expect(() =>
      computeMissionDigest({ ...task(), dependencies: [42] } as never, integrityNonce),
    ).toThrow()
  })

  it('is deterministic for one nonce and changes when only the nonce changes', () => {
    expect(computeMissionDigest(task(), integrityNonce)).toBe(
      computeMissionDigest(task(), integrityNonce),
    )
    expect(computeMissionDigest(task(), integrityNonce)).not.toBe(
      computeMissionDigest(task(), differentIntegrityNonce),
    )
  })
})

describe('buildMissionContract', () => {
  it('binds one attempt and rollout to the canonical task and validation requirements', () => {
    expect(
      buildMissionContract(task(), 'attempt-1', 'ownest-canary-20260712', integrityNonce),
    ).toEqual({
      schema: 'ownest.mission.v1',
      crmTaskId: 'task-1',
      attemptId: 'attempt-1',
      idempotencyKey: 'cc-task:task-1:v1',
      rolloutId: 'ownest-canary-20260712',
      missionDigest: 'hmac-sha256:c879d14357c2823ce75cca315e1c34f176a675a6d140feca4bb4878225655e2f',
      validationRequirements: [
        {
          id: 'vr-001',
          text: 'Cite the source data',
          digest: 'hmac-sha256:456eb72c0787fd8ba3d92ed528da658bc626f19dbb03f4d8e46f15921452794f',
        },
      ],
    })
  })

  it.each([
    ['blank attempt', ' ', 'rollout-1'],
    ['unsafe attempt', 'attempt/1', 'rollout-1'],
    ['blank rollout', 'attempt-1', ' '],
    ['unsafe rollout', 'attempt-1', 'rollout/1'],
    ['overlong rollout', 'attempt-1', `r${'x'.repeat(128)}`],
  ])('rejects %s', (_label, attemptId, rolloutId) => {
    expect(() => buildMissionContract(task(), attemptId, rolloutId, integrityNonce)).toThrow()
  })

  it('never serialises raw credentials, private email, secret values, or the integrity nonce', () => {
    const sensitiveTask = task({
      title: 'Research private access patterns for jane.private@example.com',
      objective: 'Document API_TOKEN=mission-secret without taking action.',
      validation_required: [
        'Cite jane.private@example.com and API_TOKEN=validation-secret in the private source.',
      ],
    })

    const contract = buildMissionContract(
      sensitiveTask,
      'attempt-1',
      'ownest-canary-20260712',
      integrityNonce,
    )
    const serialised = JSON.stringify(contract)

    expect(serialised).not.toContain('jane.private@example.com')
    expect(serialised).not.toContain('mission-secret')
    expect(serialised).not.toContain('validation-secret')
    expect(serialised).not.toContain(integrityNonce)
    expect(serialised).toContain('[REDACTED]')
  })

  it('is deterministic for identical input and nonce but rebinds every hash for another nonce', () => {
    const first = buildMissionContract(task(), 'attempt-1', 'rollout-1', integrityNonce)
    const repeated = buildMissionContract(task(), 'attempt-1', 'rollout-1', integrityNonce)
    const changed = buildMissionContract(
      task(),
      'attempt-1',
      'rollout-1',
      differentIntegrityNonce,
    )

    expect(first).toEqual(repeated)
    expect(first.missionDigest).not.toBe(changed.missionDigest)
    expect(first.validationRequirements[0]?.digest).not.toBe(
      changed.validationRequirements[0]?.digest,
    )
  })
})

describe('deterministicUuid', () => {
  it('returns a stable RFC-compatible UUIDv8 from unambiguous scoped parts', () => {
    const uuid = deterministicUuid(
      'ownest.audit',
      'founder-1',
      'task-1',
      'attempt-1',
      'rollout-1',
      'completion',
    )

    expect(uuid).toBe('bd0de84a-10aa-8a88-b36b-f694d7cfca24')
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })

  it('is order-sensitive, delimiter-safe, Unicode-deterministic, and scope-separated', () => {
    expect(deterministicUuid('scope', 'a', 'b')).not.toBe(deterministicUuid('scope', 'b', 'a'))
    expect(deterministicUuid('scope', 'a|b', 'c')).not.toBe(
      deterministicUuid('scope', 'a', 'b|c'),
    )
    expect(deterministicUuid('scope', '🪐')).toBe(deterministicUuid('scope', '🪐'))
    expect(deterministicUuid('scope-a', 'x')).not.toBe(deterministicUuid('scope-b', 'x'))
  })

  it.each([
    ['blank scope', ' ', ['x']],
    ['unsafe scope', 'scope/unsafe', ['x']],
    ['no parts', 'scope', []],
    ['blank part', 'scope', ['']],
    ['non-string part', 'scope', [42]],
  ])('rejects %s', (_label, scope, parts) => {
    expect(() => deterministicUuid(scope, ...(parts as string[]))).toThrow()
  })
})
