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
import { parseLaneMissionInput } from '../../../server/lanes/types'
import { workerIdForLane } from '../../../server/lanes/worker-registry'
import type { PublicNexusTask } from '../../../server/lanes'

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
          const input = parseLaneMissionInput(await request.json())
          if (!input) {
            return json(
              { ok: false, error: 'A valid id and mission are required' },
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
