import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { isAuthenticated } from '../../../server/auth-middleware'
import { requireJsonContentType } from '../../../server/rate-limit'
import { getLaneOrchestrator } from '../../../server/lanes'
import { LaneConflictError } from '../../../server/lanes/lane-orchestrator'

export const Route = createFileRoute('/api/lanes/run')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isAuthenticated(request)) {
          return json({ ok: false, error: 'Unauthorized' }, { status: 401 })
        }
        const csrfCheck = requireJsonContentType(request)
        if (csrfCheck) return csrfCheck
        try {
          const body = (await request.json()) as {
            id?: string
            mission?: string
          }
          if (!body.id || !body.mission) {
            return json(
              { ok: false, error: 'id and mission are required' },
              { status: 400 },
            )
          }
          const orchestrator = getLaneOrchestrator()
          const lane = await orchestrator.runMission(body.id, body.mission)
          const run = lane.lastRunId
            ? await orchestrator.getRun(lane.lastRunId)
            : null
          return json({ ok: true, lane, run })
        } catch (error) {
          const conflict = error instanceof LaneConflictError
          return json(
            {
              ok: false,
              error: conflict ? error.message : 'Failed to run mission',
            },
            { status: conflict ? 409 : 500 },
          )
        }
      },
    },
  },
})
