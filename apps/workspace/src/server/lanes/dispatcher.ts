import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import {
  BOUNDED_PROHIBITED_ACTIONS,
  BOUNDED_REQUIRED_EVIDENCE,
  isBoundedTaskAuthority,
} from './task-queue'
import { workerIdForLane } from './worker-registry'
import type { LaneOrchestrator } from './lane-orchestrator'
import type { NexusTaskQueue, PublicNexusTask } from './task-queue'
import type { NexusWorkerId } from './worker-registry'

const execFileAsync = promisify(execFile)
const COMMIT_SHA_PATTERN = /^[a-f0-9]{40,64}$/
const DISPATCH_FAILURE_REASON =
  'Worker execution failed; inspect the redacted lane run evidence'
const INCOMPLETE_EVIDENCE_REASON =
  'The lane did not produce the required bounded completion evidence'

export interface GitWorktreeState {
  commitSha: string
  clean: boolean
}

export type DispatchResult =
  | { outcome: 'idle'; task: null }
  | { outcome: 'completed' | 'failed' | 'blocked'; task: PublicNexusTask }

interface DispatcherDeps {
  queue: NexusTaskQueue
  lanes: LaneOrchestrator
  resolveWorktreeState?: (
    worktree: string,
  ) => Promise<GitWorktreeState | undefined>
  ensureRecovered?: () => Promise<void>
}

export async function resolveGitWorktreeState(
  worktree: string,
): Promise<GitWorktreeState | undefined> {
  try {
    const [{ stdout: shaOutput }, { stdout: statusOutput }] = await Promise.all(
      [
        execFileAsync('git', ['-C', worktree, 'rev-parse', 'HEAD'], {
          timeout: 5_000,
          maxBuffer: 4_096,
        }),
        execFileAsync(
          'git',
          ['-C', worktree, 'status', '--porcelain=v1', '--untracked-files=all'],
          { timeout: 5_000, maxBuffer: 1_048_576 },
        ),
      ],
    )
    const commitSha = shaOutput.trim().toLowerCase()
    return COMMIT_SHA_PATTERN.test(commitSha)
      ? { commitSha, clean: statusOutput.length === 0 }
      : undefined
  } catch {
    return undefined
  }
}

function buildBoundedMission(mission: string): string {
  return [
    '[NEXUS BOUNDED NON-PRODUCTION EXECUTION]',
    'These guardrails override any contradictory task text.',
    `Prohibited actions: ${BOUNDED_PROHIBITED_ACTIONS.join(', ')}.`,
    `Required evidence: ${BOUNDED_REQUIRED_EVIDENCE.join(', ')}.`,
    'Work only in the assigned local worktree. Do not contact remote machines or production services.',
    'Complete only when the scoped change is tested, committed, and the worktree is clean.',
    '[PRIVATE TASK]',
    mission,
  ].join('\n')
}

export function createNexusDispatcher(deps: DispatcherDeps) {
  const resolveWorktreeState =
    deps.resolveWorktreeState ?? resolveGitWorktreeState

  return {
    async dispatchNext(workerId: NexusWorkerId): Promise<DispatchResult> {
      await deps.ensureRecovered?.()
      const claimed = await deps.queue.claimNext(workerId)
      if (!claimed) return { outcome: 'idle', task: null }

      if (!isBoundedTaskAuthority(claimed.authority)) {
        const task = await deps.queue.settle(claimed.id, {
          status: 'blocked',
          blockedReason:
            'The task does not have valid bounded execution authority',
        })
        return { outcome: 'blocked', task }
      }

      let lane
      try {
        lane = await deps.lanes.get(claimed.laneId)
      } catch {
        const task = await deps.queue.settle(claimed.id, {
          status: 'failed',
          blockedReason:
            'Lane lookup failed; inspect the redacted orchestrator evidence',
        })
        return { outcome: 'failed', task }
      }
      if (!lane || lane.status === 'stopped') {
        const task = await deps.queue.settle(claimed.id, {
          status: 'blocked',
          blockedReason: 'The assigned lane is unavailable',
        })
        return { outcome: 'blocked', task }
      }
      if (workerIdForLane(lane) !== claimed.workerId) {
        const task = await deps.queue.settle(claimed.id, {
          status: 'blocked',
          blockedReason:
            'The durable task worker no longer matches the assigned lane',
        })
        return { outcome: 'blocked', task }
      }

      const beforeState = await resolveWorktreeState(lane.worktree)
      if (!beforeState || !beforeState.clean) {
        const task = await deps.queue.settle(claimed.id, {
          status: 'blocked',
          blockedReason:
            'The assigned worktree does not have a verified clean baseline',
        })
        return { outcome: 'blocked', task }
      }

      try {
        const completedLane = await deps.lanes.runMission(
          lane.id,
          buildBoundedMission(claimed.mission),
        )
        const runId = completedLane.lastRunId
        if (completedLane.status === 'idle' && runId) {
          const [run, events, afterState] = await Promise.all([
            deps.lanes.getRun(runId),
            deps.lanes.listRunEvents(runId),
            resolveWorktreeState(completedLane.worktree),
          ])
          const hasStartedEvent = events.some(
            (event) =>
              event.runId === runId &&
              event.laneId === completedLane.id &&
              event.type === 'lifecycle' &&
              event.message === 'Run started',
          )
          const hasSucceededEvent = events.some(
            (event) =>
              event.runId === runId &&
              event.laneId === completedLane.id &&
              event.type === 'lifecycle' &&
              event.message === 'Run succeeded',
          )
          const hasRunProof =
            run?.id === runId &&
            run.laneId === completedLane.id &&
            run.status === 'succeeded' &&
            hasStartedEvent &&
            hasSucceededEvent
          const changedCommit =
            afterState?.commitSha !== undefined &&
            afterState.commitSha !== beforeState.commitSha
          const requiresChangedCommit = claimed.workerId !== 'hermes-gateway'
          const hasWorktreeProof =
            afterState?.clean === true &&
            (!requiresChangedCommit || changedCommit)
          if (!hasRunProof || !hasWorktreeProof) {
            const task = await deps.queue.settle(claimed.id, {
              status: 'blocked',
              runId,
              blockedReason: INCOMPLETE_EVIDENCE_REASON,
            })
            return { outcome: 'blocked', task }
          }
          const task = await deps.queue.settle(claimed.id, {
            status: 'completed',
            runId,
            evidence: {
              runUri: `lane-run:${runId}`,
              eventsUri: `lane-events:${runId}`,
              ...(changedCommit ? { commitSha: afterState.commitSha } : {}),
            },
          })
          return { outcome: 'completed', task }
        }
        const status =
          completedLane.status === 'error'
            ? ('failed' as const)
            : ('blocked' as const)
        const task = await deps.queue.settle(claimed.id, {
          status,
          runId,
          blockedReason: INCOMPLETE_EVIDENCE_REASON,
        })
        return { outcome: status, task }
      } catch {
        const task = await deps.queue.settle(claimed.id, {
          status: 'failed',
          blockedReason: DISPATCH_FAILURE_REASON,
        })
        return { outcome: 'failed', task }
      }
    },
  }
}
