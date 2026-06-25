import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { isAuthenticated } from '../../../server/auth-middleware'
import { getLaneOrchestrator } from '../../../server/lanes'

export const Route = createFileRoute('/api/lanes/$laneId')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        if (!isAuthenticated(request)) {
          return json({ ok: false, error: 'Unauthorized' }, { status: 401 })
        }
        const { laneId } = params
        const lane = await getLaneOrchestrator().get(laneId)
        if (!lane) {
          return json({ ok: false, error: 'Lane not found' }, { status: 404 })
        }
        return json({ ok: true, lane })
      },
    },
  },
})
