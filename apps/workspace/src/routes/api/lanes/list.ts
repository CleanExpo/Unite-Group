import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { isAuthenticated } from '../../../server/auth-middleware'
import { getLaneOrchestrator } from '../../../server/lanes'

export const Route = createFileRoute('/api/lanes/list')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isAuthenticated(request)) {
          return json({ ok: false, error: 'Unauthorized' }, { status: 401 })
        }
        try {
          const lanes = await getLaneOrchestrator().list()
          return json({ ok: true, lanes })
        } catch {
          return json(
            { ok: false, error: 'Failed to list lanes' },
            { status: 500 },
          )
        }
      },
    },
  },
})
