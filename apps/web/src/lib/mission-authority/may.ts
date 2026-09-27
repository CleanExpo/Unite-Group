// src/lib/mission-authority/may.ts
//
// UNI-2779 — the one question every runner step asks: may this mission take
// this action now, or does it stop for the founder?
//
// Pure: the answer depends only on the persisted MissionAuthority object, the
// action and the observed gates — never on conversation state — so any fresh
// process holding the same authority gives the same answer.
//
// The policy (which actions exist, their class, the safe-release gates) lives
// in ONE place: scripts/nexus-runner/mission-authority.json. Nothing here
// restates those lists. An action the policy does not name fails closed.

import policy from '../../../../../scripts/nexus-runner/mission-authority.json'

export type Risk = 'low' | 'medium' | 'high' | 'critical'
export type ActionClass = 'BUILD_CONTINUE' | 'SAFE_RELEASE' | 'PROTECTED_RELEASE'
export type Boundary = ActionClass | 'NO_AUTHORITY'

export interface MissionAuthority {
  missionId: string
  intentHash: string
  intentVersion: number
  admissionReceipt: string
  authorityVersion: string
  allowedActions: string[]
  releaseMandate: { classes: string[]; maxRisk: Risk }
  expiresAt: string | null
  revokedAt: string | null
}

export interface MayInput {
  mission: MissionAuthority | null
  actor: string
  action: string
  target: string
  risk: Risk
  state: { gates: Record<string, boolean>; phase: string }
  /** Decision time in ms. Defaults to Date.now(); pass it to make a decision replayable. */
  now?: number
}

export interface MayDecision {
  verdict: 'continue' | 'escalate'
  boundary: Boundary
  reason: string
  founderPacket?: string
}

const RISKS: readonly Risk[] = ['low', 'medium', 'high', 'critical']
/** High and critical risk never auto-continue a release, whatever the mandate says. */
const MAX_AUTO_RELEASE_RISK: Risk = 'medium'
const PHASES: readonly string[] = policy.phases
const ACTION_CLASSES: Record<string, string> = policy.action_classes
const SAFE_RELEASE_GATES = Object.keys(policy.safe_release_requires)
const BUILD_PHASE_FLOOR = PHASES.indexOf('BUILD_AUTHORISED')
const RELEASE_PHASES = new Set(['RELEASE_CANDIDATE', 'SAFE_RELEASE'])

const escalate = (boundary: Boundary, reason: string, founderPacket?: string): MayDecision => ({
  verdict: 'escalate',
  boundary,
  reason,
  ...(founderPacket ? { founderPacket } : {}),
})

const nonEmpty = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0

function authorityProblem(mission: MissionAuthority | null, now: number): string | null {
  if (!mission || typeof mission !== 'object') return 'no persisted mission authority'
  if (
    !nonEmpty(mission.missionId) ||
    !nonEmpty(mission.intentHash) ||
    !nonEmpty(mission.admissionReceipt) ||
    !nonEmpty(mission.authorityVersion) ||
    !Number.isInteger(mission.intentVersion) ||
    !Array.isArray(mission.allowedActions) ||
    !mission.releaseMandate ||
    !Array.isArray(mission.releaseMandate.classes) ||
    !RISKS.includes(mission.releaseMandate.maxRisk)
  ) {
    return 'mission authority is malformed'
  }
  if (mission.authorityVersion !== policy.schema) return `mission authority was minted under ${mission.authorityVersion}, not ${policy.schema}`
  if (mission.revokedAt != null) return `mission authority was revoked at ${mission.revokedAt}`
  if (mission.expiresAt != null) {
    const expires = Date.parse(mission.expiresAt)
    if (!Number.isFinite(expires)) return 'mission authority expiry is unreadable'
    if (expires <= now) return `mission authority expired at ${mission.expiresAt}`
  }
  return null
}

function packet(input: MayInput, missing: string[]): string {
  return (
    `Mission ${input.mission?.missionId ?? '(none)'} wants to ${input.action} on ${input.target || '(no target)'} ` +
    `at ${input.risk} risk and stopped at the release boundary: ${missing.join('; ')}. ` +
    'Every build step before this ran without asking. Approve this one action, extend the release mandate, ' +
    'or leave it held; nothing else is waiting on you.'
  )
}

export function may(input: MayInput): MayDecision {
  const now = input.now ?? Date.now()
  const problem = authorityProblem(input.mission, now)
  if (problem) return escalate('NO_AUTHORITY', problem)
  const mission = input.mission as MissionAuthority

  if (!nonEmpty(input.actor)) return escalate('NO_AUTHORITY', 'no actor named for this action')

  const cls = Object.hasOwn(ACTION_CLASSES, input.action) ? ACTION_CLASSES[input.action] : undefined
  if (!cls) return escalate('NO_AUTHORITY', `action "${input.action}" has no class in the authority policy (missing_authority_mapping)`)

  const phaseIndex = PHASES.indexOf(input.state?.phase)
  if (phaseIndex < BUILD_PHASE_FLOOR) {
    return escalate('NO_AUTHORITY', `mission phase "${input.state?.phase}" is not yet BUILD_AUTHORISED`)
  }

  if (cls === 'BUILD_CONTINUE') {
    if (!mission.allowedActions.includes(input.action)) {
      return escalate('NO_AUTHORITY', `build action "${input.action}" is outside this mission's allowed actions`)
    }
    return { verdict: 'continue', boundary: 'BUILD_CONTINUE', reason: `"${input.action}" is a build step inside the authority envelope` }
  }

  if (cls === 'SAFE_RELEASE') {
    const missing: string[] = []
    if (!mission.releaseMandate.classes.includes(input.action)) missing.push(`no release mandate names ${input.action}`)
    const riskIndex = RISKS.indexOf(input.risk)
    if (riskIndex < 0 || riskIndex > RISKS.indexOf(MAX_AUTO_RELEASE_RISK)) {
      missing.push(`${input.risk} risk never auto-releases`)
    } else if (riskIndex > RISKS.indexOf(mission.releaseMandate.maxRisk)) {
      missing.push(`${input.risk} risk exceeds the mandate's ${mission.releaseMandate.maxRisk} ceiling`)
    }
    if (!RELEASE_PHASES.has(input.state.phase)) missing.push(`phase ${input.state.phase} is not a release phase`)
    const gates = input.state.gates ?? {}
    const failedGates = SAFE_RELEASE_GATES.filter((gate) => !(Object.hasOwn(gates, gate) && gates[gate] === true))
    if (failedGates.length) missing.push(`gate(s) not proven: ${failedGates.join(', ')}`)
    if (missing.length) {
      return escalate('PROTECTED_RELEASE', `safe release refused: ${missing.join('; ')}`, packet(input, missing))
    }
    return { verdict: 'continue', boundary: 'SAFE_RELEASE', reason: `"${input.action}" is mandated and every safe-release gate is proven` }
  }

  return escalate(
    'PROTECTED_RELEASE',
    `"${input.action}" is a protected action (legitimate_protected_boundary)`,
    packet(input, [`${input.action} is protected and always needs the founder`]),
  )
}
