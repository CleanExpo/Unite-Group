import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import * as yaml from 'yaml'
import { getProfilesDir } from './claude-paths'
import { listSwarmWorkerIds, readSwarmRuntimeFile } from './swarm-foundation'
import { rosterByWorkerId } from './swarm-roster'
import { readCodexCheckpoint } from './codex-runtime-checkpoint'
import { getToolArtifact } from './tool-artifacts-store'

/**
 * A read-only reconciliation of the runtimes that actually publish task state.
 *
 * This intentionally does not infer activity from a chat, dispatch commands, or
 * change an agent configuration. A runner becomes visible only through its own
 * runtime checkpoint, and a completion only becomes handoff-eligible when it
 * includes a concrete next action and evidence.
 */
export type ControlPlaneState =
  | 'active'
  | 'waiting'
  | 'blocked'
  | 'complete'
  | 'unknown'

export type EvidenceStatus = 'present' | 'missing' | 'not_required'
export type DeadlineStatus = 'not_set' | 'on_track' | 'overdue'

export type ControlPlaneTask = {
  taskId: string
  title: string
  owner: string
  runtime: 'hermes' | 'codex' | 'ollama'
  state: ControlPlaneState
  evidenceStatus: EvidenceStatus
  deadlineStatus: DeadlineStatus
  deadlineAt: number | null
  evidence: Array<{ label: string; kind: string }>
  blocker: string | null
  nextAction: string | null
  handoff: {
    eligible: boolean
    target: 'reviewer' | 'orchestrator' | null
    reason: string | null
  }
  observedAt: number | null
}

export type RuntimeControlPlane = {
  source: 'runtime_checkpoints_only'
  checkedAt: number
  execution: 'disabled'
  runtimes: Array<{
    id: 'hermes' | 'codex' | 'ollama'
    state: 'observed' | 'not_reporting' | 'stale'
    detail: string
  }>
  tasks: Array<ControlPlaneTask>
  summary: {
    active: number
    blocked: number
    complete: number
    missingEvidence: number
    overdue: number
    eligibleHandoffs: number
  }
}

type RawRuntime = ReturnType<typeof readSwarmRuntimeFile>['runtime']
type RuntimeSource = ReturnType<typeof readSwarmRuntimeFile>['source']

export const HERMES_CHECKPOINT_MAX_AGE_MS = 10 * 60 * 1000

type ReceiptSubject = {
  version: 1
  taskId: string
  workerId: string
  source: 'test-runner' | 'independent-review' | 'external-service'
}

type ReceiptReference = {
  artifactId: string
  sha256: string
  source: 'workspace-tool-artifact'
}

function nonEmpty(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function stateFromRuntime(runtime: RawRuntime): ControlPlaneState {
  if (runtime.checkpointStatus === 'done') return 'complete'
  if (runtime.state === 'blocked' || runtime.checkpointStatus === 'blocked')
    return 'blocked'
  if (runtime.state === 'executing' || runtime.checkpointStatus === 'in_progress')
    return 'active'
  if (runtime.state === 'waiting' || runtime.checkpointStatus === 'needs_input')
    return 'waiting'
  return 'unknown'
}

function deadlineStatus(deadlineAt: number | null, now: number): DeadlineStatus {
  if (!deadlineAt) return 'not_set'
  return deadlineAt < now ? 'overdue' : 'on_track'
}

function deadlineFromRuntime(runtime: RawRuntime): number | null {
  const raw = (runtime as unknown as Record<string, unknown>).deadlineAt
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : null
}

function isActiveRuntime(runtime: RawRuntime): boolean {
  return runtime.state === 'executing' || runtime.checkpointStatus === 'in_progress'
}

function isStaleActiveRuntime(runtime: RawRuntime, now: number): boolean {
  return (
    isActiveRuntime(runtime) &&
    (runtime.lastOutputAt === null || now - runtime.lastOutputAt > HERMES_CHECKPOINT_MAX_AGE_MS)
  )
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

function verifiedReceipt(reference: ReceiptReference, taskId: string, workerId: string): boolean {
  const artifact = getToolArtifact(reference.artifactId)
  if (!artifact || sha256(artifact.content) !== reference.sha256) return false
  try {
    const subject = JSON.parse(artifact.content) as Partial<ReceiptSubject>
    return (
      subject.version === 1 &&
      subject.taskId === taskId &&
      subject.workerId === workerId &&
      (subject.source === 'test-runner' ||
        subject.source === 'independent-review' ||
        subject.source === 'external-service')
    )
  } catch {
    return false
  }
}

function verifiedHermesArtifacts(runtime: RawRuntime, taskId: string): Array<{ label: string; kind: string }> {
  return runtime.artifacts.flatMap((artifact) => {
    const receipt = artifact.receipt
    if (
      !receipt ||
      receipt.artifactId !== artifact.id ||
      !verifiedReceipt(receipt, taskId, runtime.workerId)
    ) {
      return []
    }
    return [{ label: artifact.label, kind: artifact.kind }]
  })
}

function verifiedCodexArtifacts(
  evidence: Array<{ label: string; kind: string; artifactId: string; sha256: string; source: 'workspace-tool-artifact' }>,
  taskId: string,
): Array<{ label: string; kind: string }> {
  return evidence.flatMap((entry) =>
    verifiedReceipt(entry, taskId, 'codex')
      ? [{ label: entry.label, kind: entry.kind }]
      : [],
  )
}

function taskForRuntime(input: {
  workerId: string
  runtime: RawRuntime
  title: string
  now: number
}): ControlPlaneTask | null {
  const { workerId, runtime, title, now } = input
  const state = isStaleActiveRuntime(runtime, now) ? 'unknown' : stateFromRuntime(runtime)
  const taskId = `${workerId}:${runtime.sessionId ?? 'current'}`
  const artifacts = verifiedHermesArtifacts(runtime, taskId)
  const requiresEvidence = state === 'complete'
  const evidenceStatus: EvidenceStatus = requiresEvidence
    ? artifacts.length > 0
      ? 'present'
      : 'missing'
    : 'not_required'
  const nextAction = nonEmpty(runtime.nextAction)
  const reviewLike = /review|verify|test|gate/i.test(nextAction ?? '')
  const handoffEligible =
    state === 'complete' && artifacts.length > 0 && Boolean(nextAction)

  // Do not surface an idle shell as a real task. It has no evidence-bearing
  // state and is exactly the kind of invented progress this panel must avoid.
  if (!runtime.currentTask && !runtime.lastResult && !runtime.blockedReason)
    return null

  const deadlineAt = deadlineFromRuntime(runtime)
  return {
    taskId,
    title: runtime.currentTask ?? title,
    owner: workerId,
    runtime: 'hermes',
    state,
    evidenceStatus,
    deadlineStatus: deadlineStatus(deadlineAt, now),
    deadlineAt,
    evidence: artifacts,
    blocker: isStaleActiveRuntime(runtime, now)
      ? 'Runtime checkpoint is stale; no current activity is inferred.'
      : nonEmpty(runtime.blockedReason),
    nextAction,
    handoff: {
      eligible: handoffEligible,
      target: handoffEligible ? (reviewLike ? 'reviewer' : 'orchestrator') : null,
      reason: handoffEligible
        ? 'Completion has runtime evidence and a declared next action.'
        : state === 'complete' && evidenceStatus === 'missing'
          ? 'Completion has no runtime evidence.'
          : state === 'complete'
            ? 'Completion has no declared next action.'
            : null,
    },
    observedAt: runtime.lastOutputAt,
  }
}

function configReportsLocalGemma(hermesRoot: string): boolean {
  const configPath = join(hermesRoot, 'config.yaml')
  if (!existsSync(configPath)) return false
  try {
    const text = readFileSync(configPath, 'utf8')
    const parsed = yaml.parse(text) as unknown
    return /ollama|gemma4/i.test(JSON.stringify(parsed))
  } catch {
    return false
  }
}

export function buildRuntimeControlPlane(input: {
  workerIds: Array<string>
  runtimes: Array<{ workerId: string; runtime: RawRuntime; source?: RuntimeSource }>
  now?: number
  hermesReportsLocalGemma?: boolean
  codexCheckpoint?: ReturnType<typeof readCodexCheckpoint>
}): RuntimeControlPlane {
  const now = input.now ?? Date.now()
  const roster = rosterByWorkerId(input.workerIds)
  const reportedRuntimes = input.runtimes.filter(
    ({ source = 'runtime.json' }) => source === 'runtime.json',
  )
  const staleRuntimes = reportedRuntimes.filter(({ runtime }) =>
    isStaleActiveRuntime(runtime, now),
  )
  const tasks = reportedRuntimes
    .map(({ workerId, runtime }) =>
      taskForRuntime({
        workerId,
        runtime,
        title: roster.get(workerId)?.mission ?? 'Runtime task',
        now,
      }),
    )
    .filter((task): task is ControlPlaneTask => Boolean(task))

  const codex = input.codexCheckpoint ?? {
    checkpoint: null,
    detail: 'Codex has not published a checkpoint.',
  }
  const codexTaskId = codex.checkpoint ? `codex:${codex.checkpoint.task.id}` : null
  const codexArtifacts = codex.checkpoint && codexTaskId
    ? verifiedCodexArtifacts(codex.checkpoint.task.evidence, codexTaskId)
    : []
  const codexTask = codex.checkpoint && codexTaskId
    ? {
        taskId: codexTaskId,
        title: codex.checkpoint.task.title,
        owner: 'codex',
        runtime: 'codex' as const,
        state: codex.checkpoint.task.state,
        evidenceStatus: codex.checkpoint.task.state === 'complete'
          ? (codexArtifacts.length > 0
              ? 'present' as const
              : 'missing' as const)
          : 'not_required' as const,
        deadlineStatus: deadlineStatus(codex.checkpoint.task.deadlineAt, now),
        deadlineAt: codex.checkpoint.task.deadlineAt,
        evidence: codexArtifacts,
        blocker: codex.checkpoint.task.blocker,
        nextAction: codex.checkpoint.task.nextAction,
        handoff: {
          eligible: codex.checkpoint.task.state === 'complete' &&
            codexArtifacts.length > 0 &&
            Boolean(codex.checkpoint.task.nextAction),
          target: codex.checkpoint.task.state === 'complete' && codex.checkpoint.task.nextAction
            ? (/review|verify|test|gate/i.test(codex.checkpoint.task.nextAction) ? 'reviewer' as const : 'orchestrator' as const)
            : null,
          reason: codex.checkpoint.task.state === 'complete'
            ? 'Codex completion requires evidence or receipt plus a declared next action.'
            : null,
        },
        observedAt: codex.checkpoint.observedAt,
      }
    : null
  const allTasks = codexTask ? [...tasks, codexTask] : tasks

  return {
    source: 'runtime_checkpoints_only',
    checkedAt: now,
    execution: 'disabled',
    runtimes: [
      {
        id: 'hermes',
        state: staleRuntimes.length
          ? 'stale'
          : reportedRuntimes.length
            ? 'observed'
            : 'not_reporting',
        detail: staleRuntimes.length
          ? `${staleRuntimes.length} Hermes active checkpoint(s) are stale; no current activity is inferred.`
          : reportedRuntimes.length
            ? `${reportedRuntimes.length} worker runtime checkpoint(s) observed.`
            : 'No readable Hermes worker runtime checkpoints found.',
      },
      {
        id: 'codex',
        state: codexTask ? 'observed' : 'not_reporting',
        detail: codex.detail,
      },
      {
        id: 'ollama',
        state: input.hermesReportsLocalGemma ? 'observed' : 'not_reporting',
        detail: input.hermesReportsLocalGemma
          ? 'Hermes configuration declares a local Ollama/Gemma runtime.'
          : 'No local Ollama/Gemma declaration was found in Hermes configuration.',
      },
    ],
    tasks: allTasks,
    summary: {
      active: allTasks.filter((task) => task.state === 'active').length,
      blocked: allTasks.filter((task) => task.state === 'blocked').length,
      complete: allTasks.filter((task) => task.state === 'complete').length,
      missingEvidence: allTasks.filter((task) => task.evidenceStatus === 'missing').length,
      overdue: allTasks.filter((task) => task.deadlineStatus === 'overdue').length,
      eligibleHandoffs: allTasks.filter((task) => task.handoff.eligible).length,
    },
  }
}

export function readRuntimeControlPlane(now = Date.now()): RuntimeControlPlane {
  const workerIds = listSwarmWorkerIds({ swarmOnly: true })
  const profilesDir = getProfilesDir()
  const runtimes = workerIds.map((workerId) => {
    const read = readSwarmRuntimeFile(join(profilesDir, workerId), workerId, {
      workspaceRoot: process.cwd(),
    })
    return { workerId, runtime: read.runtime, source: read.source }
  })
  return buildRuntimeControlPlane({
    workerIds,
    runtimes,
    now,
    codexCheckpoint: readCodexCheckpoint({ now }),
    hermesReportsLocalGemma: configReportsLocalGemma(join(profilesDir, '..')),
  })
}
