import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { isAuthenticated } from '../../server/auth-middleware'
import { buildMissionControlOsStatus } from '../../server/mission-control-os'

export const Route = createFileRoute('/api/mission-control-os')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isAuthenticated(request)) {
          return json({ ok: false, error: 'Unauthorized' }, { status: 401 })
        }

        const status = await buildMissionControlOsStatus()
        return json(status)
      },
    },
  },
})
