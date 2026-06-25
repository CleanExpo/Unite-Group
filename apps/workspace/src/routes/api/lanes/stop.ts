import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { isAuthenticated } from '../../../server/auth-middleware'
import { requireJsonContentType } from '../../../server/rate-limit'
import { getLaneOrchestrator } from '../../../server/lanes'

export const Route = createFileRoute('/api/lanes/stop')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isAuthenticated(request)) {
          return json({ ok: false, error: 'Unauthorized' }, { status: 401 })
        }
        const csrfCheck = requireJsonContentType(request)
        if (csrfCheck) return csrfCheck
        try {
          const body = (await request.json()) as { id?: string }
          if (!body.id) {
            return json({ ok: false, error: 'id is required' }, { status: 400 })
          }
          const lane = await getLaneOrchestrator().stop(body.id)
          return json({ ok: true, lane })
        } catch (error) {
          return json(
            {
              ok: false,
              error:
                error instanceof Error ? error.message : 'Failed to stop lane',
            },
            { status: 500 },
          )
        }
      },
    },
  },
})
