import type { CcTask, CcTaskStatus, OwnestStateV1 } from './types.js'

const ALLOWED_OWNERS = new Set(['hermes', 'nexus', 'empire'])

const DANGEROUS_LANGUAGE = [
  /\b(?:deploy|release|promote|ship)\b[\s\S]{0,60}\bprod(?:uction)?\b/i,
  /\bprod(?:uction)?\b[\s\S]{0,60}\b(?:deploy(?:ment)?|database|db|schema|migration|mutat(?:e|ion)|write|update|delete)\b/i,
  /\b(?:pay(?:ment|ments)?|purchase|buy|checkout|spend|invoice|charge|refund|transfer funds?|billing)\b/i,
  /\b(?:send|publish|post|broadcast|email|message|notify|announce|release)\b[\s\S]{0,60}\b(?:customer|client|user|public(?:ly)?|external(?:ly)?|email|message|announcement|newsletter|social|press)\b/i,
  /\b(?:access|read|retrieve|rotate|reveal|expose|share|disclose|grant|elevate|change|modify|reset|create)\b[\s\S]{0,60}\b(?:secret|credentials?|password|tokens?|api[-_ ]?keys?|service[-_ ]?role|privileges?|permissions?)\b/i,
  /\b(?:delete|destroy|drop|truncate|wipe|erase|purge)\b/i,
  /\b(?:access[- ]control|rbac|row[- ]level security|rls|grant access|revoke access|change permissions?|modify permissions?|role assignments?)\b/i,
  /\bbranch[- ]protection\b/i,
  /\b(?:merge|squash[- ]?merge|auto[- ]?merge)\b[\s\S]{0,40}\b(?:pull request|pr|branch|main|master)\b/i,
] as const

const CREDENTIAL_LABEL = String.raw`(?:[A-Z0-9_-]*(?:API[-_ ]?(?:KEY|TOKEN)|ACCESS[-_ ]?TOKEN|AUTH[-_ ]?TOKEN|REFRESH[-_ ]?TOKEN|ID[-_ ]?TOKEN|CLIENT[-_ ]?SECRET|SERVICE[-_ ]?ROLE[-_ ]?KEY|SECRET|TOKEN|PASSWORD|PASSWD|CREDENTIAL)[A-Z0-9_-]*)`

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

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string'
}

function hasOwnestMetadata(metadata: unknown): boolean {
  return isRecord(metadata) && Object.prototype.hasOwnProperty.call(metadata, 'ownest')
}

/**
 * Safely reads the versioned OWNEST state from untrusted JSON metadata.
 * A partial or wrong-typed object is never returned as trusted state.
 */
export function extractOwnestState(metadata: unknown): OwnestStateV1 | null {
  if (!isRecord(metadata) || !isRecord(metadata.ownest)) return null

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
  if (!isNonEmptyString(crmTaskId)) return null
  if (!isNonEmptyString(key)) return null
  if (!(hermesTaskId === null || isNonEmptyString(hermesTaskId))) return null
  if (!isNonEmptyString(attemptId)) return null
  if (!isNonEmptyString(leaseOwner)) return null
  if (!isNonEmptyString(leaseExpiresAt)) return null
  if (!isNonEmptyString(lastHeartbeatAt)) return null
  if (!isNullableString(dispatchedAt)) return null
  if (!isNullableString(reconciledAt)) return null
  if (!isNullableString(evidenceUri)) return null
  if (gateState !== 'eligible' && gateState !== 'gated' && gateState !== 'dead_letter') return null
  if (!isNullableString(lastError)) return null

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

function containsDangerousLanguage(task: CcTask): boolean {
  const missionText = `${task.title}\n${task.objective}`
  return DANGEROUS_LANGUAGE.some((pattern) => pattern.test(missionText))
}

/** Pure, fail-closed admission policy for the initial advisory canary. */
export function evaluateEligibility(task: CcTask): EligibilityDecision {
  if (task.status !== 'queued') return { eligible: false, reason: 'status-not-queued' }

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

  const ownest = extractOwnestState(task.metadata)
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
    .replace(/\b[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g, '[REDACTED]')
    .replace(/\b(Authorization\s*:\s*)(?:Bearer|Basic)\s+[^\s,;]+/gi, '$1[REDACTED]')
    .replace(/\b(Bearer)\s+[^\s,;]+/gi, '$1 [REDACTED]')
    .replace(new RegExp(`\\b(${CREDENTIAL_LABEL})(\\s*(?:=|:)\\s*)(["'])(.*?)\\3`, 'gi'), '$1$2$3[REDACTED]$3')
    .replace(new RegExp(`\\b(${CREDENTIAL_LABEL})(\\s*(?:=|:)\\s*)([^\\s,;]+)`, 'gi'), '$1$2[REDACTED]')
}

/**
 * Returns only terminal CRM transitions. Live, archived, and unknown Hermes
 * states return null so they can never fabricate completion.
 */
export function mapHermesStatus(status: string): Extract<CcTaskStatus, 'done' | 'blocked'> | null {
  const normalised = status.trim().toLowerCase()
  if (normalised === 'done') return 'done'
  if (normalised === 'blocked' || normalised === 'review') return 'blocked'
  return null
}
