import type { CcTask, CcTaskStatus, OwnestStateV1 } from './types.js'

const ALLOWED_OWNERS = new Set(['hermes', 'nexus', 'empire'])

export const MAX_MISSION_TEXT_LENGTH = 16 * 1024

const CLEAR_ADVISORY_INTENT =
  /^\s*(?:research|document|review|analyse|analyze|compare|study|assess|summarise|summarize|explain|audit)\b/i
const ADVISORY_CARRYOVER_NOUN =
  /\b(?:trends?|forecasts?|analys(?:is|es)|research|options?|strateg(?:y|ies)|polic(?:y|ies)|controls?|benchmarks?|insights?|comparisons?|reviews?|assessments?|plans?|documentation|recommendations?)\b/i

const PAYMENT_ACTION_SOURCE = String.raw`pay|paid|purchase(?:d)?|buy|bought|checkout|checked[ -]?out|spend|spent|charge(?:d)?|refund(?:ed)?|transfer(?:red)?(?:[ \t]+funds?)?`
const PAYMENT_ACTION = new RegExp(`\\b(?:${PAYMENT_ACTION_SOURCE})\\b`, 'i')
const PAYMENT_BOUNDARY = new RegExp(
  `\\b(?:${PAYMENT_ACTION_SOURCE}|payment|payments|invoice|billing)\\b`,
  'i',
)
const OUTBOUND_ACTION =
  /\b(?:notify|notified|email|emailed|send|sent|publish|published|post|posted|share|shared|message|messaged|broadcast|broadcasted|announce|announced)\b/i
const OUTBOUND_NOMINAL_ACTION = /\bpublication\b/i
const OUTBOUND_NOMINAL_TARGET =
  /\b(?:outbound|newsletter|newsletters|customer|customers|public|external|blog|post|posts)\b/i

const PRODUCTION_ACTION =
  /\b(?:perform|performed|run|apply|applied|execute|executed|migrate|migrated|deploy|deployed|mutate|mutated|write|written|change|changed|update|updated|release|released|promote|promoted|ship|shipped)\b/i
const PRODUCTION_TARGET = /\b(?:prod|production|database|db|schema|migration)\b/i
const PRODUCTION_NOMINAL_ACTION = /\b(?:deployment|mutation)\b/i
const PRODUCTION_NOMINAL_TARGET = /\b(?:prod|production|database|db)\b/i

const CREDENTIAL_ACTION =
  /\b(?:copy|copied|expose|exposed|disclose|disclosed|rotate|rotated|access|accessed|reveal|revealed|read|retrieve|retrieved)\b/i
const CREDENTIAL_TARGET =
  /\b(?:secret|secrets|credential|credentials|password|passwords|token|tokens|api[-_ ]?key|api[-_ ]?keys|service[-_ ]?role[-_ ]?key)\b/i
const PRIVILEGE_ACTION =
  /\b(?:grant|granted|make|made|promote|promoted|elevate|elevated|escalate|escalated|change|changed|modify|modified)\b/i
const PRIVILEGE_TARGET =
  /\b(?:admin|administrator|privilege|privileges|permission|permissions|role|roles|access control|rbac|rls|row[- ]level security)\b/i
const CREDENTIAL_NOMINAL_ACTION = /\b(?:disclosure|exposure|rotation|escalation)\b/i
const CREDENTIAL_NOMINAL_TARGET =
  /\b(?:secret|secrets|credential|credentials|password|passwords|token|tokens|api[-_ ]?key|api[-_ ]?keys|service[-_ ]?account|service[-_ ]?accounts|privilege|privileges|permission|permissions)\b/i

const DESTRUCTIVE_ACTION =
  /\b(?:remove|removed|delete|deleted|purge|purged|wipe|wiped|drop|dropped|destroy|destroyed|truncate|truncated|erase|erased)\b/i
const DESTRUCTIVE_TARGET =
  /\b(?:record|records|data|database|db|table|tables|schema|schemas|file|files|repository|repositories|resource|resources)\b/i

const ACCESS_CONTROL_ACTION =
  /\b(?:change|changed|modify|modified|update|updated|disable|disabled|enable|enabled|grant|granted|revoke|revoked|alter|altered|remove|removed|bypass|bypassed)\b/i
const ACCESS_CONTROL_TARGET =
  /\b(?:access control|rbac|rls|row[- ]level security|permission|permissions|role assignment|role assignments)\b/i
const BRANCH_PROTECTION_ACTION =
  /\b(?:unprotect|unprotected|disable|disabled|enable|enabled|change|changed|modify|modified|update|updated|remove|removed|bypass|bypassed)\b|\bturn(?:ed)?[ \t]+off\b/i
const BRANCH_PROTECTION_TARGET =
  /\b(?:branch protection|protected branch|protected branches|main branch|master branch)\b/i

const MERGE_DIRECT_ACTION_SOURCE = String.raw`merge|land|integrate`
const MERGE_ACTION = new RegExp(
  `\\b(?:${MERGE_DIRECT_ACTION_SOURCE}|merged|landed|integrated)\\b`,
  'i',
)
const MERGE_TARGET =
  /\b(?:pull request|pull requests|pr|prs|change request|change requests|feature|changes|branch|branches|commit|commits|code)\b/i
const MERGE_ACTION_REQUEST = new RegExp(
  `^\\s*(?:please[ \\t]+)?(?:${MERGE_DIRECT_ACTION_SOURCE})\\b|\\b(?:can|could|would)[ \\t]+(?:you|we)[ \\t]+(?:${MERGE_DIRECT_ACTION_SOURCE})\\b`,
  'i',
)

const HARD_BOUNDARY_ACTION_CLASSIFIERS = [
  PAYMENT_ACTION,
  OUTBOUND_ACTION,
  PRODUCTION_ACTION,
  CREDENTIAL_ACTION,
  PRIVILEGE_ACTION,
  DESTRUCTIVE_ACTION,
  ACCESS_CONTROL_ACTION,
  BRANCH_PROTECTION_ACTION,
  MERGE_ACTION,
] as const
const UNCONDITIONAL_DIRECTED_ACTION_CLASSIFIERS = [
  PAYMENT_ACTION,
  OUTBOUND_ACTION,
  DESTRUCTIVE_ACTION,
  MERGE_ACTION,
] as const
const UNCONDITIONAL_DIRECTED_ACTION_SOURCE = UNCONDITIONAL_DIRECTED_ACTION_CLASSIFIERS.map(
  (classifier) => `(?:${classifier.source})`,
).join('|')
const DIRECTED_HARD_ACTION_REQUEST = new RegExp(
  `\\b(?:must|should|needs?)\\b[ \\t]+(?:to[ \\t]+)?(?:be[ \\t]+)?(?:${UNCONDITIONAL_DIRECTED_ACTION_SOURCE})`,
  'i',
)
const MIXED_BOUNDARY_ACTION_CLASSIFIERS = [
  ...HARD_BOUNDARY_ACTION_CLASSIFIERS,
  OUTBOUND_NOMINAL_ACTION,
  PRODUCTION_NOMINAL_ACTION,
  CREDENTIAL_NOMINAL_ACTION,
] as const
const MIXED_BOUNDARY_ACTION_SOURCE = MIXED_BOUNDARY_ACTION_CLASSIFIERS.map(
  (classifier) => `(?:${classifier.source})`,
).join('|')
const MISSION_CLAUSE_SEPARATOR = new RegExp(
  `\\b(?:and[ \\t]+then|then|and)\\b|[.;\\n]|,(?=[ \\t]{0,24}(?:${MIXED_BOUNDARY_ACTION_SOURCE}))`,
  'i',
)

const HARD_ACTION_TARGET_BOUNDARIES = [
  [OUTBOUND_NOMINAL_ACTION, OUTBOUND_NOMINAL_TARGET],
  [PRODUCTION_ACTION, PRODUCTION_TARGET],
  [PRODUCTION_NOMINAL_ACTION, PRODUCTION_NOMINAL_TARGET],
  [CREDENTIAL_ACTION, CREDENTIAL_TARGET],
  [PRIVILEGE_ACTION, PRIVILEGE_TARGET],
  [CREDENTIAL_NOMINAL_ACTION, CREDENTIAL_NOMINAL_TARGET],
  [DESTRUCTIVE_ACTION, DESTRUCTIVE_TARGET],
  [ACCESS_CONTROL_ACTION, ACCESS_CONTROL_TARGET],
  [BRANCH_PROTECTION_ACTION, BRANCH_PROTECTION_TARGET],
  [MERGE_ACTION, MERGE_TARGET],
] as const

const ISO_TIMESTAMP =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?(Z|[+-](\d{2}):(\d{2}))$/

const SECRET_LABEL_SOURCE = String.raw`[A-Z0-9_-]{0,48}(?:API[-_ ]?(?:KEY|TOKEN)|SECRET[-_ ]?ACCESS[-_ ]?KEY|ACCESS[-_ ]?(?:KEY|TOKEN)|AUTH[-_ ]?TOKEN|REFRESH[-_ ]?TOKEN|ID[-_ ]?TOKEN|CLIENT[-_ ]?SECRET|SERVICE[-_ ]?ROLE[-_ ]?KEY|SECRET|TOKEN|PASSWORD|PASSWD|CREDENTIAL)[A-Z0-9_-]{0,32}`
const CLI_SECRET_FLAG_SOURCE = String.raw`--[A-Z0-9_-]{0,32}(?:API[-_]?KEY|API[-_]?TOKEN|SECRET[-_]?ACCESS[-_]?KEY|ACCESS[-_]?(?:KEY|TOKEN)|CLIENT[-_]?SECRET|SERVICE[-_]?ROLE[-_]?KEY|SECRET|TOKEN|PASSWORD|PASSWD|CREDENTIAL)[A-Z0-9_-]{0,16}`
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
  if (typeof value !== 'string' || value.length > 40) return false

  const match = ISO_TIMESTAMP.exec(value)
  if (!match) return false

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const hour = Number(match[4])
  const minute = Number(match[5])
  const second = Number(match[6])
  const offsetHour = Number(match[9] ?? 0)
  const offsetMinute = Number(match[10] ?? 0)

  if (month < 1 || month > 12 || hour > 23 || minute > 59 || second > 59) return false
  if (offsetHour > 23 || offsetMinute > 59) return false

  const calendarRoundTrip = new Date(Date.UTC(year, month - 1, day))
  if (
    calendarRoundTrip.getUTCFullYear() !== year ||
    calendarRoundTrip.getUTCMonth() !== month - 1 ||
    calendarRoundTrip.getUTCDate() !== day
  ) {
    return false
  }

  return Number.isFinite(Date.parse(value))
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
  return CLEAR_ADVISORY_INTENT.test(text)
}

function containsHardBoundaryAction(text: string): boolean {
  return HARD_BOUNDARY_ACTION_CLASSIFIERS.some((classifier) => classifier.test(text))
}

function hasAdvisoryCarryoverNoun(text: string): boolean {
  return ADVISORY_CARRYOVER_NOUN.test(text)
}

function containsDangerousClause(clause: string): boolean {
  const text = clause.trim()
  if (!text || isClearlyAdvisory(text)) return false

  return (
    PAYMENT_BOUNDARY.test(text) ||
    OUTBOUND_ACTION.test(text) ||
    DESTRUCTIVE_ACTION.test(text) ||
    MERGE_ACTION_REQUEST.test(text) ||
    HARD_ACTION_TARGET_BOUNDARIES.some(([action, target]) => matchesBoundary(text, action, target))
  )
}

function hasCrossFieldBoundary(title: string, objective: string): boolean {
  return HARD_ACTION_TARGET_BOUNDARIES.some(
    ([action, target]) =>
      (!isClearlyAdvisory(title) && action.test(title) && target.test(objective)) ||
      (!isClearlyAdvisory(objective) && action.test(objective) && target.test(title)),
  )
}

function containsDangerousLanguage(task: CcTask): boolean {
  const missionText = `${task.title}\n${task.objective}`
  let advisoryContext = false
  const clauseIsDangerous = missionText.split(MISSION_CLAUSE_SEPARATOR).some((clause) => {
    const text = clause.trim()
    if (!text) return false
    if (isClearlyAdvisory(text)) {
      advisoryContext = true
      return false
    }
    if (DIRECTED_HARD_ACTION_REQUEST.test(text)) return true
    if (advisoryContext && !containsHardBoundaryAction(text) && hasAdvisoryCarryoverNoun(text)) return false

    advisoryContext = false
    return containsDangerousClause(text)
  })
  return clauseIsDangerous || hasCrossFieldBoundary(task.title, task.objective)
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

function isAsciiLetter(code: number): boolean {
  return (code >= 65 && code <= 90) || (code >= 97 && code <= 122)
}

function isAsciiDigit(code: number): boolean {
  return code >= 48 && code <= 57
}

function isEmailTokenCharacter(code: number): boolean {
  return (
    isAsciiLetter(code) ||
    isAsciiDigit(code) ||
    code === 37 ||
    code === 43 ||
    code === 45 ||
    code === 46 ||
    code === 64 ||
    code === 95
  )
}

function isValidEmailToken(token: string): boolean {
  const at = token.indexOf('@')
  if (at <= 0 || at !== token.lastIndexOf('@') || at >= token.length - 1) return false

  const local = token.slice(0, at)
  const domain = token.slice(at + 1)
  const lastDot = domain.lastIndexOf('.')
  if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) return false
  if (lastDot <= 0 || lastDot >= domain.length - 2 || domain.includes('..')) return false

  for (let index = 0; index < domain.length; index += 1) {
    const code = domain.charCodeAt(index)
    if (!isAsciiLetter(code) && !isAsciiDigit(code) && code !== 45 && code !== 46) return false
  }
  for (let index = lastDot + 1; index < domain.length; index += 1) {
    if (!isAsciiLetter(domain.charCodeAt(index))) return false
  }

  return true
}

function redactEmailAddresses(value: string): string {
  const parts: string[] = []
  let outputCursor = 0
  let index = 0

  while (index < value.length) {
    if (!isEmailTokenCharacter(value.charCodeAt(index))) {
      index += 1
      continue
    }

    const tokenStart = index
    while (index < value.length && isEmailTokenCharacter(value.charCodeAt(index))) index += 1
    if (!isValidEmailToken(value.slice(tokenStart, index))) continue

    parts.push(value.slice(outputCursor, tokenStart), '[REDACTED]')
    outputCursor = index
  }

  if (outputCursor === 0) return value
  parts.push(value.slice(outputCursor))
  return parts.join('')
}

/** Redacts sensitive values while leaving mission context and labels readable. */
export function redactMissionText(value: string): string {
  return redactEmailAddresses(value.slice(0, MAX_MISSION_TEXT_LENGTH))
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
    .slice(0, MAX_MISSION_TEXT_LENGTH)
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
