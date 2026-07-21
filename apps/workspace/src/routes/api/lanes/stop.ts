import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { requireLocalOrAuth } from '../../../server/auth-middleware'
import { requireJsonContentType } from '../../../server/rate-limit'
import { getLaneOrchestrator } from '../../../server/lanes'
import { StopNotAcknowledgedError } from '../../../server/lanes/adapter'
import { LaneConflictError } from '../../../server/lanes/lane-orchestrator'
import { parseLaneIdInput } from '../../../server/lanes/types'

export const Route = createFileRoute('/api/lanes/stop')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!requireLocalOrAuth(request)) {
          return json({ ok: false, error: 'Unauthorized' }, { status: 401 })
        }
        const csrfCheck = requireJsonContentType(request)
        if (csrfCheck) return csrfCheck
        try {
          const body: unknown = await request.json()
          const id =
            typeof body === 'object' && body !== null && !Array.isArray(body)
              ? parseLaneIdInput((body as Record<string, unknown>).id)
              : null
          if (!id) {
            return json({ ok: false, error: 'A valid id is required' }, { status: 400 })
          }
          const lane = await getLaneOrchestrator().stop(id)
          return json({ ok: true, lane })
        } catch (error) {
          const conflict =
            error instanceof LaneConflictError ||
            error instanceof StopNotAcknowledgedError
          return json(
            {
              ok: false,
              error: conflict ? error.message : 'Failed to stop lane',
            },
            { status: conflict ? 409 : 500 },
          )
        }
      },
    },
  },
})
