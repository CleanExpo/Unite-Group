import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import * as yaml from 'yaml'
import { getProfilesDir } from './claude-paths'
import { listSwarmWorkerIds, readSwarmRuntimeFile } from './swarm-foundation'
import { rosterByWorkerId } from './swarm-roster'

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
    state: 'observed' | 'not_reporting'
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

function taskForRuntime(input: {
  workerId: string
  runtime: RawRuntime
  title: string
  now: number
}): ControlPlaneTask | null {
  const { workerId, runtime, title, now } = input
  const state = stateFromRuntime(runtime)
  const artifacts = runtime.artifacts.map((artifact) => ({
    label: artifact.label,
    kind: artifact.kind,
  }))
  const requiresEvidence = state === 'complete'
  const evidenceStatus: EvidenceStatus = requiresEvidence
    ? artifacts.length > 0 || Boolean(nonEmpty(runtime.lastResult))
      ? 'present'
      : 'missing'
    : 'not_required'
  const nextAction = nonEmpty(runtime.nextAction)
  const reviewLike = /review|verify|test|gate/i.test(nextAction ?? '')
  const handoffEligible =
    state === 'complete' && evidenceStatus === 'present' && Boolean(nextAction)

  // Do not surface an idle shell as a real task. It has no evidence-bearing
  // state and is exactly the kind of invented progress this panel must avoid.
  if (!runtime.currentTask && !runtime.lastResult && !runtime.blockedReason)
    return null

  const deadlineAt = deadlineFromRuntime(runtime)
  return {
    taskId: `${workerId}:${runtime.sessionId ?? 'current'}`,
    title: runtime.currentTask ?? title,
    owner: workerId,
    runtime: 'hermes',
    state,
    evidenceStatus,
    deadlineStatus: deadlineStatus(deadlineAt, now),
    deadlineAt,
    evidence: artifacts,
    blocker: nonEmpty(runtime.blockedReason),
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
  runtimes: Array<{ workerId: string; runtime: RawRuntime }>
  now?: number
  hermesReportsLocalGemma?: boolean
}): RuntimeControlPlane {
  const now = input.now ?? Date.now()
  const roster = rosterByWorkerId(input.workerIds)
  const tasks = input.runtimes
    .map(({ workerId, runtime }) =>
      taskForRuntime({
        workerId,
        runtime,
        title: roster.get(workerId)?.mission ?? 'Runtime task',
        now,
      }),
    )
    .filter((task): task is ControlPlaneTask => Boolean(task))

  return {
    source: 'runtime_checkpoints_only',
    checkedAt: now,
    execution: 'disabled',
    runtimes: [
      {
        id: 'hermes',
        state: input.runtimes.length ? 'observed' : 'not_reporting',
        detail: input.runtimes.length
          ? `${input.runtimes.length} worker runtime checkpoint(s) observed.`
          : 'No Hermes worker runtime checkpoints found.',
      },
      {
        id: 'codex',
        state: 'not_reporting',
        detail:
          'Codex does not yet publish into the shared checkpoint contract; no activity is inferred.',
      },
      {
        id: 'ollama',
        state: input.hermesReportsLocalGemma ? 'observed' : 'not_reporting',
        detail: input.hermesReportsLocalGemma
          ? 'Hermes configuration declares a local Ollama/Gemma runtime.'
          : 'No local Ollama/Gemma declaration was found in Hermes configuration.',
      },
    ],
    tasks,
    summary: {
      active: tasks.filter((task) => task.state === 'active').length,
      blocked: tasks.filter((task) => task.state === 'blocked').length,
      complete: tasks.filter((task) => task.state === 'complete').length,
      missingEvidence: tasks.filter((task) => task.evidenceStatus === 'missing').length,
      overdue: tasks.filter((task) => task.deadlineStatus === 'overdue').length,
      eligibleHandoffs: tasks.filter((task) => task.handoff.eligible).length,
    },
  }
}

export function readRuntimeControlPlane(now = Date.now()): RuntimeControlPlane {
  const workerIds = listSwarmWorkerIds({ swarmOnly: true })
  const profilesDir = getProfilesDir()
  const runtimes = workerIds.map((workerId) => ({
    workerId,
    runtime: readSwarmRuntimeFile(join(profilesDir, workerId), workerId, {
      workspaceRoot: process.cwd(),
    }).runtime,
  }))
  return buildRuntimeControlPlane({
    workerIds,
    runtimes,
    now,
    hermesReportsLocalGemma: configReportsLocalGemma(join(profilesDir, '..')),
  })
}
