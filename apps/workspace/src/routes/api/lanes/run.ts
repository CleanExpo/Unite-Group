import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { requireLocalOrAuth } from '../../../server/auth-middleware'
import { requireJsonContentType } from '../../../server/rate-limit'
import { getLaneOrchestrator } from '../../../server/lanes'
import { LaneConflictError } from '../../../server/lanes/lane-orchestrator'
import { parseLaneMissionInput } from '../../../server/lanes/types'

export const Route = createFileRoute('/api/lanes/run')({
  server: {
    handlers: {
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
          const orchestrator = getLaneOrchestrator()
          const lane = await orchestrator.runMission(input.id, input.mission)
          let run = null
          if (lane.lastRunId) {
            try {
              run = await orchestrator.getRun(lane.lastRunId)
            } catch {
              // The mission already settled. Preserve that truthful success even
              // when the follow-up evidence read is temporarily unavailable.
            }
          }
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
