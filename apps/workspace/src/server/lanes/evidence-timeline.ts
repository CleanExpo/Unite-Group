/**
 * End-to-end evidence timeline — UNI-2411.
 *
 * Reconstructs one founder-readable story from idea to verified result, using
 * only the control-plane ledger and the artefacts it points at: input → spec →
 * task → dispatch → lane → tool calls → tests → review → PR → gate.
 *
 * ## Two properties this exists to guarantee
 *
 * **A missing stage is reported, never omitted.** The obvious implementation
 * builds a list of the stages it found, which renders a run that skipped review
 * as a tidy, complete-looking timeline with one fewer row. Nobody notices a row
 * that was never drawn. So the stage list is a fixed spine, every stage is
 * always present, and one that has no evidence is explicitly `missing`. The
 * ticket's verification step — "detect a deliberately missing stage" — is only
 * answerable this way.
 *
 * **Claimed is not verified.** An evidence link someone asserted and one that
 * was checked look identical once they are both a URL in a list. They are kept
 * as distinct states, `verified` requires naming what verified it, and there is
 * no code path that promotes one to the other without a verifier. A timeline
 * that cannot tell the difference is a timeline that launders assertions into
 * proof.
 *
 * Nothing here executes or mutates. It reads a ledger and returns a view.
 */
import { findIdentityChainGaps, IDENTITY_CHAIN } from '../../../../../contracts/control-plane/v1'
import { sanitiseLaneOutput } from './adapter'
import type { ControlPlaneIdentity } from '../../../../../contracts/control-plane/v1'
import type { LaneStreamEvent } from './event-stream'

/** The fixed spine. Every timeline has every stage, present or missing. */
export const TIMELINE_STAGES = [
  'founder_input',
  'specification',
  'linear_task',
  'dispatch',
  'lane_run',
  'tool_calls',
  'tests',
  'review',
  'pull_request',
  'final_gate',
] as const

export type TimelineStageName = (typeof TIMELINE_STAGES)[number]

export type StageState = 'missing' | 'recorded' | 'verified' | 'failed'

/** How long evidence is kept before it may be pruned. Stated, not implied. */
export const RETENTION_DAYS = 90

/**
 * An artefact the timeline points at.
 *
 * `claimed` means something asserted this link exists. `verified` means a named
 * verifier checked it. There is deliberately no helper that turns the first
 * into the second — promotion requires a verifier, or the distinction is
 * decorative.
 */
export interface EvidenceLink {
  kind: 'test_output' | 'pull_request' | 'deployment' | 'commit' | 'review' | 'log'
  /** Where the artefact lives. Redacted and bounded before it is stored. */
  uri: string
  status: 'claimed' | 'verified'
  /** Required when status is `verified`; names what did the checking. */
  verifiedBy?: string
  verifiedAt?: string
}

export interface TimelineStage {
  stage: TimelineStageName
  state: StageState
  /** Which surface produced the evidence for this stage. */
  source: string | null
  owner: string | null
  machineId: string | null
  /** Model or plan that did the work, when the ledger records one. */
  model: string | null
  durationMs: number | null
  evidence: EvidenceLink[]
  /** Why the stage is in this state, in words a founder can act on. */
  note: string
}

export interface TimelineIntegrity {
  /** True only when every stage is recorded or verified and the chain is whole. */
  complete: boolean
  missingStages: TimelineStageName[]
  /** Identity links that skip a parent — work that entered through a second door. */
  identityGaps: string[]
  /** Evidence that is asserted but never checked. */
  unverifiedEvidence: number
}

export interface EvidenceTimeline {
  identity: ControlPlaneIdentity
  stages: TimelineStage[]
  integrity: TimelineIntegrity
  retentionDays: number
}

export interface TimelineFilter {
  business?: string
  project?: string
  taskId?: string
  machineId?: string
  agent?: string
}

/** Ledger rows the timeline reads beyond the lane event stream. */
export interface TimelineRecord {
  stage: TimelineStageName
  source: string
  owner?: string
  machineId?: string
  model?: string
  durationMs?: number
  occurredAt?: string
  failed?: boolean
  evidence?: EvidenceLink[]
  business?: string
  project?: string
  taskId?: string
  agent?: string
}

/** Bound and redact any URI before it enters the ledger view. */
export function safeUri(uri: unknown): string {
  if (typeof uri !== 'string' || uri.trim() === '') return ''
  return sanitiseLaneOutput(uri.trim(), 500)
}

/**
 * Normalise an evidence link, refusing to record a `verified` claim that names
 * no verifier.
 *
 * "Verified by nobody" is the exact shape of a laundered assertion, so it is
 * demoted to `claimed` rather than trusted.
 */
export function normaliseEvidence(link: EvidenceLink): EvidenceLink {
  const uri = safeUri(link.uri)
  const verifiedProperly =
    link.status === 'verified' &&
    typeof link.verifiedBy === 'string' &&
    link.verifiedBy.trim() !== ''
  return {
    kind: link.kind,
    uri,
    status: verifiedProperly ? 'verified' : 'claimed',
    ...(verifiedProperly ? { verifiedBy: link.verifiedBy } : {}),
    ...(verifiedProperly && link.verifiedAt ? { verifiedAt: link.verifiedAt } : {}),
  }
}

function stageFromRecords(
  stage: TimelineStageName,
  records: readonly TimelineRecord[],
): TimelineStage {
  const matching = records.filter((record) => record.stage === stage)
  if (matching.length === 0) {
    return {
      stage,
      state: 'missing',
      source: null,
      owner: null,
      machineId: null,
      model: null,
      durationMs: null,
      evidence: [],
      note: 'no evidence recorded for this stage',
    }
  }
  const latest = matching[matching.length - 1]!
  const evidence = (latest.evidence ?? []).map(normaliseEvidence)
  const anyVerified = evidence.some((link) => link.status === 'verified')
  const state: StageState = latest.failed
    ? 'failed'
    : anyVerified
      ? 'verified'
      : 'recorded'
  return {
    stage,
    state,
    source: latest.source,
    owner: latest.owner ?? null,
    machineId: latest.machineId ?? null,
    model: latest.model ?? null,
    durationMs: typeof latest.durationMs === 'number' ? latest.durationMs : null,
    evidence,
    note: latest.failed
      ? 'stage recorded a failure'
      : anyVerified
        ? 'evidence verified'
        : 'evidence recorded but not independently verified',
  }
}

/**
 * Derive the lane_run and tool_calls stages from the live event stream, so the
 * timeline and the stream cannot disagree about what a run did.
 */
export function recordsFromEvents(events: readonly LaneStreamEvent[]): TimelineRecord[] {
  if (events.length === 0) return []
  const first = events[0]!
  const records: TimelineRecord[] = []

  const failed = events.some((event) => event.kind === 'error')
  const started = Date.parse(first.occurredAt)
  const ended = Date.parse(events[events.length - 1]!.occurredAt)
  records.push({
    stage: 'lane_run',
    source: first.source,
    machineId: first.machineId,
    agent: first.agent,
    model: first.agent,
    ...(Number.isFinite(started) && Number.isFinite(ended) && ended >= started
      ? { durationMs: ended - started }
      : {}),
    occurredAt: first.occurredAt,
    failed,
  })

  const toolEvents = events.filter((event) => event.kind === 'tool_call' && event.tool)
  if (toolEvents.length > 0) {
    records.push({
      stage: 'tool_calls',
      source: first.source,
      machineId: first.machineId,
      agent: first.agent,
      failed: toolEvents.some((event) => event.tool?.status === 'failed'),
      evidence: toolEvents.map((event) => ({
        kind: 'log' as const,
        uri: `tool:${event.tool?.name ?? 'unknown'}#${event.sequence}`,
        // A tool result is the CLI's own report, not an independent check.
        status: 'claimed' as const,
      })),
    })
  }

  const evidenceEvents = events.filter((event) => event.kind === 'evidence')
  if (evidenceEvents.length > 0) {
    records.push({
      stage: 'tests',
      source: first.source,
      machineId: first.machineId,
      evidence: evidenceEvents.map((event) => ({
        kind: 'test_output' as const,
        uri: `event:${event.sequence}`,
        status: 'claimed' as const,
      })),
    })
  }
  return records
}

/** Keep only records matching every provided filter field. */
export function filterRecords(
  records: readonly TimelineRecord[],
  filter: TimelineFilter = {},
): TimelineRecord[] {
  return records.filter((record) => {
    if (filter.business && record.business !== filter.business) return false
    if (filter.project && record.project !== filter.project) return false
    if (filter.taskId && record.taskId !== filter.taskId) return false
    if (filter.machineId && record.machineId !== filter.machineId) return false
    if (filter.agent && record.agent !== filter.agent) return false
    return true
  })
}

/**
 * Build the timeline.
 *
 * `complete` is true only when no stage is missing, no identity link skips its
 * parent, and nothing failed. It is deliberately strict: a founder reading
 * "complete" must be able to act on it, and a timeline that reports complete
 * with a hole in it is worse than no timeline at all.
 */
export function buildTimeline(
  identity: ControlPlaneIdentity,
  records: readonly TimelineRecord[],
  events: readonly LaneStreamEvent[] = [],
  filter: TimelineFilter = {},
): EvidenceTimeline {
  const combined = filterRecords([...records, ...recordsFromEvents(events)], filter)
  const stages = TIMELINE_STAGES.map((stage) => stageFromRecords(stage, combined))
  const missingStages = stages
    .filter((stage) => stage.state === 'missing')
    .map((stage) => stage.stage)
  // `ControlPlaneIdentity` has no index signature; the contract's checker takes
  // a bag of unknowns so it can be handed untrusted input too.
  const identityGaps = findIdentityChainGaps({ ...identity } as Record<string, unknown>)
  const unverifiedEvidence = stages.reduce(
    (total, stage) =>
      total + stage.evidence.filter((link) => link.status !== 'verified').length,
    0,
  )
  return {
    identity,
    stages,
    integrity: {
      complete:
        missingStages.length === 0 &&
        identityGaps.length === 0 &&
        stages.every((stage) => stage.state !== 'failed'),
      missingStages,
      identityGaps,
      unverifiedEvidence,
    },
    retentionDays: RETENTION_DAYS,
  }
}

/**
 * One-line summaries for a founder scanning the timeline.
 *
 * Missing stages are named first. The point of the timeline is what is absent.
 */
export function summariseTimeline(timeline: EvidenceTimeline): string[] {
  const lines: string[] = []
  if (timeline.integrity.missingStages.length > 0) {
    lines.push(`missing: ${timeline.integrity.missingStages.join(', ')}`)
  }
  for (const gap of timeline.integrity.identityGaps) lines.push(`identity gap: ${gap}`)
  if (timeline.integrity.unverifiedEvidence > 0) {
    lines.push(
      `${timeline.integrity.unverifiedEvidence} evidence link(s) claimed but not verified`,
    )
  }
  if (lines.length === 0) lines.push('complete: every stage recorded, chain whole, evidence verified')
  return lines
}

/** The identity fields a timeline must carry, in order. Re-exported for callers. */
export const TIMELINE_IDENTITY_CHAIN = IDENTITY_CHAIN
