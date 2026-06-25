import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { isAuthenticated } from '../../../server/auth-middleware'
import { requireJsonContentType } from '../../../server/rate-limit'
import { getLaneOrchestrator } from '../../../server/lanes'

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
          const lane = await getLaneOrchestrator().runMission(
            body.id,
            body.mission,
          )
          return json({ ok: true, lane })
        } catch (error) {
          return json(
            {
              ok: false,
              error:
                error instanceof Error
                  ? error.message
                  : 'Failed to run mission',
            },
            { status: 500 },
          )
        }
      },
    },
  },
})
