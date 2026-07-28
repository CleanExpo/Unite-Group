import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { requireLocalOrAuth } from '../../../server/auth-middleware'
import { requireJsonContentType } from '../../../server/rate-limit'
import {
  ensureNexusTaskQueueRecovered,
  getLaneOrchestrator,
  getNexusTaskQueue,
  getNexusWorkers,
} from '../../../server/lanes'
import { createBoundedTaskAuthority } from '../../../server/lanes/task-queue'
import { parseLaneMissionInput } from '../../../server/lanes/types'
import { workerIdForLane } from '../../../server/lanes/worker-registry'
import type { PublicNexusTask } from '../../../server/lanes'

function isExplicitlyApproved(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    (value as Record<string, unknown>).approved === true
  )
}

export function summariseNexusTasks(tasks: Array<PublicNexusTask>) {
  return {
    pending: tasks.filter((task) => task.status === 'pending').length,
    running: tasks.filter((task) => task.status === 'running').length,
    completed: tasks.filter((task) => task.status === 'completed').length,
    blocked: tasks.filter(
      (task) => task.status === 'blocked' || task.status === 'failed',
    ).length,
  }
}

export const Route = createFileRoute('/api/lanes/tasks')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!requireLocalOrAuth(request)) {
          return json({ ok: false, error: 'Unauthorized' }, { status: 401 })
        }
        try {
          await ensureNexusTaskQueueRecovered()
          const [tasks, workers] = await Promise.all([
            getNexusTaskQueue().list(),
            getNexusWorkers(),
          ])
          return json({
            ok: true,
            tasks,
            summary: summariseNexusTasks(tasks),
            workers,
          })
        } catch {
          return json(
            { ok: false, error: 'Failed to read Nexus tasks' },
            { status: 500 },
          )
        }
      },

      POST: async ({ request }) => {
        if (!requireLocalOrAuth(request)) {
          return json({ ok: false, error: 'Unauthorized' }, { status: 401 })
        }
        const csrfCheck = requireJsonContentType(request)
        if (csrfCheck) return csrfCheck
        try {
          const body: unknown = await request.json()
          const input = parseLaneMissionInput(body)
          if (!input || !isExplicitlyApproved(body)) {
            return json(
              {
                ok: false,
                error:
                  'A valid id, mission and explicit bounded-task approval are required',
              },
              { status: 400 },
            )
          }
          await ensureNexusTaskQueueRecovered()
          const lane = await getLaneOrchestrator().get(input.id)
          if (!lane || lane.status === 'stopped') {
            return json(
              { ok: false, error: 'The selected lane is unavailable' },
              { status: 409 },
            )
          }
          const task = await getNexusTaskQueue().enqueue({
            laneId: lane.id,
            workerId: workerIdForLane(lane),
            mission: input.mission,
            authority: createBoundedTaskAuthority(),
          })
          return json({ ok: true, task }, { status: 202 })
        } catch {
          return json(
            { ok: false, error: 'Failed to queue Nexus task' },
            { status: 500 },
          )
        }
      },
    },
  },
})
