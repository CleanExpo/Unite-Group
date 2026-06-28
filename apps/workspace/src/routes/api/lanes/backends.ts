import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { isAuthenticated } from '../../../server/auth-middleware'
import { listBackends } from '../../../server/lanes/backend-registry'

export const Route = createFileRoute('/api/lanes/backends')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isAuthenticated(request)) {
          return json({ ok: false, error: 'Unauthorized' }, { status: 401 })
        }
        // Slice 1: report all backends as available; adapter slices add real
        // auth detection.
        const backends = listBackends(() => true)
        return json({ ok: true, backends })
      },
    },
  },
})
