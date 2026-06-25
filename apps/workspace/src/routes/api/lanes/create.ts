import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { isAuthenticated } from '../../../server/auth-middleware'
import { requireJsonContentType } from '../../../server/rate-limit'
import { getLaneOrchestrator } from '../../../server/lanes'
import type { CreateLaneInput } from '../../../server/lanes/types'

export const Route = createFileRoute('/api/lanes/create')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isAuthenticated(request)) {
          return json({ ok: false, error: 'Unauthorized' }, { status: 401 })
        }
        const csrfCheck = requireJsonContentType(request)
        if (csrfCheck) return csrfCheck
        try {
          const body = (await request.json()) as Partial<CreateLaneInput>
          if (!body.kind || !body.backend || !body.role || !body.repo) {
            return json(
              { ok: false, error: 'kind, backend, role and repo are required' },
              { status: 400 },
            )
          }
          const lane = await getLaneOrchestrator().create(
            body as CreateLaneInput,
          )
          return json({ ok: true, lane })
        } catch (error) {
          return json(
            {
              ok: false,
              error:
                error instanceof Error
                  ? error.message
                  : 'Failed to create lane',
            },
            { status: 500 },
          )
        }
      },
    },
  },
})
