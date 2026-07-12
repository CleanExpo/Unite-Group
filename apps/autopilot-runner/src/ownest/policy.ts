import type { CcTask, CcTaskStatus, OwnestStateV1 } from './types.js'

const ALLOWED_OWNERS = new Set(['hermes', 'nexus', 'empire'])

export const MAX_MISSION_TEXT_LENGTH = 16 * 1024

const CLEAR_ADVISORY_INTENT =
  /^\s*(?:research|document|review|analyse|analyze|compare|study|assess|summarise|summarize|explain|audit)\b/i
const MIXED_ACTION_SEQUENCE =
  /\b(?:then|next|afterwards|subsequently)\b[\s,:;-]{0,16}(?:perform|run|apply|execute|migrate|deploy|mutate|write|change|notify|email|send|publish|post|share|message|copy|expose|disclose|rotate|access|reveal|grant|make|promote|escalate|remove|delete|purge|wipe|drop|destroy|unprotect|disable|update|modify|merge|land|integrate)\b/i

const PAYMENT_BOUNDARY =
  /\b(?:pay|payment|payments|purchase|buy|checkout|spend|invoice|charge|refund|transfer funds?|billing)\b/i
const OUTBOUND_ACTION =
  /\b(?:notify|notified|email|emailed|send|sent|publish|published|post|posted|share|shared|message|messaged|broadcast|announce|announced)\b/i
const OUTBOUND_NOMINAL_ACTION = /\bpublication\b/i
const OUTBOUND_NOMINAL_TARGET =
  /\b(?:outbound|newsletter|newsletters|customer|customers|public|external|blog|post|posts)\b/i

const PRODUCTION_ACTION =
  /\b(?:perform|run|apply|execute|migrate|deploy|mutate|write|change|update|release|promote|ship)\b/i
const PRODUCTION_TARGET = /\b(?:prod|production|database|db|schema|migration)\b/i
const PRODUCTION_NOMINAL_ACTION = /\b(?:deployment|mutation)\b/i
const PRODUCTION_NOMINAL_TARGET = /\b(?:prod|production|database|db)\b/i

const CREDENTIAL_ACTION = /\b(?:copy|expose|disclose|rotate|access|reveal|read|retrieve)\b/i
const CREDENTIAL_TARGET =
  /\b(?:secret|secrets|credential|credentials|password|passwords|token|tokens|api[-_ ]?key|api[-_ ]?keys|service[-_ ]?role[-_ ]?key)\b/i
const PRIVILEGE_ACTION = /\b(?:grant|make|promote|elevate|escalate|change|modify)\b/i
const PRIVILEGE_TARGET =
  /\b(?:admin|administrator|privilege|privileges|permission|permissions|role|roles|access control|rbac|rls|row[- ]level security)\b/i
const CREDENTIAL_NOMINAL_ACTION = /\b(?:disclosure|exposure|rotation|escalation)\b/i
const CREDENTIAL_NOMINAL_TARGET =
  /\b(?:secret|secrets|credential|credentials|password|passwords|token|tokens|api[-_ ]?key|api[-_ ]?keys|service[-_ ]?account|service[-_ ]?accounts|privilege|privileges|permission|permissions)\b/i

const DESTRUCTIVE_ACTION = /\b(?:remove|delete|purge|wipe|drop|destroy|truncate|erase)\b/i
const DESTRUCTIVE_TARGET =
  /\b(?:record|records|data|database|db|table|tables|schema|schemas|file|files|repository|repositories|resource|resources)\b/i

const ACCESS_CONTROL_ACTION =
  /\b(?:change|modify|update|disable|enable|grant|revoke|alter|remove|bypass)\b/i
const ACCESS_CONTROL_TARGET =
  /\b(?:access control|rbac|rls|row[- ]level security|permission|permissions|role assignment|role assignments)\b/i
const BRANCH_PROTECTION_ACTION =
  /\b(?:unprotect|disable|enable|change|modify|update|remove|bypass)\b|\bturn[ \t]+off\b/i
const BRANCH_PROTECTION_TARGET =
  /\b(?:branch protection|protected branch|protected branches|main branch|master branch)\b/i

const MERGE_ACTION = /\b(?:merge|land|integrate)\b/i
const MERGE_TARGET =
  /\b(?:pull request|pull requests|pr|prs|change request|change requests|feature|changes|branch|branches|commit|commits|code)\b/i
const MERGE_ACTION_REQUEST =
  /^\s*(?:please[ \t]+)?(?:merge|land|integrate)\b|\b(?:can|could|would)[ \t]+(?:you|we)[ \t]+(?:merge|land|integrate)\b|\b(?:must|should|need|needs)[ \t]+(?:to[ \t]+)?(?:be[ \t]+)?(?:merge(?:d)?|land(?:ed)?|integrat(?:e|ed))\b/i

const ISO_TIMESTAMP =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/

const SECRET_LABEL_SOURCE = String.raw`[A-Z0-9_-]{0,64}(?:API[-_ ]?(?:KEY|TOKEN)|ACCESS[-_ ]?TOKEN|AUTH[-_ ]?TOKEN|REFRESH[-_ ]?TOKEN|ID[-_ ]?TOKEN|CLIENT[-_ ]?SECRET|SERVICE[-_ ]?ROLE[-_ ]?KEY|SECRET|TOKEN|PASSWORD|PASSWD|CREDENTIAL)`
const CLI_SECRET_FLAG_SOURCE = String.raw`--(?:API[-_]?KEY|API[-_]?TOKEN|ACCESS[-_]?TOKEN|CLIENT[-_]?SECRET|SERVICE[-_]?ROLE[-_]?KEY|SECRET|TOKEN|PASSWORD|PASSWD|CREDENTIAL)`
const JSON_SECRET = new RegExp(
  `(["'])(${SECRET_LABEL_SOURCE})\\1([ \\t]*:[ \\t]*)(["'])([^"'\\r\\n]{0,2048})\\4`,
  'gi',
)
const QUOTED_SECRET_ASSIGNMENT = new RegExp(
  `\\b(${SECRET_LABEL_SOURCE})([ \\t]*(?:=|:)[ \\t]*)(["'])([^"'\\r\\n]{0,2048})\\3`,
  'gi',
)
const UNQUOTED_SECRET_ASSIGNMENT = new RegExp(
  `\\b(${SECRET_LABEL_SOURCE})([ \\t]*(?:=|:)[ \\t]*)([^\\s,;}"']{1,2048})`,
  'gi',
)
const QUOTED_CLI_SECRET = new RegExp(
  `(${CLI_SECRET_FLAG_SOURCE})(=|[ \\t]+)(["'])([^"'\\r\\n]{0,2048})\\3`,
  'gi',
)
const UNQUOTED_CLI_SECRET = new RegExp(
  `(${CLI_SECRET_FLAG_SOURCE})(=|[ \\t]+)([^\\s,;}"']{1,2048})`,
  'gi',
)

export type EligibilityReason =
  | 'status-not-queued'
  | 'owner-not-allowed'
  | 'approval-required'
  | 'risk-not-allowed'
  | 'execution-mode-not-advisory'
  | 'unresolved-dependencies'
  | 'invalid-ownest-state'
  | 'ownest-gated'
  | 'dead-letter'
  | 'already-mirrored'
  | 'mission-text-too-long'
  | 'dangerous-language'

export type EligibilityDecision =
  | { eligible: true }
  | { eligible: false; reason: EligibilityReason }

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isNullableNonEmptyString(value: unknown): value is string | null {
  return value === null || isNonEmptyString(value)
}

function isIsoTimestamp(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= 40 &&
    ISO_TIMESTAMP.test(value) &&
    Number.isFinite(Date.parse(value))
  )
}

function isNullableIsoTimestamp(value: unknown): value is string | null {
  return value === null || isIsoTimestamp(value)
}

function hasOwnestMetadata(metadata: unknown): boolean {
  return isRecord(metadata) && Object.prototype.hasOwnProperty.call(metadata, 'ownest')
}

/**
 * Safely reads the versioned OWNEST state from untrusted JSON metadata.
 * A partial or wrong-typed object is never returned as trusted state.
 */
export function extractOwnestState(metadata: unknown, expectedTaskId: string): OwnestStateV1 | null {
  if (!isNonEmptyString(expectedTaskId) || !isRecord(metadata) || !isRecord(metadata.ownest)) return null

  const value = metadata.ownest
  const {
    version,
    crmTaskId,
    idempotencyKey: key,
    hermesTaskId,
    attemptId,
    leaseOwner,
    leaseExpiresAt,
    lastHeartbeatAt,
    dispatchedAt,
    reconciledAt,
    evidenceUri,
    gateState,
    lastError,
  } = value

  if (version !== 1) return null
  if (crmTaskId !== expectedTaskId) return null
  if (key !== idempotencyKey(expectedTaskId)) return null
  if (!isNullableNonEmptyString(hermesTaskId)) return null
  if (!isNonEmptyString(attemptId)) return null
  if (!isNonEmptyString(leaseOwner)) return null
  if (!isIsoTimestamp(leaseExpiresAt)) return null
  if (!isIsoTimestamp(lastHeartbeatAt)) return null
  if (!isNullableIsoTimestamp(dispatchedAt)) return null
  if (!isNullableIsoTimestamp(reconciledAt)) return null
  if (!isNullableNonEmptyString(evidenceUri)) return null
  if (gateState !== 'eligible' && gateState !== 'gated' && gateState !== 'dead_letter') return null
  if (!isNullableNonEmptyString(lastError)) return null

  return {
    version,
    crmTaskId,
    idempotencyKey: key,
    hermesTaskId,
    attemptId,
    leaseOwner,
    leaseExpiresAt,
    lastHeartbeatAt,
    dispatchedAt,
    reconciledAt,
    evidenceUri,
    gateState,
    lastError,
  }
}

function matchesBoundary(text: string, action: RegExp, target: RegExp): boolean {
  return action.test(text) && target.test(text)
}

function isClearlyAdvisory(text: string): boolean {
  return CLEAR_ADVISORY_INTENT.test(text) && !MIXED_ACTION_SEQUENCE.test(text)
}

function containsDangerousAction(text: string): boolean {
  if (isClearlyAdvisory(text)) return false

  return (
    PAYMENT_BOUNDARY.test(text) ||
    OUTBOUND_ACTION.test(text) ||
    matchesBoundary(text, OUTBOUND_NOMINAL_ACTION, OUTBOUND_NOMINAL_TARGET) ||
    matchesBoundary(text, PRODUCTION_ACTION, PRODUCTION_TARGET) ||
    matchesBoundary(text, PRODUCTION_NOMINAL_ACTION, PRODUCTION_NOMINAL_TARGET) ||
    matchesBoundary(text, CREDENTIAL_ACTION, CREDENTIAL_TARGET) ||
    matchesBoundary(text, PRIVILEGE_ACTION, PRIVILEGE_TARGET) ||
    matchesBoundary(text, CREDENTIAL_NOMINAL_ACTION, CREDENTIAL_NOMINAL_TARGET) ||
    matchesBoundary(text, DESTRUCTIVE_ACTION, DESTRUCTIVE_TARGET) ||
    matchesBoundary(text, ACCESS_CONTROL_ACTION, ACCESS_CONTROL_TARGET) ||
    matchesBoundary(text, BRANCH_PROTECTION_ACTION, BRANCH_PROTECTION_TARGET) ||
    MERGE_ACTION_REQUEST.test(text) ||
    matchesBoundary(text, MERGE_ACTION, MERGE_TARGET)
  )
}

function containsDangerousLanguage(task: CcTask): boolean {
  return containsDangerousAction(task.title) || containsDangerousAction(task.objective)
}

/** Pure, fail-closed admission policy for the initial advisory canary. */
export function evaluateEligibility(task: CcTask): EligibilityDecision {
  if (task.status !== 'queued') return { eligible: false, reason: 'status-not-queued' }
  if (
    task.title.length > MAX_MISSION_TEXT_LENGTH ||
    task.objective.length > MAX_MISSION_TEXT_LENGTH ||
    task.title.length + task.objective.length > MAX_MISSION_TEXT_LENGTH
  ) {
    return { eligible: false, reason: 'mission-text-too-long' }
  }

  const owner = task.agent_owner?.trim().toLowerCase()
  if (!owner || !ALLOWED_OWNERS.has(owner)) return { eligible: false, reason: 'owner-not-allowed' }
  if (task.human_approval_required) return { eligible: false, reason: 'approval-required' }
  if (task.risk_level !== 'low' && task.risk_level !== 'medium') {
    return { eligible: false, reason: 'risk-not-allowed' }
  }
  if (task.execution_mode !== 'advisory') {
    return { eligible: false, reason: 'execution-mode-not-advisory' }
  }
  if (task.dependencies.length > 0) return { eligible: false, reason: 'unresolved-dependencies' }

  const ownest = extractOwnestState(task.metadata, task.id)
  if (hasOwnestMetadata(task.metadata) && ownest === null) {
    return { eligible: false, reason: 'invalid-ownest-state' }
  }
  if (ownest?.gateState === 'dead_letter') return { eligible: false, reason: 'dead-letter' }
  if (ownest?.gateState === 'gated') return { eligible: false, reason: 'ownest-gated' }
  if (ownest?.hermesTaskId) return { eligible: false, reason: 'already-mirrored' }
  if (containsDangerousLanguage(task)) return { eligible: false, reason: 'dangerous-language' }

  return { eligible: true }
}

export function idempotencyKey(crmTaskId: string): string {
  return `cc-task:${crmTaskId}:v1`
}

/** Redacts sensitive values while leaving mission context and labels readable. */
export function redactMissionText(value: string): string {
  return value
    .slice(0, MAX_MISSION_TEXT_LENGTH)
    .replace(/\b[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g, '[REDACTED]')
    .replace(
      /\b(Authorization[ \t]*:[ \t]*)(?:Bearer|Basic|ApiKey)[ \t]+[^\s,;]{1,2048}/gi,
      '$1[REDACTED]',
    )
    .replace(/\b(Bearer)[ \t]+[^\s,;]{1,2048}/gi, '$1 [REDACTED]')
    .replace(JSON_SECRET, '$1$2$1$3$4[REDACTED]$4')
    .replace(QUOTED_CLI_SECRET, '$1$2$3[REDACTED]$3')
    .replace(UNQUOTED_CLI_SECRET, '$1$2[REDACTED]')
    .replace(QUOTED_SECRET_ASSIGNMENT, '$1$2$3[REDACTED]$3')
    .replace(UNQUOTED_SECRET_ASSIGNMENT, '$1$2[REDACTED]')
}

/**
 * Returns only terminal CRM transitions. Live, archived, and unknown Hermes
 * states return null so they can never fabricate completion.
 */
export function mapHermesStatus(status: unknown): Extract<CcTaskStatus, 'done' | 'blocked'> | null {
  if (status === 'done') return 'done'
  if (status === 'blocked' || status === 'review') return 'blocked'
  return null
}
