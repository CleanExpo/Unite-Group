import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { sanitiseLaneOutput } from './adapter'
import { workerIdForLane } from './worker-registry'
import type { LaneOrchestrator } from './lane-orchestrator'
import type { NexusTaskQueue, PublicNexusTask } from './task-queue'
import type { NexusWorkerId } from './worker-registry'

const execFileAsync = promisify(execFile)

export type DispatchResult =
  | { outcome: 'idle'; task: null }
  | { outcome: 'completed' | 'failed' | 'blocked'; task: PublicNexusTask }

interface DispatcherDeps {
  queue: NexusTaskQueue
  lanes: LaneOrchestrator
  resolveCommitSha?: (worktree: string) => Promise<string | undefined>
  ensureRecovered?: () => Promise<void>
}

export async function resolveGitCommitSha(
  worktree: string,
): Promise<string | undefined> {
  try {
    const { stdout } = await execFileAsync(
      'git',
      ['-C', worktree, 'rev-parse', 'HEAD'],
      { timeout: 5_000, maxBuffer: 4_096 },
    )
    const sha = stdout.trim().toLowerCase()
    return /^[a-f0-9]{40,64}$/.test(sha) ? sha : undefined
  } catch {
    return undefined
  }
}

export function createNexusDispatcher(deps: DispatcherDeps) {
  const resolveCommitSha = deps.resolveCommitSha ?? resolveGitCommitSha

  return {
    async dispatchNext(workerId: NexusWorkerId): Promise<DispatchResult> {
      await deps.ensureRecovered?.()
      const claimed = await deps.queue.claimNext(workerId)
      if (!claimed) return { outcome: 'idle', task: null }

      let lane
      try {
        lane = await deps.lanes.get(claimed.laneId)
      } catch (error) {
        const task = await deps.queue.settle(claimed.id, {
          status: 'failed',
          blockedReason: sanitiseLaneOutput(
            error instanceof Error ? error.message : 'Lane lookup failed',
            400,
          ),
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

      try {
        const completedLane = await deps.lanes.runMission(
          lane.id,
          claimed.mission,
        )
        const runId = completedLane.lastRunId
        const evidence = runId
          ? {
              runUri: `lane-run:${runId}`,
              eventsUri: `lane-events:${runId}`,
              ...(completedLane.status === 'idle'
                ? {
                    commitSha: await resolveCommitSha(completedLane.worktree),
                  }
                : {}),
            }
          : undefined

        if (completedLane.status === 'idle' && runId) {
          const task = await deps.queue.settle(claimed.id, {
            status: 'completed',
            runId,
            evidence,
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
          evidence,
          blockedReason:
            completedLane.blockedReason ??
            'The lane did not produce a completed run',
        })
        return { outcome: status, task }
      } catch (error) {
        const task = await deps.queue.settle(claimed.id, {
          status: 'failed',
          blockedReason: sanitiseLaneOutput(
            error instanceof Error ? error.message : 'Dispatch failed',
            400,
          ),
        })
        return { outcome: 'failed', task }
      }
    },
  }
}
